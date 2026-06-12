using Sistema_David.Helpers;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Sistema_David.Models
{
    public class StockPendienteModel
    {

        public static bool Sumar(StocksPendientes model)
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



                    if (stockExistente != null && stockExistente.Tipo == "SUMAR")
                    {

                        // Si existe y es de quitar, sumarle la cantidad
                        stockExistente.Cantidad += model.Cantidad;
                    }
                    else if (stockExistente != null && (stockExistente.Tipo == "RESTAR" || stockExistente.Tipo == "ELIMINAR"))
                    {
                        return false;
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
                            Asignacion = (model.Asignacion == "TRANSFERENCIA" ? "TRANSFERENCIA" : (model.IdUsuario == idUsuarioSesion ? "USUARIO" : "ADMINISTRADOR")),
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

        public static bool Restar(StocksPendientes model)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    if (model == null)
                        return false;

                    var UsuarioSesion = SessionHelper.GetUsuarioSesion();

                    // Buscar si ya existe un stock pendiente con el mismo IdProducto y el mismo IdUsuario
                    var stockExistente = db.StocksPendientes
                        .FirstOrDefault(s => s.IdProducto == model.IdProducto && s.IdUsuario == model.IdUsuario && s.Estado == "Pendiente");

                    if (stockExistente != null && stockExistente.Tipo == "RESTAR")
                    {
                        // Si existe y es de restar, sumarle la cantidad
                        stockExistente.Cantidad += model.Cantidad;
                    }
                    else if (stockExistente != null && (stockExistente.Tipo == "SUMAR" || stockExistente.Tipo == "ELIMINAR"))
                    {
                        return false;
                    }
                    else
                    {
                        // Si no existe, crear uno nuevo
                        var nuevoStock = new StocksPendientes
                        {
                            IdProducto = model.IdProducto,
                            IdUsuario = model.IdUsuario,
                            Fecha = DateTime.Now,
                            IdUsuarioAsignado = model.IdUsuarioAsignado > 0 ? model.IdUsuarioAsignado : UsuarioSesion.Id,
                            Cantidad = model.Cantidad,
                            Estado = "Pendiente",
                            Asignacion = (UsuarioSesion.IdRol == 1 ? "ADMINISTRADOR" : "USUARIO"),
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

        public static bool Eliminar(StocksPendientes model)
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
                        return false;
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
                            Asignacion = (model.Asignacion == "TRANSFERENCIA" ? "TRANSFERENCIA" : (model.IdUsuario == idUsuarioSesion ? "USUARIO" : "ADMINISTRADOR")),
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

        public static int Agregar(StocksPendientes model)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    if (model == null)
                        return 0;

                    var stockProducto = ProductosModel.BuscarProducto((int)model.IdProducto);

                    if (stockProducto.Stock < model.Cantidad)
                    {
                        return 2;
                    }



                    int idUsuarioSesion = SessionHelper.GetUsuarioSesion().Id;

                    // Buscar si ya existe un stock pendiente con el mismo IdProducto y el mismo IdUsuario
                    var stockExistente = db.StocksPendientes
                        .FirstOrDefault(s => s.IdProducto == model.IdProducto && s.IdUsuario == model.IdUsuario && s.Estado == "Pendiente");

                   

                    if (stockExistente != null)
                    {

                        if(stockExistente.Tipo == "RESTAR" || stockExistente.Tipo == "ELIMINAR")
                        {
                            return 4;
                        }
                        var suma = stockExistente.Cantidad + model.Cantidad;


                        if (stockProducto.Stock < suma)
                        {
                            return 3;
                        }

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
                            Asignacion = (model.Asignacion == "TRANSFERENCIA" ? "TRANSFERENCIA" : (model.IdUsuario == idUsuarioSesion ? "USUARIO" : "ADMINISTRADOR")),
                            Tipo = model.Tipo
                        };

                        db.StocksPendientes.Add(nuevoStock);
                    }

                    db.SaveChanges();
                    return 1;
                }
            }
            catch (Exception)
            {
                return 0;
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

        public static Dictionary<int, int> ContarStockPendienteAceptarPorUsuarios()
        {
            using (var db = new Sistema_DavidEntities())
            {
                const string sql = @"
                    SELECT x.UsuarioId, COUNT(*) AS Cnt
                    FROM (
                        SELECT CASE
                            WHEN UPPER(ISNULL(sp.Asignacion, '')) = 'TRANSFERENCIA'
                                THEN ISNULL(sp.IdUsuarioAsignado, sp.IdUsuario)
                            WHEN UPPER(ISNULL(sp.Asignacion, '')) IN ('ADMINISTRADOR', 'USUARIO')
                                THEN sp.IdUsuario
                            ELSE NULL
                        END AS UsuarioId
                        FROM StocksPendientes sp
                        WHERE sp.Estado = 'Pendiente'
                          AND sp.Cantidad > 0
                          AND sp.IdProducto > 0
                    ) x
                    WHERE x.UsuarioId IS NOT NULL
                    GROUP BY x.UsuarioId";

                return db.Database.SqlQuery<StockPendienteUsuarioCountRow>(sql)
                    .ToDictionary(row => row.UsuarioId, row => row.Cnt);
            }
        }

        private class StockPendienteUsuarioCountRow
        {
            public int UsuarioId { get; set; }
            public int Cnt { get; set; }
        }


        public static List<VMStockPendiente> ListarStockPendiente(int idUser, string Estado, DateTime? Fecha, string Asignacion)
        {
            using (var db = new Sistema_DavidEntities())
            {
                const string sql = @"
                    SELECT sp.Id,
                           sp.IdUsuario,
                           sp.IdUsuarioAsignado,
                           sp.Fecha,
                           sp.IdProducto,
                           sp.Cantidad,
                           sp.Estado,
                           sp.Tipo,
                           ISNULL(sp.Asignacion, 'ADMINISTRADOR') AS Asignacion,
                           p.Nombre AS Producto,
                           ISNULL(ur.Nombre, '') AS Usuario,
                           ua.Nombre AS UsuarioAsignado
                    FROM StocksPendientes sp
                    INNER JOIN Productos p ON p.Id = sp.IdProducto
                    LEFT JOIN Usuarios ur ON ur.Id = sp.IdUsuario
                    INNER JOIN Usuarios ua ON ua.Id = sp.IdUsuarioAsignado
                    WHERE (
                        (
                            (@idUser = -1 OR sp.IdUsuario = @idUser)
                            AND (@estado = 'Todos' OR sp.Estado = @estado)
                            AND (@asignacion = 'Todos' OR UPPER(ISNULL(sp.Asignacion, '')) = UPPER(@asignacion))
                            AND (
                                @fecha IS NULL
                                OR (@estado = 'Pendiente' AND CAST(sp.Fecha AS DATE) <= CAST(@fecha AS DATE))
                                OR (@estado <> 'Pendiente' AND @estado <> 'Todos' AND CAST(sp.Fecha AS DATE) = CAST(@fecha AS DATE))
                            )
                        )
                        OR (
                            @idUser <> -1
                            AND sp.IdUsuarioAsignado = @idUser
                            AND UPPER(ISNULL(sp.Asignacion, '')) = 'TRANSFERENCIA'
                            AND sp.Estado = 'Pendiente'
                        )
                    )
                    ORDER BY sp.Fecha DESC";

                var estadoParam = string.IsNullOrWhiteSpace(Estado) ? "Todos" : Estado;
                var asignacionParam = string.IsNullOrWhiteSpace(Asignacion) ? "Todos" : Asignacion;
                var fechaParam = Fecha.HasValue ? (object)Fecha.Value.Date : DBNull.Value;

                return db.Database.SqlQuery<VMStockPendiente>(sql,
                    new SqlParameter("@idUser", idUser),
                    new SqlParameter("@estado", estadoParam),
                    new SqlParameter("@asignacion", asignacionParam),
                    new SqlParameter("@fecha", fechaParam)
                ).ToList();
            }
        }


        public static List<VMStockPendiente> ListarStockPendienteId(int idUser, string Estado)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.StocksPendientes
                          .SqlQuery("select sp.Id, sp.IdUsuario, sp.IdUsuarioAsignado, sp.Fecha, sp.IdProducto, sp.Tipo, sp.Cantidad, sp.Estado, p.Nombre, u.Nombre, sp.Asignacion from StocksPendientes sp inner join Productos p on p.Id = sp.IdProducto inner join Usuarios u on sp.IdUsuarioAsignado = u.Id ")
                              select new VMStockPendiente
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
                    .SqlQuery(@"select sp.Id, sp.IdUsuario, sp.IdUsuarioAsignado, sp.Fecha, sp.IdProducto, sp.Tipo, sp.Cantidad, sp.Estado, p.Nombre, u.Nombre, sp.Asignacion 
                        from StocksPendientes sp 
                        inner join Productos p on p.Id = sp.IdProducto 
                        inner join Usuarios u on sp.IdUsuarioAsignado = u.Id")
                    .Any(d => (d.IdUsuario == idUser || idUser == -1) &&
                              (d.Estado == Estado || Estado == "Todos") &&
                              (d.Asignacion == "ADMINISTRADOR" || d.Asignacion == "TRANSFERENCIA") &&
                              d.Cantidad > 0); // Verifica si la cantidad es mayor a cero

                return existeStock;
            }
        }

        public static VMStockPendiente BuscarStockPendiente(int idStock)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from sp in db.StocksPendientes
                              join p in db.Productos on sp.IdProducto equals p.Id
                              join u in db.Usuarios on sp.IdUsuarioAsignado equals u.Id into usuarios
                              from u in usuarios.DefaultIfEmpty() // To handle cases where there is no assigned user
                              where sp.Id == idStock
                              select new VMStockPendiente
                              {
                                  Id = sp.Id,
                                  IdProducto = sp.IdProducto,
                                  Cantidad = sp.Cantidad,
                                  IdUsuario = sp.IdUsuario,
                                  IdUsuarioAsignado = sp.IdUsuarioAsignado,
                                  UsuarioAsignado = u.Nombre,
                                  Usuario = sp.Usuarios != null ? sp.Usuarios.Nombre : "",
                                  Producto = p.Nombre,
                                  Estado = sp.Estado,
                                  ImagenProducto = p.Imagen,
                                  Fecha = sp.Fecha,
                                  Asignacion = sp.Asignacion ?? "ADMINISTRADOR"
                              }).FirstOrDefault();

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

                    var resultFinal = false;

                    result.Estado = "Aceptado";

                    db.Entry(result).State = System.Data.Entity.EntityState.Modified;
                    db.SaveChanges();

                    var producto = StockModel.BuscarStockUser((int)result.IdUsuario, (int)result.IdProducto);

                    if (producto != null)
                    {
                        if (result.Tipo == "ELIMINAR" || result.Tipo == "RESTAR")
                        {
                            resultFinal = StockModel.RestarStock(producto.Id, (int)result.Cantidad, (int)result.IdUsuario);
                        }
                        else
                        {
                            resultFinal = StockModel.SumarStock((int)result.IdUsuario, (int)result.IdProducto, (int)result.Cantidad);
                        }
                        return true;
                    }

                    if (!resultFinal) StockModel.Agregar(result);

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

                            if (estado.ToUpper() != "RECHAZADO")
                            {
                                var producto = StockModel.BuscarStockUser((int)stockPendiente.IdUsuario, (int)stockPendiente.IdProducto);

                                if (producto != null)
                                    if (stockPendiente.Tipo == "ELIMINAR" || stockPendiente.Tipo == "RESTAR")
                                    {
                                        StockModel.RestarStock(producto.Id, (int)stockPendiente.Cantidad, (int)stockPendiente.IdUsuario);
                                    }
                                    else
                                    {
                                        StockModel.SumarStock((int)stockPendiente.IdUsuario, (int)stockPendiente.IdProducto, (int)stockPendiente.Cantidad);
                                    }
                                else
                                {
                                    StockModel.Agregar(stockPendiente);
                                }
                            }
                        }

                        db.Entry(stockPendiente).State = System.Data.Entity.EntityState.Modified;

                        db.SaveChanges();

                    }
                }

                return true;
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

        public static bool EliminarStock(int id)
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