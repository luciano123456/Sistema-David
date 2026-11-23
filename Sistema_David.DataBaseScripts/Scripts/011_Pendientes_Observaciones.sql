/*
  011 — Seguimiento de actividades (observaciones).
  Requiere 009_Pendientes_Actividades.sql.
  Idempotente.
*/

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Pendientes_Observaciones' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE dbo.Pendientes_Observaciones
    (
        Id            INT IDENTITY(1,1) NOT NULL,
        IdActividad   INT NOT NULL,
        Texto         NVARCHAR(MAX) NOT NULL,
        IdUsuario     INT NOT NULL,
        Fecha         DATETIME NOT NULL CONSTRAINT DF_Pendientes_Observaciones_Fecha DEFAULT (GETDATE()),
        CONSTRAINT PK_Pendientes_Observaciones PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_Pendientes_Observaciones_Actividad
            FOREIGN KEY (IdActividad) REFERENCES dbo.Pendientes_Actividades (Id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_Pendientes_Observaciones_Actividad
        ON dbo.Pendientes_Observaciones (IdActividad, Fecha DESC, Id DESC);
END
GO

PRINT '011 Pendientes_Observaciones OK.';
GO
