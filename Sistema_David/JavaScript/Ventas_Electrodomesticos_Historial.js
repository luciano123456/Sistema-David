/* ===========================================================
 * Ventas_Electrodomesticos_Historial.js — v500.0 FINAL
 * =========================================================== */

let gridVentas = null;
let ventasCache = [];
let ventaSeleccionada = null;
let rowAbierto = null;

const userSession = JSON.parse(localStorage.getItem('usuario'));
const esVendedor = (userSession && Number(userSession.IdRol) === 2);

let ventaClickeadaId = null; // NUEVO: la fila que el usuario clickeó



/* ------------ HELPERS ------------ */

const fmt = n => {
    try {
        const v = Number(n || 0);
        return v.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
    } catch { return "$ 0,00"; }
};

const parseMoney = s => {
    if (!s) return 0;
    return Number(
        String(s)
            .replace(/[^\d,-]/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
    ) || 0;
};

function showToast(msg, type = "info") {
    let cont = document.getElementById("toastContainerBR");
    if (!cont) {
        cont = document.createElement("div");
        cont.id = "toastContainerBR";
        cont.className = "position-fixed bottom-0 end-0 p-3";
        cont.style.zIndex = "2000";
        document.body.appendChild(cont);
    }

    const typeClass = {
        success: "bg-success text-white",
        danger: "bg-danger text-white",
        warn: "bg-warning text-dark",
        info: "bg-info text-dark"
    }[type] || "bg-info text-dark";

    const el = document.createElement("div");
    el.className = `toast align-items-center ${typeClass} border-0 mb-2`;
    el.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${msg}</div>
            <button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    cont.appendChild(el);

    if (window.bootstrap && bootstrap.Toast) {
        new bootstrap.Toast(el, { delay: 2500 }).show();
    } else if (window.$ && $(el).toast) {
        $(el).toast({ delay: 2500 }).toast("show");
    }

    el.addEventListener("hidden.bs.toast", () => el.remove());
}

function openModalById(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.bootstrap && bootstrap.Modal) {
        const m = bootstrap.Modal.getOrCreateInstance(el);
        m.show();
    } else if (window.$ && $(el).modal) {
        $(el).modal("show");
    }
}

function closeModalById(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.bootstrap && bootstrap.Modal) {
        const m = bootstrap.Modal.getInstance(el);
        if (m) m.hide();
    } else if (window.$ && $(el).modal) {
        $(el).modal("hide");
    }
}

/* ------------ LOAD ------------ */
$(document).ready(() => {

    iniciarFiltros();

    // NUEVO: selección visual de filas
    habilitarSeleccionFilaVentas();
    habilitarSeleccionFilasCuotas();

    $("#btnToggleFiltros").on("click", toggleFiltros);
});

/* ------------ FILTROS ------------ */

function toggleFiltros() {
    const form = $("#formFiltros");
    form.toggleClass("d-none");
    $("#iconFiltros").toggleClass("fa-chevron-down fa-chevron-up");
}

async function iniciarFiltros() {

 

    await cargarUsuarios()

    if (userSession.IdRol == 1) { //ROL ADMINISTRADOR
        $("#formFiltros").removeAttr("hidden");
        $("#btnToggleFiltros").removeAttr("hidden");
    }

    var FechaDesde, FechaHasta;

    if (userSession.IdRol == 1) {
        FechaDesde = moment().add(-30, 'days').format('YYYY-MM-DD');
        FechaHasta = moment().format('YYYY-MM-DD');
        document.getElementById("btnLimite").style.display = "block";
    } else {
        FechaDesde = moment().format('YYYY-MM-DD');
        FechaHasta = moment().format('YYYY-MM-DD');
    }

    $("#txtFechaDesde").val(FechaDesde);
    $("#txtFechaHasta").val(FechaHasta);

    cargarTabla();

}

function aplicarFiltros() { cargarTabla(); }

async function limpiarFiltros() {

    
    if (userSession.IdRol == 1) {
        var FechaDesde = moment().add(-30, 'days').format('YYYY-MM-DD');
        var FechaHasta = moment().format('YYYY-MM-DD');
        $("#txtFechaDesde").val(FechaDesde);
        $("#txtFechaHasta").val(FechaHasta);
    } else {
        $("#txtFechaDesde").val("");
        $("#txtFechaHasta").val("");
    }

    $("#filtroEstado").val("");
    $("#filtroVendedor").val("");
    cargarTabla();
}

/* ------------ TABLA PRINCIPAL ------------ */

async function cargarTabla() {
    const desde = $("#txtFechaDesde").val();
    const hasta = $("#txtFechaHasta").val();
    const estado = $("#filtroEstado").val();
    const vendedor = $("#filtroVendedor").val();

    let resp;
    try {
        resp = await $.getJSON("/Ventas_Electrodomesticos/GetHistorialVentas", {
            fechaDesde: desde || null,
            fechaHasta: hasta || null,
            estado: estado,
            IdVendedor: vendedor
        });
    } catch (e) {
        console.error("Error cargando ventas", e);
        return;
    }

    ventasCache = resp.data || [];
    actualizarKPIs(resp.kpis || {});
    renderTabla(ventasCache);
}

function actualizarKPIs(k) {
    $("#kpiTotalVendido").text(fmt(k.TotalVendido || 0));
    $("#kpiTotalCobrado").text(fmt(k.TotalCobrado || 0));
    $("#kpiTotalPendiente").text(fmt(k.TotalPendiente || 0));
}

function renderTabla(data) {
    if (gridVentas) {
        gridVentas.clear().rows.add(data).draw();
        reabrirRowSeleccionado();
        return;
    }

    gridVentas = $("#grdVentas").DataTable({
        data,
        pageLength: 50,
        responsive: false,   // 🔥 CLAVE
        scrollX: true,       // 🔥 permite scroll horizontal en móvil
        language: { url: "//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json" },
        rowCallback: function (row, d) {

            // mismas clases que cobros
            $(row).removeClass(
                "fila-atrasada fila-atrasada-amarilla fila-atrasada-naranja fila-atrasada-roja fila-aldia venta-seleccionada row-selected"
            );

            if (ventaClickeadaId != null && Number(d.IdVenta) === Number(ventaClickeadaId)) {
                $(row).addClass("row-selected");
            }

            const vencidas = Number(d.CuotasVencidas || 0);

            if (vencidas > 0) {
                // En historial: si tiene cuotas vencidas, la venta se pinta “roja” como cobros
                $(row).addClass("fila-atrasada fila-atrasada-naranja");
            } else {
                $(row).addClass("fila-aldia");
            }

            if (ventaSeleccionada?.IdVenta === d.IdVenta) {
                $(row).addClass("venta-seleccionada");
            }
        },
        columns: [
            {
                data: null,
                className: "details-control text-center",
                orderable: false,
                width: "40px",
                render: () => `
                    <button class="btn btn-link p-0 text-accent btn-row-detail">
                        <i class="fa fa-chevron-down"></i>
                    </button>
                `
            },
            { data: "IdVenta" },
            {
                data: "Fecha",
                render: x => moment(x).format("DD/MM/YYYY")
            },
            { data: "Cliente" },
            { data: "Total", render: fmt },
            { data: "Pagado", render: fmt },
            { data: "Pendiente", render: fmt },
            {
                data: "CuotasVencidas",
                className: "text-center",
                render: (v) => {
                    const n = Number(v || 0);

                    if (n > 0) {
                        return `<span class="badge bg-danger">Cuotas atrasadas: ${n}</span>`;
                    }

                    return `<span class="badge bg-success">Sin vencidas</span>`;
                }
            },
            {
                data: null,
                render: (row) => {

                    const vencidas = Number(row.CuotasVencidas || 0);

                    if (vencidas > 0) {
                        // equivalente al “Vencida” en cobros, pero a nivel venta
                        return `<span class="badge bg-danger">Atrasada</span>`;
                    }

                    return `<span class="badge bg-success">Al día</span>`;
                }
            },
            {
                data: "IdVenta",
                name: "acciones",
                orderable: false,
                className: "text-center",
                render: id => `
    <div class="d-flex justify-content-center gap-2">


    ${userSession.IdRol == 1 ? `
        <!-- EDITAR -->
        <button class="btn-accion btn-editar"
                onclick="editarVenta(${id})"
                title="Editar venta">
            <i class="fa fa-pencil"></i>
        </button>
        ` : ""}

         ${userSession.IdRol == 1 ? `
        <!-- ELIMINAR (solo admin) -->
        <button class="btn-accion btn-eliminar"
                onclick="eliminarVenta(${id})"
                title="Eliminar venta">
            <i class="fa fa-trash"></i>
        </button>
        ` : ""}

        <!-- PDF -->
         ${userSession.IdRol == 1 ? `
        <button class="btn-accion btn-pdf"
                onclick="exportarPdfVenta(${id})"
                title="Exportar PDF">
            <i class="fa fa-file-pdf-o"></i>
        </button>
        ` : ""}
    </div>
`

            }
        ],
        initComplete: function () {
            if (esVendedor) {
                this.api().column("acciones:name").visible(false);
            }
        }
    });


    $("#grdVentas tbody").on("click", "td", function (e) {

        if (!gridVentas) return;

        // Si clic fue en el botón del acordeón o en acciones, NO seleccionar
        if ($(e.target).closest("button.btn-row-detail, .btn-accion").length) return;

        // Si clic fue en links/inputs dentro de la celda, NO seleccionar
        if ($(e.target).closest("a, input, select, textarea, label").length) return;

        const tr = $(this).closest("tr");

        // Si es child row (detalle), NO seleccionar
        if (tr.hasClass("child")) return;

        const row = gridVentas.row(tr);
        const d = row.data();
        if (!d) return;

        // Guardar selección
        ventaClickeadaId = d.IdVenta;

        // Quitar selección previa (scrollX-friendly)
        gridVentas.rows().every(function () {
            $(this.node()).removeClass("row-selected");
        });

        // Marcar esta fila
        $(row.node()).addClass("row-selected");

        // Redraw para que rowCallback sostenga la selección
        gridVentas.draw(false);
    });

    $("#grdVentas tbody").on("click", "button.btn-row-detail", function (e) {
        e.stopPropagation();

        const tr = $(this).closest("tr");

        // marcar selección visual igual aunque el click fue en el botón
        gridVentas.rows().every(function () {
            $(this.node()).removeClass("row-selected");
        });
        $(gridVentas.row(tr).node()).addClass("row-selected");


        // guardar el id para persistir
        const d = gridVentas.row(tr).data();
        ventaClickeadaId = d?.IdVenta ?? null;

        const row = gridVentas.row(tr);
        const icon = tr.find("button.btn-row-detail i");

        if (row.child.isShown()) {
            row.child.hide();
            tr.removeClass("venta-seleccionada");
            icon.removeClass("fa-chevron-up").addClass("fa-chevron-down");
            rowAbierto = null;
        } else {
            row.child(formarAcordeon(row.data())).show();
            icon.removeClass("fa-chevron-down").addClass("fa-chevron-up");
            rowAbierto = row.data().IdVenta;
            cargarDetalleVenta(row.data().IdVenta);
        }
    });
}

function reabrirRowSeleccionado() {
    if (!rowAbierto) return;

    $("#grdVentas tbody tr").each(function () {
        const data = gridVentas.row(this).data();
        if (data?.IdVenta === rowAbierto) {
            $(this).find("button.btn-row-detail").trigger("click");
        }
    });
}

/* ------------ ACORDEÓN DETALLE ------------ */

function formarAcordeon(v) {

    return `
        <div class="accordion-sub">

            <h5 class="text-accent fw-bold mb-2">
                <i class="fa fa-shopping-bag me-2"></i> Productos
            </h5>
            <div class="table-responsive mb-4">
                <table class="table ve-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th class="text-end">Cant.</th>
                            <th class="text-end">P.Unitario</th>
                        </tr>
                    </thead>
                    <tbody id="tbProd_${v.IdVenta}">
                        <tr><td colspan="3" class="text-center text-muted">Cargando...</td></tr>
                    </tbody>
                </table>
            </div>

            <h5 class="text-accent fw-bold mt-4 mb-2">
                <i class="fa fa-calendar me-2"></i> Cuotas pendientes
            </h5>
            <div class="table-responsive mb-4">
                <table class="table ve-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Vencimiento</th>
                            <th class="text-end">Original</th>
                            <th class="text-end">Recargo</th>
                            <th class="text-end">Desc.</th>
                            <th class="text-end">Pagado</th>
                            <th class="text-end">Restante</th>
                            <th>Estado</th>
                            ${esVendedor ? "" : `<th class="text-center">Acciones</th>`}
                        </tr>
                    </thead>
                    <tbody id="tbCuotasPend_${v.IdVenta}"></tbody>
                </table>
            </div>

            <div class="accordion mt-3" id="accFin_${v.IdVenta}">
                <div class="accordion-item ve-accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed js-fin-toggle"
                                type="button"
                                data-bs-target="#colFin_${v.IdVenta}"
                                aria-expanded="false"
                                aria-controls="colFin_${v.IdVenta}">
                            <i class="fa fa-check-circle text-success me-2"></i>
                            Cuotas finalizadas
                            <span class="badge bg-secondary ms-2" id="qFin_${v.IdVenta}">0</span>
                        </button>
                    </h2>
                    <div id="colFin_${v.IdVenta}" class="accordion-collapse collapse"
                         data-bs-parent="#accFin_${v.IdVenta}">
                        <div class="accordion-body p-0">
                            <div class="table-responsive">
                                <table class="table ve-table mb-0">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Vencimiento</th>
                                            <th class="text-end">Total</th>
                                            <th class="text-end">Pagado</th>
                                            <th class="text-center">Historial</th>
                                        </tr>
                                    </thead>
                                    <tbody id="tbCuotasPag_${v.IdVenta}"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

${(userSession && (userSession.IdRol === 1 || userSession.IdRol === 4)) ? `
    <div class="text-end mt-3">
        <button class="btn btn-primary btn-sm" onclick="exportarPdfVenta(${v.IdVenta})">
            <i class="fa fa-file-pdf-o me-1"></i> PDF de esta venta
        </button>
    </div>
` : ""}


        </div>
    `;
}

/* ------------ DETALLE VENTA ------------ */

async function cargarDetalleVenta(idVenta) {
    const resp = await $.getJSON("/Ventas_Electrodomesticos/GetDetalleVenta", { idVenta });

    if (!resp.success) {
        showToast(resp.message, "danger");
        return;
    }

    ventaSeleccionada = resp.data;

    renderProductos(ventaSeleccionada);
    renderCuotas(ventaSeleccionada);
    remarcarVentaSeleccionada();
}

function remarcarVentaSeleccionada() {
    $("#grdVentas tbody tr").removeClass("venta-seleccionada");

    $("#grdVentas tbody tr").each(function () {
        const data = gridVentas.row(this).data();
        if (data?.IdVenta === ventaSeleccionada.IdVenta) {
            $(this).addClass("venta-seleccionada");
        }
    });
}

/* ------------ PRODUCTOS ------------ */

function renderProductos(v) {
    const tb = $(`#tbProd_${v.IdVenta}`).empty();

    if (!v.Items?.length) {
        tb.append(`<tr><td colspan="3" class="text-center text-muted">Sin productos</td></tr>`);
        return;
    }

    v.Items.forEach(i => {
        tb.append(`
            <tr>
                <td>${i.Producto}</td>
                <td class="text-end">${i.Cantidad}</td>
                <td class="text-end">${fmt(i.PrecioUnitario)}</td>
            </tr>
        `);
    });
}

/* ------------ CUOTAS ------------ */

function renderCuotas(v) {

    const tbPend = $(`#tbCuotasPend_${v.IdVenta}`).empty();
    const tbPag = $(`#tbCuotasPag_${v.IdVenta}`).empty();
    const lblFin = $(`#qFin_${v.IdVenta}`);

    const COLS_PEND = esVendedor ? 8 : 9;

    if (!v.Cuotas?.length) {
        tbPend.append(`
            <tr>
                <td colspan="${COLS_PEND}" class="text-center text-muted">
                    Sin cuotas
                </td>
            </tr>
        `);
        lblFin.text("0");
        return;
    }

    let countFin = 0;
    const hoy = moment().startOf("day");

    v.Cuotas.forEach(c => {

        const total =
            (c.MontoOriginal || 0) +
            (c.MontoRecargos || 0) -
            (c.MontoDescuentos || 0);

        const fechaVto = moment(c.FechaVencimiento).startOf("day");
        const diasAtraso = hoy.diff(fechaVto, "days");

        const estaVencida =
            diasAtraso > 0 &&
            c.Estado !== "Pagada" &&
            Number(c.MontoRestante || 0) > 0.0001;

        const venceHoy =
            !estaVencida &&
            c.Estado !== "Pagada" &&
            fechaVto.isSame(hoy, "day") &&
            Number(c.MontoRestante || 0) > 0.0001;

        /* =========================
           CUOTAS PAGADAS
        ========================= */
        if (c.Estado === "Pagada") {
            countFin++;

            tbPag.append(`
                <tr>
                    <td>${c.NumeroCuota}</td>
                    <td>${fechaVto.format("DD/MM/YYYY")}</td>
                    <td class="text-end">${fmt(total)}</td>
                    <td class="text-end">${fmt(c.MontoPagado)}</td>
                    <td class="text-center">
                        <button class="btn btn-secondary btn-sm"
                                onclick="verHistorial(${c.Id}, ${v.IdVenta})">
                            <i class="fa fa-clock-o"></i>
                        </button>
                    </td>
                </tr>
            `);

            return;
        }

        /* =========================
           ESTILOS
        ========================= */

        let rowClass = "";
        let estadoHtml = `<span class="badge bg-warning text-dark">Pendiente</span>`;
        let vtoHtml = fechaVto.format("DD/MM/YYYY");

        if (estaVencida) {

            rowClass = "fila-atrasada";

            let cls = "bg-warning text-dark";
            if (diasAtraso >= 15) cls = "bg-danger";
            else if (diasAtraso >= 10) cls = "bg-orange";

            vtoHtml = `
                <div class="text-danger fw-bold">
                    ${fechaVto.format("DD/MM/YYYY")}
                    <div class="small opacity-75">
                        ${diasAtraso} día${diasAtraso !== 1 ? "s" : ""} de atraso
                    </div>
                </div>
            `;

            estadoHtml = `
                <span class="badge ${cls}">
                    Vencida · ${diasAtraso} día${diasAtraso !== 1 ? "s" : ""}
                </span>
            `;
        }
        else if (venceHoy) {

            rowClass = "fila-aldia";

            vtoHtml = `
                <div class="text-success fw-bold">
                    ${fechaVto.format("DD/MM/YYYY")}
                    <div class="small opacity-75">Vence hoy</div>
                </div>
            `;

            estadoHtml = `<span class="badge bg-success">Vence hoy</span>`;
        }

        /* =========================
           ACCIONES (solo si NO es vendedor)
        ========================= */
        const accionesHtml = esVendedor ? "" : `
            <td class="text-center">
                <div class="btn-group">
                    <button class="btn btn-accion btn-cobrar me-1"
                            onclick="Historial.abrirCobro(${v.IdVenta}, ${c.Id})"
                            title="Cobrar">
                        <i class="fa fa-money"></i>
                    </button>

                    <button class="btn btn-accion btn-ajuste me-1"
                            onclick="Historial.abrirAjuste(${v.IdVenta}, ${c.Id})"
                            title="Ajustar">
                        <i class="fa fa-bolt"></i>
                    </button>

                    <button class="btn btn-accion btn-historial"
                            onclick="Historial.abrirHistorial(${v.IdVenta}, ${c.Id})"
                            title="Historial">
                        <i class="fa fa-eye"></i>
                    </button>
                </div>
            </td>
        `;

        tbPend.append(`
            <tr class="${rowClass}">
                <td>${c.NumeroCuota}</td>
                <td>${vtoHtml}</td>

                <td class="text-end">${fmt(c.MontoOriginal)}</td>
                <td class="text-end">${fmt(c.MontoRecargos)}</td>
                <td class="text-end">${fmt(c.MontoDescuentos)}</td>
                <td class="text-end">${fmt(c.MontoPagado)}</td>
                <td class="text-end fw-bold">${fmt(c.MontoRestante)}</td>

                <td>${estadoHtml}</td>
                ${accionesHtml}
            </tr>
        `);
    });

    lblFin.text(countFin);

    if (!tbPag.children().length) {
        tbPag.append(`
            <tr>
                <td colspan="5" class="text-center text-muted">
                    Sin cuotas finalizadas
                </td>
            </tr>
        `);
    }
}


function editarVenta(id) {
    window.location.href = "/Ventas_Electrodomesticos/NuevoModif/" + id;
}

async function eliminarVenta(id) {
    if (!confirm("¿Eliminar venta?")) return;

    try {
        const resp = await $.post("/Ventas_Electrodomesticos/EliminarVenta", { id });

        if (!resp.success) {
            showToast(resp.message, "danger");
            return;
        }

        showToast("Venta eliminada", "success");
        cargarTabla();

    } catch {
        showToast("Error al eliminar", "danger");
    }
}

/* ------------ PDF INDIVIDUAL ------------ */

function exportarPdfVenta(idVenta) {

    if (!idVenta || Number(idVenta) <= 0) {
        showToast("Venta inválida", "danger");
        return;
    }

    // Si existe tu exportador global (el de jsPDF que ya tenés)
    if (typeof window.exportarVentaPDF === "function") {
        window.exportarVentaPDF(Number(idVenta));
        return;
    }

    // Fallback: si por alguna razón ese exportador no está cargado
    showToast("Exportación PDF no disponible (falta exportarVentaPDF)", "danger");
}

async function cargarUsuarios() {
    try {
        var url = "/Ventas/ListarVendedores";

        let value = JSON.stringify({
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
            selectUsuarios = document.getElementById("filtroVendedor");


            $('#filtroVendedor option').remove();

            if (userSession.IdRol == 1 || userSession.IdRol == 4) { //ROL ADMINISTRADOR, COMPROBANTES
                option = document.createElement("option");
                option.value = -1;
                option.text = "Todos";
                selectUsuarios.appendChild(option);
            }

            for (i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre;
                selectUsuarios.appendChild(option);
            }


        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


function calcularDiasAtraso(fechaVto) {
    if (!fechaVto) return 0;

    const hoy = moment().startOf("day");
    let f = null;

    // ASP.NET: "/Date(176...)/"
    if (typeof fechaVto === "string") {
        const m = fechaVto.match(/\/Date\((\d+)\)\//);
        if (m && m[1]) f = moment(Number(m[1])).startOf("day");
    }

    // ISO
    if (!f || !f.isValid()) {
        const mi = moment(fechaVto, moment.ISO_8601, true);
        if (mi.isValid()) f = mi.startOf("day");
    }

    // DD/MM/YYYY
    if (!f || !f.isValid()) {
        const mdmy = moment(fechaVto, ["DD/MM/YYYY", "DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY HH:mm"], true);
        if (mdmy.isValid()) f = mdmy.startOf("day");
    }

    // Date
    if ((!f || !f.isValid()) && fechaVto instanceof Date) {
        f = moment(fechaVto).startOf("day");
    }

    if (!f || !f.isValid()) {
        console.warn("FechaVencimiento inválida:", fechaVto);
        return 0;
    }

    const diff = hoy.diff(f, "days");
    return diff > 0 ? diff : 0;
}


// FIX: acordeón de "Cuotas finalizadas" dentro del child-row (DataTables)
$(document).on("click", ".js-fin-toggle", function (e) {
    e.preventDefault();
    e.stopPropagation();

    const targetSel = $(this).attr("data-bs-target");
    if (!targetSel) return;

    const el = document.querySelector(targetSel);
    if (!el || !window.bootstrap?.Collapse) return;

    const inst = bootstrap.Collapse.getOrCreateInstance(el, { toggle: false });
    inst.toggle();
});



// ===========================================================
// HISTORIAL → PARTIAL (DELEGACIÓN TOTAL)
// ===========================================================

window.Historial = {

    abrirCobro(idVenta, idCuota) {
        if (typeof window.abrirModalCobro !== "function") {
            showToast("Cobro no disponible", "danger");
            return;
        }
        window.abrirModalCobro(idVenta, idCuota);
    },

    abrirAjuste(idVenta, idCuota) {
        if (typeof window.abrirAjusteDesdeCobros !== "function") {
            showToast("Ajuste no disponible", "danger");
            return;
        }
        window.abrirAjusteDesdeCobros(idVenta, idCuota);
    },

    abrirHistorial(idVenta, idCuota) {
        if (typeof window.abrirHistorialDesdeCobros !== "function") {
            showToast("Historial no disponible", "danger");
            return;
        }
        window.abrirHistorialDesdeCobros(idVenta, idCuota);
    }
};

async function modalLimite() {
    try {
        // ocultar error
        const err = document.getElementById("datos");
        if (err) {
            err.classList.add("d-none");
            err.textContent = "";
        }

        // limpiar input mientras carga
        const inp = document.getElementById("DiasLimite");
        if (inp) inp.value = "";

        // pedir el valor actual del limite
        const resp = await $.getJSON("/Limite/BuscarValorLimite", { nombre: "VentasPrimerCuota" });

        // resp = { data: { Id, Nombre, Valor } }
        const lim = resp?.data;

        if (!lim || lim.Valor === undefined || lim.Valor === null) {
            if (err) {
                err.textContent = "No se encontró el límite 'VentasPrimerCuota'.";
                err.classList.remove("d-none");
            }
        } else {
            if (inp) inp.value = lim.Valor;
        }

        // abrir modal
        $("#modalLimite").modal("show");

        // foco prolijo
        setTimeout(() => inp?.focus(), 300);

    } catch (e) {
        console.error("Error modalLimite()", e);

        const err = document.getElementById("datos");
        if (err) {
            err.textContent = "Ha ocurrido un error cargando el límite.";
            err.classList.remove("d-none");
        }

        $("#modalLimite").modal("show");
    }
}


async function modificarLimitePrimerCuota() {
    try {
        const err = document.getElementById("datos");
        if (err) {
            err.classList.add("d-none");
            err.textContent = "";
        }

        const valorStr = (document.getElementById("DiasLimite")?.value || "").trim();
        const valor = parseInt(valorStr, 10);

        if (isNaN(valor) || valor < 0) {
            if (err) {
                err.textContent = "Ingresá una cantidad de días válida (0 o mayor).";
                err.classList.remove("d-none");
            }
            return;
        }

        // Usamos LimiteController/Edita(VMLimite) como en tu ejemplo
        const payload = JSON.stringify({
            Nombre: "VentasPrimerCuota",
            Valor: valor
        });

        const options = {
            type: "POST",
            url: "/Limite/Editar",
            async: true,
            data: payload,
            contentType: "application/json",
            dataType: "json"
        };

        const resp = await MakeAjax(options);

        // resp = { data: true/false }
        if (resp && resp.data === true) {
            exitoModal("Límite modificado correctamente");
            $("#modalLimite").modal("hide");
        } else {
            if (err) {
                err.textContent = "No se pudo modificar el límite.";
                err.classList.remove("d-none");
            }
        }

    } catch (e) {
        console.error("Error modificarLimitePrimerCuota()", e);
        const err = document.getElementById("datos");
        if (err) {
            err.textContent = "Ha ocurrido un error.";
            err.classList.remove("d-none");
        }
    }
}

function habilitarSeleccionFilaVentas() {

    // Click en cualquier CELDA de la fila (más confiable que click en tr)
    $("#grdVentas tbody").on("click", "td", function (e) {

        if (!gridVentas) return;

        // Si clic fue en el botón del acordeón o en acciones, no seleccionar
        if ($(e.target).closest("button.btn-row-detail, button.btn-accion").length) return;

        // Si clic fue en links/inputs dentro de la celda (por las dudas), no seleccionar
        if ($(e.target).closest("a, input, select, textarea").length) return;

        // Subir al TR real
        const tr = $(this).closest("tr");

        // No seleccionar child row
        if (tr.hasClass("child")) return;

        const row = gridVentas.row(tr);
        const d = row.data();
        if (!d) return;

        ventaClickeadaId = d.IdVenta;

        // Desmarcar usando nodos reales (scrollX friendly)
        gridVentas.rows().every(function () {
            $(this.node()).removeClass("row-selected");
        });

        $(row.node()).addClass("row-selected");

        // Redraw para que rowCallback lo sostenga
        gridVentas.draw(false);
    });
}


function habilitarSeleccionFilasCuotas() {
    // Delegación global: cualquier tabla dentro del acordeón
    $(document).on("click", ".accordion-sub table tbody tr", function (e) {

        // Si clickeás en botones de acción (Cobrar/Ajuste/Historial), no cambiar
        if ($(e.target).closest("button, a, input, select, textarea, label, i").length) return;

        const $tbody = $(this).closest("tbody");

        // Solo desmarca dentro de ESA tabla
        $tbody.find("tr").removeClass("row-selected");
        $(this).addClass("row-selected");
    });
}
