using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using SpreadsheetLight;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;

namespace Sistema_David.Models
{
    public class ProductosModel
    {
        public static List<Producto> ListaProductos()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from d in db.Productos
                                 .SqlQuery("select p.Id as Id, p.Codigo as Codigo, p.Nombre as Nombre, p.Imagen as Imagen, p.Stock as Stock, p.PrecioCompra as PrecioCompra, p.PrecioVenta as PrecioVenta, p.PorcVenta as PorcVenta, p.Activo,  p.idCategoria as idCategoria, c.Nombre as Categoria from Productos p inner join Categorias c on p.idCategoria = c.Id")
                              select new Producto
                              {
                                  Id = d.Id,
                                  Codigo = d.Codigo,
                                  Nombre = d.Nombre,
                                  Imagen = d.Imagen,
                                  idCategoria = d.idCategoria,
                                  Categoria = d.Categorias.Nombre,
                                  Stock = d.Stock,
                                  PrecioCompra = d.PrecioCompra,
                                  PrecioVenta = d.PrecioVenta,
                                  Total = d.PrecioCompra * d.Stock,
                                  PorcVenta = d.PorcVenta,
                                  Activo = (int)d.Activo
                              }).ToList();

                // Ordenar los productos primero por activos y luego por inactivos
                result = result.OrderByDescending(p => p.Activo).ToList();

                return result;
            }
        }



        public static List<Producto> ListaProductosActivos()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.Productos
                                 .SqlQuery("select p.Id as Id, p.Codigo as Codigo, p.Nombre as Nombre, p.Imagen as Imagen, p.Stock as Stock, p.PrecioCompra as PrecioCompra, p.PrecioVenta as PrecioVenta, p.PorcVenta as PorcVenta, p.Activo,  p.idCategoria as idCategoria, c.Nombre as Categoria from Productos p inner join Categorias c on p.idCategoria = c.Id")

                              select new Producto
                              {
                                  Id = d.Id,
                                  Codigo = d.Codigo,
                                  Nombre = d.Nombre,
                                  Imagen = d.Imagen,
                                  idCategoria = d.idCategoria,
                                  Categoria = d.Categorias.Nombre,
                                  Stock = d.Stock,
                                  PrecioCompra = d.PrecioCompra,
                                  PrecioVenta = d.PrecioVenta,
                                  Total = d.PrecioCompra * d.Stock,
                                  PorcVenta = d.PorcVenta,
                                  Activo = (int)d.Activo
                              }).Where(x => x.Activo == 1).ToList();

                result = result.OrderBy(p => p.Nombre).ToList();

                return result;
            }
        }

        public static List<Categoria> ListaCategorias()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.Categorias
                                 .SqlQuery("select * from Categorias")

                              select new Categoria
                              {
                                  Id = d.Id,
                                  Nombre = d.Nombre
                              }).ToList();

                return result;
            }
        }

        public static bool GuardarDatos(FileInput Imagenes, string path)
        {
            try
            {

                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    Imagenes.File.SaveAs(path + Path.GetFileName(Imagenes.File.FileName));

                    SLDocument s1 = new SLDocument(path + Path.GetFileName(Imagenes.File.FileName));

                    var fila1 = s1.GetCellValueAsString(1, 1);
                    var fila2 = s1.GetCellValueAsString(1, 2);
                    var fila3 = s1.GetCellValueAsString(1, 3);
                    var fila4 = s1.GetCellValueAsString(1, 4);
                    var fila5 = s1.GetCellValueAsString(1, 5);
                    var fila6 = s1.GetCellValueAsString(1, 6);
                    var fila7 = s1.GetCellValueAsString(1, 7);

                    if (fila1 != "Codigo" || fila2 != "Nombre" || fila3 != "idCategoria" || fila4 != "Stock" || fila5 != "PrecioCompra" || fila6 != "PrecioVenta" || fila7 != "PorcVenta")
                    {
                        return false;
                    }

                    int iRow = 2;

                    while (!string.IsNullOrEmpty(s1.GetCellValueAsString(iRow, 1)))
                    {
                        var producto = new Productos
                        {
                            Codigo = s1.GetCellValueAsString(iRow, 1),
                            Nombre = s1.GetCellValueAsString(iRow, 2),
                            idCategoria = int.Parse(s1.GetCellValueAsString(iRow, 3)),
                            Stock = int.Parse(s1.GetCellValueAsString(iRow, 4)),
                            PrecioCompra = int.Parse(s1.GetCellValueAsString(iRow, 5)),
                            PrecioVenta = int.Parse(s1.GetCellValueAsString(iRow, 6)),
                            PorcVenta = int.Parse(s1.GetCellValueAsString(iRow, 7))
                        };

                        db.Productos.Add(producto);
                        db.SaveChanges();

                        iRow++;
                    }

                    return true;
                }
            }

            catch (Exception e)
            {
                return false;
            }
        }

        public static bool Nuevo(Producto model)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    Productos prod = new Productos();

                    if (model != null)
                    {
                        prod.Codigo = model.Codigo;
                        prod.Nombre = model.Nombre;
                        prod.Imagen = model.Imagen;
                        prod.idCategoria = model.idCategoria;
                        prod.Stock = model.Stock;
                        prod.PrecioCompra = model.PrecioCompra;
                        prod.PrecioVenta = model.PrecioVenta;
                        prod.PorcVenta = model.PorcVenta;
                        prod.Activo = 1;
                        db.Productos.Add(prod);
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

        public static bool Editar(Producto model)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    if (model != null)
                    {
                        var producto = db.Productos.Find(model.Id);
                        producto.Codigo = model.Codigo;
                        producto.Nombre = model.Nombre;
                        producto.Imagen = model.Imagen;
                        producto.idCategoria = model.idCategoria;
                        producto.Stock = model.Stock;
                        producto.PrecioCompra = model.PrecioCompra;
                        producto.PrecioVenta = model.PrecioVenta;
                        producto.PorcVenta = model.PorcVenta;


                        db.Entry(producto).State = System.Data.Entity.EntityState.Modified;
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

        public static bool EditarActivo(int id, int activo)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                        var producto = db.Productos.Find(id);
                        producto.Activo = activo;


                        db.Entry(producto).State = System.Data.Entity.EntityState.Modified;
                        db.SaveChanges();

                        return true;
                }
            }
            catch (Exception e)
            {
                return false;
            }

        }

        public static Producto BuscarProducto(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var result = db.Productos.Find(id);

                    var producto = new Producto();

                    producto.Id = result.Id;
                    producto.Codigo = result.Codigo;
                    producto.Nombre = result.Nombre;
                    producto.Imagen = result.Imagen;
                    producto.idCategoria = result.idCategoria;
                    producto.Stock = result.Stock;
                    producto.PrecioCompra = result.PrecioCompra;
                    producto.PrecioVenta = result.PrecioVenta;
                    producto.PorcVenta = result.PorcVenta;
                    producto.Activo = (int)result.Activo; 
                    return producto;
                }

            }
            catch (Exception e)
            {
                return null;
            }
        }


        public static bool Eliminar(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var producto = db.Productos.Find(id);

                    if (producto != null)
                    {
                        db.Productos.Remove(producto);
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