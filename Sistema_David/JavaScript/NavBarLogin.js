let listaVacia = false;
let tipoVentas = localStorage.getItem("tipoSistemaVentas");

function esNavbarMovil() {
    return window.matchMedia("(max-width: 1199.98px)").matches;
}

const MODULOS_VENTA = {
    indumentaria: {
        listado: "/Ventas",
        nuevomodif: "/Ventas/Nuevo",
        cobranza: "/Cobranzas/Index"
    },
    electro: {
        listado: "/Ventas_Electrodomesticos/Historial",
        nuevomodif: "/Ventas_Electrodomesticos/NuevoModif",
        cobranza: "/Ventas_Electrodomesticos/Cobros"
    }
};

document.addEventListener("DOMContentLoaded", async function () {

    var userSession = JSON.parse(localStorage.getItem('usuario'));

    initMobileNavMenu();

    if (userSession != null) {
        $('#nombre').text(userSession.Nombre);
        if (userSession.IdRol != 2) {
            var divComp = document.getElementById("divNotificacionComprobante");
            var divHome = document.getElementById("divNotificacionHome");
            if (divComp) divComp.removeAttribute("hidden");
            if (divHome) divHome.removeAttribute("hidden");
            CantidadCasitasRojas();
            CantidadComprobantes();
            CantidadStocksPendientes();
            initAlertasNavbar();
        }
    }

    if (userSession) {
        var userFullName = ((userSession.Nombre || "") + " " + (userSession.Apellido || "")).trim();
        $("#userName").text(userFullName);
        var avatar = document.getElementById("dgAvatarLetra");
        if (avatar) avatar.textContent = (userFullName.charAt(0) || "U").toUpperCase();
    }

    if (userSession) await verificarRoles(userSession.IdRol);
    if (userSession && userSession.IdRol == 1) {
        try {
            const r = await $.getJSON("/Productos/ContarPendientes");
            const n = (r && r.Count) || 0;
            const badge = document.getElementById("badgeProdPendientes");
            if (badge && n > 0) {
                badge.textContent = n;
                badge.removeAttribute("hidden");
            }
        } catch (e) { }
    }

    // ============================
    //  DROPDOWN ORIGINAL
    // ============================
    function esDropdownProductos(el) {
        if (!el || !el.closest) return false;
        return !!el.closest('#prodDropColumnas, #prodDropMas, #prodHeadActions, .prod-head, .prod-root');
    }

    var dropdownToggleList = document.querySelectorAll('.dropdown-toggle');

    function cerrarDropdownsNavbar(exceptoMenu) {
        document.querySelectorAll('.dg-navbar .dropdown-menu.show').forEach(function (dropdownMenu) {
            if (esDropdownProductos(dropdownMenu)) return;
            if (exceptoMenu && dropdownMenu === exceptoMenu) return;
            dropdownMenu.classList.remove('show');
            var toggle = dropdownMenu.previousElementSibling;
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
        });
    }

    dropdownToggleList.forEach(function (dropdownToggle) {
        if (esDropdownProductos(dropdownToggle)) return;
        // Solo toggles del navbar (usuario / soporte); no pelear con dropdowns de páginas
        if (!dropdownToggle.closest('.dg-navbar')) return;

        dropdownToggle.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            cerrarPanelAlertasNavbar();
            var dropdownMenu = dropdownToggle.nextElementSibling;
            if (!dropdownMenu || !dropdownMenu.classList.contains('dropdown-menu')) return;
            var isExpanded = dropdownToggle.getAttribute('aria-expanded') === 'true';
            if (isExpanded) {
                dropdownMenu.classList.remove('show');
                dropdownToggle.setAttribute('aria-expanded', 'false');
            } else {
                cerrarDropdownsNavbar();
                dropdownMenu.classList.add('show');
                dropdownToggle.setAttribute('aria-expanded', 'true');
            }
        });
    });

    document.addEventListener('click', function (event) {
        var isDropdownToggle = event.target.closest('.dg-navbar .dropdown-toggle');
        var isDropdownMenu = event.target.closest('.dg-navbar .dropdown-menu');

        if (!isDropdownToggle && !isDropdownMenu) {
            cerrarDropdownsNavbar();
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            cerrarDropdownsNavbar();
            cerrarPanelAlertasNavbar();
        }
    });

    // ============================
    // 🔥 AGREGADO — MODO DE VENTAS
    // ============================


      function puedeCambiarTipo(usuario) {
        if (!usuario) return false;

        const nombre = (usuario.Usuario || "").toLowerCase().trim();
        const rol = Number(usuario.IdRol);

          return rol === 1 || nombre === "var" || nombre === "varela87." || nombre === "milagros" || nombre === "milagroscomprobantes";
    }

    //const tienePermiso = puedeCambiarTipo(userSession);
    const tienePermiso = true;

    // 🔒 SI NO TIENE PERMISO → FORZAR INDUMENTARIA
    if (!tienePermiso) {
        tipoVentas = "indumentaria";
        localStorage.setItem("tipoSistemaVentas", tipoVentas);

        let btnCambio = document.getElementById("btnCambiarTipoVentas");
        let divCambio = document.getElementById("divbtnCambiarTipoVentas");
        if (divCambio) divCambio.setAttribute("hidden", "true");
        if (btnCambio) {
            btnCambio.classList.add("disabled");
            btnCambio.style.pointerEvents = "none";
            btnCambio.style.opacity = "0.6";
        }
    }

    function setModeInlineOpen(open) {
        var item = document.getElementById("divbtnCambiarTipoVentas");
        var panel = document.getElementById("dgModeInlinePanel");
        var btn = document.getElementById("btnCambiarTipoVentas");
        if (!item || !panel || !btn) return;
        item.classList.toggle("is-open", !!open);
        if (open) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "true");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function marcarOpcionModoActiva(tipo) {
        document.querySelectorAll(".dg-mode-option").forEach(function (opt) {
            opt.classList.toggle("is-active", opt.dataset.tipo === tipo);
        });
    }

    function seleccionarTipoVentas(tipo) {
        if (!tipo) return;
        tipoVentas = tipo;
        localStorage.setItem("tipoSistemaVentas", tipo);
        aplicarEtiquetaModo(tipo);
        actualizarHrefsModuloVentas(tipo);
        marcarOpcionModoActiva(tipo);
        setModeInlineOpen(false);
        var modalEl = document.getElementById("modalTipoVentas");
        var modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
        modal?.hide();
        redireccionarSiCorresponde(tipo);
    }

    // ============================
    // MOSTRAR MODAL SOLO SI PUEDE
    // ============================
    if (!tipoVentas && tienePermiso) {
        try {
            new bootstrap.Modal(document.getElementById("modalTipoVentas")).show();
        } catch { }
    }

    // Click en opciones del modal
    document.querySelectorAll(".select-tipo")?.forEach(btn => {
        btn.addEventListener("click", function () {
            seleccionarTipoVentas(this.dataset.tipo);
        });
    });

    // Opciones inline (móvil)
    document.querySelectorAll(".dg-mode-option")?.forEach(btn => {
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            seleccionarTipoVentas(this.dataset.tipo);
        });
    });

    // Móvil: accordion inline — Desktop: modal
    let btnCambio = document.getElementById("btnCambiarTipoVentas");
    if (btnCambio) {
        btnCambio.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            cerrarPanelAlertasNavbar();
            if (esNavbarMovil()) {
                var item = document.getElementById("divbtnCambiarTipoVentas");
                setModeInlineOpen(!(item && item.classList.contains("is-open")));
            } else {
                setModeInlineOpen(false);
                new bootstrap.Modal(document.getElementById("modalTipoVentas")).show();
            }
        });
    }

    // Cerrar accordion al tocar fuera
    document.addEventListener("click", function (event) {
        var item = document.getElementById("divbtnCambiarTipoVentas");
        if (!item || !item.classList.contains("is-open")) return;
        if (item.contains(event.target)) return;
        setModeInlineOpen(false);
    });

    // Al pasar a desktop, cerrar el panel inline
    window.addEventListener("resize", function () {
        if (!esNavbarMovil()) setModeInlineOpen(false);
    });

    // Ventas / Cobranzas: href reales (abrir en pestaña nueva) + modal si no hay modo
    actualizarHrefsModuloVentas(tipoVentas);

    let btnVentasGeneral = document.getElementById("btnVentasGeneral");
    if (btnVentasGeneral) {
        btnVentasGeneral.addEventListener("click", function (e) {
            if (localStorage.getItem("tipoSistemaVentas")) return;
            e.preventDefault();
            new bootstrap.Modal(document.getElementById("modalTipoVentas")).show();
        });
    }

    let btnCobranzasGeneral = document.getElementById("btnCobranzasGeneral");
    if (btnCobranzasGeneral) {
        btnCobranzasGeneral.addEventListener("click", function (e) {
            if (localStorage.getItem("tipoSistemaVentas")) return;
            e.preventDefault();
            new bootstrap.Modal(document.getElementById("modalTipoVentas")).show();
        });
    }

    aplicarEtiquetaModo(tipoVentas);
    marcarOpcionModoActiva(tipoVentas || "indumentaria");
    marcarSeccionActual();

});


function detectarContextoVentas() {
    const path = (window.location.pathname || "").toLowerCase();

    const esElectro = path.includes("electrodomesticos");

    const esVentas =
        path.includes("/ventas") ||
        path.includes("/ventas_electrodomesticos") ||
        path.includes("/cobranzas");

    if (!esVentas) return null;

    let seccion = "listado";

    if (path.includes("nuevo")) seccion = "nuevomodif";
    else if (path.includes("cobranza") || path.includes("cobros")) seccion = "cobranza";

    return {
        tipoActual: esElectro ? "electro" : "indumentaria",
        seccion
    };
}

function redireccionarSiCorresponde(nuevoTipo) {
    const ctx = detectarContextoVentas();
    if (!ctx) return;

    if (ctx.tipoActual === nuevoTipo) return;

    const destino = MODULOS_VENTA[nuevoTipo]?.[ctx.seccion];
    if (destino) window.location.href = destino;
}


// ===============================
// TU CÓDIGO ORIGINAL (SIN TOCAR)
// ===============================

function leerCantidadAlerta(result) {
    if (result == null) return 0;
    if (typeof result === "number") return result;
    if (typeof result === "string") return Number(result) || 0;
    var n = result.cantidad != null ? result.cantidad : result.Cantidad;
    return Number(n) || 0;
}

async function CantidadComprobantes() {
    try {
        var result = await MakeAjax({
            type: "POST",
            url: "/Rendimiento/MostrarCantidadComprobantes",
            async: true,
            data: JSON.stringify({}),
            contentType: "application/json",
            dataType: "json"
        });
        pintarAlerta("notificacionComprobante", leerCantidadAlerta(result));
    } catch (e) {
        pintarAlerta("notificacionComprobante", 0);
    }
}


async function CantidadCasitasRojas() {
    try {
        var result = await MakeAjax({
            type: "POST",
            url: "/Ventas_Electrodomesticos/CantidadCasitasRojas",
            async: true,
            data: JSON.stringify({}),
            contentType: "application/json",
            dataType: "json"
        });
        pintarAlerta("notificationHome", leerCantidadAlerta(result));
    } catch (e) {
        pintarAlerta("notificationHome", 0);
    }
}

async function CantidadClientesAusentes() {
    /* El badge de casitas ya no cuenta ausentes. */
}

async function CantidadStocksPendientes() {

    var url = "/StockPendiente/MostrarCantidadStocksPendientes";

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

    var stock = document.getElementById("notificationStock");
    if (!stock) return;
    var nStock = Number(result) || 0;
    if (nStock > 0) {
        stock.hidden = false;
        stock.textContent = String(nStock);
    } else {
        stock.hidden = true;
        stock.textContent = "";
    }

}

async function cerrarSession() {
    try {
        if (await confirmarModal("¿Está seguro que desea salir?")) {
            var url = "/Login/CerrarSesion";

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

            if (result.Status) {
                document.location.href = "/Rendimiento/Index";
            }

        }
    } catch (error) {
        alert(error);
    }
}

function verificarRoles(idRol) {
    function showSeccion(id) {
        var el = document.getElementById(id);
        if (el) el.removeAttribute("hidden");
    }

    if (idRol == 1) { // ADMINISTRADOR
        showSeccion("seccionUsuarios");
        showSeccion("seccionProductos");
        showSeccion("seccionClientes");
        showSeccion("seccionCobranzas");
        showSeccion("seccionRendimiento");
        showSeccion("seccionSueldos");

    } else if (idRol == 3) { // COBRADOR
        showSeccion("seccionCobranzas");
        showSeccion("seccionClientesCero");
        showSeccion("seccionStock");

    } else if (idRol == 4) { // COMPROBANTES
        showSeccion("seccionUsuarios");
        showSeccion("seccionRendimiento");
        showSeccion("seccionClientes");
        showSeccion("seccionProductos");
        showSeccion("seccionCobranzas");

    } else { // VENDEDOR u otros
        showSeccion("seccionStock");
        showSeccion("seccionClientesCero");
    }
}


function aplicarEtiquetaModo(tipo) {
    var label = (tipo === "electro") ? "Electrodomésticos" : "Indumentaria";
    var span = document.getElementById("txtModoVenta");
    if (span) span.textContent = label;
    var sub = document.getElementById("dgMarcaModo");
    if (sub) sub.textContent = label;
    var nav = document.querySelector(".dg-navbar");
    if (nav) nav.classList.toggle("is-electro", tipo === "electro");
}

function actualizarHrefsModuloVentas(tipo) {
    var esElectro = tipo === "electro";
    var btnVentas = document.getElementById("btnVentasGeneral");
    var btnCobranzas = document.getElementById("btnCobranzasGeneral");
    if (btnVentas) {
        btnVentas.href = esElectro
            ? "/Ventas_Electrodomesticos/Historial/"
            : "/Ventas/Index/";
    }
    if (btnCobranzas) {
        btnCobranzas.href = esElectro
            ? "/Ventas_Electrodomesticos/Cobros/"
            : "/Cobranzas/Index/";
    }
}

function pintarAlerta(id, cantidad) {
    var el = document.getElementById(id);
    if (!el) return;
    var n = Number(cantidad);
    if (!isFinite(n) || n < 0) n = 0;
    el.textContent = String(n);
    el.classList.toggle("is-zero", n <= 0);
    el.classList.toggle("is-hot", n > 0);
}

function refrescarAlertasNavbar(tipo) {
    if (!tipo || tipo === "comprobantes") CantidadComprobantes();
    if (!tipo || tipo === "casitas") CantidadCasitasRojas();
    if (alertaNavbarAbierta && (!tipo || tipo === alertaNavbarAbierta)) {
        cargarListaAlertaNavbar(alertaNavbarAbierta, true);
    }
}

var alertaNavbarAbierta = null;
var alertaNavbarCargando = false;

function escapeHtmlAlerta(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function limpiarPosicionPanelAlertasNavbar() {
    var panel = document.getElementById("dgAlertPanel");
    var backdrop = document.getElementById("dgAlertBackdrop");
    if (panel) {
        panel.style.top = "";
        panel.style.bottom = "";
        panel.style.left = "";
        panel.style.right = "";
        panel.style.width = "";
        panel.style.maxHeight = "";
        panel.style.removeProperty("--dg-alert-top");
        panel.style.removeProperty("--dg-alert-right");
    }
    if (backdrop) {
        backdrop.style.top = "";
        backdrop.style.removeProperty("--dg-alert-top");
    }
}

function posicionarPanelAlertasNavbar() {
    var panel = document.getElementById("dgAlertPanel");
    if (!panel || panel.hasAttribute("hidden")) return;

    var nav = document.querySelector(".dg-navbar");
    var alerts = document.querySelector(".dg-alerts");
    var trigger = document.querySelector(".dg-alert.is-open");
    var backdrop = document.getElementById("dgAlertBackdrop");
    var gap = 10;
    var edge = 10;
    var vw = window.innerWidth || document.documentElement.clientWidth || 0;
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    var desktop = window.matchMedia("(min-width: 1200px)").matches;
    var top = 0;

    function includeBottom(el) {
        if (!el) return;
        var r = el.getBoundingClientRect();
        if (r.bottom > top) top = r.bottom;
    }

    includeBottom(nav);
    includeBottom(alerts);
    includeBottom(trigger);
    top = Math.round(top + gap);
    if (top < 56) top = 56;

    var maxH = Math.max(180, Math.round(vh - top - edge));
    if (desktop) maxH = Math.min(maxH, 560);

    var right = edge;
    var alignEl = alerts || trigger;
    if (alignEl) {
        var ar = alignEl.getBoundingClientRect();
        right = Math.max(edge, Math.round(vw - ar.right));
    }

    panel.style.setProperty("--dg-alert-top", top + "px");
    panel.style.setProperty("--dg-alert-right", right + "px");
    panel.style.top = top + "px";
    panel.style.bottom = "auto";
    panel.style.maxHeight = maxH + "px";

    if (desktop) {
        panel.style.left = "auto";
        panel.style.width = Math.min(400, Math.max(0, vw - edge * 2)) + "px";
        panel.style.right = right + "px";
    } else {
        panel.style.left = edge + "px";
        panel.style.right = edge + "px";
        panel.style.width = "auto";
    }

    if (backdrop) {
        backdrop.style.setProperty("--dg-alert-top", top + "px");
        backdrop.style.top = top + "px";
    }
}

function cerrarPanelAlertasNavbar() {
    var panel = document.getElementById("dgAlertPanel");
    var backdrop = document.getElementById("dgAlertBackdrop");
    if (panel) panel.setAttribute("hidden", "true");
    if (backdrop) backdrop.setAttribute("hidden", "true");
    document.querySelectorAll(".dg-alert[data-alerta]").forEach(function (btn) {
        btn.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
    });
    alertaNavbarAbierta = null;
    limpiarPosicionPanelAlertasNavbar();
}

function abrirPanelAlertasNavbar(tipo) {
    var panel = document.getElementById("dgAlertPanel");
    var backdrop = document.getElementById("dgAlertBackdrop");
    var title = document.getElementById("dgAlertPanelTitle");
    var sub = document.getElementById("dgAlertPanelSub");
    var ico = document.getElementById("dgAlertPanelIco");
    if (!panel || !tipo) return;

    if (alertaNavbarAbierta === tipo) {
        cerrarPanelAlertasNavbar();
        return;
    }

    document.querySelectorAll(".dg-navbar .dropdown-menu.show").forEach(function (dropdownMenu) {
        dropdownMenu.classList.remove("show");
        var toggle = dropdownMenu.previousElementSibling;
        if (toggle) toggle.setAttribute("aria-expanded", "false");
    });
    var modeItem = document.getElementById("divbtnCambiarTipoVentas");
    if (modeItem) modeItem.classList.remove("is-open");
    var modePanel = document.getElementById("dgModeInlinePanel");
    if (modePanel) modePanel.setAttribute("hidden", "true");

    document.querySelectorAll(".dg-alert[data-alerta]").forEach(function (btn) {
        var on = btn.getAttribute("data-alerta") === tipo;
        btn.classList.toggle("is-open", on);
        btn.setAttribute("aria-expanded", on ? "true" : "false");
    });

    if (title) title.textContent = tipo === "casitas" ? "Casitas en rojo" : "Comprobantes pendientes";
    if (sub) sub.textContent = tipo === "casitas" ? "Observación de cobro marcada" : "PDF en rojo, todavía no enviados";
    if (ico) {
        ico.innerHTML = tipo === "casitas" ? '<i class="fa fa-home"></i>' : '<i class="fa fa-print"></i>';
        ico.classList.toggle("is-casita", tipo === "casitas");
    }

    panel.removeAttribute("hidden");
    if (backdrop) backdrop.removeAttribute("hidden");
    alertaNavbarAbierta = tipo;
    posicionarPanelAlertasNavbar();
    requestAnimationFrame(posicionarPanelAlertasNavbar);
    cargarListaAlertaNavbar(tipo, false);
}

async function cargarListaAlertaNavbar(tipo, silencioso) {
    var body = document.getElementById("dgAlertPanelBody");
    if (!body) return;
    var url = tipo === "casitas"
        ? "/Ventas_Electrodomesticos/ListaCasitasRojas"
        : "/Rendimiento/ListaComprobantesPendientes";
    var badgeId = tipo === "casitas" ? "notificationHome" : "notificacionComprobante";

    if (!silencioso) {
        body.innerHTML = '<div class="dg-alert-loading"><i class="fa fa-spinner fa-spin"></i><span>Cargando…</span></div>';
    }

    alertaNavbarCargando = true;
    try {
        var result = await MakeAjax({
            type: "POST",
            url: url,
            async: true,
            data: JSON.stringify({}),
            contentType: "application/json",
            dataType: "json"
        });
        var data = (result && (result.data || result.Data)) || [];
        var cantidad = result && (result.cantidad != null ? result.cantidad : result.Cantidad);
        if (cantidad == null) cantidad = data.length;
        pintarAlerta(badgeId, cantidad);
        pintarListaAlertaNavbar(tipo, data);
        if (tipo === "casitas") {
            var sub = document.getElementById("dgAlertPanelSub");
            if (sub) {
                var n = Number(cantidad) || 0;
                sub.textContent = n === 1
                    ? "1 venta con casita en rojo"
                    : n + " ventas con casita en rojo";
            }
        }
        posicionarPanelAlertasNavbar();
    } catch (e) {
        body.innerHTML = '<div class="dg-alert-empty"><i class="fa fa-exclamation-circle"></i><span>No se pudo cargar la lista.</span></div>';
    } finally {
        alertaNavbarCargando = false;
    }
}

function pintarListaAlertaNavbar(tipo, data) {
    var body = document.getElementById("dgAlertPanelBody");
    if (!body) return;
    var items = Array.isArray(data) ? data : [];
    if (!items.length) {
        body.innerHTML = tipo === "casitas"
            ? '<div class="dg-alert-empty"><i class="fa fa-home"></i><span>No hay casitas en rojo.</span></div>'
            : '<div class="dg-alert-empty"><i class="fa fa-check-circle"></i><span>No hay comprobantes pendientes de enviar.</span></div>';
        return;
    }

    body.innerHTML = items.map(function (row) {
        var tipoRow = String(row.Origen || row.origen || row.Tipo || row.tipo || "").toUpperCase();
        var esElectro = tipoRow === "ELECTRO";
        var chipCls = esElectro ? "is-electro" : "is-indumentaria";
        var chipTxt = esElectro ? "Electro" : "Indumentaria";
        var cliente = escapeHtmlAlerta(row.Cliente || row.cliente || "Sin cliente");
        var fecha = escapeHtmlAlerta(row.FechaTexto || row.fechaTexto || "");
        var extra = escapeHtmlAlerta(row.Estado || row.estado || "");
        var meta = [fecha, extra].filter(Boolean).join(" · ");
        var id = Number(row.Id || row.id || row.IdVenta || row.idVenta || 0);
        var origen = esElectro ? "ELECTRO" : "INDUMENTARIA";
        var urlRaw = row.Url || row.url || "#";
        var url = escapeHtmlAlerta(urlRaw);

        if (tipo === "casitas") {
            var ventaId = Number(row.IdVenta || row.idVenta || id || 0);
            var cobrador = escapeHtmlAlerta(row.Cobrador || row.cobrador || "Sin cobrador");
            var fechaCobro = escapeHtmlAlerta(row.FechaCobroTexto || row.fechaCobroTexto || fecha);
            var estado = escapeHtmlAlerta(row.Estado || row.estado || "");
            var obs = String(row.Observacion || row.observacion || "").trim();
            var obsHtml = obs
                ? escapeHtmlAlerta(obs)
                : "Sin observación cargada";
            var metaCasita = [
                ventaId ? ("Venta #" + ventaId) : "",
                fechaCobro ? ("Cobro " + fechaCobro) : "",
                cobrador,
                estado
            ].filter(Boolean).join(" · ");
            return '<button type="button" class="dg-alert-item is-casita" data-url="' + url + '" data-id="' + ventaId + '" data-origen="' + origen + '">' +
                '<span class="dg-alert-casa" aria-hidden="true"><i class="fa fa-home"></i></span>' +
                '<span class="dg-alert-item-copy">' +
                '<span class="dg-alert-item-name">' + cliente + '</span>' +
                (metaCasita ? '<span class="dg-alert-item-meta">' + metaCasita + '</span>' : "") +
                '<span class="dg-alert-item-obs' + (obs ? "" : " is-empty") + '">' + obsHtml + '</span>' +
                "</span>" +
                '<i class="fa fa-chevron-right dg-alert-item-go" aria-hidden="true"></i></button>';
        }

        var copy = '<span class="dg-alert-chip ' + chipCls + '">' + chipTxt + '</span>' +
            '<span class="dg-alert-item-copy"><span class="dg-alert-item-name">' + cliente + '</span>' +
            (meta ? '<span class="dg-alert-item-meta">' + meta + '</span>' : "") +
            "</span>";

        return '<div class="dg-alert-item" data-url="' + url + '" data-id="' + id + '" data-origen="' + origen + '">' +
            '<button type="button" class="dg-alert-item-main" data-url="' + url + '">' +
            copy +
            '</button>' +
            '<button type="button" class="dg-alert-pdf is-pend" data-alert-pdf data-id="' + id + '" data-origen="' + origen + '"' +
            ' title="Comprobante no enviado" aria-label="Generar PDF">' +
            '<i class="fa fa-file-pdf-o" aria-hidden="true"></i></button>' +
            '<i class="fa fa-chevron-right dg-alert-item-go" aria-hidden="true"></i></div>';
    }).join("");
}

function avisoAlertaNavbar(msg, tipo) {
    if (typeof showToast === "function") showToast(msg, tipo || "info");
    else if (tipo === "danger") alert(msg);
}

function loadScriptAlertaNavbar(src) {
    return new Promise(function (resolve, reject) {
        if (document.querySelector('script[src="' + src + '"]')) {
            resolve();
            return;
        }
        var s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

async function ensureJsPdfAlertaNavbar(needAutoTable) {
    var JsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JsPDF) {
        await loadScriptAlertaNavbar("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
        JsPDF = window.jspdf && window.jspdf.jsPDF;
    }
    if (needAutoTable) {
        var proto = JsPDF && JsPDF.API;
        if (!proto || typeof proto.autoTable !== "function") {
            await loadScriptAlertaNavbar("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");
        }
    }
    return (window.jspdf && window.jspdf.jsPDF) || JsPDF || null;
}

function parseFechaAlertaNavbar(val) {
    if (!val && val !== 0) return null;
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    if (typeof val === "string") {
        var m = val.match(/\/Date\((-?\d+)\)\//);
        if (m) return new Date(Number(m[1]));
        var d = new Date(val);
        if (!isNaN(d.getTime())) return d;
    }
    if (typeof val === "number" && isFinite(val)) return new Date(val);
    return null;
}

function fmtFechaAlertaNavbar(val, withTime) {
    if (window.moment) {
        var mm = null;
        if (typeof val === "string" && /\/Date\(/.test(val)) {
            var ms = val.match(/\/Date\((-?\d+)\)\//);
            if (ms) mm = moment(Number(ms[1]));
        }
        if (!mm) mm = moment(val);
        if (mm && mm.isValid()) return mm.format(withTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY");
    }
    var d = parseFechaAlertaNavbar(val) || new Date();
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var s = pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
    if (withTime) s += " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    return s;
}

function moneyAlertaNavbar(v) {
    if (typeof formatNumber === "function") return formatNumber(v);
    return Math.round(Number(v || 0)).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function nombreArchivoAlertaNavbar(nombre) {
    return String(nombre || "cliente")
        .replace(/[^\w\s\-]+/g, "")
        .trim()
        .replace(/\s+/g, "_") || "cliente";
}

function generarPdfIndumentariaAlertaNavbar(JsPDF, factura) {
    var doc = new JsPDF();
    var venta = factura.Venta || factura.venta || {};
    var productos = factura.Productos || factura.productos || [];

    doc.setFontSize(32);
    doc.setTextColor(115, 195, 178);
    doc.text("Comprobante", 80, 20, { align: "right" });
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Documento no válido como factura", 80, 28, { align: "right" });
    doc.text("Fecha: " + fmtFechaAlertaNavbar(new Date()), 80, 35, { align: "right" });

    doc.setFontSize(32);
    doc.setTextColor(115, 195, 178);
    doc.text("David Godoy", 10, 60);
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Indumentaria Dg", 10, 70);
    doc.text("Vendedor: " + (venta.Vendedor || "-"), 10, 78);
    doc.text("Primer Fecha de Cobro: " + fmtFechaAlertaNavbar(venta.P_FechaCobro), 10, 86);
    doc.text("Primer Valor cuota: " + moneyAlertaNavbar(venta.P_ValorCuota), 90, 86);

    var y = 90;
    doc.setFillColor(115, 195, 178);
    doc.rect(10, y, 190, 10, "F");
    doc.text("ARTICULO", 12, 98);
    doc.text("CANT", 102, 98);
    doc.text("PRECIO", 142, 98);
    doc.text("Total", 182, 98);
    y = 108;

    var zebra = false;
    var total = 0;
    productos.forEach(function (item) {
        var cant = Number(item.Cantidad || 0);
        var precio = Number(item.PrecioTotal || 0);
        var linea = precio * cant;
        total += linea;
        if (zebra) {
            doc.setFillColor(232, 238, 237);
            doc.rect(10, y - 7, 190, 10, "F");
        }
        zebra = !zebra;
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(String(item.Producto || "-"), 12, y);
        doc.text(String(cant), 107, y);
        doc.text(moneyAlertaNavbar(precio), 147, y);
        doc.text(moneyAlertaNavbar(linea), 180, y);
        doc.setLineWidth(0.5);
        doc.line(10, y + 3, 200, y + 3);
        y += 10;
        if (y > 260) {
            doc.addPage();
            y = 20;
        }
    });

    doc.setFontSize(14);
    doc.text("SUBTOTAL: " + moneyAlertaNavbar(total), 150, y);
    doc.text("ENTREGA: " + moneyAlertaNavbar(venta.Entrega), 150, y + 10);
    doc.text("RESTANTE: " + moneyAlertaNavbar(total - Number(venta.Entrega || 0)), 150, y + 20);
    doc.setFontSize(12);
    doc.text("¿Alguna Pregunta?", 10, y + 40);
    doc.text("Envianos un Whatssap al (54 9)  3777 71-0884", 10, y + 45);
    doc.setFontSize(32);
    doc.setTextColor(115, 195, 178);
    doc.text("¡Gracias!", 150, y + 40);

    var nombre = nombreArchivoAlertaNavbar(venta.Cliente);
    doc.save("comprobante_" + nombre + ".pdf");
}

function generarPdfElectroAlertaNavbar(JsPDF, venta) {
    if (typeof generarPdfVenta === "function") {
        generarPdfVenta(venta);
        return;
    }

    var doc = new JsPDF("p", "mm", "a4");
    var toInt = function (v) { return Math.round(Number(v || 0)); };
    var money = function (v) {
        return toInt(v).toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    };

    doc.setFillColor(12, 18, 32);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("COMPROBANTE DE VENTA", 105, 14, { align: "center" });
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text("Documento no válido como factura", 173, 28, { align: "center" });
    doc.text("Nro " + (venta.IdVenta || venta.Id || ""), 200, 10, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(fmtFechaAlertaNavbar(new Date(), true), 200, 16, { align: "right" });

    var y = 38;
    doc.setTextColor(0, 0, 0);
    var direccion = [venta.ClienteDireccion, venta.Localidad, venta.Provincia].filter(Boolean).join(" - ");
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(220);
    if (doc.roundedRect) doc.roundedRect(10, y, 190, 22, 2, 2, "FD");
    else doc.rect(10, y, 190, 22, "FD");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE", 14, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(venta.ClienteNombre || "-", 14, y + 12);
    if (direccion) {
        doc.setFontSize(9);
        doc.setTextColor(90);
        doc.text(direccion, 14, y + 18);
    }

    y += 28;
    doc.setTextColor(0, 0, 0);
    var items = venta.Items || venta.items || [];
    var cuotas = venta.Cuotas || venta.cuotas || [];

    function filasTexto(titulo, head, body) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(titulo, 15, y);
        y += 6;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(head.join("  |  "), 12, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        body.forEach(function (row) {
            doc.text(row.map(function (c) { return String(c); }).join("  |  "), 12, y);
            y += 5;
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
        });
        y += 6;
    }

    if (typeof doc.autoTable === "function") {
        if (items.length) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("Productos", 15, y);
            y += 4;
            doc.autoTable({
                startY: y,
                head: [["Cant", "Producto"]],
                body: items.map(function (i) { return [i.Cantidad || i.cantidad, i.Producto || i.producto]; }),
                theme: "grid",
                styles: { fontSize: 9 },
                headStyles: { fillColor: [30, 30, 30], textColor: 255 }
            });
            y = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : y) + 8;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Cuotas", 15, y);
        y += 4;
        doc.autoTable({
            startY: y,
            head: [["#", "Vencimiento", "Original", "Descuentos", "Total", "Pagado", "Restante", "Estado"]],
            body: cuotas.map(function (c) {
                var original = toInt(c.MontoOriginal);
                var recargos = toInt(c.MontoRecargos);
                var descuentos = toInt(c.MontoDescuentos);
                var pagado = toInt(c.MontoPagado);
                var total = original + recargos - descuentos;
                var restante = Math.max(total - pagado, 0);
                var estado = c.Estado || "Pendiente";
                var fv = parseFechaAlertaNavbar(c.FechaVencimiento);
                if (estado !== "Pagada" && fv && new Date() > fv) estado = "Vencida";
                return [
                    c.NumeroCuota,
                    fmtFechaAlertaNavbar(c.FechaVencimiento),
                    money(original),
                    money(descuentos),
                    money(total),
                    money(pagado),
                    money(restante),
                    estado
                ];
            }),
            theme: "grid",
            styles: { fontSize: 9 },
            headStyles: { fillColor: [20, 20, 20], textColor: 255 }
        });
    } else {
        if (items.length) {
            filasTexto("Productos", ["Cant", "Producto"], items.map(function (i) {
                return [i.Cantidad || i.cantidad, i.Producto || i.producto];
            }));
        }
        filasTexto("Cuotas", ["#", "Vto", "Total", "Estado"], cuotas.map(function (c) {
            var total = toInt(c.MontoOriginal) + toInt(c.MontoRecargos) - toInt(c.MontoDescuentos);
            return [c.NumeroCuota, fmtFechaAlertaNavbar(c.FechaVencimiento), money(total), c.Estado || "Pendiente"];
        }));
    }

    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("Comprobante de venta. Conservar para reclamos.", 105, 290, { align: "center" });
    var nombre = nombreArchivoAlertaNavbar(venta.ClienteNombre || "Cliente");
    var fecha = fmtFechaAlertaNavbar(venta.FechaVenta).split("/").reverse().join("");
    doc.save("Venta_" + (venta.IdVenta || "") + "_" + nombre + "_" + fecha + ".pdf");
}

function marcarPdfOkAlertaNavbar(btn) {
    var item = btn && btn.closest ? btn.closest(".dg-alert-item") : null;
    if (btn) {
        btn.removeAttribute("data-busy");
        btn.classList.remove("is-busy", "is-pend");
        btn.classList.add("is-ok");
        btn.title = "Comprobante emitido";
        btn.setAttribute("aria-label", "Comprobante emitido");
        var icoOk = btn.querySelector("i");
        if (icoOk) icoOk.className = "fa fa-file-pdf-o";
    }
    if (item) item.classList.add("is-enviado");

    var badge = document.getElementById("notificacionComprobante");
    var n = badge ? Number(badge.textContent) : 0;
    pintarAlerta("notificacionComprobante", Math.max(0, n - 1));

    setTimeout(function () {
        if (item && item.parentNode) item.parentNode.removeChild(item);
        var body = document.getElementById("dgAlertPanelBody");
        if (body && !body.querySelector(".dg-alert-item")) {
            body.innerHTML = '<div class="dg-alert-empty"><i class="fa fa-check-circle"></i><span>No hay comprobantes pendientes de enviar.</span></div>';
        }
        posicionarPanelAlertasNavbar();
        CantidadComprobantes();
    }, 280);

    if (typeof marcarComprobanteEnGrilla === "function") {
        var id = Number(btn.getAttribute("data-id") || 0);
        if (id) {
            try { marcarComprobanteEnGrilla(id); } catch (e) { }
        }
    }
    try {
        if (window.jQuery && jQuery.fn.DataTable) {
            ["#grdVentas", "#grdCobranzas"].forEach(function (sel) {
                if (!jQuery.fn.DataTable.isDataTable(sel)) return;
                var dt = jQuery(sel).DataTable();
                var ajaxUrl = "";
                try {
                    if (dt.ajax && typeof dt.ajax.url === "function") {
                        ajaxUrl = dt.ajax.url() || "";
                    }
                } catch (errAjax) {
                    return;
                }
                // Historial electro (#grdVentas) es client-side: reload sin ajax pide el HTML de la página.
                if (typeof ajaxUrl === "string" && ajaxUrl.length) {
                    dt.ajax.reload(null, false);
                }
            });
        }
    } catch (e) { }
}

async function enviarPdfAlertaNavbar(btn) {
    if (!btn || btn.getAttribute("data-busy") === "1") return;
    var id = Number(btn.getAttribute("data-id") || 0);
    var origen = String(btn.getAttribute("data-origen") || "").toUpperCase();
    if (!id) {
        avisoAlertaNavbar("Venta inválida", "danger");
        return;
    }

    btn.setAttribute("data-busy", "1");
    btn.disabled = true;
    btn.classList.add("is-busy");
    var ico = btn.querySelector("i");
    var icoCls = ico ? ico.className : "";
    if (ico) ico.className = "fa fa-spinner fa-spin";

    try {
        avisoAlertaNavbar("Generando PDF...", "info");
        if (origen === "ELECTRO") {
            var JsPDF = await ensureJsPdfAlertaNavbar(true);
            if (!JsPDF && typeof generarPdfVenta !== "function") throw new Error("jsPDF no disponible");

            var resp = await fetch("/Ventas_Electrodomesticos/GetDetalleVenta?idVenta=" + encodeURIComponent(id));
            var json = await resp.json();
            var ventaEl = json && (json.data || json.Data);
            if (!json || json.success === false || json.Success === false || !ventaEl) {
                throw new Error((json && (json.message || json.Message)) || "No se pudo obtener la venta");
            }

            generarPdfElectroAlertaNavbar(JsPDF, ventaEl);

            await fetch("/Ventas_Electrodomesticos/MarcarComprobante?idVenta=" + encodeURIComponent(id), { method: "POST" });
        } else {
            var result = await MakeAjax({
                type: "POST",
                url: "/Ventas/InformacionVentayProductos",
                async: true,
                data: JSON.stringify({ Id: id }),
                contentType: "application/json",
                dataType: "json"
            });
            if (!result || !(result.Venta || result.Productos)) throw new Error("No se pudo obtener la venta");

            if (typeof generarFacturaPDF === "function") {
                var docInd = generarFacturaPDF(result);
                var nom = nombreArchivoAlertaNavbar(result.Venta && result.Venta.Cliente);
                docInd.save("comprobante_" + nom + ".pdf");
            } else {
                var JsPdfInd = await ensureJsPdfAlertaNavbar(false);
                if (!JsPdfInd) throw new Error("jsPDF no disponible");
                generarPdfIndumentariaAlertaNavbar(JsPdfInd, result);
            }

            await MakeAjax({
                type: "POST",
                url: "/Ventas/EnviarComprobante",
                async: true,
                data: JSON.stringify({ Id: id }),
                contentType: "application/json",
                dataType: "json"
            });
        }

        marcarPdfOkAlertaNavbar(btn);
    } catch (e) {
        console.error(e);
        avisoAlertaNavbar("Error generando el PDF.", "danger");
        btn.disabled = false;
        btn.classList.remove("is-busy");
        btn.removeAttribute("data-busy");
        if (ico) ico.className = icoCls || "fa fa-file-pdf-o";
    }
}

function initAlertasNavbar() {
    var panel = document.getElementById("dgAlertPanel");
    var backdrop = document.getElementById("dgAlertBackdrop");
    var closeBtn = document.getElementById("dgAlertPanelClose");
    if (!panel) return;

    document.querySelectorAll(".dg-alert[data-alerta]").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            abrirPanelAlertasNavbar(btn.getAttribute("data-alerta"));
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            cerrarPanelAlertasNavbar();
        });
    }

    if (backdrop) {
        backdrop.addEventListener("click", function (e) {
            e.preventDefault();
            cerrarPanelAlertasNavbar();
        });
    }

    panel.addEventListener("click", function (e) {
        var pdfBtn = e.target.closest("[data-alert-pdf]");
        if (pdfBtn && panel.contains(pdfBtn)) {
            e.preventDefault();
            e.stopPropagation();
            enviarPdfAlertaNavbar(pdfBtn);
            return;
        }
        var item = e.target.closest(".dg-alert-item");
        if (!item || !panel.contains(item)) return;
        e.preventDefault();
        e.stopPropagation();
        var url = (e.target.closest(".dg-alert-item-main") || item).getAttribute("data-url") || item.getAttribute("data-url");
        if (url && url !== "#") window.location.href = url;
    });

    document.addEventListener("click", function (event) {
        if (!alertaNavbarAbierta) return;
        if (panel.contains(event.target)) return;
        if (event.target.closest && event.target.closest(".dg-alert[data-alerta]")) return;
        cerrarPanelAlertasNavbar();
    });

    window.addEventListener("dg-alertas-refresh", function (ev) {
        var tipo = ev && ev.detail ? ev.detail.tipo : "";
        refrescarAlertasNavbar(tipo);
    });

    window.addEventListener("resize", posicionarPanelAlertasNavbar);
    window.addEventListener("scroll", posicionarPanelAlertasNavbar, true);
}

function setMobileNavOpen(open) {
    var nav = document.querySelector(".dg-navbar");
    var collapse = document.getElementById("navbarSupportedContent");
    var toggler = document.getElementById("dgNavToggler") || document.querySelector(".dg-navbar .dg-toggler");
    if (!collapse) return;
    open = !!open;
    collapse.classList.remove("collapsing");
    collapse.classList.toggle("show", open);
    if (nav) nav.classList.toggle("is-menu-open", open);
    if (toggler) {
        toggler.setAttribute("aria-expanded", open ? "true" : "false");
        toggler.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    }
}

function initMobileNavMenu() {
    var toggler = document.getElementById("dgNavToggler") || document.querySelector(".dg-navbar .dg-toggler");
    var collapse = document.getElementById("navbarSupportedContent");
    if (!toggler || !collapse) return;

    toggler.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!esNavbarMovil()) return;
        var nav = document.querySelector(".dg-navbar");
        var abierto = collapse.classList.contains("show") || (nav && nav.classList.contains("is-menu-open"));
        setMobileNavOpen(!abierto);
    });

    collapse.querySelectorAll("a.nav-link").forEach(function (link) {
        link.addEventListener("click", function () {
            if (!esNavbarMovil()) return;
            // No cerrar si es accordion/dropdown (sistema, usuario, soporte)
            if (link.id === "btnCambiarTipoVentas") return;
            if (link.id === "userDropdown" || link.id === "configDropdownLink") return;
            if (link.classList.contains("dropdown-toggle")) return;
            setMobileNavOpen(false);
        });
    });

    document.addEventListener("click", function (event) {
        var nav = document.querySelector(".dg-navbar");
        if (!nav || !nav.classList.contains("is-menu-open")) return;
        if (!esNavbarMovil()) return;
        if (nav.contains(event.target)) return;
        setMobileNavOpen(false);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        setMobileNavOpen(false);
    });

    window.addEventListener("resize", function () {
        if (!esNavbarMovil()) setMobileNavOpen(false);
    });
}

function marcarSeccionActual() {
    var path = (window.location.pathname || "").toLowerCase();
    var reglas = [
        ["/usuarios", "btnUsuarios"],
        ["/pagos", "btnSueldos"],
        ["/rendimiento", "btnRendimiento"],
        ["/productos", "btnProductos"],
        ["/stock", "btnStock"],
        ["/clientescero", "btnClientesCero"],
        ["/clientes", "btnClientes"],
        ["/ventas_electrodomesticos/cobros", "btnCobranzasGeneral"],
        ["/cobranzas", "btnCobranzasGeneral"],
        ["/ventas", "btnVentasGeneral"]
    ];
    var i;
    for (i = 0; i < reglas.length; i++) {
        if (path.indexOf(reglas[i][0]) === -1) continue;
        var el = document.getElementById(reglas[i][1]);
        if (el) el.classList.add("is-current");
        break;
    }
}


function RetornarVentaNuevoModif() {

    const tipo = localStorage.getItem("tipoSistemaVentas") || "indumentaria";
    const path = window.location.pathname.toLowerCase();

    const esModificar =
        path.includes("/editar") ||
        path.includes("/modif") ||
        path.includes("/modificar");

    if (tipo === "electro") {
        return esModificar
            ? "/Ventas_Electrodomesticos/NuevoModif"
            : "/Ventas_Electrodomesticos/NuevoModif";
    }

    return esModificar
        ? "/Ventas/Nuevo"
        : "/Ventas/Nuevo";
}
