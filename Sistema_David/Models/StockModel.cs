﻿using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Sistema_David.Models
{
    public class StockModel
    {



        public static ResultadoStock BuscarStock(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var usuario = db.Usuarios.FirstOrDefault(u => u.Id == id);
                bool vistaStock = usuario != null && usuario.VistaStock == 1;

                var stocks = (from d in db.StockUsuarios
                              .SqlQuery("SELECT s.Id, s.IdProducto, s.Cantidad, u.Nombre, s.IdUsuario, p.Nombre, s.Estado, u.VistaStock, s.IdCategoria FROM StockUsuarios s INNER JOIN Usuarios u ON u.Id = s.IdUsuario INNER JOIN Productos p ON p.Id = s.IdProducto")
                              select new VMStockUsuario
                              {
                                  Id = d.Id,
                                  IdProducto = d.IdProducto,
                                  Cantidad = d.Cantidad,
                                  IdUsuario = d.IdUsuario,
                                  Usuario = d.Usuarios.Nombre,
                                  Producto = d.Productos.Nombre,
                                  PrecioVenta = d.Productos.PrecioVenta != null ? (decimal)d.Productos.PrecioVenta : 0,
                                  Total = d.Productos.PrecioVenta != null ? (decimal)d.Productos.PrecioVenta * d.Cantidad : 0,
                                  Estado = d.Estado
                              })
                             .Where(x => x.IdUsuario == id)
                             .OrderBy(x => x.Producto)
                             .ToList();

                return new ResultadoStock
                {
                    Stocks = stocks,
                    VistaStock = vistaStock
                };
            }
        }


        public static VMStockUsuario BuscarStockId(int id)
        {
            using (var db = new Sistema_DavidEntities())
            {
                var result = (from s in db.StockUsuarios
                              join u in db.Usuarios on s.IdUsuario equals u.Id
                              join p in db.Productos on s.IdProducto equals p.Id
                              where s.Id == id
                              orderby p.Nombre
                              select new
                              {
                                  s.Id,
                                  s.IdProducto,
                                  s.Cantidad,
                                  s.IdUsuario,
                                  Usuario = u.Nombre,
                                  Producto = p.Nombre,
                                  PrecioVenta = (decimal)p.PrecioVenta,
                                  Total = (decimal)p.PrecioVenta * s.Cantidad,
                                  VistaStock = u.VistaStock
                              })
                              .AsEnumerable() // Materializa la consulta en memoria
                              .Select(x => new VMStockUsuario
                              {
                                  Id = x.Id,
                                  IdProducto = x.IdProducto,
                                  Cantidad = x.Cantidad,
                                  IdUsuario = x.IdUsuario,
                                  Usuario = x.Usuario,
                                  Producto = x.Producto,
                                  PrecioVenta = x.PrecioVenta,
                                  Total = x.Total,
                                  VistaStock = x.VistaStock
                              })
                              .FirstOrDefault();

                return result;
            }
        }

        public static List<VMStockUsuario> ObtenerUsuariosConProductoEnStock(int idProducto)
        {
            using (var db = new Sistema_DavidEntities())
            {
                var result = (from s in db.StockUsuarios
                              join u in db.Usuarios on s.IdUsuario equals u.Id
                              join p in db.Productos on s.IdProducto equals p.Id
                              where s.IdProducto == idProducto && s.Cantidad > 0
                              select new VMStockUsuario
                              {
                                  Id = s.Id,
                                  IdProducto = s.IdProducto,
                                  Cantidad = s.Cantidad,
                                  IdUsuario = u.Id,
                                  Usuario = u.Nombre,
                                  Producto = p.Nombre,
                                  PrecioVenta = (decimal)p.PrecioVenta,
                                  Total = (decimal)p.PrecioVenta * s.Cantidad,
                                  VistaStock = u.VistaStock
                              }).ToList();

                return result;
            }
        }


        public static List<VMStockUsuario> BuscarStockProducto(string producto)
        {
            if (string.IsNullOrEmpty(producto) || producto.Length < 3)
            {
                return new List<VMStockUsuario>(); // Retorna vacío si el producto tiene menos de 3 letras
            }

            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var query = (from s in db.StockUsuarios
                             join u in db.Usuarios on s.IdUsuario equals u.Id
                             join p in db.Productos on s.IdProducto equals p.Id
                             join t in db.TipoNegocio on u.IdTipoNegocio equals t.Id into tipoNegocioJoin // LEFT JOIN con TipoNegocios
                             from t in tipoNegocioJoin.DefaultIfEmpty() // Esto es lo que hace el LEFT JOIN
                             where p.Nombre != null && p.Nombre.ToUpper().Contains(producto.ToUpper()) && u.IdEstado == 1 // Filtro en BD
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
                var result = query.Select(x => new VMStockUsuario
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





        public static VMStockUsuario EditarInfo(int id)
        {
            using (var db = new Sistema_DavidEntities())
            {
                var result = (from s in db.StockUsuarios
                              join u in db.Usuarios on s.IdUsuario equals u.Id
                              join p in db.Productos on s.IdProducto equals p.Id
                              where s.Id == id
                              select new
                              {
                                  s.Id,
                                  s.IdProducto,
                                  s.Cantidad,
                                  s.IdUsuario,
                                  Usuario = u.Nombre,
                                  Producto = p.Nombre,
                                  Total = (decimal)p.PrecioVenta * s.Cantidad
                              })
                              .AsEnumerable() // Trae los datos a memoria antes de convertir a StockUsuarios
                              .Select(x => new VMStockUsuario
                              {
                                  Id = x.Id,
                                  IdProducto = x.IdProducto,
                                  Cantidad = x.Cantidad,
                                  IdUsuario = x.IdUsuario,
                                  Usuario = x.Usuario,
                                  Producto = x.Producto,
                                  Total = x.Total
                              })
                              .FirstOrDefault();

                return result;
            }
        }


        public static VMStockUsuario BuscarStockUser(int idUser, int idProducto)
        {
            using (var db = new Sistema_DavidEntities())
            {
                var result = (from s in db.StockUsuarios
                              join u in db.Usuarios on s.IdUsuario equals u.Id
                              join p in db.Productos on s.IdProducto equals p.Id
                              where s.IdUsuario == idUser && s.IdProducto == idProducto
                              select new
                              {
                                  s.Id,
                                  s.IdProducto,
                                  s.Cantidad,
                                  s.IdUsuario,
                                  Usuario = u.Nombre,
                                  Producto = p.Nombre,
                                  Total = (decimal)p.PrecioVenta * s.Cantidad
                              })
                              .AsEnumerable() // Materializa la consulta en memoria
                              .Select(x => new VMStockUsuario
                              {
                                  Id = x.Id,
                                  IdProducto = x.IdProducto,
                                  Cantidad = x.Cantidad,
                                  IdUsuario = x.IdUsuario,
                                  Usuario = x.Usuario,
                                  Producto = x.Producto,
                                  Total = x.Total
                              })
                              .FirstOrDefault();

                return result;
            }
        }

        public static bool Agregar(StocksPendientes model)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                using (var transaction = db.Database.BeginTransaction()) // Inicia transacción
                {
                    if (model != null)
                    {
                        var result = new StockUsuarios
                        {
                            IdProducto = (int)model.IdProducto,
                            IdUsuario = (int)model.IdUsuario,
                            Cantidad = (int)model.Cantidad
                        };

                        var stockGeneral = db.Productos
                            .Where(x => x.Id == model.IdProducto)
                            .FirstOrDefault();

                        if (stockGeneral == null)
                            return false;

                        stockGeneral.Stock -= model.Cantidad;
                        db.Entry(stockGeneral).State = System.Data.Entity.EntityState.Modified;

                        db.StockUsuarios.Add(result);
                        db.SaveChanges();

                        transaction.Commit(); // Confirma los cambios
                        return true;
                    }

                    return false;
                }
            }
            catch (Exception e)
            {
                // Podés loguear el error acá si querés
                return false;
            }
        }


        public static bool RestarStock(int idStock, int Cantidad, int idUsuario)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                using (var transaction = db.Database.BeginTransaction()) // Inicia la transacción
                {
                    var stock = db.StockUsuarios
                        .Where(x => x.Id == idStock && x.IdUsuario == idUsuario)
                        .FirstOrDefault();

                    if (stock == null)
                        return false;

                    var cantidadTotal = stock.Cantidad - Cantidad;

                    var stockGeneral = db.Productos
                        .Where(x => x.Id == stock.IdProducto)
                        .FirstOrDefault();

                    if (stockGeneral == null)
                        return false;

                    if (cantidadTotal > 0)
                    {
                        stock.Cantidad -= Cantidad;
                        stockGeneral.Stock += Cantidad;
                       

                        db.Entry(stock).State = System.Data.Entity.EntityState.Modified;
                        db.Entry(stockGeneral).State = System.Data.Entity.EntityState.Modified;
                    }
                    else
                    {
                        stockGeneral.Stock += stock.Cantidad;
                        db.Entry(stockGeneral).State = System.Data.Entity.EntityState.Modified;
                        db.StockUsuarios.Remove(stock);
                    }

                    db.SaveChanges();
                    transaction.Commit(); // Confirma los cambios
                }

                return true;
            }
            catch (Exception e)
            {
                // Log del error si querés
                return false;
            }
        }


        public static bool AgregarStockEliminarVenta(VMStockUsuario model)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                using (var transaction = db.Database.BeginTransaction()) // Inicia transacción
                {
                    if (model != null)
                    {
                        var result = new StockUsuarios
                        {
                            IdProducto = (int)model.IdProducto,
                            IdUsuario = (int)model.IdUsuario,
                            Cantidad = (int)model.Cantidad
                        };

                        var stockGeneral = db.Productos
                            .Where(x => x.Id == model.IdProducto)
                            .FirstOrDefault();
                        if (stockGeneral != null)
                        {
                            stockGeneral.Stock += model.Cantidad;
                            db.Entry(stockGeneral).State = System.Data.Entity.EntityState.Modified;
                        }

                        db.StockUsuarios.Add(result);
                        db.SaveChanges();

                        transaction.Commit(); // Confirmar cambios
                        return true;
                    }

                    return false;
                }
            }
            catch (Exception e)
            {
                // Podés registrar el error con e.Message si querés
                return false;
            }
        }


        public static bool Editar(VMStockUsuario model)
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
                using (var transaction = db.Database.BeginTransaction()) // Inicia transacción
                {
                    var model = StockModel.BuscarStockUser(idUsuario, idProducto);

                    if (model != null)
                    {
                        StockUsuarios stock = new StockUsuarios()
                        {
                            Cantidad = model.Cantidad,
                            Estado = model.Estado,
                            Id = model.Id,
                            IdCategoria = model.IdCategoria,
                            IdProducto = model.IdProducto,
                            IdUsuario = model.IdUsuario
                        };

                        if (stock != null)
                        {
                            stock.Cantidad += CantidadStock;

                            var stockGeneral = db.Productos
                                .Where(x => x.Id == stock.IdProducto)
                                .FirstOrDefault();

                            if (stockGeneral != null)
                            {
                                stockGeneral.Stock -= CantidadStock;
                                db.Entry(stockGeneral).State = System.Data.Entity.EntityState.Modified;
                            }

                           

                           
                            db.Entry(stock).State = System.Data.Entity.EntityState.Modified;

                            db.SaveChanges();
                            transaction.Commit(); // Confirmar los cambios

                            return true;
                        }

                        transaction.Rollback();
                        return false;
                    }

                    return false;
                }
            }
            catch (Exception e)
            {
                // Se puede loguear el error si se desea: e.Message
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

                        var stockGeneral = db.Productos
                           .Where(x => x.Id == result.IdProducto)
                           .FirstOrDefault();
                        if (stockGeneral != null)
                        {
                            stockGeneral.Stock += result.Cantidad;
                            db.Entry(stockGeneral).State = System.Data.Entity.EntityState.Modified;
                        }

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