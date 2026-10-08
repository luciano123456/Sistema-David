using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Threading;
using System.Web;
using System.Web.Hosting;

namespace Sistema_David.Models
{
    /// <summary>
    /// Imágenes y documentos del cliente en disco.
    /// La base solo guarda el índice. Las fotos se achican a JPEG antes de guardarse.
    /// </summary>
    public static class ClientesAdjuntosModel
    {
        private const int MaxLadoPx = 1600;
        private const long CalidadJpeg = 72L;
        private const int MaxBytesEntrada = 20 * 1024 * 1024;
        private static readonly object TablaLock = new object();
        private static bool _tablaLista;

        // Conjunto de clientes con imagen visible. Las listas solo hacen Contains.
        // Un fallo o una tabla inexistente deja el conjunto vacío y no corta el JSON.
        private const int CacheImagenesSegundos = 45;
        private static readonly object CacheImagenesLock = new object();
        private static readonly HashSet<int> IdsImagenesVacio = new HashSet<int>();
        private static volatile CacheIdsImagenes _cacheIdsImagenes;
        private static int _cacheIdsImagenesGen;

        private sealed class CacheIdsImagenes
        {
            public readonly HashSet<int> Ids;
            public readonly long HastaUtcTicks;

            public CacheIdsImagenes(HashSet<int> ids, long hastaUtcTicks)
            {
                Ids = ids;
                HastaUtcTicks = hastaUtcTicks;
            }
        }

        private class AdjuntoRow
        {
            public int Id { get; set; }
            public int IdCliente { get; set; }
            public string NombreOriginal { get; set; }
            public string NombreArchivo { get; set; }
            public string Extension { get; set; }
            public string ContentType { get; set; }
            public int TamanoBytes { get; set; }
            public DateTime Fecha { get; set; }
        }

        public static string CarpetaRaiz()
        {
            var raiz = HostingEnvironment.MapPath("~/App_Data/ClientesAdjuntos");
            if (string.IsNullOrWhiteSpace(raiz))
                raiz = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "App_Data", "ClientesAdjuntos");
            return raiz;
        }

        public static List<VMClienteAdjunto> Listar(int idCliente)
        {
            if (idCliente <= 0)
                return new List<VMClienteAdjunto>();

            using (var db = new Sistema_DavidEntities())
            {
                AsegurarTabla(db);
                var rows = db.Database.SqlQuery<AdjuntoRow>(@"
                    SELECT Id, IdCliente, NombreOriginal, NombreArchivo, Extension, ContentType, TamanoBytes, Fecha
                    FROM dbo.Clientes_Adjuntos
                    WHERE IdCliente = @p0
                    ORDER BY Fecha DESC, Id DESC", idCliente).ToList();

                return rows.Select(Mapa).ToList();
            }
        }

        public static HashSet<int> IdsConImagenes(IEnumerable<int> ids)
        {
            if (!HayAlgunId(ids))
                return IdsImagenesVacio;

            try
            {
                return LeerCacheIdsConImagenes();
            }
            catch
            {
                return IdsImagenesVacio;
            }
        }

        private static bool HayAlgunId(IEnumerable<int> ids)
        {
            if (ids == null)
                return false;

            foreach (var id in ids)
            {
                if (id > 0)
                    return true;
            }

            return false;
        }

        private static HashSet<int> LeerCacheIdsConImagenes()
        {
            var snap = _cacheIdsImagenes;
            if (snap != null && DateTime.UtcNow.Ticks < snap.HastaUtcTicks)
                return snap.Ids;

            lock (CacheImagenesLock)
            {
                snap = _cacheIdsImagenes;
                if (snap != null && DateTime.UtcNow.Ticks < snap.HastaUtcTicks)
                    return snap.Ids;

                var gen = Volatile.Read(ref _cacheIdsImagenesGen);
                var cargados = CargarIdsConImagenes();
                if (Volatile.Read(ref _cacheIdsImagenesGen) != gen)
                    return cargados;

                _cacheIdsImagenes = new CacheIdsImagenes(
                    cargados,
                    DateTime.UtcNow.AddSeconds(CacheImagenesSegundos).Ticks);
                return cargados;
            }
        }

        private static HashSet<int> CargarIdsConImagenes()
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    db.Database.CommandTimeout = 4;
                    var rows = db.Database.SqlQuery<int>(@"
                        SELECT DISTINCT IdCliente
                        FROM dbo.Clientes_Adjuntos
                        WHERE ContentType LIKE 'image/%'
                          AND LOWER(ISNULL(Extension, '')) NOT IN ('.heic', '.heif', '.tif', '.tiff')").ToList();
                    return rows.Count == 0 ? IdsImagenesVacio : new HashSet<int>(rows);
                }
            }
            catch
            {
                return IdsImagenesVacio;
            }
        }

        private static void InvalidarCacheImagenes()
        {
            Interlocked.Increment(ref _cacheIdsImagenesGen);
            _cacheIdsImagenes = null;
        }

        public static VMClienteAdjuntosResultado Guardar(int idCliente, HttpFileCollectionBase archivos, int idUsuario)
        {
            var resultado = new VMClienteAdjuntosResultado
            {
                Items = new List<VMClienteAdjunto>()
            };

            if (idCliente <= 0)
            {
                resultado.Mensaje = "Primero tenés que guardar el cliente.";
                return resultado;
            }

            if (archivos == null || archivos.Count == 0)
            {
                resultado.Mensaje = "No hay archivos para adjuntar.";
                return resultado;
            }

            using (var db = new Sistema_DavidEntities())
            {
                try
                {
                    AsegurarTabla(db);
                }
                catch (Exception ex)
                {
                    resultado.Mensaje = MensajeTabla(ex);
                    return resultado;
                }

                var existe = db.Database.SqlQuery<int>(
                    "SELECT COUNT(1) FROM dbo.Clientes WHERE Id = @p0", idCliente).FirstOrDefault();
                if (existe == 0)
                {
                    resultado.Mensaje = "No se encontró el cliente.";
                    return resultado;
                }

                var carpeta = Path.Combine(CarpetaRaiz(), idCliente.ToString());
                try
                {
                    Directory.CreateDirectory(carpeta);
                }
                catch (Exception ex)
                {
                    resultado.Mensaje = MensajeCarpeta(ex);
                    return resultado;
                }

                var errores = new List<string>();

                for (int i = 0; i < archivos.Count; i++)
                {
                    var archivo = archivos[i];
                    if (archivo == null || archivo.ContentLength <= 0)
                        continue;

                    var nombreOriginal = Path.GetFileName(archivo.FileName ?? "archivo");
                    if (string.IsNullOrWhiteSpace(nombreOriginal))
                        nombreOriginal = "archivo";

                    string rutaEscrita = null;
                    try
                    {
                        if (archivo.ContentLength > MaxBytesEntrada)
                        {
                            errores.Add(nombreOriginal + " supera los 20 MB.");
                            continue;
                        }

                        byte[] bytes;
                        string extension;
                        string contentType;
                        using (var entrada = archivo.InputStream)
                        {
                            if (!PrepararArchivo(entrada, nombreOriginal, out bytes, out extension, out contentType))
                            {
                                errores.Add(nombreOriginal + " no es una imagen o un PDF válido.");
                                continue;
                            }
                        }

                        var nombreArchivo = Guid.NewGuid().ToString("N") + extension;
                        var ruta = Path.Combine(carpeta, nombreArchivo);
                        File.WriteAllBytes(ruta, bytes);
                        rutaEscrita = ruta;

                        db.Database.ExecuteSqlCommand(@"
                            INSERT INTO dbo.Clientes_Adjuntos
                                (IdCliente, NombreOriginal, NombreArchivo, Extension, ContentType, TamanoBytes, Fecha, IdUsuario)
                            VALUES
                                (@p0, @p1, @p2, @p3, @p4, @p5, @p6, NULLIF(@p7, 0))",
                            idCliente,
                            Cortar(nombreOriginal, 260),
                            nombreArchivo,
                            extension,
                            contentType,
                            bytes.Length,
                            DateTime.Now,
                            idUsuario);

                        var id = db.Database.SqlQuery<int>(
                            "SELECT Id FROM dbo.Clientes_Adjuntos WHERE NombreArchivo = @p0",
                            nombreArchivo).FirstOrDefault();

                        if (id <= 0)
                            throw new InvalidOperationException("La imagen se guardó en disco pero no quedó registrada.");

                        resultado.Items.Add(new VMClienteAdjunto
                        {
                            Id = id,
                            Nombre = nombreOriginal,
                            Extension = extension,
                            TamanoBytes = bytes.Length,
                            Fecha = DateTime.Now.ToString("dd/MM/yyyy HH:mm"),
                            EsImagen = EsImagenVisible(contentType, extension),
                            Url = "/Clientes/VerAdjunto?id=" + id
                        });
                    }
                    catch (Exception ex)
                    {
                        if (!string.IsNullOrEmpty(rutaEscrita))
                            BorrarArchivo(idCliente, Path.GetFileName(rutaEscrita));
                        errores.Add(EsAccesoDenegado(ex)
                            ? "El servidor no tiene permiso para guardar " + nombreOriginal + "."
                            : "No se pudo guardar " + nombreOriginal + ". " + ex.Message);
                    }
                }

                if (resultado.Items.Count == 0)
                {
                    resultado.Ok = false;
                    resultado.Mensaje = errores.Count > 0
                        ? string.Join(" ", errores)
                        : "No se pudo adjuntar ningún archivo.";
                    return resultado;
                }

                InvalidarCacheImagenes();
                resultado.Ok = true;
                resultado.Mensaje = errores.Count > 0
                    ? "Se guardaron " + resultado.Items.Count + " archivo(s). " + string.Join(" ", errores)
                    : "Imágenes guardadas.";
                return resultado;
            }
        }

        public static bool Eliminar(int id)
        {
            if (id <= 0)
                return false;

            using (var db = new Sistema_DavidEntities())
            {
                AsegurarTabla(db);
                var row = db.Database.SqlQuery<AdjuntoRow>(@"
                    SELECT Id, IdCliente, NombreOriginal, NombreArchivo, Extension, ContentType, TamanoBytes, Fecha
                    FROM dbo.Clientes_Adjuntos WHERE Id = @p0", id).FirstOrDefault();

                if (row == null)
                    return false;

                db.Database.ExecuteSqlCommand("DELETE FROM dbo.Clientes_Adjuntos WHERE Id = @p0", id);
                BorrarArchivo(row.IdCliente, row.NombreArchivo);
                InvalidarCacheImagenes();
                return true;
            }
        }

        public static void EliminarDeCliente(Sistema_DavidEntities db, int idCliente)
        {
            if (db == null || idCliente <= 0)
                return;

            try
            {
                AsegurarTabla(db);
                var archivos = db.Database.SqlQuery<string>(
                    "SELECT NombreArchivo FROM dbo.Clientes_Adjuntos WHERE IdCliente = @p0", idCliente).ToList();

                var borrados = db.Database.ExecuteSqlCommand(
                    "DELETE FROM dbo.Clientes_Adjuntos WHERE IdCliente = @p0", idCliente);
                if (borrados > 0)
                    InvalidarCacheImagenes();

                foreach (var nombre in archivos)
                    BorrarArchivo(idCliente, nombre);

                var carpeta = Path.Combine(CarpetaRaiz(), idCliente.ToString());
                if (Directory.Exists(carpeta) && !Directory.EnumerateFileSystemEntries(carpeta).Any())
                    Directory.Delete(carpeta);
            }
            catch
            {
            }
        }

        public static bool TryAbrir(int id, out string ruta, out string contentType, out string nombreDescarga)
        {
            ruta = null;
            contentType = "application/octet-stream";
            nombreDescarga = "archivo";

            if (id <= 0)
                return false;

            using (var db = new Sistema_DavidEntities())
            {
                AsegurarTabla(db);
                var row = db.Database.SqlQuery<AdjuntoRow>(@"
                    SELECT Id, IdCliente, NombreOriginal, NombreArchivo, Extension, ContentType, TamanoBytes, Fecha
                    FROM dbo.Clientes_Adjuntos WHERE Id = @p0", id).FirstOrDefault();

                if (row == null || string.IsNullOrWhiteSpace(row.NombreArchivo))
                    return false;

                var raiz = Path.GetFullPath(CarpetaRaiz());
                var archivo = Path.GetFullPath(Path.Combine(raiz, row.IdCliente.ToString(), row.NombreArchivo));
                if (!archivo.StartsWith(raiz, StringComparison.OrdinalIgnoreCase) || !File.Exists(archivo))
                    return false;

                ruta = archivo;
                contentType = string.IsNullOrWhiteSpace(row.ContentType) ? contentType : row.ContentType;
                nombreDescarga = string.IsNullOrWhiteSpace(row.NombreOriginal) ? row.NombreArchivo : row.NombreOriginal;
                return true;
            }
        }

        private static VMClienteAdjunto Mapa(AdjuntoRow row)
        {
            var content = row.ContentType ?? "";
            return new VMClienteAdjunto
            {
                Id = row.Id,
                Nombre = row.NombreOriginal,
                Extension = row.Extension,
                TamanoBytes = row.TamanoBytes,
                Fecha = row.Fecha.ToString("dd/MM/yyyy HH:mm"),
                EsImagen = EsImagenVisible(content, row.Extension),
                Url = "/Clientes/VerAdjunto?id=" + row.Id
            };
        }

        private static void BorrarArchivo(int idCliente, string nombreArchivo)
        {
            try
            {
                if (idCliente <= 0 || string.IsNullOrWhiteSpace(nombreArchivo))
                    return;
                if (nombreArchivo.IndexOfAny(new[] { '/', '\\', ':' }) >= 0)
                    return;

                var ruta = Path.Combine(CarpetaRaiz(), idCliente.ToString(), nombreArchivo);
                if (File.Exists(ruta))
                    File.Delete(ruta);
            }
            catch
            {
            }
        }

        private static bool PrepararArchivo(Stream entrada, string nombreOriginal, out byte[] bytes, out string extension, out string contentType)
        {
            bytes = null;
            extension = null;
            contentType = null;

            var ext = (Path.GetExtension(nombreOriginal) ?? "").ToLowerInvariant();
            byte[] crudo;
            using (var ms = new MemoryStream())
            {
                entrada.CopyTo(ms);
                crudo = ms.ToArray();
            }

            if (crudo.Length == 0)
                return false;

            if (EsPdf(crudo, ext))
            {
                bytes = crudo;
                extension = ".pdf";
                contentType = "application/pdf";
                return true;
            }

            if (!EsExtensionImagen(ext) && !PareceImagen(crudo))
                return false;

            try
            {
                using (var ms = new MemoryStream(crudo))
                using (var img = Image.FromStream(ms))
                {
                    CorregirOrientacion(img);
                    bytes = Comprimir(img);
                    extension = ".jpg";
                    contentType = "image/jpeg";
                    return true;
                }
            }
            catch
            {
                if (!EsExtensionImagen(ext))
                    return false;

                bytes = crudo;
                extension = ext == ".jpeg" ? ".jpg" : ext;
                contentType = ContentTypeDe(extension);
                return true;
            }
        }

        private static byte[] Comprimir(Image img)
        {
            int ancho = img.Width;
            int alto = img.Height;
            var lado = Math.Max(ancho, alto);
            if (lado > MaxLadoPx)
            {
                var escala = (double)MaxLadoPx / lado;
                ancho = Math.Max(1, (int)Math.Round(ancho * escala));
                alto = Math.Max(1, (int)Math.Round(alto * escala));
            }

            using (var bmp = new Bitmap(ancho, alto))
            using (var g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.White);
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.SmoothingMode = SmoothingMode.HighQuality;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.DrawImage(img, 0, 0, ancho, alto);

                var codec = ImageCodecInfo.GetImageEncoders()
                    .First(c => c.MimeType == "image/jpeg");
                using (var ep = new EncoderParameters(1))
                {
                    ep.Param[0] = new EncoderParameter(Encoder.Quality, CalidadJpeg);
                    using (var salida = new MemoryStream())
                    {
                        bmp.Save(salida, codec, ep);
                        return salida.ToArray();
                    }
                }
            }
        }

        private static void CorregirOrientacion(Image img)
        {
            const int exif = 0x0112;
            if (img.PropertyIdList == null || Array.IndexOf(img.PropertyIdList, exif) < 0)
                return;

            var valor = img.GetPropertyItem(exif).Value;
            if (valor == null || valor.Length == 0)
                return;

            switch (valor[0])
            {
                case 3:
                    img.RotateFlip(RotateFlipType.Rotate180FlipNone);
                    break;
                case 6:
                    img.RotateFlip(RotateFlipType.Rotate90FlipNone);
                    break;
                case 8:
                    img.RotateFlip(RotateFlipType.Rotate270FlipNone);
                    break;
            }
        }

        private static bool EsPdf(byte[] data, string ext)
        {
            if (ext != ".pdf" && ext != "")
                return false;
            return data.Length > 4
                && data[0] == (byte)'%'
                && data[1] == (byte)'P'
                && data[2] == (byte)'D'
                && data[3] == (byte)'F';
        }

        private static bool EsExtensionImagen(string ext)
        {
            switch (ext)
            {
                case ".jpg":
                case ".jpeg":
                case ".png":
                case ".gif":
                case ".bmp":
                case ".webp":
                case ".heic":
                case ".heif":
                case ".tif":
                case ".tiff":
                    return true;
                default:
                    return false;
            }
        }

        private static bool PareceImagen(byte[] data)
        {
            if (data.Length < 4)
                return false;
            if (data[0] == 0xFF && data[1] == 0xD8)
                return true;
            if (data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47)
                return true;
            if (data[0] == 0x47 && data[1] == 0x49 && data[2] == 0x46)
                return true;
            if (data[0] == 0x42 && data[1] == 0x4D)
                return true;
            return false;
        }

        private static bool EsImagenVisible(string contentType, string extension)
        {
            var ext = (extension ?? "").ToLowerInvariant();
            if (ext == ".heic" || ext == ".heif" || ext == ".tif" || ext == ".tiff")
                return false;
            return (contentType ?? "").StartsWith("image/", StringComparison.OrdinalIgnoreCase);
        }

        private static string ContentTypeDe(string extension)
        {
            switch (extension)
            {
                case ".png": return "image/png";
                case ".gif": return "image/gif";
                case ".bmp": return "image/bmp";
                case ".webp": return "image/webp";
                case ".heic":
                case ".heif": return "image/heic";
                case ".pdf": return "application/pdf";
                default: return "application/octet-stream";
            }
        }

        private static string Cortar(string texto, int max)
        {
            if (string.IsNullOrEmpty(texto) || texto.Length <= max)
                return texto;
            return texto.Substring(0, max);
        }

        private static string MensajeTabla(Exception ex)
        {
            var msg = ex.GetBaseException().Message ?? "";
            if (msg.IndexOf("permission", StringComparison.OrdinalIgnoreCase) >= 0
                || msg.IndexOf("permiso", StringComparison.OrdinalIgnoreCase) >= 0
                || msg.IndexOf("CREATE TABLE", StringComparison.OrdinalIgnoreCase) >= 0)
                return "El usuario de la base no puede crear la tabla de imágenes. En el servidor hay que ejecutar el script 006_Clientes_Adjuntos.";

            return "No se pudo usar la tabla de imágenes. En el servidor hay que ejecutar el script 006_Clientes_Adjuntos.";
        }

        private static bool EsAccesoDenegado(Exception ex)
        {
            var msg = ex.GetBaseException().Message ?? "";
            return ex is UnauthorizedAccessException
                || msg.IndexOf("denied", StringComparison.OrdinalIgnoreCase) >= 0
                || msg.IndexOf("acceso", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static string MensajeCarpeta(Exception ex)
        {
            if (EsAccesoDenegado(ex))
                return "El servidor no tiene permiso para guardar las imágenes. En la carpeta del sitio, App_Data\\ClientesAdjuntos, hay que dar permiso de modificación al usuario del sitio.";

            return "No se pudo crear la carpeta de imágenes en el servidor.";
        }

        private static void AsegurarTabla(Sistema_DavidEntities db)
        {
            if (_tablaLista)
                return;

            lock (TablaLock)
            {
                if (_tablaLista)
                    return;

                var existe = db.Database.SqlQuery<int>(
                    "SELECT CASE WHEN OBJECT_ID(N'dbo.Clientes_Adjuntos', N'U') IS NULL THEN 0 ELSE 1 END").FirstOrDefault();

                if (existe == 0)
                {
                    db.Database.ExecuteSqlCommand(@"
CREATE TABLE dbo.Clientes_Adjuntos
(
    Id              INT IDENTITY(1,1) NOT NULL,
    IdCliente       INT NOT NULL,
    NombreOriginal  NVARCHAR(260) NOT NULL,
    NombreArchivo   NVARCHAR(80) NOT NULL,
    Extension       NVARCHAR(10) NOT NULL,
    ContentType     NVARCHAR(80) NOT NULL,
    TamanoBytes     INT NOT NULL,
    Fecha           DATETIME NOT NULL CONSTRAINT DF_Clientes_Adjuntos_Fecha DEFAULT (GETDATE()),
    IdUsuario       INT NULL,
    CONSTRAINT PK_Clientes_Adjuntos PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_Clientes_Adjuntos_Clientes FOREIGN KEY (IdCliente) REFERENCES dbo.Clientes (Id)
);

CREATE NONCLUSTERED INDEX IX_Clientes_Adjuntos_IdCliente
    ON dbo.Clientes_Adjuntos (IdCliente, Fecha DESC);");
                }

                _tablaLista = true;
            }
        }
    }
}
