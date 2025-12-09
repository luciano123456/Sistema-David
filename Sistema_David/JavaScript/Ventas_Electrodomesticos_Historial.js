/* ===========================================================
 * Ventas_Electrodomesticos_Historial.js — v500.0 FINAL
 * =========================================================== */

let gridVentas = null;
let ventasCache = [];
let ventaSeleccionada = null;
let rowAbierto = null;

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
    cargarTabla();

    $("#btnToggleFiltros").on("click", toggleFiltros);
    $("#btnConfirmarCobro").on("click", confirmarCobro);
    $("#btnConfirmarAjuste").on("click", confirmarAjuste);
});

/* ------------ FILTROS ------------ */

function toggleFiltros() {
    const form = $("#formFiltros");
    form.toggleClass("d-none");
    $("#iconFiltros").toggleClass("fa-chevron-down fa-chevron-up");
}

function aplicarFiltros() { cargarTabla(); }

function limpiarFiltros() {
    $("#txtFechaDesde").val("");
    $("#txtFechaHasta").val("");
    $("#filtroEstado").val("");
    cargarTabla();
}

/* ------------ TABLA PRINCIPAL ------------ */

async function cargarTabla() {
    const desde = $("#txtFechaDesde").val();
    const hasta = $("#txtFechaHasta").val();
    const estado = $("#filtroEstado").val();

    let resp;
    try {
        resp = await $.getJSON("/Ventas_Electrodomesticos/GetHistorialVentas", {
            fechaDesde: desde || null,
            fechaHasta: hasta || null,
            estado
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
        responsive: true,
        language: { url: "//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json" },
        rowCallback: function (row, d) {
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
            { data: "CuotasVencidas" },
            {
                data: "Estado",
                render: st => `
                    <span class="badge ${st === "Cancelada" ? "bg-danger" :
                        st === "Activa" ? "bg-warning text-dark" :
                            "bg-secondary"
                    }">${st}</span>
                `
            },
            {
                data: "IdVenta",
                orderable: false,
                className: "text-center",
                render: id => `
                    <button class="btn btn-outline-light btn-sm me-1" onclick="editarVenta(${id})">
                        <i class="fa fa-pencil"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarVenta(${id})">
                        <i class="fa fa-trash"></i>
                    </button>
                `
            }
        ]
    });

    $("#grdVentas tbody").on("click", "button.btn-row-detail", function (e) {
        e.stopPropagation();

        const tr = $(this).closest("tr");
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
                            <th class="text-end">PU</th>
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
                            <th class="text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tbCuotasPend_${v.IdVenta}"></tbody>
                </table>
            </div>

            <div class="accordion mt-3" id="accFin_${v.IdVenta}">
                <div class="accordion-item ve-accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button"
                                data-bs-toggle="collapse"
                                data-bs-target="#colFin_${v.IdVenta}">
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

            <div class="text-end mt-3">
                <button class="btn btn-primary btn-sm"
                        onclick="exportarPdfVenta(${v.IdVenta})">
                    <i class="fa fa-file-pdf-o me-1"></i> PDF de esta venta
                </button>
            </div>

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

    if (!v.Cuotas?.length) {
        tbPend.append(`<tr><td colspan="9" class="text-center text-muted">Sin cuotas</td></tr>`);
        $("#qFin_" + v.IdVenta).text("0");
        return;
    }

    let countFin = 0;

    v.Cuotas.forEach(c => {
        const total = c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos;

        if (c.Estado === "Pagada") {
            countFin++;
            tbPag.append(`
                <tr>
                    <td>${c.NumeroCuota}</td>
                    <td>${moment(c.FechaVencimiento).format("DD/MM/YYYY")}</td>
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

        tbPend.append(`
            <tr>
                <td>${c.NumeroCuota}</td>
                <td>${moment(c.FechaVencimiento).format("DD/MM/YYYY")}</td>
                <td class="text-end">${fmt(c.MontoOriginal)}</td>
                <td class="text-end">${fmt(c.MontoRecargos)}</td>
                <td class="text-end">${fmt(c.MontoDescuentos)}</td>
                <td class="text-end">${fmt(c.MontoPagado)}</td>
                <td class="text-end fw-bold">${fmt(c.MontoRestante)}</td>
                <td>
                    <span class="badge ${c.Estado === "Pendiente"
                ? "bg-warning text-dark"
                : "bg-success"}">${c.Estado}</span>
                </td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-success"
                            onclick="abrirCobro(${c.Id}, ${v.IdVenta}, ${c.MontoRestante})"
                            title="Cobrar">
                            <i class="fa fa-money"></i>
                        </button>
                        <button class="btn btn-info"
                            onclick="abrirAjuste(${c.Id})"
                            title="Recargo / Descuento">
                            <i class="fa fa-sliders"></i>
                        </button>
                        <button class="btn btn-secondary"
                            onclick="verHistorial(${c.Id}, ${v.IdVenta})"
                            title="Historial">
                            <i class="fa fa-clock-o"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `);
    });

    $("#qFin_" + v.IdVenta).text(countFin);
}

/* ------------ COBRO ------------ */

function abrirCobro(idCuota, idVenta, restante) {
    $("#cobroIdCuota").val(idCuota);
    $("#cobroRestante").val(fmt(restante));
    $("#cobroImporte").val(fmt(restante));
    $("#cobroObs").val("");

    openModalById("mdCobro");
}

async function confirmarCobro() {
    if (!ventaSeleccionada) return;

    const idCuota = Number($("#cobroIdCuota").val());
    const importe = parseMoney($("#cobroImporte").val());
    const obs = $("#cobroObs").val();

    if (!idCuota || importe <= 0) {
        showToast("Importe inválido", "danger");
        return;
    }

    const payload = {
        IdVenta: ventaSeleccionada.IdVenta,
        FechaPago: moment().format("YYYY-MM-DD"),
        MedioPago: "EFECTIVO",
        ImporteTotal: importe,
        Observacion: obs,
        Aplicaciones: [{ IdCuota: idCuota, ImporteAplicado: importe }]
    };

    try {
        const resp = await $.ajax({
            url: "/Ventas_Electrodomesticos/RegistrarPago",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(payload)
        });

        if (!resp.success) {
            showToast(resp.message, "danger");
            return;
        }

        showToast("Pago registrado", "success");
        closeModalById("mdCobro");
        await recargarDetalle(ventaSeleccionada.IdVenta);

    } catch {
        showToast("Error al registrar pago", "danger");
    }
}

/* ------------ AJUSTE ------------ */

function abrirAjuste(idCuota) {
    $("#ajIdCuota").val(idCuota);
    $("#ajRecargo").val("");
    $("#ajDescuento").val("");

    openModalById("mdAjuste");
}

async function confirmarAjuste() {
    const idCuota = Number($("#ajIdCuota").val());
    if (!idCuota || !ventaSeleccionada) return;

    const recInput = parseMoney($("#ajRecargo").val());
    const desInput = parseMoney($("#ajDescuento").val());

    const cuota = ventaSeleccionada.Cuotas?.find(c => c.Id === idCuota);
    if (!cuota) {
        showToast("Cuota no encontrada", "danger");
        return;
    }

    let recargo = recInput;
    let descuento = desInput;

    try {
        const resp = await $.post("/Ventas_Electrodomesticos/ActualizarRecargoDescuentoCuota", {
            idCuota,
            recargo,
            descuento
        });

        if (!resp.success) {
            showToast(resp.message, "danger");
            return;
        }

        showToast("Ajuste actualizado", "success");
        closeModalById("mdAjuste");
        await recargarDetalle(ventaSeleccionada.IdVenta);

    } catch {
        showToast("Error al ajustar cuota", "danger");
    }
}

/* ------------ HISTORIAL ------------ */

async function verHistorial(idCuota, idVenta) {
    const resp = await $.getJSON("/Ventas_Electrodomesticos/GetDetalleVenta", { idVenta });
    if (!resp.success) {
        showToast(resp.message, "danger");
        return;
    }

    const venta = resp.data;
    const movimientos = (venta.Historial || []).filter(h => h.IdCuota === idCuota);

    const tb = $("#histBody").empty();

    if (!movimientos.length) {
        tb.append(`<tr><td colspan="4" class="text-center text-muted">Sin movimientos</td></tr>`);
    } else {
        movimientos.forEach((h, i) => {
            tb.append(`
                <tr>
                    <td>${i + 1}</td>
                    <td>${moment(h.FechaCambio).format("DD/MM/YYYY HH:mm")}</td>
                    <td class="text-end">${fmt(h.ValorNuevo || 0)}</td>
                    <td>${h.Observacion || ""}</td>
                </tr>
            `);
        });
    }

    openModalById("mdHistorial");
}

/* ------------ RECARGAR DETALLE ------------ */

async function recargarDetalle(idVenta) {
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

/* ------------ EDITAR / ELIMINAR ------------ */

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
    window.location.href = `/Ventas_Electrodomesticos/Cobros?idVenta=${idVenta}`;
}
