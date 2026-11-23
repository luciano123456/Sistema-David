/*
  009 — Pendientes y problemas: tabla principal de actividades.
  Un solo módulo interno (Cliente / Vendedor / Interno).
  Idempotente. Ejecutar en SSMS contra Test o Producción, en orden numérico.
*/

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Pendientes_Actividades' AND schema_id = SCHEMA_ID(N'dbo'))
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

    CREATE NONCLUSTERED INDEX IX_Pendientes_Actividades_Estado
        ON dbo.Pendientes_Actividades (Estado, Fecha DESC, Id DESC);

    CREATE NONCLUSTERED INDEX IX_Pendientes_Actividades_Responsable
        ON dbo.Pendientes_Actividades (IdResponsable, Estado);

    CREATE NONCLUSTERED INDEX IX_Pendientes_Actividades_Tipo
        ON dbo.Pendientes_Actividades (Tipo, Estado);
END
GO

PRINT '009 Pendientes_Actividades OK.';
GO
