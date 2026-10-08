/*
  006 — Sesión de imágenes y documentos de cada cliente.
  Los archivos viven en disco (App_Data/ClientesAdjuntos). Acá solo va el índice.
  La app también crea la tabla sola la primera vez que se usa. Idempotente.
*/

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Clientes_Adjuntos' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
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
        ON dbo.Clientes_Adjuntos (IdCliente, Fecha DESC);
END
GO
