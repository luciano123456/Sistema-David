using Sistema_David.Helpers;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Sistema_David.Models
{
    public class StockPendienteModel
    {

        public static bool Agregar(StocksPendientes model)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    StocksPendientes result = new StocksPendientes();

                    if (model != null)
                    {
                        result.IdProducto = model.IdProducto;
                        result.IdUsuario = model.IdUsuario;
                        result.Fecha = DateTime.Now;
                        result.IdUsuarioAsignado = SessionHelper.GetUsuarioSesion().Id;
                        result.Cantidad = model.Cantidad;
                        result.Estado = "Pendiente";
                        db.StocksPendientes.Add(result);
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

        public static List<StockPendientes> ListarStockPendiente(int idUser, string Estado, DateTime? Fecha)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.StocksPendientes
                          .SqlQuery("select sp.Id, sp.IdUsuario, sp.IdUsuarioAsignado, sp.Fecha, sp.IdProducto, sp.Cantidad, sp.Estado, p.Imagen, p.Nombre, u.Nombre from StocksPendientes sp inner join Productos p on p.Id = sp.IdProducto inner join Usuarios u on sp.IdUsuarioAsignado = u.Id ")
                              select new StockPendientes
                              {
                                  Id = d.Id,
                                  IdProducto = d.IdProducto,
                                  Cantidad = d.Cantidad,
                                  IdUsuario = d.IdUsuario,
                                  IdUsuarioAsignado = d.IdUsuarioAsignado,
                                  UsuarioAsignado = d.Usuarios1.Nombre,
                                  Usuario = d.Usuarios.Nombre,
                                  Producto = d.Productos.Nombre,
                                  Estado = d.Estado,
                                  ImagenProducto = d.Productos.Imagen,
                                  Fecha = d.Fecha?.Date,

                              }).Where(x => (x.IdUsuario == idUser || idUser == -1) &&
                                  (x.Estado == Estado || Estado == "Todos") &&
                                  (!Fecha.HasValue || (DateTime)x.Fecha == Fecha)).ToList();

                return result;
            }
        }

        public static List<StockPendientes> ListarStockPendienteId(int idUser, string Estado)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.StocksPendientes
                          .SqlQuery("select sp.Id, sp.IdUsuario, sp.IdUsuarioAsignado, sp.Fecha, sp.IdProducto, sp.Cantidad, sp.Estado, p.Imagen, p.Nombre, u.Nombre from StocksPendientes sp inner join Productos p on p.Id = sp.IdProducto inner join Usuarios u on sp.IdUsuarioAsignado = u.Id ")
                              select new StockPendientes
                              {
                                  Id = d.Id,
                                  IdProducto = d.IdProducto,
                                  Cantidad = d.Cantidad,
                                  IdUsuario = d.IdUsuario,
                                  IdUsuarioAsignado = d.IdUsuarioAsignado,
                                  UsuarioAsignado = d.Usuarios1.Nombre,
                                  Usuario = d.Usuarios.Nombre,
                                  Producto = d.Productos.Nombre,
                                  Estado = d.Estado,
                                  ImagenProducto = d.Productos.Imagen,
                                  Fecha = d.Fecha?.Date,

                              }).Where(x => (x.IdUsuario == idUser || idUser == -1) && (x.Estado == Estado || Estado == "Todos")).ToList();

                return result;
            }
        }

        public static StockPendientes BuscarStockPendiente(int idStock)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.StocksPendientes
                          .SqlQuery("select sp.Id, sp.IdUsuario, sp.IdUsuarioAsignado, sp.Fecha, sp.IdProducto, sp.Cantidad, sp.Estado, p.Imagen, p.Nombre, u.Nombre from StocksPendientes sp inner join Productos p on p.Id = sp.IdProducto inner join Usuarios u on sp.IdUsuarioAsignado = u.Id ")
                              select new StockPendientes
                              {
                                  Id = d.Id,
                                  IdProducto = d.IdProducto,
                                  Cantidad = d.Cantidad,
                                  IdUsuario = d.IdUsuario,
                                  IdUsuarioAsignado = d.IdUsuarioAsignado,
                                  UsuarioAsignado = d.Usuarios1.Nombre,
                                  Usuario = d.Usuarios.Nombre,
                                  Producto = d.Productos.Nombre,
                                  Estado = d.Estado,
                                  ImagenProducto = d.Productos.Imagen,
                                  Fecha = d.Fecha?.Date,

                              }).Where(x => (x.Id == idStock)).FirstOrDefault();

                return result;
            }
        }



        public static bool AceptarStock(int id)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                        var result = db.StocksPendientes.Find(id);

                        result.Estado = "Aceptado";

                        db.Entry(result).State = System.Data.Entity.EntityState.Modified;
                        db.SaveChanges();

                        StockModel.Agregar(result);

                    return true;
                }
            }
            catch (Exception e)
            {
                return false;
            }
        }

        public static bool ModificarEstadoStockList(List<int> stocks, string estado)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    foreach (int stock in stocks)
                    {

                        var stockPendiente = db.StocksPendientes.Find(stock);

                        if (stockPendiente != null)
                        {
                            stockPendiente.Estado = estado;
                            StockModel.Agregar(stockPendiente);
                        }
                        else
                        {
                            return false;
                        }

                        db.Entry(stockPendiente).State = System.Data.Entity.EntityState.Modified;
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



        public static bool ModificarStock(int id, int cantidad)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    var result = db.StocksPendientes.Find(id);

                    result.Cantidad = cantidad;

                    db.Entry(result).State = System.Data.Entity.EntityState.Modified;
                    db.SaveChanges();

                    return true;
                }
            }
            catch (Exception e)
            {
                return false;
            }
        }

        public static bool RechazarStock(int id)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    var result = db.StocksPendientes.Find(id);

                    result.Estado = "Rechazado";

                    db.Entry(result).State = System.Data.Entity.EntityState.Modified;
                    db.SaveChanges();

                    return true;
                }
            }
            catch (Exception e)
            {
                return false;
            }
        }

        public static bool EliminarStock (int id)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    var result = db.StocksPendientes.Find(id);

                    db.StocksPendientes.Remove(result);
                    db.SaveChanges();

                    return true;
                }
            }
            catch (Exception e)
            {
                return false;
            }
        }


    }
}