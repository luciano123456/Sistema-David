using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using SpreadsheetLight;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Newtonsoft.Json;

namespace Sistema_David.Models
{
    public class ProductosModel
    {
        private static void AplicarCamposExtendidos(Productos prod, VMProducto model)
        {
            if (prod == null || model == null) return;

            prod.Marca = model.Marca;
            prod.Modelo = model.Modelo;
            prod.Color = model.Color;
            prod.Accesorios = model.Accesorios;
            prod.Caracteristicas = model.Caracteristicas;
            prod.Descripcion = model.Descripcion;
            prod.FinConEntrega = model.FinConEntrega;
            prod.FinSinEntrega = model.FinSinEntrega;
            prod.FinSemanal = model.FinSemanal;
            prod.FinQuincenal = model.FinQuincenal;
            prod.FinMensual = model.FinMensual;
            prod.ImagenesAdicionales = SerializarImagenesExtra(model);
        }

        private static string SerializarImagenesExtra(VMProducto model)
        {
            if (model == null) return null;

            var lista = model.ImagenesExtra;
            if (lista == null || lista.Count == 0)
            {
                if (!string.IsNullOrWhiteSpace(model.ImagenesAdicionales))
                    return model.ImagenesAdicionales;
                return null;
            }

            return JsonConvert.SerializeObject(lista.Where(x => !string.IsNullOrWhiteSpace(x)).ToList());
        }

        private static List<string> DeserializarImagenesExtra(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();

            try
            {
                var list = JsonConvert.DeserializeObject<List<string>>(json);
                return list ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }

        private static VMProducto MapearProductoCompleto(Productos result)
        {
            if (result == null) return null;

            return new VMProducto
            {
                Id = result.Id,
                Codigo = result.Codigo,
                Nombre = result.Nombre,
                idCategoria = result.idCategoria,
                Stock = result.Stock,
                PrecioCompra = result.PrecioCompra,
                PrecioVenta = result.PrecioVenta,
                PorcVenta = result.PorcVenta,
                DiasVencimiento = result.DiasVencimiento,
                Activo = result.Activo ?? 0,
                Imagen = result.Imagen,
                Marca = result.Marca,
                Modelo = result.Modelo,
                Color = result.Color,
                Accesorios = result.Accesorios,
                Caracteristicas = result.Caracteristicas,
                Descripcion = result.Descripcion,
                FinConEntrega = result.FinConEntrega,
                FinSinEntrega = result.FinSinEntrega,
                FinSemanal = result.FinSemanal,
                FinQuincenal = result.FinQuincenal,
                FinMensual = result.FinMensual,
                ImagenesAdicionales = result.ImagenesAdicionales,
                ImagenesExtra = DeserializarImagenesExtra(result.ImagenesAdicionales)
            };
        }
        public static List<VMProducto> ListaProductos()
        {
            using (var db = new Sistema_DavidEntities())
            {
                return (from p in db.Productos
                        join c in db.Categorias on p.idCategoria equals c.Id
                        orderby p.Activo descending, p.Nombre
                        select new VMProducto
                        {
                            Id = p.Id,
                            Codigo = p.Codigo,
                            Nombre = p.Nombre,
                            idCategoria = p.idCategoria,
                            Categoria = c.Nombre,
                            Stock = p.Stock,
                            PrecioCompra = p.PrecioCompra,
                            PrecioVenta = p.PrecioVenta,
                            PorcVenta = p.PorcVenta,
                            Total = p.PrecioVenta * p.Stock,
                            DiasVencimiento = p.DiasVencimiento,
                            Activo = p.Activo ?? 0,
                            Marca = p.Marca,
                            TieneImagen = p.Imagen != null && p.Imagen != ""
                        }).ToList();
            }
        }

        public static decimal TotalDineroEnStock()
        {
            using (var db = new Sistema_DavidEntities())
            {
                return db.Productos.Sum(p => (p.PrecioVenta ?? 0) * (p.Stock ?? 0));
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
                        AplicarCamposExtendidos(prod, model);
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
                        AplicarCamposExtendidos(producto, model);

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
                    if (result == null) return null;
                    return MapearProductoCompleto(result);
                }

            }
            catch (Exception e)
            {
                return null;
            }
        }


        public static List<VMCliente> BuscarClientesParaWhatsapp(string nombre, string dni, int idVendedor)
        {
            using (var db = new Sistema_DavidEntities())
            {
                var query = db.Clientes.AsQueryable();

                if (idVendedor > 0)
                    query = query.Where(c => c.IdVendedor == idVendedor);

                if (!string.IsNullOrWhiteSpace(nombre))
                {
                    var n = nombre.Trim().ToUpper();
                    query = query.Where(c =>
                        (c.Nombre != null && c.Nombre.ToUpper().Contains(n)) ||
                        (c.Apellido != null && c.Apellido.ToUpper().Contains(n)));
                }

                if (!string.IsNullOrWhiteSpace(dni))
                {
                    var d = dni.Trim();
                    query = query.Where(c => c.Dni != null && c.Dni.Contains(d));
                }

                return query
                    .OrderBy(c => c.Apellido)
                    .ThenBy(c => c.Nombre)
                    .Take(25)
                    .Select(c => new VMCliente
                    {
                        Id = c.Id,
                        Nombre = c.Nombre,
                        Apellido = c.Apellido,
                        Dni = c.Dni,
                        Telefono = c.Telefono
                    })
                    .ToList();
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