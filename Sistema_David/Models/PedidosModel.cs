//using DocumentFormat.OpenXml.ExtendedProperties;
//using Sistema_David.Helpers;
//using Sistema_David.Models.DB;
//using Sistema_David.Models.Manager;
//using System;
//using System.Collections.Generic;
//using System.Data.SqlClient;
//using System.Linq;

//namespace Sistema_David.Models.Modelo
//{
//    public class PedidosModel
//    {

//        public static List<Pedido> ListaPedidos(int idVendedor, DateTime FechaEntrega)
//        {
//            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
//            {

//                var result = (from d in db.Pedidos
//                                 .SqlQuery("select p.Id, p.Fecha, p.IdVendedor, u.Nombre as Vendedor, p.IdCliente, p.IdEstado, ep.Nombre as Estado, p.NombreCliente, p.Dni, p.Direccion, p.Telefono, p.Observaciones, p.Entrega, p.Total, p.Restante,p.Fecha_Entrega from Pedidos p inner join EstadosPedidos ep on p.IdEstado = ep.Id inner join usuarios u on p.IdVendedor = u.Id\r\n")
//                              select new Pedido
//                              {
//                                  Id = d.Id,
//                                  IdCliente = d.IdCliente,
//                                  Fecha = (DateTime)d.Fecha,
//                                  Fecha_Entrega = (DateTime)d.Fecha_Entrega,
//                                  Entrega = d.Entrega,
//                                  Restante = d.Restante,
//                                  Estado = d.EstadosPedidos.Nombre,
//                                  IdVendedor = d.IdVendedor,
//                                  Vendedor = d.Usuarios.Nombre,
//                                  Observaciones = d.Observaciones,
//                                  NombreCliente = d.NombreCliente,
//                                  Direccion = d.Clientes.Direccion,
//                                  Telefono = d.Telefono,
//                                  Dni = d.Dni,
//                              }).Where(x => (x.IdVendedor == idVendedor || idVendedor == -1) && (x.Fecha_Entrega >= FechaEntrega && x.Fecha <= FechaEntrega)).ToList();

//                return result;
//            }
//        }

//        public static List<ProductosPedidos> ListaProductosPedido(int id)
//        {
//            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
//            {

//                var productospedido = (from d in db.ProductosPedidos
//                         .SqlQuery("select pp.Id, pp.idproducto, pp.IdPedido, pp.Cantidad, pp.PrecioUnitario, pp.Talle, pp.Color, p.Nombre as Producto, p.PrecioVenta from ProductosPedidos pp inner join Productos p on pp.IdProducto = p.Id\r\n")
//                                      select new ProductosPedidos
//                                      {
//                                          Id = d.Id,
//                                          IdProducto = d.IdProducto,
//                                          IdPedido = d.IdPedido,
//                                          Producto = d.Productos.Nombre,
//                                          Talle = d.Talle,
//                                          Color = d.Color,
//                                          Cantidad = (int)d.Cantidad,
//                                          PrecioUnitario = (decimal)d.PrecioUnitario,
//                                          PrecioTotal = d.PrecioUnitario == 0 ? (decimal)(d.Productos.PrecioVenta * d.Cantidad) : (decimal)(d.PrecioUnitario * d.Cantidad)
//                                      }).Where(x => x.IdPedido == id).ToList();

//                return productospedido;
//            }
//        }

//        public static List<EstadosPedidos> ListaEstados()
//        {
//            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
//            {

//                var result = (from d in db.Roles
//                          .SqlQuery("select * from EstadosPedidos")
//                              select new EstadosPedidos
//                              {
//                                  Id = d.Id,
//                                  Nombre = d.Nombre
//                              }).ToList();

//                return result;
//            }
//        }

//        public static int Nuevo(Pedidos model)
//        {

//            try
//            {
//                using (var db = new Sistema_DavidEntities())
//                {

//                    Pedidos pedido = new Pedidos();

//                    if (model != null)
//                    {


//                        pedido.Fecha = DateTime.Now;
//                        pedido.IdVendedor = model.IdVendedor;
//                        pedido.IdCliente = 0;
//                        pedido.IdEstado = model.IdEstado;
//                        pedido.NombreCliente = model.NombreCliente;
//                        pedido.Dni = model.Dni;
//                        pedido.Direccion = model.Direccion;
//                        pedido.Telefono = model.Telefono;
//                        pedido.Observaciones = model.Observaciones;
//                        pedido.Entrega = model.Entrega;
//                        pedido.Total = model.Total;
//                        pedido.Restante = model.Restante;
//                        pedido.Fecha_Entrega = model.Fecha_Entrega;



//                        db.Pedidos.Add(pedido);
//                        db.SaveChanges();

//                        AgregarProductosPedido(model.ProductosPedidos, model.IdVendedor);

//                        return 0;
//                    }
//                }

//                return 2;
//            }
//            catch (Exception e)
//            {
//                return 2;
//            }
//        }

//        public static bool AgregarProductosPedido(ICollection<ProductosPedidos> model, int idVendedor)
//        {

//            try
//            {
//                using (var db = new Sistema_DavidEntities())
//                {

//                    if (model != null)
//                    {



//                        Pedido ultimoPedido = BuscarUltimoPedido(idVendedor);

//                        foreach (ProductosPedidos producto in model)
//                        {

//                            producto.IdPedido = ultimoPedido.Id;

//                            Producto productomodel = ProductosModel.BuscarProducto(producto.IdProducto);

//                            producto.PrecioUnitario = (decimal)(productomodel.PrecioVenta / producto.Cantidad);

//                            db.ProductosPedidos.Add(producto);
//                            db.SaveChanges();

//                        }
//                    }
//                    return true;
//                }

//                return false;
//            }
//            catch (Exception e)
//            {
//                return false;
//            }
//        }

//        public static bool EliminarProductos(int id)
//        {

//            try
//            {
//                using (var db = new Sistema_DavidEntities())
//                {

//                    var productospedido = (from d in db.ProductosPedidos
//                         .SqlQuery("select pp.Id, pp.idproducto, pp.IdPedido, pp.Cantidad, pp.PrecioUnitario, pp.Talle, pp.Color, p.Nombre as Producto, p.PrecioVenta from ProductosPedidos pp inner join Productos p on pp.IdProducto = p.Id\r\n")
//                                           select new ProductosPedidos
//                                           {
//                                               Id = d.Id,
//                                               IdProducto = d.IdProducto,
//                                               IdPedido = d.IdPedido,
//                                               Producto = d.Productos.Nombre,
//                                               Talle = d.Talle,
//                                               Color = d.Color,
//                                               Cantidad = (int)d.Cantidad,
//                                               PrecioUnitario = (decimal)d.PrecioUnitario,
//                                               PrecioTotal = d.PrecioUnitario == 0 ? (decimal)(d.Productos.PrecioVenta * d.Cantidad) : (decimal)(d.PrecioUnitario * d.Cantidad)
//                                           }).Where(x => x.IdPedido == id).ToList();

//                    foreach (ProductosPedidos producto in productospedido)
//                    {
//                        var model = db.ProductosPedidos.Find(producto.Id);
//                        db.ProductosPedidos.Remove(model);

//                    }
//                    db.SaveChanges();

//                    return true;
//                }

//                return false;
//            }
//            catch (Exception e)
//            {
//                return false;
//            }
//        }

//        public static bool Eliminar(int id)
//        {

//            try
//            {
//                using (var db = new Sistema_DavidEntities())
//                {

//                    var model = db.Pedidos.Find(id);

//                    if (model != null)
//                    {
//                        db.Pedidos.Remove(model);
//                        db.SaveChanges();

//                        return true;
//                    }
//                }

//                return false;
//            }
//            catch (Exception e)
//            {
//                return false;
//            }
//        }

//        public static Pedido BuscarPedido(int id)
//        {
//            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
//            {

//                var result = (from d in db.Pedidos
//                                 .SqlQuery("select p.Id, p.Fecha, p.IdVendedor, u.Nombre as Vendedor, p.IdCliente, p.IdEstado, ep.Nombre as Estado, p.NombreCliente, p.Dni, p.Direccion, p.Telefono, p.Observaciones, p.Entrega, p.Total, p.Restante,p.Fecha_Entrega from Pedidos p inner join EstadosPedidos ep on p.IdEstado = ep.Id inner join usuarios u on p.IdVendedor = u.Id\r\n")
//                              select new Pedido
//                              {
//                                  Id = d.Id,
//                                  IdCliente = d.IdCliente,
//                                  Fecha = (DateTime)d.Fecha,
//                                  Fecha_Entrega = (DateTime)d.Fecha_Entrega,
//                                  Entrega = d.Entrega,
//                                  Restante = d.Restante,
//                                  Estado = d.EstadosPedidos.Nombre,
//                                  IdVendedor = d.IdVendedor,
//                                  Vendedor = d.Usuarios.Nombre,
//                                  Observaciones = d.Observaciones,
//                                  NombreCliente = d.NombreCliente,
//                                  Direccion = d.Clientes.Direccion,
//                                  Telefono = d.Telefono,
//                                  Dni = d.Dni,
//                              }).Where(x => x.Id == id).FirstOrDefault();

//                return result;
//            }
//        }

//        public static Pedido BuscarUltimoPedido(int idvendedor)
//        {
//            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
//            {

//                var result = (from d in db.Pedidos
//                                .SqlQuery("select p.Id, p.Fecha, p.IdVendedor, u.Nombre as Vendedor, p.IdCliente, p.IdEstado, ep.Nombre as Estado, p.NombreCliente, p.Dni, p.Direccion, p.Telefono, p.Observaciones, p.Entrega, p.Total, p.Restante,p.Fecha_Entrega from Pedidos p inner join EstadosPedidos ep on p.IdEstado = ep.Id inner join usuarios u on p.IdVendedor = u.Id\r\n")
//                              select new Pedido
//                              {
//                                  Id = d.Id,
//                                  IdCliente = d.IdCliente,
//                                  Fecha = (DateTime)d.Fecha,
//                                  Fecha_Entrega = (DateTime)d.Fecha_Entrega,
//                                  Entrega = d.Entrega,
//                                  Restante = d.Restante,
//                                  Estado = d.EstadosPedidos.Nombre,
//                                  IdVendedor = d.IdVendedor,
//                                  Vendedor = d.Usuarios.Nombre,
//                                  Observaciones = d.Observaciones,
//                                  NombreCliente = d.NombreCliente,
//                                  Direccion = d.Clientes.Direccion,
//                                  Telefono = d.Telefono,
//                                  Dni = d.Dni
//                              }).Where(x => x.IdVendedor == idvendedor).LastOrDefault();

//                return result;
//            }
//        }

//    }
//}