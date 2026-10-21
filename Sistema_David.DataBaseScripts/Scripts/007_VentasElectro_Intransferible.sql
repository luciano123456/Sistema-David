/*
  007 — Ventas electro: cobranza intransferible (candado en Cuotas a cobrar).
  Tabla dbo.Ventas_Electrodomesticos (no dbo.Ventas de indumentaria).
  0 o NULL = transferible (candado abierto). 1 = intransferible (candado cerrado).
  Ejecutar en la base del sistema (SQL Server). Idempotente. No modifica filas existentes.
*/

IF COL_LENGTH(N'dbo.Ventas_Electrodomesticos', N'Intransferible') IS NULL
BEGIN
    ALTER TABLE dbo.Ventas_Electrodomesticos
        ADD Intransferible INT NULL
            CONSTRAINT DF_Ventas_Electrodomesticos_Intransferible DEFAULT (0);
END
GO

IF COL_LENGTH(N'dbo.Ventas_Electrodomesticos', N'Intransferible') IS NOT NULL
   AND NOT EXISTS (
        SELECT 1
        FROM sys.default_constraints dc
        INNER JOIN sys.columns c
            ON c.object_id = dc.parent_object_id
           AND c.column_id = dc.parent_column_id
        WHERE dc.parent_object_id = OBJECT_ID(N'dbo.Ventas_Electrodomesticos')
          AND dc.name = N'DF_Ventas_Electrodomesticos_Intransferible'
          AND c.name = N'Intransferible'
   )
BEGIN
    ALTER TABLE dbo.Ventas_Electrodomesticos
        ADD CONSTRAINT DF_Ventas_Electrodomesticos_Intransferible DEFAULT (0) FOR Intransferible;
END
GO
