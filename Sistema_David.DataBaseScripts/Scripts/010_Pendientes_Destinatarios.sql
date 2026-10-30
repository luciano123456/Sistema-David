/*
  010 — Destinatarios de alarma por actividad (uno o varios usuarios).
  Cada fila es independiente: detener / posponer no afecta a los demás.
  Requiere 009_Pendientes_Actividades.sql.
  Idempotente.
*/

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Pendientes_Destinatarios' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE dbo.Pendientes_Destinatarios
    (
        Id            INT IDENTITY(1,1) NOT NULL,
        IdActividad   INT NOT NULL,
        IdUsuario     INT NOT NULL,
        FechaAlarma   DATETIME NULL,
        Silenciada    BIT NOT NULL CONSTRAINT DF_Pendientes_Destinatarios_Silenciada DEFAULT (0),
        FechaPospuesta DATETIME NULL,
        CONSTRAINT PK_Pendientes_Destinatarios PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_Pendientes_Destinatarios_Actividad
            FOREIGN KEY (IdActividad) REFERENCES dbo.Pendientes_Actividades (Id) ON DELETE CASCADE,
        CONSTRAINT UQ_Pendientes_Destinatarios UNIQUE (IdActividad, IdUsuario)
    );

    CREATE NONCLUSTERED INDEX IX_Pendientes_Destinatarios_Usuario
        ON dbo.Pendientes_Destinatarios (IdUsuario, Silenciada, FechaAlarma);

    CREATE NONCLUSTERED INDEX IX_Pendientes_Destinatarios_Alarma
        ON dbo.Pendientes_Destinatarios (Silenciada, FechaAlarma)
        INCLUDE (IdActividad, IdUsuario);
END
GO

PRINT '010 Pendientes_Destinatarios OK.';
GO
