using Sistema_David.Helpers;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Data.Entity;
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
                    if (model == null)
                        return false;

                    int idUsuarioSesion = SessionHelper.GetUsuarioSesion().Id;

                    // Buscar si ya existe un stock pendiente con el mismo IdProducto y el mismo IdUsuario
                    var stockExistente = db.StocksPendientes
                        .FirstOrDefault(s => s.IdProducto == model.IdProducto && s.IdUsuario == model.IdUsuario && s.Estado == "Pendiente");

                    if (stockExistente != null)
                    {
                        // Si existe, sumarle la cantidad
                        stockExistente.Cantidad += model.Cantidad;
                    }
                    else
                    {
                        // Si no existe, crear uno nuevo
                        var nuevoStock = new StocksPendientes
                        {
                            IdProducto = model.IdProducto,
                            IdUsuario = model.IdUsuario,
                            Fecha = DateTime.Now,
                            IdUsuarioAsignado = model.IdUsuarioAsignado > 0 ? model.IdUsuarioAsignado : idUsuarioSesion,
                            Cantidad = model.Cantidad,
                            Estado = "Pendiente",
                            Asignacion = (model.Asignacion == "TRANSFERENCIA" ? "TRANSFERENCIA" : (model.IdUsuario ==  idUsuarioSesion ? "USUARIO" : "ADMINISTRADOR")),
                            Tipo = model.Tipo
                        };

                        db.StocksPendientes.Add(nuevoStock);
                    }

                    db.SaveChanges();
                    return true;
                }
            }
            catch (Exception)
            {
                return false;
            }
        }


        public static int MostrarCantidadStocksPendiente()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                // Contamos el número de registros que coinciden con las condiciones
                int cantidad = db.StocksPendientes
                    .Where(iv => iv.Estado.ToUpper() == "PENDIENTE"
                                 && iv.Asignacion.ToUpper() == "USUARIO" && 
                                 iv.IdProducto > 0
                                 )
                    .Count();

                return cantidad;
            }
        }


        public static List<StockPendientes> ListarStockPendiente(int idUser, string Estado, DateTime? Fecha, string Asignacion)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.StocksPendientes
                          .SqlQuery("select sp.Id, sp.IdUsuario, sp.IdUsuarioAsignado, sp.Fecha, sp.IdProducto, sp.Cantidad, sp.Estado, p.Nombre, u.Nombre, sp.Asignacion from StocksPendientes sp inner join Productos p on p.Id = sp.IdProducto inner join Usuarios u on sp.IdUsuarioAsignado = u.Id ")
                              select new StockPendientes
                              {
                                  Id = d.Id,
                                  IdProducto = d.IdProducto,
                                  Cantidad = d.Cantidad,
                                  IdUsuario = d.IdUsuario,
                                  IdUsuarioAsignado = d.IdUsuarioAsignado,
                                  UsuarioAsignado = d.Usuarios1.Nombre,
                                  Usuario = d.Usuarios != null ? d.Usuarios.Nombre : "",
                                  Producto = d.Productos.Nombre,
                                  Estado = d.Estado,
                                  
                                  Fecha = d.Fecha?.Date,
                                  Asignacion = d.Asignacion != null ? d.Asignacion : "ADMINISTRADOR"

                              }).Where(x => ((x.IdUsuario == idUser || idUser == -1) &&
                                  (x.Estado == Estado || Estado == "Todos") &&
                                  (x.Asignacion.ToUpper() == Asignacion.ToUpper() || Asignacion == "Todos") &&
                                  (!Fecha.HasValue || (DateTime)x.Fecha == Fecha)) || (x.IdUsuarioAsignado == idUser && x.Asignacion == "TRANSFERENCIA" && x.Estado == "Pendiente")).ToList();

                return result;
            }
        }

        public static List<StockPendientes> ListarStockPendienteId(int idUser, string Estado)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.StocksPendientes
                          .SqlQuery("select sp.Id, sp.IdUsuario, sp.IdUsuarioAsignado, sp.Fecha, sp.IdProducto, sp.Cantidad, sp.Estado, p.Nombre, u.Nombre, sp.Asignacion from StocksPendientes sp inner join Productos p on p.Id = sp.IdProducto inner join Usuarios u on sp.IdUsuarioAsignado = u.Id ")
                              select new StockPendientes
                              {
                                  Id = d.Id,
                                  IdProducto = d.IdProducto,
                                  Cantidad = d.Cantidad,
                                  IdUsuario = d.IdUsuario,
                                  IdUsuarioAsignado = d.IdUsuarioAsignado,
                                  UsuarioAsignado = d.Usuarios1.Nombre,
                                  Usuario = d.Usuarios != null ? d.Usuarios.Nombre : "",
                                  Producto = d.Productos.Nombre,
                                  Estado = d.Estado,
                                  ImagenProducto = "",
                                  Fecha = d.Fecha?.Date,
                                  Asignacion = d.Asignacion != null ? d.Asignacion : "ADMINISTRADOR"

                              }).Where(x => (x.IdUsuario == idUser || idUser == -1) && (x.Estado == Estado || Estado == "Todos") && (x.Asignacion == "ADMINISTRADOR")).ToList();

                return result;
            }
        }

        public static bool ExisteStockPendiente(int idUser, string Estado)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var existeStock = db.StocksPendientes
                    .SqlQuery(@"select sp.Id, sp.IdUsuario, sp.IdUsuarioAsignado, sp.Fecha, sp.IdProducto, sp.Cantidad, sp.Estado, p.Nombre, u.Nombre, sp.Asignacion 
                        from StocksPendientes sp 
                        inner join Productos p on p.Id = sp.IdProducto 
                        inner join Usuarios u on sp.IdUsuarioAsignado = u.Id")
                    .Any(d => (d.IdUsuario == idUser || idUser == -1) &&
                              (d.Estado == Estado || Estado == "Todos") &&
                              (d.Asignacion == "ADMINISTRADOR") &&
                              d.Cantidad > 0); // Verifica si la cantidad es mayor a cero

                return existeStock;
            }
        }

        public static StockPendientes BuscarStockPendiente(int idStock)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.StocksPendientes
                          .SqlQuery("select sp.Id, sp.IdUsuario, sp.IdUsuarioAsignado, sp.Fecha, sp.IdProducto, sp.Cantidad, sp.Estado, sp.Asignacion,  p.Imagen, p.Nombre, u.Nombre from StocksPendientes sp inner join Productos p on p.Id = sp.IdProducto inner join Usuarios u on sp.IdUsuarioAsignado = u.Id ")
                              select new StockPendientes
                              {
                                  Id = d.Id,
                                  IdProducto = d.IdProducto,
                                  Cantidad = d.Cantidad,
                                  IdUsuario = d.IdUsuario,
                                  IdUsuarioAsignado = d.IdUsuarioAsignado,
                                  UsuarioAsignado = d.Usuarios1.Nombre,
                                  Usuario = d.Usuarios != null ? d.Usuarios.Nombre : "",
                                  Producto = d.Productos.Nombre,
                                  Estado = d.Estado,
                                  ImagenProducto = d.Productos.Imagen,
                                  Fecha = d.Fecha?.Date,
                                  Asignacion = d.Asignacion != null ? d.Asignacion : "ADMINISTRADOR"

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

                        var producto = StockModel.BuscarStockUser((int)result.IdUsuario, (int)result.IdProducto);

                        if (producto != null)
                        {
                            StockModel.SumarStock((int)result.IdUsuario, (int)result.IdProducto, (int)result.Cantidad);
                            return true;
                        }

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

                            var producto = StockModel.BuscarStockUser((int)stockPendiente.IdUsuario, (int)stockPendiente.IdProducto);

                            if (producto != null)
                            {
                                StockModel.SumarStock((int)stockPendiente.IdUsuario, (int)stockPendiente.IdProducto, (int)stockPendiente.Cantidad);
                            }
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