# Sistema-David — contexto para el agente (Cursor)

Este archivo resume el proyecto y decisiones recientes para **continuar trabajo** sin perder contexto.

## Stack técnico

- **ASP.NET MVC 5** sobre **.NET Framework** (no hay `Program.cs`).
- **Entity Framework 6** con EDMX (`Models/DB/`).
- Arranque: `Global.asax.cs`, rutas en `App_Start/RouteConfig.cs`.
- Compilar con `dotnet build` puede fallar sin **Visual Studio** (targets `Microsoft.WebApplication.targets`).

## Idioma

- Si el usuario escribe en **español**, responder en español.

## Estructura útil

| Área | Ubicación principal |
|------|---------------------|
| Cobranzas indumentaria | `Sistema_David/Models/CobranzasModel.cs`, `Controllers/CobranzasController.cs`, `JavaScript/Cobranzas.js` |
| Cobros electro | `JavaScript/_CobroModal_Partial.js`, `Views/Ventas_Electrodomesticos/_CobroModal_Partial.cshtml`, `Models/Ventas_ElectrodomesticosModel.cs`, `Controllers/VentasElectrodomesticosController.cs` |
| Rendimiento / “dashboard” listas | `Views/Rendimiento/Index.cshtml`, `JavaScript/Rendimiento.js` |
| Análisis de Rendimiento | `Views/Rendimiento/Analisis.cshtml`, `JavaScript/RendimientoAnalisis.js`, `Models/RendimientoAnalisisModel.cs` |
| Navbar | `Views/Shared/Partials/NavBarLogin.cshtml`, `JavaScript/NavBarLogin.js` |
| Nuevos controladores | Añadir `<Compile Include="Controllers\...">` y vistas `<Content Include="Views\...">` en `Sistema_David/Sistema_David.csproj` |

## Reglas de negocio / código ya acordados

### Cobranzas (`ListaCobranzas`)

- **Cobrador**: solo ventas con `d.idCobrador == idCobradorF` (no mezclar cartera de otros).
- **Filtro “Todos” los cobradores** (`idCobradorF == -1`) y **sin** búsqueda DNI/nombre: solo ventas **sin asignar** (`idCobrador` null o 0); las ya asignadas no entran en la lista general (solo en el cobrador o al filtrar por ese cobrador / buscar cliente).
- **Fechas `FechaCobroDesde` / `FechaCobroHasta`**: solo se aplican cuando **no** hay texto de búsqueda (DNI/nombre) **y** el cobrador es **Todos** (`idCobradorF == -1`). Si hay búsqueda libre o cobrador concreto, el rango de fechas no limita el SQL.
- Rango de día: `fcDesde = FechaCobroDesde.Date`, `fcHastaExcl = FechaCobroHasta.Date.AddDays(1)` sobre `d.FechaCobro`.

### Electro — cobros vs ventas pendientes

- Ventas con `Estado == "Pendiente"` (aún no aceptadas/confirmadas) **no** entran en Cobros / cobros pendientes / transferencias pendientes.
- Al aceptar (`CambiarEstadoVenta` → `Activa`) sí aparecen en cobranzas.
- **Rendimiento** no filtra por ese estado: la venta/cobros siguen visibles para el cálculo.

### Electro — reprogramar fecha de cobro (importe 0 en modal)

- El `<input type="date" id="cb_fecha">` **no** debe llevar `min`/`max` en modo solo reprogramación, para poder elegir cualquier día.
- **Backend** `ReprogramarCobroCuota`: no rechazar por fecha anterior al vencimiento (se quitó esa validación).
- Al cambiar `_CobroModal_Partial.js`, subir `?v=` en el `<script>` del partial.

### Transportes

- El usuario **revirtió** el módulo Transportes (controlador, vista, navbar, Rendimiento, csproj). **No** reintroducir salvo que lo pidan de nuevo.

### Análisis de Rendimiento

- Pantalla `Rendimiento/Analisis`: usa las mismas fechas y filtros de Rendimiento (tipo de negocio, método, cuenta, vendedor seleccionado).
- El score de “más completo” combina ventas, cobros, operaciones, interés y equilibrio vendedor/cobrador.

## Estilo de trabajo (preferencias del usuario)

- Cambios **acotados** al pedido; sin refactors colaterales ni docs markdown no solicitados.
- Ejecutar comandos en el entorno real cuando haga falta; no solo “decir qué correr”.
