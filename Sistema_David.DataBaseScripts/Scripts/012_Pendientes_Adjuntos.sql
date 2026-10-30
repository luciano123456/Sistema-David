/*
  012 — Adjuntos opcionales de pendientes (fotos, capturas, comprobantes).
  Los archivos viven en disco (App_Data/PendientesAdjuntos). Acá solo va el índice.
  Requiere 009_Pendientes_Actividades.sql.
  Idempotente.
*/

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Pendientes_Adjuntos' AND schema_id = SCHEMA_ID(N'dbo'))
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
        CONSTRAINT FK_Pendientes_Adjuntos_Actividad
            FOREIGN KEY (IdActividad) REFERENCES dbo.Pendientes_Actividades (Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_Pendientes_Adjuntos_Actividad
        ON dbo.Pendientes_Adjuntos (IdActividad, Fecha DESC);
END
GO

PRINT '012 Pendientes_Adjuntos OK.';
GO
