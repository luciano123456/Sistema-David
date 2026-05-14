using Sistema_David.Models.DB;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Data;
using System.Linq;
using System.Web;
using System.Globalization;
using System.Data.Entity;
using System.Data.Entity.Core.Objects;
using Sistema_David.Models.Modelo;

namespace Sistema_David.Models
{
    public class RendimientosModel
    {

        public static List<VMRendimiento> ListaUsuarios()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var resultList = db.Database.SqlQuery<VMRendimiento>(@"SELECT u.Id, CONCAT(u.Nombre, ' ', u.Apellido) AS Nombre, SUM(v.Entrega + v.Restante) AS Total FROM Usuarios u LEFT JOIN Ventas v ON v.idVendedor = u.Id GROUP BY u.Id, u.Nombre, u.Apellido").ToList();

                return resultList;
            }

        }



        public static List<VMRendimientoGeneral> MostrarRendimientoGeneral(DateTime fechaDesde, DateTime fechaHasta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                try
                {
                    if (fechaHasta < fechaDesde)
                    {
                        return null;
                    }

                    // Obtener las ventas y cobranzas en memoria
                    DateTime fechaHastaAjustada = fechaHasta.Date.AddDays(1).AddTicks(-1);

                    var ventasCobranzas = db.InformacionVentas
                        .Where(iv => iv.Fecha >= fechaDesde.Date && iv.Fecha <= fechaHastaAjustada && (iv.Descripcion.Contains("Venta") || iv.Descripcion.Contains("Cobranza")))
                        .OrderBy(iv => iv.Fecha)
                        .ToList();

                    // Asegurarse de que haya una entrada para cada día en el rango
                    var fechasEnRango = Enumerable.Range(0, (int)(fechaHasta - fechaDesde).TotalDays + 1)
                        .Select(offset => fechaDesde.AddDays(offset).Date)
                        .ToList();

                    // Combinar resultados en memoria con fechas en rango
                    var result = fechasEnRango
                        .Select(fecha =>
                        {
                            var ventasDelDia = ventasCobranzas
                                .Where(iv => iv.Fecha?.Date == fecha && iv.Descripcion.Contains("Venta"))
                                .Sum(x => x.Entrega + x.Restante);

                            var cobranzasDelDia = ventasCobranzas
                                .Where(iv => iv.Fecha?.Date == fecha && (iv.Descripcion.Contains("Cobranza")))
                                .Sum(x => x.Descripcion.Contains("Cobranza") ? x.Entrega : 0);

                            return new VMRendimientoGeneral
                            {
                                Fecha = fecha.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture),  // Formato español
                                Ventas = (decimal)ventasDelDia,
                                Cobranza = (decimal)cobranzasDelDia,
                            };
                        })
                        .OrderByDescending(rendimiento => DateTime.ParseExact(rendimiento.Fecha, "dd/MM/yyyy", CultureInfo.InvariantCulture))
                        .ToList();

                    foreach (var rendimiento in result)
                    {
                        DateTime fechaRendimiento = DateTime.ParseExact(rendimiento.Fecha, "dd/MM/yyyy", CultureInfo.InvariantCulture);

                        rendimiento.CapitalInicial = db.Ventas
                            .Where(v => v.Fecha < fechaRendimiento)
                            .Sum(v => (decimal?)v.Restante) ?? 0;

                        rendimiento.CapitalFinal = rendimiento.CapitalInicial + rendimiento.Ventas - rendimiento.Cobranza;
                    }

                    return result;
                } catch (Exception ex)
                {
                    return null;
                }
            }
        }

        public static List<VMInformacionVenta> MostrarClientesAusentes(DateTime fechaDesde, DateTime fechaHasta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                DateTime fechaHastaFin = fechaHasta.Date.AddDays(1);

                var informacionVenta = db.InformacionVentas
                    .Where(iv => iv.ClienteAusente == 1 && iv.Fecha >= fechaDesde.Date && iv.Fecha < fechaHastaFin)
                    .Select(iv => new VMInformacionVenta
                    {
                        Id = iv.Id,
                        IdVenta = iv.IdVenta,
                        Fecha = (DateTime)iv.Fecha,
                        Entrega = (decimal)iv.Entrega,
                        Restante = (decimal)iv.Restante,
                        idVendedor = (int)iv.idVendedor,
                        Interes = (decimal)iv.Interes,
                        Descripcion = iv.Descripcion != null ? iv.Descripcion : "",
                        whatssap = (int)iv.whatssap,
                        ValorCuota = (decimal)iv.ValorCuota,
                        Observacion = iv.Observacion != null ? iv.Observacion : "",
                        idCobrador = (int)iv.idCobrador,
                        Cobrador = iv.idCobrador == 0 ? "N/A" : db.Usuarios.FirstOrDefault(u => u.Id == iv.idCobrador).Nombre ?? "N/A",
                        Cliente = db.Clientes
                        .Where(c => c.Id == db.Ventas.FirstOrDefault(v => v.Id == iv.IdVenta).idCliente)
                        .Select(c => c.Nombre + " " + c.Apellido)
                        .FirstOrDefault() ?? "N/A"
                    })
                    .ToList();

                return informacionVenta;
            }
        }

        public static int MostrarCantidadClientesAusentes()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                // Obtenemos la fecha actual (solo la parte de la fecha sin la hora)
                DateTime fechaActual = DateTime.Today;

                // Contamos el número de registros que coinciden con las condiciones
                int cantidadClientesAusentes = db.InformacionVentas
                    .Where(iv => iv.ClienteAusente == 1
                                 && iv.whatssap == 0
                                 && DbFunctions.TruncateTime(iv.Fecha) == fechaActual)
                    .Count();

                return cantidadClientesAusentes;
            }
        }

        public static int MostrarCantidadComprobantes()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                DateTime fechaHasta = DateTime.Today.AddDays(1).AddTicks(-1); // 18/04 23:59:59.9999999
                DateTime fechaDesde = DateTime.Today.AddDays(-5);             // 13/04 00:00:00

                int cantidadClientesAusentes = db.Ventas
                    .Where(iv => iv.Comprobante == 0
                                 && DbFunctions.TruncateTime(iv.Fecha) >= fechaDesde
                                 && DbFunctions.TruncateTime(iv.Fecha) <= fechaHasta)
                    .Count();

                return cantidadClientesAusentes;
            }
        }




        public static List<VMRendimiento> MostrarRendimiento(int idVendedor, int ventas, int cobranzas, DateTime fechadesde, DateTime fechahasta, int tiponegocio, string metodoPago, int IdCuentaBancaria, int ComprobantesEnviados)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {


                    var idVendedorParam = new SqlParameter("@idVendedor", SqlDbType.Int) { Value = idVendedor };
                    var ventasParam = new SqlParameter("@ventas", SqlDbType.Int) { Value = ventas };
                    var cobranzasParam = new SqlParameter("@cobranzas", SqlDbType.Int) { Value = cobranzas };
                    var fechadesdeParam = new SqlParameter("@fechadesde", SqlDbType.DateTime) { Value = fechadesde };
                    var fechahastaParam = new SqlParameter("@fechahasta", SqlDbType.DateTime) { Value = fechahasta };
                    var tiponegocioParam = new SqlParameter("@Idtiponegocio", SqlDbType.Int) { Value = tiponegocio };

                    var metodoPagoParam = new SqlParameter("@metodoPago", SqlDbType.VarChar, 50) { Value = metodoPago };
                    var cuentabancariaParam = new SqlParameter("@IdCuentaBancaria", SqlDbType.Int) { Value = IdCuentaBancaria };
                    var comprobantesEnviadosParam = new SqlParameter("@ComprobantesEnviados", SqlDbType.Int) { Value = ComprobantesEnviados };

                    var resultList = db.Database.SqlQuery<VMRendimiento>(
                        "EXEC sp_MostrarRendimiento @idVendedor, @ventas, @cobranzas, @fechadesde, @fechahasta, @Idtiponegocio, @metodoPago, @IdCuentaBancaria, @ComprobantesEnviados",
                        idVendedorParam, ventasParam, cobranzasParam, fechadesdeParam, fechahastaParam, tiponegocioParam, metodoPagoParam, cuentabancariaParam, comprobantesEnviadosParam
                    ).ToList();

                    EnriquecerRendimientoDespuesDeSp(db, resultList);

                    // El SP puede mezclar criterios; al elegir un usuario en la lista izquierda debe verse
                    // su actividad como vendedor de la venta o como cobrador (cobranzas de cartera ajena).
                    if (idVendedor > 0)
                    {
                        resultList = resultList
                            .Where(r => r != null && (r.IdVendedor == idVendedor || r.IdCobrador == idVendedor))
                            .ToList();
                    }

                    return resultList;
                }
            } catch (Exception ex)
            {
                return null;
            }
        }


        public static string ObtenerImagen(int id, string origen)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    db.Configuration.ProxyCreationEnabled = false;
                    db.Configuration.LazyLoadingEnabled = false;

                    if (origen == "ELECTRO")
                    {
                        return db.Ventas_Electrodomesticos_Pagos
                            .Where(p => p.Id == id)
                            .Select(p => p.Imagen)
                            .FirstOrDefault();
                    }
                    else
                    {
                        return db.InformacionVentas
                            .Where(iv => iv.Id == id)
                            .Select(iv => iv.Imagen)
                            .FirstOrDefault();
                    }
                }
            }
            catch
            {
                return null;
            }
        }


        public static List<VMRendimientoCobrado> MostrarCobrado(DateTime fechadesde, DateTime fechahasta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                string query = @"
                                SELECT 
                            u.id AS IdVendedor,
                            u.Nombre AS Vendedor,
                            COALESCE(SUM(iv.Entrega), 0) AS TotalCobrado
                        FROM 
                            USUARIOS u
                        LEFT JOIN 
                            Ventas v ON u.id = v.idVendedor
                        LEFT JOIN 
                            InformacionVentas iv ON v.id = iv.idVenta
                                                    AND iv.Descripcion LIKE '%Cobranza%'
                                                    AND iv.Fecha >= @fechadesde
                                                    AND iv.Fecha <= @fechahasta
                        WHERE 
                            u.IdEstado != 4
                        GROUP BY 
                            u.id, 
                            u.Nombre;

        ";

                var fechadesdeParam = new SqlParameter("@fechadesde", SqlDbType.DateTime);
                fechadesdeParam.Value = fechadesde.Date; // Establecer la hora a las 00:00:00

                var fechahastaParam = new SqlParameter("@fechahasta", SqlDbType.DateTime);
                fechahastaParam.Value = fechahasta.Date.AddDays(1).AddSeconds(-1); // Establecer la hora a las 23:59:59 del día seleccionado

                var resultList = db.Database.SqlQuery<VMRendimientoCobrado>(query, fechadesdeParam, fechahastaParam).ToList();

               

                return resultList;
            }
        }

        private static string FormatearNombreUsuario(Usuarios u)
        {
            if (u == null) return null;
            var nombre = $"{u.Nombre ?? ""} {u.Apellido ?? ""}".Trim();
            if (!string.IsNullOrEmpty(nombre)) return nombre;
            return string.IsNullOrWhiteSpace(u.Usuario) ? null : u.Usuario.Trim();
        }

        /// <summary>
        /// Corrige y completa datos que el SP puede duplicar o que EF mapea mal: cobrador (electro = mismo Id de pago en varias filas),
        /// nombre del cobrador, vendedor por IdVenta y nombre de tipo de negocio.
        /// </summary>
        private static void EnriquecerRendimientoDespuesDeSp(Sistema_DavidEntities db, List<VMRendimiento> rows)
        {
            if (rows == null || rows.Count == 0) return;

            db.Configuration.ProxyCreationEnabled = false;
            db.Configuration.LazyLoadingEnabled = false;

            var idsPagoElectro = new HashSet<int>();
            var idsInformacionClasica = new HashSet<int>();
            var idVentas = new HashSet<int>();

            foreach (var r in rows)
            {
                if (r == null) continue;
                if (r.IdVenta > 0) idVentas.Add(r.IdVenta);

                var desc = r.Descripcion ?? string.Empty;
                var d = desc.ToLowerInvariant();

                if (d.Contains("electro") && d.Contains("cobranza"))
                    idsPagoElectro.Add(r.Id);
                else if (!d.Contains("electro"))
                    idsInformacionClasica.Add(r.Id);
            }

            var usuarioPorPagoId = db.Ventas_Electrodomesticos_Pagos
                .AsNoTracking()
                .Where(p => idsPagoElectro.Contains(p.Id))
                .Select(p => new { p.Id, p.UsuarioCreacion })
                .ToList()
                .GroupBy(x => x.Id)
                .ToDictionary(g => g.Key, g => g.First().UsuarioCreacion);

            var cobradorPorInformacionId = db.InformacionVentas
                .AsNoTracking()
                .Where(iv => idsInformacionClasica.Contains(iv.Id))
                .Select(iv => new { iv.Id, iv.idCobrador })
                .ToList()
                .ToDictionary(x => x.Id, x => x.idCobrador);

            var vendedorIdPorVentaElectro = db.Ventas_Electrodomesticos
                .AsNoTracking()
                .Where(v => idVentas.Contains(v.Id))
                .Select(v => new { v.Id, v.IdVendedor })
                .ToList()
                .ToDictionary(x => x.Id, x => x.IdVendedor);

            var vendedorIdPorVentaClasica = db.Ventas
                .AsNoTracking()
                .Where(v => idVentas.Contains(v.Id))
                .Select(v => new { v.Id, v.idVendedor })
                .ToList()
                .ToDictionary(x => x.Id, x => x.idVendedor);

            var idsTipoNegocio = rows
                .Where(r => r != null && r.IdTipoNegocio.HasValue && r.IdTipoNegocio.Value > 0)
                .Select(r => r.IdTipoNegocio.Value)
                .Distinct()
                .ToList();

            var nombreTipoPorId = idsTipoNegocio.Count == 0
                ? new Dictionary<int, string>()
                : db.TipoNegocio
                    .AsNoTracking()
                    .Where(t => idsTipoNegocio.Contains(t.Id))
                    .ToDictionary(t => t.Id, t => t.Nombre ?? string.Empty);

            var idsUsuarios = new HashSet<int>();
            foreach (var u in usuarioPorPagoId.Values)
                idsUsuarios.Add(u);
            foreach (var c in cobradorPorInformacionId.Values)
            {
                if (c.HasValue) idsUsuarios.Add(c.Value);
            }
            foreach (var vid in idVentas)
            {
                if (vendedorIdPorVentaElectro.TryGetValue(vid, out var ve)) idsUsuarios.Add(ve);
                if (vendedorIdPorVentaClasica.TryGetValue(vid, out var vc)) idsUsuarios.Add(vc);
            }
            foreach (var r in rows)
            {
                if (r != null && r.IdVendedor > 0) idsUsuarios.Add(r.IdVendedor);
            }

            var nombresUsuario = idsUsuarios.Count == 0
                ? new Dictionary<int, string>()
                : db.Usuarios
                    .AsNoTracking()
                    .Where(u => idsUsuarios.Contains(u.Id))
                    .ToList()
                    .ToDictionary(u => u.Id, FormatearNombreUsuario);

            foreach (var r in rows)
            {
                if (r == null) continue;

                var desc = r.Descripcion ?? string.Empty;
                var d = desc.ToLowerInvariant();

                if (d.Contains("electro") && d.Contains("cobranza"))
                {
                    if (usuarioPorPagoId.TryGetValue(r.Id, out var idUc))
                        r.IdCobrador = idUc;
                }
                else if (!d.Contains("electro"))
                {
                    if (cobradorPorInformacionId.TryGetValue(r.Id, out var idC) && idC.HasValue)
                        r.IdCobrador = idC.Value;
                }

                if (r.IdVenta > 0)
                {
                    int idVend = 0;
                    var origen = (r.Origen ?? string.Empty).ToUpperInvariant();
                    var esElectro = origen.Contains("ELECTRO")
                                    || d.Contains("electro");

                    // Importante: IdVenta puede coincidir numéricamente entre tablas clásica/electro.
                    // Elegimos fuente según origen para no mezclar vendedores.
                    if (esElectro)
                    {
                        if (vendedorIdPorVentaElectro.TryGetValue(r.IdVenta, out var ve))
                            idVend = ve;
                    }
                    else
                    {
                        if (vendedorIdPorVentaClasica.TryGetValue(r.IdVenta, out var vc))
                            idVend = vc;
                    }

                    if (idVend > 0)
                    {
                        // Canonizamos IdVendedor con el vendedor dueño de la venta para
                        // permitir filtrado correcto de cobranzas por vendedor.
                        r.IdVendedor = idVend;

                        if (nombresUsuario.TryGetValue(idVend, out var nomV))
                            r.Vendedor = nomV;
                    }
                }

                if (string.IsNullOrWhiteSpace(r.Vendedor) && r.IdVendedor > 0
                    && nombresUsuario.TryGetValue(r.IdVendedor, out var nomFallback))
                    r.Vendedor = nomFallback;

                if (r.IdCobrador > 0 && nombresUsuario.TryGetValue(r.IdCobrador, out var nomC))
                    r.UsuarioCobro = nomC;

                if (r.IdTipoNegocio.HasValue
                    && nombreTipoPorId.TryGetValue(r.IdTipoNegocio.Value, out var nomTipo)
                    && !string.IsNullOrWhiteSpace(nomTipo))
                    r.TipoNegocio = nomTipo;
            }
        }



    }
}
