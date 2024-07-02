using DocumentFormat.OpenXml.ExtendedProperties;
using Sistema_David.Helpers;
using Sistema_David.Models.DB;
using Sistema_David.Models.Manager;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;

namespace Sistema_David.Models.Modelo
{
    public class VentasModel
    {


        public static List<Venta> ListaVentasUsuario(int idUsuario)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.Ventas
                                 .SqlQuery("select v.Id, v.Orden, v.Importante, v.idCliente, v.Fecha, v.Entrega, v.Restante, v.FechaCobro, v.FechaLimite, v.idVendedor, v.Observacion, v.idCobrador, v.Interes, v.ValorCuota, v.P_FechaCobro, v.P_ValorCuota, v.Comprobante, c.Nombre as Cliente, c.Dni as DniCliente,  c.Direccion, c.Fecha as FechaCliente, u.Nombre as Vendedor from Ventas v inner join Clientes c on c.Id = v.idCliente inner join Usuarios u on u.Id = v.idVendedor")
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
                                  Observacion = d.Observacion,
                                  Cliente = d.Clientes.Nombre + " " + d.Clientes.Apellido,
                                  Direccion = d.Clientes.Direccion,
                                  Vendedor = d.Usuarios.Nombre,
                                  DniCliente = d.Clientes.Dni,
                                  ValorCuota = (decimal)d.ValorCuota,
                                  Interes = (decimal)d.Interes,
                                  idCobrador = (int)d.idCobrador,
                                  FechaCliente = (DateTime)d.Clientes.Fecha,
                                  P_ValorCuota = (decimal)d.P_ValorCuota,
                                  P_FechaCobro = (DateTime)d.P_FechaCobro,
                                  Comprobante = (int)d.Comprobante
                              }).Where(x => (x.idVendedor == idUsuario) ).ToList();

                return result;
            }
        }

        public static List<Venta> ListaVentas(int idVendedor)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.Ventas
                                 .SqlQuery("select v.Id, v.Orden, v.Importante, v.idCliente, v.Fecha, v.Entrega, v.Restante, v.FechaCobro, v.FechaLimite, v.idVendedor, v.Observacion, v.idCobrador, v.Interes, v.ValorCuota, v.P_FechaCobro, v.P_ValorCuota, v.Comprobante, c.Nombre as Cliente, c.Dni as DniCliente,  c.Direccion, c.Fecha as FechaCliente, ec.Nombre as EstadoCliente,  u.Nombre as Vendedor from Ventas v  inner join Clientes c on c.Id = v.idCliente inner join Usuarios u on u.Id = v.idVendedor inner join EstadosClientes ec on ec.Id = c.IdEstado")
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
                                  Observacion = d.Observacion,
                                  Cliente = d.Clientes.Nombre + " " + d.Clientes.Apellido,
                                  Direccion = d.Clientes.Direccion,
                                  Vendedor = d.Usuarios.Nombre,
                                  DniCliente = d.Clientes.Dni,
                                  ValorCuota = (decimal)d.ValorCuota,
                                  EstadoCliente = d.Clientes.EstadosClientes.Nombre,
                                  Interes = (decimal)d.Interes,
                                  idCobrador = (int)d.idCobrador,
                                  FechaCliente = (DateTime)d.Clientes.Fecha,
                                  P_ValorCuota = (decimal)d.P_ValorCuota,
                                  P_FechaCobro = (DateTime)d.P_FechaCobro,
                                  Comprobante = (int)d.Comprobante
                              }).Where(x => (x.idVendedor == idVendedor || idVendedor == -1)).ToList();

                return result;
            }
        }

        public static List<Venta> ListaVentas(int idVendedor, DateTime FechaDesde, DateTime FechaHasta, DateTime FechaLimiteDesde, DateTime FechaLimiteHasta, int Finalizadas)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.Ventas
                                 .SqlQuery("select v.Id, v.Orden, v.Importante, v.idCliente, v.Fecha, v.Entrega, v.Restante, v.FechaCobro, v.FechaLimite, v.idVendedor, v.Observacion, v.idCobrador, v.Interes, v.ValorCuota, v.P_FechaCobro, v.P_ValorCuota, v.Comprobante, c.Nombre as Cliente, c.Dni as DniCliente,  c.Direccion, c.Fecha as FechaCliente, u.Nombre as Vendedor from Ventas v inner join Clientes c on c.Id = v.idCliente inner join Usuarios u on u.Id = v.idVendedor")
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
                                  Observacion = d.Observacion,
                                  Cliente = d.Clientes.Nombre + " " + d.Clientes.Apellido,
                                  Direccion = d.Clientes.Direccion,
                                  Vendedor = d.Usuarios.Nombre,
                                  DniCliente = d.Clientes.Dni,
                                  ValorCuota = (decimal)d.ValorCuota,
                                  Interes = (decimal)d.Interes,
                                  idCobrador = (int)d.idCobrador,
                                  FechaCliente = (DateTime)d.Clientes.Fecha,
                                  P_ValorCuota = (decimal)d.P_ValorCuota,
                                  P_FechaCobro = (DateTime)d.P_FechaCobro,
                                  Comprobante = (int)d.Comprobante

                              }).Where(x => (x.idVendedor == idVendedor || idVendedor == -1) && (x.Fecha >= FechaDesde && x.Fecha <= FechaHasta) && (x.FechaLimite >= FechaLimiteDesde && x.FechaLimite <= FechaLimiteHasta) && (Finalizadas == 1 && x.Restante == 0 || Finalizadas == 0 && x.Restante > 0)).ToList();

                return result;
            }
        }

        public static List<Venta> ListaVentasTodas()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.Ventas
                                 .SqlQuery("select v.Id, v.Orden, v.Importante, v.idCliente, v.Fecha, v.Entrega, v.Restante, v.FechaCobro, v.FechaLimite, v.idVendedor, v.Observacion, v.idCobrador, v.Interes, v.ValorCuota, v.P_FechaCobro, v.P_ValorCuota, v.Comprobante, c.Nombre as Cliente, c.Dni as DniCliente,  c.Direccion, c.Fecha as FechaCliente, u.Nombre as Vendedor from Ventas v inner join Clientes c on c.Id = v.idCliente inner join Usuarios u on u.Id = v.idVendedor")
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
                                  Observacion = d.Observacion,
                                  Cliente = d.Clientes.Nombre + " " + d.Clientes.Apellido,
                                  Direccion = d.Clientes.Direccion,
                                  Vendedor = d.Usuarios.Nombre,
                                  DniCliente = d.Clientes.Dni,
                                  ValorCuota = (decimal)d.ValorCuota,
                                  Interes = (decimal)d.Interes,
                                  idCobrador = (int)d.idCobrador,
                                  FechaCliente = (DateTime)d.Clientes.Fecha,
                                  P_ValorCuota = (decimal)d.P_ValorCuota,
                                  P_FechaCobro = (DateTime)d.P_FechaCobro,
                                  Comprobante = (int)d.Comprobante
                              }).ToList();

                return result;
            }
        }

        public static List<Venta> ListaVentasCliente(int idCliente)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.Ventas
                                 .SqlQuery("select v.Id, v.Orden, v.Importante, v.idCliente, v.Fecha, v.Entrega, v.Restante, v.FechaCobro, v.FechaLimite, v.idVendedor, v.Observacion, v.idCobrador, v.Interes, v.ValorCuota, v.P_FechaCobro, v.P_ValorCuota, v.Comprobante, c.Nombre as Cliente, c.Fecha as FechaCliente, c.Dni as DniCliente, c.Direccion, u.Nombre as Vendedor from Ventas v inner join Clientes c on c.Id = v.idCliente inner join Usuarios u on u.Id = v.idVendedor")
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

                              }).Where(x => x.idCliente == idCliente).ToList();

                return result;
            }
        }


        public static Venta BuscarVenta(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.Ventas
                                 .SqlQuery("select v.Id, v.Orden, v.Importante, v.idCliente, v.Fecha, v.Entrega, v.Restante, v.FechaCobro, v.FechaLimite, v.idVendedor, v.Observacion, v.idCobrador, v.Interes, v.ValorCuota, v.P_FechaCobro, v.P_ValorCuota, v.Comprobante, c.Nombre as Cliente, c.Dni as DniCliente, c.Fecha as FechaCliente, c.Direccion, u.Nombre as Vendedor from Ventas v inner join Clientes c on c.Id = v.idCliente inner join Usuarios u on u.Id = v.idVendedor")
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
                                  Observacion = d.Observacion,
                                  Cliente = d.Clientes.Nombre,
                                  Direccion = d.Clientes.Direccion,
                                  DniCliente = d.Clientes.Dni,
                                  Vendedor = d.Usuarios.Nombre,
                                  ValorCuota = (decimal)d.ValorCuota,
                                  Interes = (decimal)d.Interes,
                                  idCobrador = (int)d.idCobrador,
                                  FechaCliente = (DateTime)d.Clientes.Fecha,
                                  P_ValorCuota = (decimal)d.P_ValorCuota,
                                  P_FechaCobro = (DateTime)d.P_FechaCobro,
                                  Comprobante = (int)d.Comprobante


                              }).Where(x => x.Id == id).FirstOrDefault();

                return result;
            }
        }

        public static Venta Editar(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                string query = @"
            SELECT 
                v.Id,
                v.Orden,
                v.Importante,
                v.idCliente,
                v.ValorCuota,
                v.Fecha,
                v.Entrega,
                v.Restante,
                v.FechaCobro,
                v.FechaLimite,
                v.idVendedor,
                v.Observacion,
                v.idCobrador,
                v.Interes,
                v.ValorCuota,
                c.Nombre as Cliente,
                c.Dni as DniCliente,
                c.Fecha as FechaCliente,
                c.Direccion,
                u.Nombre as Vendedor
            FROM 
                Ventas v
                INNER JOIN Clientes c ON c.Id = v.idCliente
                INNER JOIN Usuarios u ON u.Id = v.idVendedor
            WHERE 
                v.Id = @id";

                var idParam = new SqlParameter("@id", id);

                var result = db.Database.SqlQuery<Venta>(query, idParam).FirstOrDefault();

                return result;
            }
        }


        public static List<ProductosVenta> ListaProductosVenta(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var productosventa = (from d in db.ProductosVenta
                         .SqlQuery("select pv.Id, pv.idproducto, pv.idventa, pv.Cantidad, pv.PrecioUnitario, p.Nombre as Producto, p.PrecioVenta from ProductosVenta pv inner join Productos p on pv.IdProducto = p.Id")
                                  select new ProductosVenta
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

        public static Venta BuscarUltimaVenta(int idvendedor)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var venta = (from d in db.Ventas
                        .SqlQuery("select v.Id, v.Orden, v.Importante, v.idCliente, v.Fecha, v.Entrega, v.Restante, v.FechaCobro, v.FechaLimite, v.idVendedor, v.Observacion, v.idCobrador, v.Interes, v.ValorCuota, v.P_FechaCobro, v.P_ValorCuota, v.Comprobante, c.Nombre as Cliente,  c.Dni as DniCliente, c.Fecha as FechaCliente, c.Direccion, u.Nombre as Vendedor from Ventas v inner join Clientes c on c.Id = v.idCliente inner join Usuarios u on u.Id = v.idVendedor")
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
                                 Observacion = d.Observacion,
                                 Cliente = d.Clientes.Nombre,
                                 Direccion = d.Clientes.Direccion,
                                 DniCliente = d.Clientes.Dni,
                                 Vendedor = d.Usuarios.Nombre,
                                 Interes = (decimal)d.Interes,
                                 idCobrador = (int)d.idCobrador,
                                 FechaCliente = (DateTime) d.Clientes.Fecha,
                                 P_ValorCuota = (decimal)d.P_ValorCuota,
                                 P_FechaCobro = (DateTime)d.P_FechaCobro,
                                 Comprobante = (int)d.Comprobante
                             }).Where(x => x.idVendedor == idvendedor).LastOrDefault();

                return venta;
            }
        }


        public static InformacionVenta BuscarInformacionVenta(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var informacionVenta = (from d in db.InformacionVentas
                        .SqlQuery("select iv.Id, iv.IdVenta, iv.Fecha, iv.Descripcion, iv.Entrega,  iv.ValorCuota, iv.Restante, iv.idVendedor, iv.whatssap, iv.observacion, iv.Interes, iv.MetodoPago, iv.idCobrador from InformacionVentas iv")
                                        select new InformacionVenta
                                        {
                                            Id = d.Id,
                                            IdVenta = d.IdVenta,
                                            Fecha = d.Fecha,
                                            Entrega = (decimal)d.Entrega,
                                            Restante = (decimal)d.Restante,
                                            Interes = (decimal)d.Interes,
                                            Descripcion = d.Descripcion,
                                            idVendedor = (int)d.idVendedor,
                                            whatssap = (int)d.whatssap,
                                            ValorCuota = (decimal)d.ValorCuota,
                                            Observacion = d.Observacion,
                                            MetodoPago = d.MetodoPago,
                                            idCobrador = (int)d.idCobrador,

                                        }).Where(x => x.Id == id).FirstOrDefault();

                return informacionVenta;
            }
        }


        public static List<InformacionVenta> ListarInformacionVenta(int idVenta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var informacionVenta = (from iv in db.InformacionVentas
                                        join u in db.Usuarios on iv.idCobrador equals u.Id into uJoin
                                        from u in uJoin.DefaultIfEmpty()
                                        where iv.IdVenta == idVenta
                                        select new InformacionVenta
                                        {
                                            Id = iv.Id,
                                            IdVenta = iv.IdVenta,
                                            Fecha = iv.Fecha,
                                            Entrega = (decimal)iv.Entrega,
                                            Restante = (decimal)iv.Restante,
                                            idVendedor = (int)iv.idVendedor,
                                            Interes = (decimal)iv.Interes,
                                            whatssap = (int)iv.whatssap,
                                            Descripcion = iv.Descripcion,
                                            ValorCuota = (decimal)iv.ValorCuota,
                                            Observacion = iv.Observacion,
                                            MetodoPago = iv.MetodoPago,
                                            idCobrador = (int)iv.idCobrador,
                                            Cobrador = iv.idCobrador == 0 ? "N/A" : (u != null ? u.Nombre : "N/A")
                                        }).ToList();

                return informacionVenta;
            }
        }


        public static InformacionVenta UltimaInformacionVenta(int idVenta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var informacionVenta = (from d in db.InformacionVentas
                        .SqlQuery("select iv.Id, iv.IdVenta, iv.Fecha, iv.Descripcion, iv.Entrega,  iv.ValorCuota, iv.idVendedor, iv.Restante, iv.whatssap, iv.observacion, iv.interes, iv.MetodoPago, iv.IdCobrador from InformacionVentas iv")
                                        select new InformacionVenta
                                        {
                                            Id = d.Id,
                                            IdVenta = d.IdVenta,
                                            Fecha = d.Fecha,
                                            Entrega = (decimal)d.Entrega,
                                            Restante = (decimal)d.Restante,
                                            Interes = (decimal)d.Interes,
                                            idVendedor = (int)d.idVendedor,
                                            whatssap = (int)d.whatssap,
                                            Descripcion = d.Descripcion,
                                            ValorCuota = (decimal)d.ValorCuota,
                                            Observacion = d.Observacion,
                                            MetodoPago = d.MetodoPago,
                                            idCobrador = (int)d.idCobrador,
                                        }).Where(x => x.IdVenta == idVenta).LastOrDefault();

                return informacionVenta;
            }
        }

        public static int Nuevo(Ventas model)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    Ventas venta = new Ventas();
                    InformacionVentas infoventa = new InformacionVentas();

                    if (model != null)
                    {

                        bool HayStock = VentasManager.VerificarStock(model.ProductosVenta, model.idVendedor);

                        if (!HayStock)
                            return 1;

                        venta.Entrega = model.Entrega;
                        venta.Fecha = model.Fecha;
                        venta.FechaCobro = model.FechaCobro;
                        venta.FechaLimite = model.FechaLimite;
                        venta.Observacion = model.Observacion;
                        venta.idCliente = model.idCliente;
                        venta.idVendedor = model.idVendedor;
                        venta.Restante = model.Restante;
                        venta.ValorCuota = model.ValorCuota;
                        venta.Importante = 0;
                        venta.Orden = 9999;
                        venta.Interes = 0;
                        venta.idCobrador = 0;
                        venta.P_FechaCobro = model.FechaCobro;
                        venta.P_ValorCuota = model.ValorCuota;
                        venta.Comprobante = 0;
                        db.Ventas.Add(venta);
                        db.SaveChanges();

                        AgregarProductosVenta(model.ProductosVenta, model.idVendedor);
                        RestarStock(model.ProductosVenta, model.idVendedor);

                        //infoventa.IdVenta = BuscarUltimaVenta(venta.idVendedor).Id;
                        infoventa.IdVenta = venta.Id;
                        infoventa.Descripcion = "Venta a " + ClientesModel.BuscarCliente(venta.idCliente).Nombre + " por " + (venta.Restante + venta.Entrega) + " pesos.";
                        infoventa.Entrega = model.Entrega;
                        infoventa.Restante = model.Restante;
                        infoventa.ValorCuota = model.ValorCuota;
                        infoventa.Interes = 0;
                        AgregarInformacionVenta(infoventa);

                        return 0;
                    }
                }

                return 2;
            }
            catch (Exception e)
            {
                return 2;
            }
        }


        public static int AgregarInformacionVenta(InformacionVentas model)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    InformacionVentas infoventa = new InformacionVentas();

                    if (model != null)
                    {

                        infoventa.IdVenta = model.IdVenta;
                        infoventa.Descripcion = model.Descripcion;
                        infoventa.Fecha = DateTime.Now;
                        infoventa.Entrega = model.Entrega;
                        infoventa.Restante = model.Restante;
                        infoventa.Observacion = model.Observacion;
                        infoventa.ValorCuota = model.ValorCuota;
                        infoventa.Interes = model.Interes;
                        infoventa.MetodoPago = model.MetodoPago;
                        infoventa.idCobrador = model.idCobrador;
                        infoventa.idVendedor = SessionHelper.GetUsuarioSesion().Id; 
                        infoventa.idCobrador = 0; 
                        infoventa.whatssap = 0; 

                        db.InformacionVentas.Add(infoventa);
                        db.SaveChanges();


                        return 1;
                    }
                }

                return 0;

            }
            catch (Exception e)
            {
                return 0;
            }
        }

        public static bool EliminarInformacionVenta(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var model = db.InformacionVentas.Find(id);


                    if (model != null)
                    {

                        var venta = db.Ventas.Find(model.IdVenta);
                        if (venta != null)
                        {
                            venta.Interes -= model.Interes;
                            venta.Restante += model.Entrega - model.Interes;
                        }

                        db.Entry(venta).State = System.Data.Entity.EntityState.Modified;
                        db.InformacionVentas.Remove(model);

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

        public static bool EliminarTodaInformacionVenta(int id)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    // Buscar todas las filas que coincidan con el ID
                    var filasAEliminar = db.InformacionVentas.Where(iv => iv.IdVenta == id).ToList();

                    // Eliminar las filas encontradas
                    db.InformacionVentas.RemoveRange(filasAEliminar);
                    db.SaveChanges();

                    return true;
                }
            }
            catch (Exception e)
            {
                // Manejar excepciones si es necesario
                return false;
            }
        }

        public static bool RestarStock(ICollection<ProductosVenta> model, int idVendedor)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    if (model != null)
                    {
                        Venta ultimaVenta = BuscarUltimaVenta(idVendedor);

                        foreach (ProductosVenta producto in model)
                        {

                            StockUsuarios modelStock = StockModel.BuscarStockUser(idVendedor, producto.IdProducto);

                            if (modelStock.Cantidad == producto.Cantidad)
                            {
                               
                                var stock = db.StockUsuarios.Find(modelStock.Id);

                                if (stock != null)
                                {
                                    db.StockUsuarios.Remove(stock);
                                    db.SaveChanges();
                                }
                            }
                            else
                            {
                                modelStock.Cantidad -= producto.Cantidad;
                                db.Entry(modelStock).State = System.Data.Entity.EntityState.Modified;
                                db.SaveChanges();
                            }

                        }

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

        public static bool AgregarProductosVenta(ICollection<ProductosVenta> model, int idVendedor)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    if (model != null)
                    {



                        Venta ultimaVenta = BuscarUltimaVenta(idVendedor);

                        foreach (ProductosVenta producto in model)
                        {

                            producto.IdVenta = ultimaVenta.Id;

                            Producto productomodel = ProductosModel.BuscarProducto(producto.IdProducto);

                            producto.PrecioUnitario = productomodel.PrecioVenta / producto.Cantidad;

                            db.ProductosVenta.Add(producto);
                            db.SaveChanges();

                        }
                    }
                    return true;
                }

                return false;
            }
            catch (Exception e)
            {
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

        

        public static bool EliminarProductos(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var productosventa = (from d in db.ProductosVenta
                         .SqlQuery("select * from ProductosVenta")
                                          select new ProductosVenta
                                          {
                                              Id = d.Id,
                                              IdProducto = d.IdProducto,
                                              IdVenta = d.IdVenta,
                                              Producto = d.Productos.Nombre,
                                              Cantidad = (int)d.Cantidad,
                                              PrecioTotal = (decimal)d.Productos.PrecioVenta * d.Cantidad
                                          }).Where(x => x.IdVenta == id).ToList();

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

        public static Cliente EnviarWhatssap(int id, string mensaje)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())

                {


                    var venta = db.Ventas.Find(id);
                    Cliente result = new Cliente();

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

        public static Cliente EnviarWhatssapInfoVenta(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())

                {


                    var idinfoventa = db.InformacionVentas.Find(id);
                    var venta = db.Ventas.Find(idinfoventa.IdVenta);
                    Cliente result = new Cliente();

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