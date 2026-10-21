/*
  008 — Segundo celular del cliente (ticket #0022).
  Columna dbo.Clientes.Telefono2, mismo tipo que Telefono (varchar 20).
  Obligatorio en el alta desde la app; NULL en filas viejas.
  WhatsApp sigue usando Telefono. Idempotente.
*/

IF COL_LENGTH(N'dbo.Clientes', N'Telefono2') IS NULL
BEGIN
    ALTER TABLE dbo.Clientes
        ADD Telefono2 VARCHAR(20) NULL;
END
GO
