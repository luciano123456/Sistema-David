using Newtonsoft.Json;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Sistema_David.Models
{
    public static class ProductosCambiosModel
    {
        private static readonly JsonSerializerSettings JsonCfg = new JsonSerializerSettings
        {
            NullValueHandling = NullValueHandling.Ignore,
            Formatting = Formatting.None
        };

        private static bool _schemaOk;

        private const string OrigenAdmin = "Administrador";
        private const string OrigenAceptadoAdmin = "Aceptado por administrador";
        private const string OrigenRechazadoAdmin = "Rechazado por administrador";

        private static string SqlNombreUsuario(string alias)
        {
            return @"LTRIM(RTRIM(ISNULL(" + alias + @".Nombre, N'')
    + CASE
        WHEN NULLIF(LTRIM(RTRIM(ISNULL(" + alias + @".Apellido, N''))), N'') IS NULL THEN N''
        WHEN LTRIM(RTRIM(" + alias + @".Apellido)) NOT LIKE N'%[^0-9]%' THEN N''
        ELSE N' ' + LTRIM(RTRIM(" + alias + @".Apellido))
      END))";
        }

        public static void AsegurarEsquema()
        {
            if (_schemaOk) return;

            using (var db = new Sistema_DavidEntities())
            {
                db.Database.ExecuteSqlCommand(@"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Productos_Solicitudes' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE dbo.Productos_Solicitudes
    (
        Id                 INT IDENTITY(1,1) NOT NULL,
        Tipo               NVARCHAR(30) NOT NULL,
        IdProducto         INT NULL,
        NombreProducto     NVARCHAR(300) NULL,
        Estado             NVARCHAR(20) NOT NULL,
        IdUsuarioSolicita  INT NOT NULL,
        FechaSolicitud     DATETIME NOT NULL CONSTRAINT DF_Productos_Solicitudes_Fecha DEFAULT (GETDATE()),
        IdUsuarioResuelve  INT NULL,
        FechaResolucion    DATETIME NULL,
        Comentario         NVARCHAR(800) NULL,
        SnapshotAntes      NVARCHAR(MAX) NULL,
        SnapshotDespues    NVARCHAR(MAX) NULL,
        DiffJson           NVARCHAR(MAX) NULL,
        CantidadCampos     INT NULL,
        CONSTRAINT PK_Productos_Solicitudes PRIMARY KEY CLUSTERED (Id)
    );
    CREATE NONCLUSTERED INDEX IX_Productos_Solicitudes_Estado
        ON dbo.Productos_Solicitudes (Estado, FechaSolicitud DESC);
    CREATE NONCLUSTERED INDEX IX_Productos_Solicitudes_Producto
        ON dbo.Productos_Solicitudes (IdProducto, Estado);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Productos_Historial' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE dbo.Productos_Historial
    (
        Id              INT IDENTITY(1,1) NOT NULL,
        IdProducto      INT NULL,
        IdSolicitud     INT NULL,
        Fecha           DATETIME NOT NULL CONSTRAINT DF_Productos_Historial_Fecha DEFAULT (GETDATE()),
        IdUsuario       INT NOT NULL,
        IdUsuarioSolicita INT NULL,
        IdUsuarioResuelve INT NULL,
        Tipo            NVARCHAR(40) NOT NULL,
        NombreProducto  NVARCHAR(300) NULL,
        Resumen         NVARCHAR(MAX) NULL,
        DiffJson        NVARCHAR(MAX) NULL,
        Origen          NVARCHAR(80) NULL,
        EstadoResultado NVARCHAR(20) NULL,
        Comentario      NVARCHAR(800) NULL,
        CONSTRAINT PK_Productos_Historial PRIMARY KEY CLUSTERED (Id)
    );
    CREATE NONCLUSTERED INDEX IX_Productos_Historial_Producto
        ON dbo.Productos_Historial (IdProducto, Fecha DESC);
    CREATE NONCLUSTERED INDEX IX_Productos_Historial_Fecha
        ON dbo.Productos_Historial (Fecha DESC);
END");
                try
                {
                    db.Database.ExecuteSqlCommand(@"
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Productos_Solicitudes' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    ;WITH d AS (
        SELECT Id,
               ROW_NUMBER() OVER (PARTITION BY IdProducto ORDER BY Id DESC) AS rn
        FROM dbo.Productos_Solicitudes
        WHERE Estado = N'Pendiente' AND IdProducto IS NOT NULL
    )
    UPDATE s
    SET Estado = N'Reemplazada',
        FechaResolucion = GETDATE(),
        Comentario = ISNULL(NULLIF(s.Comentario, N''), N'Duplicado unificado: un pendiente por producto')
    FROM dbo.Productos_Solicitudes s
    INNER JOIN d ON d.Id = s.Id
    WHERE d.rn > 1;
END");
                    db.Database.ExecuteSqlCommand(@"
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Productos_Solicitudes' AND schema_id = SCHEMA_ID(N'dbo'))
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Productos_Solicitudes_PendienteProducto' AND object_id = OBJECT_ID(N'dbo.Productos_Solicitudes'))
    CREATE UNIQUE NONCLUSTERED INDEX UX_Productos_Solicitudes_PendienteProducto
    ON dbo.Productos_Solicitudes (IdProducto)
    WHERE Estado = N'Pendiente' AND IdProducto IS NOT NULL;");
                }
                catch
                {
                }

                try
                {
                    db.Database.ExecuteSqlCommand(@"
IF COL_LENGTH(N'dbo.Productos_Historial', N'IdUsuarioSolicita') IS NULL
    ALTER TABLE dbo.Productos_Historial ADD IdUsuarioSolicita INT NULL;
IF COL_LENGTH(N'dbo.Productos_Historial', N'IdUsuarioResuelve') IS NULL
    ALTER TABLE dbo.Productos_Historial ADD IdUsuarioResuelve INT NULL;
IF COL_LENGTH(N'dbo.Productos_Historial', N'Origen') IS NOT NULL
    ALTER TABLE dbo.Productos_Historial ALTER COLUMN Origen NVARCHAR(80) NULL;");
                    db.Database.ExecuteSqlCommand(@"
UPDATE h
SET IdUsuarioSolicita = COALESCE(h.IdUsuarioSolicita, s.IdUsuarioSolicita),
    IdUsuarioResuelve = COALESCE(h.IdUsuarioResuelve, s.IdUsuarioResuelve, CASE WHEN h.IdSolicitud IS NOT NULL THEN h.IdUsuario END)
FROM dbo.Productos_Historial h
LEFT JOIN dbo.Productos_Solicitudes s ON s.Id = h.IdSolicitud
WHERE h.IdUsuarioSolicita IS NULL OR h.IdUsuarioResuelve IS NULL;

UPDATE dbo.Productos_Historial
SET IdUsuarioResuelve = IdUsuario
WHERE IdUsuarioResuelve IS NULL AND IdSolicitud IS NULL;");
                }
                catch
                {
                }
            }

            _schemaOk = true;
        }

        public static VMProductoSnapshot DesdeProducto(VMProducto p)
        {
            if (p == null) return null;
            return new VMProductoSnapshot
            {
                Id = p.Id,
                Codigo = p.Codigo,
                Nombre = p.Nombre,
                Imagen = p.Imagen,
                Activo = p.Activo,
                idCategoria = p.idCategoria,
                Stock = p.Stock,
                PrecioCompra = p.PrecioCompra,
                PrecioVenta = p.PrecioVenta,
                PorcVenta = p.PorcVenta.HasValue ? (int?)Convert.ToInt32(p.PorcVenta.Value) : (int?)null,
                DiasVencimiento = p.DiasVencimiento,
                Marca = p.Marca,
                Modelo = p.Modelo,
                Color = p.Color,
                Accesorios = p.Accesorios,
                Caracteristicas = p.Caracteristicas,
                Descripcion = p.Descripcion,
                FinConEntrega = p.FinConEntrega,
                FinSinEntrega = p.FinSinEntrega,
                FinSemanal = p.FinSemanal,
                FinQuincenal = p.FinQuincenal,
                FinMensual = p.FinMensual,
                ImagenesExtra = p.ImagenesExtra != null ? p.ImagenesExtra.ToList() : new List<string>()
            };
        }

        public static VMProducto AProducto(VMProductoSnapshot s)
        {
            if (s == null) return null;
            return new VMProducto
            {
                Id = s.Id,
                Codigo = s.Codigo,
                Nombre = s.Nombre,
                Imagen = s.Imagen,
                Activo = s.Activo,
                idCategoria = s.idCategoria,
                Stock = s.Stock,
                PrecioCompra = s.PrecioCompra,
                PrecioVenta = s.PrecioVenta,
                PorcVenta = s.PorcVenta,
                DiasVencimiento = s.DiasVencimiento,
                Marca = s.Marca,
                Modelo = s.Modelo,
                Color = s.Color,
                Accesorios = s.Accesorios,
                Caracteristicas = s.Caracteristicas,
                Descripcion = s.Descripcion,
                FinConEntrega = s.FinConEntrega,
                FinSinEntrega = s.FinSinEntrega,
                FinSemanal = s.FinSemanal,
                FinQuincenal = s.FinQuincenal,
                FinMensual = s.FinMensual,
                ImagenesExtra = s.ImagenesExtra ?? new List<string>()
            };
        }

        public static List<VMProductoDiffCampo> CalcularDiff(VMProductoSnapshot antes, VMProductoSnapshot despues, string tipo)
        {
            var diffs = new List<VMProductoDiffCampo>();
            if (string.Equals(tipo, "Eliminar", StringComparison.OrdinalIgnoreCase))
            {
                diffs.Add(Campo("Nombre", "Nombre", "General", "texto", Texto(antes?.Nombre), "(se elimina)"));
                diffs.Add(Campo("Stock", "Stock", "General", "numero", Num(antes?.Stock), "0"));
                return diffs;
            }

            if (string.Equals(tipo, "Nuevo", StringComparison.OrdinalIgnoreCase))
            {
                AddSiCambio(diffs, "Nombre", "Nombre", "General", "texto", null, despues?.Nombre);
                AddSiCambio(diffs, "Stock", "Stock", "General", "numero", null, Num(despues?.Stock));
                AddSiCambio(diffs, "PrecioCompra", "Precio compra", "General", "moneda", null, Moneda(despues?.PrecioCompra));
                AddSiCambio(diffs, "PrecioVenta", "Precio venta", "General", "moneda", null, Moneda(despues?.PrecioVenta));
                AddSiCambio(diffs, "PorcVenta", "% venta", "General", "numero", null, Num(despues?.PorcVenta));
                AddSiCambio(diffs, "DiasVencimiento", "Días vencimiento", "General", "numero", null, Num(despues?.DiasVencimiento));
                AddSiCambio(diffs, "Marca", "Marca", "Características", "texto", null, despues?.Marca);
                AddSiCambio(diffs, "Modelo", "Modelo", "Características", "texto", null, despues?.Modelo);
                AddSiCambio(diffs, "Color", "Color", "Características", "texto", null, despues?.Color);
                AddSiCambio(diffs, "Accesorios", "Accesorios", "Características", "texto", null, despues?.Accesorios);
                AddSiCambio(diffs, "Descripcion", "Texto comercial", "Características", "texto", null, despues?.Descripcion);
                AddSiCambio(diffs, "Caracteristicas", "Lista con ✔", "Características", "texto", null, despues?.Caracteristicas);
                AddSiCambio(diffs, "FinConEntrega", "Con entrega", "Financiación", "texto", null, despues?.FinConEntrega);
                AddSiCambio(diffs, "FinSinEntrega", "Sin entrega", "Financiación", "texto", null, despues?.FinSinEntrega);
                AddSiCambio(diffs, "FinSemanal", "Cuotas semanales", "Financiación", "texto", null, despues?.FinSemanal);
                AddSiCambio(diffs, "FinQuincenal", "Cuotas quincenales", "Financiación", "texto", null, despues?.FinQuincenal);
                AddSiCambio(diffs, "FinMensual", "Cuotas mensuales", "Financiación", "texto", null, despues?.FinMensual);
                AddImagen(diffs, antes, despues);
                return diffs.Where(d => !EsVacio(d.ValorNuevo) || d.TipoValor == "imagen" || d.TipoValor == "imagenes").ToList();
            }

            AddSiCambio(diffs, "Nombre", "Nombre", "General", "texto", antes?.Nombre, despues?.Nombre);
            AddSiCambio(diffs, "Stock", "Stock", "General", "numero", Num(antes?.Stock), Num(despues?.Stock));
            AddSiCambio(diffs, "PrecioCompra", "Precio compra", "General", "moneda", Moneda(antes?.PrecioCompra), Moneda(despues?.PrecioCompra));
            AddSiCambio(diffs, "PrecioVenta", "Precio venta", "General", "moneda", Moneda(antes?.PrecioVenta), Moneda(despues?.PrecioVenta));
            AddSiCambio(diffs, "PorcVenta", "% venta", "General", "numero", Num(antes?.PorcVenta), Num(despues?.PorcVenta));
            AddSiCambio(diffs, "DiasVencimiento", "Días vencimiento", "General", "numero", Num(antes?.DiasVencimiento), Num(despues?.DiasVencimiento));
            AddSiCambio(diffs, "Activo", "Estado", "General", "texto", ActivoTxt(antes?.Activo), ActivoTxt(despues?.Activo));
            AddSiCambio(diffs, "Marca", "Marca", "Características", "texto", antes?.Marca, despues?.Marca);
            AddSiCambio(diffs, "Modelo", "Modelo", "Características", "texto", antes?.Modelo, despues?.Modelo);
            AddSiCambio(diffs, "Color", "Color", "Características", "texto", antes?.Color, despues?.Color);
            AddSiCambio(diffs, "Accesorios", "Accesorios", "Características", "texto", antes?.Accesorios, despues?.Accesorios);
            AddSiCambio(diffs, "Descripcion", "Texto comercial", "Características", "texto", antes?.Descripcion, despues?.Descripcion);
            AddSiCambio(diffs, "Caracteristicas", "Lista con ✔", "Características", "texto", antes?.Caracteristicas, despues?.Caracteristicas);
            AddSiCambio(diffs, "FinConEntrega", "Con entrega", "Financiación", "texto", antes?.FinConEntrega, despues?.FinConEntrega);
            AddSiCambio(diffs, "FinSinEntrega", "Sin entrega", "Financiación", "texto", antes?.FinSinEntrega, despues?.FinSinEntrega);
            AddSiCambio(diffs, "FinSemanal", "Cuotas semanales", "Financiación", "texto", antes?.FinSemanal, despues?.FinSemanal);
            AddSiCambio(diffs, "FinQuincenal", "Cuotas quincenales", "Financiación", "texto", antes?.FinQuincenal, despues?.FinQuincenal);
            AddSiCambio(diffs, "FinMensual", "Cuotas mensuales", "Financiación", "texto", antes?.FinMensual, despues?.FinMensual);
            AddImagen(diffs, antes, despues);
            return diffs;
        }

        private static void AddImagen(List<VMProductoDiffCampo> diffs, VMProductoSnapshot a, VMProductoSnapshot d)
        {
            var imgA = Texto(a?.Imagen);
            var imgD = Texto(d?.Imagen);
            if (!string.Equals(imgA, imgD, StringComparison.Ordinal))
            {
                diffs.Add(new VMProductoDiffCampo
                {
                    Campo = "Imagen",
                    Etiqueta = "Imagen principal",
                    Grupo = "Fotos",
                    TipoValor = "imagen",
                    ValorAnterior = string.IsNullOrEmpty(imgA) ? "(sin imagen)" : "(imagen anterior)",
                    ValorNuevo = string.IsNullOrEmpty(imgD) ? "(sin imagen)" : "(imagen nueva)",
                    TieneImagenAntes = !string.IsNullOrEmpty(imgA),
                    TieneImagenDespues = !string.IsNullOrEmpty(imgD)
                });
            }

            var extraA = a?.ImagenesExtra ?? new List<string>();
            var extraD = d?.ImagenesExtra ?? new List<string>();
            if (!CampoEnCatalogo("ImagenesExtra")) return;
            var ja = JsonConvert.SerializeObject(extraA);
            var jd = JsonConvert.SerializeObject(extraD);
            if (!string.Equals(ja, jd, StringComparison.Ordinal))
            {
                diffs.Add(new VMProductoDiffCampo
                {
                    Campo = "ImagenesExtra",
                    Etiqueta = "Fotos adicionales",
                    Grupo = "Fotos",
                    TipoValor = "imagenes",
                    ValorAnterior = extraA.Count + " foto(s)",
                    ValorNuevo = extraD.Count + " foto(s)",
                    ExtraAntes = extraA.Count,
                    ExtraDespues = extraD.Count
                });
            }
        }

        private static void AddSiCambio(List<VMProductoDiffCampo> diffs, string campo, string etiqueta, string grupo, string tipo, string antes, string despues)
        {
            if (!CampoEnCatalogo(campo)) return;
            var a = Texto(antes);
            var d = Texto(despues);
            if (string.Equals(a, d, StringComparison.Ordinal)) return;
            diffs.Add(Campo(campo, etiqueta, grupo, tipo, a, d));
        }

        private static VMProductoDiffCampo Campo(string campo, string etiqueta, string grupo, string tipo, string antes, string despues)
        {
            return new VMProductoDiffCampo
            {
                Campo = campo,
                Etiqueta = etiqueta,
                Grupo = grupo,
                TipoValor = tipo,
                ValorAnterior = string.IsNullOrEmpty(antes) ? "—" : antes,
                ValorNuevo = string.IsNullOrEmpty(despues) ? "—" : despues
            };
        }

        private static string Texto(string v) => string.IsNullOrWhiteSpace(v) ? "" : v.Trim();
        private static string Num(int? v) => v.HasValue ? v.Value.ToString() : "";
        private static string Moneda(decimal? v) => v.HasValue ? v.Value.ToString("0.##") : "";
        private static string ActivoTxt(int? v) => (v ?? 0) == 1 ? "Activo" : "Inactivo";
        private static bool EsVacio(string v) => string.IsNullOrWhiteSpace(v) || v == "—";

        private static bool CampoEnCatalogo(string campo)
        {
            if (string.IsNullOrEmpty(campo)) return true;
            switch (campo)
            {
                case "Marca":
                case "Modelo":
                case "Color":
                case "Accesorios":
                case "Caracteristicas":
                case "Descripcion":
                case "FinConEntrega":
                case "FinSinEntrega":
                case "FinSemanal":
                case "FinQuincenal":
                case "FinMensual":
                case "ImagenesExtra":
                    return ProductosModel.TieneColumnaCatalogo(campo == "ImagenesExtra" ? "ImagenesAdicionales" : campo);
                default:
                    return true;
            }
        }

        public static string ArmarResumen(string tipo, string nombre, List<VMProductoDiffCampo> diffs)
        {
            var n = string.IsNullOrWhiteSpace(nombre) ? "producto" : nombre;
            if (diffs == null || diffs.Count == 0)
                return tipo + " · " + n;

            var campos = string.Join(", ", diffs.Take(8).Select(x => x.Etiqueta));
            if (diffs.Count > 8) campos += " +" + (diffs.Count - 8);
            return tipo + " · " + n + " · " + diffs.Count + " cambio(s): " + campos;
        }

        public static VMProductoCambioResultado SolicitarNuevo(VMProducto model, int idUsuario)
        {
            AsegurarEsquema();
            if (model == null || string.IsNullOrWhiteSpace(model.Nombre))
                return Fail("Ingresá el nombre del producto.");

            var despues = DesdeProducto(model);
            despues.Id = 0;
            var diffs = CalcularDiff(null, despues, "Nuevo");
            return GuardarSolicitud("Nuevo", null, model.Nombre, idUsuario, null, despues, diffs, false);
        }

        public static VMProductoCambioResultado SolicitarEditar(VMProducto model, int idUsuario, bool esComprobante)
        {
            AsegurarEsquema();
            if (model == null || model.Id <= 0)
                return Fail("Producto inválido.");

            var actual = ProductosModel.BuscarProducto(model.Id);
            if (actual == null) return Fail("No se encontró el producto.");

            if (esComprobante)
            {
                model.PrecioCompra = actual.PrecioCompra;
                model.PorcVenta = actual.PorcVenta;
            }

            var antes = DesdeProducto(actual);
            var despues = DesdeProducto(model);
            despues.Id = actual.Id;
            despues.Activo = actual.Activo;

            var diffs = CalcularDiff(antes, despues, "Editar");
            if (diffs.Count == 0)
                return Fail("No hay cambios para enviar.");

            return GuardarSolicitud("Editar", actual.Id, despues.Nombre ?? actual.Nombre, idUsuario, antes, despues, diffs, model.ConfirmOverwrite);
        }

        public static VMProductoCambioResultado SolicitarEliminar(int idProducto, int idUsuario, bool confirmarOverwrite = false)
        {
            AsegurarEsquema();
            var actual = ProductosModel.BuscarProducto(idProducto);
            if (actual == null) return Fail("No se encontró el producto.");

            var stock = StockModel.ObtenerUsuariosConProductoEnStock(idProducto);
            if (stock != null && stock.Any())
            {
                return new VMProductoCambioResultado
                {
                    Status = false,
                    TieneStock = true,
                    Mensaje = "No se puede solicitar eliminar: hay vendedores con este producto en stock.",
                    Detalle = stock.Select(x => "- " + x.Usuario + " (" + x.Cantidad + ")").ToList()
                };
            }

            var antes = DesdeProducto(actual);
            var diffs = CalcularDiff(antes, null, "Eliminar");
            return GuardarSolicitud("Eliminar", actual.Id, actual.Nombre, idUsuario, antes, null, diffs, confirmarOverwrite);
        }

        public static VMProductoCambioResultado SolicitarActivo(int idProducto, int activo, int idUsuario, bool confirmarOverwrite = false)
        {
            AsegurarEsquema();
            var actual = ProductosModel.BuscarProducto(idProducto);
            if (actual == null) return Fail("No se encontró el producto.");

            var antes = DesdeProducto(actual);
            var despues = DesdeProducto(actual);
            QuitarImagenesSnapshot(antes);
            QuitarImagenesSnapshot(despues);
            despues.Activo = activo;
            var diffs = CalcularDiff(antes, despues, "Activo");
            if (diffs.Count == 0) return Fail("El producto ya tiene ese estado.");

            return GuardarSolicitud("Activo", actual.Id, actual.Nombre, idUsuario, antes, despues, diffs, confirmarOverwrite);
        }

        public static VMProductoCambioResultado SolicitarStock(int idProducto, int cantidad, bool sumar, int idUsuario, bool confirmarOverwrite = false)
        {
            AsegurarEsquema();
            if (cantidad <= 0) return Fail("La cantidad debe ser mayor a 0.");

            var actual = ProductosModel.BuscarProducto(idProducto);
            if (actual == null) return Fail("No se encontró el producto.");

            var stockActual = actual.Stock ?? 0;
            var stockNuevo = sumar ? stockActual + cantidad : stockActual - cantidad;
            if (stockNuevo < 0) return Fail("El stock no puede quedar negativo.");

            var antes = DesdeProducto(actual);
            var despues = DesdeProducto(actual);
            QuitarImagenesSnapshot(antes);
            QuitarImagenesSnapshot(despues);
            despues.Stock = stockNuevo;
            despues.StockDelta = cantidad;
            despues.StockDireccion = sumar ? "Agregar" : "Quitar";

            var diffs = CalcularDiff(antes, despues, "Stock");
            return GuardarSolicitud("Stock", actual.Id, actual.Nombre, idUsuario, antes, despues, diffs, confirmarOverwrite);
        }

        private static void QuitarImagenesSnapshot(VMProductoSnapshot s)
        {
            if (s == null) return;
            s.Imagen = null;
            s.ImagenesExtra = new List<string>();
        }

        public static void MarcarPendientesReemplazados(int idProducto, string comentario)
        {
            if (idProducto <= 0) return;
            try
            {
                AsegurarEsquema();
                using (var db = new Sistema_DavidEntities())
                {
                    CancelarPendientesProducto(db, idProducto, comentario ?? "Reemplazada");
                }
            }
            catch
            {
            }
        }

        public static Dictionary<int, int> MapPendientesPorProducto()
        {
            try
            {
                AsegurarEsquema();
                using (var db = new Sistema_DavidEntities())
                {
                    var rows = db.Database.SqlQuery<PendienteMapRow>(@"
SELECT IdProducto, MAX(Id) AS IdSolicitud
FROM dbo.Productos_Solicitudes
WHERE Estado = N'Pendiente' AND IdProducto IS NOT NULL
GROUP BY IdProducto").ToList();
                    var map = new Dictionary<int, int>();
                    foreach (var r in rows)
                    {
                        if (r.IdProducto > 0)
                            map[r.IdProducto] = r.IdSolicitud;
                    }
                    return map;
                }
            }
            catch
            {
                return new Dictionary<int, int>();
            }
        }

        private class PendienteMapRow
        {
            public int IdProducto { get; set; }
            public int IdSolicitud { get; set; }
        }

        private static int? IdPendienteProducto(Sistema_DavidEntities db, int idProducto)
        {
            var id = db.Database.SqlQuery<int>(@"
SELECT TOP 1 Id FROM dbo.Productos_Solicitudes
WHERE IdProducto = @p0 AND Estado = N'Pendiente'
ORDER BY Id DESC", idProducto).FirstOrDefault();
            return id > 0 ? (int?)id : null;
        }

        private static void CancelarPendientesProducto(Sistema_DavidEntities db, int idProducto, string comentario, int? idAdmin = null)
        {
            db.Database.ExecuteSqlCommand(@"
UPDATE dbo.Productos_Solicitudes
SET Estado = N'Reemplazada', FechaResolucion = GETDATE(), Comentario = @p0,
    IdUsuarioResuelve = COALESCE(@p2, IdUsuarioResuelve)
WHERE IdProducto = @p1 AND Estado = N'Pendiente'",
                (object)comentario ?? "Reemplazada",
                idProducto,
                (object)idAdmin ?? DBNull.Value);
        }

        private static VMProductoCambioResultado GuardarSolicitud(
            string tipo,
            int? idProducto,
            string nombre,
            int idUsuario,
            VMProductoSnapshot antes,
            VMProductoSnapshot despues,
            List<VMProductoDiffCampo> diffs,
            bool confirmarOverwrite)
        {
            try
            {
                var diffJson = JsonConvert.SerializeObject(diffs ?? new List<VMProductoDiffCampo>(), JsonCfg);
                var snapA = antes == null ? null : JsonConvert.SerializeObject(antes, JsonCfg);
                var snapD = despues == null ? null : JsonConvert.SerializeObject(despues, JsonCfg);
                var cant = diffs == null ? 0 : diffs.Count;

                using (var db = new Sistema_DavidEntities())
                {
                    if (idProducto.HasValue && idProducto.Value > 0)
                    {
                        var existente = IdPendienteProducto(db, idProducto.Value);
                        if (existente.HasValue && existente.Value > 0 && !confirmarOverwrite)
                        {
                            return new VMProductoCambioResultado
                            {
                                Status = false,
                                RequiereOverwrite = true,
                                TienePendiente = true,
                                IdSolicitud = existente.Value,
                                Mensaje = "Tenés cambios pendientes de este producto. ¿Deseás pisarlos?"
                            };
                        }

                        if (existente.HasValue && existente.Value > 0 && confirmarOverwrite)
                            CancelarPendientesProducto(db, idProducto.Value, "Sustituida por una solicitud más reciente");
                    }

                    var ids = db.Database.SqlQuery<int>(@"
INSERT INTO dbo.Productos_Solicitudes
    (Tipo, IdProducto, NombreProducto, Estado, IdUsuarioSolicita, FechaSolicitud, SnapshotAntes, SnapshotDespues, DiffJson, CantidadCampos)
OUTPUT INSERTED.Id
VALUES
    (@p0, @p1, @p2, N'Pendiente', @p3, GETDATE(), @p4, @p5, @p6, @p7);",
                        tipo,
                        (object)idProducto ?? DBNull.Value,
                        (object)nombre ?? "",
                        idUsuario,
                        (object)snapA ?? DBNull.Value,
                        (object)snapD ?? DBNull.Value,
                        (object)diffJson ?? DBNull.Value,
                        cant
                    ).ToList();

                    var id = ids.Count > 0 ? ids[0] : 0;
                    return new VMProductoCambioResultado
                    {
                        Status = true,
                        Pendiente = true,
                        IdSolicitud = id,
                        Mensaje = confirmarOverwrite
                            ? "Se envió a pendientes (se pisó el cambio anterior)."
                            : "Se envió a pendientes."
                    };
                }
            }
            catch (Exception)
            {
                return Fail("No se pudo enviar el cambio a pendientes. Intentá de nuevo.");
            }
        }

        public static int ContarPendientes(int idRol, int idUsuario)
        {
            AsegurarEsquema();
            using (var db = new Sistema_DavidEntities())
            {
                if (idRol == 1)
                {
                    return db.Database.SqlQuery<int>(
                        "SELECT COUNT(1) FROM dbo.Productos_Solicitudes WHERE Estado = N'Pendiente'").FirstOrDefault();
                }

                return db.Database.SqlQuery<int>(
                    "SELECT COUNT(1) FROM dbo.Productos_Solicitudes WHERE Estado = N'Pendiente' AND IdUsuarioSolicita = @p0",
                    idUsuario).FirstOrDefault();
            }
        }

        public static List<VMProductoSolicitud> ListarPendientes(int idRol, int idUsuario)
        {
            AsegurarEsquema();
            using (var db = new Sistema_DavidEntities())
            {
                var sql = @"
SELECT s.Id, s.Tipo, s.IdProducto, s.NombreProducto, s.Estado,
       s.IdUsuarioSolicita,
       " + SqlNombreUsuario("u") + @" AS UsuarioSolicita,
       s.FechaSolicitud, s.IdUsuarioResuelve,
       " + SqlNombreUsuario("r") + @" AS UsuarioResuelve,
       s.FechaResolucion, s.Comentario, s.DiffJson, s.CantidadCampos
FROM dbo.Productos_Solicitudes s
LEFT JOIN dbo.Usuarios u ON u.Id = s.IdUsuarioSolicita
LEFT JOIN dbo.Usuarios r ON r.Id = s.IdUsuarioResuelve
WHERE s.Estado = N'Pendiente'
" + (idRol == 1 ? "" : " AND s.IdUsuarioSolicita = @p0 ") + @"
ORDER BY s.FechaSolicitud DESC";

                var rows = idRol == 1
                    ? db.Database.SqlQuery<VMProductoSolicitud>(sql).ToList()
                    : db.Database.SqlQuery<VMProductoSolicitud>(sql, idUsuario).ToList();

                foreach (var row in rows)
                    row.Cambios = ParseDiffs(row.DiffJson);

                return rows;
            }
        }

        public static VMProductoSolicitud ObtenerSolicitud(int id, bool incluirSnapshotsMeta = true)
        {
            AsegurarEsquema();
            using (var db = new Sistema_DavidEntities())
            {
                var row = db.Database.SqlQuery<VMProductoSolicitud>(@"
SELECT s.Id, s.Tipo, s.IdProducto, s.NombreProducto, s.Estado,
       s.IdUsuarioSolicita,
       " + SqlNombreUsuario("u") + @" AS UsuarioSolicita,
       s.FechaSolicitud, s.IdUsuarioResuelve,
       " + SqlNombreUsuario("r") + @" AS UsuarioResuelve,
       s.FechaResolucion, s.Comentario, s.DiffJson, s.CantidadCampos
FROM dbo.Productos_Solicitudes s
LEFT JOIN dbo.Usuarios u ON u.Id = s.IdUsuarioSolicita
LEFT JOIN dbo.Usuarios r ON r.Id = s.IdUsuarioResuelve
WHERE s.Id = @p0", id).FirstOrDefault();

                if (row == null) return null;
                row.Cambios = ParseDiffs(row.DiffJson);

                if (incluirSnapshotsMeta)
                {
                    var snaps = db.Database.SqlQuery<SnapFlags>(@"
SELECT
    CASE WHEN SnapshotAntes IS NULL OR SnapshotAntes = N'' THEN 0 ELSE 1 END AS HasAntes,
    CASE WHEN SnapshotDespues IS NULL OR SnapshotDespues = N'' THEN 0 ELSE 1 END AS HasDespues,
    SnapshotAntes, SnapshotDespues
FROM dbo.Productos_Solicitudes WHERE Id = @p0", id).FirstOrDefault();

                    if (snaps != null)
                    {
                        var a = DeserializarSnap(snaps.SnapshotAntes);
                        var d = DeserializarSnap(snaps.SnapshotDespues);
                        row.TieneImagenAntes = !string.IsNullOrWhiteSpace(a?.Imagen);
                        row.TieneImagenDespues = !string.IsNullOrWhiteSpace(d?.Imagen);
                    }
                }

                return row;
            }
        }

        private class SnapFlags
        {
            public int HasAntes { get; set; }
            public int HasDespues { get; set; }
            public string SnapshotAntes { get; set; }
            public string SnapshotDespues { get; set; }
        }

        private class SnapRow
        {
            public string SnapshotAntes { get; set; }
            public string SnapshotDespues { get; set; }
            public string Tipo { get; set; }
            public int? IdProducto { get; set; }
            public string NombreProducto { get; set; }
            public string DiffJson { get; set; }
            public string Estado { get; set; }
            public int IdUsuarioSolicita { get; set; }
        }

        public static byte[] ObtenerImagenSolicitud(int id, string lado, int extraIndex, out string mime)
        {
            mime = "image/jpeg";
            AsegurarEsquema();
            using (var db = new Sistema_DavidEntities())
            {
                var row = db.Database.SqlQuery<SnapRow>(@"
SELECT SnapshotAntes, SnapshotDespues, Tipo, IdProducto, NombreProducto, DiffJson, Estado, IdUsuarioSolicita
FROM dbo.Productos_Solicitudes WHERE Id = @p0", id).FirstOrDefault();
                if (row == null) return null;

                var snap = string.Equals(lado, "antes", StringComparison.OrdinalIgnoreCase)
                    ? DeserializarSnap(row.SnapshotAntes)
                    : DeserializarSnap(row.SnapshotDespues);

                if (snap == null) return null;

                string b64;
                if (extraIndex >= 0)
                {
                    var extras = snap.ImagenesExtra ?? new List<string>();
                    if (extraIndex >= extras.Count) return null;
                    b64 = extras[extraIndex];
                }
                else
                {
                    b64 = snap.Imagen;
                }

                return DecodificarImagen(b64);
            }
        }

        public static VMProductoCambioResultado Aceptar(int idSolicitud, int idAdmin, string comentario)
        {
            try
            {
                return AceptarInterno(idSolicitud, idAdmin, comentario);
            }
            catch (Exception)
            {
                return Fail("No se pudo aceptar la solicitud. Intentá de nuevo.");
            }
        }

        private static VMProductoCambioResultado AceptarInterno(int idSolicitud, int idAdmin, string comentario)
        {
            AsegurarEsquema();
            using (var db = new Sistema_DavidEntities())
            {
                var row = db.Database.SqlQuery<SnapRow>(@"
SELECT SnapshotAntes, SnapshotDespues, Tipo, IdProducto, NombreProducto, DiffJson, Estado, IdUsuarioSolicita
FROM dbo.Productos_Solicitudes WHERE Id = @p0", idSolicitud).FirstOrDefault();

                if (row == null) return Fail("No se encontró la solicitud.");
                if (!string.Equals(row.Estado, "Pendiente", StringComparison.OrdinalIgnoreCase))
                    return Fail("La solicitud ya no está pendiente.");

                var despues = DeserializarSnap(row.SnapshotDespues);
                var ok = AplicarSnapshot(row.Tipo, row.IdProducto, despues);
                if (!ok.Status) return ok;

                var idProd = ok.IdSolicitud ?? row.IdProducto;
                db.Database.ExecuteSqlCommand(@"
UPDATE dbo.Productos_Solicitudes
SET Estado = N'Aceptado', IdUsuarioResuelve = @p0, FechaResolucion = GETDATE(), Comentario = @p1, IdProducto = COALESCE(@p2, IdProducto)
WHERE Id = @p3",
                    idAdmin, (object)comentario ?? "", (object)idProd ?? DBNull.Value, idSolicitud);

                InsertarHistorial(db, idProd, idSolicitud, idAdmin, row.Tipo, row.NombreProducto,
                    ArmarResumen("Aceptado · " + row.Tipo, row.NombreProducto, ParseDiffs(row.DiffJson)),
                    row.DiffJson, OrigenAceptadoAdmin, "Aceptado", comentario,
                    row.IdUsuarioSolicita, idAdmin);

                return new VMProductoCambioResultado
                {
                    Status = true,
                    Mensaje = "Cambios aplicados al producto."
                };
            }
        }

        public static VMProductoCambioResultado Rechazar(int idSolicitud, int idAdmin, string comentario)
        {
            try
            {
                return RechazarInterno(idSolicitud, idAdmin, comentario);
            }
            catch (Exception)
            {
                return Fail("No se pudo rechazar la solicitud. Intentá de nuevo.");
            }
        }

        private static VMProductoCambioResultado RechazarInterno(int idSolicitud, int idAdmin, string comentario)
        {
            AsegurarEsquema();
            using (var db = new Sistema_DavidEntities())
            {
                var row = db.Database.SqlQuery<SnapRow>(@"
SELECT SnapshotAntes, SnapshotDespues, Tipo, IdProducto, NombreProducto, DiffJson, Estado, IdUsuarioSolicita
FROM dbo.Productos_Solicitudes WHERE Id = @p0", idSolicitud).FirstOrDefault();

                if (row == null) return Fail("No se encontró la solicitud.");
                if (!string.Equals(row.Estado, "Pendiente", StringComparison.OrdinalIgnoreCase))
                    return Fail("La solicitud ya no está pendiente.");

                db.Database.ExecuteSqlCommand(@"
UPDATE dbo.Productos_Solicitudes
SET Estado = N'Rechazado', IdUsuarioResuelve = @p0, FechaResolucion = GETDATE(), Comentario = @p1
WHERE Id = @p2",
                    idAdmin, (object)comentario ?? "", idSolicitud);

                InsertarHistorial(db, row.IdProducto, idSolicitud, idAdmin, row.Tipo, row.NombreProducto,
                    ArmarResumen("Rechazado · " + row.Tipo, row.NombreProducto, ParseDiffs(row.DiffJson)),
                    row.DiffJson, OrigenRechazadoAdmin, "Rechazado", comentario,
                    row.IdUsuarioSolicita, idAdmin);

                return new VMProductoCambioResultado
                {
                    Status = true,
                    Mensaje = "Solicitud rechazada. El producto no se modificó."
                };
            }
        }

        public static VMProductoCambioResultado AceptarVarios(List<int> ids, int idAdmin, string comentario)
        {
            return ResolverVarios(ids, idAdmin, comentario, true);
        }

        public static VMProductoCambioResultado RechazarVarios(List<int> ids, int idAdmin, string comentario)
        {
            return ResolverVarios(ids, idAdmin, comentario, false);
        }

        private static VMProductoCambioResultado ResolverVarios(List<int> ids, int idAdmin, string comentario, bool aceptar)
        {
            if (ids == null || ids.Count == 0)
                return Fail("No hay solicitudes seleccionadas.");

            var unicos = ids.Where(x => x > 0).Distinct().ToList();
            if (unicos.Count == 0)
                return Fail("No hay solicitudes seleccionadas.");

            int ok = 0;
            string primerError = null;
            foreach (var id in unicos)
            {
                var r = aceptar ? Aceptar(id, idAdmin, comentario) : Rechazar(id, idAdmin, comentario);
                if (r != null && r.Status)
                    ok++;
                else if (primerError == null)
                    primerError = (r != null && !string.IsNullOrWhiteSpace(r.Mensaje)) ? r.Mensaje : null;
            }

            if (ok == 0)
                return Fail(primerError ?? (aceptar ? "No se pudieron aceptar las solicitudes." : "No se pudieron rechazar las solicitudes."));

            var verbo = aceptar ? "aceptada" : "rechazada";
            string msg;
            if (ok == unicos.Count)
                msg = ok == 1 ? ("Solicitud " + verbo + ".") : (ok + " solicitudes " + verbo + "s.");
            else
                msg = ok + " " + (aceptar ? "aceptadas" : "rechazadas") + ". Algunas no se pudieron resolver.";

            return new VMProductoCambioResultado { Status = true, Mensaje = msg };
        }

        private static VMProductoCambioResultado AplicarSnapshot(string tipo, int? idProducto, VMProductoSnapshot despues)
        {
            tipo = tipo ?? "";
            if (tipo.Equals("Nuevo", StringComparison.OrdinalIgnoreCase))
            {
                var model = AProducto(despues);
                if (model == null) return Fail("No hay datos para crear el producto.");
                model.Id = 0;
                var ok = ProductosModel.Nuevo(model);
                if (!ok) return Fail("No se pudo crear el producto.");

                int nuevoId = 0;
                using (var db = new Sistema_DavidEntities())
                {
                    nuevoId = db.Database.SqlQuery<int>(
                        "SELECT TOP 1 Id FROM dbo.Productos WHERE Nombre = @p0 ORDER BY Id DESC",
                        model.Nombre).FirstOrDefault();
                }

                return new VMProductoCambioResultado { Status = true, IdSolicitud = nuevoId };
            }

            if (tipo.Equals("Editar", StringComparison.OrdinalIgnoreCase))
            {
                var model = AProducto(despues);
                if (model == null || !idProducto.HasValue) return Fail("Datos de edición inválidos.");
                model.Id = idProducto.Value;
                var ok = ProductosModel.Editar(model);
                return ok
                    ? new VMProductoCambioResultado { Status = true, IdSolicitud = model.Id }
                    : Fail("No se pudo aplicar la edición.");
            }

            if (tipo.Equals("Eliminar", StringComparison.OrdinalIgnoreCase))
            {
                if (!idProducto.HasValue) return Fail("Producto inválido.");
                var stock = StockModel.ObtenerUsuariosConProductoEnStock(idProducto.Value);
                if (stock != null && stock.Any())
                    return Fail("Ya no se puede eliminar: hay stock en vendedores.");
                var ok = ProductosModel.Eliminar(idProducto.Value);
                return ok
                    ? new VMProductoCambioResultado { Status = true, IdSolicitud = idProducto }
                    : Fail("No se pudo eliminar.");
            }

            if (tipo.Equals("Activo", StringComparison.OrdinalIgnoreCase))
            {
                if (!idProducto.HasValue || despues == null) return Fail("Datos inválidos.");
                var ok = ProductosModel.EditarActivo(idProducto.Value, despues.Activo);
                return ok
                    ? new VMProductoCambioResultado { Status = true, IdSolicitud = idProducto }
                    : Fail("No se pudo cambiar el estado.");
            }

            if (tipo.Equals("Stock", StringComparison.OrdinalIgnoreCase))
            {
                if (!idProducto.HasValue || despues == null) return Fail("Datos inválidos.");
                var okStock = ProductosModel.SetStock(idProducto.Value, despues.Stock);
                return okStock
                    ? new VMProductoCambioResultado { Status = true, IdSolicitud = idProducto }
                    : Fail("No se pudo actualizar el stock.");
            }

            return Fail("Tipo de operación desconocido.");
        }

        public static void RegistrarCambioDirecto(string tipo, VMProducto antes, VMProducto despues, int idUsuario, string comentario = null)
        {
            try
            {
                AsegurarEsquema();
                var sa = DesdeProducto(antes);
                var sd = DesdeProducto(despues);
                var diffs = CalcularDiff(sa, sd, tipo);
                var nombre = despues?.Nombre ?? antes?.Nombre ?? "";
                var idProd = (despues != null && despues.Id > 0) ? (int?)despues.Id : (antes != null && antes.Id > 0 ? (int?)antes.Id : null);

                using (var db = new Sistema_DavidEntities())
                {
                    int? idSolicitud = null;
                    int? idSolicita = null;
                    if (idProd.HasValue && idProd.Value > 0)
                    {
                        var pend = db.Database.SqlQuery<VMPendienteReemplazo>(@"
SELECT TOP 1 Id, IdUsuarioSolicita
FROM dbo.Productos_Solicitudes
WHERE IdProducto = @p0 AND Estado = N'Pendiente'
ORDER BY Id DESC", idProd.Value).FirstOrDefault();
                        if (pend != null && pend.Id > 0)
                        {
                            idSolicitud = pend.Id;
                            idSolicita = pend.IdUsuarioSolicita;
                            CancelarPendientesProducto(db, idProd.Value,
                                comentario ?? "Reemplazada por cambio directo del administrador",
                                idUsuario);
                        }
                    }

                    InsertarHistorial(db, idProd, idSolicitud, idUsuario, tipo, nombre,
                        ArmarResumen(tipo, nombre, diffs),
                        JsonConvert.SerializeObject(diffs, JsonCfg),
                        OrigenAdmin, "Aplicado", comentario,
                        idSolicita, idUsuario);
                }
            }
            catch
            {
                // auditoría no debe romper el alta/edición
            }
        }

        public static List<VMProductoHistorial> ListarHistorial(int? idProducto, DateTime? desde, DateTime? hasta)
        {
            AsegurarEsquema();
            using (var db = new Sistema_DavidEntities())
            {
                var sql = new StringBuilder(SqlSelectHistorial() + " WHERE 1 = 1 ");

                var args = new List<object>();
                var i = 0;

                if (idProducto.HasValue && idProducto.Value > 0)
                {
                    sql.Append(" AND h.IdProducto = @p").Append(i).Append(" ");
                    args.Add(idProducto.Value);
                    i++;
                }

                if (desde.HasValue)
                {
                    sql.Append(" AND h.Fecha >= @p").Append(i).Append(" ");
                    args.Add(desde.Value.Date);
                    i++;
                }

                if (hasta.HasValue)
                {
                    sql.Append(" AND h.Fecha < @p").Append(i).Append(" ");
                    args.Add(hasta.Value.Date.AddDays(1));
                    i++;
                }

                sql.Append(" ORDER BY h.Fecha DESC");

                var rows = args.Count == 0
                    ? db.Database.SqlQuery<VMProductoHistorial>(sql.ToString()).ToList()
                    : db.Database.SqlQuery<VMProductoHistorial>(sql.ToString(), args.ToArray()).ToList();

                foreach (var row in rows)
                    CompletarHistorial(row);

                return rows;
            }
        }

        public static VMProductoHistorial ObtenerHistorial(int id)
        {
            AsegurarEsquema();
            using (var db = new Sistema_DavidEntities())
            {
                var row = db.Database.SqlQuery<VMProductoHistorial>(
                    SqlSelectHistorial() + " WHERE h.Id = @p0", id).FirstOrDefault();

                if (row != null)
                    CompletarHistorial(row);
                return row;
            }
        }

        private static string SqlSelectHistorial()
        {
            return @"
SELECT h.Id, h.IdProducto, h.IdSolicitud, h.Fecha, h.IdUsuario,
       COALESCE(h.IdUsuarioSolicita, s.IdUsuarioSolicita) AS IdUsuarioSolicita,
       " + SqlNombreUsuario("us") + @" AS UsuarioSolicitud,
       COALESCE(h.IdUsuarioResuelve, s.IdUsuarioResuelve, CASE WHEN s.Id IS NOT NULL THEN h.IdUsuario END) AS IdUsuarioResuelve,
       " + SqlNombreUsuario("ur") + @" AS UsuarioResolucion,
       COALESCE(NULLIF(" + SqlNombreUsuario("ur") + @", N''), NULLIF(" + SqlNombreUsuario("us") + @", N''), " + SqlNombreUsuario("u") + @") AS UsuarioNombre,
       h.Tipo, h.NombreProducto, h.Resumen, h.DiffJson, h.Origen, h.EstadoResultado, h.Comentario
FROM dbo.Productos_Historial h
LEFT JOIN dbo.Productos_Solicitudes s ON s.Id = h.IdSolicitud
LEFT JOIN dbo.Usuarios u ON u.Id = h.IdUsuario
LEFT JOIN dbo.Usuarios us ON us.Id = COALESCE(h.IdUsuarioSolicita, s.IdUsuarioSolicita)
LEFT JOIN dbo.Usuarios ur ON ur.Id = COALESCE(h.IdUsuarioResuelve, s.IdUsuarioResuelve, CASE WHEN s.Id IS NOT NULL THEN h.IdUsuario END)";
        }

        private static void CompletarHistorial(VMProductoHistorial row)
        {
            if (row == null) return;
            row.Cambios = ParseDiffs(row.DiffJson);
            row.UsuarioSolicitud = LimpiarNombre(row.UsuarioSolicitud);
            row.UsuarioResolucion = LimpiarNombre(row.UsuarioResolucion);
            row.UsuarioNombre = LimpiarNombre(row.UsuarioNombre);
            if (string.IsNullOrWhiteSpace(row.UsuarioResolucion)
                && !string.IsNullOrWhiteSpace(row.UsuarioNombre)
                && !string.Equals(row.UsuarioNombre, row.UsuarioSolicitud, StringComparison.OrdinalIgnoreCase))
            {
                row.UsuarioResolucion = row.UsuarioNombre;
            }
            row.Origen = TextoOrigen(row.Origen, row.EstadoResultado, row.IdSolicitud);
        }

        private static string LimpiarNombre(string nombre)
        {
            if (string.IsNullOrWhiteSpace(nombre)) return "";
            var t = nombre.Trim();
            t = System.Text.RegularExpressions.Regex.Replace(t, @"\s+\d+$", "");
            return t.Trim();
        }

        private static string TextoOrigen(string origen, string estado, int? idSolicitud)
        {
            var o = (origen ?? "").Trim();
            if (o.Equals("ComprobanteAprobado", StringComparison.OrdinalIgnoreCase)
                || o.Equals("Aceptado por administrador", StringComparison.OrdinalIgnoreCase))
                return OrigenAceptadoAdmin;
            if (o.Equals("ComprobanteRechazado", StringComparison.OrdinalIgnoreCase)
                || o.Equals("Rechazado por administrador", StringComparison.OrdinalIgnoreCase))
                return OrigenRechazadoAdmin;
            if (o.Equals("AdminDirecto", StringComparison.OrdinalIgnoreCase)
                || o.Equals("Administrador", StringComparison.OrdinalIgnoreCase))
                return OrigenAdmin;
            if (o.Equals("Comprobantes", StringComparison.OrdinalIgnoreCase))
                return "Comprobantes";
            if (!string.IsNullOrEmpty(o) && o.IndexOf(" ", StringComparison.Ordinal) >= 0)
                return o;
            if (string.Equals(estado, "Aceptado", StringComparison.OrdinalIgnoreCase))
                return OrigenAceptadoAdmin;
            if (string.Equals(estado, "Rechazado", StringComparison.OrdinalIgnoreCase))
                return OrigenRechazadoAdmin;
            if (idSolicitud.HasValue && idSolicitud.Value > 0)
                return "Comprobantes";
            return string.IsNullOrEmpty(o) ? OrigenAdmin : o;
        }

        private static void InsertarHistorial(
            Sistema_DavidEntities db,
            int? idProducto,
            int? idSolicitud,
            int idUsuario,
            string tipo,
            string nombre,
            string resumen,
            string diffJson,
            string origen,
            string estado,
            string comentario,
            int? idUsuarioSolicita = null,
            int? idUsuarioResuelve = null)
        {
            var resuelve = idUsuarioResuelve ?? idUsuario;
            db.Database.ExecuteSqlCommand(@"
INSERT INTO dbo.Productos_Historial
    (IdProducto, IdSolicitud, Fecha, IdUsuario, IdUsuarioSolicita, IdUsuarioResuelve, Tipo, NombreProducto, Resumen, DiffJson, Origen, EstadoResultado, Comentario)
VALUES
    (@p0, @p1, GETDATE(), @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11)",
                (object)idProducto ?? DBNull.Value,
                (object)idSolicitud ?? DBNull.Value,
                idUsuario,
                (object)idUsuarioSolicita ?? DBNull.Value,
                (object)resuelve,
                (object)tipo ?? "",
                (object)nombre ?? "",
                (object)resumen ?? "",
                (object)diffJson ?? "",
                (object)origen ?? "",
                (object)estado ?? "",
                (object)comentario ?? "");
        }

        private static List<VMProductoDiffCampo> ParseDiffs(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<VMProductoDiffCampo>();
            try
            {
                return JsonConvert.DeserializeObject<List<VMProductoDiffCampo>>(json) ?? new List<VMProductoDiffCampo>();
            }
            catch
            {
                return new List<VMProductoDiffCampo>();
            }
        }

        private static VMProductoSnapshot DeserializarSnap(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try
            {
                return JsonConvert.DeserializeObject<VMProductoSnapshot>(json);
            }
            catch
            {
                return null;
            }
        }

        private static byte[] DecodificarImagen(string base64)
        {
            if (string.IsNullOrWhiteSpace(base64)) return null;
            var limpia = base64;
            var coma = limpia.IndexOf(',');
            if (coma >= 0) limpia = limpia.Substring(coma + 1);
            try
            {
                return Convert.FromBase64String(limpia);
            }
            catch
            {
                return null;
            }
        }

        private static VMProductoCambioResultado Fail(string msg)
        {
            return new VMProductoCambioResultado { Status = false, Mensaje = msg };
        }
    }
}
