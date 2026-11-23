using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using Sistema_David.Realtime;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Hosting;

namespace Sistema_David.Models
{
    public static class PendientesModel
    {
        private static readonly object SchemaLock = new object();
        private static bool _schemaOk;
        private const int MaxBytesAdjunto = 12 * 1024 * 1024;

        private class ActividadRow
        {
            public int Id { get; set; }
            public DateTime Fecha { get; set; }
            public string Tipo { get; set; }
            public string Titulo { get; set; }
            public string Descripcion { get; set; }
            public int? IdCliente { get; set; }
            public string ClienteNombre { get; set; }
            public string ClienteDni { get; set; }
            public string ClienteDireccion { get; set; }
            public string ClienteTelefono { get; set; }
            public int? IdVendedor { get; set; }
            public string VendedorNombre { get; set; }
            public int IdResponsable { get; set; }
            public string Responsable { get; set; }
            public string Prioridad { get; set; }
            public string Estado { get; set; }
            public int IdUsuarioCarga { get; set; }
            public string UsuarioCarga { get; set; }
            public DateTime FechaCarga { get; set; }
            public DateTime? FechaAlarma { get; set; }
            public DateTime? FechaResolucion { get; set; }
            public int? IdUsuarioResolvio { get; set; }
            public string UsuarioResolvio { get; set; }
            public string Solucion { get; set; }
        }

        private class DestRow
        {
            public int Id { get; set; }
            public int IdUsuario { get; set; }
            public string Nombre { get; set; }
            public DateTime? FechaAlarma { get; set; }
            public bool Silenciada { get; set; }
        }

        private class RespNomRow
        {
            public int IdActividad { get; set; }
            public int IdUsuario { get; set; }
            public string Nombre { get; set; }
        }

        private class ObsRow
        {
            public int Id { get; set; }
            public string Texto { get; set; }
            public int IdUsuario { get; set; }
            public string Usuario { get; set; }
            public DateTime Fecha { get; set; }
        }

        private class AdjuntoRow
        {
            public int Id { get; set; }
            public int IdActividad { get; set; }
            public string NombreOriginal { get; set; }
            public string NombreArchivo { get; set; }
            public string Extension { get; set; }
            public string ContentType { get; set; }
            public int TamanoBytes { get; set; }
            public DateTime Fecha { get; set; }
        }

        private class ClienteRow
        {
            public int Id { get; set; }
            public string Nombre { get; set; }
            public string Apellido { get; set; }
            public string Dni { get; set; }
            public string Direccion { get; set; }
            public string Telefono { get; set; }
            public string Telefono2 { get; set; }
        }

        private static string SqlNombre(string alias)
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
            if (_schemaOk)
                return;

            lock (SchemaLock)
            {
                if (_schemaOk)
                    return;

                using (var db = new Sistema_DavidEntities())
                {
                    db.Database.ExecuteSqlCommand(@"
IF OBJECT_ID(N'dbo.Pendientes_Actividades', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pendientes_Actividades
    (
        Id                 INT IDENTITY(1,1) NOT NULL,
        Fecha              DATE NOT NULL CONSTRAINT DF_Pendientes_Actividades_Fecha DEFAULT (CONVERT(date, GETDATE())),
        Tipo               NVARCHAR(20) NOT NULL,
        Titulo             NVARCHAR(200) NOT NULL,
        Descripcion        NVARCHAR(MAX) NULL,
        IdCliente          INT NULL,
        ClienteNombre      NVARCHAR(200) NULL,
        ClienteDni         NVARCHAR(30) NULL,
        ClienteDireccion   NVARCHAR(300) NULL,
        ClienteTelefono    NVARCHAR(50) NULL,
        IdVendedor         INT NULL,
        VendedorNombre     NVARCHAR(200) NULL,
        IdResponsable      INT NOT NULL,
        Prioridad          NVARCHAR(10) NOT NULL,
        Estado             NVARCHAR(20) NOT NULL,
        IdUsuarioCarga     INT NOT NULL,
        FechaCarga         DATETIME NOT NULL CONSTRAINT DF_Pendientes_Actividades_FechaCarga DEFAULT (GETDATE()),
        FechaAlarma        DATETIME NULL,
        FechaResolucion    DATETIME NULL,
        IdUsuarioResolvio  INT NULL,
        Solucion           NVARCHAR(MAX) NULL,
        CONSTRAINT PK_Pendientes_Actividades PRIMARY KEY CLUSTERED (Id)
    );
    CREATE NONCLUSTERED INDEX IX_Pendientes_Actividades_Estado ON dbo.Pendientes_Actividades (Estado, Fecha DESC, Id DESC);
    CREATE NONCLUSTERED INDEX IX_Pendientes_Actividades_Responsable ON dbo.Pendientes_Actividades (IdResponsable, Estado);
    CREATE NONCLUSTERED INDEX IX_Pendientes_Actividades_Tipo ON dbo.Pendientes_Actividades (Tipo, Estado);
END

IF OBJECT_ID(N'dbo.Pendientes_Destinatarios', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pendientes_Destinatarios
    (
        Id            INT IDENTITY(1,1) NOT NULL,
        IdActividad   INT NOT NULL,
        IdUsuario     INT NOT NULL,
        FechaAlarma   DATETIME NULL,
        Silenciada    BIT NOT NULL CONSTRAINT DF_Pendientes_Destinatarios_Silenciada DEFAULT (0),
        FechaPospuesta DATETIME NULL,
        CONSTRAINT PK_Pendientes_Destinatarios PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_Pendientes_Destinatarios_Actividad FOREIGN KEY (IdActividad) REFERENCES dbo.Pendientes_Actividades (Id) ON DELETE CASCADE,
        CONSTRAINT UQ_Pendientes_Destinatarios UNIQUE (IdActividad, IdUsuario)
    );
    CREATE NONCLUSTERED INDEX IX_Pendientes_Destinatarios_Usuario ON dbo.Pendientes_Destinatarios (IdUsuario, Silenciada, FechaAlarma);
    CREATE NONCLUSTERED INDEX IX_Pendientes_Destinatarios_Alarma ON dbo.Pendientes_Destinatarios (Silenciada, FechaAlarma) INCLUDE (IdActividad, IdUsuario);
END

IF OBJECT_ID(N'dbo.Pendientes_Observaciones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pendientes_Observaciones
    (
        Id            INT IDENTITY(1,1) NOT NULL,
        IdActividad   INT NOT NULL,
        Texto         NVARCHAR(MAX) NOT NULL,
        IdUsuario     INT NOT NULL,
        Fecha         DATETIME NOT NULL CONSTRAINT DF_Pendientes_Observaciones_Fecha DEFAULT (GETDATE()),
        CONSTRAINT PK_Pendientes_Observaciones PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_Pendientes_Observaciones_Actividad FOREIGN KEY (IdActividad) REFERENCES dbo.Pendientes_Actividades (Id) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_Pendientes_Observaciones_Actividad ON dbo.Pendientes_Observaciones (IdActividad, Fecha DESC, Id DESC);
END

IF OBJECT_ID(N'dbo.Pendientes_Adjuntos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pendientes_Adjuntos
    (
        Id              INT IDENTITY(1,1) NOT NULL,
        IdActividad     INT NOT NULL,
        NombreOriginal  NVARCHAR(260) NOT NULL,
        NombreArchivo   NVARCHAR(80) NOT NULL,
        Extension       NVARCHAR(10) NOT NULL,
        ContentType     NVARCHAR(80) NOT NULL,
        TamanoBytes     INT NOT NULL,
        Fecha           DATETIME NOT NULL CONSTRAINT DF_Pendientes_Adjuntos_Fecha DEFAULT (GETDATE()),
        IdUsuario       INT NULL,
        CONSTRAINT PK_Pendientes_Adjuntos PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_Pendientes_Adjuntos_Actividad FOREIGN KEY (IdActividad) REFERENCES dbo.Pendientes_Actividades (Id) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_Pendientes_Adjuntos_Actividad ON dbo.Pendientes_Adjuntos (IdActividad, Fecha DESC);
END

IF OBJECT_ID(N'dbo.Pendientes_Responsables', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pendientes_Responsables
    (
        Id          INT IDENTITY(1,1) NOT NULL,
        IdActividad INT NOT NULL,
        IdUsuario   INT NOT NULL,
        CONSTRAINT PK_Pendientes_Responsables PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_Pendientes_Responsables_Actividad FOREIGN KEY (IdActividad) REFERENCES dbo.Pendientes_Actividades (Id) ON DELETE CASCADE,
        CONSTRAINT UQ_Pendientes_Responsables UNIQUE (IdActividad, IdUsuario)
    );
    CREATE NONCLUSTERED INDEX IX_Pendientes_Responsables_Usuario ON dbo.Pendientes_Responsables (IdUsuario, IdActividad);
END");

                    db.Database.ExecuteSqlCommand(@"
INSERT INTO dbo.Pendientes_Responsables (IdActividad, IdUsuario)
SELECT a.Id, a.IdResponsable
FROM dbo.Pendientes_Actividades a
WHERE a.IdResponsable > 0
  AND NOT EXISTS (
      SELECT 1 FROM dbo.Pendientes_Responsables pr WHERE pr.IdActividad = a.Id
  );");
                }

                _schemaOk = true;
            }
        }

        public static List<VMPendienteLista> Listar(VMPendienteFiltro filtro, int idAlcance = 0)
        {
            AsegurarEsquema();
            filtro = filtro ?? new VMPendienteFiltro();
            var pestana = (filtro.Pestana ?? "pendientes").Trim().ToLowerInvariant();
            var tipo = (filtro.Tipo ?? "").Trim();
            var prioridad = (filtro.Prioridad ?? "").Trim();
            var estado = (filtro.Estado ?? "").Trim();
            var busqueda = (filtro.Busqueda ?? "").Trim();
            var idResp = filtro.IdResponsable;

            using (var db = new Sistema_DavidEntities())
            {
                var sql = @"
SELECT a.Id, a.Fecha, a.Tipo, a.Titulo, a.Descripcion,
       a.IdCliente, a.ClienteNombre, a.ClienteDni, a.ClienteDireccion, a.ClienteTelefono,
       a.IdVendedor, a.VendedorNombre, a.IdResponsable, " + SqlNombre("r") + @" AS Responsable,
       a.Prioridad, a.Estado, a.IdUsuarioCarga, " + SqlNombre("c") + @" AS UsuarioCarga,
       a.FechaCarga, a.FechaAlarma, a.FechaResolucion, a.IdUsuarioResolvio,
       " + SqlNombre("s") + @" AS UsuarioResolvio, a.Solucion
FROM dbo.Pendientes_Actividades a
INNER JOIN dbo.Usuarios r ON r.Id = a.IdResponsable
INNER JOIN dbo.Usuarios c ON c.Id = a.IdUsuarioCarga
LEFT JOIN dbo.Usuarios s ON s.Id = a.IdUsuarioResolvio
WHERE (@p0 = N'solucionados' AND a.Estado = N'Solucionado')
   OR (@p0 <> N'solucionados' AND a.Estado <> N'Solucionado')";

                var args = new List<object> { pestana };

                if (!string.IsNullOrEmpty(tipo))
                {
                    sql += " AND a.Tipo = @p" + args.Count;
                    args.Add(tipo);
                }
                if (idResp > 0)
                {
                    sql += @" AND (
                        a.IdResponsable = @p" + args.Count + @"
                        OR EXISTS (
                            SELECT 1 FROM dbo.Pendientes_Responsables pr
                            WHERE pr.IdActividad = a.Id AND pr.IdUsuario = @p" + args.Count + @"
                        )
                    )";
                    args.Add(idResp);
                }
                if (!string.IsNullOrEmpty(prioridad))
                {
                    sql += " AND a.Prioridad = @p" + args.Count;
                    args.Add(prioridad);
                }
                if (!string.IsNullOrEmpty(estado) && pestana != "solucionados")
                {
                    sql += " AND a.Estado = @p" + args.Count;
                    args.Add(estado);
                }
                if (!string.IsNullOrEmpty(busqueda))
                {
                    var like = "%" + busqueda + "%";
                    sql += @" AND (
                        ISNULL(a.ClienteNombre, N'') LIKE @p" + args.Count + @"
                        OR ISNULL(a.ClienteDni, N'') LIKE @p" + args.Count + @"
                        OR ISNULL(a.VendedorNombre, N'') LIKE @p" + args.Count + @"
                        OR ISNULL(a.Titulo, N'') LIKE @p" + args.Count + @"
                    )";
                    args.Add(like);
                }
                if (idAlcance > 0)
                {
                    sql += SqlInvolucrado("@p" + args.Count);
                    args.Add(idAlcance);
                }

                sql += " ORDER BY CASE a.Prioridad WHEN N'Alta' THEN 0 WHEN N'Media' THEN 1 ELSE 2 END, a.Fecha DESC, a.Id DESC";

                var rows = db.Database.SqlQuery<ActividadRow>(sql, args.ToArray()).ToList();
                var nombres = CargarResponsables(db, rows.Select(x => x.Id).ToList());
                return rows.Select(row =>
                {
                    var item = MapaLista(row);
                    AplicarNombresResponsables(item, row, nombres);
                    return item;
                }).ToList();
            }
        }

        public static VMPendienteDetalle Detalle(int id)
        {
            AsegurarEsquema();
            if (id <= 0)
                return null;

            using (var db = new Sistema_DavidEntities())
            {
                var row = db.Database.SqlQuery<ActividadRow>(SqlDetalle(), id).FirstOrDefault();
                if (row == null)
                    return null;

                var det = MapaDetalle(row);
                AplicarNombresResponsables(det, row, CargarResponsables(db, new List<int> { id }));
                var dest = db.Database.SqlQuery<DestRow>(@"
                    SELECT d.Id, d.IdUsuario, " + SqlNombre("u") + @" AS Nombre, d.FechaAlarma, d.Silenciada
                    FROM dbo.Pendientes_Destinatarios d
                    INNER JOIN dbo.Usuarios u ON u.Id = d.IdUsuario
                    WHERE d.IdActividad = @p0
                    ORDER BY u.Nombre", id).ToList();

                det.Destinatarios = dest.Select(x => x.IdUsuario).ToList();
                det.DestinatariosNombres = string.Join(", ", dest.Select(x => x.Nombre).Where(x => !string.IsNullOrWhiteSpace(x)));

                det.Observaciones = db.Database.SqlQuery<ObsRow>(@"
                    SELECT o.Id, o.Texto, o.IdUsuario, " + SqlNombre("u") + @" AS Usuario, o.Fecha
                    FROM dbo.Pendientes_Observaciones o
                    INNER JOIN dbo.Usuarios u ON u.Id = o.IdUsuario
                    WHERE o.IdActividad = @p0
                    ORDER BY o.Fecha DESC, o.Id DESC", id)
                    .Select(o => new VMPendienteObs
                    {
                        Id = o.Id,
                        Texto = o.Texto,
                        IdUsuario = o.IdUsuario,
                        Usuario = o.Usuario,
                        Fecha = o.Fecha,
                        FechaTexto = o.Fecha.ToString("dd/MM/yyyy HH:mm")
                    }).ToList();

                det.Adjuntos = db.Database.SqlQuery<AdjuntoRow>(@"
                    SELECT Id, IdActividad, NombreOriginal, NombreArchivo, Extension, ContentType, TamanoBytes, Fecha
                    FROM dbo.Pendientes_Adjuntos
                    WHERE IdActividad = @p0
                    ORDER BY Fecha DESC, Id DESC", id)
                    .Select(MapaAdjunto).ToList();

                return det;
            }
        }

        public static VMPendienteGuardado Guardar(VMPendienteGuardar model, int idUsuario)
        {
            AsegurarEsquema();
            if (model == null || idUsuario <= 0)
                throw new InvalidOperationException("Datos incompletos.");

            var tipo = NormalizarTipo(model.Tipo);
            var titulo = (model.Titulo ?? "").Trim();
            if (titulo.Length == 0)
                throw new InvalidOperationException("Escribí el título de la problemática.");

            var prioridad = NormalizarPrioridad(model.Prioridad);
            var estado = NormalizarEstado(model.Estado);
            if (estado == "Solucionado")
                throw new InvalidOperationException("Para marcarla como solucionada usá el cierre con la descripción de la solución.");

            var responsables = NormalizarIds(model.Responsables);
            if (responsables.Count == 0 && model.IdResponsable > 0)
                responsables.Add(model.IdResponsable);
            if (responsables.Count == 0)
                throw new InvalidOperationException("Elegí al menos un responsable.");
            model.IdResponsable = responsables[0];
            model.Responsables = responsables;

            CompletarReferencias(model, tipo);

            var destinatarios = NormalizarIds(model.Destinatarios);
            if (destinatarios.Count == 0)
                destinatarios.AddRange(responsables);

            var fecha = (model.Fecha ?? DateTime.Today).Date;
            var fechaAlarma = model.FechaAlarma;
            var descripcion = string.IsNullOrWhiteSpace(model.Descripcion) ? null : model.Descripcion.Trim();

            int id;
            List<int> afectadosAntes = new List<int>();
            var tituloGuardar = Cortar(titulo, 200);
            var descripcionCmp = descripcion ?? "";

            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                if (model.Id <= 0)
                {
                    var existente = BuscarAbiertaIgual(
                        db, tipo, tituloGuardar, descripcionCmp,
                        model.IdCliente ?? 0, model.IdVendedor ?? 0);
                    if (existente > 0)
                    {
                        tx.Commit();
                        return new VMPendienteGuardado { Id = existente, YaExistia = true };
                    }
                }

                if (model.Id > 0)
                {
                    var actual = db.Database.SqlQuery<ActividadRow>(SqlDetalle(), model.Id).FirstOrDefault();
                    if (actual == null)
                        throw new InvalidOperationException("No se encontró la actividad.");
                    if (string.Equals(actual.Estado, "Solucionado", StringComparison.OrdinalIgnoreCase))
                        throw new InvalidOperationException("La actividad ya está solucionada. El administrador puede reabrirla.");

                    var mismaClave =
                        string.Equals(actual.Tipo, tipo, StringComparison.OrdinalIgnoreCase)
                        && string.Equals((actual.Titulo ?? "").Trim(), tituloGuardar, StringComparison.OrdinalIgnoreCase)
                        && string.Equals((actual.Descripcion ?? "").Trim(), descripcionCmp, StringComparison.OrdinalIgnoreCase)
                        && (actual.IdCliente ?? 0) == (model.IdCliente ?? 0)
                        && (actual.IdVendedor ?? 0) == (model.IdVendedor ?? 0);
                    if (!mismaClave)
                    {
                        var choca = BuscarAbiertaIgual(
                            db, tipo, tituloGuardar, descripcionCmp,
                            model.IdCliente ?? 0, model.IdVendedor ?? 0);
                        if (choca > 0 && choca != model.Id)
                            throw new InvalidOperationException("Ya hay una actividad abierta con el mismo título, la misma persona y la misma descripción.");
                    }

                    afectadosAntes = UsuariosDeActividad(db, model.Id);
                    db.Database.ExecuteSqlCommand(@"
UPDATE dbo.Pendientes_Actividades
SET Fecha = @p1, Tipo = @p2, Titulo = @p3, Descripcion = @p4,
    IdCliente = @p5, ClienteNombre = @p6, ClienteDni = @p7, ClienteDireccion = @p8, ClienteTelefono = @p9,
    IdVendedor = @p10, VendedorNombre = @p11, IdResponsable = @p12, Prioridad = @p13, Estado = @p14,
    FechaAlarma = @p15
WHERE Id = @p0",
                        model.Id, fecha, tipo, Cortar(titulo, 200), (object)descripcion ?? DBNull.Value,
                        (object)model.IdCliente ?? DBNull.Value, (object)Cortar(model.ClienteNombreSnapshot(), 200) ?? DBNull.Value,
                        (object)Cortar(model.ClienteDniSnapshot(), 30) ?? DBNull.Value,
                        (object)Cortar(model.ClienteDireccionSnapshot(), 300) ?? DBNull.Value,
                        (object)Cortar(model.ClienteTelefonoSnapshot(), 50) ?? DBNull.Value,
                        (object)model.IdVendedor ?? DBNull.Value, (object)Cortar(model.VendedorNombreSnapshot(), 200) ?? DBNull.Value,
                        model.IdResponsable, prioridad, estado,
                        (object)fechaAlarma ?? DBNull.Value);

                    id = model.Id;
                }
                else
                {
                    id = db.Database.SqlQuery<int>(@"
INSERT INTO dbo.Pendientes_Actividades
    (Fecha, Tipo, Titulo, Descripcion, IdCliente, ClienteNombre, ClienteDni, ClienteDireccion, ClienteTelefono,
     IdVendedor, VendedorNombre, IdResponsable, Prioridad, Estado, IdUsuarioCarga, FechaCarga, FechaAlarma)
OUTPUT INSERTED.Id
VALUES
    (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13, @p14, GETDATE(), @p15)",
                        fecha, tipo, tituloGuardar, (object)descripcion ?? DBNull.Value,
                        (object)model.IdCliente ?? DBNull.Value, (object)Cortar(model.ClienteNombreSnapshot(), 200) ?? DBNull.Value,
                        (object)Cortar(model.ClienteDniSnapshot(), 30) ?? DBNull.Value,
                        (object)Cortar(model.ClienteDireccionSnapshot(), 300) ?? DBNull.Value,
                        (object)Cortar(model.ClienteTelefonoSnapshot(), 50) ?? DBNull.Value,
                        (object)model.IdVendedor ?? DBNull.Value, (object)Cortar(model.VendedorNombreSnapshot(), 200) ?? DBNull.Value,
                        model.IdResponsable, prioridad, estado, idUsuario,
                        (object)fechaAlarma ?? DBNull.Value).FirstOrDefault();
                    if (id <= 0)
                        throw new InvalidOperationException("No se pudo crear la actividad.");
                }

                SincronizarResponsables(db, id, responsables);
                SincronizarDestinatarios(db, id, destinatarios, fechaAlarma);

                var obs = (model.ObservacionInicial ?? "").Trim();
                if (model.Id <= 0 && obs.Length > 0)
                {
                    db.Database.ExecuteSqlCommand(@"
INSERT INTO dbo.Pendientes_Observaciones (IdActividad, Texto, IdUsuario, Fecha)
VALUES (@p0, @p1, @p2, GETDATE())", id, obs, idUsuario);
                }

                tx.Commit();
            }

            NotificarUsuarios(id, afectadosAntes);
            PendientesAlarmaScheduler.Reprogramar();
            return new VMPendienteGuardado { Id = id, YaExistia = false };
        }

        private static int BuscarAbiertaIgual(Sistema_DavidEntities db, string tipo, string titulo, string descripcion, int idCliente, int idVendedor)
        {
            return db.Database.SqlQuery<int>(@"
SELECT TOP 1 a.Id
FROM dbo.Pendientes_Actividades a WITH (UPDLOCK, HOLDLOCK)
WHERE a.Estado <> N'Solucionado'
  AND a.Tipo = @p0
  AND UPPER(LTRIM(RTRIM(a.Titulo))) = UPPER(@p1)
  AND UPPER(LTRIM(RTRIM(ISNULL(a.Descripcion, N'')))) = UPPER(@p2)
  AND ISNULL(a.IdCliente, 0) = @p3
  AND ISNULL(a.IdVendedor, 0) = @p4
ORDER BY a.Id",
                tipo, titulo ?? "", descripcion ?? "", idCliente, idVendedor).FirstOrDefault();
        }

        public static bool AgregarObservacion(int id, string texto, int idUsuario)
        {
            AsegurarEsquema();
            texto = (texto ?? "").Trim();
            if (id <= 0 || idUsuario <= 0 || texto.Length == 0)
                return false;

            var insertada = false;
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                var estado = db.Database.SqlQuery<string>(
                    "SELECT Estado FROM dbo.Pendientes_Actividades WHERE Id = @p0", id).FirstOrDefault();
                if (string.IsNullOrEmpty(estado) || string.Equals(estado, "Solucionado", StringComparison.OrdinalIgnoreCase))
                {
                    tx.Commit();
                    return false;
                }

                var reciente = db.Database.SqlQuery<int>(@"
SELECT TOP 1 Id
FROM dbo.Pendientes_Observaciones WITH (UPDLOCK, HOLDLOCK)
WHERE IdActividad = @p0
  AND IdUsuario = @p1
  AND Texto = @p2
  AND Fecha >= DATEADD(second, -15, GETDATE())", id, idUsuario, texto).FirstOrDefault();
                if (reciente <= 0)
                {
                    db.Database.ExecuteSqlCommand(@"
INSERT INTO dbo.Pendientes_Observaciones (IdActividad, Texto, IdUsuario, Fecha)
VALUES (@p0, @p1, @p2, GETDATE())", id, texto, idUsuario);
                    insertada = true;
                }

                tx.Commit();
            }

            if (insertada)
                NotificarUsuarios(id, null);
            return true;
        }

        public static bool EliminarObservacion(int id)
        {
            AsegurarEsquema();
            if (id <= 0)
                return false;

            using (var db = new Sistema_DavidEntities())
            {
                var n = db.Database.ExecuteSqlCommand(
                    "DELETE FROM dbo.Pendientes_Observaciones WHERE Id = @p0", id);
                return n > 0;
            }
        }

        public static bool Solucionar(int id, string solucion, int idUsuario)
        {
            AsegurarEsquema();
            solucion = (solucion ?? "").Trim();
            if (id <= 0 || idUsuario <= 0 || solucion.Length == 0)
                throw new InvalidOperationException("Para solucionarlo tenés que escribir cómo se resolvió.");

            List<int> afectados;
            using (var db = new Sistema_DavidEntities())
            {
                var estado = db.Database.SqlQuery<string>(
                    "SELECT Estado FROM dbo.Pendientes_Actividades WHERE Id = @p0", id).FirstOrDefault();
                if (string.IsNullOrEmpty(estado))
                    throw new InvalidOperationException("No se encontró la actividad.");
                if (string.Equals(estado, "Solucionado", StringComparison.OrdinalIgnoreCase))
                    return true;

                afectados = UsuariosDeActividad(db, id);
                db.Database.ExecuteSqlCommand(@"
UPDATE dbo.Pendientes_Actividades
SET Estado = N'Solucionado', Solucion = @p1, IdUsuarioResolvio = @p2, FechaResolucion = GETDATE()
WHERE Id = @p0", id, solucion, idUsuario);

                db.Database.ExecuteSqlCommand(@"
UPDATE dbo.Pendientes_Destinatarios SET Silenciada = 1 WHERE IdActividad = @p0", id);
            }

            NotificarUsuarios(id, afectados, solucionado: true);
            PendientesAlarmaScheduler.Reprogramar();
            return true;
        }

        public static bool Reabrir(int id, int idUsuario)
        {
            AsegurarEsquema();
            if (id <= 0 || idUsuario <= 0)
                return false;

            using (var db = new Sistema_DavidEntities())
            {
                var n = db.Database.ExecuteSqlCommand(@"
UPDATE dbo.Pendientes_Actividades
SET Estado = N'En proceso', FechaResolucion = NULL, IdUsuarioResolvio = NULL
WHERE Id = @p0 AND Estado = N'Solucionado'", id);
                if (n <= 0)
                    return false;

                db.Database.ExecuteSqlCommand(@"
UPDATE dbo.Pendientes_Destinatarios
SET Silenciada = CASE WHEN FechaAlarma IS NULL OR FechaAlarma <= GETDATE() THEN 1 ELSE 0 END
WHERE IdActividad = @p0", id);

                db.Database.ExecuteSqlCommand(@"
INSERT INTO dbo.Pendientes_Observaciones (IdActividad, Texto, IdUsuario, Fecha)
VALUES (@p0, N'Actividad reabierta por el administrador.', @p1, GETDATE())", id, idUsuario);
            }

            NotificarUsuarios(id, null);
            PendientesAlarmaScheduler.Reprogramar();
            return true;
        }

        private static string SqlInvolucrado(string param)
        {
            return @" AND (
                a.IdResponsable = " + param + @"
                OR a.IdUsuarioCarga = " + param + @"
                OR a.IdVendedor = " + param + @"
                OR EXISTS (
                    SELECT 1 FROM dbo.Pendientes_Responsables pr
                    WHERE pr.IdActividad = a.Id AND pr.IdUsuario = " + param + @"
                )
                OR EXISTS (
                    SELECT 1 FROM dbo.Pendientes_Destinatarios d
                    WHERE d.IdActividad = a.Id AND d.IdUsuario = " + param + @"
                )
            )";
        }

        public static bool EstaInvolucrado(int idActividad, int idUsuario)
        {
            AsegurarEsquema();
            if (idActividad <= 0 || idUsuario <= 0)
                return false;

            using (var db = new Sistema_DavidEntities())
            {
                return db.Database.SqlQuery<int>(@"
SELECT COUNT(1)
FROM dbo.Pendientes_Actividades a
WHERE a.Id = @p0" + SqlInvolucrado("@p1"), idActividad, idUsuario).FirstOrDefault() > 0;
            }
        }

        public static bool PuedeVerAdjunto(int idAdjunto, int idUsuario)
        {
            AsegurarEsquema();
            if (idAdjunto <= 0 || idUsuario <= 0)
                return false;

            using (var db = new Sistema_DavidEntities())
            {
                var idActividad = db.Database.SqlQuery<int>(@"
SELECT IdActividad FROM dbo.Pendientes_Adjuntos WHERE Id = @p0", idAdjunto).FirstOrDefault();
                return idActividad > 0 && EstaInvolucrado(idActividad, idUsuario);
            }
        }

        public static int ContarAsignadas(int idUsuario)
        {
            return ContarInvolucradas(idUsuario);
        }

        public static int ContarInvolucradas(int idUsuario)
        {
            AsegurarEsquema();
            if (idUsuario <= 0)
                return 0;

            using (var db = new Sistema_DavidEntities())
            {
                return db.Database.SqlQuery<int>(@"
SELECT COUNT(DISTINCT a.Id)
FROM dbo.Pendientes_Actividades a
WHERE a.Estado <> N'Solucionado'" + SqlInvolucrado("@p0"), idUsuario).FirstOrDefault();
            }
        }

        public static int ContarAbiertas()
        {
            AsegurarEsquema();
            using (var db = new Sistema_DavidEntities())
            {
                return db.Database.SqlQuery<int>(@"
SELECT COUNT(1)
FROM dbo.Pendientes_Actividades a
WHERE a.Estado <> N'Solucionado'").FirstOrDefault();
            }
        }

        public static int ContarVisibles(int idUsuario, bool esAdmin)
        {
            return esAdmin ? ContarAbiertas() : ContarInvolucradas(idUsuario);
        }

        public static VMPendienteRealtime SnapshotRealtime(int idUsuario, bool esAdmin = false)
        {
            return new VMPendienteRealtime
            {
                Contador = ContarVisibles(idUsuario, esAdmin),
                Due = AlarmasDeUsuario(idUsuario, true),
                Proximas = AlarmasDeUsuario(idUsuario, false)
            };
        }

        public static List<VMPendienteAlarma> AlarmasVencidas()
        {
            AsegurarEsquema();
            using (var db = new Sistema_DavidEntities())
            {
                return MapAlarmas(db.Database.SqlQuery<VMPendienteAlarma>(SqlAlarmas() + " AND d.FechaAlarma <= GETDATE()").ToList());
            }
        }

        private class FechaMinRow
        {
            public DateTime? Fecha { get; set; }
        }

        public static DateTime? ProximaAlarmaGlobal()
        {
            AsegurarEsquema();
            using (var db = new Sistema_DavidEntities())
            {
                var row = db.Database.SqlQuery<FechaMinRow>(@"
SELECT MIN(d.FechaAlarma) AS Fecha
FROM dbo.Pendientes_Destinatarios d
INNER JOIN dbo.Pendientes_Actividades a ON a.Id = d.IdActividad
WHERE d.Silenciada = 0
  AND d.FechaAlarma IS NOT NULL
  AND d.FechaAlarma > GETDATE()
  AND a.Estado <> N'Solucionado'").FirstOrDefault();
                return row != null ? row.Fecha : null;
            }
        }

        public static bool DetenerAlarma(int idDestinatario, int idUsuario)
        {
            AsegurarEsquema();
            if (idDestinatario <= 0 || idUsuario <= 0)
                return false;

            using (var db = new Sistema_DavidEntities())
            {
                var n = db.Database.ExecuteSqlCommand(@"
UPDATE dbo.Pendientes_Destinatarios
SET Silenciada = 1
WHERE Id = @p0 AND IdUsuario = @p1", idDestinatario, idUsuario);
                return n > 0;
            }
        }

        public static VMPendienteAlarma Posponer(int idDestinatario, int idUsuario, int minutos)
        {
            if (minutos <= 0)
                minutos = 5;
            if (minutos > 24 * 60)
                minutos = 24 * 60;
            return PosponerHasta(idDestinatario, idUsuario, DateTime.Now.AddMinutes(minutos));
        }

        public static VMPendienteAlarma PosponerHasta(int idDestinatario, int idUsuario, DateTime hasta)
        {
            AsegurarEsquema();
            if (idDestinatario <= 0 || idUsuario <= 0)
                return null;
            if (hasta <= DateTime.Now.AddSeconds(20))
                throw new InvalidOperationException("Elegí un horario posterior.");

            using (var db = new Sistema_DavidEntities())
            {
                var n = db.Database.ExecuteSqlCommand(@"
UPDATE dbo.Pendientes_Destinatarios
SET Silenciada = 0, FechaAlarma = @p2, FechaPospuesta = GETDATE()
WHERE Id = @p0 AND IdUsuario = @p1", idDestinatario, idUsuario, hasta);
                if (n <= 0)
                    return null;

                return AlarmasDeUsuario(idUsuario, false)
                    .Concat(AlarmasDeUsuario(idUsuario, true))
                    .FirstOrDefault(x => x.IdDestinatario == idDestinatario);
            }
        }

        public static List<VMPendienteUsuario> UsuariosModulo()
        {
            using (var db = new Sistema_DavidEntities())
            {
                return db.Database.SqlQuery<VMPendienteUsuario>(@"
SELECT u.Id,
       LTRIM(RTRIM(ISNULL(u.Nombre, N'') + N' ' + ISNULL(u.Apellido, N''))) AS Nombre,
       r.Nombre AS Rol,
       u.IdRol
FROM dbo.Usuarios u
INNER JOIN dbo.Roles r ON r.Id = u.IdRol
WHERE u.IdEstado = 1 AND u.IdRol IN (1, 4)
ORDER BY CASE u.IdRol WHEN 4 THEN 0 ELSE 1 END, u.Nombre, u.Apellido").ToList();
            }
        }

        public static List<VMPendienteUsuario> Vendedores()
        {
            using (var db = new Sistema_DavidEntities())
            {
                return db.Database.SqlQuery<VMPendienteUsuario>(@"
SELECT u.Id,
       LTRIM(RTRIM(ISNULL(u.Nombre, N'') + N' ' + ISNULL(u.Apellido, N''))) AS Nombre,
       ISNULL(u.Usuario, N'') AS Usuario,
       r.Nombre AS Rol,
       u.IdRol
FROM dbo.Usuarios u
INNER JOIN dbo.Roles r ON r.Id = u.IdRol
WHERE u.IdEstado = 1
ORDER BY u.Nombre, u.Apellido").ToList();
            }
        }

        public static List<VMNavbarAlerta> ListaAlertasNavbar(int idUsuario, bool esAdmin = false)
        {
            if (idUsuario <= 0)
                return new List<VMNavbarAlerta>();

            return Listar(new VMPendienteFiltro
            {
                Pestana = "pendientes"
            }, esAdmin ? 0 : idUsuario).Select(x => new VMNavbarAlerta
            {
                Id = x.Id,
                Titulo = x.Titulo,
                Cliente = x.Titulo,
                Nombre = x.Nombre,
                Descripcion = x.Descripcion,
                Tipo = x.Tipo,
                Estado = x.Estado,
                Prioridad = x.Prioridad,
                FechaAlarmaTexto = x.FechaAlarmaTexto,
                FechaTexto = x.FechaAlarmaTexto,
                Url = "/Pendientes/Index?id=" + x.Id,
                Origen = "PENDIENTES"
            }).ToList();
        }

        public static List<VMPendienteCliente> BuscarClientes(string q)
        {
            q = (q ?? "").Trim();
            if (q.Length < 2)
                return new List<VMPendienteCliente>();

            using (var db = new Sistema_DavidEntities())
            {
                var like = "%" + q + "%";
                var rows = db.Database.SqlQuery<ClienteRow>(@"
SELECT TOP 25 c.Id, c.Nombre, c.Apellido, c.Dni, c.Direccion, c.Telefono, c.Telefono2
FROM dbo.Clientes c
WHERE ISNULL(c.Nombre, N'') LIKE @p0
   OR ISNULL(c.Apellido, N'') LIKE @p0
   OR (ISNULL(c.Nombre, N'') + N' ' + ISNULL(c.Apellido, N'')) LIKE @p0
   OR ISNULL(c.Dni, N'') LIKE @p0
ORDER BY c.Nombre, c.Apellido", like).ToList();

                return rows.Select(c => new VMPendienteCliente
                {
                    Id = c.Id,
                    Nombre = c.Nombre,
                    Apellido = c.Apellido,
                    NombreCompleto = ((c.Nombre ?? "") + " " + (c.Apellido ?? "")).Trim(),
                    Dni = c.Dni,
                    Direccion = c.Direccion,
                    Telefono = string.IsNullOrWhiteSpace(c.Telefono) ? c.Telefono2 : c.Telefono
                }).ToList();
            }
        }

        public static VMPendienteAdjuntosResultado GuardarAdjuntos(int idActividad, HttpFileCollectionBase archivos, int idUsuario)
        {
            var resultado = new VMPendienteAdjuntosResultado { Items = new List<VMPendienteAdjunto>() };
            AsegurarEsquema();
            if (idActividad <= 0)
            {
                resultado.Mensaje = "Primero guardá la actividad.";
                return resultado;
            }
            if (archivos == null || archivos.Count == 0)
            {
                resultado.Mensaje = "No hay archivos para adjuntar.";
                return resultado;
            }

            var raiz = CarpetaAdjuntos();
            var carpeta = Path.Combine(raiz, idActividad.ToString());
            Directory.CreateDirectory(carpeta);

            using (var db = new Sistema_DavidEntities())
            {
                var existe = db.Database.SqlQuery<int>(
                    "SELECT COUNT(1) FROM dbo.Pendientes_Actividades WHERE Id = @p0", idActividad).FirstOrDefault();
                if (existe == 0)
                {
                    resultado.Mensaje = "No se encontró la actividad.";
                    return resultado;
                }

                for (int i = 0; i < archivos.Count; i++)
                {
                    var archivo = archivos[i];
                    if (archivo == null || archivo.ContentLength <= 0)
                        continue;

                    var original = Path.GetFileName(archivo.FileName ?? "archivo");
                    if (string.IsNullOrWhiteSpace(original))
                        original = "archivo";
                    if (archivo.ContentLength > MaxBytesAdjunto)
                    {
                        resultado.Mensaje = (resultado.Mensaje ?? "") + original + " supera los 12 MB. ";
                        continue;
                    }

                    var ext = Path.GetExtension(original);
                    if (string.IsNullOrWhiteSpace(ext))
                        ext = ".bin";
                    ext = ext.ToLowerInvariant();
                    if (!ExtPermitida(ext))
                    {
                        resultado.Mensaje = (resultado.Mensaje ?? "") + original + " no es un tipo permitido. ";
                        continue;
                    }

                    var nombreArchivo = Guid.NewGuid().ToString("N") + ext;
                    var ruta = Path.Combine(carpeta, nombreArchivo);
                    archivo.SaveAs(ruta);

                    var contentType = string.IsNullOrWhiteSpace(archivo.ContentType) ? "application/octet-stream" : archivo.ContentType;
                    db.Database.ExecuteSqlCommand(@"
INSERT INTO dbo.Pendientes_Adjuntos
    (IdActividad, NombreOriginal, NombreArchivo, Extension, ContentType, TamanoBytes, Fecha, IdUsuario)
VALUES
    (@p0, @p1, @p2, @p3, @p4, @p5, GETDATE(), NULLIF(@p6, 0))",
                        idActividad, Cortar(original, 260), nombreArchivo, Cortar(ext, 10),
                        Cortar(contentType, 80), archivo.ContentLength, idUsuario);

                    var idAdj = db.Database.SqlQuery<int>(
                        "SELECT Id FROM dbo.Pendientes_Adjuntos WHERE NombreArchivo = @p0", nombreArchivo).FirstOrDefault();
                    resultado.Items.Add(new VMPendienteAdjunto
                    {
                        Id = idAdj,
                        Nombre = original,
                        Extension = ext,
                        TamanoBytes = archivo.ContentLength,
                        Fecha = DateTime.Now.ToString("dd/MM/yyyy HH:mm"),
                        EsImagen = EsImagen(contentType, ext),
                        Url = "/Pendientes/VerAdjunto?id=" + idAdj
                    });
                }
            }

            resultado.Ok = resultado.Items.Count > 0;
            if (resultado.Ok && string.IsNullOrWhiteSpace(resultado.Mensaje))
                resultado.Mensaje = "Archivos guardados.";
            return resultado;
        }

        public static bool EliminarAdjunto(int id)
        {
            AsegurarEsquema();
            if (id <= 0)
                return false;

            using (var db = new Sistema_DavidEntities())
            {
                var row = db.Database.SqlQuery<AdjuntoRow>(@"
SELECT Id, IdActividad, NombreOriginal, NombreArchivo, Extension, ContentType, TamanoBytes, Fecha
FROM dbo.Pendientes_Adjuntos WHERE Id = @p0", id).FirstOrDefault();
                if (row == null)
                    return false;

                db.Database.ExecuteSqlCommand("DELETE FROM dbo.Pendientes_Adjuntos WHERE Id = @p0", id);
                try
                {
                    var ruta = Path.Combine(CarpetaAdjuntos(), row.IdActividad.ToString(), row.NombreArchivo);
                    if (File.Exists(ruta))
                        File.Delete(ruta);
                }
                catch { }
                return true;
            }
        }

        public static bool TryAbrirAdjunto(int id, out string ruta, out string contentType, out string nombre)
        {
            ruta = null;
            contentType = null;
            nombre = null;
            AsegurarEsquema();
            if (id <= 0)
                return false;

            using (var db = new Sistema_DavidEntities())
            {
                var row = db.Database.SqlQuery<AdjuntoRow>(@"
SELECT Id, IdActividad, NombreOriginal, NombreArchivo, Extension, ContentType, TamanoBytes, Fecha
FROM dbo.Pendientes_Adjuntos WHERE Id = @p0", id).FirstOrDefault();
                if (row == null)
                    return false;

                ruta = Path.Combine(CarpetaAdjuntos(), row.IdActividad.ToString(), row.NombreArchivo);
                if (!File.Exists(ruta))
                    return false;

                contentType = string.IsNullOrWhiteSpace(row.ContentType) ? "application/octet-stream" : row.ContentType;
                nombre = row.NombreOriginal;
                return true;
            }
        }

        private static List<VMPendienteAlarma> AlarmasDeUsuario(int idUsuario, bool vencidas)
        {
            AsegurarEsquema();
            using (var db = new Sistema_DavidEntities())
            {
                var extra = vencidas
                    ? " AND d.FechaAlarma <= GETDATE()"
                    : " AND d.FechaAlarma > GETDATE()";
                return MapAlarmas(db.Database.SqlQuery<VMPendienteAlarma>(
                    SqlAlarmas() + extra + " AND d.IdUsuario = @p0 ORDER BY d.FechaAlarma", idUsuario).ToList());
            }
        }

        private static string SqlAlarmas()
        {
            return @"
SELECT d.Id AS IdDestinatario, d.IdActividad, d.IdUsuario, a.Titulo, a.Tipo, a.Prioridad, d.FechaAlarma,
       CASE a.Tipo
            WHEN N'Cliente' THEN ISNULL(a.ClienteNombre, N'')
            WHEN N'Vendedor' THEN ISNULL(a.VendedorNombre, N'')
            ELSE N'Interno'
       END AS Nombre
FROM dbo.Pendientes_Destinatarios d
INNER JOIN dbo.Pendientes_Actividades a ON a.Id = d.IdActividad
WHERE d.Silenciada = 0
  AND d.FechaAlarma IS NOT NULL
  AND a.Estado <> N'Solucionado'";
        }

        private static List<VMPendienteAlarma> MapAlarmas(List<VMPendienteAlarma> list)
        {
            foreach (var a in list)
            {
                a.FechaAlarmaTexto = a.FechaAlarma.ToString("dd/MM/yyyy HH:mm");
                a.Url = "/Pendientes/Index?id=" + a.IdActividad;
            }
            return list;
        }

        private static string SqlDetalle()
        {
            return @"
SELECT a.Id, a.Fecha, a.Tipo, a.Titulo, a.Descripcion,
       a.IdCliente, a.ClienteNombre, a.ClienteDni, a.ClienteDireccion, a.ClienteTelefono,
       a.IdVendedor, a.VendedorNombre, a.IdResponsable, " + SqlNombre("r") + @" AS Responsable,
       a.Prioridad, a.Estado, a.IdUsuarioCarga, " + SqlNombre("c") + @" AS UsuarioCarga,
       a.FechaCarga, a.FechaAlarma, a.FechaResolucion, a.IdUsuarioResolvio,
       " + SqlNombre("s") + @" AS UsuarioResolvio, a.Solucion
FROM dbo.Pendientes_Actividades a
INNER JOIN dbo.Usuarios r ON r.Id = a.IdResponsable
INNER JOIN dbo.Usuarios c ON c.Id = a.IdUsuarioCarga
LEFT JOIN dbo.Usuarios s ON s.Id = a.IdUsuarioResolvio
WHERE a.Id = @p0";
        }

        private static void CompletarReferencias(VMPendienteGuardar model, string tipo)
        {
            model._clienteNombre = null;
            model._clienteDni = null;
            model._clienteDireccion = null;
            model._clienteTelefono = null;
            model._vendedorNombre = null;

            if (tipo == "Cliente")
            {
                if (!model.IdCliente.HasValue || model.IdCliente.Value <= 0)
                    throw new InvalidOperationException("Buscá y seleccioná un cliente.");

                using (var db = new Sistema_DavidEntities())
                {
                    var c = db.Database.SqlQuery<ClienteRow>(@"
SELECT Id, Nombre, Apellido, Dni, Direccion, Telefono, Telefono2
FROM dbo.Clientes WHERE Id = @p0", model.IdCliente.Value).FirstOrDefault();
                    if (c == null)
                        throw new InvalidOperationException("No se encontró el cliente.");
                    model._clienteNombre = ((c.Nombre ?? "") + " " + (c.Apellido ?? "")).Trim();
                    model._clienteDni = c.Dni;
                    model._clienteDireccion = c.Direccion;
                    model._clienteTelefono = string.IsNullOrWhiteSpace(c.Telefono) ? c.Telefono2 : c.Telefono;
                }
                model.IdVendedor = null;
            }
            else if (tipo == "Vendedor")
            {
                if (!model.IdVendedor.HasValue || model.IdVendedor.Value <= 0)
                    throw new InvalidOperationException("Seleccioná un vendedor.");

                using (var db = new Sistema_DavidEntities())
                {
                    var n = db.Database.SqlQuery<string>(
                        "SELECT " + SqlNombre("u") + " FROM dbo.Usuarios u WHERE u.Id = @p0", model.IdVendedor.Value)
                        .FirstOrDefault();
                    if (string.IsNullOrWhiteSpace(n))
                        throw new InvalidOperationException("No se encontró el vendedor.");
                    model._vendedorNombre = n;
                }
                model.IdCliente = null;
            }
            else
            {
                model.IdCliente = null;
                model.IdVendedor = null;
            }
        }

        private static List<int> NormalizarIds(List<int> ids)
        {
            return (ids ?? new List<int>()).Where(x => x > 0).Distinct().ToList();
        }

        private static Dictionary<int, List<RespNomRow>> CargarResponsables(Sistema_DavidEntities db, List<int> idsActividad)
        {
            var mapa = new Dictionary<int, List<RespNomRow>>();
            var ids = (idsActividad ?? new List<int>()).Where(x => x > 0).Distinct().ToList();
            if (ids.Count == 0)
                return mapa;

            var args = new List<object>();
            var marcas = new List<string>();
            foreach (var id in ids)
            {
                marcas.Add("@p" + args.Count);
                args.Add(id);
            }

            var rows = db.Database.SqlQuery<RespNomRow>(@"
SELECT pr.IdActividad, pr.IdUsuario, " + SqlNombre("u") + @" AS Nombre
FROM dbo.Pendientes_Responsables pr
INNER JOIN dbo.Usuarios u ON u.Id = pr.IdUsuario
WHERE pr.IdActividad IN (" + string.Join(", ", marcas) + @")
ORDER BY u.Nombre, u.Apellido", args.ToArray()).ToList();

            foreach (var row in rows)
            {
                List<RespNomRow> lista;
                if (!mapa.TryGetValue(row.IdActividad, out lista))
                {
                    lista = new List<RespNomRow>();
                    mapa[row.IdActividad] = lista;
                }
                if (lista.Any(x => x.IdUsuario == row.IdUsuario))
                    continue;
                lista.Add(row);
            }

            return mapa;
        }

        private static void AplicarNombresResponsables(VMPendienteLista item, ActividadRow row, Dictionary<int, List<RespNomRow>> mapa)
        {
            List<RespNomRow> lista;
            if (mapa != null && mapa.TryGetValue(row.Id, out lista) && lista.Count > 0)
            {
                item.Responsables = lista.Select(x => x.IdUsuario).ToList();
                item.Responsable = string.Join(", ", lista.Select(x => x.Nombre).Where(x => !string.IsNullOrWhiteSpace(x)));
                item.IdResponsable = item.Responsables[0];
                return;
            }

            item.Responsables = row.IdResponsable > 0
                ? new List<int> { row.IdResponsable }
                : new List<int>();
        }

        private static void SincronizarResponsables(Sistema_DavidEntities db, int idActividad, List<int> ids)
        {
            var actuales = db.Database.SqlQuery<int>(
                "SELECT IdUsuario FROM dbo.Pendientes_Responsables WHERE IdActividad = @p0", idActividad).ToList();

            foreach (var viejo in actuales.Where(x => !ids.Contains(x)))
            {
                db.Database.ExecuteSqlCommand(
                    "DELETE FROM dbo.Pendientes_Responsables WHERE IdActividad = @p0 AND IdUsuario = @p1",
                    idActividad, viejo);
            }

            foreach (var idUsuario in ids)
            {
                if (actuales.Contains(idUsuario))
                    continue;
                db.Database.ExecuteSqlCommand(@"
INSERT INTO dbo.Pendientes_Responsables (IdActividad, IdUsuario)
VALUES (@p0, @p1)", idActividad, idUsuario);
            }
        }

        private static void SincronizarDestinatarios(Sistema_DavidEntities db, int idActividad, List<int> ids, DateTime? fechaAlarma)
        {
            var actuales = db.Database.SqlQuery<DestRow>(@"
SELECT Id, IdUsuario, CAST(N'' AS nvarchar(200)) AS Nombre, FechaAlarma, Silenciada
FROM dbo.Pendientes_Destinatarios WHERE IdActividad = @p0", idActividad).ToList();

            foreach (var viejo in actuales.Where(x => !ids.Contains(x.IdUsuario)))
                db.Database.ExecuteSqlCommand("DELETE FROM dbo.Pendientes_Destinatarios WHERE Id = @p0", viejo.Id);

            foreach (var idUsuario in ids)
            {
                var existe = actuales.FirstOrDefault(x => x.IdUsuario == idUsuario);
                if (existe == null)
                {
                    db.Database.ExecuteSqlCommand(@"
INSERT INTO dbo.Pendientes_Destinatarios (IdActividad, IdUsuario, FechaAlarma, Silenciada)
VALUES (@p0, @p1, @p2, 0)", idActividad, idUsuario, (object)fechaAlarma ?? DBNull.Value);
                }
                else
                {
                    db.Database.ExecuteSqlCommand(@"
UPDATE dbo.Pendientes_Destinatarios
SET FechaAlarma = @p1, Silenciada = 0
WHERE Id = @p0", existe.Id, (object)fechaAlarma ?? DBNull.Value);
                }
            }
        }

        private static void NotificarUsuarios(int idActividad, List<int> extra, bool solucionado = false)
        {
            try
            {
                List<int> ids;
                using (var db = new Sistema_DavidEntities())
                {
                    ids = UsuariosDeActividad(db, idActividad);
                }
                if (extra != null)
                    ids = ids.Concat(extra).Where(x => x > 0).Distinct().ToList();

                var admins = IdsAdmins();
                var destinatarios = ids.Concat(admins).Where(x => x > 0).Distinct().ToList();
                var abiertas = ContarAbiertas();
                foreach (var id in destinatarios)
                {
                    var cantidad = admins.Contains(id) ? abiertas : ContarInvolucradas(id);
                    TiempoReal.PendienteContador(id, cantidad);
                }

                TiempoReal.PendienteCambio(destinatarios, new { id = idActividad, solucionado });

                if (!solucionado)
                {
                    using (var db = new Sistema_DavidEntities())
                    {
                        var dest = db.Database.SqlQuery<DestRow>(@"
SELECT Id, IdUsuario, CAST(N'' AS nvarchar(200)) AS Nombre, FechaAlarma, Silenciada
FROM dbo.Pendientes_Destinatarios WHERE IdActividad = @p0", idActividad).ToList();
                        foreach (var d in dest)
                        {
                            if (d.Silenciada || !d.FechaAlarma.HasValue)
                            {
                                TiempoReal.AlarmaCancelada(d.IdUsuario, d.Id);
                                continue;
                            }

                            var alarma = AlarmasDeUsuario(d.IdUsuario, false)
                                .Concat(AlarmasDeUsuario(d.IdUsuario, true))
                                .FirstOrDefault(x => x.IdDestinatario == d.Id);
                            if (alarma != null)
                                TiempoReal.AlarmaProgramada(d.IdUsuario, alarma);
                        }
                    }
                }
                else
                {
                    foreach (var id in ids)
                        TiempoReal.AUsuario(id, "AlarmaActividadCerrada", new { idActividad });
                }
            }
            catch { }
        }

        private static List<int> IdsAdmins()
        {
            using (var db = new Sistema_DavidEntities())
            {
                return db.Database.SqlQuery<int>(@"
SELECT Id FROM dbo.Usuarios WHERE IdEstado = 1 AND IdRol = 1").ToList();
            }
        }

        private static List<int> UsuariosDeActividad(Sistema_DavidEntities db, int id)
        {
            return db.Database.SqlQuery<int>(@"
SELECT DISTINCT x.IdUsuario
FROM (
    SELECT IdResponsable AS IdUsuario FROM dbo.Pendientes_Actividades WHERE Id = @p0
    UNION
    SELECT IdUsuarioCarga FROM dbo.Pendientes_Actividades WHERE Id = @p0
    UNION
    SELECT IdUsuario FROM dbo.Pendientes_Destinatarios WHERE IdActividad = @p0
    UNION
    SELECT IdUsuario FROM dbo.Pendientes_Responsables WHERE IdActividad = @p0
    UNION
    SELECT IdVendedor FROM dbo.Pendientes_Actividades WHERE Id = @p0 AND IdVendedor > 0
) x
WHERE x.IdUsuario IS NOT NULL AND x.IdUsuario > 0", id).ToList();
        }

        private static VMPendienteLista MapaLista(ActividadRow row)
        {
            return new VMPendienteLista
            {
                Id = row.Id,
                Fecha = row.Fecha,
                FechaTexto = row.Fecha.ToString("dd/MM"),
                Tipo = row.Tipo,
                Nombre = NombreVisible(row),
                Dni = VacioGuion(row.ClienteDni),
                Direccion = VacioGuion(row.ClienteDireccion),
                Telefono = VacioGuion(row.ClienteTelefono),
                Titulo = row.Titulo,
                Descripcion = row.Descripcion,
                IdResponsable = row.IdResponsable,
                Responsable = row.Responsable,
                Prioridad = row.Prioridad,
                Estado = row.Estado,
                IdUsuarioCarga = row.IdUsuarioCarga,
                UsuarioCarga = row.UsuarioCarga,
                FechaCarga = row.FechaCarga,
                FechaCargaTexto = row.FechaCarga.ToString("dd/MM/yyyy HH:mm"),
                FechaCargaDiaTexto = row.FechaCarga.ToString("dd/MM/yyyy"),
                HorarioCargaTexto = row.FechaCarga.ToString("HH:mm"),
                FechaAlarma = row.FechaAlarma,
                FechaAlarmaTexto = row.FechaAlarma.HasValue ? row.FechaAlarma.Value.ToString("dd/MM/yyyy HH:mm") : "—",
                FechaResolucion = row.FechaResolucion,
                FechaResolucionTexto = row.FechaResolucion.HasValue ? row.FechaResolucion.Value.ToString("dd/MM/yyyy HH:mm") : "—"
            };
        }

        private static VMPendienteDetalle MapaDetalle(ActividadRow row)
        {
            var lista = MapaLista(row);
            return new VMPendienteDetalle
            {
                Id = lista.Id,
                Fecha = lista.Fecha,
                FechaTexto = lista.FechaTexto,
                Tipo = lista.Tipo,
                Nombre = lista.Nombre,
                Dni = lista.Dni,
                Direccion = lista.Direccion,
                Telefono = lista.Telefono,
                Titulo = lista.Titulo,
                IdResponsable = lista.IdResponsable,
                Responsable = lista.Responsable,
                Prioridad = lista.Prioridad,
                Estado = lista.Estado,
                IdUsuarioCarga = lista.IdUsuarioCarga,
                UsuarioCarga = lista.UsuarioCarga,
                FechaCarga = lista.FechaCarga,
                FechaCargaTexto = lista.FechaCargaTexto,
                FechaCargaDiaTexto = lista.FechaCargaDiaTexto,
                HorarioCargaTexto = lista.HorarioCargaTexto,
                FechaAlarma = lista.FechaAlarma,
                FechaAlarmaTexto = lista.FechaAlarmaTexto,
                FechaResolucion = lista.FechaResolucion,
                FechaResolucionTexto = lista.FechaResolucionTexto,
                IdCliente = row.IdCliente,
                IdVendedor = row.IdVendedor,
                VendedorNombre = row.VendedorNombre,
                Descripcion = row.Descripcion,
                Solucion = row.Solucion,
                IdUsuarioResolvio = row.IdUsuarioResolvio,
                UsuarioResolvio = row.UsuarioResolvio
            };
        }

        private static VMPendienteAdjunto MapaAdjunto(AdjuntoRow row)
        {
            return new VMPendienteAdjunto
            {
                Id = row.Id,
                Nombre = row.NombreOriginal,
                Extension = row.Extension,
                TamanoBytes = row.TamanoBytes,
                Fecha = row.Fecha.ToString("dd/MM/yyyy HH:mm"),
                EsImagen = EsImagen(row.ContentType, row.Extension),
                Url = "/Pendientes/VerAdjunto?id=" + row.Id
            };
        }

        private static string NombreVisible(ActividadRow row)
        {
            if (string.Equals(row.Tipo, "Cliente", StringComparison.OrdinalIgnoreCase))
                return string.IsNullOrWhiteSpace(row.ClienteNombre) ? "—" : row.ClienteNombre;
            if (string.Equals(row.Tipo, "Vendedor", StringComparison.OrdinalIgnoreCase))
                return string.IsNullOrWhiteSpace(row.VendedorNombre) ? "—" : row.VendedorNombre;
            return "—";
        }

        private static string VacioGuion(string v)
        {
            return string.IsNullOrWhiteSpace(v) ? "—" : v;
        }

        private static string NormalizarTipo(string tipo)
        {
            tipo = (tipo ?? "").Trim();
            if (tipo.Equals("Cliente", StringComparison.OrdinalIgnoreCase)) return "Cliente";
            if (tipo.Equals("Vendedor", StringComparison.OrdinalIgnoreCase)) return "Vendedor";
            return "Interno";
        }

        private static string NormalizarPrioridad(string p)
        {
            p = (p ?? "").Trim();
            if (p.Equals("Alta", StringComparison.OrdinalIgnoreCase)) return "Alta";
            if (p.Equals("Baja", StringComparison.OrdinalIgnoreCase)) return "Baja";
            return "Media";
        }

        private static string NormalizarEstado(string e)
        {
            e = (e ?? "").Trim();
            if (e.Equals("En proceso", StringComparison.OrdinalIgnoreCase) || e.Equals("Enproceso", StringComparison.OrdinalIgnoreCase))
                return "En proceso";
            if (e.Equals("Solucionado", StringComparison.OrdinalIgnoreCase))
                return "Solucionado";
            return "Pendiente";
        }

        private static string Cortar(string v, int max)
        {
            if (string.IsNullOrWhiteSpace(v))
                return null;
            v = v.Trim();
            return v.Length <= max ? v : v.Substring(0, max);
        }

        private static string CarpetaAdjuntos()
        {
            var raiz = HostingEnvironment.MapPath("~/App_Data/PendientesAdjuntos");
            if (string.IsNullOrWhiteSpace(raiz))
                raiz = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "App_Data", "PendientesAdjuntos");
            Directory.CreateDirectory(raiz);
            return raiz;
        }

        private static bool ExtPermitida(string ext)
        {
            switch ((ext ?? "").ToLowerInvariant())
            {
                case ".jpg":
                case ".jpeg":
                case ".png":
                case ".gif":
                case ".webp":
                case ".bmp":
                case ".pdf":
                    return true;
                default:
                    return false;
            }
        }

        private static bool EsImagen(string contentType, string ext)
        {
            if (!string.IsNullOrEmpty(contentType) && contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                return true;
            switch ((ext ?? "").ToLowerInvariant())
            {
                case ".jpg":
                case ".jpeg":
                case ".png":
                case ".gif":
                case ".webp":
                case ".bmp":
                    return true;
                default:
                    return false;
            }
        }
    }
}

namespace Sistema_David.Models.Modelo
{
    public partial class VMPendienteGuardar
    {
        internal string _clienteNombre;
        internal string _clienteDni;
        internal string _clienteDireccion;
        internal string _clienteTelefono;
        internal string _vendedorNombre;

        internal string ClienteNombreSnapshot() { return _clienteNombre; }
        internal string ClienteDniSnapshot() { return _clienteDni; }
        internal string ClienteDireccionSnapshot() { return _clienteDireccion; }
        internal string ClienteTelefonoSnapshot() { return _clienteTelefono; }
        internal string VendedorNombreSnapshot() { return _vendedorNombre; }
    }
}
