/*
  005 — Histórico de movimientos de ventas de electrodomésticos.
  Ejecutar en la base del sistema (SQL Server). Idempotente.

  Tabla: dbo.Ventas_Electrodomesticos_Historial
  Guarda cada cambio de la venta: alta, cobros, recargos/intereses,
  ediciones, reprogramación, cobrador, estado, WhatsApp, etc.
*/

IF NOT EXISTS (
    SELECT 1
    FROM sys.tables
    WHERE name = N'Ventas_Electrodomesticos_Historial'
      AND schema_id = SCHEMA_ID(N'dbo')
)
BEGIN
    CREATE TABLE dbo.Ventas_Electrodomesticos_Historial
    (
        Id             INT IDENTITY(1,1) NOT NULL,
        IdVenta        INT NULL,
        IdCuota        INT NULL,
        UsuarioCambio  INT NOT NULL,
        FechaCambio    DATETIME NOT NULL
            CONSTRAINT DF_VEH_FechaCambio DEFAULT (GETDATE()),
        Campo          VARCHAR(255) NULL,
        ValorAnterior  VARCHAR(2000) NULL,
        ValorNuevo     VARCHAR(2000) NULL,
        Observacion    VARCHAR(2000) NULL,
        CONSTRAINT PK_Ventas_Electrodomesticos_Historial PRIMARY KEY CLUSTERED (Id)
    );
END
GO

IF COL_LENGTH(N'dbo.Ventas_Electrodomesticos_Historial', N'IdVenta') IS NULL
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial ADD IdVenta INT NULL;

IF COL_LENGTH(N'dbo.Ventas_Electrodomesticos_Historial', N'IdCuota') IS NULL
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial ADD IdCuota INT NULL;

IF COL_LENGTH(N'dbo.Ventas_Electrodomesticos_Historial', N'UsuarioCambio') IS NULL
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial ADD UsuarioCambio INT NOT NULL CONSTRAINT DF_VEH_UsuarioCambio DEFAULT (0);

IF COL_LENGTH(N'dbo.Ventas_Electrodomesticos_Historial', N'FechaCambio') IS NULL
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial ADD FechaCambio DATETIME NOT NULL CONSTRAINT DF_VEH_FechaCambio2 DEFAULT (GETDATE());

IF COL_LENGTH(N'dbo.Ventas_Electrodomesticos_Historial', N'Campo') IS NULL
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial ADD Campo VARCHAR(255) NULL;

IF COL_LENGTH(N'dbo.Ventas_Electrodomesticos_Historial', N'ValorAnterior') IS NULL
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial ADD ValorAnterior VARCHAR(2000) NULL;

IF COL_LENGTH(N'dbo.Ventas_Electrodomesticos_Historial', N'ValorNuevo') IS NULL
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial ADD ValorNuevo VARCHAR(2000) NULL;

IF COL_LENGTH(N'dbo.Ventas_Electrodomesticos_Historial', N'Observacion') IS NULL
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial ADD Observacion VARCHAR(2000) NULL;
GO

/* Ampliar textos para el detalle completo (si la tabla ya existía corta). */
IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Ventas_Electrodomesticos_Historial')
      AND name = N'ValorAnterior'
      AND max_length > 0
      AND max_length < 2000
)
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial ALTER COLUMN ValorAnterior VARCHAR(2000) NULL;

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Ventas_Electrodomesticos_Historial')
      AND name = N'ValorNuevo'
      AND max_length > 0
      AND max_length < 2000
)
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial ALTER COLUMN ValorNuevo VARCHAR(2000) NULL;

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Ventas_Electrodomesticos_Historial')
      AND name = N'Observacion'
      AND max_length > 0
      AND max_length < 2000
)
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial ALTER COLUMN Observacion VARCHAR(2000) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_VEH_VE')
   AND OBJECT_ID(N'dbo.Ventas_Electrodomesticos', N'U') IS NOT NULL
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial
        ADD CONSTRAINT FK_VEH_VE
        FOREIGN KEY (IdVenta) REFERENCES dbo.Ventas_Electrodomesticos (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_VEH_VEC')
   AND OBJECT_ID(N'dbo.Ventas_Electrodomesticos_Cuotas', N'U') IS NOT NULL
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial
        ADD CONSTRAINT FK_VEH_VEC
        FOREIGN KEY (IdCuota) REFERENCES dbo.Ventas_Electrodomesticos_Cuotas (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_VEH_User')
   AND OBJECT_ID(N'dbo.Usuarios', N'U') IS NOT NULL
    ALTER TABLE dbo.Ventas_Electrodomesticos_Historial
        ADD CONSTRAINT FK_VEH_User
        FOREIGN KEY (UsuarioCambio) REFERENCES dbo.Usuarios (Id);
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_VEH_IdVenta_Fecha'
      AND object_id = OBJECT_ID(N'dbo.Ventas_Electrodomesticos_Historial')
)
    CREATE NONCLUSTERED INDEX IX_VEH_IdVenta_Fecha
        ON dbo.Ventas_Electrodomesticos_Historial (IdVenta, FechaCambio DESC);

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_VEH_IdCuota_Fecha'
      AND object_id = OBJECT_ID(N'dbo.Ventas_Electrodomesticos_Historial')
)
    CREATE NONCLUSTERED INDEX IX_VEH_IdCuota_Fecha
        ON dbo.Ventas_Electrodomesticos_Historial (IdCuota, FechaCambio DESC);
GO

PRINT '005 Ventas electro historial — completado.';
