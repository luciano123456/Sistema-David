/*
  002 — Productos: actualización módulo catálogo / WhatsApp / financiación.
  Ejecutar en la base del sistema (SQL Server). Idempotente.
  Luego: actualizar modelo desde BD en Visual Studio (EDMX) si hace falta.
*/

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Productos') AND name = 'Marca')
    ALTER TABLE dbo.Productos ADD Marca VARCHAR(255) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Productos') AND name = 'Modelo')
    ALTER TABLE dbo.Productos ADD Modelo VARCHAR(255) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Productos') AND name = 'Color')
    ALTER TABLE dbo.Productos ADD Color VARCHAR(255) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Productos') AND name = 'Accesorios')
    ALTER TABLE dbo.Productos ADD Accesorios VARCHAR(500) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Productos') AND name = 'Caracteristicas')
    ALTER TABLE dbo.Productos ADD Caracteristicas NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Productos') AND name = 'Descripcion')
    ALTER TABLE dbo.Productos ADD Descripcion NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Productos') AND name = 'FinConEntrega')
    ALTER TABLE dbo.Productos ADD FinConEntrega NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Productos') AND name = 'FinSinEntrega')
    ALTER TABLE dbo.Productos ADD FinSinEntrega NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Productos') AND name = 'FinSemanal')
    ALTER TABLE dbo.Productos ADD FinSemanal NVARCHAR(500) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Productos') AND name = 'FinQuincenal')
    ALTER TABLE dbo.Productos ADD FinQuincenal NVARCHAR(500) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Productos') AND name = 'FinMensual')
    ALTER TABLE dbo.Productos ADD FinMensual NVARCHAR(500) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Productos') AND name = 'ImagenesAdicionales')
    ALTER TABLE dbo.Productos ADD ImagenesAdicionales NVARCHAR(MAX) NULL;

GO

PRINT 'Actualización Productos completada.';
