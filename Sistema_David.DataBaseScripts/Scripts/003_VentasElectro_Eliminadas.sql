/*
  003 — Ventas electro: archivo de ventas eliminadas (soft delete).
  Ejecutar en la base del sistema (SQL Server). Idempotente.
  Luego: actualizar EDMX desde BD si hace falta (ya incluido en repo).
*/

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Ventas_Electrodomesticos') AND name = 'Eliminada')
    ALTER TABLE dbo.Ventas_Electrodomesticos ADD Eliminada BIT NOT NULL CONSTRAINT DF_VE_Eliminada DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Ventas_Electrodomesticos') AND name = 'MotivoEliminacion')
    ALTER TABLE dbo.Ventas_Electrodomesticos ADD MotivoEliminacion NVARCHAR(500) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Ventas_Electrodomesticos') AND name = 'FechaEliminacion')
    ALTER TABLE dbo.Ventas_Electrodomesticos ADD FechaEliminacion DATETIME NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Ventas_Electrodomesticos') AND name = 'UsuarioEliminacion')
    ALTER TABLE dbo.Ventas_Electrodomesticos ADD UsuarioEliminacion INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Ventas_Electrodomesticos') AND name = 'EstadoAntesEliminacion')
    ALTER TABLE dbo.Ventas_Electrodomesticos ADD EstadoAntesEliminacion VARCHAR(20) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Ventas_Electrodomesticos') AND name = 'StockDevueltoAlArchivar')
    ALTER TABLE dbo.Ventas_Electrodomesticos ADD StockDevueltoAlArchivar BIT NOT NULL CONSTRAINT DF_VE_StockDevueltoArch DEFAULT 0;

GO

PRINT '003 Ventas electro eliminadas — completado.';
