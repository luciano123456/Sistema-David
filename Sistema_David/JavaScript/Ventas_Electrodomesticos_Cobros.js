/* ===========================================================
 * Ventas_Electrodomesticos_Cobros.js — v800.1 FINAL
 * Sin cambios estructurales, solo integrando partials
 * =========================================================== */

let VC = {};
let tabla = null;
let cuotasCache = [];
let ventaSeleccionada = null;
let ventaAcordeonAbierta = null;

/* ===========================================================
   HELPERS
=========================================================== */

VC.turnoMT = function (t) {
    if (!t) return "";
    const x = String(t).toLowerCase();
    if (x.startsWith("m")) return "M";
    if (x.startsWith("t")) return "T";
    return t;
};

VC.renderDireccion = function (_, __, row) {
    const dir = row.ClienteDireccion || "—";
    const lat = row.ClienteLatitud;
    const lng = row.ClienteLongitud;

    if (!lat || !lng) return `<span>${dir}</span>`;

    const url = `https://www.google.com/maps?q=${lat},${lng}`;

    return `
        <div class="d-flex align-items-center justify-content-between gap-2">
            <span class="text-truncate" style="max-width:220px">${dir}</span>
            <a class="btn btn-sm btn-outline-light"
               href="${url}" target="_blank" title="Ver en mapa">
                <i class="fa fa-map-marker"></i>
            </a>
        </div>
    `;
};


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

    const hoy = moment().format("YYYY-MM-DD");
    $("#f_desde").val(hoy);
    $("#f_hasta").val(hoy);

    await VC.cargarCombos();
    VC.initEventos();
    await VC.cargarTabla();
});

VC.initEventos = function () {

    // Mostrar / Ocultar filtros
    $("#btnToggleFiltros").on("click", () => {
        const form = $("#formFiltros");
        form.toggleClass("d-none");
        $("#iconFiltros").toggleClass("fa-chevron-down fa-chevron-up");
    });

};

/* ===========================================================
   SELECTS CLIENTES / VENDEDORES
=========================================================== */

VC.cargarCombos = async function () {

    /* CLIENTES */
    try {
        const resp = await $.getJSON("/Clientes/GetClientesElectrodomesticos");
        const ddl = $("#f_cliente").empty();
        ddl.append(`<option value="">Todos</option>`);
        (resp.data || []).forEach(c => {
            ddl.append(`<option value="${c.Id}">${c.Nombre} ${c.Apellido}</option>`);
        });
    } catch (e) {
        console.error("Error cargando clientes", e);
    }

    /* VENDEDORES/COBRADORES */
    try {
        const resp = await $.getJSON("/Usuarios/ListarCobradores");
        const ddl = $("#f_vendedor").empty();
        ddl.append(`<option value="">Todos</option>`);
        (resp.data || []).forEach(v => {
            ddl.append(`<option value="${v.Id}">${v.Nombre}</option>`);
        });
    } catch (e) {
        console.error("Error cargando cobradores", e);
    }

    /* =========================
   ZONAS
========================= */
    try {
        const resp = await $.getJSON("/Clientes/ListarZonas"); // endpoint real
        const ddl = $("#f_zona").empty();
        ddl.append(`<option value="">Todas</option>`);
        (resp.data || []).forEach(z => {
            ddl.append(`<option value="${z.Id}">${z.Nombre}</option>`);
        });
    } catch (e) {
        console.error("Error cargando zonas", e);
    }

    $("#f_zona").select2({ width: "100%", allowClear: true, placeholder: "Todas" });


    $("#f_cliente").select2({ width: "100%", allowClear: true, placeholder: "Todos" });
    $("#f_vendedor").select2({ width: "100%", allowClear: true, placeholder: "Todos" });
};

/* ===========================================================
   FILTROS
=========================================================== */

VC.aplicarFiltros = () => VC.cargarTabla();

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
   TABLA PRINCIPAL
=========================================================== */

VC.cargarTabla = async function () {

    let respFiltrado = null;
    let respVencidas = null;

    const paramsBase = {
        idCliente: $("#f_cliente").val() || null,
        idVendedor: $("#f_vendedor").val() || null,

        // 🔥 NUEVOS
        idZona: $("#f_zona").val() || null,
        turno: $("#f_turno").val() || null,
        franjaHoraria: $("#f_franja").val() || null
    };


    try {
        // 1) Lo que pidió el usuario (con fechas y estado si aplica)
        respFiltrado = await $.getJSON(
            "/Ventas_Electrodomesticos/ListarCuotasACobrar",
            {
                fechaDesde: $("#f_desde").val() || null,
                fechaHasta: $("#f_hasta").val() || null,
                idCliente: paramsBase.idCliente,
                idVendedor: paramsBase.idVendedor,
                estado: $("#f_estado").val() || null,

                // 🔥 NUEVOS
                idZona: paramsBase.idZona,
                turno: paramsBase.turno,
                franjaHoraria: paramsBase.franjaHoraria
            }
        );


        // 2) VENCIDAS SI O SI (sin filtro de fecha) -> esto es lo que me pediste
        respVencidas = await $.getJSON("/Ventas_Electrodomesticos/ListarCuotasACobrar", {
            fechaDesde: $("#f_desde").val() || null,
            fechaHasta: $("#f_hasta").val() || null,
            idCliente: paramsBase.idCliente,
            idVendedor: paramsBase.idVendedor,
            idZona: paramsBase.idZona,
            turno: paramsBase.turno,
            franjaHoraria: paramsBase.franjaHoraria,
            estado: "Vencida"
        });

        await VC.cargarCobrosPendientes();

    } catch (e) {
        console.error(e);
        VC.toast("Error cargando cuotas", "danger");
        return;
    }

    // Unificar sin duplicados (IdCuota) y fuera Pagadas
    const map = new Map();
    const a = (respFiltrado?.data || []);
    const b = (respVencidas?.data || []);

    [...a, ...b].forEach(x => {
        if (!x) return;
        if (x.Estado === "Pagada") return;
        map.set(x.IdCuota, x);
    });

    cuotasCache = Array.from(map.values());

    // (opcional visual) setear atraso calculado en el objeto para debug/uso futuro
    cuotasCache.forEach(c => {
        c.__DiasAtraso = calcularDiasAtraso(c.FechaVencimiento);
    });

    if (tabla) {
        tabla.clear().rows.add(cuotasCache).draw();
        VC.reabrirAcordeon();
        return;
    }

    tabla = $("#vc_tabla").DataTable({
        data: cuotasCache,
        pageLength: 50,
        responsive: false,   // 🔥 CLAVE
        scrollX: true,       // 🔥 permite scroll horizontal en móvil
        language: { url: "//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json" },

        // NO toco tus columnas ni el HTML. Solo agrego el coloreo por atraso.
        rowCallback: function (row, d) {

            // limpiar clases previas
            $(row)
                .removeClass("fila-atrasada fila-atrasada-amarilla fila-atrasada-naranja fila-atrasada-roja");

            const dias = calcularDiasAtraso(d.FechaVencimiento);

            if (dias > 0) {
                $(row).addClass("fila-atrasada");

                if (dias >= 15)
                    $(row).addClass("fila-atrasada-roja");
                else if (dias >= 10)
                    $(row).addClass("fila-atrasada-naranja");
                else
                    $(row).addClass("fila-atrasada-amarilla");
            }

            if (ventaSeleccionada && d.IdVenta === ventaSeleccionada.IdVenta) {
                $(row).addClass("venta-seleccionada");
            }
        },

        // Orden “natural”: primero vencimiento (más viejo primero). Si querés “atrasadas arriba” sin agregar columna,
        // se puede, pero ahí sí hay que meter columna oculta o plugin de orden.
        order: [[7, "asc"], [1, "asc"]],

        columns: [

            /* Columna 0 - Acordeón */
            {
                data: null, className: "details-control text-center", orderable: false,
                width: "40px",
                render: () => `
                    <button class="btn btn-link p-0 text-accent btn-row-detail" title="Ver detalle venta">
                        <i class="fa fa-chevron-down"></i>
                    </button>`
            },

            { data: "NumeroCuota" },

            {
                data: "FechaCobro",
                render: d => {
                    if (!d) return "";

                    const dias = calcularDiasAtraso(d);
                    const fecha = moment(d).format("DD/MM/YYYY");

                    if (dias <= 0) {
                        return `<span>${fecha}</span>`;
                    }

                    return `
            <div class="text-danger fw-bold">
                ${fecha}
                <div class="small opacity-75">
                    ${dias} día${dias > 1 ? "s" : ""} de atraso
                </div>
            </div>`;
                }
            },

            { data: "ClienteNombre" },
            { data: "VendedorNombre" },

            { data: "ZonaNombre", title: "Zona" },

            {
                data: null,
                title: "Dirección",
                orderable: false,
                render: VC.renderDireccion
            },

            {
                data: "Turno",
                title: "Turno",
                className: "text-center",
                render: d => VC.turnoMT(d)
            },

            { data: "FranjaHoraria", title: "Franja" },

            {
                data: "FechaVencimiento",
                render: d => {
                    if (!d) return "";

                    const dias = calcularDiasAtraso(d);
                    const fecha = moment(d).format("DD/MM/YYYY");

                    if (dias <= 0) {
                        return `<span>${fecha}</span>`;
                    }

                    return `
            <div class="text-danger fw-bold">
                ${fecha}
                <div class="small opacity-75">
                    ${dias} día${dias > 1 ? "s" : ""} de atraso
                </div>
            </div>`;
                }
            },


            { data: "TotalCuota", render: VC.fmt },
            { data: "MontoPagado", render: VC.fmt },
            { data: "MontoRestante", render: VC.fmt },

            {
                data: "Estado",
                render: (st, _, row) => {

                    const dias = calcularDiasAtraso(row.FechaVencimiento);

                    if (dias > 0) {
                        let cls = "bg-warning text-dark";

                        if (dias >= 15) cls = "bg-danger";
                        else if (dias >= 10) cls = "bg-orange";

                        return `
                <span class="badge ${cls}">
                    Vencida · ${dias} día${dias > 1 ? "s" : ""}
                </span>`;
                    }

                    return `
            <span class="badge bg-success">
                Al día
            </span>`;
                }
            },

            {
                data: null, className: "text-center", orderable: false,
                render: d => `<div class="btn-group">

    <button class="btn btn-accion btn-cobrar me-1"
        onclick="VC.abrirCobro(${d.IdCuota}, ${d.IdVenta}, ${d.MontoRestante})"
        title="Cobrar">
        <i class="fa fa-money"></i>
    </button>

    <button class="btn btn-accion btn-ajuste me-1"
        onclick="VC.abrirAjuste( ${d.IdVenta}, ${d.IdCuota})"
        title="Ajustar">
        <i class="fa fa-bolt"></i>
    </button>

    <button class="btn btn-accion btn-historial me-1"
        onclick="VC.abrirHistorialPartial(${d.IdVenta}, ${d.IdCuota})"
        title="Historial">
        <i class="fa fa-eye"></i>
    </button>

    <!-- 🔥 EXPORTAR PDF -->
  <button class="btn btn-accion btn-pdf"
    onclick="VC.exportarVentaPdf(${d.IdVenta})"
    title="Exportar PDF">
    <i class="fa fa-file-pdf-o"></i>
</button>


</div>
`
            }
        ]
    });

    /* Click acordeón */
    $("#vc_tabla tbody").on("click", "button.btn-row-detail", async function (e) {

        e.stopPropagation();

        const tr = $(this).closest("tr");
        const row = tabla.row(tr);
        const data = row.data();
        const icon = $(this).find("i");

        if (!data) return;

        if (row.child.isShown()) {
            row.child.hide();
            tr.removeClass("shown venta-seleccionada");
            icon.removeClass("fa-chevron-up").addClass("fa-chevron-down");
            ventaAcordeonAbierta = null;
            ventaSeleccionada = null;
            return;
        }

        tabla.rows().every(function () {
            if (this.child.isShown()) {
                this.child.hide();
                $(this.node()).removeClass("shown venta-seleccionada");
                $(this.node()).find("button.btn-row-detail i")
                    .removeClass("fa-chevron-up").addClass("fa-chevron-down");
            }
        });

        row.child(VC.formarAcordeonVenta(data)).show();
        tr.addClass("shown venta-seleccionada");
        icon.removeClass("fa-chevron-down").addClass("fa-chevron-up");

        ventaAcordeonAbierta = data.IdVenta;

        await VC.cargarDetalleVenta(data.IdVenta);
    });
};

/* ===========================================================
   REABRIR ACORDEÓN TRAS RECARGA
=========================================================== */

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
   ACORDEÓN DETALLE - PLANTILLA HTML
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
    <button class="accordion-button collapsed js-fin-toggle"
            type="button"
            aria-expanded="false"
            data-idventa="${idV}">
        <i class="fa fa-check-circle text-success me-2"></i>
        Cuotas finalizadas
        <span class="badge bg-secondary ms-2" id="qFin_${idV}">0</span>
    </button>
</h2>

<div id="colFin_${idV}"
     class="accordion-collapse"
     style="display:none">

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
   DETALLE VENTA
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

    if (!v.Items?.length) {
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

    if (!v.Cuotas?.length) {
        tbPend.append(`<tr><td colspan="9" class="text-center text-muted">Sin cuotas</td></tr>`);
        lblFin.text("0");
        return;
    }

    let countFin = 0;
    const hoy = moment().startOf("day");

    v.Cuotas.forEach(c => {

        const total = (c.MontoOriginal || 0) + (c.MontoRecargos || 0) - (c.MontoDescuentos || 0);
        const fechaVto = moment(c.FechaVencimiento).startOf("day");
        const diasAtraso = hoy.diff(fechaVto, "days");

        const estaVencida = diasAtraso > 0 && c.Estado !== "Pagada";
        const venceHoy = diasAtraso === 0 && c.Estado !== "Pagada" && Number(c.MontoRestante || 0) > 0.0001;

        /* =======================
           CUOTAS PAGADAS
        ======================= */
        if (c.Estado === "Pagada") {
            countFin++;
            tbPag.append(`
                <tr>
                    <td>${c.NumeroCuota}</td>
                    <td>${fechaVto.format("DD/MM/YYYY")}</td>
                    <td class="text-end">${VC.fmt(total)}</td>
                    <td class="text-end">${VC.fmt(c.MontoPagado)}</td>
                    <td class="text-center">
                        <button class="btn btn-secondary btn-sm"
                            onclick="VC.abrirHistorialPartial(${v.IdVenta}, ${c.Id})">
                            <i class="fa fa-clock-o"></i>
                        </button>
                    </td>
                </tr>
            `);
            return;
        }

        /* =======================
           ESTILOS / ESTADO
        ======================= */

        let rowClass = "";
        let vtoClass = "";
        let estadoHtml = `<span class="badge bg-warning text-dark">Pendiente</span>`;

        if (estaVencida) {
            rowClass = "fila-atrasada";
            vtoClass = "text-danger fw-bold";
            estadoHtml = `
                <span class="badge bg-danger">
                    Vencida · ${diasAtraso} día${diasAtraso !== 1 ? "s" : ""}
                </span>
            `;
        }
        else if (venceHoy) {
            rowClass = "fila-aldia";
            vtoClass = "text-success fw-bold";
            estadoHtml = `<span class="badge bg-success">Vence hoy</span>`;
        }

        tbPend.append(`
            <tr class="${rowClass}">
                <td>${c.NumeroCuota}</td>

                <td class="${vtoClass}">
                    ${fechaVto.format("DD/MM/YYYY")}
                    ${estaVencida
                ? `<div class="small text-danger">${diasAtraso} días de atraso</div>`
                : (venceHoy ? `<div class="small text-success">Vence hoy</div>` : ``)}
                </td>

                <td class="text-end">${VC.fmt(c.MontoOriginal)}</td>
                <td class="text-end">${VC.fmt(c.MontoRecargos)}</td>
                <td class="text-end">${VC.fmt(c.MontoDescuentos)}</td>
                <td class="text-end">${VC.fmt(c.MontoPagado)}</td>
                <td class="text-end">${VC.fmt(c.MontoRestante)}</td>

                <td>${estadoHtml}</td>

                <td class="text-center">
                    <div class="btn-group">

                        <button class="btn btn-accion btn-cobrar me-1"
                            onclick="VC.abrirCobro(${c.Id}, ${v.IdVenta}, ${c.MontoRestante})"
                            title="Cobrar">
                            <i class="fa fa-money"></i>
                        </button>

                        <button class="btn btn-accion btn-ajuste me-1"
                            onclick="VC.abrirAjuste( ${v.IdVenta}, ${c.Id})"
                            title="Ajustar">
                            <i class="fa fa-bolt"></i>
                        </button>

                     <button class="btn btn-accion btn-historial"
    onclick="VC.abrirHistorialPartial(${v.IdVenta}, ${c.Id})"
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
        tbPag.append(`
            <tr>
                <td colspan="5" class="text-center text-muted">
                    Sin cuotas finalizadas
                </td>
            </tr>
        `);
    }
};

/* ===========================================================
   COBRO ADELANTADO
=========================================================== */

VC.puedeCobrarCuota = function (ventaDet, idCuota) {

    if (!ventaDet?.Cuotas) return false;

    const cuotas = ventaDet.Cuotas;
    const actual = cuotas.find(c => c.Id === idCuota);
    if (!actual) return false;

    const numActual = Number(actual.NumeroCuota);

    const prevImpagas = cuotas.some(c =>
        c.NumeroCuota < numActual && Number(c.MontoRestante) > 0.0001
    );

    return !prevImpagas;
};

/* ===========================================================
   MODAL COBRO
=========================================================== */



/* ===========================================================
   MODAL AJUSTE
=========================================================== */

/* ===========================================================
   HISTORIAL DE UNA CUOTA
=========================================================== */

VC.abrirCobro = function (idCuota, idVenta) {
    window.abrirModalCobro(idVenta, idCuota);
};

VC.abrirAjuste = function (ventaAcordeonAbierta, idCuota) {
    window.abrirAjusteDesdeCobros(ventaAcordeonAbierta, idCuota);
};



/* ===========================================================
   TOGGLES % / $
=========================================================== */

$(document).on("click", ".ajTipo", function () {

    const target = $(this).data("target");
    const value = $(this).data("value");

    const group = $(this).parent();
    group.find(".ajTipo").removeClass("active");

    $(this).addClass("active");

    $("#" + target).val(value);
});

/* ===========================================================
   EXPORT API
=========================================================== */

window.VC = VC;

/* ===========================================================
   ATRASO (helper) - lo agrego porque si falta te rompe
=========================================================== */
function calcularDiasAtraso(fechaVto) {
    if (!fechaVto) return 0;

    // 1) Hoy a 00:00 local
    const hoy = moment().startOf("day");

    // 2) Parse robusto
    let f = null;

    // Caso ASP.NET: "/Date(176...)/"
    if (typeof fechaVto === "string") {
        const m = fechaVto.match(/\/Date\((\d+)\)\//);
        if (m && m[1]) {
            f = moment(Number(m[1])).startOf("day");
        }
    }

    // Caso ISO "2025-12-08T00:00:00"
    if (!f || !f.isValid()) {
        const mi = moment(fechaVto, moment.ISO_8601, true);
        if (mi.isValid()) f = mi.startOf("day");
    }

    // Caso string "DD/MM/YYYY" o "DD/MM/YYYY HH:mm:ss"
    if (!f || !f.isValid()) {
        const mdmy = moment(fechaVto, ["DD/MM/YYYY", "DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY HH:mm"], true);
        if (mdmy.isValid()) f = mdmy.startOf("day");
    }

    // Caso Date real
    if ((!f || !f.isValid()) && fechaVto instanceof Date) {
        f = moment(fechaVto).startOf("day");
    }

    // Si sigue inválida, NO mientas con "Al día": devolvé 0 pero logueá
    if (!f || !f.isValid()) {
        console.warn("FechaVencimiento inválida:", fechaVto);
        return 0;
    }

    const diff = hoy.diff(f, "days");
    return diff > 0 ? diff : 0;
}





VC.abrirHistorialPartial = function (idVenta, idCuota) {

    if (typeof window.abrirHistorialDesdeCobros !== "function") {
        VC.toast("Historial no disponible", "danger");
        return;
    }

    window.abrirHistorialDesdeCobros(idVenta, idCuota);
};


VC.exportarVentaPdf = function (idVenta) {

    if (!idVenta || idVenta <= 0) {
        VC.toast("Venta inválida", "danger");
        return;
    }

    if (typeof window.exportarVentaPDF !== "function") {
        VC.toast("Exportación PDF no disponible", "danger");
        return;
    }

    // Reutilizamos EXACTAMENTE el mismo exportador
    window.exportarVentaPDF(idVenta);
};


/* ===========================================================
ACORDEÓN FINALIZADAS - MISMO COMPORTAMIENTO QUE NUEVOMODIF
=========================================================== */
$(document).on("click", ".js-fin-toggle", function (e) {
    e.preventDefault();

    const btn = $(this);
    const idVenta = btn.data("idventa");
    const panel = $(`#colFin_${idVenta}`);

    if (!panel.length) return;

    const abierto = panel.is(":visible");

    if (abierto) {
        // 🔽 CERRAR
        panel.slideUp(180);
        btn.addClass("collapsed").attr("aria-expanded", "false");
    } else {
        // 🔼 ABRIR
        panel.slideDown(180);
        btn.removeClass("collapsed").attr("aria-expanded", "true");
    }
});


VC.cargarCobrosPendientes = async function () {

    const resp = await $.getJSON(
        "/Ventas_Electrodomesticos/ListarCobrosPendientes",
        {
            idCliente: $("#f_cliente").val() || null,
            idVendedor: $("#f_vendedor").val() || null
        }
    );

    $("#vc_tabla_pendientes").DataTable({
        destroy: true,
        data: resp.data || [],
        paging: false,
        searching: false,
        info: false,

        columns: [

            /* Columna 0 - Acordeón */
            {
                data: null, className: "details-control text-center", orderable: false,
                width: "40px",
                render: () => `
                    <button class="btn btn-link p-0 text-accent btn-row-detail" title="Ver detalle venta">
                        <i class="fa fa-chevron-down"></i>
                    </button>`
            },

            { data: "NumeroCuota" },

            {
                data: "FechaCobro",
                render: d => {
                    if (!d) return "";

                    const dias = calcularDiasAtraso(d);
                    const fecha = moment(d).format("DD/MM/YYYY");

                    if (dias <= 0) {
                        return `<span>${fecha}</span>`;
                    }

                    return `
            <div class="text-danger fw-bold">
                ${fecha}
                <div class="small opacity-75">
                    ${dias} día${dias > 1 ? "s" : ""} de atraso
                </div>
            </div>`;
                }
            },

            { data: "ClienteNombre" },
            { data: "VendedorNombre" },

            { data: "ZonaNombre", title: "Zona" },

            {
                data: null,
                title: "Dirección",
                orderable: false,
                render: VC.renderDireccion
            },

            {
                data: "Turno",
                title: "Turno",
                className: "text-center",
                render: d => VC.turnoMT(d)
            },

            { data: "FranjaHoraria", title: "Franja" },

            {
                data: "FechaVencimiento",
                render: d => {
                    if (!d) return "";

                    const dias = calcularDiasAtraso(d);
                    const fecha = moment(d).format("DD/MM/YYYY");

                    if (dias <= 0) {
                        return `<span>${fecha}</span>`;
                    }

                    return `
            <div class="text-danger fw-bold">
                ${fecha}
                <div class="small opacity-75">
                    ${dias} día${dias > 1 ? "s" : ""} de atraso
                </div>
            </div>`;
                }
            },


            { data: "TotalCuota", render: VC.fmt },
            { data: "MontoPagado", render: VC.fmt },
            { data: "MontoRestante", render: VC.fmt },

            {
                data: "Estado",
                render: (st, _, row) => {

                    const dias = calcularDiasAtraso(row.FechaVencimiento);

                    if (dias > 0) {
                        let cls = "bg-warning text-dark";

                        if (dias >= 15) cls = "bg-danger";
                        else if (dias >= 10) cls = "bg-orange";

                        return `
                <span class="badge ${cls}">
                    Vencida · ${dias} día${dias > 1 ? "s" : ""}
                </span>`;
                    }

                    return `
            <span class="badge bg-success">
                Al día
            </span>`;
                }
            },
            {
                data: null,
                className: "text-center",
                render: d => `
<div class="btn-group">

    <button class="btn btn-accion btn-cobrar me-1"
        onclick="VC.abrirCobro(${d.IdCuota}, ${d.IdVenta})"
        title="Cobrar">
        <i class="fa fa-money"></i>
    </button>

    <button class="btn btn-accion btn-ajuste me-1"
        onclick="VC.abrirAjuste(${d.IdVenta}, ${d.IdCuota})"
        title="Ajustar">
        <i class="fa fa-bolt"></i>
    </button>

    <button class="btn btn-accion btn-historial me-1"
        onclick="VC.abrirHistorialPartial(${d.IdVenta}, ${d.IdCuota})"
        title="Historial">
        <i class="fa fa-eye"></i>
    </button>

    <!-- ✅ MARCAR COBRO REALIZADO -->
    <button class="btn btn-accion btn-success"
        onclick="VC.resolverCobroPendiente(${d.IdCuota})"
        title="Aceptar cambio de fecha">
        <i class="fa fa-check"></i>
    </button>

</div>
`

            }
        ]
    });
};


VC.resolverCobroPendiente = async function (idCuota) {

    if (!confirm("¿Marcar este cobro pendiente como resuelto?")) return;

    const resp = await $.post(
        "/Ventas_Electrodomesticos/MarcarCobroPendienteResuelto",
        { idCuota }
    );

    if (resp.success) {
        VC.toast("Cobro pendiente resuelto", "success");
        VC.cargarTabla();
        VC.cargarCobrosPendientes();
    } else {
        VC.toast(resp.message || "Error", "danger");
    }
};


function rangeHours(a, b) {
    const out = [];
    for (let i = a; i < b; i++) {
        out.push(
            `${String(i).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
        );
    }
    return out;
}

$(document).on("change", "#f_turno", function () {
    const t = $("#f_turno").val();
    const franjas =
        t === "mañana" ? rangeHours(8, 15)
            : t === "tarde" ? rangeHours(15, 21)
                : [];

    const ddl = $("#f_franja").empty();
    ddl.append(`<option value="">Todas</option>`);
    franjas.forEach(h => ddl.append(`<option value="${h}">${h}</option>`));
});
