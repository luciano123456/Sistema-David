using DocumentFormat.OpenXml.Office2010.Excel;
using Sistema_David.Helpers;
using Sistema_David.Models.DB;
using Sistema_David.Models.Manager;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class CobranzasModel
    {




        public static List<VMVenta> ListaCobranzas(int idVendedor, int idCobradorF, DateTime FechaCobroDesde, DateTime FechaCobroHasta, string DNI, int idZona, string Turno, int TipoNegocio)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                int idUsuarioSesion = SessionHelper.GetUsuarioSesion().Id;

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
                              where ((!string.IsNullOrEmpty(DNI) &&
                                     (c.Dni.ToUpper().Contains(DNI.ToUpper()) || (c.Nombre + " " + c.Apellido).ToUpper().Contains(DNI.ToUpper())) &&
                                     d.Restante > 0) ||
                                    (string.IsNullOrEmpty(DNI) &&
                                     (d.idVendedor == idVendedor || idVendedor == -1) &&
                                     (d.idCobrador == idCobradorF || (idCobradorF == -1 && (d.idCobrador == 0 || !string.IsNullOrEmpty(DNI))))  &&
                                     (c.IdZona == idZona || idZona == -1) &&
                                     ((idCobradorF == d.idCobrador) || (idCobradorF != d.idCobrador && d.FechaCobro >= FechaCobroDesde && d.FechaCobro <= FechaCobroHasta) || (rc.Estado == "Pendiente" && r.IdUsuario == idUsuarioSesion)) &&
                                     d.Restante > 0) &&
                                     (d.Estado == "" || d.Estado == null) &&
                                     (d.Turno == Turno || Turno == "Todos") &&
                                     (r == null || r.IdUsuario == idUsuarioSesion || r != null && r.IdUsuario != idUsuarioSesion) &&
                                     (d.IdTipoNegocio == TipoNegocio || TipoNegocio == -1)

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
                                  Importante = (int)d.Importante,
                                  TelefonoCliente = c.Telefono,
                                  Orden = (int)d.Orden,
                                  ValorCuota = (decimal)d.ValorCuota,
                                  idEstado = (int)c.IdEstado,
                                  EstadoCliente = ec.Nombre,
                                  idCobrador = (int)d.idCobrador,
                                  SaldoCliente = (decimal)db.Ventas.Where(v => v.idCliente == c.Id && v.Restante > 0).Sum(v => v.Restante),
                                  Cobrador = cob != null ? cob.Nombre : string.Empty,
                                  Comprobante = (int)d.Comprobante,
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
                                  EstadoCobro = d.EstadoCobro != null ? d.EstadoCobro : ""
                              }).ToList();

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
                List<VMVenta> result = new List<VMVenta>();

                foreach (int clienteId in clientes)
                {
                    var cobranzas = (from d in db.Ventas
                                     join c in db.Clientes on d.idCliente equals c.Id
                                     join z in db.Zonas on c.IdZona equals z.Id
                                     join u in db.Usuarios on d.idVendedor equals u.Id
                                     join ec in db.EstadosClientes on c.IdEstado equals ec.Id
                                     join cob in db.Usuarios on d.idCobrador equals cob.Id into cobradorJoin
                                     from cob in cobradorJoin.DefaultIfEmpty()
                                     where
                                        // Filtro por ID de cliente específico
                                        d.idCliente == clienteId &&
                                        (
                                            (!string.IsNullOrEmpty(DNI) &&
                                            (c.Dni.ToUpper().Contains(DNI.ToUpper()) || (c.Nombre + " " + c.Apellido).ToUpper().Contains(DNI.ToUpper())) &&
                                            d.Restante > 0) ||
                                            (string.IsNullOrEmpty(DNI) &&
                                            (d.idVendedor == idVendedor || idVendedor == -1) &&
                                            (d.idCobrador == idCobradorF || (idCobradorF == -1 && (d.idCobrador == 0 || !string.IsNullOrEmpty(DNI)))) &&
                                            (c.IdZona == idZona || idZona == -1) &&
                                            ((idCobradorF == d.idCobrador) || (idCobradorF != d.idCobrador && d.FechaCobro >= FechaCobroDesde && d.FechaCobro <= FechaCobroHasta)) &&
                                            d.Restante > 0) &&
                                            (d.Estado == "" || d.Estado == null)
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
                                         Importante = (int)d.Importante,
                                         TelefonoCliente = c.Telefono,
                                         Orden = (int)d.Orden,
                                         ValorCuota = (decimal)d.ValorCuota,
                                         idEstado = (int)c.IdEstado,
                                         EstadoCliente = ec.Nombre,
                                         idCobrador = (int)d.idCobrador,
                                         SaldoCliente = (decimal)db.Ventas.Where(v => v.idCliente == c.Id && v.Restante > 0).Sum(v => v.Restante),
                                         Cobrador = cob != null ? cob.Nombre : string.Empty,
                                         Comprobante = (int)d.Comprobante,
                                         Latitud = c.Latitud,
                                         Longitud = c.Longitud
                                     }).ToList();

                    result.AddRange(cobranzas);
                }

                return result;
            }
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


        

        public static int Cobranza(VMVenta model)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {



                    if (model != null)
                    {
                        var venta = db.Ventas.Find(model.Id);

                        //Si tiene un recorrido, le hacemos la suma automaticamente

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
                        venta.EstadoCobro = model.EstadoCobro;
                        


                        var cliente = ClientesModel.InformacionCliente(venta.idCliente);

                        var saldo = cliente.Saldo - model.Entrega;

                        if(saldo <= 0)
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
                        infoventa.ClienteAusente = int.Parse(model.EstadoCobro); ;
                        infoventa.ProximoCobro = model.FechaCobro;
                        infoventa.Deuda = (ClientesModel.BuscarCliente(venta.idCliente).Saldo + model.Interes) - model.Entrega;
                        infoventa.Imagen = model.Imagen;
                        infoventa.IdTipoNegocio = venta.IdTipoNegocio;
                        infoventa.TipoNegocio = UsuariosModel.BuscarTipoNegocio((int)venta.IdTipoNegocio).Nombre;
                        infoventa.IdCuentaBancaria = model.MetodoPago.ToUpper() != "EFECTIVO" ? model.IdCuenta : 0 ;

                        VentasModel.AgregarInformacionVenta(infoventa);

                        db.SaveChanges();

                        return 1;
                    }
                    return 3;
                }
            }
            catch (Exception e)
            {
                return 3;
            }
        }


    }
}