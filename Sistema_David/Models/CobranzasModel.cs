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




        public static List<Venta> ListaCobranzas(int idVendedor, int idCobrador, DateTime FechaCobroDesde, DateTime FechaCobroHasta, string DNI, int idZona)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from d in db.Ventas
                              join c in db.Clientes on d.idCliente equals c.Id
                              join z in db.Zonas on c.IdZona equals z.Id
                              join u in db.Usuarios on d.idVendedor equals u.Id
                              join ec in db.EstadosClientes on c.IdEstado equals ec.Id
                              where ((!string.IsNullOrEmpty(DNI) &&
                                     (c.Dni.ToUpper().Contains(DNI.ToUpper()) || (c.Nombre + " " + c.Apellido).ToUpper().Contains(DNI.ToUpper())) &&
                                     d.Restante > 0) ||
                                    (string.IsNullOrEmpty(DNI) &&
                                     (d.idVendedor == idVendedor || idVendedor == -1) &&
                                     (d.idCobrador == idCobrador || (idCobrador == -1 && d.idCobrador == 0)) &&
                                     (c.IdZona == idZona || idZona == -1) &&
                                     ((idCobrador == d.idCobrador) || (idCobrador != d.idCobrador && d.FechaCobro >= FechaCobroDesde && d.FechaCobro <= FechaCobroHasta)) &&
                                     d.Restante > 0)
                              )
                              orderby d.Importante descending
                              select new Venta
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
                                  SaldoCliente = (decimal)db.Ventas.Where(v => v.idCliente == c.Id && v.Restante > 0).Sum(v => v.Restante)
                              }).ToList();

                return result;
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


        public static bool Cobranza(Ventas model)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    if (model != null)
                    {
                        var venta = db.Ventas.Find(model.Id);
                        venta.FechaCobro = model.FechaCobro;
                        venta.Restante -= model.Entrega;
                        venta.Entrega = model.Entrega;
                        venta.ValorCuota = model.ValorCuota;
                        venta.Importante = 0;
                        venta.Orden = 999;
                        venta.Interes += model.Interes;
                        venta.Restante += model.Interes;
                        venta.idCobrador = 0;
                        

                        db.Entry(venta).State = System.Data.Entity.EntityState.Modified;

                        InformacionVentas infoventa = new InformacionVentas();

                        if(model.Interes == 0)
                        {
                            infoventa.Interes = 0;
                            infoventa.Descripcion = "Cobranza a " + venta.Clientes.Nombre + " de " + model.Entrega + " pesos.";
                        } else
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
                        infoventa.MetodoPago = model.MetodoPago.ToUpper();
                        infoventa.idCobrador = SessionHelper.GetUsuarioSesion().Id;

                        VentasModel.AgregarInformacionVenta(infoventa);

                        db.SaveChanges();

                        return true;
                    }
                    return false;
                }
            }
            catch (Exception e)
            {
                return false;
            }
        }


    }
}