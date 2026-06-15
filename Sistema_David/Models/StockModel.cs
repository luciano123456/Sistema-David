using Sistema_David.Models.DB;
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
                              .SqlQuery("SELECT s.Id, s.IdProducto, s.Cantidad, u.Nombre, s.IdUsuario, p.Nombre, s.Estado, u.VistaStock, s.IdCategoria, p.DiasVencimiento FROM StockUsuarios s INNER JOIN Usuarios u ON u.Id = s.IdUsuario INNER JOIN Productos p ON p.Id = s.IdProducto")
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
                                  DiasVencimiento = d.Productos.DiasVencimiento,
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

        public static ResultadoStock BuscarStockElectrodomesticos(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var usuario = db.Usuarios.FirstOrDefault(u => u.Id == id);
                bool vistaStock = usuario != null && usuario.VistaStock == 1;

                var stocks = (from d in db.StockUsuarios
                              .SqlQuery("SELECT s.Id, s.IdProducto, s.Cantidad, u.Nombre, s.IdUsuario, p.Nombre, s.Estado, u.VistaStock, s.IdCategoria, p.DiasVencimiento FROM StockUsuarios s INNER JOIN Usuarios u ON u.Id = s.IdUsuario INNER JOIN Productos p ON p.Id = s.IdProducto")
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
                                  DiasVencimiento = d.Productos.DiasVencimiento,
                                  Estado = d.Estado
                              })
                             .Where(x => x.IdUsuario == id && x.DiasVencimiento > 0)
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


        public static List<VMProductoStockFiltro> CatalogoProductosEnVendedores(bool soloEnVendedores = false)
        {
            using (var db = new Sistema_DavidEntities())
            {
                var list = (from s in db.StockUsuarios
                            join u in db.Usuarios on s.IdUsuario equals u.Id
                            join p in db.Productos on s.IdProducto equals p.Id
                            where u.IdEstado == 1 && s.Cantidad > 0
                            group new { s, p } by new { p.Id, p.Nombre, StockDep = p.Stock } into g
                            select new VMProductoStockFiltro
                            {
                                Id = g.Key.Id,
                                Nombre = g.Key.Nombre,
                                StockDeposito = g.Key.StockDep ?? 0,
                                CantidadEnVendedores = g.Sum(x => x.s.Cantidad),
                                VendedoresConStock = g.Select(x => x.s.IdUsuario).Distinct().Count()
                            }).ToList();

                if (soloEnVendedores)
                    list = list.Where(x => x.StockDeposito <= 0).ToList();

                return list.OrderBy(x => x.Nombre).ToList();
            }
        }

        public static List<VMProductoStockFiltro> CatalogoProductosEnDeposito()
        {
            using (var db = new Sistema_DavidEntities())
            {
                var idsConVendedor = db.StockUsuarios
                    .Where(s => s.Cantidad > 0)
                    .Select(s => s.IdProducto)
                    .Distinct()
                    .ToList();

                return db.Productos
                    .Where(p => p.Stock != null && p.Stock > 0 && !idsConVendedor.Contains(p.Id))
                    .OrderBy(p => p.Nombre)
                    .Select(p => new VMProductoStockFiltro
                    {
                        Id = p.Id,
                        Nombre = p.Nombre,
                        StockDeposito = p.Stock ?? 0,
                        CantidadEnVendedores = 0,
                        VendedoresConStock = 0
                    })
                    .ToList();
            }
        }

        private static List<int> ParseIdsCsv(string csv)
        {
            if (string.IsNullOrWhiteSpace(csv))
                return new List<int>();

            return csv.Split(',')
                .Select(x =>
                {
                    int id;
                    return int.TryParse(x.Trim(), out id) ? id : 0;
                })
                .Where(id => id > 0)
                .Distinct()
                .ToList();
        }

        public static List<VMStockUsuario> ListarStockGeneral(
            string idsVendedores,
            string idsDeposito,
            int idUsuario,
            int idTipoNegocio,
            bool soloEnVendedores)
        {
            var idsProdVendedores = ParseIdsCsv(idsVendedores);
            var idsProdDeposito = ParseIdsCsv(idsDeposito);
            var filtraVendedores = idsProdVendedores.Any();
            var filtraDeposito = idsProdDeposito.Any();

            using (var db = new Sistema_DavidEntities())
            {
                var result = new List<VMStockUsuario>();
                var incluirVendedores = !filtraDeposito || filtraVendedores;
                var incluirDeposito = filtraDeposito;

                if (!filtraVendedores && !filtraDeposito)
                    incluirVendedores = true;

                if (incluirVendedores)
                {
                    var query = from s in db.StockUsuarios
                                join u in db.Usuarios on s.IdUsuario equals u.Id
                                join p in db.Productos on s.IdProducto equals p.Id
                                join tn in db.TipoNegocio on u.IdTipoNegocio equals tn.Id into tnJoin
                                from tn in tnJoin.DefaultIfEmpty()
                                where u.IdEstado == 1 && s.Cantidad > 0
                                select new { s, u, p, tn };

                    if (filtraVendedores)
                        query = query.Where(x => idsProdVendedores.Contains(x.s.IdProducto));

                    if (soloEnVendedores)
                        query = query.Where(x => x.p.Stock == null || x.p.Stock <= 0);

                    if (idUsuario > 0)
                        query = query.Where(x => x.s.IdUsuario == idUsuario);

                    if (idTipoNegocio > 0)
                        query = query.Where(x => x.u.IdTipoNegocio == idTipoNegocio);

                    result.AddRange(query
                        .OrderBy(x => x.p.Nombre)
                        .ThenBy(x => x.u.Nombre)
                        .Select(x => new VMStockUsuario
                        {
                            Id = x.s.Id,
                            IdProducto = x.s.IdProducto,
                            Cantidad = x.s.Cantidad,
                            IdUsuario = x.s.IdUsuario,
                            Usuario = x.u.Nombre,
                            Producto = x.p.Nombre,
                            PrecioVenta = x.p.PrecioVenta != null ? (decimal)x.p.PrecioVenta : 0,
                            Total = (x.p.PrecioVenta != null ? (decimal)x.p.PrecioVenta : 0) * x.s.Cantidad,
                            TipoNegocio = x.tn != null ? x.tn.Nombre : "",
                            StockDeposito = x.p.Stock,
                            VistaStock = x.u.VistaStock,
                            Estado = "Vendedor"
                        })
                        .ToList());
                }

                if (incluirDeposito)
                {
                    var idsConVendedor = db.StockUsuarios
                        .Where(s => s.Cantidad > 0)
                        .Select(s => s.IdProducto)
                        .Distinct()
                        .ToList();

                    var productosDep = db.Productos
                        .Where(p => p.Stock != null && p.Stock > 0);

                    if (filtraDeposito)
                        productosDep = productosDep.Where(p => idsProdDeposito.Contains(p.Id));

                    productosDep = productosDep.Where(p => !idsConVendedor.Contains(p.Id));

                    var depositoRows = productosDep
                        .OrderBy(p => p.Nombre)
                        .ToList()
                        .Select(p => new VMStockUsuario
                        {
                            Id = 0,
                            IdProducto = p.Id,
                            IdUsuario = 0,
                            Usuario = "Depósito general",
                            Producto = p.Nombre,
                            Cantidad = p.Stock ?? 0,
                            StockDeposito = p.Stock ?? 0,
                            PrecioVenta = p.PrecioVenta != null ? (decimal)p.PrecioVenta : 0,
                            Total = (p.PrecioVenta != null ? (decimal)p.PrecioVenta : 0) * (p.Stock ?? 0),
                            TipoNegocio = "—",
                            Estado = "Deposito"
                        })
                        .ToList();

                    if (filtraDeposito && !filtraVendedores)
                    {
                        result = depositoRows;
                    }
                    else
                    {
                        var idsYaEnTabla = new HashSet<int>(result.Select(r => r.IdProducto));
                        foreach (var row in depositoRows)
                        {
                            if (!idsYaEnTabla.Contains(row.IdProducto))
                                result.Add(row);
                        }
                    }
                }

                return result
                    .OrderBy(x => x.Producto)
                    .ThenBy(x => x.Estado == "Deposito" ? 1 : 0)
                    .ThenBy(x => x.Usuario)
                    .ToList();
            }
        }

        [Obsolete("Usar ListarStockGeneral con idsVendedores/idsDeposito")]
        public static List<VMStockUsuario> ListarStockGeneral(int idProducto, int idUsuario, int idTipoNegocio)
        {
            var idsV = idProducto > 0 ? idProducto.ToString() : null;
            return ListarStockGeneral(idsV, null, idUsuario, idTipoNegocio, false);
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