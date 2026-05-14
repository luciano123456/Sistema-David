using DocumentFormat.OpenXml.Office2010.Excel;
using NPOI.SS.Formula.Functions;
using Sistema_David.Helpers;
using Sistema_David.Models.DB;
using Sistema_David.Models.Manager;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class CobranzasModel
    {


        public static List<VMVenta> ListaCobranzasPendientes()
        {
            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {
                    var result = (from d in db.Ventas
                                  join c in db.Clientes on d.idCliente equals c.Id
                                  join z in db.Zonas on c.IdZona equals z.Id
                                  join u in db.Usuarios on d.idVendedor equals u.Id
                                  join ec in db.EstadosClientes on c.IdEstado equals ec.Id
                                  join cob in db.Usuarios on d.idCobrador equals cob.Id into cobradorJoin
                                  from cob in cobradorJoin.DefaultIfEmpty()
                                  join rc in db.RecorridosCobranzas on d.Id equals rc.IdVenta into recorridosCobranzasJoin
                                  from rc in recorridosCobranzasJoin.DefaultIfEmpty()
                                  join r in db.Recorridos on rc.IdRecorrido equals r.Id into recorridosJoin
                                  from r in recorridosJoin.DefaultIfEmpty()
                                  where d.CobroPendiente != null && d.CobroPendiente == 1
                                  select new VMVenta
                                  {
                                      Id = d.Id,
                                      idCliente = d.idCliente,
                                      Fecha = d.Fecha,
                                      Entrega = d.Entrega,
                                      Restante = d.Restante,
                                      FechaCobro = d.FechaCobro,
                                      FechaLimite = d.FechaLimite,
                                      idVendedor = d.idVendedor,
                                      idZona = c.IdZona ?? 0,
                                      Zona = z.Nombre,
                                      Observacion = d.Observacion,
                                      Cliente = c.Nombre + " " + c.Apellido,
                                      Direccion = c.Direccion,
                                      Vendedor = u.Nombre,
                                      DniCliente = c.Dni,
                                      Importante = d.Importante ?? 0,
                                      TelefonoCliente = c.Telefono,
                                      Orden = d.Orden ?? 999,
                                      ValorCuota = d.ValorCuota ?? 0,
                                      idEstado = c.IdEstado ?? 0,
                                      EstadoCliente = ec.Nombre,
                                      idCobrador = d.idCobrador ?? 0,
                                      SaldoCliente = db.Ventas
                                          .Where(v => v.idCliente == c.Id && v.Restante > 0)
                                          .Sum(v => (decimal?)v.Restante) ?? 0,
                                      Cobrador = cob != null ? cob.Nombre : string.Empty,
                                      Comprobante = d.Comprobante ?? 0,
                                      Latitud = c.Latitud,
                                      Longitud = c.Longitud,
                                      IdRecorrido = rc != null ? rc.IdRecorrido ?? 0 : 0,
                                      EstadoRecorrido = rc != null ? rc.Estado : string.Empty,
                                      OrdenRecorridoCobro = rc != null ? rc.Orden ?? 0 : 0,
                                      OrdenRecorrido = r != null ? (int)r.Orden : 0,
                                      EnRecorrido = rc != null && rc.Estado != "Finalizado",
                                      Turno = string.IsNullOrEmpty(d.Turno) ? "N/A" : d.Turno,
                                      IdUsuarioRecorrido = r != null ? (int)r.IdUsuario : 0,
                                      FranjaHoraria = d.FranjaHoraria ?? "",
                                      EstadoCobro = d.EstadoCobro ?? "",
                                      LimiteVentas = c.LimiteVentas ?? 0
                                  }).ToList();

                    result = result.OrderBy(v => v.EnRecorrido ? 0 : 1)
                                   .ThenBy(v => v.EnRecorrido ? v.OrdenRecorrido : 0)
                                   .ThenBy(v => v.Importante)
                                   .ToList();

                    return result;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error en ListaCobranzasPendientes: " + ex.Message);
                return null;
            }
        }


        public static List<VMVenta> ListaCobranzas(int idVendedor, int idCobradorF, DateTime FechaCobroDesde, DateTime FechaCobroHasta, string DNI, int idZona, string Turno, int TipoNegocio, int CobrosPendientes)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var busqueda = (DNI ?? string.Empty).Trim().ToUpper();
                // Fecha cobro: solo si no hay búsqueda DNI/nombre y cobrador = Todos (-1).
                var fcDesde = FechaCobroDesde.Date;
                var fcHastaExcl = FechaCobroHasta.Date.AddDays(1);

                var result = (from d in db.Ventas
                              join c in db.Clientes on d.idCliente equals c.Id
                              join z in db.Zonas on c.IdZona equals z.Id
                              join u in db.Usuarios on d.idVendedor equals u.Id
                              join ec in db.EstadosClientes on c.IdEstado equals ec.Id
                              join cob in db.Usuarios on d.idCobrador equals cob.Id into cobradorJoin
                              from cob in cobradorJoin.DefaultIfEmpty()
                              join rc in db.RecorridosCobranzas on d.Id equals rc.IdVenta into recorridosCobranzasJoin
                              from rc in recorridosCobranzasJoin.DefaultIfEmpty()
                              join r in db.Recorridos on rc.IdRecorrido equals r.Id into recorridosJoin
                              from r in recorridosJoin.DefaultIfEmpty()
                              where (busqueda != ""
                                     || idCobradorF != -1
                                     || (d.FechaCobro != null && d.FechaCobro >= fcDesde && d.FechaCobro < fcHastaExcl))
                                    && (
                                         (busqueda != "" &&
                                          d.Restante > 0 &&
                                          (d.Estado == "" || d.Estado == null))
                                         ||
                                         (
                                             (busqueda == "" &&
                                              (d.idVendedor == idVendedor || idVendedor == -1) &&
                                              (idCobradorF == -1 || d.idCobrador == idCobradorF) &&
                                              (c.IdZona == idZona || idZona == -1) &&
                                              d.Restante > 0)
                                             &&
                                             (d.Estado == "" || d.Estado == null) &&
                                             (d.Turno == Turno || Turno == "Todos") &&
                                             (d.IdTipoNegocio == TipoNegocio || TipoNegocio == -1) &&
                                             (d.CobroPendiente == CobrosPendientes || CobrosPendientes == -1)
                                         )
                                       )
                              select new VMVenta
                              {
                                  Id = d.Id,
                                  idCliente = d.idCliente,
                                  Fecha = d.Fecha,
                                  Entrega = d.Entrega,
                                  Restante = d.Restante,
                                  FechaCobro = d.FechaCobro,
                                  FechaLimite = d.FechaLimite,
                                  idVendedor = d.idVendedor,
                                  idZona = (int)c.IdZona,
                                  Zona = z.Nombre,
                                  Observacion = d.Observacion,
                                  Cliente = c.Nombre + " " + c.Apellido,
                                  Direccion = c.Direccion,
                                  Vendedor = u.Nombre,
                                  DniCliente = c.Dni,
                                  Importante = d.Importante ?? 0,
                                  TelefonoCliente = c.Telefono,
                                  Orden = d.Orden ?? 0,
                                  ValorCuota = d.ValorCuota ?? 0,
                                  idEstado = c.IdEstado ?? 0,
                                  EstadoCliente = ec.Nombre,
                                  idCobrador = d.idCobrador ?? 0,
                                  SaldoCliente = 0,
                                  Cobrador = cob != null ? cob.Nombre : string.Empty,
                                  Comprobante = d.Comprobante ?? 0,
                                  Latitud = c.Latitud,
                                  Longitud = c.Longitud,
                                  // Campos de RecorridosCobranzas
                                  IdRecorrido = rc != null ? (int)rc.IdRecorrido : 0,
                                  EstadoRecorrido = rc != null ? rc.Estado : string.Empty,
                                  OrdenRecorridoCobro = rc != null ? (int)rc.Orden : 0,
                                  OrdenRecorrido = r != null ? (int)r.Orden : 0,
                                  EnRecorrido = rc != null && rc.Estado != "Finalizado",
                                  Turno = d.Turno != null ? d.Turno : "N/A",
                                  IdUsuarioRecorrido = r != null ? (int)r.IdUsuario : 0,
                                  FranjaHoraria = d.FranjaHoraria != null ? d.FranjaHoraria : "",
                                  EstadoCobro = d.EstadoCobro != null ? d.EstadoCobro : "",
                                  LimiteVentas = c.LimiteVentas ?? 0,
                              }).ToList();

                if (busqueda != "")
                {
                    result = AplicarBusquedaLibre(result, busqueda);
                }

                // Resolver saldos por cliente en bloque (evita subconsultas por fila y mejora mucho rendimiento).
                var idsClientes = result.Select(v => v.idCliente).Distinct().ToList();
                var saldosPorCliente = ObtenerSaldosPorCliente(db, idsClientes);
                foreach (var item in result)
                {
                    if (saldosPorCliente.TryGetValue(item.idCliente, out var saldo))
                        item.SaldoCliente = saldo;
                }

                // Ordenar por si está en un recorrido, luego por el orden del recorrido, y finalmente por otra ordenación que desees
                result = result.OrderBy(v => v.EnRecorrido ? 0 : 1)
                               .ThenBy(v => v.EnRecorrido ? v.OrdenRecorrido : 0)
                               .ThenBy(v => v.Importante)
                               .ToList();

                return result;
            }
        }


        public static List<VMVenta> ListaCobranzas(int idVendedor, int idCobradorF, DateTime FechaCobroDesde, DateTime FechaCobroHasta, string DNI, int idZona, List<int> clientes)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var busqueda = (DNI ?? string.Empty).Trim().ToUpper();
                if (clientes == null || clientes.Count == 0)
                    return new List<VMVenta>();

                var idsClientesFiltro = clientes.Distinct().ToList();
                var fcDesde = FechaCobroDesde.Date;
                var fcHastaExcl = FechaCobroHasta.Date.AddDays(1);

                var result = (from d in db.Ventas
                              join c in db.Clientes on d.idCliente equals c.Id
                              join z in db.Zonas on c.IdZona equals z.Id
                              join u in db.Usuarios on d.idVendedor equals u.Id
                              join ec in db.EstadosClientes on c.IdEstado equals ec.Id
                              join cob in db.Usuarios on d.idCobrador equals cob.Id into cobradorJoin
                              from cob in cobradorJoin.DefaultIfEmpty()
                              where idsClientesFiltro.Contains(d.idCliente) &&
                                    (busqueda != ""
                                     || idCobradorF != -1
                                     || (d.FechaCobro != null && d.FechaCobro >= fcDesde && d.FechaCobro < fcHastaExcl)) &&
                                    (
                                        (busqueda != "" &&
                                         d.Restante > 0 &&
                                         (d.Estado == "" || d.Estado == null)) ||
                                        ((busqueda == "" &&
                                          (d.idVendedor == idVendedor || idVendedor == -1) &&
                                          (idCobradorF == -1 || d.idCobrador == idCobradorF) &&
                                          (c.IdZona == idZona || idZona == -1) &&
                                          d.Restante > 0) &&
                                         (d.Estado == "" || d.Estado == null))
                                    )
                              select new VMVenta
                              {
                                  Id = d.Id,
                                  idCliente = d.idCliente,
                                  Fecha = d.Fecha,
                                  Entrega = d.Entrega,
                                  Restante = d.Restante,
                                  FechaCobro = d.FechaCobro,
                                  FechaLimite = d.FechaLimite,
                                  idVendedor = d.idVendedor,
                                  idZona = (int)c.IdZona,
                                  Zona = z.Nombre,
                                  Observacion = d.Observacion,
                                  Cliente = c.Nombre + " " + c.Apellido,
                                  Direccion = c.Direccion,
                                  Vendedor = u.Nombre,
                                  DniCliente = c.Dni,
                                  Importante = d.Importante ?? 0,
                                  TelefonoCliente = c.Telefono,
                                  Orden = d.Orden ?? 0,
                                  ValorCuota = d.ValorCuota ?? 0,
                                  idEstado = c.IdEstado ?? 0,
                                  EstadoCliente = ec.Nombre,
                                  idCobrador = d.idCobrador ?? 0,
                                  SaldoCliente = 0,
                                  Cobrador = cob != null ? cob.Nombre : string.Empty,
                                  Comprobante = d.Comprobante ?? 0,
                                  Latitud = c.Latitud,
                                  Longitud = c.Longitud
                              }).ToList();

                if (busqueda != "")
                {
                    result = AplicarBusquedaLibre(result, busqueda);
                }

                var idsClientes = result.Select(v => v.idCliente).Distinct().ToList();
                var saldosPorCliente = ObtenerSaldosPorCliente(db, idsClientes);
                foreach (var item in result)
                {
                    if (saldosPorCliente.TryGetValue(item.idCliente, out var saldo))
                        item.SaldoCliente = saldo;
                }

                return result;
            }
        }

        private static Dictionary<int, decimal> ObtenerSaldosPorCliente(Sistema_DavidEntities db, List<int> idsClientes)
        {
            if (idsClientes == null || idsClientes.Count == 0)
                return new Dictionary<int, decimal>();

            var saldoIndumentaria = db.Ventas
                .Where(v => idsClientes.Contains(v.idCliente) && v.Restante > 0)
                .GroupBy(v => v.idCliente)
                .Select(g => new { IdCliente = g.Key, Saldo = g.Sum(x => (decimal?)x.Restante) ?? 0m })
                .ToList();

            var saldoElectro = db.Ventas_Electrodomesticos
                .Where(v => idsClientes.Contains(v.IdCliente) && v.Restante > 0)
                .GroupBy(v => v.IdCliente)
                .Select(g => new { IdCliente = g.Key, Saldo = g.Sum(x => (decimal?)x.Restante) ?? 0m })
                .ToList();

            var dict = new Dictionary<int, decimal>();
            foreach (var row in saldoIndumentaria)
            {
                dict[row.IdCliente] = row.Saldo;
            }
            foreach (var row in saldoElectro)
            {
                if (dict.ContainsKey(row.IdCliente)) dict[row.IdCliente] += row.Saldo;
                else dict[row.IdCliente] = row.Saldo;
            }

            return dict;
        }

        private static List<VMVenta> AplicarBusquedaLibre(List<VMVenta> data, string busqueda)
        {
            if (data == null || data.Count == 0) return data ?? new List<VMVenta>();

            var normalizada = NormalizarTextoBusqueda(busqueda);
            if (string.IsNullOrWhiteSpace(normalizada)) return data;

            var tokens = normalizada
                .Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries)
                .Distinct()
                .ToList();

            if (tokens.Count == 0) return data;

            return data.Where(v =>
            {
                var nombre = NormalizarTextoBusqueda(v.Cliente);
                var dni = NormalizarTextoBusqueda(v.DniCliente);
                var comp = (nombre + " " + dni).Trim();
                return tokens.All(t => comp.Contains(t));
            }).ToList();
        }

        private static string NormalizarTextoBusqueda(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;

            var formD = input.Trim().ToUpperInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(formD.Length);
            var prevSpace = false;

            foreach (var ch in formD)
            {
                var uc = CharUnicodeInfo.GetUnicodeCategory(ch);
                if (uc == UnicodeCategory.NonSpacingMark) continue;

                if (char.IsWhiteSpace(ch))
                {
                    if (!prevSpace)
                    {
                        sb.Append(' ');
                        prevSpace = true;
                    }
                    continue;
                }

                prevSpace = false;
                sb.Append(ch);
            }

            return sb.ToString().Trim();
        }



        public static bool ColumnSet(int id, int orden)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {


                    var venta = db.Ventas.Find(id);

                    if (venta != null && orden >= 1)
                    {
                        venta.Orden = orden;
                    }
                    else
                    {
                        return false;
                    }

                    db.Entry(venta).State = System.Data.Entity.EntityState.Modified;

                    db.SaveChanges();

                    return true;
                }
            }
            catch (Exception e)
            {
                return false;
            }
        }

        public static bool ColumnImportante(int id, int importante, int orden)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {


                    var venta = db.Ventas.Find(id);

                    if (venta != null)
                    {
                        venta.Orden = orden;
                        venta.Importante = importante;
                    }
                    else
                    {
                        return false;
                    }

                    db.Entry(venta).State = System.Data.Entity.EntityState.Modified;

                    db.SaveChanges();

                    return true;
                }
            }
            catch (Exception e)
            {
                return false;
            }
        }


        public static bool ColumnUp(int id)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {


                    var venta = db.Ventas.Find(id);

                    if (venta != null && venta.Orden > 1)
                    {
                        venta.Orden -= 1;
                    }
                    else
                    {
                        return false;
                    }

                    db.Entry(venta).State = System.Data.Entity.EntityState.Modified;

                    db.SaveChanges();

                    return true;
                }
            }
            catch (Exception e)
            {
                return false;
            }
        }

        public static bool AgregarInformacionCobranza(InformacionVentas model)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    if (model == null)
                        return false;

                    VMVenta modelVenta = VentasModel.BuscarVenta(model.IdVenta);

                    model.Fecha = DateTime.Now;
                    model.Entrega = model.Entrega;
                    model.Observacion = model.Observacion;
                    model.ClienteAusente = 1;
                    model.idCobrador = SessionHelper.GetUsuarioSesion().Id;
                    model.idVendedor = modelVenta.idVendedor;
                    model.Entrega = 0;
                    model.ValorCuota = modelVenta.ValorCuota;
                    model.Restante = modelVenta.Restante;
                    model.Interes = modelVenta.Interes;
                    model.whatssap = 0;
                    model.Deuda = (ClientesModel.BuscarCliente(modelVenta.idCliente).Saldo);
                    model.ProximoCobro = modelVenta.FechaCobro;
                    model.Descripcion = "-";

                    VentasModel.setEstadoCobro(model.IdVenta, "1");

                    db.InformacionVentas.Add(model);
                    db.SaveChanges();

                    return true; // Éxito
                }
            }
            catch (Exception e)
            {
                // Manejar la excepción
                return false; // Código para excepción
            }
        }
        public static bool ColumnDown(int id)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {


                    var venta = db.Ventas.Find(id);

                    if (venta != null)
                    {
                        venta.Orden += 1;
                    }
                    else
                    {
                        return false;
                    }

                    db.Entry(venta).State = System.Data.Entity.EntityState.Modified;

                    db.SaveChanges();

                    return true;
                }
            }
            catch (Exception e)
            {
                return false;
            }
        }


        public static bool AsignarCobrador(List<int> cobranzas, int idcobrador)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    foreach (int cobranza in cobranzas)
                    {

                        var venta = db.Ventas.Find(cobranza);

                        if (venta != null)
                        {
                            venta.idCobrador = idcobrador;
                        }
                        else
                        {
                            return false;
                        }

                        db.Entry(venta).State = System.Data.Entity.EntityState.Modified;



                    }

                    db.SaveChanges();

                    return true;
                }
            }
            catch (Exception e)
            {
                return false;
            }

        }

        public static bool AsignarTurno(List<int> cobranzas, string turno)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    foreach (int cobranza in cobranzas)
                    {

                        var venta = db.Ventas.Find(cobranza);

                        if (venta != null)
                        {
                            venta.Turno = turno.ToUpper();
                        }
                        else
                        {
                            return false;
                        }

                        db.Entry(venta).State = System.Data.Entity.EntityState.Modified;



                    }

                    db.SaveChanges();

                    return true;
                }
            }
            catch (Exception e)
            {
                return false;
            }

        }




        public static int Cobranza(VMCobranza model)
        {
            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {
                    using (var transaction = db.Database.BeginTransaction()) // Inicia la transacción
                    {
                        try
                        {
                            if (model != null)
                            {
                                var venta = db.Ventas.Find(model.Id);

                                // Si tiene un recorrido, le hacemos la suma automáticamente
                                var recorrido = RecorridosModel.BuscarRecorridoUser(SessionHelper.GetUsuarioSesion().Id);

                                if (recorrido != null)
                                {
                                    var recorridoCobranzaVenta = RecorridosModel.BuscarRecorridoVenta(recorrido.IdUsuario, venta.Id);
                                    var resp = RecorridosModel.ColumnDownPendiente(recorrido.Id, venta.Id);
                                }

                                venta.FechaCobro = model.FechaCobro;
                                venta.Restante -= model.Entrega;
                                venta.Entrega = model.Entrega;
                                venta.ValorCuota = model.ValorCuota;
                                venta.Importante = 0;
                                venta.Orden = 999;
                                venta.Interes += model.Interes;
                                venta.Restante += model.Interes;
                                venta.idCobrador = 0;
                                venta.Turno = model.Turno.ToUpper();
                                venta.FranjaHoraria = model.FranjaHoraria;
                                venta.EstadoCobro = model.EstadoCobro != null ? model.EstadoCobro : null;
                                venta.CobroPendiente = model.CobroPendiente != null ? model.CobroPendiente : 0;


                                var cliente = ClientesModel.InformacionCliente(venta.idCliente);
                                var saldo = cliente.Saldo - model.Entrega;

                                if (saldo <= 0)
                                {
                                    ClientesModel.SetearClienteEnCero(venta.idCliente);
                                }

                                db.Entry(venta).State = System.Data.Entity.EntityState.Modified;

                                InformacionVentas infoventa = new InformacionVentas();

                                if (model.Interes == 0)
                                {
                                    infoventa.Interes = 0;
                                    infoventa.Descripcion = "Cobranza a " + venta.Clientes.Nombre + " de " + model.Entrega + " pesos.";
                                }
                                else
                                {
                                    infoventa.Interes = model.Interes;
                                    infoventa.Descripcion = "Interes a " + venta.Clientes.Nombre + " de " + model.Interes + " pesos.";
                                }

                                infoventa.IdVenta = model.Id;
                                infoventa.Entrega = model.Entrega;
                                infoventa.ValorCuota = venta.ValorCuota;
                                infoventa.Restante = venta.Restante;
                                infoventa.Observacion = model.Observacion;
                                infoventa.ValorCuota = model.ValorCuota;
                                infoventa.MetodoPago = model.MetodoPago != null ? model.MetodoPago.ToUpper() : "";
                                infoventa.idCobrador = SessionHelper.GetUsuarioSesion().Id;
                                infoventa.whatssap = 0;
                                infoventa.ClienteAusente = model.EstadoCobro != null ? int.Parse(model.EstadoCobro) : 0;
                                infoventa.ProximoCobro = model.FechaCobro;
                                infoventa.Deuda = (ClientesModel.BuscarCliente(venta.idCliente).Saldo + model.Interes) - model.Entrega;
                                infoventa.Imagen = model.Imagen;
                                infoventa.IdTipoNegocio = venta.IdTipoNegocio;
                                infoventa.TipoNegocio = UsuariosModel.BuscarTipoNegocio((int)venta.IdTipoNegocio).Nombre;
                                infoventa.IdCuentaBancaria = model.MetodoPago != null && model.MetodoPago.ToUpper() != "EFECTIVO" ? (int?)model.IdCuenta : null;
                                infoventa.TipoInteres = model.TipoInteres;
                                infoventa.ActualizoUbicacion = model.ActualizoUbicacion;
                                infoventa.CobroPendiente = model.CobroPendiente != null ? model.CobroPendiente : 0;
                                VentasModel.AgregarInformacionVenta(infoventa);

                                db.SaveChanges();
                                transaction.Commit(); // Confirma la transacción si todo salió bien
                                return 1;
                            }
                            return 3;
                        }
                        catch (Exception ex)
                        {
                            transaction.Rollback(); // Revierte los cambios si hay un error
                            return 3;
                        }
                    }
                }
            }
            catch (Exception)
            {
                return 3;
            }
        }



    }
}