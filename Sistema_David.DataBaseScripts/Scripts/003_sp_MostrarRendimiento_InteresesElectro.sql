/*
  003 — Ajuste SP sp_MostrarRendimiento (rama ELECTRO – RECARGOS/INTERESES).

  Problemas que corrige:
  - MetodoPago 'RECARGO' → 'INTERÉS'
  - Descripción 'Recargo...' → 'Interes...' (para totales)
  - IdCobrador = UsuarioCreacion del interés (antes iba 0)
  - Filtro de usuario: vendedor de la venta OR quien registró el interés OR cobrador asignado

  El backend ya completa estos casos en C# (AsegurarInteresesElectroEnRendimiento),
  pero conviene alinear el SP en BD (Test y Producción).
*/

-- Fragmento a reemplazar en la rama UNION de recargos electro:
/*
    SELECT
        R.Id,
        VE.IdVendedor,
        C.Nombre + ' ' + C.Apellido AS Cliente,
        VE.Id AS IdVenta,
        0 AS CapitalInicial,
        0 AS Venta,
        0 AS Cobro,
        R.ImporteCalculado AS Interes,
        VE.Restante AS CapitalFinal,
        R.Fecha AS Fecha,
        CU.FechaVencimiento AS ProximoCobro,
        'Interes Electrodomesticos #' + CAST(VE.Id AS VARCHAR)
            + ' - Cuota ' + CAST(CU.NumeroCuota AS VARCHAR) AS Descripcion,
        'INTERÉS' AS MetodoPago,
        3 AS IdTipoNegocio,
        0 AS whatssap,
        0 AS ActualizoUbicacion,
        NULL AS CuentaBancaria,
        VE.FechaVencimiento as FechaLimite,
        ISNULL(R.UsuarioCreacion, 0) as IdCobrador
    FROM Ventas_Electrodomesticos_Cuotas_Recargos R
    INNER JOIN Ventas_Electrodomesticos_Cuotas CU ON CU.Id = R.IdCuota
    INNER JOIN Ventas_Electrodomesticos VE ON VE.Id = CU.IdVenta
    INNER JOIN Clientes C ON C.Id = VE.IdCliente
    WHERE
        (@cobranzas = 1)
        AND (
            @idVendedor = -1
            OR VE.IdVendedor = @idVendedor
            OR ISNULL(R.UsuarioCreacion, 0) = @idVendedor
            OR ISNULL(VE.IdCobrador, 0) = @idVendedor
        )
        AND (3 = @idTipoNegocio OR @idTipoNegocio = -1)
        AND R.Fecha >= @fechadesde
        AND R.Fecha < DATEADD(DAY, 1, @fechahasta)
*/
