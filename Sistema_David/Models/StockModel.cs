using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models
{
    public class StockModel
    {

        public static List<StockUsuarios> BuscarStock(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.StockUsuarios
                         .SqlQuery("select s.Id, s.IdProducto, s.Cantidad, u.Nombre, s.IdUsuario, p.Nombre,  s.IdCategoria from StockUsuarios s inner join Usuarios u on u.Id = s.IdUsuario inner join Productos p on p.Id = s.IdProducto")
                              select new StockUsuarios
                              {
                                  Id = d.Id,
                                  IdProducto = d.IdProducto,
                                  Cantidad = d.Cantidad,
                                  IdUsuario = d.IdUsuario,
                                  Usuario = d.Usuarios.Nombre,
                                  Producto = d.Productos.Nombre,
                                  PrecioVenta = (decimal)d.Productos.PrecioVenta,
                                  Total = (decimal)d.Productos.PrecioVenta * d.Cantidad,
                              }).Where(x => x.IdUsuario == id)
                                .OrderBy(x => x.Producto)
                                .ToList();

                return result;
            }
        }

        public static List<StockUsuario> BuscarStockProducto(string producto)
        {
            if (string.IsNullOrEmpty(producto) || producto.Length < 3)
            {
                return new List<StockUsuario>(); // Retorna vacío si el producto tiene menos de 3 letras
            }

            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var query = (from s in db.StockUsuarios
                             join u in db.Usuarios on s.IdUsuario equals u.Id
                             join p in db.Productos on s.IdProducto equals p.Id
                             join t in db.TipoNegocio on u.IdTipoNegocio equals t.Id into tipoNegocioJoin // LEFT JOIN con TipoNegocios
                             from t in tipoNegocioJoin.DefaultIfEmpty() // Esto es lo que hace el LEFT JOIN
                             where p.Nombre != null && p.Nombre.ToUpper().Contains(producto.ToUpper()) // Filtro en BD
                             select new
                             {
                                 s.Id,
                                 s.IdProducto,
                                 s.Cantidad,
                                 s.IdUsuario,
                                 Usuario = u.Nombre,
                                 Producto = p.Nombre,
                                 PrecioVenta = (decimal)p.PrecioVenta,
                                 TipoNegocio = t != null ? t.Nombre : null // Si t es null, no existe tipo de negocio
                             })
                             .OrderBy(x => x.Producto)
                             .ToList(); // Se ejecuta la consulta aquí

                // Mapeo manual a StockUsuarios después de la consulta
                var result = query.Select(x => new StockUsuario
                {
                    Id = x.Id,
                    IdProducto = x.IdProducto,
                    Cantidad = x.Cantidad,
                    IdUsuario = x.IdUsuario,
                    Usuario = x.Usuario,
                    Producto = x.Producto,
                    PrecioVenta = x.PrecioVenta,
                    Total = x.PrecioVenta * x.Cantidad,
                    TipoNegocio = x.TipoNegocio // El tipo de negocio ahora ya está incluido en la consulta
                }).ToList();

                return result;
            }
        }






        public static StockUsuarios EditarInfo(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.StockUsuarios
                          .SqlQuery("select s.Id, s.IdProducto, s.Cantidad, u.Nombre, s.IdUsuario, p.Nombre, s.IdCategoria from StockUsuarios s inner join Usuarios u on u.Id = s.IdUsuario inner join Productos p on p.Id = s.IdProducto")
                              select new StockUsuarios
                              {
                                  Id = d.Id,
                                  IdProducto = d.IdProducto,
                                  Cantidad = d.Cantidad,
                                  IdUsuario = d.IdUsuario,
                                  Usuario = d.Usuarios.Nombre,
                                  Producto = d.Productos.Nombre,
                                  Total = (decimal)d.Productos.PrecioVenta * d.Cantidad
                              }).Where(x => x.Id == id).FirstOrDefault();

                return result;
            }
        }

        public static StockUsuarios BuscarStockUser(int idUser, int idProducto)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.StockUsuarios
                          .SqlQuery("select s.Id, s.IdProducto, s.Cantidad, u.Nombre, s.IdUsuario, p.Nombre, s.IdCategoria from StockUsuarios s inner join Usuarios u on u.Id = s.IdUsuario inner join Productos p on p.Id = s.IdProducto")
                              select new StockUsuarios
                              {
                                  Id = d.Id,
                                  IdProducto = d.IdProducto,
                                  Cantidad = d.Cantidad,
                                  IdUsuario = d.IdUsuario,
                                  Usuario = d.Usuarios.Nombre,
                                  Producto = d.Productos.Nombre,
                                  Total = (decimal)d.Productos.PrecioVenta * d.Cantidad
                              }).Where(x => x.IdUsuario == idUser && x.IdProducto == idProducto).FirstOrDefault();

                return result;
            }
        }

        public static bool Agregar(StocksPendientes model)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    StockUsuarios result = new StockUsuarios();

                    if (model != null)
                    {
                        result.IdProducto = (int)model.IdProducto;
                        result.IdUsuario = (int)model.IdUsuario;
                        result.Cantidad = (int)model.Cantidad;
                        db.StockUsuarios.Add(result);
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


        public static bool RestarStock(int idStock, int Cantidad, int idUsuario)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    StockUsuarios result = new StockUsuarios();

                    var stock = db.StockUsuarios.Where(x => x.Id == idStock && x.IdUsuario == idUsuario).FirstOrDefault();

                    var cantidadTotal = stock.Cantidad - Cantidad;

                    if (cantidadTotal > 0)
                    {
                        stock.Cantidad -= Cantidad;
                        db.Entry(stock).State = System.Data.Entity.EntityState.Modified;

                    }
                    else
                    {
                        db.StockUsuarios.Remove(stock);
                    }

                    db.SaveChanges();

                }

                return true;
            }
            catch (Exception e)
            {
                return false;
            }

        }
        public static bool AgregarStockEliminarVenta(StockUsuarios model)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    StockUsuarios result = new StockUsuarios();

                    if (model != null)
                    {
                        result.IdProducto = (int)model.IdProducto;
                        result.IdUsuario = (int)model.IdUsuario;
                        result.Cantidad = (int)model.Cantidad;
                        db.StockUsuarios.Add(result);
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

        public static bool Editar(StockUsuarios model)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    if (model != null)
                    {
                        var result = db.StockUsuarios.Find(model.Id);

                        result.Cantidad = model.Cantidad;

                        db.Entry(result).State = System.Data.Entity.EntityState.Modified;
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

        public static bool SumarStock(int idUsuario, int idProducto, int CantidadStock)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    var result = StockModel.BuscarStockUser(idUsuario, idProducto);


                    if (result != null)
                    {
                        result.Cantidad += CantidadStock;

                        db.Entry(result).State = System.Data.Entity.EntityState.Modified;
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

        public static bool Eliminar(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var result = db.StockUsuarios.Find(id);

                    if (result != null)
                    {
                        db.StockUsuarios.Remove(result);
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


    }
}