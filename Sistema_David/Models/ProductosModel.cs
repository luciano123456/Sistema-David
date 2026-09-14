using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using SpreadsheetLight;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Data.Entity;
using System.Diagnostics;
using System.IO;
using System.Linq;
using Newtonsoft.Json;

namespace Sistema_David.Models
{
    public class ProductosModel
    {
        private static readonly object ColumnasLock = new object();
        private static HashSet<string> _columnas;

        private static readonly string[] ColumnasCatalogo =
        {
            "Id", "Codigo", "Nombre", "Imagen", "idCategoria", "Stock", "PrecioCompra", "PrecioVenta",
            "PorcVenta", "Activo", "DiasVencimiento",
            "Marca", "Modelo", "Color", "Accesorios", "Caracteristicas", "Descripcion",
            "FinConEntrega", "FinSinEntrega", "FinSemanal", "FinQuincenal", "FinMensual", "ImagenesAdicionales"
        };

        private static readonly string[] ColumnasMinimas =
        {
            "Id", "Codigo", "Nombre", "Imagen", "idCategoria", "Stock", "PrecioCompra", "PrecioVenta",
            "PorcVenta", "Activo", "DiasVencimiento"
        };

        private static void LogEx(Exception ex)
        {
            Debug.WriteLine("[ProductosModel] " + (ex != null ? ex.ToString() : ""));
        }

        public static bool TieneColumnaCatalogo(string nombre)
        {
            AsegurarColumnas();
            return _columnas != null && !string.IsNullOrEmpty(nombre) && _columnas.Contains(nombre);
        }

        private static void AsegurarColumnas()
        {
            if (_columnas != null) return;
            lock (ColumnasLock)
            {
                if (_columnas != null) return;
                var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                try
                {
                    using (var db = new Sistema_DavidEntities())
                    {
                        var names = db.Database.SqlQuery<string>(
                            "SELECT name FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Productos')").ToList();
                        foreach (var n in names)
                            set.Add(n);
                    }
                }
                catch (Exception ex)
                {
                    LogEx(ex);
                }

                if (!set.Contains("Id") || !set.Contains("Nombre"))
                {
                    foreach (var c in ColumnasMinimas)
                        set.Add(c);
                }

                _columnas = set;
            }
        }

        private static object DbVal(object v)
        {
            if (v == null) return DBNull.Value;
            if (v is string s && string.IsNullOrWhiteSpace(s)) return DBNull.Value;
            return v;
        }

        private static string SqlSelectColumnas(string alias)
        {
            AsegurarColumnas();
            var prefix = string.IsNullOrEmpty(alias) ? "" : alias + ".";
            return string.Join(", ", ColumnasCatalogo.Where(TieneColumnaCatalogo).Select(c => prefix + "[" + c + "]"));
        }

        private class ProductoFila
        {
            public int Id { get; set; }
            public string Codigo { get; set; }
            public string Nombre { get; set; }
            public string Imagen { get; set; }
            public int? idCategoria { get; set; }
            public int? Stock { get; set; }
            public decimal? PrecioCompra { get; set; }
            public decimal? PrecioVenta { get; set; }
            public int? PorcVenta { get; set; }
            public int? Activo { get; set; }
            public int? DiasVencimiento { get; set; }
            public string Marca { get; set; }
            public string Modelo { get; set; }
            public string Color { get; set; }
            public string Accesorios { get; set; }
            public string Caracteristicas { get; set; }
            public string Descripcion { get; set; }
            public string FinConEntrega { get; set; }
            public string FinSinEntrega { get; set; }
            public string FinSemanal { get; set; }
            public string FinQuincenal { get; set; }
            public string FinMensual { get; set; }
            public string ImagenesAdicionales { get; set; }
        }

        private static void AgregarCampoPersistible(List<string> cols, List<object> vals, string col, object valor)
        {
            if (!TieneColumnaCatalogo(col)) return;
            cols.Add("[" + col + "]");
            vals.Add(DbVal(valor));
        }

        private static void CargarCamposPersistibles(VMProducto model, List<string> cols, List<object> vals, bool incluirActivo)
        {
            if (model == null) return;
            AgregarCampoPersistible(cols, vals, "Codigo", model.Codigo);
            AgregarCampoPersistible(cols, vals, "Nombre", model.Nombre);
            AgregarCampoPersistible(cols, vals, "Imagen", string.IsNullOrWhiteSpace(model.Imagen) ? null : model.Imagen);
            AgregarCampoPersistible(cols, vals, "idCategoria", model.idCategoria);
            AgregarCampoPersistible(cols, vals, "Stock", model.Stock);
            AgregarCampoPersistible(cols, vals, "PrecioCompra", model.PrecioCompra);
            AgregarCampoPersistible(cols, vals, "PrecioVenta", model.PrecioVenta);
            AgregarCampoPersistible(cols, vals, "PorcVenta", model.PorcVenta);
            AgregarCampoPersistible(cols, vals, "DiasVencimiento", model.DiasVencimiento);
            if (incluirActivo)
                AgregarCampoPersistible(cols, vals, "Activo", model.Activo != 0 ? model.Activo : 1);

            AgregarCampoPersistible(cols, vals, "Marca", model.Marca);
            AgregarCampoPersistible(cols, vals, "Modelo", model.Modelo);
            AgregarCampoPersistible(cols, vals, "Color", model.Color);
            AgregarCampoPersistible(cols, vals, "Accesorios", model.Accesorios);
            AgregarCampoPersistible(cols, vals, "Caracteristicas", model.Caracteristicas);
            AgregarCampoPersistible(cols, vals, "Descripcion", model.Descripcion);
            AgregarCampoPersistible(cols, vals, "FinConEntrega", model.FinConEntrega);
            AgregarCampoPersistible(cols, vals, "FinSinEntrega", model.FinSinEntrega);
            AgregarCampoPersistible(cols, vals, "FinSemanal", model.FinSemanal);
            AgregarCampoPersistible(cols, vals, "FinQuincenal", model.FinQuincenal);
            AgregarCampoPersistible(cols, vals, "FinMensual", model.FinMensual);
            AgregarCampoPersistible(cols, vals, "ImagenesAdicionales", SerializarImagenesExtra(model));
        }

        private static string SerializarImagenesExtra(VMProducto model)
        {
            try
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
            catch (Exception ex)
            {
                LogEx(ex);
                return null;
            }
        }

        private static List<string> DeserializarImagenesExtra(string json)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(json)) return new List<string>();

                var list = JsonConvert.DeserializeObject<List<string>>(json);
                return list ?? new List<string>();
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return new List<string>();
            }
        }

        private static VMProducto MapearProductoCompleto(Productos result)
        {
            try
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
                    ImagenesExtra = DeserializarImagenesExtra(result.ImagenesAdicionales),
                    TieneImagen = !string.IsNullOrWhiteSpace(result.Imagen)
                };
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return MapearProductoMinimo(result);
            }
        }

        private static VMProducto MapearProductoMinimo(Productos result)
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
                TieneImagen = !string.IsNullOrWhiteSpace(result.Imagen)
            };
        }

        private static VMProducto MapearProductoFila(ProductoFila result)
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
                ImagenesExtra = DeserializarImagenesExtra(result.ImagenesAdicionales),
                TieneImagen = !string.IsNullOrWhiteSpace(result.Imagen)
            };
        }

        private static string NombreCategoriaODefault(string nombre)
        {
            try
            {
                return string.IsNullOrWhiteSpace(nombre) ? "Sin categoría" : nombre;
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return "Sin categoría";
            }
        }

        private static List<VMProducto> ConsultarListaProductosMinima(bool intentarCategoria)
        {
            using (var db = new Sistema_DavidEntities())
            {
                db.Configuration.LazyLoadingEnabled = false;
                db.Configuration.ProxyCreationEnabled = false;

                Dictionary<int, string> categorias = null;
                if (intentarCategoria)
                {
                    try
                    {
                        categorias = new Dictionary<int, string>();
                        foreach (var c in db.Categorias.Select(x => new { x.Id, x.Nombre }).ToList())
                        {
                            if (!categorias.ContainsKey(c.Id))
                                categorias[c.Id] = c.Nombre;
                        }
                    }
                    catch (Exception exCat)
                    {
                        LogEx(exCat);
                        categorias = null;
                    }
                }

                var productos = db.Productos
                    .AsNoTracking()
                    .OrderByDescending(p => p.Activo)
                    .ThenBy(p => p.Nombre)
                    .Select(p => new
                    {
                        p.Id,
                        p.Codigo,
                        p.Nombre,
                        p.idCategoria,
                        p.Stock,
                        p.PrecioCompra,
                        p.PrecioVenta,
                        p.PorcVenta,
                        p.DiasVencimiento,
                        p.Activo,
                        TieneImagen = p.Imagen != null && p.Imagen != ""
                    })
                    .ToList();

                return productos.Select(x =>
                {
                    string cat = null;
                    if (categorias != null && x.idCategoria.HasValue)
                        categorias.TryGetValue(x.idCategoria.Value, out cat);

                    return new VMProducto
                    {
                        Id = x.Id,
                        Codigo = x.Codigo,
                        Nombre = x.Nombre,
                        idCategoria = x.idCategoria,
                        Categoria = NombreCategoriaODefault(cat),
                        Stock = x.Stock,
                        PrecioCompra = x.PrecioCompra,
                        PrecioVenta = x.PrecioVenta,
                        PorcVenta = x.PorcVenta,
                        Total = (x.PrecioVenta ?? 0) * (x.Stock ?? 0),
                        DiasVencimiento = x.DiasVencimiento,
                        Activo = x.Activo ?? 0,
                        Marca = null,
                        TieneImagen = x.TieneImagen
                    };
                }).ToList();
            }
        }

        public static List<VMProducto> ListaProductos()
        {
            try
            {
                var lista = ConsultarListaProductosMinima(true);
                MarcarPendientesEnLista(lista);
                return lista;
            }
            catch (Exception ex)
            {
                LogEx(ex);
                try
                {
                    var lista = ConsultarListaProductosMinima(false);
                    MarcarPendientesEnLista(lista);
                    return lista;
                }
                catch (Exception ex2)
                {
                    LogEx(ex2);
                    return new List<VMProducto>();
                }
            }
        }

        private static void MarcarPendientesEnLista(List<VMProducto> lista)
        {
            if (lista == null || lista.Count == 0) return;
            try
            {
                var map = ProductosCambiosModel.MapPendientesPorProducto();
                if (map == null || map.Count == 0) return;
                foreach (var p in lista)
                {
                    int idSol;
                    if (map.TryGetValue(p.Id, out idSol))
                    {
                        p.TienePendiente = true;
                        p.IdSolicitudPendiente = idSol;
                    }
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
            }
        }

        public static decimal TotalDineroEnStock()
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    if (!db.Productos.Any())
                        return 0;

                    return db.Productos.Select(p => (p.PrecioVenta ?? 0) * (p.Stock ?? 0)).DefaultIfEmpty(0).Sum();
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return 0;
            }
        }

        public static string ObtenerImagenProducto(int id)
        {
            try
            {
                byte[] bytes;
                string mime;
                if (ObtenerImagenBytes(id, out bytes, out mime) && bytes != null && bytes.Length > 0)
                    return Convert.ToBase64String(bytes);
                return null;
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return null;
            }
        }

        public static List<VMProducto> ListaProductosActivos()
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var result = (from p in db.Productos
                                  join c in db.Categorias on p.idCategoria equals c.Id into cats
                                  from c in cats.DefaultIfEmpty()
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
                                      p.DiasVencimiento,
                                      p.Activo
                                  })
                                  .AsEnumerable()
                                  .Select(x => new VMProducto
                                  {
                                      Id = x.Id,
                                      Codigo = x.Codigo,
                                      Nombre = x.Nombre,
                                      idCategoria = x.idCategoria,
                                      Categoria = NombreCategoriaODefault(x.Categoria),
                                      Stock = x.Stock,
                                      PrecioCompra = x.PrecioCompra,
                                      PrecioVenta = x.PrecioVenta,
                                      Total = (x.PrecioCompra ?? 0) * (x.Stock ?? 0),
                                      PorcVenta = x.PorcVenta,
                                      DiasVencimiento = x.DiasVencimiento,
                                      Activo = x.Activo ?? 0
                                  })
                                  .ToList();

                    return result;
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return new List<VMProducto>();
            }
        }

        public static List<VMProducto> ListaProductosActivosConStock()
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var result = (from p in db.Productos
                                  join c in db.Categorias on p.idCategoria equals c.Id into cats
                                  from c in cats.DefaultIfEmpty()
                                  where p.Activo == 1 && p.Stock != null && p.Stock > 0
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
                                      p.DiasVencimiento,
                                      p.Activo
                                  })
                                  .AsEnumerable()
                                  .Select(x => new VMProducto
                                  {
                                      Id = x.Id,
                                      Codigo = x.Codigo,
                                      Nombre = x.Nombre,
                                      idCategoria = x.idCategoria,
                                      Categoria = NombreCategoriaODefault(x.Categoria),
                                      Stock = x.Stock,
                                      PrecioCompra = x.PrecioCompra,
                                      PrecioVenta = x.PrecioVenta,
                                      Total = (x.PrecioCompra ?? 0) * (x.Stock ?? 0),
                                      PorcVenta = x.PorcVenta,
                                      DiasVencimiento = x.DiasVencimiento,
                                      Activo = x.Activo ?? 0
                                  })
                                  .ToList();

                    return result;
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return new List<VMProducto>();
            }
        }

        public static List<VMCategoria> ListaCategorias()
        {
            try
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
            catch (Exception ex)
            {
                LogEx(ex);
                return new List<VMCategoria>();
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
                        int idCat, stock, porc;
                        decimal compra, venta;
                        int.TryParse(s1.GetCellValueAsString(iRow, 3), out idCat);
                        int.TryParse(s1.GetCellValueAsString(iRow, 4), out stock);
                        decimal.TryParse(s1.GetCellValueAsString(iRow, 5), out compra);
                        decimal.TryParse(s1.GetCellValueAsString(iRow, 6), out venta);
                        int.TryParse(s1.GetCellValueAsString(iRow, 7), out porc);

                        Nuevo(new VMProducto
                        {
                            Codigo = s1.GetCellValueAsString(iRow, 1),
                            Nombre = s1.GetCellValueAsString(iRow, 2),
                            idCategoria = idCat,
                            Stock = stock,
                            PrecioCompra = compra,
                            PrecioVenta = venta,
                            PorcVenta = porc,
                            Activo = 1
                        });

                        iRow++;
                    }

                    return true;
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return false;
            }
        }

        public static bool SumarStock(int id, int cantidad)
        {
            return AjustarStock(id, cantidad);
        }

        public static bool RestarStock(int id, int cantidad)
        {
            return AjustarStock(id, -cantidad);
        }

        public static bool SetStock(int id, int? stock)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var n = db.Database.ExecuteSqlCommand(
                        "UPDATE dbo.Productos SET Stock = @p0 WHERE Id = @p1",
                        DbVal(stock ?? 0), id);
                    return n > 0;
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return false;
            }
        }

        private static bool AjustarStock(int id, int delta)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var n = db.Database.ExecuteSqlCommand(
                        "UPDATE dbo.Productos SET Stock = ISNULL(Stock, 0) + @p0 WHERE Id = @p1",
                        delta, id);
                    return n > 0;
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return false;
            }
        }

        public static bool Nuevo(VMProducto model)
        {
            try
            {
                if (model == null || string.IsNullOrWhiteSpace(model.Nombre))
                    return false;

                model.Activo = model.Activo != 0 ? model.Activo : 1;
                var cols = new List<string>();
                var vals = new List<object>();
                CargarCamposPersistibles(model, cols, vals, true);
                if (cols.Count == 0) return false;

                var placeholders = string.Join(", ", cols.Select((c, i) => "@p" + i));
                var sql = "INSERT INTO dbo.Productos (" + string.Join(", ", cols) + ") VALUES (" + placeholders + ")";

                using (var db = new Sistema_DavidEntities())
                {
                    db.Database.ExecuteSqlCommand(sql, vals.ToArray());
                    return true;
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return false;
            }
        }

        public static bool Editar(VMProducto model)
        {
            try
            {
                if (model == null || model.Id <= 0 || string.IsNullOrWhiteSpace(model.Nombre))
                    return false;

                var cols = new List<string>();
                var vals = new List<object>();
                CargarCamposPersistibles(model, cols, vals, false);
                if (cols.Count == 0) return false;

                var sets = string.Join(", ", cols.Select((c, i) => c + " = @p" + i));
                vals.Add(model.Id);
                var sql = "UPDATE dbo.Productos SET " + sets + " WHERE Id = @p" + (vals.Count - 1);

                using (var db = new Sistema_DavidEntities())
                {
                    var n = db.Database.ExecuteSqlCommand(sql, vals.ToArray());
                    return n > 0;
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return false;
            }
        }

        public static bool ActualizarImagen(int id, string imagen)
        {
            try
            {
                if (id <= 0 || string.IsNullOrWhiteSpace(imagen))
                    return false;

                var limpia = imagen.Trim();
                if (limpia.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                {
                    var coma = limpia.IndexOf(',');
                    if (coma >= 0) limpia = limpia.Substring(coma + 1);
                }

                using (var db = new Sistema_DavidEntities())
                {
                    var n = db.Database.ExecuteSqlCommand(
                        "UPDATE dbo.Productos SET Imagen = @p0 WHERE Id = @p1",
                        limpia, id);
                    return n > 0;
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return false;
            }
        }

        public static bool EditarActivo(int id, int activo)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var n = db.Database.ExecuteSqlCommand(
                        "UPDATE dbo.Productos SET Activo = @p0 WHERE Id = @p1",
                        activo, id);
                    return n > 0;
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return false;
            }
        }

        public static VMProducto BuscarProducto(int id)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var sql = "SELECT " + SqlSelectColumnas("") + " FROM dbo.Productos WHERE Id = @p0";
                    var fila = db.Database.SqlQuery<ProductoFila>(sql, id).FirstOrDefault();
                    return MapearProductoFila(fila);
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
                try
                {
                    using (var db = new Sistema_DavidEntities())
                    {
                        var fila = db.Database.SqlQuery<ProductoFila>(@"
SELECT Id, Codigo, Nombre, Imagen, idCategoria, Stock, PrecioCompra, PrecioVenta, PorcVenta, Activo, DiasVencimiento
FROM dbo.Productos WHERE Id = @p0", id).FirstOrDefault();
                        return MapearProductoFila(fila);
                    }
                }
                catch (Exception ex2)
                {
                    LogEx(ex2);
                    return null;
                }
            }
        }

        public static bool ObtenerImagenBytes(int id, out byte[] bytes, out string mime)
        {
            bytes = null;
            mime = "image/jpeg";
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var conn = db.Database.Connection;
                    if (conn.State != ConnectionState.Open)
                        conn.Open();

                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT Imagen FROM dbo.Productos WHERE Id = @id";
                        var p = cmd.CreateParameter();
                        p.ParameterName = "@id";
                        p.Value = id;
                        cmd.Parameters.Add(p);

                        using (var reader = cmd.ExecuteReader(CommandBehavior.SequentialAccess))
                        {
                            if (!reader.Read() || reader.IsDBNull(0))
                                return false;

                            var raw = reader.GetValue(0);
                            bytes = DecodificarImagenProducto(raw, out mime);
                            return bytes != null && bytes.Length > 0;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
                bytes = null;
                return false;
            }
        }

        private static byte[] DecodificarImagenProducto(object raw, out string mime)
        {
            mime = "image/jpeg";
            if (raw == null || raw is DBNull) return null;

            byte[] data = null;
            if (raw is byte[])
                data = (byte[])raw;
            else
            {
                var texto = Convert.ToString(raw);
                if (string.IsNullOrWhiteSpace(texto)) return null;
                texto = texto.Trim();
                var coma = texto.IndexOf(',');
                if (coma >= 0 && texto.IndexOf("base64", StringComparison.OrdinalIgnoreCase) >= 0)
                    texto = texto.Substring(coma + 1);

                texto = texto.Replace("\r", "").Replace("\n", "").Replace(" ", "");
                try
                {
                    data = Convert.FromBase64String(texto);
                }
                catch (FormatException)
                {
                    return null;
                }
            }

            if (data == null || data.Length < 4) return null;

            // Base64 ASCII stored as binary
            if (data[0] == (byte)'/' && data.Length > 12)
            {
                try
                {
                    var asText = System.Text.Encoding.ASCII.GetString(data).Replace("\r", "").Replace("\n", "").Replace(" ", "");
                    if (asText.StartsWith("/9j", StringComparison.Ordinal) || asText.StartsWith("iVBOR", StringComparison.Ordinal))
                        data = Convert.FromBase64String(asText);
                }
                catch
                {
                    // keep original bytes
                }
            }

            if (data.Length >= 8 && data[0] == 137 && data[1] == 80 && data[2] == 78 && data[3] == 71)
                mime = "image/png";
            else
                mime = "image/jpeg";

            return data;
        }

        public static List<VMCliente> BuscarClientesParaWhatsapp(string nombre, string dni, int idVendedor)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var query = db.Clientes.AsQueryable();

                    if (idVendedor > 0)
                        query = query.Where(c => c.IdVendedor == idVendedor);

                    if (!string.IsNullOrWhiteSpace(nombre))
                    {
                        var n = nombre.Trim().ToUpper();
                        var tokens = n.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);

                        foreach (var token in tokens)
                        {
                            var t = token;
                            query = query.Where(c =>
                                (c.Nombre != null && c.Nombre.ToUpper().Contains(t)) ||
                                (c.Apellido != null && c.Apellido.ToUpper().Contains(t)));
                        }
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
            catch (Exception ex)
            {
                LogEx(ex);
                return new List<VMCliente>();
            }
        }

        public static bool Eliminar(int id)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var n = db.Database.ExecuteSqlCommand("DELETE FROM dbo.Productos WHERE Id = @p0", id);
                    return n > 0;
                }
            }
            catch (Exception ex)
            {
                LogEx(ex);
                return false;
            }
        }
    }
}
