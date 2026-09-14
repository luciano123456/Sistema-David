/*
  004 — Productos: solicitudes de cambio (rol Comprobantes) + historial de auditoría.
  Idempotente. El modelo también crea las tablas al primer uso si faltan.
*/

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
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Productos_Historial' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE dbo.Productos_Historial
    (
        Id              INT IDENTITY(1,1) NOT NULL,
        IdProducto      INT NULL,
        IdSolicitud     INT NULL,
        Fecha           DATETIME NOT NULL CONSTRAINT DF_Productos_Historial_Fecha DEFAULT (GETDATE()),
        IdUsuario       INT NOT NULL,
        Tipo            NVARCHAR(40) NOT NULL,
        NombreProducto  NVARCHAR(300) NULL,
        Resumen         NVARCHAR(MAX) NULL,
        DiffJson        NVARCHAR(MAX) NULL,
        Origen          NVARCHAR(80) NULL,
        EstadoResultado NVARCHAR(20) NULL,
        Comentario      NVARCHAR(800) NULL,
        IdUsuarioSolicita INT NULL,
        IdUsuarioResuelve INT NULL,
        CONSTRAINT PK_Productos_Historial PRIMARY KEY CLUSTERED (Id)
    );

    CREATE NONCLUSTERED INDEX IX_Productos_Historial_Producto
        ON dbo.Productos_Historial (IdProducto, Fecha DESC);

    CREATE NONCLUSTERED INDEX IX_Productos_Historial_Fecha
        ON dbo.Productos_Historial (Fecha DESC);
END
GO

IF COL_LENGTH(N'dbo.Productos_Historial', N'IdUsuarioSolicita') IS NULL
    ALTER TABLE dbo.Productos_Historial ADD IdUsuarioSolicita INT NULL;
IF COL_LENGTH(N'dbo.Productos_Historial', N'IdUsuarioResuelve') IS NULL
    ALTER TABLE dbo.Productos_Historial ADD IdUsuarioResuelve INT NULL;
IF COL_LENGTH(N'dbo.Productos_Historial', N'Origen') IS NOT NULL
    ALTER TABLE dbo.Productos_Historial ALTER COLUMN Origen NVARCHAR(80) NULL;
GO

PRINT 'Productos solicitudes / historial OK.';
