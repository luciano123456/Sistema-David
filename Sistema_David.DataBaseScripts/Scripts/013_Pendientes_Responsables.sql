/*
  013 — Varios responsables por actividad.
  IdResponsable en Pendientes_Actividades sigue siendo la primera persona elegida.
  El resto queda en esta tabla. Idempotente. Requiere 009.
*/

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Pendientes_Responsables' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE dbo.Pendientes_Responsables
    (
        Id          INT IDENTITY(1,1) NOT NULL,
        IdActividad INT NOT NULL,
        IdUsuario   INT NOT NULL,
        CONSTRAINT PK_Pendientes_Responsables PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_Pendientes_Responsables_Actividad
            FOREIGN KEY (IdActividad) REFERENCES dbo.Pendientes_Actividades (Id) ON DELETE CASCADE,
        CONSTRAINT UQ_Pendientes_Responsables UNIQUE (IdActividad, IdUsuario)
    );

    CREATE NONCLUSTERED INDEX IX_Pendientes_Responsables_Usuario
        ON dbo.Pendientes_Responsables (IdUsuario, IdActividad);
END
GO

INSERT INTO dbo.Pendientes_Responsables (IdActividad, IdUsuario)
SELECT a.Id, a.IdResponsable
FROM dbo.Pendientes_Actividades a
WHERE a.IdResponsable > 0
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.Pendientes_Responsables pr
      WHERE pr.IdActividad = a.Id
  );
GO

PRINT '013 Pendientes_Responsables OK.';
GO
