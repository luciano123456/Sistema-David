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


        public static List<Venta> ListaVentasUsuario(int idUsuario)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from v in db.Ventas
                              join c in db.Clientes on v.idCliente equals c.Id
                              join u in db.Usuarios on v.idVendedor equals u.Id
                              where v.idVendedor == idUsuario
                              select new Venta
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



        public static List<Venta> ListaVentas(int idVendedor, int tipoNegocio)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = db.Database.SqlQuery<Venta>(@"
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






        public static List<Venta> ListaVentas(int idVendedor, DateTime FechaDesde, DateTime FechaHasta, int Finalizadas, int TipoNegocio)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var query = from v in db.Ventas
                            join c in db.Clientes on v.idCliente equals c.Id
                            join u in db.Usuarios on v.idVendedor equals u.Id
                            join t in db.TipoNegocio on v.IdTipoNegocio equals t.Id
                            where (v.idVendedor == idVendedor || idVendedor == -1)
                               && (v.Fecha >= FechaDesde && v.Fecha <= FechaHasta)
                               && ((Finalizadas == 1 && v.Restante == 0) || (Finalizadas == 0 && v.Restante > 0 || Finalizadas == 2 && v.Restante >= 0))
                               && ((idVendedor == -1 && v.Estado == string.Empty || v.Estado == null) || idVendedor > 0)
                               && ((TipoNegocio == -1 || v.IdTipoNegocio == TipoNegocio))
                            select new Venta
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

                return query.ToList();
            }
        }

        public static List<Venta> ListaVentasPendientes()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var query = from v in db.Ventas
                            join c in db.Clientes on v.idCliente equals c.Id
                            join u in db.Usuarios on v.idVendedor equals u.Id
                            join t in db.TipoNegocio on v.IdTipoNegocio equals t.Id
                            where (!string.IsNullOrEmpty(v.Estado))
                            select new Venta
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


        public static List<Venta> ListaVentasTodas()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from v in db.Ventas
                              join c in db.Clientes on v.idCliente equals c.Id
                              join u in db.Usuarios on v.idVendedor equals u.Id
                              join t in db.TipoNegocio on v.IdTipoNegocio equals t.Id
                              select new Venta
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




        public static (List<Venta> Ventas, decimal TotalRestante) RestanteVentasCliente(int idCliente)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                // Obtenemos la lista de ventas del cliente
                var ventas = (from v in db.Ventas
                              join c in db.Clientes on v.idCliente equals c.Id
                              join u in db.Usuarios on v.idVendedor equals u.Id
                              join t in db.TipoNegocio on v.IdTipoNegocio equals t.Id
                              where v.idCliente == idCliente
                              select new Venta
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


        public static List<Venta> ListaVentasCliente(int idCliente)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from v in db.Ventas
                              join c in db.Clientes on v.idCliente equals c.Id
                              join u in db.Usuarios on v.idVendedor equals u.Id
                              join t in db.TipoNegocio on v.IdTipoNegocio equals t.Id
                              where v.idCliente == idCliente
                              select new Venta
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




        public static Venta BuscarVenta(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from v in db.Ventas
                              join c in db.Clientes on v.idCliente equals c.Id
                              join u in db.Usuarios on v.idVendedor equals u.Id
                              join t in db.TipoNegocio on v.IdTipoNegocio equals t.Id
                              where v.Id == id
                              select new Venta
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


        public static Venta Editar(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from v in db.Ventas
                              join c in db.Clientes on v.idCliente equals c.Id
                              join u in db.Usuarios on v.idVendedor equals u.Id
                              where v.Id == id
                              select new Venta
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
            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {
                    var venta = (from d in db.Ventas
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




        public static InformacionVenta BuscarInformacionVenta(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var informacionVenta = db.InformacionVentas
                    .Where(iv => iv.Id == id)
                    .Select(iv => new InformacionVenta
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
                        Deuda = (decimal)iv.Deuda,
                        ClienteAusente = iv.ClienteAusente != null ? (int)iv.ClienteAusente : 0,
                    })
                    .FirstOrDefault();

                return informacionVenta;
            }
        }


        public static List<InformacionVenta> ListarInformacionVenta(int idVenta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var informacionVenta = db.InformacionVentas
                    .Where(iv => iv.IdVenta == idVenta)
                    .Select(iv => new InformacionVenta
                    {
                        Id = iv.Id,
                        IdVenta = iv.IdVenta,
                        Fecha = (DateTime) iv.Fecha,
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



        public static InformacionVenta UltimaInformacionVenta(int idVenta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var informacionVenta = db.InformacionVentas
                    .Where(iv => iv.IdVenta == idVenta)
                    .OrderByDescending(iv => iv.Id)
                    .Select(iv => new InformacionVenta
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
            Cliente cliente = null; // Variable para almacenar el cliente
            User usuario = null; // Variable para almacenar el cliente

            try
            {
                // Obtener datos del cliente antes de iniciar la transacción principal
                cliente = ClientesModel.BuscarCliente(model.idCliente);
                usuario = UsuariosModel.BuscarUsuario(SessionHelper.GetUsuarioSesion().Id);

                using (var db = new Sistema_DavidEntities())
                {
                    using (var transaction = db.Database.BeginTransaction())
                    {
                        try
                        {
                            // Verificar si el modelo re cibido es nulo
                            if (model == null)
                                return 2; // Código para modelo nulo

                            var estadoVenta = "";

                 
                            if (cliente.IdVendedor != model.idVendedor)
                            {
                                estadoVenta = "Aprobar";
                            }

                            // Verificar si hay suficiente stock
                            bool hayStock = VentasManager.VerificarStock(model.ProductosVenta, model.idVendedor);
                            if (!hayStock)
                                return 1; // Código para falta de stock

                            // Crear y agregar nueva venta
                            Ventas venta = new Ventas
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
                                Estado = estadoVenta,
                                EstadoCobro = "0",
                                Turno = model.Turno != null ? model.Turno.ToUpper() : model.Turno,
                                FranjaHoraria = model.FranjaHoraria,
                                IdTipoNegocio = usuario.IdTipoNegocio,
                            };


                            db.Ventas.Add(venta);
                            db.SaveChanges();

                            // Agregar productos de la venta
                            var addProductosResult = AgregarProductosVenta(venta, model.ProductosVenta, model.idVendedor, db);
                            if (!addProductosResult)
                                throw new Exception("Error al agregar productos");

                            // Restar stock de los productos vendidos
                            var restarStockResult = RestarStock(model.ProductosVenta, model.idVendedor, db);

                            if (!restarStockResult)
                                throw new Exception("Error al restar stock");

                            // Crear y agregar información de la venta
                            InformacionVentas infoVenta = new InformacionVentas
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
                                TipoNegocio = UsuariosModel.BuscarTipoNegocio((int)usuario.IdTipoNegocio).Nombre
                            };
                            var addInfoVentaResult = AgregarInformacionVenta(infoVenta);
                            if (!addInfoVentaResult)
                                throw new Exception("Error al agregar información de venta");

                            ClientesModel.DeleteClienteEnCero(venta.idCliente);

                            if(estadoVenta == "")
                            {
                                ClientesModel.CambiarVendedor(venta.idCliente, venta.idVendedor);
                            }

                            

                            // Commit de la transacción principal
                            transaction.Commit();

                            return 0; // Éxito
                        }
                        catch (Exception ex)
                        {
                            // Rollback de la transacción en caso de error
                            transaction.Rollback();

                            // Manejar la excepción
                            Console.WriteLine($"Error en Nuevo(): {ex.Message}");
                            return 2; // Código para excepción
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                // Manejar la excepción de búsqueda de cliente fuera de la transacción
                Console.WriteLine($"Error al buscar cliente: {ex.Message}");
                return 3; // Código para error de búsqueda de cliente
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

        public static bool AgregarProductosVenta(Ventas venta, ICollection<ProductosVenta> model, int idVendedor, Sistema_DavidEntities db)
        {
            try
            {
                if (model == null || model.Count == 0)
                    throw new ArgumentNullException("model", "El modelo de productos es nulo o vacío.");

                if (venta == null)
                    throw new ArgumentException("La venta no puede ser nula.", nameof(venta));

                foreach (ProductosVenta producto in model)
                {
                    producto.IdVenta = venta.Id;

                    Producto productoModel = ProductosModel.BuscarProducto(producto.IdProducto);

                    if (productoModel != null)
                    {
                        producto.PrecioUnitario = productoModel.PrecioVenta / producto.Cantidad;
                        db.ProductosVenta.Add(producto);
                    }
                    else
                    {
                        // Lanzar excepción si no se encuentra el producto
                        throw new Exception($"No se encontró el producto con ID {producto.IdProducto}.");
                    }
                }

                db.SaveChanges();
                return true; // Éxito
            }
            catch (Exception e)
            {
                Console.WriteLine($"Error en AgregarProductosVenta(): {e.Message}");
                return false; // Indica que hubo un problema
            }
        }

        public static bool RestarStock(ICollection<ProductosVenta> model, int idVendedor, Sistema_DavidEntities db)
        {
            try
            {
                if (model == null || !model.Any())
                    throw new ArgumentNullException("model", "El modelo de productos es nulo o vacío.");

                foreach (ProductosVenta producto in model)
                {
                    StockUsuarios stockUsuario = StockModel.BuscarStockUser(idVendedor, producto.IdProducto);

                    if (stockUsuario != null)
                    {
                        if (stockUsuario.Cantidad == producto.Cantidad)
                        {
                            db.StockUsuarios.Attach(stockUsuario); // Adjuntar la entidad si no está rastreada
                            db.StockUsuarios.Remove(stockUsuario);
                        }
                        else if (stockUsuario.Cantidad > producto.Cantidad)
                        {
                            stockUsuario.Cantidad -= producto.Cantidad;
                            db.Entry(stockUsuario).State = EntityState.Modified;
                        }
                        else
                        {
                            throw new InvalidOperationException("La cantidad del stock es menor que la cantidad del producto a restar.");
                        }
                    }
                    else
                    {
                        throw new InvalidOperationException("No se encontró el stock para el producto.");
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
                        model.EstadoCobro = model.EstadoCobro == "1" ? "0" : "1" ;
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