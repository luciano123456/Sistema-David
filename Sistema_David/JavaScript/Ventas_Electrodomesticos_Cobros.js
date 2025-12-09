/* ===========================================================
 * Ventas_Electrodomesticos_Cobros.js — v800.0 FINAL
 * Basado en Historial (columna 0 acordeón)
 * - Cuotas pendientes + cuotas finalizadas (igual historial)
 * - Cobros por cuota (tabla y acordeón)
 * - Cobro adelantado solo si cuotas anteriores están pagadas
 * =========================================================== */

let VC = {};
let tabla = null;
let cuotasCache = [];
let ventaSeleccionada = null;      // detalle actual (GetDetalleVenta)
let ventaAcordeonAbierta = null;   // IdVenta con acordeón abierto

/* ===========================================================
   HELPERS
=========================================================== */

VC.fmt = n => {
    try {
        const v = Number(n || 0);
        return v.toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS"
        });
    } catch {
        return "$ 0,00";
    }
};

VC.parseMoney = s => {
    if (!s) return 0;
    return Number(
        String(s)
            .replace(/[^\d,-]/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
    ) || 0;
};

VC.toast = function (msg, type = "info") {
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
        </div>`;

    cont.appendChild(el);

    if (window.bootstrap?.Toast) {
        new bootstrap.Toast(el, { delay: 2500 }).show();
    }

    el.addEventListener("hidden.bs.toast", () => el.remove());
};

VC.openModal = function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    const m = bootstrap.Modal.getOrCreateInstance(el);
    m.show();
};

VC.closeModal = function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    const m = bootstrap.Modal.getInstance(el);
    if (m) m.hide();
};

// Extraer número de texto tipo "Ahora=600.00"
VC.extraerNumero = function (texto) {
    if (!texto) return 0;
    const match = String(texto).match(/([0-9]+([.,][0-9]+)?)/);
    if (!match) return 0;
    return Number(match[0].replace(",", "."));
};

/* ===========================================================
   INIT
=========================================================== */

$(document).ready(async function () {
    try { moment.locale("es"); } catch { }

    // Fechas: hoy / hoy
    const hoy = moment().format("YYYY-MM-DD");
    $("#f_desde").val(hoy);
    $("#f_hasta").val(hoy);

    await VC.cargarCombos();
    VC.initEventos();
    await VC.cargarTabla();
});

VC.initEventos = function () {

    // Toggle filtros
    $("#btnToggleFiltros").on("click", () => {
        const form = $("#formFiltros");
        form.toggleClass("d-none");
        $("#iconFiltros").toggleClass("fa-chevron-down fa-chevron-up");
    });

    // Confirmar cobro
    $("#md_confirmarCobro").on("click", VC.confirmarCobro);

    // Confirmar ajuste
    $("#aj_confirmar").on("click", VC.confirmarAjuste);
};


/* ===========================================================
   CARGAR SELECTS CLIENTE + VENDEDOR (Select2)
=========================================================== */

VC.cargarCombos = async function () {
    // CLIENTES
    try {
        const respCli = await $.getJSON("/Clientes/GetClientes");
        const ddl = $("#f_cliente").empty();
        ddl.append(`<option value="">Todos</option>`);
        (respCli.data || []).forEach(c => {
            ddl.append(`<option value="${c.Id}">${c.Nombre} ${c.Apellido}</option>`);
        });
    } catch (e) {
        console.error("Error cargando clientes", e);
    }

    // COBRADORES / VENDEDORES
    try {
        const respVen = await $.getJSON("/Usuarios/ListarCobradores");
        const ddl = $("#f_vendedor").empty();
        ddl.append(`<option value="">Todos</option>`);
        (respVen.data || []).forEach(v => {
            ddl.append(`<option value="${v.Id}">${v.Nombre}</option>`);
        });
    } catch (e) {
        console.error("Error cargando cobradores", e);
    }

    // Select2 una vez que tenemos opciones
    $("#f_cliente").select2({
        width: "100%",
        placeholder: "Todos",
        allowClear: true
    });

    $("#f_vendedor").select2({
        width: "100%",
        placeholder: "Todos",
        allowClear: true
    });
};


/* ===========================================================
   FILTROS
=========================================================== */

VC.aplicarFiltros = function () {
    VC.cargarTabla();
};

VC.limpiarFiltros = function () {
    const hoy = moment().format("YYYY-MM-DD");
    $("#f_desde").val(hoy);
    $("#f_hasta").val(hoy);
    $("#f_cliente").val("").trigger("change");
    $("#f_vendedor").val("").trigger("change");
    $("#f_estado").val("");

    VC.cargarTabla();
};


/* ===========================================================
   TABLA PRINCIPAL (CUOTAS)
=========================================================== */

VC.cargarTabla = async function () {

    let resp = null;

    try {
        resp = await $.getJSON("/Ventas_Electrodomesticos/ListarCuotasACobrar", {
            fechaDesde: $("#f_desde").val() || null,
            fechaHasta: $("#f_hasta").val() || null,
            idCliente: $("#f_cliente").val() || null,
            idVendedor: $("#f_vendedor").val() || null,
            estado: $("#f_estado").val() || null
        });
    } catch (e) {
        console.error("Error cargando cuotas", e);
        VC.toast("Error cargando cuotas", "danger");
        return;
    }

    // Siempre ocultar pagadas en la grilla principal
    cuotasCache = (resp.data || []).filter(x => x.Estado !== "Pagada");

    if (tabla) {
        tabla.clear().rows.add(cuotasCache).draw();
        VC.reabrirAcordeon();
        return;
    }

    tabla = $("#vc_tabla").DataTable({
        data: cuotasCache,
        pageLength: 50,
        responsive: true,
        language: { url: "//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json" },
        rowCallback: function (row, d) {
            if (ventaSeleccionada && d && d.IdVenta === ventaSeleccionada.IdVenta) {
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
                    <button class="btn btn-link p-0 text-accent btn-row-detail" title="Ver detalle venta">
                        <i class="fa fa-chevron-down"></i>
                    </button>
                `
            },
            { data: "NumeroCuota" },
            { data: "ClienteNombre" },
            { data: "VendedorNombre" },
            {
                data: "FechaVencimiento",
                render: x => x ? moment(x).format("DD/MM/YYYY") : ""
            },
            { data: "TotalCuota", render: VC.fmt },
            { data: "MontoPagado", render: VC.fmt },
            { data: "MontoRestante", render: VC.fmt },
            {
                data: "Estado",
                render: st => `
                    <span class="badge
                    ${st === "Pendiente" ? "bg-warning text-dark" :
                        st === "Vencida" ? "bg-danger" :
                            "bg-success"
                    }">${st}</span>
                `
            },
            {
                data: null,
                className: "text-center",
                orderable: false,
                render: d => `
    <div class="btn-group">
        <button class="btn btn-accion btn-cobrar me-1"
            onclick="VC.abrirCobro(${d.IdCuota}, ${d.IdVenta}, ${d.MontoRestante})"
            title="Cobrar">
            <i class="fa fa-money"></i>
        </button>

        <button class="btn btn-accion btn-ajuste me-1"
            onclick="VC.abrirAjuste(${d.IdCuota})"
            title="Ajustar">
            <i class="fa fa-bolt"></i>
        </button>

        <button class="btn btn-accion btn-historial"
            onclick="VC.verHistorial(${d.IdCuota}, ${d.IdVenta})"
            title="Historial">
            <i class="fa fa-eye"></i>
        </button>
    </div>
`

            }
        ]
    });

    // Click en flecha de acordeón (columna 0)
    $("#vc_tabla tbody").on("click", "button.btn-row-detail", async function (e) {
        e.stopPropagation();

        const tr = $(this).closest("tr");
        const row = tabla.row(tr);
        const data = row.data();
        const icon = $(this).find("i");

        if (!data) return;

        if (row.child.isShown()) {
            // Cerrar este
            row.child.hide();
            tr.removeClass("shown venta-seleccionada");
            icon.removeClass("fa-chevron-up").addClass("fa-chevron-down");
            ventaAcordeonAbierta = null;
            ventaSeleccionada = null;
            return;
        }

        // Cerrar cualquiera abierto
        tabla.rows().every(function () {
            if (this.child.isShown()) {
                this.child.hide();
                $(this.node()).removeClass("shown venta-seleccionada");
                $(this.node()).find("button.btn-row-detail i")
                    .removeClass("fa-chevron-up").addClass("fa-chevron-down");
            }
        });

        // Abrir este
        row.child(VC.formarAcordeonVenta(data)).show();
        tr.addClass("shown venta-seleccionada");
        icon.removeClass("fa-chevron-down").addClass("fa-chevron-up");
        ventaAcordeonAbierta = data.IdVenta;

        // Cargar detalle real
        await VC.cargarDetalleVenta(data.IdVenta);
    });
};


// Reabrir acordeón después de recargar tabla
VC.reabrirAcordeon = function () {
    if (!ventaAcordeonAbierta) return;

    $("#vc_tabla tbody tr").each(function () {
        const r = tabla.row(this);
        const d = r.data();
        if (d && d.IdVenta === ventaAcordeonAbierta) {
            $(this).find("button.btn-row-detail").trigger("click");
        }
    });
};


/* ===========================================================
   ACORDEÓN DETALLE VENTA (MISMO ESTILO HISTORIAL)
=========================================================== */

VC.formarAcordeonVenta = function (rowData) {
    const idV = rowData.IdVenta;

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
                    <tbody id="tbProd_${idV}">
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
                    <tbody id="tbCuotasPend_${idV}"></tbody>
                </table>
            </div>

            <div class="accordion mt-3" id="accFin_${idV}">
                <div class="accordion-item ve-accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button"
                                data-bs-toggle="collapse"
                                data-bs-target="#colFin_${idV}">
                            <i class="fa fa-check-circle text-success me-2"></i>
                            Cuotas finalizadas
                            <span class="badge bg-secondary ms-2" id="qFin_${idV}">0</span>
                        </button>
                    </h2>
                    <div id="colFin_${idV}" class="accordion-collapse collapse"
                         data-bs-parent="#accFin_${idV}">
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
                                    <tbody id="tbCuotasPag_${idV}"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;
};


/* ===========================================================
   DETALLE VENTA (GetDetalleVenta)
=========================================================== */

VC.cargarDetalleVenta = async function (idVenta) {
    try {
        const resp = await $.getJSON("/Ventas_Electrodomesticos/GetDetalleVenta", { idVenta });

        if (!resp.success) {
            VC.toast(resp.message || "Error obteniendo detalle", "danger");
            return;
        }

        ventaSeleccionada = resp.data;

        VC.renderProductos(ventaSeleccionada);
        VC.renderCuotas(ventaSeleccionada);
    } catch (e) {
        console.error("Error detalle venta", e);
        VC.toast("Error obteniendo detalle", "danger");
    }
};


/* ===========================================================
   RENDER PRODUCTOS
=========================================================== */

VC.renderProductos = function (v) {
    const tb = $(`#tbProd_${v.IdVenta}`).empty();

    if (!v.Items || !v.Items.length) {
        tb.append(`<tr><td colspan="3" class="text-center text-muted">Sin productos</td></tr>`);
        return;
    }

    v.Items.forEach(i => {
        tb.append(`
            <tr>
                <td>${i.Producto}</td>
                <td class="text-end">${i.Cantidad}</td>
                <td class="text-end">${VC.fmt(i.PrecioUnitario)}</td>
            </tr>
        `);
    });
};


/* ===========================================================
   RENDER CUOTAS (PENDIENTES + FINALIZADAS)
=========================================================== */

VC.renderCuotas = function (v) {
    const tbPend = $(`#tbCuotasPend_${v.IdVenta}`).empty();
    const tbPag = $(`#tbCuotasPag_${v.IdVenta}`).empty();
    const lblFin = $(`#qFin_${v.IdVenta}`);

    if (!v.Cuotas || !v.Cuotas.length) {
        tbPend.append(`<tr><td colspan="9" class="text-center text-muted">Sin cuotas</td></tr>`);
        lblFin.text("0");
        return;
    }

    const hoy = moment().startOf("day");
    let cuotaHoyId = null;
    let countFin = 0;

    // Buscar la primera cuota pendiente/vencida con fecha <= hoy
    for (let c of v.Cuotas) {
        if ((c.Estado === "Pendiente" || c.Estado === "Vencida") &&
            c.FechaVencimiento &&
            moment(c.FechaVencimiento).startOf("day").isSameOrBefore(hoy)) {
            cuotaHoyId = c.Id;
            break;
        }
    }

    v.Cuotas.forEach(c => {
        const total = (c.MontoOriginal || 0) + (c.MontoRecargos || 0) - (c.MontoDescuentos || 0);

        if (c.Estado === "Pagada") {
            countFin++;
            tbPag.append(`
                <tr>
                    <td>${c.NumeroCuota}</td>
                    <td>${c.FechaVencimiento ? moment(c.FechaVencimiento).format("DD/MM/YYYY") : ""}</td>
                    <td class="text-end">${VC.fmt(total)}</td>
                    <td class="text-end">${VC.fmt(c.MontoPagado)}</td>
                    <td class="text-center">
                        <button class="btn btn-secondary btn-sm"
                                onclick="VC.verHistorial(${c.Id}, ${v.IdVenta})">
                            <i class="fa fa-clock-o"></i>
                        </button>
                    </td>
                </tr>
            `);
            return;
        }

        // Cuotas pendientes / vencidas
        const esHoy = c.Id === cuotaHoyId;
        const rowStyle = esHoy
            ? `style="background: rgba(255, 193, 7, 0.15); border-left: 3px solid #ffc107;"`
            : "";
        const badgeHoy = esHoy
            ? `<span class="badge bg-warning text-dark ms-2">HOY</span>`
            : "";

        tbPend.append(`
            <tr ${rowStyle}>
                <td>${c.NumeroCuota} ${badgeHoy}</td>
                <td>${c.FechaVencimiento ? moment(c.FechaVencimiento).format("DD/MM/YYYY") : ""}</td>
                <td class="text-end">${VC.fmt(c.MontoOriginal)}</td>
                <td class="text-end">${VC.fmt(c.MontoRecargos)}</td>
                <td class="text-end">${VC.fmt(c.MontoDescuentos)}</td>
                <td class="text-end">${VC.fmt(c.MontoPagado)}</td>
                <td class="text-end fw-bold">${VC.fmt(c.MontoRestante)}</td>
                <td>
                    <span class="badge ${c.Estado === "Pendiente" ? "bg-warning text-dark" :
                c.Estado === "Vencida" ? "bg-danger" :
                    "bg-success"
            }">${c.Estado}</span>
                </td>
                <td class="text-center">
    <div class="btn-group">

        <button class="btn btn-accion btn-cobrar me-1"
            onclick="VC.abrirCobro(${c.Id}, ${v.IdVenta}, ${c.MontoRestante})"
            title="Cobrar">
            <i class="fa fa-money"></i>
        </button>

        <button class="btn btn-accion btn-ajuste me-1"
            onclick="VC.abrirAjuste(${c.Id})"
            title="Ajustar">
            <i class="fa fa-bolt"></i>
        </button>

        <button class="btn btn-accion btn-historial"
            onclick="VC.verHistorial(${c.Id}, ${v.IdVenta})"
            title="Historial">
            <i class="fa fa-eye"></i>
        </button>

    </div>
</td>

            </tr>
        `);
    });

    lblFin.text(countFin);

    if (!tbPag.children().length) {
        tbPag.append(`<tr><td colspan="5" class="text-center text-muted">Sin cuotas finalizadas</td></tr>`);
    }
};


/* ===========================================================
   REGLA: COBRO ADELANTADO
   - Se puede cobrar cuota N solo si TODAS las cuotas anteriores
     (NumeroCuota < N) tienen MontoRestante = 0
=========================================================== */

VC.puedeCobrarCuota = function (ventaDet, idCuota) {
    if (!ventaDet || !ventaDet.Cuotas) return false;

    const cuotas = ventaDet.Cuotas;
    const cuotaActual = cuotas.find(c => c.Id === idCuota);
    if (!cuotaActual) return false;

    const numActual = Number(cuotaActual.NumeroCuota || 0);

    const tienePrevImpaga = cuotas.some(c => {
        const num = Number(c.NumeroCuota || 0);
        const restante = Number(c.MontoRestante || 0);
        return num < numActual && restante > 0.0001;
    });

    return !tienePrevImpaga;
};


/* ===========================================================
   MODAL COBRO
=========================================================== */

VC.abrirCobro = async function (idCuota, idVenta, restante) {
    try {
        let ventaDet = null;

        if (ventaSeleccionada && ventaSeleccionada.IdVenta === idVenta) {
            ventaDet = ventaSeleccionada;
        } else {
            const resp = await $.getJSON("/Ventas_Electrodomesticos/GetDetalleVenta", { idVenta });
            if (!resp.success) {
                VC.toast(resp.message || "Error obteniendo venta", "danger");
                return;
            }
            ventaDet = resp.data;
        }

        if (!VC.puedeCobrarCuota(ventaDet, idCuota)) {
            VC.toast("No se puede cobrar esta cuota hasta completar las cuotas anteriores.", "danger");
            return;
        }

        $("#md_cuotaId").val(idCuota);
        $("#md_restante").val(VC.fmt(restante));
        $("#md_importe").val(VC.fmt(restante));
        $("#md_obs").val("");

        VC.openModal("mdCobro");

    } catch (e) {
        console.error("Error abrir cobro", e);
        VC.toast("Error preparando cobro", "danger");
    }
};

VC.confirmarCobro = async function () {
    const idCuota = Number($("#md_cuotaId").val());
    const importe = VC.parseMoney($("#md_importe").val());
    const obs = $("#md_obs").val();

    if (!idCuota || importe <= 0) {
        VC.toast("Importe inválido", "danger");
        return;
    }

    // Buscar cuota en cache para saber IdVenta
    const cuota = cuotasCache.find(x => x.IdCuota === idCuota);
    if (!cuota) {
        VC.toast("Cuota no encontrada", "danger");
        return;
    }

    const payload = {
        IdVenta: cuota.IdVenta,
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
            VC.toast(resp.message || "Error al registrar pago", "danger");
            return;
        }

        VC.toast("Pago registrado", "success");
        VC.closeModal("mdCobro");

        // Recargar tabla
        await VC.cargarTabla();

        // Si el acordeón estaba abierto para esa venta, recargar detalle
        if (ventaAcordeonAbierta === cuota.IdVenta) {
            await VC.cargarDetalleVenta(cuota.IdVenta);
        }

    } catch (e) {
        console.error("Error registrar pago", e);
        VC.toast("Error al registrar pago", "danger");
    }
};


/* ===========================================================
   MODAL AJUSTE
=========================================================== */

VC.abrirAjuste = function (idCuota) {
    $("#aj_cuotaId").val(idCuota);
    $("#aj_recargo").val("");
    $("#aj_descuento").val("");

    VC.openModal("mdAjuste");
};

VC.confirmarAjuste = async function () {

    const idCuota = Number($("#aj_cuotaId").val());
    if (!idCuota) {
        VC.toast("Cuota inválida", "danger");
        return;
    }

    const cuota = cuotasCache.find(x => x.IdCuota === idCuota);
    if (!cuota) {
        VC.toast("No se encontró la cuota", "danger");
        return;
    }

    const original = Number(cuota.MontoOriginal || 0);

    const rVal = VC.parseMoney($("#aj_recargo").val());
    const rTipo = $("#aj_recargoTipo").val();

    const dVal = VC.parseMoney($("#aj_descuento").val());
    const dTipo = $("#aj_descuentoTipo").val();

    const recargo = rTipo === "%" ? (original * rVal / 100) : rVal;
    const descuento = dTipo === "%" ? (original * dVal / 100) : dVal;

    try {
        const resp = await $.post("/Ventas_Electrodomesticos/ActualizarRecargoDescuentoCuota", {
            idCuota,
            recargo,
            descuento
        });

        if (!resp.success) {
            VC.toast(resp.message || "Error al ajustar", "danger");
            return;
        }

        VC.toast("Ajuste aplicado", "success");
        VC.closeModal("mdAjuste");

        await VC.cargarTabla();

        if (ventaAcordeonAbierta === cuota.IdVenta)
            await VC.cargarDetalleVenta(cuota.IdVenta);

    } catch (e) {
        console.error(e);
        VC.toast("Error ajustando cuota", "danger");
    }
};


/* ===========================================================
   HISTORIAL DE UNA CUOTA
=========================================================== */

VC.verHistorial = async function (idCuota, idVenta) {
    try {
        const resp = await $.getJSON("/Ventas_Electrodomesticos/GetDetalleVenta", { idVenta });

        if (!resp.success) {
            VC.toast(resp.message || "Error obteniendo historial", "danger");
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
                        <td class="text-end">${VC.fmt(VC.extraerNumero(h.ValorNuevo))}</td>
                        <td>${h.Observacion || ""}</td>
                    </tr>
                `);
            });
        }

        VC.openModal("mdHistorial");

    } catch (e) {
        console.error("Error historial cuota", e);
        VC.toast("Error obteniendo historial", "danger");
    }
};

window.VC = VC;

$(document).on("click", ".ajTipo", function () {

    const target = $(this).data("target");   // id del hidden
    const value = $(this).data("value");     // "%" o "$"

    // Grupo de botones
    const group = $(this).parent();

    // Activar visualmente este botón y desactivar el resto
    group.find(".ajTipo").removeClass("active");
    $(this).addClass("active");

    // Escribir tipo en el hidden correspondiente
    $("#" + target).val(value);
});