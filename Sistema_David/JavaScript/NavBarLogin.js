let listaVacia = false;

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
        var userFullName = userSession.Nombre + ' ' + userSession.Apellido;
        $("#userName").html('<i class="fa fa-user"></i> ' + userFullName);
    }

    await verificarRoles(userSession.IdRol);

    // ============================
    //  DROPDOWN ORIGINAL
    // ============================
    var dropdownToggleList = document.querySelectorAll('.dropdown-toggle');

    dropdownToggleList.forEach(function (dropdownToggle) {
        dropdownToggle.addEventListener('click', function (event) {
            event.preventDefault();
            var dropdownMenu = dropdownToggle.nextElementSibling;
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
                dropdownMenu.classList.remove('show');
                dropdownMenu.previousElementSibling.setAttribute('aria-expanded', 'false');
            });
        }
    });

    // ============================
    // 🔥 AGREGADO — MODO DE VENTAS
    // ============================

    let tipoVentas = localStorage.getItem("tipoSistemaVentas");

    // Si no está seleccionado aún → mostrar modal
    if (!tipoVentas) {
        try {
            new bootstrap.Modal(document.getElementById("modalTipoVentas")).show();
        } catch { }
    }

    // Click en opciones del modal
    document.querySelectorAll(".select-tipo")?.forEach(btn => {
        btn.addEventListener("click", function () {
            let tipo = this.dataset.tipo;
            localStorage.setItem("tipoSistemaVentas", tipo);

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

            if (tipo === "electro")
                window.location.href = "/Ventas_Electrodomesticos/Historial/";
            else
                window.location.href = "/Ventas/Index/";
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

});


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

    if (result != null) {
        document.getElementById("notificacionComprobante").textContent = ` (${result.cantidad})`;
    } else {
        document.getElementById("notificacionComprobante").textContent = ` (0)`;
    }
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
        document.getElementById("notificationHome").textContent = ` (${result.cantidad})`;
    } else {
        document.getElementById("notificationHome").textContent = ` (0)`;
    }

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

    if (result > 0) {
        document.getElementById("notificationStock").style.display = "inline";
        document.getElementById("notificationStock").textContent = ` (${result})`;
    } else {
        document.getElementById("notificationStock").style.display = "inline";
        document.getElementById("notificationStock").textContent = ` (${result})`;
    }

}

async function cerrarSession() {
    try {
        if (confirm("¿Está seguro que desea salir?")) {
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

    if (idRol == 1) { // ADMINISTRADOR
        document.getElementById("seccionUsuarios").removeAttribute("hidden");
        document.getElementById("seccionProductos").removeAttribute("hidden");
        document.getElementById("seccionClientes").removeAttribute("hidden");
        document.getElementById("seccionCobranzas").removeAttribute("hidden");
        document.getElementById("seccionRendimiento").removeAttribute("hidden");
        document.getElementById("seccionSueldos").removeAttribute("hidden");

    } else if (idRol == 3) { // COBRADOR
        document.getElementById("seccionCobranzas").removeAttribute("hidden");
        document.getElementById("seccionClientesCero").removeAttribute("hidden");
        document.getElementById("seccionStock").removeAttribute("hidden");

    } else if (idRol == 4) { // COMPROBANTES
        document.getElementById("seccionRendimiento").removeAttribute("hidden");
        document.getElementById("seccionClientesCero").removeAttribute("hidden");
        document.getElementById("seccionProductos").removeAttribute("hidden");
        document.getElementById("seccionCobranzas").removeAttribute("hidden");

    } else { // VENDEDOR u otros
        document.getElementById("seccionStock").removeAttribute("hidden");
        document.getElementById("seccionClientesCero").removeAttribute("hidden");
    }
}
