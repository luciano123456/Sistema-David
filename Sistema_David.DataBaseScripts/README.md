# Sistema_David.DataBaseScripts

Capa de scripts SQL del proyecto (igual que en OroAmbiental).  
Ejecutar en SQL Server **en orden numérico**.

| Script | Descripción |
|--------|-------------|
| `001_Clientes_HistorialDireccion.sql` | Tabla historial de cambios de dirección/ubicación de clientes |
| `002_Productos_ModuloActualizacion.sql` | Columnas extendidas de productos (marca, modelo, financiación, imágenes) |
| `003_sp_MostrarRendimiento_InteresesElectro.sql` | Ajuste SP rendimiento: intereses electro como INTERÉS + filtro por operador |

## Uso

1. Abrí SSMS contra Test o Producción.
2. Corré los `.sql` de `Scripts/` en orden (`001_`, `002_`, …).
3. Los scripts son idempotentes cuando aplica (`IF NOT EXISTS` / comentarios de patch).

## Convención

- Nombre: `NNN_DescripcionCorta.sql` (tres dígitos).
- Un cambio de esquema o SP por script.
- Actualizá esta tabla al agregar uno nuevo.
