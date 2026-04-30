# Handoff agente — Clientes, Rendimiento, electro (abril 2026)

Resumen para retomar el trabajo sin perder contexto. **Actualizar** este archivo si cambian decisiones o rutas.

---

## Rendimiento (diario)

- **Columnas** `Vendedor` y `Cobrador` (antes de Descripción). SP `sp_MostrarRendimiento` devuelve entre otras `IdCobrador` en cobranzas electro.
- **Backend**: `RendimientoModel.MostrarRendimiento` → `EnriquecerRendimientoDespuesDeSp` resuelve nombres (Ventas / electro, InformacionVentas, pagos electro `UsuarioCreacion`, usuarios).
- **VM**: `VMRendimiento` — `Vendedor`, `IdCobrador`, `UsuarioCobro`.
- **Front**: `JavaScript/Rendimiento.js` columnas + `obtenerNombreColumnaRendimiento`; vista `Views/Rendimiento/Index.cshtml` thead.

---

## Electro — cobrador en cobranzas

- `Ventas_ElectrodomesticosModel`: helper que completa `CobradorNombre` desde `Ventas_Electrodomesticos_Pagos.UsuarioCreacion` (último pago aplicable) en listados de cuotas/cobros pendientes.

---

## Clientes — saldos (modelo)

- `ClientesModel`: consultas de listado / detalle suman **indumentaria + electro** (`SaldoIndumentaria`, `SaldoElectrodomestico`, `SaldoTotal`).
- **VM**: `VMCliente` con esas propiedades.

---

## Clientes — pantalla (UI + JS)

### Referencia de estilo

- Alineado a **Rendimiento** / **Ventas_Electrodomesticos Cobros**: `card-glass`, filtros avanzados, columnas con `Utils.js` (`inicializarEncabezadoColumnas`, `inicializarFiltrosColumnas`).
- **Select2**: solo por **CDN en `@section scripts`** (orden: después del jQuery del `_Layout`), **igual patrón que** `Views/Ventas_Electrodomesticos/Cobros.cshtml`. **No** cargar select2 por script dinámico.
- **Problema resuelto**: no poner otro `jquery-3.5.1` en el body de la vista antes del bundle del layout (select2 quedaba en otra instancia de jQuery).

### Archivos clave

| Área | Ruta |
|------|------|
| Vista | `Sistema_David/Views/Clientes/Index.cshtml` |
| JS | `Sistema_David/JavaScript/Clientes.js` |
| CSS | `Sistema_David/Estilos/Clientes.css` |
| API listado | `ClientesController.Listar` |
| Totales KPI (admin) | `ClientesController.TotalesSaldosCartera` → `ClientesModel.TotalesSaldosCartera` (`VMClientesTotalesCartera` en `VMCliente.cs`) |

### Comportamiento acordado

- **Limpiar** (filtros avanzados): solo limpia campos + `localStorage` de filtros; **no** llama `aplicarFiltros()`. Aplicar sigue siendo con el botón **Aplicar**.
- **KPI de los 3 saldos arriba**: totales **globales** de cartera (suma `Restante` en `Ventas` + `Ventas_Electrodomesticos`), **no** cambian con filtros de la grilla. Solo **admin** (`IdRol == 1`).
- **Saldos en celdas**: JSON puede traer números como string o camelCase; `pickNumCliente` + columnas con `data: function(row)…` en `Clientes.js`. **`formatNumber`** en `Utils.js` acepta string/número.
- **`aplicarFiltros`**: destruir tabla con `$.fn.DataTable.isDataTable('#grdClientes')`; para roles no admin / no comprobantes, `idVendedor` forzado a `userSession.Id` como en la carga inicial.
- **Fila seleccionada**: clase `cliente-row-selected`; sombra **solo** en `td:first-child`; `cursor: pointer` en filas (no `child` responsive); click no dispara en botones/enlaces/map/editar.
- **Carga**: overlay `#globalLoading` + `showGlobalLoadingClientes` / `hideGlobalLoadingClientes` (patrón tipo Rendimiento).

### Modales Límite y WhatsApp

- Markup en `Index.cshtml`: clase `cc-modal-shell`, **sin** botón X (solo Cancelar/Cerrar + acción principal).
- **Cancelar/Cerrar**: `onclick="jQuery('#modalLimite').modal('hide');"` (y análogo para `#modalWhatssap`) — Bootstrap **3** del layout (`data-dismiss` solo no bastaba cuando el HTML estaba mal anidado).
- Vista envuelta en **`<div class="ve-dark clientes-root">`** (no usar segundo `<body>`); modales **dentro** de ese `div` antes del cierre, para HTML válido dentro del `body` del layout.
- Mensajes de error por modal: `#limiteModalMsg`, `#wspModalMsg`.
- Estilos: `Clientes.css` (`.cc-modal-*`, `.cc-modal-footer-actions` con `gap` entre botones).

### Utils — filtros columna “Acciones”

- `inicializarFiltrosColumnas` al final vacía celdas del `tr.filters` cuyo índice **no** está en `configColumns` (evita texto “Acciones” duplicado en subencabezado).

### Cache busting (vista)

- Revisar en `Index.cshtml` `@section scripts`: `Clientes.js?v=…`, `Utils.js?v=…` si se tocan esos archivos.

---

## Pendiente / ojo

- Modal **importación masiva** en Clientes sigue con markup antiguo (`data-bs-dismiss`, etc.); unificar a BS3 + estilo si se desea.
- **Dropdown** “Config. columnas” usa `data-toggle="dropdown"` (BS3); si en algún momento cargan BS5 JS en esta vista, revisar compatibilidad.

---

## Referencia rápida Cobros (select2)

- `Views/Ventas_Electrodomesticos/Cobros.cshtml` `@section scripts`: DataTables → select2 cdnjs → JS página.
- `Ventas_Electrodomesticos_Cobros.js`: `$("#f_zona").select2({…})`, etc.
