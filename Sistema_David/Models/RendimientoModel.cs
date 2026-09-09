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
        private sealed class IdWhatsRow
        {
            public int Id { get; set; }
            public int? Whatssap { get; set; }
        }

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




        private static string SqlMostrarRendimiento()
        {
            return @"
SELECT
    IV.Id,
    V.idVendedor AS IdVendedor,
    C.Nombre + ' ' + C.Apellido AS Cliente,
    IV.IdVenta,
    (IV.Entrega + IV.Restante) AS CapitalInicial,
    CASE WHEN IV.Descripcion LIKE '%venta%' THEN (IV.Entrega + IV.Restante) ELSE 0 END AS Venta,
    ISNULL(IV.Entrega, 0) AS Cobro,
    ISNULL(IV.Interes, 0) AS Interes,
    IV.Restante AS CapitalFinal,
    IV.Fecha,
    IV.ProximoCobro,
    IV.Descripcion,
    IV.MetodoPago,
    IV.IdTipoNegocio,
    IV.whatssap,
    IV.ActualizoUbicacion,
    CB.Nombre AS CuentaBancaria,
    V.FechaLimite AS FechaLimite,
    ISNULL(IV.IdCobrador, 0) AS IdCobrador,
    CASE WHEN DATALENGTH(IV.Imagen) > 2 THEN '1' ELSE NULL END AS Imagen,
    'INDUMENTARIA' AS Origen,
    IV.Id AS IdOriginal,
    LTRIM(RTRIM(ISNULL(UV.Nombre, '') + ' ' + ISNULL(UV.Apellido, ''))) AS Vendedor,
    LTRIM(RTRIM(ISNULL(UC.Nombre, '') + ' ' + ISNULL(UC.Apellido, ''))) AS UsuarioCobro,
    TN.Nombre AS TipoNegocio
FROM InformacionVentas IV
INNER JOIN Ventas V ON V.Id = IV.IdVenta
INNER JOIN Clientes C ON C.Id = V.IdCliente
LEFT JOIN CuentasBancarias CB ON CB.Id = IV.IdCuentaBancaria
LEFT JOIN Usuarios UV ON UV.Id = V.idVendedor
LEFT JOIN Usuarios UC ON UC.Id = IV.IdCobrador
LEFT JOIN TipoNegocio TN ON TN.Id = IV.IdTipoNegocio
WHERE
    (IV.IdTipoNegocio = @Idtiponegocio OR @Idtiponegocio = -1)
    AND (IV.MetodoPago = @metodoPago OR @metodoPago = 'Todos')
    AND (IV.IdCuentaBancaria = @IdCuentaBancaria OR @IdCuentaBancaria = -1)
    AND (IV.whatssap = @ComprobantesEnviados OR @ComprobantesEnviados = -1)
    AND (
        (@ventas = 1 AND IV.Descripcion LIKE '%venta%' AND (V.idVendedor = @idVendedor OR @idVendedor = -1))
        OR
        (@cobranzas = 1 AND (IV.Descripcion LIKE '%cobranza%' OR IV.Descripcion LIKE '%interes%')
            AND (ISNULL(IV.IdCobrador, 0) = @idVendedor OR @idVendedor = -1))
    )
    AND IV.Fecha >= @fechadesde
    AND IV.Fecha < DATEADD(DAY, 1, @fechahasta)

UNION ALL

SELECT
    VE.Id,
    VE.IdVendedor,
    C.Nombre + ' ' + C.Apellido AS Cliente,
    VE.Id AS IdVenta,
    VE.ImporteTotal AS CapitalInicial,
    VE.ImporteTotal AS Venta,
    ISNULL(VE.Entrega, 0) AS Cobro,
    0 AS Interes,
    VE.Restante AS CapitalFinal,
    VE.FechaVenta AS Fecha,
    PC.ProximoCobro,
    'Venta Electrodomesticos #' + CAST(VE.Id AS VARCHAR(20)) AS Descripcion,
    'ELECTRO' AS MetodoPago,
    3 AS IdTipoNegocio,
    VE.Whatssap AS whatssap,
    0 AS ActualizoUbicacion,
    NULL AS CuentaBancaria,
    VE.FechaVencimiento AS FechaLimite,
    0 AS IdCobrador,
    NULL AS Imagen,
    'ELECTRO' AS Origen,
    VE.Id AS IdOriginal,
    LTRIM(RTRIM(ISNULL(UV.Nombre, '') + ' ' + ISNULL(UV.Apellido, ''))) AS Vendedor,
    NULL AS UsuarioCobro,
    TN.Nombre AS TipoNegocio
FROM Ventas_Electrodomesticos VE
INNER JOIN Clientes C ON C.Id = VE.IdCliente
LEFT JOIN Usuarios UV ON UV.Id = VE.IdVendedor
LEFT JOIN TipoNegocio TN ON TN.Id = 3
OUTER APPLY (
    SELECT MIN(CU.FechaVencimiento) AS ProximoCobro
    FROM Ventas_Electrodomesticos_Cuotas CU
    WHERE CU.IdVenta = VE.Id AND CU.Estado <> 'Pagada'
) PC
WHERE
    (@ventas = 1)
    AND ISNULL(VE.Eliminada, 0) = 0
    AND (VE.IdVendedor = @idVendedor OR @idVendedor = -1)
    AND (3 = @Idtiponegocio OR @Idtiponegocio = -1)
    AND VE.FechaVenta >= @fechadesde
    AND VE.FechaVenta < DATEADD(DAY, 1, @fechahasta)

UNION ALL

SELECT
    P.Id,
    VE.IdVendedor,
    C.Nombre + ' ' + C.Apellido AS Cliente,
    VE.Id AS IdVenta,
    0 AS CapitalInicial,
    0 AS Venta,
    PD.ImporteAplicado AS Cobro,
    0 AS Interes,
    VE.Restante AS CapitalFinal,
    P.FechaPago AS Fecha,
    CU.FechaVencimiento AS ProximoCobro,
    'Cobranza Electrodomesticos #' + CAST(VE.Id AS VARCHAR(20))
        + ' - ' + C.Nombre + ' ' + C.Apellido
        + ' - Cuota ' + CAST(CU.NumeroCuota AS VARCHAR(10))
        + ' - $' + CONVERT(VARCHAR(20), CAST(PD.ImporteAplicado AS INT)) AS Descripcion,
    P.MedioPago AS MetodoPago,
    3 AS IdTipoNegocio,
    P.Whatssap AS whatssap,
    0 AS ActualizoUbicacion,
    CB.Nombre AS CuentaBancaria,
    VE.FechaVencimiento AS FechaLimite,
    ISNULL(P.UsuarioCreacion, 0) AS IdCobrador,
    CASE WHEN DATALENGTH(P.Imagen) > 2 THEN '1' ELSE NULL END AS Imagen,
    'ELECTRO' AS Origen,
    P.Id AS IdOriginal,
    LTRIM(RTRIM(ISNULL(UV.Nombre, '') + ' ' + ISNULL(UV.Apellido, ''))) AS Vendedor,
    LTRIM(RTRIM(ISNULL(UC.Nombre, '') + ' ' + ISNULL(UC.Apellido, ''))) AS UsuarioCobro,
    TN.Nombre AS TipoNegocio
FROM Ventas_Electrodomesticos_Pagos P
INNER JOIN Ventas_Electrodomesticos VE ON VE.Id = P.IdVenta
INNER JOIN Clientes C ON C.Id = VE.IdCliente
INNER JOIN Ventas_Electrodomesticos_Pagos_Detalle PD ON PD.IdPago = P.Id
INNER JOIN Ventas_Electrodomesticos_Cuotas CU ON CU.Id = PD.IdCuota
LEFT JOIN CuentasBancarias CB ON CB.Id = P.IdCuentaBancaria
LEFT JOIN Usuarios UV ON UV.Id = VE.IdVendedor
LEFT JOIN Usuarios UC ON UC.Id = P.UsuarioCreacion
LEFT JOIN TipoNegocio TN ON TN.Id = 3
WHERE
    (@cobranzas = 1)
    AND ISNULL(VE.Eliminada, 0) = 0
    AND (ISNULL(P.UsuarioCreacion, 0) = @idVendedor OR @idVendedor = -1)
    AND (3 = @Idtiponegocio OR @Idtiponegocio = -1)
    AND (P.MedioPago = @metodoPago OR @metodoPago = 'Todos')
    AND (P.IdCuentaBancaria = @IdCuentaBancaria OR @IdCuentaBancaria = -1)
    AND P.FechaPago >= @fechadesde
    AND P.FechaPago < DATEADD(DAY, 1, @fechahasta)

UNION ALL

SELECT
    R.Id,
    VE.IdVendedor,
    C.Nombre + ' ' + C.Apellido AS Cliente,
    VE.Id AS IdVenta,
    0 AS CapitalInicial,
    0 AS Venta,
    0 AS Cobro,
    R.ImporteCalculado AS Interes,
    VE.Restante AS CapitalFinal,
    R.Fecha AS Fecha,
    CU.FechaVencimiento AS ProximoCobro,
    'Interes Electrodomesticos #' + CAST(VE.Id AS VARCHAR(20))
        + ' - Cuota ' + CAST(CU.NumeroCuota AS VARCHAR(10)) AS Descripcion,
    'INTERÉS' AS MetodoPago,
    3 AS IdTipoNegocio,
    0 AS whatssap,
    0 AS ActualizoUbicacion,
    NULL AS CuentaBancaria,
    VE.FechaVencimiento AS FechaLimite,
    ISNULL(R.UsuarioCreacion, 0) AS IdCobrador,
    NULL AS Imagen,
    'ELECTRO' AS Origen,
    R.Id AS IdOriginal,
    LTRIM(RTRIM(ISNULL(UV.Nombre, '') + ' ' + ISNULL(UV.Apellido, ''))) AS Vendedor,
    LTRIM(RTRIM(ISNULL(UC.Nombre, '') + ' ' + ISNULL(UC.Apellido, ''))) AS UsuarioCobro,
    TN.Nombre AS TipoNegocio
FROM Ventas_Electrodomesticos_Cuotas_Recargos R
INNER JOIN Ventas_Electrodomesticos_Cuotas CU ON CU.Id = R.IdCuota
INNER JOIN Ventas_Electrodomesticos VE ON VE.Id = CU.IdVenta
INNER JOIN Clientes C ON C.Id = VE.IdCliente
LEFT JOIN Usuarios UV ON UV.Id = VE.IdVendedor
LEFT JOIN Usuarios UC ON UC.Id = R.UsuarioCreacion
LEFT JOIN TipoNegocio TN ON TN.Id = 3
WHERE
    (@cobranzas = 1)
    AND ISNULL(VE.Eliminada, 0) = 0
    AND (
        @idVendedor = -1
        OR VE.IdVendedor = @idVendedor
        OR ISNULL(R.UsuarioCreacion, 0) = @idVendedor
        OR ISNULL(VE.IdCobrador, 0) = @idVendedor
    )
    AND (3 = @Idtiponegocio OR @Idtiponegocio = -1)
    AND R.Fecha >= @fechadesde
    AND R.Fecha < DATEADD(DAY, 1, @fechahasta)
ORDER BY Fecha
";
        }

        public static List<VMRendimiento> MostrarRendimiento(int idVendedor, int ventas, int cobranzas, DateTime fechadesde, DateTime fechahasta, int tiponegocio, string metodoPago, int IdCuentaBancaria, int ComprobantesEnviados)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {
                    db.Database.CommandTimeout = 300;
                    db.Configuration.ProxyCreationEnabled = false;
                    db.Configuration.LazyLoadingEnabled = false;

                    var desde = fechadesde.Date;
                    var hasta = fechahasta.Date;

                    var idVendedorParam = new SqlParameter("@idVendedor", SqlDbType.Int) { Value = idVendedor };
                    var ventasParam = new SqlParameter("@ventas", SqlDbType.Int) { Value = ventas };
                    var cobranzasParam = new SqlParameter("@cobranzas", SqlDbType.Int) { Value = cobranzas };
                    var fechadesdeParam = new SqlParameter("@fechadesde", SqlDbType.DateTime) { Value = desde };
                    var fechahastaParam = new SqlParameter("@fechahasta", SqlDbType.DateTime) { Value = hasta };
                    var tiponegocioParam = new SqlParameter("@Idtiponegocio", SqlDbType.Int) { Value = tiponegocio };

                    var metodoPagoParam = new SqlParameter("@metodoPago", SqlDbType.VarChar, 50) { Value = metodoPago ?? "" };
                    var cuentabancariaParam = new SqlParameter("@IdCuentaBancaria", SqlDbType.Int) { Value = IdCuentaBancaria };
                    var comprobantesEnviadosParam = new SqlParameter("@ComprobantesEnviados", SqlDbType.Int) { Value = ComprobantesEnviados };

                    // Consulta propia: no usa el SP. El SP leía Imagen con LTRIM/RTRIM (nvarchar max)
                    // y tardaba minutos al serializar comprobantes. Acá solo va un flag.
                    var resultList = db.Database.SqlQuery<VMRendimiento>(
                        SqlMostrarRendimiento(),
                        idVendedorParam, ventasParam, cobranzasParam, fechadesdeParam, fechahastaParam, tiponegocioParam, metodoPagoParam, cuentabancariaParam, comprobantesEnviadosParam
                    ).ToList();

                    EnriquecerRendimientoDespuesDeSp(db, resultList);

                    // El SP puede mezclar criterios; al elegir un usuario en la lista izquierda debe verse
                    // su actividad como vendedor de la venta, cobrador asignado o quien registró el interés.
                    if (idVendedor > 0)
                    {
                        resultList = resultList
                            .Where(r => r != null && (r.IdVendedor == idVendedor || r.IdCobrador == idVendedor))
                            .ToList();
                    }

                    CompactarImagenesRendimiento(resultList);

                    return resultList;
                }
            }
            catch (Exception)
            {
                return new List<VMRendimiento>();
            }
        }

        public static object CalcularKpis(List<VMRendimiento> rows)
        {
            decimal totVenta = 0, totCobro = 0, totInteres = 0, totEfectivo = 0, totTransferencia = 0;
            if (rows == null) return new { venta = 0m, cobro = 0m, interes = 0m, efectivo = 0m, transferencia = 0m };

            for (int i = 0; i < rows.Count; i++)
            {
                var r = rows[i];
                if (r == null) continue;

                var descripcion = r.Descripcion ?? "";
                var metodo = (r.MetodoPago ?? "").Trim().ToUpperInvariant();
                var cobro = r.Cobro ?? 0;
                var venta = r.Venta ?? 0;
                var interes = r.Interes ?? 0;

                if (descripcion.IndexOf("Cobranza", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    totCobro += cobro;
                    if (metodo == "EFECTIVO") totEfectivo += cobro;
                    if (metodo == "TRANSFERENCIA PROPIA" || metodo == "TRANSFERENCIA A TERCEROS")
                        totTransferencia += cobro;
                }

                if (descripcion.IndexOf("Venta", StringComparison.OrdinalIgnoreCase) >= 0)
                    totVenta += venta;

                var descN = descripcion.ToUpperInvariant();
                if (descN.Contains("INTERES") || descN.Contains("INTERÉS") || descN.Contains("RECARGO")
                    || metodo.Contains("INTERES") || metodo.Contains("INTERÉS") || metodo == "RECARGO")
                    totInteres += interes;
            }

            return new
            {
                venta = totVenta,
                cobro = totCobro,
                interes = totInteres,
                efectivo = totEfectivo,
                transferencia = totTransferencia
            };
        }

        private static void CompactarImagenesRendimiento(List<VMRendimiento> rows)
        {
            if (rows == null) return;
            for (int i = 0; i < rows.Count; i++)
            {
                var r = rows[i];
                if (r == null) continue;
                if (!string.IsNullOrEmpty(r.Imagen))
                    r.Imagen = "1";
            }
        }

        private const int SqlIdChunk = 800;

        private static IEnumerable<List<int>> PartirIds(IEnumerable<int> ids)
        {
            var list = ids == null ? new List<int>() : ids.Where(x => x > 0).Distinct().ToList();
            for (int i = 0; i < list.Count; i += SqlIdChunk)
                yield return list.GetRange(i, Math.Min(SqlIdChunk, list.Count - i));
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

        private static bool EsFilaInteresElectro(VMRendimiento r)
        {
            if (r == null) return false;
            var metodo = (r.MetodoPago ?? string.Empty).Trim();
            if (string.Equals(metodo, "RECARGO", StringComparison.OrdinalIgnoreCase)
                || string.Equals(metodo, "INTERÉS", StringComparison.OrdinalIgnoreCase)
                || string.Equals(metodo, "INTERES", StringComparison.OrdinalIgnoreCase))
                return true;

            var d = (r.Descripcion ?? string.Empty).ToLowerInvariant();
            return d.Contains("electro") && (d.Contains("recargo") || d.Contains("interes") || d.Contains("interés"));
        }

        /// <summary>
        /// Completa intereses/recargos electro que el SP puede omitir (filtra solo por IdVendedor)
        /// y normaliza MetodoPago/Descripcion/IdCobrador para que impacten en Rendimiento.
        /// </summary>
        private static void AsegurarInteresesElectroEnRendimiento(
            Sistema_DavidEntities db,
            List<VMRendimiento> rows,
            int idVendedor,
            int cobranzas,
            int tiponegocio,
            DateTime fechadesde,
            DateTime fechahasta)
        {
            if (rows == null) return;
            if (cobranzas != 1) return;
            if (tiponegocio != -1 && tiponegocio != 3) return;

            db.Configuration.ProxyCreationEnabled = false;
            db.Configuration.LazyLoadingEnabled = false;

            var desde = fechadesde.Date;
            var hastaExclusivo = fechahasta.Date.AddDays(1);

            var q =
                from r in db.Ventas_Electrodomesticos_Cuotas_Recargos.AsNoTracking()
                join c in db.Ventas_Electrodomesticos_Cuotas.AsNoTracking() on r.IdCuota equals c.Id
                join v in db.Ventas_Electrodomesticos.AsNoTracking() on c.IdVenta equals v.Id
                join cli in db.Clientes.AsNoTracking() on v.IdCliente equals cli.Id
                where r.Fecha >= desde && r.Fecha < hastaExclusivo
                select new
                {
                    r.Id,
                    r.Fecha,
                    r.ImporteCalculado,
                    r.UsuarioCreacion,
                    IdVenta = v.Id,
                    v.IdVendedor,
                    IdCobradorVenta = v.IdCobrador,
                    v.Restante,
                    v.FechaVencimiento,
                    NumeroCuota = c.NumeroCuota,
                    FechaVencimientoCuota = c.FechaVencimiento,
                    Cliente = ((cli.Nombre ?? "") + " " + (cli.Apellido ?? "")).Trim()
                };

            if (idVendedor > 0)
            {
                q = q.Where(x =>
                    x.IdVendedor == idVendedor
                    || x.UsuarioCreacion == idVendedor
                    || (x.IdCobradorVenta.HasValue && x.IdCobradorVenta.Value == idVendedor));
            }

            var recargos = q.ToList();
            if (recargos.Count == 0) return;

            string nombreTipoElectro = null;
            try
            {
                nombreTipoElectro = db.TipoNegocio.AsNoTracking()
                    .Where(t => t.Id == 3)
                    .Select(t => t.Nombre)
                    .FirstOrDefault();
            }
            catch { /* ignore */ }
            if (string.IsNullOrWhiteSpace(nombreTipoElectro))
                nombreTipoElectro = "Electrodomésticos";

            var idsUsuario = recargos
                .SelectMany(x => new[] { x.IdVendedor, x.UsuarioCreacion, x.IdCobradorVenta ?? 0 })
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            var nombres = idsUsuario.Count == 0
                ? new Dictionary<int, string>()
                : db.Usuarios.AsNoTracking()
                    .Where(u => idsUsuario.Contains(u.Id))
                    .ToList()
                    .ToDictionary(u => u.Id, FormatearNombreUsuario);

            var filasInteresPorId = new Dictionary<int, List<VMRendimiento>>();
            foreach (var row in rows)
            {
                if (!EsFilaInteresElectro(row)) continue;
                var idRec = row.IdOriginal.HasValue && row.IdOriginal.Value > 0 ? row.IdOriginal.Value : row.Id;
                if (idRec <= 0) continue;
                List<VMRendimiento> lista;
                if (!filasInteresPorId.TryGetValue(idRec, out lista))
                {
                    lista = new List<VMRendimiento>();
                    filasInteresPorId[idRec] = lista;
                }
                lista.Add(row);
            }

            foreach (var rec in recargos)
            {
                List<VMRendimiento> yaEstaban;
                if (filasInteresPorId.TryGetValue(rec.Id, out yaEstaban))
                {
                    for (int i = 0; i < yaEstaban.Count; i++)
                    {
                        NormalizarFilaInteresElectro(yaEstaban[i], rec.Id, rec.IdVenta, rec.IdVendedor, rec.UsuarioCreacion,
                            rec.ImporteCalculado, rec.Fecha, rec.Restante, rec.FechaVencimientoCuota, rec.FechaVencimiento,
                            rec.Cliente, rec.NumeroCuota, nombreTipoElectro, nombres);
                    }
                    continue;
                }

                var nueva = new VMRendimiento();
                NormalizarFilaInteresElectro(nueva, rec.Id, rec.IdVenta, rec.IdVendedor, rec.UsuarioCreacion,
                    rec.ImporteCalculado, rec.Fecha, rec.Restante, rec.FechaVencimientoCuota, rec.FechaVencimiento,
                    rec.Cliente, rec.NumeroCuota, nombreTipoElectro, nombres);
                rows.Add(nueva);
            }
        }

        private static void NormalizarFilaInteresElectro(
            VMRendimiento row,
            int idRecargo,
            int idVenta,
            int idVendedor,
            int usuarioCreacion,
            decimal importe,
            DateTime fecha,
            decimal? restanteVenta,
            DateTime? proximoCobro,
            DateTime? fechaLimite,
            string cliente,
            int numeroCuota,
            string tipoNegocio,
            Dictionary<int, string> nombres)
        {
            if (row == null) return;

            row.Id = idRecargo;
            row.IdOriginal = idRecargo;
            row.IdVenta = idVenta;
            row.IdVendedor = idVendedor;
            row.IdCobrador = usuarioCreacion > 0 ? usuarioCreacion : 0;
            row.CapitalInicial = 0;
            row.Venta = 0;
            row.Cobro = 0;
            row.Interes = importe;
            row.CapitalFinal = restanteVenta ?? 0m;
            row.Fecha = fecha;
            row.ProximoCobro = proximoCobro;
            row.FechaLimite = fechaLimite;
            row.Cliente = cliente ?? row.Cliente;
            row.Descripcion = $"Interes Electrodomesticos #{idVenta} - Cuota {numeroCuota}";
            row.MetodoPago = "INTERÉS";
            row.IdTipoNegocio = 3;
            row.TipoNegocio = tipoNegocio;
            row.Origen = "ELECTRO";
            row.CuentaBancaria = null;

            if (nombres != null)
            {
                if (idVendedor > 0 && nombres.TryGetValue(idVendedor, out var nomV))
                    row.Vendedor = nomV;
                if (row.IdCobrador > 0 && nombres.TryGetValue(row.IdCobrador, out var nomC))
                    row.UsuarioCobro = nomC;
            }
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
            var idsRecargoElectro = new HashSet<int>();
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
                else if (EsFilaInteresElectro(r) || (d.Contains("electro") && (d.Contains("recargo") || d.Contains("descuento") || d.Contains("ajuste") || d.Contains("interes"))))
                {
                    if (r.Id > 0) idsRecargoElectro.Add(r.Id);
                    if (r.IdOriginal.HasValue && r.IdOriginal.Value > 0) idsRecargoElectro.Add(r.IdOriginal.Value);
                }
                else if (!d.Contains("electro"))
                    idsInformacionClasica.Add(r.Id);
            }

            var usuarioPorPagoId = new Dictionary<int, int>();
            var whatssapPagoPorId = new Dictionary<int, int>();
            foreach (var chunk in PartirIds(idsPagoElectro))
            {
                var parte = db.Ventas_Electrodomesticos_Pagos
                    .AsNoTracking()
                    .Where(p => chunk.Contains(p.Id))
                    .Select(p => new { p.Id, p.UsuarioCreacion, p.Whatssap })
                    .ToList();
                foreach (var p in parte)
                {
                    if (!usuarioPorPagoId.ContainsKey(p.Id))
                        usuarioPorPagoId[p.Id] = p.UsuarioCreacion;
                    if (!whatssapPagoPorId.ContainsKey(p.Id))
                        whatssapPagoPorId[p.Id] = p.Whatssap ?? 0;
                }
            }

            var cobradorPorInformacionId = new Dictionary<int, int?>();
            foreach (var chunk in PartirIds(idsInformacionClasica))
            {
                var parte = db.InformacionVentas
                    .AsNoTracking()
                    .Where(iv => chunk.Contains(iv.Id))
                    .Select(iv => new { iv.Id, iv.idCobrador })
                    .ToList();
                foreach (var x in parte)
                {
                    if (!cobradorPorInformacionId.ContainsKey(x.Id))
                        cobradorPorInformacionId[x.Id] = x.idCobrador;
                }
            }

            var usuarioCreacionRecargoPorId = new Dictionary<int, int>();
            if (idsRecargoElectro.Count > 0)
            {
                foreach (var chunk in PartirIds(idsRecargoElectro))
                {
                    var parte = db.Ventas_Electrodomesticos_Cuotas_Recargos
                        .AsNoTracking()
                        .Where(r => chunk.Contains(r.Id))
                        .Select(r => new { r.Id, r.UsuarioCreacion })
                        .ToList();
                    foreach (var x in parte)
                    {
                        if (!usuarioCreacionRecargoPorId.ContainsKey(x.Id))
                            usuarioCreacionRecargoPorId[x.Id] = x.UsuarioCreacion;
                    }
                }
            }

            var whatssapRecargoPorId = new Dictionary<int, int?>();
            if (idsRecargoElectro.Count > 0)
            {
                try
                {
                    foreach (var chunk in PartirIds(idsRecargoElectro))
                    {
                        var csvIds = string.Join(",", chunk);
                        if (string.IsNullOrWhiteSpace(csvIds)) continue;
                        var q = "SELECT Id, Whatssap FROM Ventas_Electrodomesticos_Cuotas_Recargos WHERE Id IN (" + csvIds + ")";
                        var rowsRec = db.Database.SqlQuery<IdWhatsRow>(q).ToList();
                        foreach (var x in rowsRec)
                        {
                            if (!whatssapRecargoPorId.ContainsKey(x.Id))
                                whatssapRecargoPorId[x.Id] = x.Whatssap;
                        }
                    }
                }
                catch
                {
                    whatssapRecargoPorId = new Dictionary<int, int?>();
                }
            }

            var vendedorIdPorVentaElectro = new Dictionary<int, int>();
            var vendedorIdPorVentaClasica = new Dictionary<int, int>();
            foreach (var chunk in PartirIds(idVentas))
            {
                var electro = db.Ventas_Electrodomesticos
                    .AsNoTracking()
                    .Where(v => chunk.Contains(v.Id))
                    .Select(v => new { v.Id, v.IdVendedor })
                    .ToList();
                foreach (var x in electro)
                {
                    if (!vendedorIdPorVentaElectro.ContainsKey(x.Id))
                        vendedorIdPorVentaElectro[x.Id] = x.IdVendedor;
                }

                var clasica = db.Ventas
                    .AsNoTracking()
                    .Where(v => chunk.Contains(v.Id))
                    .Select(v => new { v.Id, v.idVendedor })
                    .ToList();
                foreach (var x in clasica)
                {
                    if (!vendedorIdPorVentaClasica.ContainsKey(x.Id))
                        vendedorIdPorVentaClasica[x.Id] = x.idVendedor;
                }
            }

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
            foreach (var u in usuarioCreacionRecargoPorId.Values)
                idsUsuarios.Add(u);
            foreach (var vid in idVentas)
            {
                if (vendedorIdPorVentaElectro.TryGetValue(vid, out var ve)) idsUsuarios.Add(ve);
                if (vendedorIdPorVentaClasica.TryGetValue(vid, out var vc)) idsUsuarios.Add(vc);
            }
            foreach (var r in rows)
            {
                if (r != null && r.IdVendedor > 0) idsUsuarios.Add(r.IdVendedor);
                if (r != null && r.IdCobrador > 0) idsUsuarios.Add(r.IdCobrador);
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

                // Electro: el SP etiqueta intereses como RECARGO; en pantalla se muestra como INTERÉS.
                if (!string.IsNullOrWhiteSpace(r.MetodoPago)
                    && string.Equals(r.MetodoPago.Trim(), "RECARGO", StringComparison.OrdinalIgnoreCase))
                {
                    r.MetodoPago = "INTERÉS";
                }

                if (d.Contains("electro") && d.Contains("cobranza"))
                {
                    if (usuarioPorPagoId.TryGetValue(r.Id, out var idUc))
                        r.IdCobrador = idUc;
                    if (whatssapPagoPorId.TryGetValue(r.Id, out var wsPago))
                        r.whatssap = wsPago;
                }
                else if (EsFilaInteresElectro(r) || (d.Contains("electro") && (d.Contains("recargo") || d.Contains("descuento") || d.Contains("ajuste") || d.Contains("interes"))))
                {
                    var idRec = r.IdOriginal.HasValue && r.IdOriginal.Value > 0 ? r.IdOriginal.Value : r.Id;
                    if (idRec > 0 && whatssapRecargoPorId.TryGetValue(idRec, out var ws))
                        r.whatssap = ws ?? 0;
                    if (idRec > 0 && usuarioCreacionRecargoPorId.TryGetValue(idRec, out var idOp) && idOp > 0)
                        r.IdCobrador = idOp;

                    if (!string.IsNullOrWhiteSpace(r.Descripcion)
                        && r.Descripcion.IndexOf("Recargo", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        r.Descripcion = r.Descripcion.Replace("Recargo", "Interes").Replace("recargo", "Interes");
                    }
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
                                    || d.Contains("electro")
                                    || EsFilaInteresElectro(r);

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
