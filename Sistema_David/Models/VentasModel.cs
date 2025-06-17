using DocumentFormat.OpenXml.ExtendedProperties;
using Microsoft.Ajax.Utilities;
using NPOI.SS.Formula.Functions;
using Sistema_David.Helpers;
using Sistema_David.Models.DB;
using Sistema_David.Models.Manager;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Data.SqlClient;
using System.Linq;
using System.Threading.Tasks;

namespace Sistema_David.Models.Modelo
{
    public class VentasModel
    {


        public static List<VMVenta> ListaVentasUsuario(int idUsuario)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from v in db.Ventas
                              join c in db.Clientes on v.idCliente equals c.Id
                              join u in db.Usuarios on v.idVendedor equals u.Id
                              where v.idVendedor == idUsuario
                              select new VMVenta
                              {
                                  Id = v.Id,
                                  idCliente = v.idCliente,
                                  Fecha = v.Fecha,
                                  Entrega = v.Entrega,
                                  Restante = v.Restante,
                                  FechaCobro = v.FechaCobro,
                                  FechaLimite = v.FechaLimite,
                                  idVendedor = v.idVendedor,
                                  Observacion = v.Observacion,
                                  Cliente = c.Nombre + " " + c.Apellido,
                                  Direccion = c.Direccion,
                                  Vendedor = u.Nombre,
                                  DniCliente = c.Dni,
                                  ValorCuota = v.ValorCuota.HasValue ? v.ValorCuota.Value : 0,
                                  Interes = v.Interes.HasValue ? v.Interes.Value : 0,
                                  idCobrador = v.idCobrador.HasValue ? v.idCobrador.Value : 0,
                                  FechaCliente = c.Fecha.HasValue ? c.Fecha.Value : DateTime.MinValue,
                                  P_ValorCuota = v.P_ValorCuota.HasValue ? v.P_ValorCuota.Value : 0,
                                  P_FechaCobro = v.P_FechaCobro.HasValue ? v.P_FechaCobro.Value : DateTime.MinValue,
                                  Comprobante = v.Comprobante.HasValue ? v.Comprobante.Value : 0
                              }).ToList();

                return result;
            }
        }



        public static List<VMVenta> ListaVentas(int idVendedor, int tipoNegocio)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = db.Database.SqlQuery<VMVenta>(@"
            SELECT v.Id, v.idCliente, v.Restante, v.idVendedor, v.IdTipoNegocio,
                   ec.Nombre AS EstadoCliente, u.Nombre AS Vendedor
            FROM Ventas v
            LEFT JOIN Clientes c ON c.Id = v.idCliente
            LEFT JOIN Usuarios u ON u.Id = v.idVendedor
            LEFT JOIN EstadosClientes ec ON ec.Id = c.IdEstado
            WHERE v.IdtipoNegocio = @tipoNegocio or @tipoNegocio = -1
            AND v.IdVendedor = @idVendedor or @idVendedor = -1
        ",
                new SqlParameter("idVendedor", idVendedor),
                new SqlParameter("tipoNegocio", tipoNegocio))
                .ToList();

                return result;
            }
        }






        public static List<VMVenta> ListaVentas(int idVendedor, DateTime FechaDesde, DateTime FechaHasta, int Finalizadas, int TipoNegocio)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var query = from v in db.Ventas
                            join c in db.Clientes on v.idCliente equals c.Id
                            join u in db.Usuarios on v.idVendedor equals u.Id
                            join t in db.TipoNegocio on v.IdTipoNegocio equals t.Id
                            where (v.idVendedor == idVendedor || idVendedor == -1)
                               && ((v.Fecha >= FechaDesde && v.Fecha <= FechaHasta) || (v.Estado == "APROBAR"))
                               && ((Finalizadas == 1 && v.Restante == 0) || (Finalizadas == 0 && v.Restante > 0 || Finalizadas == 2 && v.Restante >= 0))
                               && ((idVendedor == -1 && v.Estado == string.Empty || v.Estado == null) || idVendedor > 0)
                               && ((TipoNegocio == -1 || v.IdTipoNegocio == TipoNegocio))
                            select new VMVenta
                            {
                                Id = v.Id,
                                idCliente = v.idCliente,
                                Fecha = v.Fecha,
                                Entrega = v.Entrega,
                                Restante = v.Restante,
                                FechaCobro = v.FechaCobro,
                                FechaLimite = v.FechaLimite,
                                idVendedor = v.idVendedor,
                                Observacion = v.Observacion,
                                Cliente = c.Nombre + " " + c.Apellido,
                                Direccion = c.Direccion,
                                Vendedor = u.Nombre,
                                DniCliente = c.Dni,
                                ValorCuota = v.ValorCuota.HasValue ? v.ValorCuota.Value : 0,
                                Interes = v.Interes.HasValue ? v.Interes.Value : 0,
                                idCobrador = v.idCobrador.HasValue ? v.idCobrador.Value : 0,
                                FechaCliente = c.Fecha.HasValue ? c.Fecha.Value : DateTime.MinValue,
                                P_ValorCuota = v.P_ValorCuota.HasValue ? v.P_ValorCuota.Value : 0,
                                P_FechaCobro = v.P_FechaCobro.HasValue ? v.P_FechaCobro.Value : DateTime.MinValue,
                                Comprobante = v.Comprobante.HasValue ? v.Comprobante.Value : 0,
                                Estado = v.Estado != null ? v.Estado : "",
                                Longitud = c.Longitud,
                                Latitud = c.Latitud,
                                Turno = v.Turno,
                                FranjaHoraria = v.FranjaHoraria,
                                IdTipoNegocio = (int)v.IdTipoNegocio,
                                TipoNegocio = t.Nombre

                            };

                return query.OrderByDescending(x => x.Estado).ToList();

            }
        }

        public static List<VMVenta> ListaVentasPendientes()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var query = from v in db.Ventas
                            join c in db.Clientes on v.idCliente equals c.Id
                            join u in db.Usuarios on v.idVendedor equals u.Id
                            join t in db.TipoNegocio on v.IdTipoNegocio equals t.Id
                            where (!string.IsNullOrEmpty(v.Estado))
                            select new VMVenta
                            {
                                Id = v.Id,
                                idCliente = v.idCliente,
                                Fecha = v.Fecha,
                                Entrega = v.Entrega,
                                Restante = v.Restante,
                                FechaCobro = v.FechaCobro,
                                FechaLimite = v.FechaLimite,
                                idVendedor = v.idVendedor,
                                Observacion = v.Observacion,
                                Cliente = c.Nombre + " " + c.Apellido,
                                Direccion = c.Direccion,
                                Vendedor = u.Nombre,
                                DniCliente = c.Dni,
                                ValorCuota = v.ValorCuota.HasValue ? v.ValorCuota.Value : 0,
                                Interes = v.Interes.HasValue ? v.Interes.Value : 0,
                                idCobrador = v.idCobrador.HasValue ? v.idCobrador.Value : 0,
                                FechaCliente = c.Fecha.HasValue ? c.Fecha.Value : DateTime.MinValue,
                                P_ValorCuota = v.P_ValorCuota.HasValue ? v.P_ValorCuota.Value : 0,
                                P_FechaCobro = v.P_FechaCobro.HasValue ? v.P_FechaCobro.Value : DateTime.MinValue,
                                Comprobante = v.Comprobante.HasValue ? v.Comprobante.Value : 0,
                                Estado = v.Estado,
                                Longitud = c.Longitud,
                                Latitud = c.Latitud,
                                Turno = v.Turno,
                                FranjaHoraria = v.FranjaHoraria,
                                IdTipoNegocio = (int)v.IdTipoNegocio,
                                TipoNegocio = t.Nombre
                            };

                return query.ToList();
            }
        }


        public static List<VMVenta> ListaVentasTodas()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from v in db.Ventas
                              join c in db.Clientes on v.idCliente equals c.Id
                              join u in db.Usuarios on v.idVendedor equals u.Id
                              join t in db.TipoNegocio on v.IdTipoNegocio equals t.Id
                              select new VMVenta
                              {
                                  Id = v.Id,
                                  idCliente = v.idCliente,
                                  Fecha = v.Fecha,
                                  Entrega = v.Entrega,
                                  Restante = v.Restante,
                                  FechaCobro = v.FechaCobro,
                                  FechaLimite = v.FechaLimite,
                                  idVendedor = v.idVendedor,
                                  Observacion = v.Observacion,
                                  Cliente = c.Nombre + " " + c.Apellido,
                                  Direccion = c.Direccion,
                                  Vendedor = u.Nombre,
                                  DniCliente = c.Dni,
                                  ValorCuota = v.ValorCuota.HasValue ? v.ValorCuota.Value : 0,
                                  Interes = v.Interes.HasValue ? v.Interes.Value : 0,
                                  idCobrador = v.idCobrador.HasValue ? v.idCobrador.Value : 0,
                                  FechaCliente = c.Fecha.HasValue ? c.Fecha.Value : DateTime.MinValue,
                                  P_ValorCuota = v.P_ValorCuota.HasValue ? v.P_ValorCuota.Value : 0,
                                  P_FechaCobro = v.P_FechaCobro.HasValue ? v.P_FechaCobro.Value : DateTime.MinValue,
                                  Comprobante = v.Comprobante.HasValue ? v.Comprobante.Value : 0,
                                  IdTipoNegocio = (int)v.IdTipoNegocio,
                                  TipoNegocio = t.Nombre
                              }).ToList();

                return result;
            }
        }




        public static (List<VMVenta> Ventas, decimal TotalRestante) RestanteVentasCliente(int idCliente)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                // Obtenemos la lista de ventas del cliente
                var ventas = (from v in db.Ventas
                              join c in db.Clientes on v.idCliente equals c.Id
                              join u in db.Usuarios on v.idVendedor equals u.Id
                              join t in db.TipoNegocio on v.IdTipoNegocio equals t.Id
                              where v.idCliente == idCliente
                              select new VMVenta
                              {
                                  Id = v.Id,
                                  idCliente = v.idCliente,
                                  Fecha = v.Fecha,
                                  Entrega = v.Entrega,
                                  Restante = v.Restante,
                              }).ToList();

                // Calculamos la suma de los valores restantes
                decimal totalRestante = ventas.Sum(v => v.Restante ?? 0); // Manejo de nulos si Restante puede ser null

                // Devolvemos la lista de ventas y la suma de los restantes
                return (ventas, totalRestante);
            }
        }


        public static List<VMVenta> ListaVentasCliente(int idCliente)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from v in db.Ventas
                              join c in db.Clientes on v.idCliente equals c.Id
                              join u in db.Usuarios on v.idVendedor equals u.Id
                              join t in db.TipoNegocio on v.IdTipoNegocio equals t.Id
                              where v.idCliente == idCliente
                              select new VMVenta
                              {
                                  Id = v.Id,
                                  idCliente = v.idCliente,
                                  Fecha = v.Fecha,
                                  Entrega = v.Entrega,
                                  Restante = v.Restante,
                                  FechaCobro = v.FechaCobro,
                                  FechaLimite = v.FechaLimite,
                                  idVendedor = v.idVendedor,
                                  Observacion = v.Observacion,
                                  Cliente = c.Nombre,
                                  Direccion = c.Direccion,
                                  DniCliente = c.Dni,
                                  Vendedor = u.Nombre,
                                  Interes = v.Interes.HasValue ? v.Interes.Value : 0,
                                  idCobrador = v.idCobrador.HasValue ? v.idCobrador.Value : 0,
                                  FechaCliente = c.Fecha.HasValue ? c.Fecha.Value : DateTime.MinValue,
                                  P_ValorCuota = v.P_ValorCuota.HasValue ? v.P_ValorCuota.Value : 0,
                                  P_FechaCobro = v.P_FechaCobro.HasValue ? v.P_FechaCobro.Value : DateTime.MinValue,
                                  Comprobante = v.Comprobante.HasValue ? v.Comprobante.Value : 0,
                                  Longitud = c.Longitud,
                                  Latitud = c.Latitud,
                                  Turno = v.Turno,
                                  FranjaHoraria = v.FranjaHoraria,
                                  IdTipoNegocio = (int)v.IdTipoNegocio,
                                  TipoNegocio = t.Nombre
                              }).ToList();

                return result;
            }
        }




        public static VMVenta BuscarVenta(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from v in db.Ventas
                              join c in db.Clientes on v.idCliente equals c.Id
                              join u in db.Usuarios on v.idVendedor equals u.Id
                              join t in db.TipoNegocio on v.IdTipoNegocio equals t.Id
                              where v.Id == id
                              select new VMVenta
                              {
                                  Id = v.Id,
                                  idCliente = v.idCliente,
                                  Fecha = v.Fecha,
                                  Entrega = v.Entrega,
                                  Restante = v.Restante,
                                  FechaCobro = v.FechaCobro,
                                  FechaLimite = v.FechaLimite,
                                  idVendedor = v.idVendedor,
                                  Observacion = v.Observacion,
                                  Cliente = c.Nombre,
                                  Direccion = c.Direccion,
                                  DniCliente = c.Dni,
                                  Vendedor = u.Nombre,
                                  ValorCuota = v.ValorCuota.HasValue ? v.ValorCuota.Value : 0,
                                  Interes = v.Interes.HasValue ? v.Interes.Value : 0,
                                  idCobrador = v.idCobrador.HasValue ? v.idCobrador.Value : 0,
                                  FechaCliente = c.Fecha.HasValue ? c.Fecha.Value : DateTime.MinValue,
                                  P_ValorCuota = v.P_ValorCuota.HasValue ? v.P_ValorCuota.Value : 0,
                                  P_FechaCobro = v.P_FechaCobro.HasValue ? v.P_FechaCobro.Value : DateTime.MinValue,
                                  Comprobante = v.Comprobante.HasValue ? v.Comprobante.Value : 0,
                                  Longitud = c.Longitud,
                                  Latitud = c.Latitud,
                                  Turno = v.Turno,
                                  FranjaHoraria = v.FranjaHoraria,
                                  IdTipoNegocio = (int)v.IdTipoNegocio,
                                  TipoNegocio = t.Nombre
                              }).FirstOrDefault();

                return result;
            }
        }


        public static VMVenta Editar(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from v in db.Ventas
                              join c in db.Clientes on v.idCliente equals c.Id
                              join u in db.Usuarios on v.idVendedor equals u.Id
                              where v.Id == id
                              select new VMVenta
                              {
                                  Id = v.Id,
                                  Orden = (int)v.Orden,
                                  Importante = (int)v.Importante,
                                  idCliente = v.idCliente,
                                  ValorCuota = v.ValorCuota.HasValue ? v.ValorCuota.Value : 0,
                                  Fecha = v.Fecha,
                                  Entrega = v.Entrega,
                                  Restante = v.Restante,
                                  FechaCobro = v.FechaCobro,
                                  FechaLimite = v.FechaLimite,
                                  idVendedor = v.idVendedor,
                                  Observacion = v.Observacion,
                                  idCobrador = v.idCobrador.HasValue ? v.idCobrador.Value : 0,
                                  Interes = v.Interes.HasValue ? v.Interes.Value : 0,
                                  Cliente = c.Nombre,
                                  DniCliente = c.Dni,
                                  FechaCliente = c.Fecha.HasValue ? c.Fecha.Value : DateTime.MinValue,
                                  Direccion = c.Direccion,
                                  Vendedor = u.Nombre,
                                  Turno = v.Turno,
                                  FranjaHoraria = v.FranjaHoraria,
                              }).FirstOrDefault();

                return result;
            }
        }



        public static List<VMProductoVenta> ListaProductosVenta(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var productosventa = (from d in db.ProductosVenta
                         .SqlQuery("select pv.Id, pv.idproducto, pv.idventa, pv.Cantidad, pv.PrecioUnitario, p.Nombre as Producto, p.PrecioVenta from ProductosVenta pv inner join Productos p on pv.IdProducto = p.Id")
                                      select new VMProductoVenta
                                      {
                                          Id = d.Id,
                                          IdProducto = d.IdProducto,
                                          IdVenta = d.IdVenta,
                                          Producto = d.Productos.Nombre,
                                          Cantidad = (int)d.Cantidad,
                                          PrecioUnitario = (decimal)d.PrecioUnitario,
                                          PrecioTotal = d.PrecioUnitario == 0 ? (decimal)(d.Productos.PrecioVenta * d.Cantidad) : (decimal)(d.PrecioUnitario * d.Cantidad)
                                      }).Where(x => x.IdVenta == id).ToList();

                return productosventa;
            }
        }



        public static VMVenta BuscarUltimaVenta(int idvendedor)
        {
            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {
                    var venta = (from d in db.Ventas
                                 .SqlQuery("select v.Id, v.Orden, v.Importante, v.idCliente, v.Fecha, v.Entrega, v.Restante, v.FechaCobro, v.FechaLimite, v.idVendedor, v.Observacion, v.idCobrador, v.Interes, v.ValorCuota, v.P_FechaCobro, v.P_ValorCuota, v.Comprobante, c.Nombre as Cliente, c.Dni as DniCliente, c.Fecha as FechaCliente, c.Direccion, u.Nombre as Vendedor from Ventas v inner join Clientes c on c.Id = v.idCliente inner join Usuarios u on u.Id = v.idVendedor")
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
                                     Observacion = d.Observacion,
                                     Cliente = d.Clientes.Nombre,
                                     Direccion = d.Clientes.Direccion,
                                     DniCliente = d.Clientes.Dni,
                                     Vendedor = d.Usuarios.Nombre,
                                     Interes = (decimal)d.Interes,
                                     idCobrador = (int)d.idCobrador,
                                     FechaCliente = (DateTime)d.Clientes.Fecha,
                                     P_ValorCuota = (decimal)d.P_ValorCuota,
                                     P_FechaCobro = (DateTime)d.P_FechaCobro,
                                     Comprobante = (int)d.Comprobante
                                 }).Where(x => x.idVendedor == idvendedor).LastOrDefault();

                    return venta;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en BuscarUltimaVenta: {ex.Message}");
                return null;
            }
        }




        public static VMInformacionVenta BuscarInformacionVenta(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var informacionVenta = db.InformacionVentas
                    .Where(iv => iv.Id == id)
                    .Select(iv => new VMInformacionVenta
                    {
                        Id = iv.Id,
                        IdVenta = iv.IdVenta,
                        Fecha = iv.Fecha,
                        Entrega = (decimal)iv.Entrega,
                        Restante = (decimal)iv.Restante,
                        idVendedor = (int)iv.idVendedor,
                        Interes = (decimal)iv.Interes,
                        Descripcion = iv.Descripcion,
                        whatssap = (int)iv.whatssap,
                        ValorCuota = (decimal)iv.ValorCuota,
                        Observacion = iv.Observacion,
                        MetodoPago = iv.MetodoPago,
                        idCobrador = (int)iv.idCobrador,
                        Deuda = (decimal)iv.Deuda != null ? (decimal)iv.Deuda : 0,
                        ClienteAusente = iv.ClienteAusente != null ? (int)iv.ClienteAusente : 0,
                        TipoInteres = iv.TipoInteres
                    })
                    .FirstOrDefault();

                return informacionVenta;
            }
        }


        public static List<VMInformacionVenta> ListarInformacionVenta(int idVenta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var informacionVenta = db.InformacionVentas
                    .Where(iv => iv.IdVenta == idVenta)
                    .Select(iv => new VMInformacionVenta
                    {
                        Id = iv.Id,
                        IdVenta = iv.IdVenta,
                        Fecha = (DateTime)iv.Fecha,
                        Entrega = (decimal)iv.Entrega,
                        Restante = (decimal)iv.Restante,
                        idVendedor = (int)iv.idVendedor,
                        Interes = (decimal)iv.Interes,
                        Descripcion = iv.Descripcion,
                        whatssap = (int)iv.whatssap,
                        ValorCuota = (decimal)iv.ValorCuota,
                        Observacion = iv.Observacion,
                        MetodoPago = iv.MetodoPago,
                        idCobrador = (int)iv.idCobrador,
                        Cobrador = iv.idCobrador == 0 ? "N/A" : db.Usuarios.FirstOrDefault(u => u.Id == iv.idCobrador).Nombre ?? "N/A"
                    })
                    .ToList();

                return informacionVenta;
            }
        }

        public static List<VMInformacionVenta> ListarInformacionVentaCuenta(int idCuenta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var informacionVenta = db.InformacionVentas
                    .Where(iv => iv.IdCuentaBancaria == idCuenta && iv.Descripcion.Contains("Cobranza"))
                    .Select(iv => new VMInformacionVenta
                    {
                        Id = iv.Id,
                        IdVenta = iv.IdVenta,
                        Fecha = (DateTime)iv.Fecha,
                        Entrega = (decimal)iv.Entrega,
                        Restante = (decimal)iv.Restante,
                        idVendedor = (int)iv.idVendedor,
                        Interes = (decimal)iv.Interes,
                        Descripcion = iv.Descripcion,
                        whatssap = (int)iv.whatssap,
                        ValorCuota = (decimal)iv.ValorCuota,
                        Observacion = iv.Observacion,
                        MetodoPago = iv.MetodoPago,
                        idCobrador = (int)iv.idCobrador,
                        Cobrador = iv.idCobrador == 0 ? "N/A" : db.Usuarios.FirstOrDefault(u => u.Id == iv.idCobrador).Nombre ?? "N/A"
                    })
                    .ToList();

                return informacionVenta;
            }
        }



        public static VMInformacionVenta UltimaInformacionVenta(int idVenta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var informacionVenta = db.InformacionVentas
                    .Where(iv => iv.IdVenta == idVenta)
                    .OrderByDescending(iv => iv.Id)
                    .Select(iv => new VMInformacionVenta
                    {
                        Id = iv.Id,
                        IdVenta = iv.IdVenta,
                        Fecha = iv.Fecha,
                        Entrega = (decimal)iv.Entrega,
                        Restante = (decimal)iv.Restante,
                        Interes = (decimal)iv.Interes,
                        idVendedor = (int)iv.idVendedor,
                        whatssap = (int)iv.whatssap,
                        Descripcion = iv.Descripcion,
                        ValorCuota = (decimal)iv.ValorCuota,
                        Observacion = iv.Observacion,
                        MetodoPago = iv.MetodoPago,
                        idCobrador = (int)iv.idCobrador,
                        Cobrador = iv.idCobrador == 0 ? "N/A" : db.Usuarios.FirstOrDefault(u => u.Id == iv.idCobrador).Nombre ?? "N/A"
                    })
                    .FirstOrDefault();

                return informacionVenta;
            }
        }


        public static int Nuevo(Ventas model)
        {
            VMCliente cliente = null;
            VMUser usuario = null;

            try
            {
                cliente = ClientesModel.BuscarCliente(model.idCliente);
                usuario = UsuariosModel.BuscarUsuario(SessionHelper.GetUsuarioSesion().Id);

                using (var db = new Sistema_DavidEntities())
                {
                    using (var transaction = db.Database.BeginTransaction())
                    {
                        try
                        {
                            decimal totalRestanteCliente = db.Ventas
                                .Where(v => v.idCliente == model.idCliente)
                                .Sum(v => (decimal?)v.Restante) ?? 0;

                            decimal totalConNuevaVenta = (decimal)(totalRestanteCliente + model.Restante);

                            if (cliente.LimiteVentas > 0 && totalConNuevaVenta > cliente.LimiteVentas)
                                return 4;

                            if (cliente.IdEstado == 2 && cliente.LimiteVentas == 0)
                            {
                                var totalLimite = db.Limites.FirstOrDefault(x => x.Nombre == "ClientesRegulares_Venta").Valor;
                                if (totalRestanteCliente > totalLimite)
                                    return 4;
                            }

                            if (model == null)
                                return 2;

                            bool hayStock = VentasManager.VerificarStock(model.ProductosVenta, model.idVendedor);
                            if (!hayStock)
                                return 1;

                            string estadoVenta = cliente.IdVendedor != model.idVendedor ? "Aprobar" : "";

                            var venta = new Ventas
                            {
                                Entrega = model.Entrega,
                                Fecha = model.Fecha,
                                FechaCobro = model.FechaCobro,
                                FechaLimite = model.FechaLimite,
                                Observacion = model.Observacion,
                                idCliente = model.idCliente,
                                idVendedor = model.idVendedor,
                                Restante = model.Restante,
                                ValorCuota = model.ValorCuota,
                                Importante = 0,
                                Orden = 999,
                                Interes = 0,
                                idCobrador = 0,
                                P_FechaCobro = model.FechaCobro,
                                P_ValorCuota = model.ValorCuota,
                                Comprobante = 0,
                                Estado = "Aprobar",
                                EstadoCobro = "0",
                                Turno = model.Turno != null ? model.Turno.ToUpper() : null,
                                FranjaHoraria = model.FranjaHoraria,
                                IdTipoNegocio = usuario.IdTipoNegocio,
                                CobroPendiente = 0
                            };

                            db.Ventas.Add(venta);
                            db.SaveChanges();

                            var addProductos = AgregarProductosVenta(venta, model.ProductosVenta, model.idVendedor, db);
                            if (!addProductos) throw new Exception("Error al agregar productos");

                            var restarStock = RestarStock(model.ProductosVenta, model.idVendedor, db);
                            if (!restarStock) throw new Exception("Error al restar stock");

                            var infoVenta = new InformacionVentas
                            {
                                IdVenta = venta.Id,
                                Descripcion = $"Venta a {cliente?.Nombre} por {venta.Restante + venta.Entrega} pesos.",
                                Entrega = model.Entrega,
                                Restante = model.Restante,
                                ValorCuota = model.ValorCuota,
                                Interes = 0,
                                idCobrador = 0,
                                whatssap = 0,
                                ProximoCobro = model.FechaCobro,
                                IdTipoNegocio = usuario.IdTipoNegocio,
                                TipoNegocio = UsuariosModel.BuscarTipoNegocio((int)usuario.IdTipoNegocio).Nombre,
                                IdCuentaBancaria = null
                            };

                            if (!AgregarInformacionVenta(infoVenta))
                                throw new Exception("Error al agregar información de venta");

                            ClientesModel.DeleteClienteEnCero(venta.idCliente);

                            if (estadoVenta == "")
                                ClientesModel.CambiarVendedor(venta.idCliente, venta.idVendedor);

                            transaction.Commit();
                            return 0;
                        }
                        catch (Exception ex)
                        {
                            transaction.Rollback();
                            Console.WriteLine("Error en Nuevo(): " + ex.Message);
                            return 2;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error general en Nuevo(): " + ex.Message);
                return 3;
            }
        }







        public static bool AgregarInformacionVenta(InformacionVentas model)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    if (model == null)
                        return false; // Código para modelo nulo

                    model.Fecha = DateTime.Now;
                    model.idVendedor = SessionHelper.GetUsuarioSesion().Id; // ¿De dónde viene SessionHelper?

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

        public static bool setEstadoCobro(int id, string estado)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var model = db.Ventas.Find(id);

                    if (model == null)
                        return false; // Código para modelo nulo

                    model.EstadoCobro = estado;

                    db.Entry(model).State = System.Data.Entity.EntityState.Modified;
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





        public static bool EliminarInformacionVenta(int id)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var model = db.InformacionVentas.Find(id);

                    if (model == null)
                        return false; // No se encontró la información de venta

                    var venta = db.Ventas.Find(model.IdVenta);
                    if (venta != null)
                    {
                        venta.Interes -= model.Interes;
                        venta.Restante += model.Entrega - model.Interes;
                        db.Entry(venta).State = System.Data.Entity.EntityState.Modified;
                    }

                    db.InformacionVentas.Remove(model);
                    db.SaveChanges();

                    return true; // Éxito
                }
            }
            catch (Exception e)
            {
                // Manejar la excepción
                return false; // Error al eliminar
            }
        }

        public static bool EliminarTodaInformacionVenta(int idVenta)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var filasAEliminar = db.InformacionVentas.Where(iv => iv.IdVenta == idVenta).ToList();
                    if (filasAEliminar.Any())
                    {
                        db.InformacionVentas.RemoveRange(filasAEliminar);
                        db.SaveChanges();
                    }

                    return true; // Éxito (incluso si no se encontraron filas)
                }
            }
            catch (Exception e)
            {
                // Manejar la excepción
                return false; // Error al eliminar
            }
        }

        public static bool AgregarProductosVenta(Ventas venta, ICollection<ProductosVenta> productos, int idVendedor, Sistema_DavidEntities db)
        {
            try
            {
                if (productos == null || productos.Count == 0)
                    throw new ArgumentException("La lista de productos está vacía.");

                if (venta == null || venta.Id <= 0)
                    throw new ArgumentException("La venta es inválida.");

                // Filtrar productos únicos por IdProducto
                var productosUnicos = productos
                    .GroupBy(p => p.IdProducto)
                    .Select(g => g.First())
                    .ToList();

                foreach (var producto in productosUnicos)
                {
                    var productoModel = ProductosModel.BuscarProducto(producto.IdProducto);
                    if (productoModel == null)
                        throw new Exception("No se encontró el producto con ID " + producto.IdProducto);

                    var nuevoProducto = new ProductosVenta
                    {
                        IdVenta = venta.Id,
                        IdProducto = producto.IdProducto,
                        Cantidad = producto.Cantidad,
                        PrecioUnitario = producto.PrecioUnitario > 0
                            ? producto.PrecioUnitario
                            : (productoModel.PrecioVenta > 0 && producto.Cantidad > 0
                                ? Math.Round((decimal)(productoModel.PrecioVenta / producto.Cantidad), 2)
                                : 0)
                    };

                    db.ProductosVenta.Add(nuevoProducto);
                }

                db.SaveChanges();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error en AgregarProductosVenta: " + ex.Message);
                return false;
            }
        }


        public static bool RestarStock(ICollection<ProductosVenta> model, int idVendedor, Sistema_DavidEntities db)
        {
            try
            {
                if (model == null || !model.Any())
                    throw new ArgumentNullException(nameof(model), "El modelo de productos es nulo o vacío.");

                foreach (ProductosVenta producto in model)
                {
                    // Buscar stock del usuario
                    VMStockUsuario stockUsuario = StockModel.BuscarStockUser(idVendedor, producto.IdProducto);
                    if (stockUsuario == null)
                        throw new InvalidOperationException("No se encontró el stock para el producto.");

                    // Obtener la entidad rastreada desde la base de datos
                    StockUsuarios stock = db.StockUsuarios.FirstOrDefault(s => s.Id == stockUsuario.Id);
                    if (stock == null)
                        throw new InvalidOperationException("No se encontró el stock en la base de datos.");

                    // Restar o eliminar según corresponda
                    if (stock.Cantidad == producto.Cantidad)
                    {
                        db.StockUsuarios.Remove(stock);
                    }
                    else if (stock.Cantidad > producto.Cantidad)
                    {
                        stock.Cantidad -= producto.Cantidad;
                        db.Entry(stock).State = EntityState.Modified;
                    }
                    else
                    {
                        throw new InvalidOperationException("La cantidad del stock es menor que la cantidad del producto a restar.");
                    }
                }

                db.SaveChanges();
                return true;
            }
            catch (Exception e)
            {
                Console.WriteLine($"Error en RestarStock(): {e.Message}");
                return false;
            }
        }




        public static bool Eliminar(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var model = db.Ventas.Find(id);

                    if (model != null)
                    {
                        db.Ventas.Remove(model);
                        db.SaveChanges();

                        return true;
                    }
                }

                return false;
            }
            catch (Exception e)
            {
                return false;
            }
        }


        public static bool EstadoHome(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var model = db.Ventas.Find(id);

                    if (model != null)
                    {
                        model.EstadoCobro = model.EstadoCobro == "1" ? "0" : "1";
                        db.SaveChanges();

                        return true;
                    }
                }

                return false;
            }
            catch (Exception e)
            {
                return false;
            }
        }


        public static bool EliminarProductos(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var productosventa = db.ProductosVenta.Where(x => x.IdVenta == id).ToList();
                    foreach (ProductosVenta producto in productosventa)
                    {
                        var model = db.ProductosVenta.Find(producto.Id);
                        db.ProductosVenta.Remove(model);

                    }
                    db.SaveChanges();

                    return true;
                }

                return false;
            }
            catch (Exception e)
            {
                return false;
            }
        }


        public static bool EditarWSPInformacionVenta(int id, int whatssap)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    if (id > 0)
                    {
                        var infoventa = db.InformacionVentas.Find(id);
                        infoventa.whatssap = whatssap;

                        db.Entry(infoventa).State = System.Data.Entity.EntityState.Modified;
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

        public static bool AceptarVenta(int id)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {


                    var venta = db.Ventas.Find(id);
                    venta.Estado = null;


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

        public static bool EnviarComprobante(int id)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {


                    var venta = db.Ventas.Find(id);
                    venta.Comprobante = 1;

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


        public static bool EditarInfoVenta(Ventas model)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    if (model != null)
                    {
                        var venta = db.Ventas.Find(model.Id);
                        venta.Entrega = model.Entrega;
                        venta.Fecha = model.Fecha;
                        venta.FechaCobro = model.FechaCobro;
                        venta.FechaLimite = model.FechaLimite;
                        venta.Observacion = model.Observacion;
                        venta.idCliente = model.idCliente;
                        venta.idVendedor = model.idVendedor;
                        venta.Restante = model.Restante;
                        venta.Orden = venta.Orden;
                        venta.Importante = venta.Importante;
                        venta.ValorCuota = model.ValorCuota;
                        venta.Turno = model.Turno.ToUpper();
                        venta.FranjaHoraria = model.FranjaHoraria;



                        db.Entry(venta).State = System.Data.Entity.EntityState.Modified;
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

        public static VMCliente EnviarWhatssap(int id, string mensaje)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())

                {


                    var venta = db.Ventas.Find(id);
                    VMCliente result = new VMCliente();

                    if (venta != null)
                    {
                        result = ClientesModel.BuscarCliente(venta.idCliente);
                    }

                    return result;
                }
            }
            catch (Exception e)
            {
                return null;
            }
        }

        public static VMCliente EnviarWhatssapInfoVenta(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())

                {


                    var idinfoventa = db.InformacionVentas.Find(id);
                    var venta = db.Ventas.Find(idinfoventa.IdVenta);
                    VMCliente result = new VMCliente();

                    if (venta != null)
                    {
                        result = ClientesModel.BuscarCliente(venta.idCliente);
                    }

                    return result;
                }
            }
            catch (Exception e)
            {
                return null;
            }
        }

    }
}