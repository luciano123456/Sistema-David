let listaVacia = false;
let tipoVentas = localStorage.getItem("tipoSistemaVentas");

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

    if (userSession != null) {
        $('#nombre').text(userSession.Nombre);
        if (userSession.IdRol != 2) {
            document.getElementById("divNotificacionComprobante").removeAttribute("hidden");
            document.getElementById("divNotificacionHome").removeAttribute("hidden");
            CantidadClientesAusentes();
            CantidadComprobantes();
            CantidadStocksPendientes();
        }
    }

    if (userSession) {
        var userFullName = ((userSession.Nombre || "") + " " + (userSession.Apellido || "")).trim();
        $("#userName").text(userFullName);
        var avatar = document.getElementById("dgAvatarLetra");
        if (avatar) avatar.textContent = (userFullName.charAt(0) || "U").toUpperCase();
    }

    await verificarRoles(userSession.IdRol);
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

    dropdownToggleList.forEach(function (dropdownToggle) {
        if (esDropdownProductos(dropdownToggle)) return;

        dropdownToggle.addEventListener('click', function (event) {
            event.preventDefault();
            var dropdownMenu = dropdownToggle.nextElementSibling;
            if (!dropdownMenu) return;
            var isExpanded = dropdownToggle.getAttribute('aria-expanded') === 'true';
            dropdownToggle.setAttribute('aria-expanded', !isExpanded);
            dropdownMenu.classList.toggle('show');
        });
    });

    document.addEventListener('click', function (event) {
        var isDropdownToggle = event.target.closest('.dropdown-toggle');
        var isDropdownMenu = event.target.closest('.dropdown-menu');

        if (!isDropdownToggle && !isDropdownMenu) {
            var dropdownMenus = document.querySelectorAll('.dropdown-menu.show');
            dropdownMenus.forEach(function (dropdownMenu) {
                if (esDropdownProductos(dropdownMenu)) return;
                dropdownMenu.classList.remove('show');
                if (dropdownMenu.previousElementSibling)
                    dropdownMenu.previousElementSibling.setAttribute('aria-expanded', 'false');
            });
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
            let tipo = this.dataset.tipo; // "electro" o "normal"
            localStorage.setItem("tipoSistemaVentas", tipo);

            aplicarEtiquetaModo(tipo);


            // ✅ Redirige si estás dentro de ventas
            redireccionarSiCorresponde(tipo);

            let modal = bootstrap.Modal.getInstance(document.getElementById("modalTipoVentas"));
            modal?.hide();
        });
    });

    // Botón para abrir modal manualmente
    let btnCambio = document.getElementById("btnCambiarTipoVentas");
    if (btnCambio) {
        btnCambio.addEventListener("click", function () {
            new bootstrap.Modal(document.getElementById("modalTipoVentas")).show();
        });
    }

    // Manejo de botones generales
    let btnVentasGeneral = document.getElementById("btnVentasGeneral");
    if (btnVentasGeneral) {
        btnVentasGeneral.addEventListener("click", function () {

            let tipo = localStorage.getItem("tipoSistemaVentas");

            if (!tipo) {
                new bootstrap.Modal(document.getElementById("modalTipoVentas")).show();
                return;
            }

            if (tipo === "electro") {
                window.location.href = "/Ventas_Electrodomesticos/Historial/";
            } else {
                window.location.href = "/Ventas/Index/";
            }

        });
    }

    let btnCobranzasGeneral = document.getElementById("btnCobranzasGeneral");
    if (btnCobranzasGeneral) {
        btnCobranzasGeneral.addEventListener("click", function () {

            let tipo = localStorage.getItem("tipoSistemaVentas");

            if (!tipo) {
                new bootstrap.Modal(document.getElementById("modalTipoVentas")).show();
                return;
            }

            if (tipo === "electro")
                window.location.href = "/Ventas_Electrodomesticos/Cobros/";
            else
                window.location.href = "/Cobranzas/Index/";
        });
    }

    aplicarEtiquetaModo(tipoVentas);
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

document.querySelectorAll('.nav-item.dropdown').forEach(dropdown => {
    dropdown.addEventListener('mouseenter', function () {
        const dropdownMenu = this.querySelector('.dropdown-menu');
        dropdownMenu.classList.add('show');
    });

    dropdown.addEventListener('mouseleave', function () {
        const dropdownMenu = this.querySelector('.dropdown-menu');
        dropdownMenu.classList.remove('show');
    });
});


async function CantidadComprobantes() {

    var url = "/Rendimiento/MostrarCantidadComprobantes";

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

    pintarAlerta("notificacionComprobante", result != null ? result.cantidad : 0);
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

    pintarAlerta("notificationHome", result != null ? result.cantidad : 0);

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

function pintarAlerta(id, cantidad) {
    var el = document.getElementById(id);
    if (!el) return;
    var n = Number(cantidad);
    if (!isFinite(n) || n < 0) n = 0;
    el.textContent = String(n);
    el.classList.toggle("is-zero", n <= 0);
    el.classList.toggle("is-hot", n > 0);
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
