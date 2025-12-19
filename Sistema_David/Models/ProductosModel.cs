using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using SpreadsheetLight;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Sistema_David.Models
{
    public class ProductosModel
    {
        public static List<VMProducto> ListaProductos()
        {
            using (var db = new Sistema_DavidEntities())
            {
                var result = (from p in db.Productos
                              join c in db.Categorias on p.idCategoria equals c.Id
                              orderby p.Activo descending
                              select new
                              {
                                  p.Id,
                                  p.Codigo,
                                  p.Nombre,
                                  p.idCategoria,
                                  Categoria = c.Nombre,
                                  p.Stock,
                                  p.PrecioCompra,
                                  p.PrecioVenta,
                                  Total = p.PrecioCompra * p.Stock,
                                  p.DiasVencimiento,
                                  p.Activo,
                              })
                              .AsEnumerable() // Materializa antes de mapear a Producto
                              .Select(x => new VMProducto
                              {
                                  Id = x.Id,
                                  Codigo = x.Codigo,
                                  Nombre = x.Nombre,
                                  idCategoria = x.idCategoria,
                                  Categoria = x.Categoria,
                                  Stock = x.Stock,
                                  PrecioCompra = x.PrecioCompra,
                                  PrecioVenta = x.PrecioVenta,
                                  Total = x.PrecioVenta * x.Stock,
                                  DiasVencimiento = x.DiasVencimiento,
                                  Activo = x.Activo ?? 0, // Maneja nulos si Activo es nullable
                              })
                              .ToList();

                return result;
            }
        }



        public static string ObtenerImagenProducto(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var producto = db.Productos.Find(id);

                if (producto != null && producto.Imagen != null) // Verifica si el producto y la imagen existen
                {
                    return producto.Imagen; // Retorna la imagen en bytes
                }
                else
                {
                    // Si no hay imagen, retorna null para manejar la imagen por defecto en el controlador
                    return null;
                }
            }
        }



        public static List<VMProducto> ListaProductosActivos()
        {
            using (var db = new Sistema_DavidEntities())
            {
                var result = (from p in db.Productos
                              join c in db.Categorias on p.idCategoria equals c.Id
                              where p.Activo == 1
                              orderby p.Nombre
                              select new
                              {
                                  p.Id,
                                  p.Codigo,
                                  p.Nombre,
                                  p.idCategoria,
                                  Categoria = c.Nombre,
                                  p.Stock,
                                  p.PrecioCompra,
                                  p.PrecioVenta,
                                  p.PorcVenta,
                                  Total = p.PrecioCompra * p.Stock,
                                  p.DiasVencimiento,
                                  p.Activo
                              })
                              .AsEnumerable() // Materializa antes de mapear a Producto
                              .Select(x => new VMProducto
                              {
                                  Id = x.Id,
                                  Codigo = x.Codigo,
                                  Nombre = x.Nombre,
                                  idCategoria = x.idCategoria,
                                  Categoria = x.Categoria,
                                  Stock = x.Stock,
                                  PrecioCompra = x.PrecioCompra,
                                  PrecioVenta = x.PrecioVenta,
                                  Total = x.Total,
                                  PorcVenta = x.PorcVenta,
                                  DiasVencimiento = x.DiasVencimiento,
                                  Activo = x.Activo ?? 0 // Maneja valores nulos en Activo
                              })
                              .ToList();

                return result;
            }
        }

        public static List<VMCategoria> ListaCategorias()
        {
            using (var db = new Sistema_DavidEntities())
            {
                return db.Categorias
                         .OrderBy(c => c.Nombre)
                         .Select(c => new VMCategoria
                         {
                             Id = c.Id,
                             Nombre = c.Nombre
                         })
                         .ToList();
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

        public static bool SumarStock(int id, int cantidad)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    Productos prod = db.Productos.Where(x => x.Id == id).FirstOrDefault();


                    

                    if (prod != null)
                    {
                        prod.Stock += cantidad;

                        db.Entry(prod).State = System.Data.Entity.EntityState.Modified;
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

        public static bool RestarStock(int id, int cantidad)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    Productos prod = db.Productos.Where(x => x.Id == id).FirstOrDefault();




                    if (prod != null)
                    {
                        prod.Stock -= cantidad;

                        db.Entry(prod).State = System.Data.Entity.EntityState.Modified;
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

        public static bool Nuevo(VMProducto model)
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
                        prod.DiasVencimiento = model.DiasVencimiento;
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

        public static bool Editar(VMProducto model)
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
                        producto.DiasVencimiento = model.DiasVencimiento;


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

        public static VMProducto BuscarProducto(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var result = db.Productos.Find(id);

                    var producto = new VMProducto();

                    producto.Id = result.Id;
                    producto.Codigo = result.Codigo;
                    producto.Nombre = result.Nombre;
                    producto.idCategoria = result.idCategoria;
                    producto.Stock = result.Stock;
                    producto.PrecioCompra = result.PrecioCompra;
                    producto.PrecioVenta = result.PrecioVenta;
                    producto.PorcVenta = result.PorcVenta;
                    producto.DiasVencimiento = result.DiasVencimiento;
                    producto.Activo = (int)result.Activo; 
                    producto.Imagen = result.Imagen;
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