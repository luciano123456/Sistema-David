let userSession;
let gridRendimiento = null;
let usuarioSeleccionadoId = null;
let isRenderingDashboard = false;
let rendimientoRowSelectedId = null;

$(document).ready(async function () {
    moment.locale('es');

    userSession = JSON.parse(localStorage.getItem('usuario'));

    inicializarCompatibilidadHtmlNuevo();
    registrarEventosHtmlNuevo();

    if (userSession.IdRol == 1) { // ROL ADMINISTRADOR
        $("#exportacionExcel").removeAttr("hidden");
        $("#dashboardRendimiento").removeAttr("hidden");
        $("#divTotalEnRojo").removeAttr("hidden");
        $("#divTotalCapital").removeAttr("hidden");
        $("#divTotVenta").removeAttr("hidden");
        $("#divTotCobro").removeAttr("hidden");
        $("#divTotalEfectivo").removeAttr("hidden");
        $("#divTotalTransferencia").removeAttr("hidden");
        $("#divComprobantesEnviados").attr("style", "display: none !important;");
        mostrarPanelFiltrosNuevo(true);
    } else if (userSession.IdRol == 4) { // ROL COMPROBANTES
        $("#divCliente").attr("hidden", "hidden");
     
        $("#btnFechaMensual").attr("hidden", "hidden");
        $("#divComprobantesEnviados").attr("style", "display: flex !important;");
        $("#btnRendMensual").attr("hidden", "hidden");
        mostrarPanelFiltrosNuevo(true);
    }

    await cargarCuentas();
    await cargarTiposDeNegocio();
    configurarDataDiario();

    $("#btnRendimiento").css("background", "#2E4053");
});

function inicializarCompatibilidadHtmlNuevo() {
    if (document.getElementById("panelFiltrosRendimiento")) {
        const panel = document.getElementById("panelFiltrosRendimiento");
        panel.classList.add("d-none");
    }

    const btnToggle = document.getElementById("btnToggleFiltrosRendimiento");
    if (btnToggle && !document.getElementById("iconFiltrosRendimiento")) {
        const icon = document.createElement("i");
        icon.id = "iconFiltrosRendimiento";
        icon.className = "fa fa-chevron-down me-2";
        btnToggle.prepend(icon);
    }

    if (document.getElementById("vistaMensualRendimiento")) {
        document.getElementById("vistaMensualRendimiento").hidden = true;
    }
    if (document.getElementById("vistaDiariaRendimiento")) {
        document.getElementById("vistaDiariaRendimiento").hidden = false;
    }
}

function registrarEventosHtmlNuevo() {
    $("#btnToggleFiltrosRendimiento").off("click").on("click", function () {
        toggleFiltrosRendimiento();
    });

    $("#btnAplicarFiltrosRendimiento").off("click").on("click", function () {
        aplicarFiltros();
    });

    $("#btnLimpiarFiltrosRendimiento").off("click").on("click", function () {
        limpiarFiltrosRendimiento();
    });

    $("#btnFechaHoy").off("click").on("click", function () {
        fechaHoy();
    });

    $("#btnFechaMensual").off("click").on("click", function () {
        fechaMensual();
    });

    $("#btnRendDiario").off("click").on("click", async function () {
        await mostrarRendimiento('Diario');
    });

    $("#btnRendMensual").off("click").on("click", async function () {
        await mostrarRendimiento('Mensual');
    });

    $("#MetodoPago").off("change").on("change", async function () {
        await habilitarCuentas();
    });
}

function toggleFiltrosRendimiento() {
    const panel = document.getElementById("panelFiltrosRendimiento");
    const icon = document.getElementById("iconFiltrosRendimiento");

    if (!panel) return;

    panel.classList.toggle("d-none");

    if (icon) {
        if (panel.classList.contains("d-none")) {
            icon.classList.remove("fa-chevron-up");
            icon.classList.add("fa-chevron-down");
        } else {
            icon.classList.remove("fa-chevron-down");
            icon.classList.add("fa-chevron-up");
        }
    }
}

function mostrarPanelFiltrosNuevo(mostrar) {
    const panel = document.getElementById("panelFiltrosRendimiento");
    const icon = document.getElementById("iconFiltrosRendimiento");

    if (!panel) return;

    if (mostrar) {
        panel.classList.remove("d-none");
        if (icon) {
            icon.classList.remove("fa-chevron-down");
            icon.classList.add("fa-chevron-up");
        }
    } else {
        panel.classList.add("d-none");
        if (icon) {
            icon.classList.remove("fa-chevron-up");
            icon.classList.add("fa-chevron-down");
        }
    }
}

function limpiarFiltrosRendimiento() {
    const form = document.getElementById("formFiltrosRendimiento");
    if (form) form.reset();

    if (document.getElementById("TipoNegocio")) {
        document.getElementById("TipoNegocio").value = -1;
    }
    if (document.getElementById("MetodoPago")) {
        document.getElementById("MetodoPago").value = "Todos";
    }
    if (document.getElementById("CuentaPago")) {
        document.getElementById("CuentaPago").value = -1;
    }

    fechaHoy();
    habilitarCuentas();
}

function fechaHoy() {
    document.getElementById("FechaDesde").value = moment().format('YYYY-MM-DD');
    document.getElementById("FechaHasta").value = moment().format('YYYY-MM-DD');
}

function fechaMensual() {
    document.getElementById("FechaDesde").value = moment().startOf('month').format('YYYY-MM-DD');
    document.getElementById("FechaHasta").value = moment().format('YYYY-MM-DD');
}

async function configurarDataDiario() {
    var FechaDesde, FechaHasta;

    var listaUsuarios = document.getElementById("listaUsuarios");

    if (listaUsuarios) {
        var cabeceraVC =
            listaUsuarios.querySelector(".list-group-item.d-flex.justify-content-end.align-items-center") ||
            listaUsuarios.querySelector(".list-group-item");

        if (cabeceraVC) {
            var posicionCabeceraVC = Array.prototype.indexOf.call(listaUsuarios.children, cabeceraVC);

            while (listaUsuarios.children.length > posicionCabeceraVC + 1) {
                listaUsuarios.removeChild(listaUsuarios.children[posicionCabeceraVC + 1]);
            }
        }
    }

    if (localStorage.getItem("FechaDesdeRendimiento") == null) {
        FechaDesde = moment().add(-30, 'days').format('YYYY-MM-DD');
    } else {
        FechaDesde = localStorage.getItem("FechaDesdeRendimiento");
    }

    if (localStorage.getItem("FechaHastaRendimiento") == null) {
        FechaHasta = moment().format('YYYY-MM-DD');
    } else {
        FechaHasta = localStorage.getItem("FechaHastaRendimiento");
    }

    document.getElementById("FechaDesde").value = FechaDesde;
    document.getElementById("FechaHasta").value = FechaHasta;

    var tiponegocio = document.getElementById("TipoNegocio").value;
    var idcuenta = document.getElementById("CuentaPago").value;
    var metodoPago = document.getElementById("MetodoPago").options[document.getElementById("MetodoPago").selectedIndex].text;
    var comprobantesEnviados = document.getElementById("ComprobantesEnviados").checked || userSession.IdRol == 1 ? -1 : 0;

    if (userSession.IdRol == 4) {
        const cuatroDiasAntes = moment().subtract(4, 'days');
        if (moment(FechaDesde).isBefore(cuatroDiasAntes)) {
            document.getElementById("FechaDesde").value = cuatroDiasAntes.format('YYYY-MM-DD');
            FechaDesde = cuatroDiasAntes.format('YYYY-MM-DD');
        }
    }

    await cargarUsuarios();
    configurarDataTable(-1, userSession.IdRol == 1 ? 1 : 0, 1, FechaDesde, FechaHasta, tiponegocio, metodoPago, idcuenta, comprobantesEnviados);
    configurarDataTableClientesAusentes(FechaDesde, FechaHasta);
    cargarVentas(-1);

    $("#btnRendMensual").removeClass("btn-activo").addClass("btn-inactivo");
    $("#btnRendDiario").removeClass("btn-inactivo").addClass("btn-activo");

    $("#btnRendMensual").css("background", "");
    $("#btnRendDiario").css("background", "");

    if (document.getElementById("vistaDiariaRendimiento")) {
        document.getElementById("vistaDiariaRendimiento").hidden = false;
    }
    if (document.getElementById("vistaMensualRendimiento")) {
        document.getElementById("vistaMensualRendimiento").hidden = true;
    }

    ajustarTablasRendimiento();
}

function configurarDataMensual() {
    var FechaDesde, FechaHasta;

    if (localStorage.getItem("FechaDesdeRendimiento") == null) {
        FechaDesde = moment().add(-30, 'days').format('YYYY-MM-DD');
    } else {
        FechaDesde = localStorage.getItem("FechaDesdeRendimiento");
    }

    if (localStorage.getItem("FechaHastaRendimiento") == null) {
        FechaHasta = moment().format('YYYY-MM-DD');
    } else {
        FechaHasta = localStorage.getItem("FechaHastaRendimiento");
    }

    document.getElementById("FechaDesde").value = FechaDesde;
    document.getElementById("FechaHasta").value = FechaHasta;

    obtenerDatosRendimiento(FechaDesde, FechaHasta);

    $("#btnRendMensual").removeClass("btn-inactivo").addClass("btn-activo");
    $("#btnRendDiario").removeClass("btn-activo").addClass("btn-inactivo");

    $("#btnRendMensual").css("background", "");
    $("#btnRendDiario").css("background", "");

    ajustarTablasRendimiento();
}

function getRol(idRol) {
    switch (idRol) {
        case 1: return "A";
        case 2: return "V";
        case 3: return "C";
        default: return "";
    }
}

async function cargarUsuarios() {
    try {
        const url = "/Usuarios/ListarActivos";
        const value = JSON.stringify({
            tipoNegocio: document.getElementById("TipoNegocio").value
        });

        const options = {
            type: "POST",
            url: url,
            async: true,
            data: value,
            contentType: "application/json",
            dataType: "json"
        };

        const result = await MakeAjax(options);

        if (result && result.data) {
            const listaUsuarios = document.getElementById("listaUsuarios");
            [...listaUsuarios.querySelectorAll("li:not(:first-child)")].forEach(item => item.remove());

            result.data.forEach(usuario => {
                const rol = getRol(usuario.IdRol);
                const listItem = document.createElement("li");
                listItem.className = "list-group-item d-flex justify-content-between align-items-center";



                listItem.setAttribute("data-id", usuario.Id);
                listItem.style.cursor = "pointer";

                listItem.addEventListener("click", function () {
                    seleccionarRendimiento(listItem, usuario.Id);
                });

                const nombreUsuario = createUsuarioNombre(usuario, rol);
                listItem.appendChild(nombreUsuario);

                const accionesDiv = document.createElement("div");
                accionesDiv.className = "acciones-usuario";

                // 🔥 CLAVE: bloquear propagación TOTAL de la zona acciones
                accionesDiv.addEventListener("click", function (e) {
                    e.stopPropagation();
                });

                if (usuario.IdRol != 1) {
                    accionesDiv.appendChild(createBloqueoButton(usuario));
                }

                if (userSession.IdRol == 1) {
                    accionesDiv.appendChild(createIconoVentas(usuario));
                    const divVentas = document.getElementById("divVentas");
                    const divVentasCabecera = document.getElementById("divVentasCabecera");
                    if (divVentas) divVentas.removeAttribute("hidden");
                    if (divVentasCabecera) divVentasCabecera.removeAttribute("hidden");
                } else {
                    const divVentas = document.getElementById("divVentas");
                    const divVentasCabecera = document.getElementById("divVentasCabecera");
                    if (divVentas) divVentas.setAttribute("hidden", "hidden");
                    if (divVentasCabecera) divVentasCabecera.setAttribute("hidden", "hidden");
                }

                accionesDiv.appendChild(createIconoCobranzas(usuario));

                listItem.appendChild(accionesDiv);
                listaUsuarios.appendChild(listItem);
            });

            const generalUsuario = {
                Id: -1,
                Nombre: "GENERAL",
                IdRol: ""
            };

            const generalItem = document.createElement("li");
            generalItem.className = "list-group-item d-flex justify-content-between align-items-center selected-user";
            generalItem.setAttribute("data-id", generalUsuario.Id);
            generalItem.style.cursor = "pointer";

            generalItem.addEventListener("click", function () {
                seleccionarRendimiento(generalItem, generalUsuario.Id);
            });

            usuarioSeleccionadoId = generalUsuario.Id;

            const nombreGeneral = createUsuarioNombre(generalUsuario, "");

            // 🔥 MISMO CONTENEDOR QUE LOS DEMAS
            const accionesDivGeneral = document.createElement("div");
            accionesDivGeneral.className = "acciones-usuario";

            // 🔥 IMPORTANTE: evitar conflictos de click
            accionesDivGeneral.addEventListener("click", function (e) {
                e.stopPropagation();
            });

            if (userSession.IdRol == 1) {
                accionesDivGeneral.appendChild(createIconoVentasGeneral());
            }

            accionesDivGeneral.appendChild(createIconoCobranzasGeneral());

            generalItem.appendChild(nombreGeneral);
            generalItem.appendChild(accionesDivGeneral);

            listaUsuarios.appendChild(generalItem);
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.');
        $('.datos-error').removeClass('d-none');
    }
}

function createIconoVentasGeneral() {
    const iconVentas = document.createElement("i");
    iconVentas.className = "fa fa-check text-success mx-2";
    iconVentas.setAttribute("title", "Ventas");
    iconVentas.style.cursor = "pointer";
    iconVentas.addEventListener("click", function () {
        alternarColorIcono(iconVentas);
    });
    return iconVentas;
}

function createIconoCobranzasGeneral() {
    const iconCobranzas = document.createElement("i");
    iconCobranzas.className = "fa fa-check text-success";
    iconCobranzas.setAttribute("title", "Cobranzas");
    iconCobranzas.style.cursor = "pointer";
    iconCobranzas.addEventListener("click", function () {
        alternarColorIcono(iconCobranzas);
    });
    return iconCobranzas;
}

function createUsuarioNombre(usuario, rol) {
    const nombreUsuario = document.createElement("span");
    nombreUsuario.className = "usuario-nombre";
    nombreUsuario.textContent = usuario.Nombre + (rol ? ` (${rol})` : "");
    nombreUsuario.style.cursor = "pointer";
    return nombreUsuario;
}

function createBloqueoButton(usuario) {
    const estaBloqueado = usuario.BloqueoSistema;

    const botonBloqueo = document.createElement("button");
    botonBloqueo.setAttribute("type", "button");
    botonBloqueo.classList.add("btn", "btn-sm", "btnacciones");

    // 🔥 COLOR DEL BOTÓN (NO DEL ICONO)
    if (estaBloqueado) {
        botonBloqueo.classList.add("btn-danger"); // ROJO
        botonBloqueo.setAttribute("title", "Desbloquear");
    } else {
        botonBloqueo.classList.add("btn-success"); // VERDE
        botonBloqueo.setAttribute("title", "Bloquear");
    }

    // 🔥 ICONO SIEMPRE BLANCO (NO CAMBIA)
    botonBloqueo.innerHTML = `<i class="fa fa-power-off fa-lg text-white"></i>`;

    const estadoInverso = estaBloqueado ? 0 : 1;

    botonBloqueo.addEventListener("click", function (e) {
        e.stopPropagation();
        bloqueoSistema(usuario.Id, estadoInverso);
    });

    return botonBloqueo;
}

function createIconoVentas(usuario) {
    const iconVentas = document.createElement("i");
    iconVentas.className = "fa fa-check text-danger ventas-icon mx-2";
    iconVentas.setAttribute("title", "Ventas");
    iconVentas.style.cursor = "pointer";
    iconVentas.addEventListener("click", function (e) {
        e.stopPropagation();
        alternarColorIcono(iconVentas);
    });
    return iconVentas;
}

function createIconoCobranzas(usuario) {
    const iconCobranzas = document.createElement("i");
    iconCobranzas.className = "fa fa-check text-danger cobranzas-icon";
    iconCobranzas.setAttribute("title", "Cobranzas");
    iconCobranzas.style.cursor = "pointer";
    iconCobranzas.addEventListener("click", function (e) {
        e.stopPropagation();
        alternarColorIcono(iconCobranzas);
    });
    return iconCobranzas;
}

function alternarColorIcono(icono) {
    const listItem = icono.closest("li");
    let dataId = parseInt(listItem.getAttribute("data-id"));

    if (dataId != usuarioSeleccionadoId) {
        return false;
    }

    if (icono.classList.contains("text-success")) {
        icono.classList.remove("text-success");
        icono.classList.add("text-danger");
    } else {
        icono.classList.remove("text-danger");
        icono.classList.add("text-success");
    }

    const iconoVentas = listItem.querySelector(".fa-check[title='Ventas']");
    const iconoCobranzas = listItem.querySelector(".fa-check[title='Cobranzas']");

    const estadoVentas = iconoVentas && iconoVentas.classList.contains("text-success") ? 1 : 0;
    const estadoCobranzas = iconoCobranzas && iconoCobranzas.classList.contains("text-success") ? 1 : 0;
    var idcuenta = document.getElementById("CuentaPago").value;
    var comprobantesEnviados = document.getElementById("ComprobantesEnviados").checked || userSession.IdRol == 1 ? -1 : 0;

    const metodoPago = document.getElementById("MetodoPago").options[document.getElementById("MetodoPago").selectedIndex].text;

    configurarDataTable(
        dataId,
        estadoVentas,
        estadoCobranzas,
        document.getElementById("FechaDesde").value,
        document.getElementById("FechaHasta").value,
        document.getElementById("TipoNegocio").value,
        metodoPago,
        idcuenta,
        comprobantesEnviados
    );
}

function seleccionarRendimiento(elemento, idVendedor) {
    const usuarios = document.getElementsByClassName("list-group-item");

    Array.from(usuarios).forEach(usuario => {
        usuario.classList.remove("selected-user");

        const iconoVentas = usuario.querySelector(".fa-check[title='Ventas']");
        const iconoCobranzas = usuario.querySelector(".fa-check[title='Cobranzas']");

        if (iconoVentas) {
            iconoVentas.classList.remove("text-success");
            iconoVentas.classList.add("text-danger");
        }
        if (iconoCobranzas) {
            iconoCobranzas.classList.remove("text-success");
            iconoCobranzas.classList.add("text-danger");
        }
    });

    elemento.classList.add("selected-user");

    const iconoVentas = elemento.querySelector(".fa-check[title='Ventas']");
    const iconoCobranzas = elemento.querySelector(".fa-check[title='Cobranzas']");

    if (iconoVentas) {
        iconoVentas.classList.remove("text-danger");
        iconoVentas.classList.add("text-success");
    }
    if (iconoCobranzas) {
        iconoCobranzas.classList.remove("text-danger");
        iconoCobranzas.classList.add("text-success");
    }


    const estadoVentas = iconoVentas && iconoVentas.classList.contains("text-success") ? 1 : 0;
    const estadoCobranzas = iconoCobranzas && iconoCobranzas.classList.contains("text-success") ? 1 : 0;
    const metodoPago = document.getElementById("MetodoPago").options[document.getElementById("MetodoPago").selectedIndex].text;
    var idcuenta = document.getElementById("CuentaPago").value;
    var comprobantesEnviados = document.getElementById("ComprobantesEnviados").checked || userSession.IdRol == 1 ? -1 : 0;

    if ($.fn.DataTable.isDataTable('#grdRendimiento')) {
        $('#grdRendimiento').DataTable().clear().draw();
    }

    configurarDataTable(
        idVendedor,
        estadoVentas,
        estadoCobranzas,
        document.getElementById("FechaDesde").value,
        document.getElementById("FechaHasta").value,
        document.getElementById("TipoNegocio").value,
        metodoPago,
        idcuenta,
        comprobantesEnviados
    );

    obtenerDatosRendimiento(
        document.getElementById("FechaDesde").value,
        document.getElementById("FechaHasta").value
    );

    usuarioSeleccionadoId = idVendedor;
    cargarVentas(idVendedor);
}

async function cargarVentas(idvendedor) {
    try {
        var url = "/Rendimiento/ListarVentas";

        let value = JSON.stringify({
            idVendedor: idvendedor,
            tiponegocio: document.getElementById("TipoNegocio").value
        });

        let options = {
            type: "POST",
            url: url,
            async: true,
            data: value,
            contentType: "application/json",
            dataType: "json",
            timeout: 120000
        };

        let result = await MakeAjax(options);

        if (result != null && result.data) {
            let totRestante = result.data.reduce((sum, venta) => sum + safeNumber(venta.Restante), 0);

            document.getElementById("totRestante").textContent = formatNumber(totRestante);

            let totDeudaInhabilitados = result.data
                .filter(venta => safeString(venta.EstadoCliente) === "Inhabilitado")
                .reduce((sum, venta) => sum + safeNumber(venta.Restante), 0);

            document.getElementById("totDeuda").textContent = formatNumber(totDeudaInhabilitados);

        } else {
            console.error('La respuesta del servidor es incorrecta:', result);
        }
    } catch (error) {
        console.error('Error en la solicitud AJAX:', error);
        $('.datos-error').text('Ha ocurrido un error.');
        $('.datos-error').removeClass('d-none');
    }
}

function aplicarFiltros() {
    destroyAllCharts();
    dashboardRenderToken++;
    const fechaDesde = document.getElementById("FechaDesde").value;
    const fechaHasta = document.getElementById("FechaHasta").value;
    const tipoNegocio = document.getElementById("TipoNegocio").value;
    const metodoPago = document.getElementById("MetodoPago").options[document.getElementById("MetodoPago").selectedIndex].text;
    var idcuenta = document.getElementById("CuentaPago").value;
    var comprobantesEnviados = document.getElementById("ComprobantesEnviados").checked || userSession.IdRol == 1 ? -1 : 0;

    const fechaDesdeDate = new Date(fechaDesde);
    const fechaHastaDate = new Date(fechaHasta);
    const fechaActual = new Date();

    fechaActual.setUTCHours(fechaActual.getUTCHours() - 3);

    const fechaHastaString = fechaHastaDate.toISOString().split('T')[0];
    const fechaActualString = fechaActual.toISOString().split('T')[0];

    if (userSession.IdRol == 4) {
        const cuatroDiasAntes = new Date(fechaActual);
        cuatroDiasAntes.setDate(cuatroDiasAntes.getDate() - 4);

        if (fechaDesdeDate < cuatroDiasAntes) {
            alert("No puedes filtrar datos de más de cuatro días atrás de la fecha actual.");
            return;
        }


        if (fechaHastaString > fechaActualString) {
            alert("La fecha hasta no puede ser mayor que la fecha actual.");
            return;
        }
    }


    const usuarioSeleccionado = document.querySelector(".selected-user");
    if (usuarioSeleccionado) {
        const idVendedor = usuarioSeleccionado.getAttribute("data-id");

        let estadoVentas = 0;

        if (userSession.IdRol == 1) {
            const iconVentasSel = usuarioSeleccionado.querySelector(".fa-check[title='Ventas']");
            estadoVentas = iconVentasSel && iconVentasSel.classList.contains("text-success") ? 1 : 0;
        } else {
            estadoVentas = 0;
        }

        const iconCobranzasSel = usuarioSeleccionado.querySelector(".fa-check[title='Cobranzas']");
        const estadoCobranzas = iconCobranzasSel && iconCobranzasSel.classList.contains("text-success") ? 1 : 0;

        localStorage.setItem("FechaDesdeRendimiento", document.getElementById("FechaDesde").value);
        localStorage.setItem("FechaHastaRendimiento", document.getElementById("FechaHasta").value);

        if ($.fn.DataTable.isDataTable('#grdRendimiento')) {
            $('#grdRendimiento').DataTable().clear().draw();
        }

        configurarDataTable(idVendedor, estadoVentas, estadoCobranzas, fechaDesde, fechaHasta, tipoNegocio, metodoPago, idcuenta, comprobantesEnviados);

    } else {
        configurarDataTable(-1, 1, 1, fechaDesde, fechaHasta, -1, "Todos", -1, comprobantesEnviados);
    }

    cargarVentas(-1);
    obtenerDatosRendimiento(fechaDesde, fechaHasta);
    cargarUsuarios();
}


const safeNumber = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const safeString = (v) => {
    if (v === null || v === undefined) return "";
    return String(v);
};

const safeUpper = (v) => safeString(v).toUpperCase();

const safeDate = (v) => {
    if (!v) return "";
    const m = moment(v);
    return m.isValid() ? m.format("DD/MM/YYYY") : "";
};

const configurarDataTable = async (idVendedor, estadoVentas, estadoCobranzas, fechadesde, fechahasta, tipoNegocio, metodoPago, idcuenta, comprobantesEnviados) => {

    let totVenta = 0;
    let totCobro = 0;
    let totInteres = 0;
    let totEfectivo = 0;
    let totTransferencia = 0;

    showGlobalLoading("Cargando tablas...");

    const url = `/Rendimiento/MostrarRendimiento?id=${encodeURIComponent(idVendedor)}&ventas=${encodeURIComponent(estadoVentas)}&cobranzas=${encodeURIComponent(estadoCobranzas)}&fechadesde=${encodeURIComponent(fechadesde)}&fechahasta=${encodeURIComponent(fechahasta)}&tiponegocio=${encodeURIComponent(tipoNegocio)}&metodoPago=${encodeURIComponent(metodoPago)}&IdCuentaBancaria=${encodeURIComponent(idcuenta)}&ComprobantesEnviados=${encodeURIComponent(comprobantesEnviados)}`;

    const recalcularTotales = (table) => {
        totVenta = 0;
        totCobro = 0;
        totInteres = 0;
        totEfectivo = 0;
        totTransferencia = 0;

        table.data().each(function (rowData) {

            const descripcion = safeString(rowData.Descripcion);
            const metodo = safeUpper(rowData.MetodoPago);
            const cobro = safeNumber(rowData.Cobro);
            const venta = safeNumber(rowData.Venta);
            const interes = safeNumber(rowData.Interes);

            if (descripcion.includes("Cobranza")) {
                totCobro += cobro;

                if (metodo === "EFECTIVO") totEfectivo += cobro;
                if (metodo === "TRANSFERENCIA PROPIA" || metodo === "TRANSFERENCIA A TERCEROS") {
                    totTransferencia += cobro;
                }
            }

            if (descripcion.includes("Venta")) totVenta += venta;
            if (descripcion.includes("Interes")) totInteres += interes;
        });

        document.getElementById("totventa").textContent = formatNumber(totVenta);
        document.getElementById("totcobro").textContent = formatNumber(totCobro);
        document.getElementById("totinteres").textContent = formatNumber(totInteres);
        document.getElementById("totefectivo").textContent = formatNumber(totEfectivo);
        document.getElementById("tottransferencia").textContent = formatNumber(totTransferencia);
    };

    const tableExists = $.fn.DataTable.isDataTable('#grdRendimiento');

    if (!tableExists) {

        gridRendimiento = $('#grdRendimiento').DataTable({
            ajax: {
                url: url,
                type: "GET",
                dataType: "json",
                dataSrc: function (json) {
                    if (Array.isArray(json)) return json;
                    if (json && Array.isArray(json.data)) return json.data;
                    if (json && Array.isArray(json.Data)) return json.Data;
                    console.error("Respuesta AJAX inesperada:", json);
                    return [];
                },
                error: function (xhr) {
                    console.error("Error AJAX DataTable:", xhr.responseText);
                }
            },
            language: {
                url: "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            },
            responsive: false,
            scrollX: true,
            deferRender: true,
            processing: true,
            pageLength: 10,

            columns: [
                { data: "Fecha", render: d => safeDate(d) },
                {
                    data: "MetodoPago",
                    render: function (data, type, row) {

                        const metodo = safeString(data);
                        let icon = "";

                        if (safeString(row.Imagen) && safeUpper(metodo) !== "EFECTIVO") {
                            icon = `<button class='btn btn-sm ms-1 btnacciones'
                                type='button'
                                onclick='verComprobante(${safeNumber(row.Id)}, "${safeString(row.Descripcion)}")'>
                                <i class='fa fa-eye text-primary'></i>
                            </button>`;
                        }

                        return metodo + (icon ? " " + icon : "");
                    }
                },
                { data: "CuentaBancaria" },
                { data: "Cliente" },
                { data: "CapitalInicial", render: d => formatNumber(safeNumber(d)) },
                { data: "Venta", render: d => formatNumber(safeNumber(d)) },
                { data: "Cobro", render: d => formatNumber(safeNumber(d)) },
                { data: "Interes", render: d => formatNumber(safeNumber(d)) },
                { data: "CapitalFinal", render: d => formatNumber(safeNumber(d)) },
                { data: "ProximoCobro", render: d => safeDate(d) },
                { data: "FechaLimite", render: d => safeDate(d) },
                { data: "TipoNegocio", render: d => safeString(d) },
                { data: "Descripcion" },
                {
                    data: "Id",
                    render: function (data, type, row) {

                        const iconColor = safeNumber(row.whatssap) === 1 ? "text-success" : "text-danger";

                        const rowEncoded = encodeURIComponent(JSON.stringify(row));

                        return `
                        <button class='btn btn-sm btnacciones'
                            onclick='enviarWhatssapDesdeRow("${rowEncoded}")'>
                            <i class='fa fa-whatsapp ${iconColor}'></i>
                        </button>`;
                    }
                }
            ],

            order: [[0, "desc"]],

            initComplete: async function () {

                hideGlobalLoading();

                recalcularTotales(gridRendimiento);
                cargarVentas(-1);
                scheduleRenderDashboard(180);
                await configurarOpcionesColumnas();
                ajustarTablasRendimiento();

                // 🔥 CLICK + SELECCIÓN
                $('#grdRendimiento tbody')
                    .off('click', 'tr')
                    .on('click', 'tr', function () {

                        const data = gridRendimiento.row(this).data();
                        if (!data) return;

                        rendimientoRowSelectedId = data.Id;

                        $('#grdRendimiento tbody tr').removeClass('row-selected');
                        $(this).addClass('row-selected');
                    });

                // 🔥 REAPLICAR SELECCIÓN
                $('#grdRendimiento')
                    .off('draw.dt.rowselect')
                    .on('draw.dt.rowselect', function () {

                        if (!rendimientoRowSelectedId) return;

                        gridRendimiento.rows().every(function () {

                            const data = this.data();

                            if (data && data.Id === rendimientoRowSelectedId) {
                                $(this.node()).addClass('row-selected');
                            }
                        });
                    });
            }
        });

    } else {

        const table = $('#grdRendimiento').DataTable();

        table.ajax.url(url).load(function () {

            recalcularTotales(table);
            ajustarTablasRendimiento();
            scheduleRenderDashboard(180);
            hideGlobalLoading();

        }, false);
    }
};
const configurarDataTableClientesAusentes = async (fechadesde, fechahasta, data = null) => {
    const tableExists = $.fn.DataTable.isDataTable('#grdClientesAusentes');

    if (!tableExists) {
        $('#grdClientesAusentes').DataTable({
            "ajax": {
                "url": `/Rendimiento/MostrarClientesAusentes?fechadesde=${fechadesde}&fechahasta=${fechahasta}`,
                "type": "GET",
                "dataType": "json"
            },
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            },
            responsive: false,
            scrollX: true,
            "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
            "pageLength": 10,
            lengthChange: true,
            "columns": [
                {
                    "data": "Fecha",
                    "render": function (data) {
                        return moment(data).format("DD/MM/YYYY");
                    }
                },
                { "data": "Cliente" },
                { "data": "Cobrador" },
                { "data": "Observacion" },
                {
                    "data": "Id",
                    "render": function (data, type, row) {
                        let iconColorClass = row.whatssap === 1 ? 'text-success' : 'text-danger';
                        return "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='enviarWhatssap(" + data + ")' title='Enviar Whatssap'><i class='fa fa-whatsapp fa-lg " + iconColorClass + "' aria-hidden='true'></i></button>";
                    },
                }
            ],
            "columnDefs": [
                {
                    targets: [0], type: "ddMmYyyy"
                }
            ],
            "order": [[0, "ddMmYyyy-desc"], [1, "asc"]],
            "initComplete": function () {
                ajustarTablasRendimiento();
            }
        });

    } else {
        const table = $('#grdClientesAusentes').DataTable();

        if (data !== null) {
            table.clear().rows.add(data).draw();
        }
    }

    let filaSeleccionada = null;
    $('#grdClientesAusentes tbody').off('click', 'tr').on('click', 'tr', function () {
        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass('seleccionada');
            $('td', filaSeleccionada).removeClass('seleccionada');
        }

        filaSeleccionada = $(this);
        $(filaSeleccionada).addClass('seleccionada');
        $('td', filaSeleccionada).addClass('seleccionada');
    });
};

jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    "ddMmYyyy-pre": function (a) {
        var dateParts = a.split('/');
        if (dateParts.length !== 3) return 0;
        return new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
    },
    "ddMmYyyy-asc": function (a, b) {
        return a - b;
    },
    "ddMmYyyy-desc": function (a, b) {
        return b - a;
    }
});

const obtenerDatosRendimiento = async (fechadesde, fechahasta) => {
    const url = `/Rendimiento/MostrarRendimientoGeneral?fechadesde=${fechadesde}&fechahasta=${fechahasta}`;
    const response = await fetch(url);
    const data = await response.json();

    configurarDataTableCobrado('#grdRendimientoCobrado', fechadesde, fechahasta, data.Cobrado);
    configurarDataTableGeneral('#grdRendimientoGeneral', fechadesde, fechahasta, data.Rendimiento);
    configurarDataTableClientesAusentes(fechadesde, fechahasta, data.ClientesAusentes);
};

const configurarDataTableGeneral = async (selectorTabla, fechadesde, fechahasta, result) => {
    const datos = result;
    const tableExists = $.fn.DataTable.isDataTable(selectorTabla);

    if (!tableExists) {
        $(selectorTabla).DataTable({
            "data": datos,
            "columns": [
                {
                    "data": "Fecha",
                    "render": function (data) {
                        return moment(data, 'DD/MM/YYYY').format('D [de] MMMM');
                    },
                    "type": "date",
                },
                { "data": "CapitalInicial" },
                { "data": "Ventas" },
                { "data": "Cobranza" },
                { "data": "CapitalFinal" },
            ],
            "columnDefs": [
                {
                    "render": function (data) {
                        return formatNumber(data);
                    },
                    "targets": [1, 2, 3, 4]
                },
            ],
            responsive: false,
            scrollX: true,
            "order": [[0, "asc"]],
            "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            },
            "initComplete": function () {
                ajustarTablasRendimiento();
            }
        });
    } else {
        $('#grdRendimientoGeneral').DataTable().clear().draw();
        const table = $(selectorTabla).DataTable();
        table.rows.add(datos).draw();
    }

    let filaSeleccionada = null;
    $('#grdRendimientoGeneral tbody').off('click', 'tr').on('click', 'tr', function () {
        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass('seleccionada');
            $('td', filaSeleccionada).removeClass('seleccionada');
        }

        filaSeleccionada = $(this);
        $(filaSeleccionada).addClass('seleccionada');
        $('td', filaSeleccionada).addClass('seleccionada');
    });
};

const configurarDataTableCobrado = async (selectorTabla, fechadesde, fechahasta, result) => {
    const datos = result;
    const tableExists = $.fn.DataTable.isDataTable(selectorTabla);

    if (!tableExists) {
        $(selectorTabla).DataTable({
            "data": datos,
            "columns": [
                { "data": "Vendedor" },
                { "data": "TotalCobrado" },
            ],
            "columnDefs": [
                {
                    "render": function (data) {
                        return formatNumber(data);
                    },
                    "targets": [1]
                },
            ],
            "order": [[1, "asc"]],
            "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            },
            "initComplete": function () {
                ajustarTablasRendimiento();

                hideGlobalLoading(); // 🔥 ACA LIBERÁS TODO
            }
        });
    } else {
        $('#grdRendimientoCobrado').DataTable().clear().draw();
        const table = $(selectorTabla).DataTable();
        table.rows.add(datos).draw();
    }

    let filaSeleccionada = null;
    $('#grdRendimientoCobrado tbody').off('click', 'tr').on('click', 'tr', function () {
        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass('seleccionada');
            $('td', filaSeleccionada).removeClass('seleccionada');
        }

        filaSeleccionada = $(this);
        $(filaSeleccionada).addClass('seleccionada');
        $('td', filaSeleccionada).addClass('seleccionada');
    });
};

function ocultarFiltros() {
    var filtros = document.getElementById("Filtros");

    if (!filtros) return;

    if (filtros.style.display === "none") {
        filtros.style.display = "block";
    } else {
        filtros.style.display = "none";
    }
}

async function enviarWhatssapDesdeRow(rowEncoded) {
    try {
        const row = JSON.parse(decodeURIComponent(rowEncoded || ""));
        const descripcion = row?.Descripcion || "";

        const esElectro = descripcion.toLowerCase().includes("electro");

        if (esElectro) {
            const idMovimiento = obtenerIdCorrectoElectro(row);
            const nroCuota = extraerNroCuotaDesdeDescripcion(descripcion);

            await enviarWhatssapElectro(idMovimiento, descripcion, nroCuota);
        } else {
            // 🔥 NO TOCAR → flujo original
            await enviarWhatssapNormalDesdeApi(row.Id);
        }

        aplicarFiltros();

    } catch (error) {
        console.error(error);
        alert("Error en WhatsApp");
    }
}

async function enviarWhatssap(rowOrId, descripcion = "") {
    try {
        // Caso legacy: viene solo id (ej. clientes ausentes)
        if (typeof rowOrId === "number" || typeof rowOrId === "string") {
            await enviarWhatssapNormalDesdeApi(Number(rowOrId));
            aplicarFiltros();
            return;
        }

        const row = rowOrId || {};
        const desc = String(row.Descripcion || descripcion || "");
        const esElectro = desc.toLowerCase().includes("electro");

        if (esElectro) {
            const idMovimiento = obtenerIdCorrectoElectro(row);
            const nroCuota = extraerNroCuotaDesdeDescripcion(desc);
            await enviarWhatssapElectro(idMovimiento, desc, nroCuota);
        } else {
            await enviarWhatssapNormalDesdeApi(row.Id);
        }

        aplicarFiltros();
    } catch (error) {
        console.error(error);
        $('.datos-error').text('Ha ocurrido un error.');
        $('.datos-error').removeClass('d-none');
    }
}

function obtenerNumeroCuota(descripcion) {
    if (!descripcion) return null;

    const match = descripcion.match(/cuota\s*(\d+)/i);
    return match ? parseInt(match[1]) : null;
}

function obtenerIdCorrectoElectro(row) {

    const desc = (row.Descripcion || "").toLowerCase();

    // 🔥 SI TENÉS IDCUOTA (futuro)
    if (row.IdCuota) {
        return row.IdCuota;
    }

    // 🔥 COBRANZA → usar pago
    if (desc.includes("cobranza") && row.Id) {
        return row.Id;
    }

    // 🔥 VENTA → usar venta
    if (desc.includes("venta") && row.IdVenta) {
        return row.IdVenta;
    }

    return row.Id;
}

async function enviarWhatssapNormalDesdeApi(id) {
    const result = await MakeAjax({
        type: "POST",
        url: "/Ventas/EnvWhatssapInformacionVenta",
        async: true,
        data: JSON.stringify({ id, mensaje: "" }),
        contentType: "application/json",
        dataType: "json"
    });

    if (!result) {
        mostrarError("No se pudo obtener la información.");
        return;
    }

    enviarWhatssapNormal(result);
}

async function enviarWhatssapElectro(idMovimiento, descripcion, nroCuota = null) {

    const base = await MakeAjax({
        type: "POST",
        url: "/Ventas_Electrodomesticos/EnvWhatssapElectro",
        async: true,
        data: JSON.stringify({
            id: idMovimiento,
            descripcion: descripcion,
            nroCuota: nroCuota
        }),
        contentType: "application/json",
        dataType: "json"
    });

    if (!base || !base.Venta) return;

    const pagos = Array.isArray(base.Pagos) ? base.Pagos : [];
    const pendientes = Array.isArray(base.PagosPendientesWhatssap)
        ? base.PagosPendientesWhatssap
        : [];

    const pagosPendientes = pagos
        .filter(p => pendientes.includes(p.Id))
        .sort((a, b) => new Date(a.FechaPago) - new Date(b.FechaPago));

    // ===============================
    // MULTIPLE
    // ===============================
    if (pagosPendientes.length > 1) {

        const confirmar = await confirmarModal(`
            Tenés <b>${pagosPendientes.length}</b> cobros sin enviar.<br><br>
            ¿Desea enviarlos todos juntos?
        `);

        if (confirmar) {

            const mensaje = armarMensajeWhatsappElectroGrupal(base, pagosPendientes);

            abrirWhatsapp(base.Cliente.ClienteTelefono, mensaje);

            // 🔥 SOLO SI EXISTE EL ENDPOINT
            if (typeof base.PagosPendientesWhatssap !== "undefined") {
                await MakeAjax({
                    type: "POST",
                    url: "/Ventas_Electrodomesticos/MarcarWhatssapMasivo",
                    async: true,
                    data: JSON.stringify({
                        idsPagos: pagosPendientes.map(x => x.Id)
                    }),
                    contentType: "application/json",
                    dataType: "json"
                });
            }

            return;
        }
    }

    // ===============================
    // SIMPLE
    // ===============================
    const mensaje = armarMensajeWhatsappElectro(base, descripcion, nroCuota);

    abrirWhatsapp(base.Cliente.ClienteTelefono, mensaje);

    // 🔥 SOLO SI TENÉS ENDPOINT
    await MakeAjax({
        type: "POST",
        url: "/Ventas_Electrodomesticos/MarcarWhatssapPago",
        async: true,
        data: JSON.stringify({
            id: base.IdPagoActual,
            descripcion: descripcion
        }),
        contentType: "application/json",
        dataType: "json"
    });
}
function obtenerTipoMensajeElectro(descripcion = "") {
    const d = String(descripcion || "").toLowerCase();

    if (d.includes("venta")) return "venta";
    if (d.includes("cobranza")) return "cobro";
    if (d.includes("recargo")) return "recargo";

    return "venta";
}


function construirHistorialSaldo(base) {
    if (!base || !Array.isArray(base.Pagos)) return [];

    const pagosOrdenados = ordenarPagosCronologicamente(base.Pagos);
    let saldo = obtenerSaldoInicialElectro(base);

    const historial = [];

    pagosOrdenados.forEach(p => {
        const importe = obtenerImportePago(p);

        saldo -= importe;
        if (saldo < 0) saldo = 0;

        historial.push({
            idPago: Number(p.Id || 0),
            importe: importe,
            saldoLuego: saldo,
            fecha: p.FechaPago,
            detalles: Array.isArray(p.Detalles) ? p.Detalles : []
        });
    });

    return historial;
}
function obtenerSaldoPostPago(base, idPagoActual = null) {
    const historial = construirHistorialSaldo(base);

    if (!historial.length) return 0;

    if (idPagoActual != null) {
        const item = historial.find(x => Number(x.idPago) === Number(idPagoActual));
        if (item) {
            return item.saldoLuego;
        }
    }

    return historial[historial.length - 1].saldoLuego;
}

function armarMensajeWhatsappElectro(base, descripcion, nroCuota = null) {
    if (!base || !base.Venta || !base.Cliente) return "";

    const v = base.Venta;
    const tipo = obtenerTipoMensajeElectro(descripcion);

    const nombreCliente = (v.ClienteNombre || "").trim();
    const fechaVenta = v.FechaVenta ? moment(v.FechaVenta).format("DD/MM/YYYY") : "";

    const total = formatNumber(v.ImporteTotal || 0);
    const entrega = formatNumber(v.Entrega || 0);
    const saldoVenta = formatNumber(v.Restante || 0);

    const saludo = obtenerSaludoWhatsapp();

    // ===============================
    // PRODUCTOS
    // ===============================
    let productos = "";
    if (Array.isArray(v.Items) && v.Items.length) {
        productos = v.Items
            .slice(0, 3)
            .map(i => `• ${i.Cantidad || 1} x ${i.Producto || ""}`)
            .join("\n");

        if (v.Items.length > 3) {
            productos += `\n• y otros ${v.Items.length - 3} productos`;
        }
    } else {
        productos = "• Productos según operación registrada";
    }

    // ===============================
    // PRÓXIMA CUOTA
    // ===============================
    const proximaCuota = obtenerProximaCuotaElectro(v);

    let textoCuota = "—";
    if (proximaCuota) {
        textoCuota =
            `Cuota ${proximaCuota.NumeroCuota} – ` +
            `${moment(proximaCuota.FechaVencimiento).format("DD/MM/YYYY")} – ` +
            `${formatNumber(proximaCuota.MontoRestante || 0)}`;
    }

    // ===============================
    // VENTA
    // ===============================
    if (tipo === "venta") {
        return `${saludo} ${nombreCliente} 😊

🛒 *VENTA DE ELECTRODOMÉSTICOS*
Le informamos que el día ${fechaVenta} hemos registrado una nueva venta.

📦 *Productos adquiridos:*
${productos}

💰 *Total:* ${total}
💵 *Entrega:* ${entrega}
📉 *Saldo pendiente:* ${saldoVenta}

📆 *Próxima cuota a vencer:*
${textoCuota}

Muchas gracias por su compra 🙌
Ante cualquier consulta, quedamos a disposición.`;
    }

    // ===============================
    // COBRO SIMPLE
    // ===============================
    if (tipo === "cobro") {
        const pagoActual = obtenerPagoActualElectro(base);
        const cuotasDelPago = obtenerCuotasDelPagoElectro(base, pagoActual);
        const cuotaObjetivo = obtenerCuotaObjetivoElectro(base, nroCuota, pagoActual);

        let importePagado = 0;
        let textoCuotaPagada = "Cuota";

        if (cuotaObjetivo && pagoActual && Array.isArray(pagoActual.Detalles)) {
            const det = pagoActual.Detalles.find(d => Number(d.IdCuota) === Number(cuotaObjetivo.Id));
            if (det) {
                importePagado = Number(det.ImporteAplicado || 0);
            }
        }

        if (!importePagado && pagoActual) {
            importePagado = Number(pagoActual.ImporteTotal || 0);
        }

        if (cuotasDelPago.length > 1) {
            textoCuotaPagada = `Cuotas ${cuotasDelPago.map(x => x.NumeroCuota).join(", ")}`;
        } else if (cuotaObjetivo?.NumeroCuota) {
            textoCuotaPagada = `Cuota ${cuotaObjetivo.NumeroCuota}`;
        } else if (cuotasDelPago.length === 1) {
            textoCuotaPagada = `Cuota ${cuotasDelPago[0].NumeroCuota}`;
        }

        const saldoNumerico = cuotaObjetivo?.NumeroCuota
            ? obtenerSaldoHastaCuota(base, cuotaObjetivo.NumeroCuota)
            : obtenerSaldoPostPago(base, Number(base.IdPagoActual || 0));

        const cuotasRestantes = Array.isArray(v.Cuotas)
            ? v.Cuotas.filter(c => Number(c.MontoRestante || 0) > 0).length
            : 0;

        return `${saludo} ${nombreCliente} 👋

💳 *COBRO REGISTRADO – ELECTRODOMÉSTICOS*

Se ha registrado correctamente el pago de la *${textoCuotaPagada}*.

💰 *Importe abonado:* ${formatNumber(importePagado)}

📊 *Cuotas restantes:* ${cuotasRestantes}

📆 *Próxima cuota a vencer:*
${textoCuota}

Muchas gracias por su pago 🙌
Ante cualquier consulta, quedamos a disposición.`;
    }

    // ===============================
    // RECARGO
    // ===============================
    if (tipo === "recargo") {
        const cuotaObjetivo = obtenerCuotaObjetivoElectro(base, nroCuota, null);

        let importeRecargo = 0;

        if (cuotaObjetivo) {
            importeRecargo = Number(cuotaObjetivo.MontoRecargos || 0);

            if (Array.isArray(cuotaObjetivo.Recargos) && cuotaObjetivo.Recargos.length) {
                const ultimo = [...cuotaObjetivo.Recargos]
                    .sort((a, b) => new Date(b.Fecha || 0) - new Date(a.Fecha || 0))[0];

                if (ultimo) {
                    importeRecargo = Number(ultimo.ImporteCalculado || ultimo.Valor || cuotaObjetivo.MontoRecargos || 0);
                }
            }
        }

        const textoCuotaRecargo = cuotaObjetivo?.NumeroCuota
            ? `Cuota ${cuotaObjetivo.NumeroCuota}`
            : "su plan de pagos";

        return `${saludo} ${nombreCliente} ⚠️

📌 *RECARGO APLICADO – ELECTRODOMÉSTICOS*
Le informamos que se ha aplicado un recargo sobre *${textoCuotaRecargo}*.

💲 *Importe del recargo:* ${formatNumber(importeRecargo)}
📉 *Saldo actualizado:* ${saldoVenta}

📆 *Próxima cuota:*
${textoCuota}

Ante cualquier duda o consulta, quedamos a disposición.`;
    }

    return "";
}


function armarMensajeWhatsappElectroGrupal(base, pagosPendientes = []) {
    if (!base || !base.Venta || !base.Cliente) return "";

    const v = base.Venta;
    const nombreCliente = (v.ClienteNombre || "").trim();
    const saludo = obtenerSaludoWhatsapp();

    const pagosOrdenados = [...(pagosPendientes || [])]
        .sort((a, b) => new Date(a.FechaPago) - new Date(b.FechaPago));

    let totalPagado = 0;
    let detallePagos = "";

    pagosOrdenados.forEach((pago, index) => {

        // 🔥 IMPORTANTE: CALCULAR BIEN EL IMPORTE
        let importePago = 0;

        if (Array.isArray(pago.Detalles) && pago.Detalles.length > 0) {
            importePago = pago.Detalles.reduce((acc, d) => {
                return acc + Number(d.ImporteAplicado || 0);
            }, 0);
        } else {
            importePago = Number(pago.ImporteTotal || 0);
        }

        totalPagado += importePago;

        const cuotas = obtenerCuotasDelPagoElectro(base, pago);

        let textoCuotas = "Sin detalle de cuotas";
        if (cuotas.length > 0) {
            textoCuotas = cuotas.length === 1
                ? `Cuota ${cuotas[0].NumeroCuota}`
                : `Cuotas ${cuotas.map(c => c.NumeroCuota).join(", ")}`;
        }

        detallePagos += `🔹 *Pago ${index + 1}*\n`;
        detallePagos += `• Fecha: ${moment(pago.FechaPago).format("DD/MM/YYYY")}\n`;
        detallePagos += `• Aplicado a: ${textoCuotas}\n`;
        detallePagos += `• Importe: ${formatNumber(importePago)}\n`;

        if (pago.MedioPago) {
            detallePagos += `• Medio: ${pago.MedioPago}\n`;
        }

        detallePagos += `\n`;
    });

    const ultimoPago = pagosOrdenados[pagosOrdenados.length - 1];

    const saldoFinal = obtenerSaldoPostPago(
        base,
        Number(ultimoPago?.Id || 0)
    );

    const cuotasRestantes = Array.isArray(v.Cuotas)
        ? v.Cuotas.filter(c => Number(c.MontoRestante || 0) > 0).length
        : 0;

    const proximaCuota = obtenerProximaCuotaElectro(v);

    let textoCuota = "—";
    if (proximaCuota) {
        textoCuota =
            `Cuota ${proximaCuota.NumeroCuota} – ` +
            `${moment(proximaCuota.FechaVencimiento).format("DD/MM/YYYY")} – ` +
            `${formatNumber(proximaCuota.MontoRestante || 0)}`;
    }

    return `${saludo} ${nombreCliente} 👋

💳 *COBROS REGISTRADOS – ELECTRODOMÉSTICOS*

Se han registrado correctamente los siguientes pagos:

${detallePagos}💰 *Total abonado:* ${formatNumber(totalPagado)}

📊 *Cuotas restantes:* ${cuotasRestantes}

📆 *Próxima cuota a vencer:*
${textoCuota}

Muchas gracias por su pago 🙌
Ante cualquier consulta, quedamos a disposición.`;
}
function obtenerSaldoHastaCuota(base, nroCuota) {
    if (!base || !Array.isArray(base.Venta?.Cuotas)) return 0;

    // 🔥 ordenar SIEMPRE
    const cuotasOrdenadas = [...base.Venta.Cuotas]
        .sort((a, b) => Number(a.NumeroCuota) - Number(b.NumeroCuota));

    // 🔥 total inicial real
    let saldo = cuotasOrdenadas.reduce((acc, c) => {
        return acc +
            Number(c.MontoOriginal || 0) +
            Number(c.MontoRecargos || 0) -
            Number(c.MontoDescuentos || 0);
    }, 0);

    // 🔥 descontar cronológicamente
    for (const c of cuotasOrdenadas) {
        if (Number(c.NumeroCuota) > Number(nroCuota)) break;

        saldo -= Number(c.MontoPagado || 0);
    }

    if (saldo < 0) saldo = 0;

    return saldo;
}

function enviarWhatssapNormal(result) {
    var fecha = moment(result.InformacionVenta.Fecha).format('DD/MM/YYYY');
    var fechaHora = moment(result.InformacionVenta.Fecha).format('HH:mm');
    var fechaCobro = moment(result.Venta.FechaCobro).format('DD/MM/YYYY');

    const horaActual = new Date().getHours();
    let saludo;

    if (horaActual > 5 && horaActual < 12) {
        saludo = "Buenos días";
    } else if (horaActual > 5 && horaActual < 20) {
        saludo = "Buenas tardes";
    } else {
        saludo = "Buenas noches";
    }

    let mensaje = "";

    if (result.InformacionVenta.Descripcion != null) {
        const table = $('#grdRendimiento').DataTable();
        table.ajax.reload(null, false);

        if (result.InformacionVenta.Descripcion.includes("Venta")) {
            var totalVenta = result.InformacionVenta.Entrega + result.InformacionVenta.Restante;

            mensaje = `Hola ${result.Cliente.Nombre} ${result.Cliente.Apellido}, ${saludo}. ` +
                `Le informamos que el día ${fecha} hemos registrado una venta por $${totalVenta} pesos. ` +
                `Con una cantidad de ${result.ProductosVenta.length} productos:`;

            for (var i = 0; i < result.ProductosVenta.length; i++) {
                mensaje += ` ${result.ProductosVenta[i].Cantidad} ${result.ProductosVenta[i].Producto}`;
            }

            mensaje += `. Entrega de $${result.InformacionVenta.Entrega} pesos. ` +
                `El monto restante de la venta es de $${result.InformacionVenta.Restante} pesos, ` +
                `su primer fecha de cobro es ${fechaCobro}.`;

        } else {
            mensaje = `Hola ${result.Cliente.Nombre} ${result.Cliente.Apellido}, ${saludo}. ` +
                `Le informamos que el día ${fecha} hemos registrado un cobro por ${formatNumber(result.InformacionVenta.Entrega)} pesos.`;

            if (result.InformacionVenta.Interes > 0) {
                mensaje += ` Se ha agregado un interes de ${formatNumber(result.InformacionVenta.Interes)} pesos. `;
            }

            if (result.InformacionVenta.Restante > 0) {
                mensaje += ` El monto restante de la venta es de ${formatNumber(result.InformacionVenta.Restante)} pesos, ` +
                    `su nueva fecha de cobro es ${fechaCobro}.`;
            }

            var saldo = result.InformacionVenta.Deuda > 0
                ? result.InformacionVenta.Deuda
                : result.Cliente.Saldo;

            if (saldo > 0) {
                mensaje += ` Saldo total de todas sus ventas es de ${formatNumber(saldo)} pesos.`;
            } else {
                mensaje += ` No le queda saldo pendiente de sus ventas. `;
            }

            mensaje += " Muchas gracias por confiar en Indumentaria DG";
        }
    }

    if (result.InformacionVenta.ClienteAusente == 1) {
        const table = $('#grdClientesAusentes').DataTable();
        table.ajax.reload(null, false);

        mensaje = `Hola ${result.Cliente.Nombre} ${result.Cliente.Apellido}, ${saludo}. ` +
            `Le informamos que el día ${fecha} a las ${fechaHora} hemos visitado su casa para realizar un cobro ` +
            `y el cobrador no pudo encontrarlo en el domicilio. ¿Desea reprogramar la visita?`;

        if (userSession.IdRol != 2) {
            CantidadClientesAusentes();
        }
    }

    if (result.InformacionVenta.ClienteAusente == 1 &&
        result.InformacionVenta.Descripcion?.includes("Cobranza")) {

        mensaje = `Hola ${result.Cliente.Nombre} ${result.Cliente.Apellido}, ${saludo}. ` +
            `Le informamos que el día ${fecha} hemos visitado su casa para realizar un cobro ` +
            `y el cobrador no pudo encontrarlo en su domicilio. Su nueva fecha de cobro es ${fechaCobro}`;
    }

    if (result.InformacionVenta.ClienteAusente == 0 &&
        result.InformacionVenta.Entrega == 0 &&
        result.InformacionVenta.Descripcion?.includes("Cobranza")) {

        mensaje = `Hola ${result.Cliente.Nombre} ${result.Cliente.Apellido}, ${saludo}. ` +
            `Le informamos que el día ${fecha} hemos hecho un cambio de fecha de cobro en su venta. ` +
            `Su nueva fecha de cobro es ${fechaCobro}`;
    }

    if (result.InformacionVenta.TipoInteres === "VISITA CON CAMBIO") {
        mensaje = `${saludo}, ${result.Cliente.Nombre} ${result.Cliente.Apellido}. ` +
            `El día ${fecha} el cobrador pasó por su domicilio. Al reprogramarse el pago, ` +
            `se aplicó un recargo de ${formatNumber(result.InformacionVenta.Interes)}. ` +
            `Su nueva fecha de cobro es ${fechaCobro}. ` +
            `Saldo pendiente: ${formatNumber(result.InformacionVenta.Restante)}. ` +
            `Saldo total: ${formatNumber(result.Cliente.Saldo)}.`;
    }

    else if (result.InformacionVenta.TipoInteres === "INTERES DE 30 DIAS") {
        mensaje = `${saludo}, ${result.Cliente.Nombre}. ` +
            `Se cumplieron 30 días desde la venta. ` +
            `Interés aplicado: ${formatNumber(result.InformacionVenta.Interes)}.\n\n` +
            `• Saldo pendiente: ${formatNumber(result.InformacionVenta.Restante)}\n` +
            `• Próxima visita: ${fechaCobro}\n` +
            `• Total acumulado: ${formatNumber(result.Cliente.Saldo)}`;
    }

    else if (result.InformacionVenta.TipoInteres === "INTERES DE 60 DIAS") {
        mensaje = `${saludo}, ${result.Cliente.Nombre}. ` +
            `Su cuenta superó los 60 días.\n\n` +
            `• Interés: ${formatNumber(result.InformacionVenta.Interes)}\n` +
            `• Saldo pendiente: ${formatNumber(result.InformacionVenta.Restante)}\n` +
            `• Total acumulado: ${formatNumber(result.Cliente.Saldo)}\n` +
            `• Próxima visita: ${fechaCobro}`;
    }

    else if (result.InformacionVenta.TipoInteres === "PROMESA DE PAGO") {
        mensaje = `${saludo}, ${result.Cliente.Nombre}. ` +
            `No se recibió el comprobante prometido.\n\n` +
            `• Interés aplicado: ${formatNumber(result.InformacionVenta.Interes)}\n` +
            `• Saldo pendiente: ${formatNumber(result.InformacionVenta.Restante)}\n` +
            `• Total acumulado: ${formatNumber(result.Cliente.Saldo)}\n` +
            `• Nueva fecha: ${fechaCobro}`;
    }

    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlwsp = `https://api.whatsapp.com/send?phone=+549${result.Cliente.Telefono}&text=${mensajeCodificado}`;
    window.open(urlwsp, '_blank');
}

function obtenerSaludo() {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return "Buenos días";
    if (h >= 12 && h < 20) return "Buenas tardes";
    return "Buenas noches";
}

function abrirWhatsapp(telefono, mensaje) {
    const msg = encodeURIComponent(mensaje);
    const url = `https://api.whatsapp.com/send?phone=+549${telefono}&text=${msg}`;
    window.open(url, '_blank');
}

async function mostrarRendimiento(rendimiento) {
    if (rendimiento == 'Mensual' && !$('#vistaMensualRendimiento').is(':visible')) {
        await configurarDataMensual();

        if (document.getElementById("vistaDiariaRendimiento")) {
            document.getElementById("vistaDiariaRendimiento").hidden = true;
        }
        if (document.getElementById("vistaMensualRendimiento")) {
            document.getElementById("vistaMensualRendimiento").hidden = false;
        }

        document.getElementById("divCliente")?.setAttribute("hidden", "hidden");
        document.getElementById("RendimientoDiario")?.setAttribute("hidden", "hidden");
        document.getElementById("RendimientoClientesAusentes")?.setAttribute("hidden", "hidden");
        document.getElementById("divUsuarios")?.setAttribute("hidden", "hidden");

        document.getElementById("RendimientoMensual")?.removeAttribute("hidden");
        document.getElementById("RendimientoCobrado")?.removeAttribute("hidden");

        $("#btnRendMensual").removeClass("btn-inactivo").addClass("btn-activo");
        $("#btnRendDiario").removeClass("btn-activo").addClass("btn-inactivo");
    }

    if (rendimiento == 'Diario' && !$('#vistaDiariaRendimiento').is(':visible')) {
        if ($.fn.DataTable.isDataTable('#grdRendimiento')) {
            $('#grdRendimiento').DataTable().clear().draw();
        }

        await configurarDataDiario();

        if (document.getElementById("vistaMensualRendimiento")) {
            document.getElementById("vistaMensualRendimiento").hidden = true;
        }
        if (document.getElementById("vistaDiariaRendimiento")) {
            document.getElementById("vistaDiariaRendimiento").hidden = false;
        }

        document.getElementById("RendimientoMensual")?.setAttribute("hidden", "hidden");
        document.getElementById("RendimientoCobrado")?.setAttribute("hidden", "hidden");

        if (userSession.IdRol != 4) {
            document.getElementById("divCliente")?.removeAttribute("hidden");
        }

        document.getElementById("RendimientoDiario")?.removeAttribute("hidden");
        document.getElementById("RendimientoClientesAusentes")?.removeAttribute("hidden");
        document.getElementById("divUsuarios")?.removeAttribute("hidden");

        $("#btnRendMensual").removeClass("btn-activo").addClass("btn-inactivo");
        $("#btnRendDiario").removeClass("btn-inactivo").addClass("btn-activo");
    }

    ajustarTablasRendimiento();
}

async function CantidadClientesAusentes() {
    var url = "/Rendimiento/MostrarCantidadClientesAusentes";

    let value = JSON.stringify({});

    let options = {
        type: "POST",
        url: url,
        async: true,
        data: value,
        contentType: "application/json",
        dataType: "json"
    };

    let result = await MakeAjax(options);

    if (result != null) {
        document.getElementById("notificationHome").style.display = "inline";
        document.getElementById("notificationHome").textContent = ` (${result.cantidad})`;
    } else {
        document.getElementById("notificationIcon").style.display = "block";
    }
}

const cacheImagenes = {};

async function ObtenerImagen(id, origen) {

    let url = `/Rendimiento/ObtenerImagen?id=${id}&origen=${encodeURIComponent(origen)}`;

    let result = await $.ajax({
        type: "GET",
        url: url,
        dataType: "json"
    });

    return result?.data || null;
}

async function verComprobante(id, descripcion) {

    const origen = (descripcion || "").toLowerCase().includes("electro")
        ? "ELECTRO"
        : "INDUMENTARIA";

    const image = await ObtenerImagen(id, origen);

    if (!image) {
        errorModal("No hay comprobante");
        return;
    }

    let src = image;

    // 🔥 SI YA VIENE CON data:image → usar directo
    if (!image.startsWith("data:image")) {
        src = "data:image/png;base64," + image;
    }

    document.getElementById("imagenComprobante").src = src;

    $('#modalComprobante').modal('show');
}
async function cargarTiposDeNegocio() {
    try {
        var url = "/Usuarios/ListarTipoNegocio";

        let value = JSON.stringify({});

        let options = {
            type: "POST",
            url: url,
            async: true,
            data: value,
            contentType: "application/json",
            dataType: "json"
        };

        let result = await MakeAjax(options);

        if (result != null) {
            let selectUsuarios = document.getElementById("TipoNegocio");

            $('#TipoNegocio option').remove();

            if (userSession.IdRol == 1 || userSession.IdRol == 4) {
                let option = document.createElement("option");
                option.value = -1;
                option.text = "Todos";
                selectUsuarios.appendChild(option);
            }

            for (let i = 0; i < result.data.length; i++) {
                let option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre;
                selectUsuarios.appendChild(option);
            }
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.');
        $('.datos-error').removeClass('d-none');
    }
}

const bloqueoSistema = async (id, estado) => {
    try {
        var url = "/Usuarios/BloqueoSistema";

        let value = JSON.stringify({
            id: id,
            bloqueo: estado
        });

        let options = {
            type: "POST",
            url: url,
            async: true,
            data: value,
            contentType: "application/json",
            dataType: "json"
        };

        let result = await MakeAjax(options);

        if (result.Status) {
            $('.datos-error').removeClass('d-none');
            cargarUsuarios();
        } else {
            $('.datos-error').text('Ha ocurrido un error en los datos.');
            $('.datos-error').removeClass('d-none');
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.');
        $('.datos-error').removeClass('d-none');
    }
};

function sumarFecha() {
    var FechaDesde = document.getElementById("FechaDesde").value;
    var FechaHasta = document.getElementById("FechaHasta").value;

    let FechaDesdeNew = moment(FechaDesde).add(1, 'days').format('YYYY-MM-DD');
    let FechaHastaNew = moment(FechaHasta).add(1, 'days').format('YYYY-MM-DD');

    document.getElementById("FechaDesde").value = FechaDesdeNew;
    document.getElementById("FechaHasta").value = FechaHastaNew;
}

function restarFecha() {
    var FechaDesde = document.getElementById("FechaDesde").value;
    var FechaHasta = document.getElementById("FechaHasta").value;

    let FechaDesdeNew = moment(FechaDesde).add(-1, 'days').format('YYYY-MM-DD');
    let FechaHastaNew = moment(FechaHasta).add(-1, 'days').format('YYYY-MM-DD');

    document.getElementById("FechaDesde").value = FechaDesdeNew;
    document.getElementById("FechaHasta").value = FechaHastaNew;
}

function configurarOpcionesColumnas() {
    const grid = $('#grdRendimiento').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');

    const storageKey = `Rendimientos_Columnas`;
    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        const nombreColumna = obtenerNombreColumnaRendimiento(index, col);

        if (nombreColumna && nombreColumna !== "Id" && nombreColumna !== "Activo" && nombreColumna !== "Imagen") {
            if (userSession.IdRol == 4) {
                if (index == 3 || index == 4 || index == 5 || index == 6 || index == 7) {
                    return;
                }
            }

            const isChecked = savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            grid.column(index).visible(isChecked);

            container.append(`
                <li>
                    <label class="dropdown-item">
                        <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? 'checked' : ''}>
                        ${nombreColumna}
                    </label>
                </li>
            `);
        }
    });

    $('.toggle-column').off('change').on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');
        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));
        grid.column(columnIdx).visible(isChecked);
        ajustarTablasRendimiento();
    });
}

function obtenerNombreColumnaRendimiento(index, col) {
    const nombres = [
        "Fecha",
        "Metodo Pago",
        "Cuenta Bancaria",
        "Cliente",
        "Capital Inicial",
        "Ventas",
        "Cobros",
        "Interes",
        "Capital Final",
        "Proximo Cobro",
        "Vencimiento",
        "Tipo de Negocio",
        "Descripcion",
        "Acciones"
    ];

    if (nombres[index]) return nombres[index];
    if (col && col.data) return col.data;
    return `Columna ${index + 1}`;
}

async function cargarCuentas() {
    try {
        var url = "/Cobranzas/ListaCuentasBancarias";

        let value = JSON.stringify({
            metodopago: document.getElementById("MetodoPago").options[document.getElementById("MetodoPago").selectedIndex].text
        });

        let options = {
            type: "POST",
            url: url,
            async: true,
            data: value,
            contentType: "application/json",
            dataType: "json"
        };

        let result = await MakeAjax(options);

        if (result != null) {
            let select = document.getElementById("CuentaPago");

            $('#CuentaPago option').remove();

            let option = document.createElement("option");
            option.value = -1;
            option.text = "Todos";
            select.appendChild(option);

            for (let i = 0; i < result.length; i++) {
                let option = document.createElement("option");
                option.value = result[i].Id;
                option.text = result[i].Nombre;
                select.appendChild(option);
            }
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.');
        $('.datos-error').removeClass('d-none');
    }
}

async function habilitarCuentas() {
    var formaPagoSelect = document.getElementById("MetodoPago");
    var cuenta = document.getElementById("CuentaPago");
    var cuentaLbl = document.getElementById("lblCuentaPago");

    await cargarCuentas();

    if (
        formaPagoSelect.value.toUpperCase() === "TRANSFERENCIA PROPIA" ||
        formaPagoSelect.value.toUpperCase() === "TRANSFERENCIA A TERCEROS"
    ) {
        cuenta.hidden = false;
        cuentaLbl.hidden = false;
    } else {
        cuenta.value = -1;
        cuenta.hidden = true;
        cuentaLbl.hidden = true;
    }

    ajustarTablasRendimiento();
}

const eliminarInformacion = async (id, descripcion = "") => {
    if (userSession.IdRol != 1) {
        alert("No tienes permisos para realizar esta accion.");
        return false;
    }

    try {
        if (!confirm("¿Está seguro que desea eliminar esta informacion?")) return;

        const esElectro = descripcion?.toLowerCase().includes("electro");

        let url = "";
        let payload = {};

        if (esElectro) {
            // 🔴 ELECTRODOMESTICOS
            url = "/Ventas_Electrodomesticos/EliminarPago";
            payload = { idPago: id };
        } else {
            // 🔵 NORMAL
            url = "/Ventas/EliminarInformacionVenta";
            payload = { Id: id };
        }

        const result = await MakeAjax({
            type: "POST",
            url: url,
            async: true,
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json"
        });

        if (result.success || result.data) {
            alert('Información eliminada correctamente.');
            gridRendimiento.ajax.reload(null, false);
        } else {
            alert(result.message || "Error al eliminar.");
        }

    } catch (error) {
        console.error(error);
        alert("Error inesperado.");
    }
};
function ajustarTablasRendimiento() {
    setTimeout(function () {
        if ($.fn.DataTable.isDataTable('#grdRendimiento')) {
            $('#grdRendimiento').DataTable().columns.adjust().draw(false);
        }
        if ($.fn.DataTable.isDataTable('#grdClientesAusentes')) {
            $('#grdClientesAusentes').DataTable().columns.adjust().draw(false);
        }
        if ($.fn.DataTable.isDataTable('#grdRendimientoGeneral')) {
            $('#grdRendimientoGeneral').DataTable().columns.adjust().draw(false);
        }
        if ($.fn.DataTable.isDataTable('#grdRendimientoCobrado')) {
            $('#grdRendimientoCobrado').DataTable().columns.adjust().draw(false);
        }
    }, 120);
}

function formatNumber(number) {
    if (number == null || number === "") return "0";
    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}

function mostrarError(mensaje) {
    alert(mensaje || "Ha ocurrido un error.");
}


const safeMoment = (v) => {
    if (!v) return null;
    const m = moment(v);
    return m.isValid() ? m : null;
};

const chunkedMapReduce = async (items, chunkSize, fn) => {
    for (let i = 0; i < items.length; i += chunkSize) {
        const end = Math.min(i + chunkSize, items.length);
        for (let j = i; j < end; j++) {
            fn(items[j], j);
        }
        await new Promise(requestAnimationFrame);
    }
};

function setChartLoading(canvasId, text = "Cargando...") {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    parent.style.position = "relative";

    let overlay = parent.querySelector(".chart-loading-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "chart-loading-overlay";
        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.background = "rgba(8, 15, 40, 0.45)";
        overlay.style.backdropFilter = "blur(2px)";
        overlay.style.zIndex = "2";
        overlay.style.borderRadius = "16px";
        overlay.style.pointerEvents = "none"; // 👈 ESTO ES TODO
        overlay.innerHTML = `
            <div style="
                color:#dbeafe;
                font-weight:700;
                font-size:14px;
                padding:10px 16px;
                border:1px solid rgba(255,255,255,.15);
                border-radius:999px;
                background:rgba(255,255,255,.06);
            ">${text}</div>
        `;
        parent.appendChild(overlay);
    } else {
        overlay.querySelector("div").textContent = text;
        overlay.style.display = "flex";
    }
}

function clearChartLoading(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const overlay = parent.querySelector(".chart-loading-overlay");
    if (overlay) overlay.style.display = "none";
}

function destroyChart(chartKey, canvasId = null) {
    try {
        const existingRef = dashboardCharts[chartKey];

        if (existingRef && typeof existingRef.destroy === "function") {
            existingRef.destroy();
        }

        dashboardCharts[chartKey] = null;

        if (canvasId) {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                const chartOnCanvas = Chart.getChart(canvas);
                if (chartOnCanvas && typeof chartOnCanvas.destroy === "function") {
                    chartOnCanvas.destroy();
                }
            }
        }
    } catch (e) {
        console.error(`Error destruyendo ${chartKey}:`, e);
        dashboardCharts[chartKey] = null;
    }
}

function destroyAllCharts() {
    destroyChart("chartVentasCobros", "chartVentasCobros");
    destroyChart("chartMetodosPago", "chartMetodosPago");
    destroyChart("chartCapital", "chartCapital");
    destroyChart("chartVentasMensual", "chartVentasMensual");
    destroyChart("chartCobrosMensual", "chartCobrosMensual");
}



function gradientColors(ctx, c1, c2) {
    const chart = ctx.chart;
    const { ctx: canvasCtx, chartArea } = chart;

    if (!chartArea) return c1;

    const g = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    return g;
}

function baseOptions(isMonthly = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 500
        },
        interaction: {
            mode: "index",
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                labels: {
                    color: "#e5e7eb",
                    font: {
                        weight: "600"
                    }
                }
            },
            tooltip: {
                backgroundColor: "rgba(15, 23, 42, 0.96)",
                titleColor: "#fff",
                bodyColor: "#fff",
                borderColor: "rgba(255,255,255,.12)",
                borderWidth: 1,
                callbacks: {
                    label: function (ctx) {
                        return `${ctx.dataset.label || ""}: ${formatNumber(safeNumber(ctx.raw))}`;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: "#cbd5e1",
                    maxRotation: isMonthly ? 0 : 0,
                    minRotation: 0
                },
                grid: {
                    color: "rgba(255,255,255,.05)"
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    color: "#cbd5e1",
                    callback: function (value) {
                        return formatNumber(safeNumber(value));
                    }
                },
                grid: {
                    color: "rgba(255,255,255,.06)"
                }
            }
        }
    };
}

const dashboardCharts = {
    chartVentasCobros: null,
    chartMetodosPago: null,
    chartCapital: null,
    chartVentasMensual: null,
    chartCobrosMensual: null
};

let dashboardRenderToken = 0;


// =========================
// AGRUPAR Y RESUMIR
// =========================
async function buildDashboardData(rows) {
    const resumen = {
        totalVentas: 0,
        totalCobros: 0,
        totalInteres: 0,
        efectivo: 0,
        transferencia: 0,
        capital: 0,
        capitalRojo: 0,
        ventasPorMes: {},
        cobrosPorMes: {}
    };

    const hoy = moment().startOf("day");

    await chunkedMapReduce(rows, 400, (row) => {
        const descripcion = safeString(row.Descripcion);
        const metodo = safeUpper(row.MetodoPago);
        const venta = safeNumber(row.Venta);
        const cobro = safeNumber(row.Cobro);
        const interes = safeNumber(row.Interes);
        const capitalFinal = safeNumber(row.CapitalFinal);

        const fecha = safeMoment(row.Fecha);
        const fechaLimite = safeMoment(row.FechaLimite);

        if (capitalFinal > 0) {
            resumen.capital += capitalFinal;

            if (fechaLimite && fechaLimite.isBefore(hoy, "day")) {
                resumen.capitalRojo += capitalFinal;
            }
        }

        if (descripcion.includes("Venta")) {
            resumen.totalVentas += venta;

            if (fecha) {
                const key = fecha.format("YYYY-MM");
                if (!resumen.ventasPorMes[key]) {
                    resumen.ventasPorMes[key] = 0;
                }
                resumen.ventasPorMes[key] += venta;
            }
        }

        if (descripcion.includes("Cobranza")) {
            resumen.totalCobros += cobro;

            if (fecha) {
                const key = fecha.format("YYYY-MM");
                if (!resumen.cobrosPorMes[key]) {
                    resumen.cobrosPorMes[key] = 0;
                }
                resumen.cobrosPorMes[key] += cobro;
            }

            const metodo = safeUpper(row.MetodoPago).trim();

            if (metodo.includes("EFECTIVO")) {
                resumen.efectivo += cobro;
            }
            else if (metodo.includes("TRANSFERENCIA")) {
                resumen.transferencia += cobro;
            }
        }

        if (safeUpper(descripcion).includes("INTERES")) {
            resumen.totalInteres += interes;
        }
    });

    const allMonthKeys = Array.from(
        new Set([
            ...Object.keys(resumen.ventasPorMes),
            ...Object.keys(resumen.cobrosPorMes)
        ])
    ).sort();

    resumen.monthLabels = allMonthKeys.map(k => moment(k + "-01").format("MMM YYYY"));
    resumen.monthVentas = allMonthKeys.map(k => safeNumber(resumen.ventasPorMes[k]));
    resumen.monthCobros = allMonthKeys.map(k => safeNumber(resumen.cobrosPorMes[k]));

    return resumen;
}

// =========================
// RENDER CHARTS
// =========================
function renderVentasCobrosChart(resumen) {
    const canvasId = "chartVentasCobros";

    try {
        destroyChart("chartVentasCobros", canvasId);

        const canvas = document.getElementById(canvasId);
        if (!canvas) throw new Error("Canvas no encontrado");

        dashboardCharts.chartVentasCobros = new Chart(canvas, {
            type: "bar",
            data: {
                labels: ["Ventas", "Cobros"],
                datasets: [{
                    label: "Totales",
                    data: [
                        safeNumber(resumen.totalVentas),
                        safeNumber(resumen.totalCobros)
                    ],
                    borderRadius: 10,
                    barThickness: 46,
                    backgroundColor: (context) => {
                        const colors = [
                            ["#60a5fa", "#2563eb"],
                            ["#4ade80", "#16a34a"]
                        ];
                        const pair = colors[context.dataIndex] || ["#60a5fa", "#2563eb"];
                        return gradientColors(context, pair[0], pair[1]);
                    }
                }]
            },
            options: baseOptions()
        });
    } catch (e) {
        console.error("Error chartVentasCobros:", e);
    } finally {
        clearChartLoading(canvasId);
    }
}

function renderMetodosPagoChart(resumen) {
    const canvasId = "chartMetodosPago";

    try {
        destroyChart("chartMetodosPago", canvasId);

        const canvas = document.getElementById(canvasId);
        if (!canvas) throw new Error("Canvas no encontrado");

        dashboardCharts.chartMetodosPago = new Chart(canvas, {
            type: "doughnut",
            data: {
                labels: ["Efectivo", "Transferencia"],
                datasets: [{
                    data: [
                        safeNumber(resumen.efectivo),
                        safeNumber(resumen.transferencia)
                    ],
                    backgroundColor: ["#f59e0b", "#06b6d4"],
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: {
                ...baseOptions(),
                cutout: "68%",
                scales: undefined
            }
        });
    } catch (e) {
        console.error("Error chartMetodosPago:", e);
    } finally {
        clearChartLoading(canvasId);
    }
}

function renderCapitalChart(resumen) {
    const canvasId = "chartCapital";

    try {
        destroyChart("chartCapital", canvasId);

        const canvas = document.getElementById(canvasId);
        if (!canvas) throw new Error("Canvas no encontrado");

        dashboardCharts.chartCapital = new Chart(canvas, {
            type: "bar",
            data: {
                labels: ["Capital", "Capital en rojo", "Interés"],
                datasets: [{
                    label: "Totales",
                    data: [
                        safeNumber(resumen.capital),
                        safeNumber(resumen.capitalRojo),
                        safeNumber(resumen.totalInteres)
                    ],
                    borderRadius: 10,
                    barThickness: 42,
                    backgroundColor: (context) => {
                        const colors = [
                            ["#a78bfa", "#7c3aed"],
                            ["#fb7185", "#e11d48"],
                            ["#34d399", "#10b981"]
                        ];
                        const pair = colors[context.dataIndex] || ["#a78bfa", "#7c3aed"];
                        return gradientColors(context, pair[0], pair[1]);
                    }
                }]
            },
            options: baseOptions()
        });
    } catch (e) {
        console.error("Error chartCapital:", e);
    } finally {
        clearChartLoading(canvasId);
    }
}

function renderVentasMensualChart(resumen) {
    const canvasId = "chartVentasMensual";

    try {
        destroyChart("chartVentasMensual", canvasId);

        const canvas = document.getElementById(canvasId);
        if (!canvas) throw new Error("Canvas no encontrado");

        dashboardCharts.chartVentasMensual = new Chart(canvas, {
            type: "bar",
            data: {
                labels: Array.isArray(resumen.monthLabels) ? resumen.monthLabels : [],
                datasets: [{
                    label: "Ventas",
                    data: Array.isArray(resumen.monthVentas) ? resumen.monthVentas.map(safeNumber) : [],
                    backgroundColor: "#3b82f6",
                    borderRadius: 6,
                    maxBarThickness: 46
                }]
            },
            options: baseOptions(true)
        });
    } catch (e) {
        console.error("Error chartVentasMensual:", e);
    } finally {
        clearChartLoading(canvasId);
    }
}


function renderCobrosMensualChart(resumen) {
    const canvasId = "chartCobrosMensual";

    try {
        destroyChart("chartCobrosMensual", canvasId);

        const canvas = document.getElementById(canvasId);
        if (!canvas) throw new Error("Canvas no encontrado");

        dashboardCharts.chartCobrosMensual = new Chart(canvas, {
            type: "bar",
            data: {
                labels: Array.isArray(resumen.monthLabels) ? resumen.monthLabels : [],
                datasets: [{
                    label: "Cobros",
                    data: Array.isArray(resumen.monthCobros) ? resumen.monthCobros.map(safeNumber) : [],
                    backgroundColor: "#22c55e",
                    borderRadius: 6,
                    maxBarThickness: 46
                }]
            },
            options: baseOptions(true)
        });
    } catch (e) {
        console.error("Error chartCobrosMensual:", e);
    } finally {
        clearChartLoading(canvasId);
    }
}
// =========================
// RENDER PRINCIPAL
// =========================
async function renderDashboard() {
    if (isRenderingDashboard) return;

    isRenderingDashboard = true;

    try {
        const myToken = ++dashboardRenderToken;

        const table = $.fn.DataTable.isDataTable('#grdRendimiento')
            ? $('#grdRendimiento').DataTable()
            : null;

        if (!table) {
            destroyAllCharts();
            return;
        }

        const data = table.rows({ search: "applied" }).data().toArray();

        if (!data || data.length === 0) {
            destroyAllCharts();
            clearChartLoading("chartVentasCobros");
            clearChartLoading("chartMetodosPago");
            clearChartLoading("chartCapital");
            clearChartLoading("chartVentasMensual");
            clearChartLoading("chartCobrosMensual");
            return;
        }

        setChartLoading("chartVentasCobros", "Calculando ventas y cobros...");
        setChartLoading("chartMetodosPago", "Calculando métodos...");
        setChartLoading("chartCapital", "Calculando capital...");
        setChartLoading("chartVentasMensual", "Calculando evolución mensual...");
        setChartLoading("chartCobrosMensual", "Calculando evolución mensual...");

        await new Promise(requestAnimationFrame);

        const resumen = await buildDashboardData(data);

        if (myToken !== dashboardRenderToken) return;

        await new Promise(requestAnimationFrame);

        destroyAllCharts();

        renderVentasCobrosChart(resumen);
        renderMetodosPagoChart(resumen);
        renderCapitalChart(resumen);
        renderVentasMensualChart(resumen);
        renderCobrosMensualChart(resumen);

    } catch (e) {
        console.error("Error renderDashboard:", e);
        destroyAllCharts();
    } finally {
        clearChartLoading("chartVentasCobros");
        clearChartLoading("chartMetodosPago");
        clearChartLoading("chartCapital");
        clearChartLoading("chartVentasMensual");
        clearChartLoading("chartCobrosMensual");

        isRenderingDashboard = false;
    }
}

// =========================
// DISPARADOR DIFERIDO
// =========================
let dashboardTimer = null;

function scheduleRenderDashboard(delay = 120) {
    if (dashboardTimer) {
        clearTimeout(dashboardTimer);
    }

    dashboardTimer = setTimeout(() => {
        renderDashboard().catch(err => console.error("Error renderDashboard:", err));
    }, delay);
}
function showGlobalLoading(text = "Cargando datos...") {
    const loading = document.getElementById("globalLoading");
    if (!loading) return;

    loading.classList.remove("hidden");
    loading.querySelector(".loading-text").textContent = text;

    document.body.classList.add("loading"); // 🔥 bloquea scroll
}

function hideGlobalLoading() {
    const loading = document.getElementById("globalLoading");
    if (!loading) return;

    loading.classList.add("hidden");
    document.body.classList.remove("loading");
}


function normalizarFechaComparable(fecha) {
    if (!fecha) return 0;

    const t = new Date(fecha).getTime();
    return Number.isFinite(t) ? t : 0;
}

function ordenarPagosCronologicamente(pagos = []) {
    if (!Array.isArray(pagos)) return [];

    return [...pagos].sort((a, b) => {
        const fa = normalizarFechaComparable(a?.FechaPago);
        const fb = normalizarFechaComparable(b?.FechaPago);

        if (fa !== fb) return fa - fb;

        const ia = Number(a?.Id || 0);
        const ib = Number(b?.Id || 0);
        return ia - ib;
    });
}

function obtenerImportePago(pago) {
    return Number(pago?.ImporteTotal || pago?.Importe || 0);
}

function obtenerSaldoInicialElectro(base) {
    if (!base || !base.Venta) return 0;

    // Prioridad 1: usar el total real financiado desde cuotas
    if (Array.isArray(base.Venta.Cuotas) && base.Venta.Cuotas.length) {
        return base.Venta.Cuotas.reduce((acc, c) => {
            const totalCuota =
                Number(c.MontoOriginal || 0) +
                Number(c.MontoRecargos || 0) -
                Number(c.MontoDescuentos || 0);

            return acc + totalCuota;
        }, 0);
    }

    // Prioridad 2: restante de la venta
    if (base.Venta.Restante != null) {
        return Number(base.Venta.Restante || 0);
    }

    // Prioridad 3: total de venta
    return Number(base.Venta.ImporteTotal || 0);
}

function obtenerPagoActual(base) {
    if (!base || !Array.isArray(base.Pagos)) return null;

    const idPagoActual = Number(base.IdPagoActual || 0);
    if (!idPagoActual) return null;

    return base.Pagos.find(p => Number(p.Id || 0) === idPagoActual) || null;
}

function obtenerCuotasDelPagoActual(base, pagoActual) {
    if (!base || !base.Venta || !Array.isArray(base.Venta.Cuotas) || !pagoActual) return [];

    const detalles = Array.isArray(pagoActual.Detalles) ? pagoActual.Detalles : [];
    if (!detalles.length) return [];

    const cuotas = [];

    detalles.forEach(det => {
        const cuota = base.Venta.Cuotas.find(c => Number(c.Id) === Number(det.IdCuota));
        if (cuota) {
            cuotas.push({
                ...cuota,
                ImporteAplicadoEnEstePago: Number(det.ImporteAplicado || 0)
            });
        }
    });

    return cuotas.sort((a, b) => Number(a.NumeroCuota || 0) - Number(b.NumeroCuota || 0));
}

function obtenerSaludoWhatsapp() {
    const h = new Date().getHours();

    if (h >= 5 && h < 12) return "Buenos días";
    if (h >= 12 && h < 20) return "Buenas tardes";
    return "Buenas noches";
}

function obtenerProximaCuotaElectro(venta) {
    if (!venta || !Array.isArray(venta.Cuotas)) return null;

    return [...venta.Cuotas]
        .filter(c => Number(c.MontoRestante || 0) > 0)
        .sort((a, b) => new Date(a.FechaVencimiento || 0) - new Date(b.FechaVencimiento || 0))[0] || null;
}

function obtenerPagoActualElectro(base) {
    const idPagoActual = Number(base?.IdPagoActual || 0);

    if (!Array.isArray(base?.Pagos)) return null;

    return base.Pagos.find(p => Number(p.Id) === idPagoActual) || null;
}

function obtenerCuotasDelPagoElectro(base, pagoActual) {
    if (!base || !base.Venta || !Array.isArray(base.Venta.Cuotas) || !pagoActual || !Array.isArray(pagoActual.Detalles)) {
        return [];
    }

    return pagoActual.Detalles
        .map(det => {
            const cuota = base.Venta.Cuotas.find(c => Number(c.Id) === Number(det.IdCuota));
            if (!cuota) return null;

            return {
                Id: cuota.Id,
                NumeroCuota: Number(cuota.NumeroCuota || 0),
                FechaVencimiento: cuota.FechaVencimiento,
                ImporteAplicado: Number(det.ImporteAplicado || 0),
                MontoRestante: Number(cuota.MontoRestante || 0)
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.NumeroCuota - b.NumeroCuota);
}

function obtenerCuotaObjetivoElectro(base, nroCuota = null, pagoActual = null) {
    const cuotas = Array.isArray(base?.Venta?.Cuotas) ? [...base.Venta.Cuotas] : [];

    if (!cuotas.length) return null;

    if (nroCuota) {
        const encontrada = cuotas.find(c => Number(c.NumeroCuota) === Number(nroCuota));
        if (encontrada) return encontrada;
    }

    if (pagoActual) {
        const cuotasDelPago = obtenerCuotasDelPagoElectro(base, pagoActual);
        if (cuotasDelPago.length === 1) {
            return cuotas.find(c => Number(c.Id) === Number(cuotasDelPago[0].Id)) || null;
        }
        if (cuotasDelPago.length > 1) {
            return cuotas.find(c => Number(c.Id) === Number(cuotasDelPago[cuotasDelPago.length - 1].Id)) || null;
        }
    }

    return cuotas
        .filter(c => Number(c.MontoPagado || 0) > 0)
        .sort((a, b) => Number(b.NumeroCuota || 0) - Number(a.NumeroCuota || 0))[0] || null;
}

async function marcarWhatssapElectro(id, descripcion = "") {
    return await MakeAjax({
        type: "POST",
        url: "/Ventas_Electrodomesticos/MarcarWhatssap",
        async: true,
        data: JSON.stringify({
            id: id,
            descripcion: descripcion
        }),
        contentType: "application/json",
        dataType: "json"
    });
}

async function marcarWhatssapMultiplesElectro(idsPagos = []) {
    return await MakeAjax({
        type: "POST",
        url: "/Ventas_Electrodomesticos/MarcarWhatssapMultiples",
        async: true,
        data: JSON.stringify({
            idsPagos: idsPagos
        }),
        contentType: "application/json",
        dataType: "json"
    });
}

function extraerNroCuotaDesdeDescripcion(descripcion) {
    if (!descripcion) return null;

    const match = String(descripcion).match(/cuota\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
}