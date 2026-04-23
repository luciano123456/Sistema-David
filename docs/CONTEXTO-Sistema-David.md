# Contexto del proyecto — Sistema David

Documento vivo para alinear trabajo durante el año. **Actualizarlo** cuando cambien flujos, rutas o decisiones importantes.

---

## Qué es este repo

- Aplicación **ASP.NET MVC** (`.csproj` en `Sistema_David/`), Entity Framework, vistas Razor, bundles jQuery/Bootstrap clásicos en layout.
- **Layout**: `Views/Shared/_Layout.cshtml` incluye `Views/Utils/Modals.cshtml` (`exitoModal`, `ErrorModal`) y el navbar carga `JavaScript/Utils/Utils.js` (`exitoModal()`, `errorModal()`).

---

## Módulo Cobros — ventas electrodomésticos

### Archivos principales

| Área | Ruta |
|------|------|
| Vista pantalla cobros | `Sistema_David/Views/Ventas_Electrodomesticos/Cobros.cshtml` |
| Modal cobro / partial | `Sistema_David/Views/Ventas_Electrodomesticos/_CobroModal_Partial.cshtml` |
| Lógica cobros + tabla + acordeón | `Sistema_David/JavaScript/Ventas_Electrodomesticos_Cobros.js` |
| Lógica modal cobro / registrar pago / reprogramar | `Sistema_David/JavaScript/_CobroModal_Partial.js` |
| Estilos electro | `Sistema_David/Estilos/Ventas_Electrodomesticos.css` |
| API / acciones | `Sistema_David/Controllers/VentasElectrodomesticosController.cs` |
| Modelo negocio | `Sistema_David/Models/Ventas_ElectrodomesticosModel.cs` |
| ViewModels historial | `Sistema_David/Models/Modelo/VMVentasElectrodomesticos.cs` |

### Objeto global `VC`

- Namespace de funciones en `Ventas_Electrodomesticos_Cobros.js` (cargar tabla, detalle venta, toasts, FAB reprogramación, etc.).
- **`VC.toast(msg, type)`** — toasts Bootstrap 5 en contenedor fijo (`toastContainerBR`). Tipos usados: `success`, `danger`, `warn`, `info`.

### Refresco de la grilla tras cobrar / reprogramar

- **`actualizarGrillaCobros()`** en `_CobroModal_Partial.js` es **`async`**: si existe `VC.cargarTabla`, hace **`await VC.cargarTabla()`** y **`await VC.cargarCobrosPendientes()`** para que la lista termine de actualizarse (cuotas que salen del rango de fechas del filtro “desaparecen” al recargar).

### Reprogramar fecha de cobro

#### Una cuota (modal de cobro, importe 0)

- Endpoint: **`POST /Ventas_Electrodomesticos/ReprogramarCobroCuota`**
- Cuerpo: **`application/x-www-form-urlencoded`** — parámetros `idCuota`, `nuevaFecha`, `observacion` (alineado con `ReprogramarCobroCuota(int idCuota, DateTime nuevaFecha, string observacion)` en el controller).
- Tras éxito: cerrar modal → **`await actualizarGrillaCobros()`** → notificación de éxito con fecha formateada.

#### Varias cuotas (pantalla Cobros)

- Selección con checkboxes en tabla de **cuotas pendientes** del acordeón (clases `.vc-reprog-chk`, header `.vc-reprog-chk-all`).
- Estado global: **`cuotasReprogSel`** (`Map`), mínimo **`VC_REPROG_MIN_SEL === 2`** para mostrar FAB.
- FAB: `#vcReprogFabWrap` / `#vcReprogFabBtn`; modal masivo `#modalReprogCuotasMasivo`; confirmación `#btnVcReprogMasivoConfirmar`.
- Mismo endpoint por cuota, en bucle, **form-urlencoded**.
- Tras confirmar: cerrar modal, limpiar mapa, **`await VC.cargarTabla()`**, luego toasts según éxito parcial/total/error.

### Notificaciones (reprogramar y errores)

- Helpers en **`_CobroModal_Partial.js`**: **`notificarExitoCobrosUi`**, **`notificarErrorCobrosUi`** — orden: `VC.toast` → `showToast` (mismo partial) → `exitoModal` / `errorModal` si no hay toast disponible.
- Reprogramación masiva en **`Ventas_Electrodomesticos_Cobros.js`**: mensajes con fecha **`DD/MM/YYYY`**; fallo total o fallo al refrescar puede disparar también **`errorModal`**.

### Cache-busting (scripts)

- Revisar `?v=` en `Cobros.cshtml`, `_CobroModal_Partial.cshtml` y subir versión cuando se toque JS/CSS crítico.

---

## Historial de ventas — `ListarHistorial`

- Implementación en **`Ventas_ElectrodomesticosModel.ListarHistorial`** envuelta en **`try/catch`**.
- En error devuelve **`VM_HistorialVentasResp`** con **`Filas`** vacías, **Kpis** en cero y **`MensajeError`** descriptivo.
- **`GetHistorialVentas`** en el controller comprueba **`MensajeError`** y responde JSON `success: false` con `message` antes de devolver filas.
- Null-safety en filas: **`ClienteFecha`** y **`Vendedor`** si no hay cliente / usuario vinculado.

---

## Roles (referencia rápida)

- En historial, filtro por **estado** de venta solo para roles **1 (admin)** y **4 (comprobantes)** según lógica en `ListarHistorial`.
- FAB “Asignar cobrador” y visibilidad de secciones en Cobros dependen de **`userSession.IdRol`** en JS (coordinar con reglas de negocio si cambian).

---

## Cómo seguir usando este archivo

1. Tras cada feature o fix relevante, añadir una subsección breve (fecha + qué + archivos).
2. Si se duplica lógica (ej. historial vs cobros), anotar dónde está cada copia para mantener consistencia.
3. Mantener tabla de rutas/endpoints cuando se agreguen acciones MVC nuevas.

---

*Última actualización de contenido: reprogramación (individual/masiva), toasts/modales, refresh async de grilla, `ListarHistorial` + `MensajeError`, rutas de archivos clave.*
