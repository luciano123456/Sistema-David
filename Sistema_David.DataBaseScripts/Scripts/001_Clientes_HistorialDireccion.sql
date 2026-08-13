/*
  001 — Historial de cambios de dirección / ubicación del cliente.
  Ejecutar una vez en la base del sistema. Idempotente.
*/

-- Historial de cambios de dirección / ubicación del cliente
-- Ejecutar una vez en la base de datos del sistema.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Clientes_HistorialDireccion' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE dbo.Clientes_HistorialDireccion
    (
        Id                INT IDENTITY(1,1) NOT NULL,
        IdCliente         INT NOT NULL,
        DireccionAnterior NVARCHAR(500) NULL,
        DireccionNueva    NVARCHAR(500) NULL,
        LatitudAnterior   NVARCHAR(50) NULL,
        LatitudNueva      NVARCHAR(50) NULL,
        LongitudAnterior  NVARCHAR(50) NULL,
        LongitudNueva     NVARCHAR(50) NULL,
        IdUsuario         INT NULL,
        FechaCambio       DATETIME NOT NULL CONSTRAINT DF_Clientes_HistorialDireccion_FechaCambio DEFAULT (GETDATE()),
        Origen            NVARCHAR(50) NULL,
        CONSTRAINT PK_Clientes_HistorialDireccion PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_Clientes_HistorialDireccion_Clientes FOREIGN KEY (IdCliente) REFERENCES dbo.Clientes (Id),
        CONSTRAINT FK_Clientes_HistorialDireccion_Usuarios FOREIGN KEY (IdUsuario) REFERENCES dbo.Usuarios (Id)
    );

    CREATE NONCLUSTERED INDEX IX_Clientes_HistorialDireccion_IdCliente
        ON dbo.Clientes_HistorialDireccion (IdCliente, FechaCambio DESC);
END
GO
