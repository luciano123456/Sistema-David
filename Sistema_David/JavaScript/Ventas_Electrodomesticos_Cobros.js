/* ===========================================================
 * Ventas_Electrodomesticos_Cobros.js — v800.1 FINAL
 * Sin cambios estructurales, solo integrando partials
 * =========================================================== */

let VC = {};
let tabla = null;
let cuotasCache = [];
let ventaSeleccionada = null;
let ventaAcordeonAbierta = null;

let ventasSeleccionadas = new Set();
let cobradoresCache = [];
let ventaClickeadaId = null; // igual que Historial: fila seleccionada por click



let userSession = JSON.parse(localStorage.getItem('usuario') || '{}');

/* ===========================================================
   HELPERS
=========================================================== */

(function () {
    if (document.getElementById("vcCssSel")) return;

    const st = document.createElement("style");
    st.id = "vcCssSel";
    st.textContent = `
        /* ===============================
           COBROS — SELECCIÓN (igual Historial)
        ================================ */

        /* cursor igual historial en tabla principal */
        #vc_tabla tbody tr { cursor: pointer; }
        #vc_tabla tbody tr.child { cursor: default; }

        /* selección single (clic en fila) */
        #vc_tabla tbody tr.row-selected {
            outline: 2px solid rgba(88,166,255,.55);
            background: rgba(88,166,255, .5) !important;
        }

        /* tu multi-select (checkbox) se mantiene tal cual */
        #vc_tabla tbody tr.venta-multi-sel {
            outline: 2px solid rgba(88,166,255,.45);
            background: rgba(88,166,255,.08) !important;
        }

        /* checkbox */
        .vc-chk { transform: scale(1.1); cursor: pointer; }

        /* ===============================
           ACORDEÓN — selección de filas en tablas internas (igual Historial)
           Nota: cursor pointer y row-selected por tbody dentro de accordion-sub
        ================================ */
        .accordion-sub table tbody tr { cursor: pointer; }
        .accordion-sub table tbody tr.row-selected {
            outline: 2px solid rgba(88,166,255,.55);
            background: rgba(88,166,255, 1) !important;
        }
    `;
    document.head.appendChild(st);
})();



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

    if (userSession.IdRol == 1 || userSession.IdRol == 4) {
        document.getElementById("divCobrosPendientes").removeAttribute("hidden");
        document.getElementById("formFiltros").removeAttribute("hidden");
        document.getElementById("btnToggleFiltros").removeAttribute("hidden");
        document.getElementById("btnCuentaBancaria").style.display = "block";
    }

    try { moment.locale("es"); } catch { }

    const hoy = moment().format("YYYY-MM-DD");
    $("#f_desde").val(hoy);
    $("#f_hasta").val(hoy);

    await VC.cargarCombos();
    VC.initEventos();
    await VC.cargarTabla();

    habilitarSeleccionFilasCuotasCobros();
});

VC.initEventos = function () {

    // Mostrar / Ocultar filtros
    $("#btnToggleFiltros").off("click.vcFiltros").on("click.vcFiltros", () => {
        const form = $("#formFiltros");
        form.toggleClass("d-none");
        $("#iconFiltros").toggleClass("fa-chevron-down fa-chevron-up");
    });

    // FAB asignar cobrador
    $("#fabAsignarCobrador").off("click.vcFab").on("click.vcFab", function () {
        VC.abrirAsignarCobrador();
    });

    // Confirmar asignación (botón del modal)
    $("#btnConfirmarAsignarCobrador").off("click.vcConf").on("click.vcConf", function () {
        VC.confirmarAsignarCobrador();
    });

    // ✅ Toggle individual (checkbox fila)
    $(document).off("change.vcRowCheck").on("change.vcRowCheck", ".vc-row-check", function () {
        const idVenta = Number(this.dataset.idventa || 0);
        if (!idVenta) return;

        if (this.checked) ventasSeleccionadas.add(idVenta);
        else ventasSeleccionadas.delete(idVenta);

        VC.refrescarSeleccionUI();
    });

    // ✅ Seleccionar todos (checkbox header)
    $(document).off("change.vcAllCheck").on("change.vcAllCheck", "#vc_chk_all", function () {
        const sel = this.checked;

        if (!tabla) return;

        tabla.rows({ search: "applied" }).every(function () {
            const idV = Number(this.data()?.IdVenta || 0);
            if (!idV) return;

            if (sel) ventasSeleccionadas.add(idV);
            else ventasSeleccionadas.delete(idV);
        });

        VC.refrescarSeleccionUI();
    });

};

/* ===========================================================
   SELECTS CLIENTES / VENDEDORES
=========================================================== */

VC.refrescarSeleccionUI = function () {

    // 1) marcar filas y checks
    if (tabla) {
        $("#vc_tabla tbody tr").each(function () {
            const r = tabla.row(this);
            const d = r.data();
            const idV = Number(d?.IdVenta || 0);

            const checked = ventasSeleccionadas.has(idV);

            $(this).toggleClass("venta-multi-sel", checked);

            // check DOM (fila)
            $(this).find("input.vc-row-check").prop("checked", checked);
        });

        // 2) setear vc_chk_all según estado (solo visibles/filtradas)
        let totalVisibles = 0;
        let totalSel = 0;

        tabla.rows({ search: "applied" }).every(function () {
            const idV = Number(this.data()?.IdVenta || 0);
            if (!idV) return;

            totalVisibles++;
            if (ventasSeleccionadas.has(idV)) totalSel++;
        });

        const chkAll = document.getElementById("vc_chk_all");
        if (chkAll) {
            chkAll.indeterminate = totalSel > 0 && totalSel < totalVisibles;
            chkAll.checked = totalVisibles > 0 && totalSel === totalVisibles;
        }
    }

    // 3) mostrar/ocultar botón asignar cobrador
    VC.refrescarFabAsignar();
};

VC.refrescarFabAsignar = function () {
    const divBtn = document.getElementById("btnAsignarCobrador");
    const btn = document.getElementById("fabAsignarCobrador");
    if (!divBtn || !btn) return;

    const cant = ventasSeleccionadas ? ventasSeleccionadas.size : 0;

    if (cant > 0) {
        divBtn.style.display = "block";

        // Pintar estilo tipo "FAB pro" con icono + badge (sin tocar el HTML del Razor)
        btn.innerHTML = `
            <span class="vc-fab-icon"><i class="fa fa-user-plus"></i></span>
            <span>Asignar cobrador</span>
            <span class="vc-fab-badge">${cant}</span>
        `;
    } else {
        divBtn.style.display = "none";
    }
};


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

    /* VENDEDORES/COBRADORES */
    try {
        const resp = await $.getJSON("/Usuarios/ListarCobradoresElectro");
        const ddl = $("#f_cobrador").empty();
        ddl.append(`<option value="">Todos</option>`);
        (resp.data || []).forEach(v => {
            ddl.append(`<option value="${v.Id}">${v.Usuario} (${v.TotalCobranzas})</option>`);
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
    $("#f_cobrador").select2({ width: "100%", allowClear: true, placeholder: "Todos" });
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

    const params = {
        fechaDesde: $("#f_desde").val() || null,
        fechaHasta: $("#f_hasta").val() || null,
        idCliente: $("#f_cliente").val() || null,
        idVendedor: $("#f_vendedor").val() || null,
        estado: $("#f_estado").val() || null,

        // 🔥 nuevos
        idZona: $("#f_zona").val() || null,
        turno: $("#f_turno").val() || null,
        franjaHoraria: $("#f_franja").val() || null
    };

    try {
        const resp = await $.getJSON(
            "/Ventas_Electrodomesticos/ListarCuotasACobrar",
            params
        );

        // mismas cuotas que antes
        const cuotas = (resp?.data || []).filter(x => x && x.Estado !== "Pagada");

        // agrupar por venta manteniendo columnas
        cuotasCache = agruparCobrosPorVentaManteniendoColumnas(cuotas);

        cuotasCache.forEach(c => {
            c.__DiasAtraso = calcularDiasAtraso(c.FechaVencimiento);
        });

        await VC.cargarCobrosPendientes();
        await VC.cargarTransferenciasPendientes();

    } catch (e) {
        console.error(e);
        VC.toast("Error cargando cuotas", "danger");
        return;
    }

    // si ya existe tabla
    if (tabla) {
        tabla.clear().rows.add(cuotasCache).draw();
        VC.reabrirAcordeon();
        VC.refrescarSeleccionUI();
        return;
    }

    tabla = $("#vc_tabla").DataTable({
        data: cuotasCache,
        pageLength: 50,
        responsive: false,
        scrollX: true,
        language: { url: "//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json" },

        rowCallback: function (row, d) {

            // 🔥 reset clases (incluye row-selected)
            $(row).removeClass(
                "fila-atrasada fila-atrasada-amarilla fila-atrasada-naranja fila-atrasada-roja row-selected"
            );

            const dias = calcularDiasAtraso(d.FechaVencimiento);

            if (dias > 0) {
                $(row).addClass("fila-atrasada");

                if (dias >= 15) $(row).addClass("fila-atrasada-roja");
                else if (dias >= 10) $(row).addClass("fila-atrasada-naranja");
                else $(row).addClass("fila-atrasada-amarilla");
            }

            // ✅ selección single visual (igual Historial)
            if (ventaClickeadaId != null && Number(d.IdVenta) === Number(ventaClickeadaId)) {
                $(row).addClass("row-selected");
            }

            // ✅ multi-select por checkbox (TU LÓGICA, intacta)
            const sel = ventasSeleccionadas.has(Number(d?.IdVenta || 0));
            $(row).toggleClass("venta-multi-sel", sel);

            if (ventaSeleccionada && d.IdVenta === ventaSeleccionada.IdVenta) {
                $(row).addClass("venta-seleccionada");
            }
        },

        order: [[7, "asc"], [1, "asc"]],

        columns: [

            // Col 0: acordeón
            {
                data: null,
                className: "details-control text-center",
                orderable: false,
                width: "40px",
                render: () => `
                    <button class="btn btn-link p-0 text-accent btn-row-detail" title="Ver detalle venta">
                        <i class="fa fa-chevron-down"></i>
                    </button>`
            },

            // Col 1: checkbox selección múltiple
            {
                data: null,
                title: (userSession?.IdRol === 1 || userSession?.IdRol === 4)
                    ? `
      <div class="vc-check-wrap">
        <input type="checkbox" id="vc_chk_all" class="vc-check" title="Seleccionar todo">
      </div>
    `
                    : "",

                orderable: false,
                searchable: false,
                className: "text-center",
                width: "44px",

                render: function (_, __, row) {
                    const esAdmin = (userSession?.IdRol === 1 || userSession?.IdRol === 4);
                    if (!esAdmin) return "";

                    const idVenta = Number(row?.IdVenta || 0);
                    const checked = ventasSeleccionadas.has(idVenta) ? "checked" : "";

                    return `
      <div class="vc-check-wrap">
        <input type="checkbox"
               class="vc-check vc-row-check"
               data-idventa="${idVenta}"
               ${checked}
               title="Seleccionar venta ${idVenta}">
      </div>
    `;
                }
            },

            { data: "IdVenta" },
            { data: "NumeroCuota" },

            {
                data: "FechaCobro",
                render: d => {
                    if (!d) return "";
                    const dias = calcularDiasAtraso(d);
                    const fecha = moment(d).format("DD/MM/YYYY");
                    if (dias <= 0) return `<span>${fecha}</span>`;
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
                    if (dias <= 0) return `<span>${fecha}</span>`;
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

                    return `<span class="badge bg-success">Al día</span>`;
                }
            },

            {
                data: null,
                className: "text-center",
                orderable: false,
                render: d => {

                    const pendiente = (d.TransferenciaPendiente === 1 || d.TransferenciaPendiente === true);
                    const nuevoEstado = pendiente ? 0 : 1;

                    const btnCls = pendiente ? "btn-warning text-dark" : "btn-outline-danger";
                    const iconCls = "fa fa-exclamation-circle";

                    const title = pendiente
                        ? "Desmarcar transferencia pendiente"
                        : "Marcar como transferencia pendiente";

                    // 🏠 Obs cobro (por VENTA)
                    const tieneObs = !!(d.ObservacionCobro && String(d.ObservacionCobro).trim());
                    const estadoCobro = Number(d.EstadoCobro || 0) === 1;

                    // tooltip seguro (sin romper comillas)
                    const obsTooltip = tieneObs
                        ? String(d.ObservacionCobro).replace(/"/g, "'")
                        : "Sin observación de cobro";

                    const btnCasaCls = estadoCobro ? "btn-danger" : "btn-outline-secondary";

                    return `
      <div class="btn-group">

        <!-- 🏠 PRIMER ICONO: OBS COBRO -->
        <button class="btn btn-accion ${btnCasaCls} me-1"
          onclick="VC.abrirObsCobro(${d.IdVenta})"
          title="${obsTooltip}">
          <i class="fa fa-home"></i>
        </button>

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

        <button class="btn btn-accion ${btnCls}"
          onclick="VC.transferenciaPendiente(${nuevoEstado}, ${d.IdCuota})"
          title="${title}">
          <i class="${iconCls}"></i>
        </button>

      </div>
    `;
                }
            }
        ]
    });

    // draw => sincronizar checks + header + FAB
    tabla.on("draw", function () {
        VC.refrescarSeleccionUI();
    });

    /* ===========================================================
       ✅ SELECCIÓN SINGLE (igual Historial) — TABLA PRINCIPAL
    ============================================================ */

    // Click en cualquier CELDA de la fila
    $("#vc_tabla tbody").off("click.vcSelectRow").on("click.vcSelectRow", "td", function (e) {

        if (!tabla) return;

        // si clic en acordeón/acciones => no seleccionar
        if ($(e.target).closest("button.btn-row-detail, .btn-accion").length) return;

        // si clic en inputs/selects/labels => no seleccionar
        if ($(e.target).closest("a, input, select, textarea, label").length) return;

        // si clic en checkbox => no seleccionar (esto evita “atarelo al check”)
        if ($(e.target).closest("input.vc-row-check, #vc_chk_all").length) return;

        const tr = $(this).closest("tr");
        if (tr.hasClass("child")) return;

        const row = tabla.row(tr);
        const d = row.data();
        if (!d) return;

        ventaClickeadaId = d.IdVenta;

        tabla.rows().every(function () {
            $(this.node()).removeClass("row-selected");
        });

        $(row.node()).addClass("row-selected");

        tabla.draw(false);
    });

    // Click acordeón — también marca selección visual (igual Historial)
    $("#vc_tabla tbody").off("click.vcAcordeon").on("click.vcAcordeon", "button.btn-row-detail", async function (e) {

        e.stopPropagation();

        const tr = $(this).closest("tr");

        // ✅ marcar selección visual aunque sea click en botón
        tabla.rows().every(function () {
            $(this.node()).removeClass("row-selected");
        });
        $(tabla.row(tr).node()).addClass("row-selected");

        const dsel = tabla.row(tr).data();
        ventaClickeadaId = dsel?.IdVenta ?? null;

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

    VC.refrescarSeleccionUI();
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


// ===========================================================
// COBRADORES (para asignar)
// ===========================================================

VC.cargarCobradores = async function () {
    try {
        const resp = await $.getJSON("/Usuarios/ListarCobradores");
        cobradoresCache = resp?.data || [];

        const ddl = $("#ddlCobradorAsignar").empty();
        ddl.append(`<option value="">Seleccionar...</option>`);
        cobradoresCache.forEach(c => ddl.append(`<option value="${c.Id}">${c.Nombre}</option>`));

        // Re-init select2 limpio
        if (ddl.hasClass("select2-hidden-accessible")) {
            ddl.select2("destroy");
        }

        ddl.select2({
            width: "100%",
            dropdownParent: $("#modalAsignarCobrador"),
            placeholder: "Seleccionar...",
            allowClear: true
        });

    } catch (e) {
        console.error(e);
        VC.toast("No se pudieron cargar cobradores", "danger");
    }
};


VC.abrirAsignarCobrador = async function () {
    if (!ventasSeleccionadas || ventasSeleccionadas.size === 0) {
        VC.toast("No hay ventas seleccionadas", "warn");
        return;
    }

    // Asegurar lista cobradores
    if (!cobradoresCache || cobradoresCache.length === 0) {
        await VC.cargarCobradores();
    } else {
        // si ya estaban cargados, igual aseguramos select2 con parent correcto
        if (!$("#ddlCobradorAsignar").hasClass("select2-hidden-accessible")) {
            $("#ddlCobradorAsignar").select2({ width: "100%", dropdownParent: $("#modalAsignarCobrador") });
        }
    }

    // Cantidad seleccionadas
    $("#lblCantVentasSel").text(ventasSeleccionadas.size);

    // Abrir modal bootstrap 5
    VC.openModal("modalAsignarCobrador");
};

VC.confirmarAsignarCobrador = async function () {
    const idCobrador = parseInt($("#ddlCobradorAsignar").val() || "0", 10);

    if (!idCobrador) {
        VC.toast("Elegí un cobrador", "warn");
        return;
    }

    const idsVentas = Array.from(ventasSeleccionadas);

    if (!confirm(`¿Asignar cobrador a ${idsVentas.length} venta(s)?`)) return;

    const resp = await $.ajax({
        url: "/Ventas_Electrodomesticos/AsignarCobradorVentas",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ IdCobrador: idCobrador, IdsVentas: idsVentas })
    });

    if (resp && resp.success) {
        VC.toast("Cobrador asignado", "success");
        ventasSeleccionadas.clear();
        VC.closeModal("modalAsignarCobrador");
        await VC.cargarTabla();
    } else {
        VC.toast(resp?.message || "Error asignando cobrador", "danger");
    }
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
            onclick="VC.abrirAjuste(${v.IdVenta}, ${c.Id})"
            title="Ajustar">
            <i class="fa fa-bolt"></i>
        </button>

        <button class="btn btn-accion btn-historial me-1"
            onclick="VC.abrirHistorialPartial(${v.IdVenta}, ${c.Id})"
            title="Historial">
            <i class="fa fa-eye"></i>
        </button>

        <!-- ⚠️ TRANSFERENCIA PENDIENTE -->
        <button class="btn btn-accion ${c.TransferenciaPendiente ? "btn-warning text-dark" : "btn-outline-danger"}"
            onclick="VC.transferenciaPendiente(${c.TransferenciaPendiente ? 0 : 1}, ${c.Id})"
            title="${c.TransferenciaPendiente
                ? "Desmarcar transferencia pendiente"
                : "Marcar como transferencia pendiente"}">
            <i class="fa fa-exclamation-circle"></i>
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

VC.abrirObsCobro = function (idVenta) {

    // tomar obs actual desde cuotasCache (tenés varias filas con mismo IdVenta)
    const fila = (cuotasCache || []).find(x => Number(x?.IdVenta || 0) === Number(idVenta));
    const obsActual = fila?.ObservacionCobro || "";

    document.getElementById("obsCobro_idVenta").value = idVenta;
    document.getElementById("obsCobro_txt").value = obsActual || "";

    const el = document.getElementById("modalObsCobro");
    const modal = bootstrap.Modal.getOrCreateInstance(el);
    modal.show();
};



VC.guardarObsCobro = async function () {
    const idVenta = parseInt(document.getElementById("obsCobro_idVenta").value || "0", 10) || 0;
    const obs = (document.getElementById("obsCobro_txt").value || "").trim();

    if (!idVenta) return;

    try {
        const resp = await fetch("/Ventas_Electrodomesticos/GuardarObservacionCobro", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idVenta, observacion: obs })
        });

        const json = await resp.json();

        if (!json || json.success !== true) {
            showToast(json?.message || "No se pudo guardar", "danger");
            return;
        }

        showToast("Observación guardada", "success");

        // cerrar modal
        bootstrap.Modal.getInstance(document.getElementById("modalObsCobro"))?.hide();

        await VC.cargarTabla();

    } catch (e) {
        console.error(e);
        showToast("Error guardando observación", "danger");
    }
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

    const data = resp.data || [];

    if (data.length > 0 && userSession.IdRol == 1 || userSession.IdRol == 4) {
        $("#divCobrosPendientes").removeAttr("hidden");
    } else {
        $("#divCobrosPendientes").attr("hidden", true);
        return; // no inicialices la tabla si no hay datos
    }

    $("#vc_tabla_pendientes").DataTable({
        destroy: true,
        data: resp.data || [],
        paging: false,
        searching: false,
        info: false,

        columns: [

          
            { data: "IdVenta" },
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


VC.cargarTransferenciasPendientes = async function () {

    const resp = await $.getJSON(
        "/Ventas_Electrodomesticos/ListarTransferenciasPendientes",
        {
            idCliente: $("#f_cliente").val() || null,
            idVendedor: $("#f_vendedor").val() || null
        }
    );

    const data = resp.data || [];

    // ✅ MOSTRAR / OCULTAR BLOQUE
    if (data.length > 0) {
        $("#divTransferenciasPendientes").removeAttr("hidden");
    } else {
        $("#divTransferenciasPendientes").attr("hidden", true);
        return; // no inicialices la tabla si no hay datos
    }

    $("#vc_tabla_transferencias_pendientes").DataTable({
        destroy: true,
        data: resp.data || [],
        paging: false,
        searching: false,
        info: false,

        columns: [


            { data: "IdVenta" },
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

    <!-- 🔄 REVERTIR TRANSFERENCIA PENDIENTE -->
    <button class="btn btn-accion btn-warning text-dark"
        onclick="VC.transferenciaPendiente(0, ${d.IdCuota})"
        title="Revertir transferencia pendiente">
        <i class="fa fa-undo"></i>
    </button>

</div>
`
            }

        ]
    });
};




VC.transferenciaPendiente = async function (estado, idCuota) {

    const msg =  estado === 1
        ? "¿Marcar esta cuota como transferencia pendiente?"
        : "¿Revertir la transferencia pendiente de esta cuota?";

    if (!confirm(msg)) return;

    const resp = await $.post(
        "/Ventas_Electrodomesticos/MarcarTransferenciaPendiente",
        { estado, idCuota }
    );

    if (resp.success) {

        VC.toast(
            estado === 1
                ? "Marcado como transferencia pendiente"
                : "Transferencia pendiente revertida",
            "success"
        );

        VC.cargarTabla();
        VC.cargarTransferenciasPendientes();

    } else {
        VC.toast(resp.message || "Error", "danger");
    }
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




let accounts = [];


let selectedAccount = null;

function renderAccounts() {
    const accountList = document.getElementById("accountList");
    accountList.innerHTML = "";

    if (accounts.length === 0) return;

    accounts.forEach(account => {
        const li = document.createElement("li");
        li.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center");

        if (account.Activo == 0) {
            li.style.backgroundColor = "rgba(194,14,2,0.7)";
            li.classList.add("text-white");
        }

        li.setAttribute("data-id", account.Id);

        const contentContainer = document.createElement("div");
        contentContainer.classList.add("d-flex", "align-items-center", "gap-2");

        const accountName = document.createElement("div");
        accountName.classList.add("account-name-scroll");

        const spanScroll = document.createElement("span");
        spanScroll.classList.add("scroll-inner");
        spanScroll.textContent = account.Nombre;

        accountName.appendChild(spanScroll);
        contentContainer.appendChild(accountName);

        // Activar scroll con click (toggle)
        accountName.addEventListener("click", (e) => {
            e.stopPropagation(); // evitar que dispare el click de selección
            spanScroll.classList.toggle("scrolling");
        });

        if (account.MontoPagar > 0) {
            const porcentaje = (account.Entrega / account.MontoPagar) * 100;

            const progressWrapper = document.createElement("div");
            progressWrapper.classList.add("position-relative");
            progressWrapper.style.width = "80px";
            progressWrapper.style.height = "10px";

            const progressBarContainer = document.createElement("div");
            progressBarContainer.classList.add("progress");
            progressBarContainer.style.width = "100%";
            progressBarContainer.style.height = "100%";

            const progressBar = document.createElement("div");
            progressBar.classList.add("progress-bar");
            progressBar.style.width = `${porcentaje}%`;
            progressBar.style.transition = "width 0.5s";

            progressBar.classList.remove("low", "medium", "high", "full");
            if (porcentaje < 10) {
                progressBar.classList.add("low");
            } else if (porcentaje < 60) {
                progressBar.classList.add("medium");
            } else if (porcentaje < 90) {
                progressBar.classList.add("high");
            } else {
                progressBar.classList.add("full");
            }

            const percentageText = document.createElement("span");
            percentageText.id = "progress-percentage-textCobro";
            percentageText.textContent = porcentaje >= 100 ? "Completado" : `${Math.round(porcentaje)}%`;
            percentageText.style.position = "absolute";
            percentageText.style.left = "50%";
            percentageText.style.top = "50%";
            percentageText.style.transform = "translate(-50%, -50%)";
            percentageText.style.color = "#fff";
            percentageText.style.fontSize = "10px";
            percentageText.style.fontWeight = "700";
            percentageText.style.textShadow = "0 0 2px #000";

            progressBarContainer.appendChild(progressBar);
            progressWrapper.appendChild(progressBarContainer);
            progressWrapper.appendChild(percentageText);
            contentContainer.appendChild(progressWrapper);
        }

        li.appendChild(contentContainer);

        const buttonContainer = document.createElement("div");
        buttonContainer.innerHTML = `
         <button class="btn btn-secondary btn-sm delete-btn" onclick="anadirComprobantes(${account.Id})" title="Adjuntar Imagenes">
                <i class="fa fa-file-image-o"></i>
            </button>
            <button class="btn btn-warning btn-sm edit-btn" onclick="editAccount(${account.Id})" title="Editar">
                <i class="fa fa-pencil"></i>
            </button>
            <button class="btn btn-danger btn-sm delete-btn" onclick="deleteAccount(${account.Id})" title="Eliminar">
                <i class="fa fa-trash"></i>
            </button>
        `;
        li.appendChild(buttonContainer);

        li.addEventListener("click", () => selectAccount(account, li));

        accountList.appendChild(li);
    });

    if (accounts.length > 0) {
        selectAccount(accounts[0], accountList.firstChild);
    }
}

// Función para seleccionar una cuenta y mostrar sus datos en los inputs
function selectAccount(account, item) {

    // Remover la clase 'active' de cualquier otra cuenta seleccionada
    const allAccounts = document.querySelectorAll("#accountList .list-group-item");
    allAccounts.forEach(item => item.classList.remove("active"));

    // Añadir la clase 'active' al item seleccionado


    item.classList.add("active");

    selectedAccount = account;

    document.getElementById("accountName").value = account.Nombre;
    document.getElementById("accountCBU").value = account.CBU;
    document.getElementById("accountMonto").value = account.MontoPagar;
    document.getElementById("CuentaPropia").checked = account.CuentaPropia;
    document.getElementById("Activo").checked = account.Activo;
    actualizarBarraProgreso(account.MontoPagar, account.Entrega);
}

// Función para editar una cuenta
function editAccount(id) {
    const account = accounts.find(a => a.Id === id);
    if (account) {
        // Pre-cargar los valores de la cuenta en los campos de texto
        document.getElementById("accountName").value = account.Nombre;
        document.getElementById("accountMonto").value = account.MontoPagar;
        document.getElementById("accountCBU").value = account.CBU;
        document.getElementById("CuentaPropia").checked = account.CuentaPropia;
        document.getElementById("Activo").checked = account.Activo;
        document.getElementById("accountName").removeAttribute("disabled");
        document.getElementById("accountCBU").removeAttribute("disabled");
        document.getElementById("accountMonto").removeAttribute("disabled");
        document.getElementById("CuentaPropia").removeAttribute("disabled");
        document.getElementById("Activo").removeAttribute("disabled");
        document.getElementById("editarCuenta").removeAttribute("hidden");
        document.getElementById("anadirCuenta").setAttribute("hidden", "hidden");
        document.getElementById("addAccount").setAttribute("hidden", "hidden");
        document.getElementById("canceladdAccount").removeAttribute("hidden");
        selectedAccount = account;
    }
}
// Función para editar una cuenta
function editarCuenta() {
    if (selectedAccount != null) {
        const updatedAccount = {
            Id: selectedAccount.Id,  // Suponiendo que el objeto 'selectedAccount' tiene un Id
            Nombre: document.getElementById("accountName").value.trim(),
            CBU: document.getElementById("accountCBU").value.trim(),
            CuentaPropia: document.getElementById("CuentaPropia").checked,
            Activo: document.getElementById("Activo").checked,
            MontoPagar: document.getElementById("accountMonto").value
        };

        fetch('/Cobranzas/EditarCuentaBancaria', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedAccount)  // Enviamos el objeto actualizado
        })
            .then(response => response.json())
            .then(result => {
                if (result) {
                    alert("Cuenta modificada con éxito");
                    cancelarNuevaCuenta();
                    loadCuentasBancarias(activoCuentasBancarias);
                } else {
                    alert("Error al modificar la cuenta.");
                }
            })
            .catch(error => console.error('Error updating account:', error));
    }
}



// Función para eliminar una cuenta
function deleteAccount(id) {
    if (confirm("¿Estás seguro de que quieres eliminar esta cuenta?")) {
        fetch('/Cobranzas/EliminarCuentaBancaria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        })
            .then(response => response.json())
            .then(result => {
                if (result) {
                    loadCuentasBancarias(activoCuentasBancarias);
                    selectedAccount = null;
                    document.getElementById("accountName").value = "";
                    document.getElementById("accountCBU").value = "";
                    document.getElementById("accountMonto").value = "";
                    document.getElementById("CuentaPropia").checked = false;
                    document.getElementById("Activo").checked = true;
                } else {
                    alert("Error al eliminar la cuenta.");
                }
            })
            .catch(error => console.error('Error deleting account:', error));
    }
}

function anadirCuenta() {
    selectedAccount = null;
    document.getElementById("accountName").value = "";
    document.getElementById("accountCBU").value = "";
    document.getElementById("accountMonto").value = "";
    document.getElementById("CuentaPropia").checked = false;
    document.getElementById("Activo").checked = true;
    document.getElementById("accountName").removeAttribute("disabled");
    document.getElementById("accountCBU").removeAttribute("disabled");
    document.getElementById("accountMonto").removeAttribute("disabled");
    document.getElementById("CuentaPropia").removeAttribute("disabled");
    document.getElementById("Activo").removeAttribute("disabled");
    document.getElementById("anadirCuenta").setAttribute("hidden", "hidden");
    document.getElementById("addAccount").removeAttribute("hidden");
    document.getElementById("canceladdAccount").removeAttribute("hidden");

}

document.getElementById("addAccount").addEventListener("click", async () => {
    const Nombre = document.getElementById("accountName").value.trim();
    const cbu = document.getElementById("accountCBU").value.trim();
    const CuentaPropia = document.getElementById("CuentaPropia").checked;
    const Activo = document.getElementById("Activo").checked;
    const MontoPagar = document.getElementById("accountMonto").value;

    if (!Nombre || !cbu) {
        alert("Debes completar ambos campos.");
        return;
    }

    const newAccount = { Nombre, cbu, CuentaPropia, Activo, MontoPagar };

    try {
        const response = await fetch('/Cobranzas/NuevaCuentaBancaria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAccount)
        });

        const result = await response.json();

        if (result?.Status === 0 && result.Id) {
            alert("Cuenta añadida con éxito.");

            // Restaurar inputs
            document.getElementById("accountName").value = "";
            document.getElementById("accountCBU").value = "";
            document.getElementById("accountMonto").value = "";
            document.getElementById("CuentaPropia").checked = false;
            document.getElementById("Activo").checked = true;

            // Mostrar botones originales
            document.getElementById("anadirCuenta").hidden = false;
            document.getElementById("btnStockPendiente").hidden = false;

            // Ocultar registrar/cancelar
            document.getElementById("addAccount").hidden = true;
            document.getElementById("canceladdAccount").hidden = true;

            // Recargar lista
            await loadCuentasBancarias(activoCuentasBancarias);

            // Seleccionar nueva cuenta
            seleccionarCuenta(result.Id);
        } else {
            alert("Error al añadir la cuenta.");
        }

    } catch (error) {
        console.error("Error adding account:", error);
        alert("Ocurrió un error al registrar la cuenta.");
    }
});

function seleccionarCuenta(id) {
    const item = document.querySelector(`#accountList [data-id='${id}']`);
    if (item) {
        item.click(); // Simula la selección
        item.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

async function cancelarNuevaCuenta() {
    document.getElementById("accountName").value = "";
    document.getElementById("accountCBU").value = "";
    document.getElementById("accountMonto").value = "";
    document.getElementById("CuentaPropia").checked = false;
    document.getElementById("Activo").checked = true;
    document.getElementById("accountName").setAttribute("disabled", "disabled");
    document.getElementById("accountCBU").setAttribute("disabled", "disabled");
    document.getElementById("accountMonto").setAttribute("disabled", "disabled");
    document.getElementById("CuentaPropia").setAttribute("disabled", "disabled");
    document.getElementById("Activo").setAttribute("disabled", "disabled");
    document.getElementById("canceladdAccount").setAttribute("hidden", "hidden");
    document.getElementById("anadirCuenta").removeAttribute("hidden");
    document.getElementById("addAccount").setAttribute("hidden", "hidden");
    document.getElementById("editarCuenta").setAttribute("hidden", "hidden");
}

// Cargar cuentas bancarias desde el servidor
async function loadCuentasBancarias(activo) {
    var url = "/Cobranzas/ListaCuentasBancariasTotalesConInformacion";
    let value = JSON.stringify({ Activo: activo });
    let options = {
        type: "POST",
        url: url,
        async: true,
        data: value,
        contentType: "application/json",
        dataType: "json"
    };

    // Hacer la solicitud AJAX para obtener las cuentas bancarias
    let result = await MakeAjax(options);

    // Filtrar las cuentas que ya fueron obtenidas
    accounts = result; // Suponiendo que 'CuentasBancarias' es la propiedad del resultado
    renderAccounts(); // Llamar a la función que renderiza las cuentas
}



// Abrir el modal de cuentas bancarias
async function abrirModalCuentasBancarias() {
    let toggleButton = $("#toggleBloqueadas");

    // Resetear el botón al estado inicial
    toggleButton.html('<i class="fa fa-eye text-danger"></i> Ver cuentas inactivas');
    toggleButton.find("i").removeClass("text-success").addClass("text-danger");

    // Ocultar cuentas bloqueadas por defecto
    $(".bloqueado").hide();
    cancelarNuevaCuenta()
    await loadCuentasBancarias(1);
    $("#bankAccountsModal").modal('show');
}


$("#toggleBloqueadas").click(async function () {
    let icon = $(this).find("i");

    if (icon.hasClass("text-danger")) {
        icon.removeClass("text-danger").addClass("text-success");
        $(this).html('<i class="fa fa-eye text-success"></i> Ocultar cuentas inactivas');
        await loadCuentasBancarias(-1);
        activoCuentasBancarias = -1
        $(".bloqueado").show();
    } else {
        icon.removeClass("text-success").addClass("text-danger");
        $(this).html('<i class="fa fa-eye text-danger"></i> Ver cuentas inactivas');
        activoCuentasBancarias = 1
        await loadCuentasBancarias(1);
        $(".bloqueado").hide();
    }
});



function actualizarBarraProgresoCobro(accountData) {
    const progressBar = document.getElementById("progressBarCobro");
    const progressPercentage = document.getElementById("progressPercentageCobro");
    const totalLabel = document.getElementById("total-labelCobro");
    const restanteLabel = document.getElementById("restante-labelCobro");
    const progressBarContainer = document.getElementById("progressBarContainerCobro"); // El contenedor de la barra

    // Obtener los valores de la cuenta seleccionada
    const montoPagar = accountData.MontoPagar;
    const entrega = accountData.Entrega;

    // Mostrar u ocultar la barra de progreso según el monto a pagar
    if (montoPagar > 0) {
        progressBarContainer.hidden = false; // Mostrar la barra
    } else {
        progressBarContainer.hidden = true; // Ocultar la barra
        return; // Si no hay monto a pagar, salimos de la función
    }

    // Calcular el porcentaje
    const porcentaje = montoPagar === 0 ? 0 : (entrega / montoPagar) * 100;

    // Actualizamos la barra de progreso y el texto del porcentaje
    progressBar.style.width = `${porcentaje}%`;

    // Limpiar el texto de porcentaje anterior
    progressPercentage.textContent = '';

    const entregaLabel = document.getElementById("entregas-labelCobro");


    const restante = montoPagar - entrega;

    // Actualizamos los valores de Total y Restante
    totalLabel.textContent = `Total: $${montoPagar.toLocaleString()}`;
    restanteLabel.textContent = `Restante: $${(montoPagar - entrega).toLocaleString()}`;

    entregaLabel.textContent = `Entregas: $${entrega.toLocaleString()}`;
    // Limpiar clases anteriores de color
    progressBar.classList.remove("low", "medium", "high", "full");

    // Cambiar clases para el color de la barra de progreso según el porcentaje
    if (porcentaje < 10) {
        progressBar.classList.add("low");
    } else if (porcentaje < 60) {
        progressBar.classList.add("medium");
    } else if (porcentaje < 90) {
        progressBar.classList.add("high");
    } else {
        progressBar.classList.add("full");
    }

    // Eliminar el texto de porcentaje anterior sobre la barra si existe
    const textoPrevio = document.getElementById("progress-percentage-textCobro");
    if (textoPrevio) textoPrevio.remove();

    // Crear el texto centrado sobre la barra de progreso
    const percentageText = document.createElement("span");
    percentageText.id = "progress-percentage-textCobro";
    if (porcentaje >= 100) {
        percentageText.textContent = "✔ Completado"; // Mostrar "✔ Completado" cuando se llega al 100%
    } else {
        percentageText.textContent = `${Math.round(porcentaje)}%`; // Mostrar el porcentaje normal
    }

    percentageText.style.position = "absolute";
    percentageText.style.left = "50%";
    percentageText.style.top = "50%";
    percentageText.style.transform = "translate(-50%, -50%)";
    percentageText.style.color = "#fff";
    percentageText.style.fontSize = "14px"; // Ajusté el tamaño para que se vea bien
    percentageText.style.fontWeight = "700";
    percentageText.style.textShadow = "0 0 2px #000";

    // Asegurar que el contenedor de la barra tenga posición relativa para posicionar el texto correctamente
    const progressWrapper = progressBar.parentElement; // El contenedor de la barra de progreso
    if (progressWrapper) {
        progressWrapper.style.position = "relative"; // Aseguramos que sea relativo para que el texto esté centrado
        progressWrapper.appendChild(percentageText); // Añadir el texto centrado sobre la barra
    }
}

function actualizarBarraProgreso(montoTotal, montoPagado) {
    montoTotal = parseFloat(montoTotal) || 0;
    montoPagado = parseFloat(montoPagado) || 0;

    const divBarra = document.getElementById("divProgressBarBanco");

    if (montoTotal === 0) {
        divBarra.style.display = "none";
        return;
    } else {
        divBarra.style.display = "block";
    }

    const barra = document.getElementById("progress-bar");
    barra.style.display = "block";

    const restante = montoTotal - montoPagado;
    const porcentaje = Math.min((montoPagado / montoTotal) * 100, 100);


    const restanteLabel = document.getElementById("restante-label");
    const totalLabel = document.getElementById("total-label");

    const entregaLabel = document.getElementById("entregas-label");

    entregaLabel.textContent = `Entregas: $${montoPagado.toLocaleString()}`;


    barra.style.width = `${porcentaje}%`;


    restanteLabel.textContent = `Restante: $${restante.toLocaleString()}`;
    totalLabel.textContent = `Total: $${montoTotal.toLocaleString()}`;

    // Limpiar clases anteriores
    barra.classList.remove("low", "medium", "high", "full");

    if (porcentaje < 10) {
        barra.classList.add("low");
    } else if (porcentaje < 60) {
        barra.classList.add("medium");
    } else if (porcentaje < 90) {
        barra.classList.add("high");
    } else {
        barra.classList.add("full");
    }

    // Eliminar texto anterior si existe
    const textoPrevio = document.getElementById("progress-percentage-text");
    if (textoPrevio) textoPrevio.remove();

    // Crear el texto centrado sobre la barra completa
    const percentageText = document.createElement("span");
    percentageText.id = "progress-percentage-text";
    percentageText.textContent = porcentaje >= 100 ? "✔ Completado" : `${Math.round(porcentaje)}%`;
    percentageText.style.position = "absolute";
    percentageText.style.left = "50%";
    percentageText.style.top = "50%";
    percentageText.style.transform = "translate(-50%, -50%)";
    percentageText.style.color = "#fff";
    percentageText.style.fontSize = "12px";
    percentageText.style.fontWeight = "700";
    percentageText.style.textShadow = "0 0 2px #000";

    // Asegurar que el contenedor de la barra tenga posición relativa
    const progressWrapper = divBarra.querySelector(".progress");
    if (progressWrapper) {
        progressWrapper.style.position = "relative";
        progressWrapper.appendChild(percentageText);
    }
}

function convertirImagenACanvas(imageData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            // Convertimos a JPEG para evitar problemas de transparencia o formato
            const jpgData = canvas.toDataURL("image/jpeg", 0.92); // calidad 92%
            resolve(jpgData);
        };
        img.onerror = reject;
        img.src = imageData;
    });
}


function getImageDimensions(imageData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = imageData;
    });
}


async function exportarPdf() {
    if (!selectedAccount) {
        alert("Por favor, seleccioná una cuenta primero.");
        return;
    }

    await generarPdfFinal(); // lógica que ya tenías, movida a una función aparte
}


async function anadirComprobantes(id) {
    const modal = new bootstrap.Modal(document.getElementById("modalComprobantes"));


    // Limpiar todos los slots
    const previews = document.querySelectorAll(".vista-previa");
    const inputs = document.querySelectorAll(".extra-comprobante");
    const btns = document.querySelectorAll(".btn-cancelar-imagen");

    previews.forEach(img => {
        img.style.display = "none";
        img.src = "";
    });

    inputs.forEach(input => {
        input.value = "";
    });

    btns.forEach(btn => btn.style.display = "none");

    document.getElementById("idaccount").value = id;

    // Cargar imágenes desde backend
    const response = await fetch(`/Cobranzas/ObtenerComprobantes?idCuenta=${id}`);
    const data = await response.json();

    for (let i = 0; i < data.length && i < previews.length; i++) {
        const img = previews[i];
        img.src = `data:image/png;base64,${data[i].Imagen}`;
        img.style.display = "block";

        btns[i].style.display = "inline-block";
    }

    modal.show();
}


async function guardarComprobantes() {
    const idCuenta = parseInt(document.getElementById("idaccount").value);
    const fileInputs = document.querySelectorAll(".extra-comprobante");
    const imgPreviews = document.querySelectorAll(".vista-previa");

    let comprobantes = [];

    for (let i = 0; i < 12; i++) {
        const input = fileInputs[i];
        const img = imgPreviews[i];

        let base64 = null;

        if (!img || img.style.display === "none") {
            base64 = null;
        } else if (input?.files?.[0]) {
            base64 = (await toBase64(input.files[0])).split(',')[1];
        } else if (img.src?.startsWith("data:image")) {
            base64 = img.src.split(',')[1];
        }

        comprobantes.push({
            IdCuenta: idCuenta,
            Fecha: new Date().toISOString(),
            Imagen: base64 // puede ser null
        });
    }

    const response = await fetch('/Cobranzas/GuardarComprobantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comprobantes)
    });

    const result = await response.json();

    if (result.success) {
        alert("Comprobantes guardados correctamente");

        document.querySelectorAll(".vista-previa").forEach(img => {
            img.src = "";
            img.style.display = "none";
        });

        fileInputs.forEach(input => input.value = "");

        document.querySelectorAll(".btn-cancelar-imagen").forEach(btn => {
            btn.style.display = "none";
        });

        const modal = bootstrap.Modal.getInstance(document.getElementById("modalComprobantes"));
        if (modal) modal.hide();
    } else {
        alert("Error al guardar: " + (result.error || "desconocido"));
    }
}

function getImageBase64FromURL(url) {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            })
            .catch(reject);
    });
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


async function generarPdfFinal() {
    let clientesExportados = [];
    let posicion = { x: 15, y: 10 };

    const doc = new jsPDF();
    const fechaActual = new Date().toLocaleDateString();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Header
    const colorStart = [30, 87, 153];
    const colorEnd = [125, 185, 232];
    const headerX = 10, headerY = 10, headerWidth = 190, headerHeight = 12;
    drawGradientHeader(doc, headerX, headerY, headerWidth, headerHeight, colorStart, colorEnd);

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titulo = `Cuenta Bancaria: ${selectedAccount.Nombre}`;
    const centerX = (pageWidth - doc.getTextWidth(titulo)) / 2;
    doc.text(titulo, centerX, headerY + 9);

    doc.setTextColor(0, 0, 0);
    posicion.y += 20;
    doc.setFontSize(12);
    doc.text(`Fecha: ${fechaActual}`, 10, posicion.y);
    if (selectedAccount.MontoPagar > 0) {
        posicion.y += 10;
        doc.text(`Monto a Cobrar: $${selectedAccount.MontoPagar.toFixed(2)}`, 10, posicion.y);
    }
    posicion.y += 10;
    doc.text(`Entregado: $${selectedAccount.Entrega.toFixed(2)}`, 10, posicion.y);
    if (parseInt(selectedAccount.MontoPagar) > 0) {
        posicion.y += 10;
        doc.text(`Restante: $${(selectedAccount.MontoPagar - selectedAccount.Entrega).toFixed(2)}`, 10, posicion.y);
        posicion.y += 10;
        drawProgressBar(doc, 10, posicion.y, 180, 10, (selectedAccount.Entrega / selectedAccount.MontoPagar) * 100);
    }

    posicion.y += 20;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Comprobantes:", 10, posicion.y);
    posicion.y += 10;

    // 1. Comprobantes existentes de ventas
    for (const venta of selectedAccount.InformacionVentas) {
        const image = await ObtenerImagen(venta.Id);
        if (!image) continue;

        try {
            const idCliente = venta.idCliente;
            if (clientesExportados.includes(idCliente)) continue;

            await agregarImagenADoc(doc, image, posicion, pageHeight, clientesExportados, idCliente);
        } catch (err) {
            console.warn("No se pudo cargar imagen de venta:", err);
        }
    }

    // 2. Comprobantes guardados en la base para la cuenta
    try {
        const resp = await fetch(`/Cobranzas/ObtenerComprobantes?idCuenta=${selectedAccount.Id}`);
        const comprobantesBase = await resp.json();

        for (const comprobante of comprobantesBase) {
            if (comprobante.Imagen) {
                await agregarImagenADoc(doc, comprobante.Imagen, posicion, pageHeight);
            }
        }
    } catch (err) {
        console.warn("Error cargando comprobantes desde base:", err);
    }

    // 3. Comprobantes nuevos del modal (input.files)
    const inputs = Array.from(document.querySelectorAll(".extra-comprobante"))
        .filter(input => input && input.files && input.files.length > 0);

    for (const input of inputs) {
        const file = input.files[0];
        const base64 = await leerArchivoComoBase64(file);
        await agregarImagenADoc(doc, base64.split(',')[1], posicion, pageHeight);
    }

    limpiarComprobantes();
    doc.save(`Cuenta_${selectedAccount.Nombre}.pdf`);
}

async function agregarImagenADoc(doc, image, posicion, pageHeight, clientesExportados, idCliente = null) {
    const format = getImageFormat(image);
    const rawData = `data:image/${format.toLowerCase()};base64,${image}`;
    const imageData = await convertirImagenACanvas(rawData);

    // Tamaño fijo
    const imageWidth = 85;
    const imageHeight = 110;
    const margin = 15;
    const spacing = 10;
    const pageWidth = doc.internal.pageSize.width;

    // Si no entra horizontalmente, saltar a nueva fila
    if (posicion.x + imageWidth > pageWidth - margin) {
        posicion.x = margin;
        posicion.y += imageHeight + spacing;
    }

    // Si no entra verticalmente, agregar nueva página
    if (posicion.y + imageHeight > pageHeight - margin) {
        doc.addPage();
        posicion.x = margin;
        posicion.y = 20;
    }

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(posicion.x - 2, posicion.y - 2, imageWidth + 4, imageHeight + 4);
    doc.addImage(imageData, "JPEG", posicion.x, posicion.y, imageWidth, imageHeight);

    if (idCliente !== null) clientesExportados.push(idCliente);

    // Actualizar X para la siguiente imagen
    posicion.x += imageWidth + spacing;
}

function leerArchivoComoBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsDataURL(file);
    });
}

document.querySelectorAll('.vista-previa').forEach(img => {
    img.addEventListener('click', function () {
        const modal = document.getElementById("modalImagenAmpliada");
        const modalImg = modal.querySelector("img");
        modalImg.src = this.src;
        modal.style.display = "flex"; // ahora usa flexbox
    });
});

document.getElementById("modalImagenAmpliada").addEventListener("click", function () {
    this.style.display = "none";
});


function limpiarComprobantes() {
    document.querySelectorAll('.extra-comprobante').forEach(input => {
        input.value = '';
    });

    document.querySelectorAll('.vista-previa').forEach(img => {
        img.src = '';
        img.style.display = 'none';
    });

    document.querySelectorAll('.btn-cancelar-imagen').forEach(btn => {
        btn.style.display = 'none';
    });
}


document.querySelectorAll('.extra-comprobante').forEach(input => {
    input.addEventListener('change', function () {
        const file = this.files[0];
        const container = this.closest('.comprobante-card, .border');
        const vistaPreviaContainer = container.querySelector('.vista-previa-container');
        const img = container.querySelector('.vista-previa');
        const btnCancelar = container.querySelector('.btn-cancelar-imagen');

        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                img.src = e.target.result;
                img.style.display = 'block'; // mostrar imagen
                btnCancelar.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            img.src = '';
            img.style.display = 'none'; // ocultar si no hay imagen válida
            btnCancelar.style.display = 'none';
        }
    });
});

document.querySelectorAll('.btn-cancelar-imagen').forEach(btn => {
    btn.addEventListener('click', function () {
        const container = this.closest('.comprobante-card, .border');
        const input = container.querySelector('.extra-comprobante');
        const img = container.querySelector('.vista-previa');

        input.value = '';
        input.setAttribute("data-vacio", "1");

        img.removeAttribute("src"); // 🔁 ESTO ES LO QUE TE FALTABA
        img.style.display = 'none';

        this.style.display = 'none';
    });
});


function drawGradientHeader(doc, x, y, width, height, colorStart, colorEnd) {
    const steps = width;
    for (let i = 0; i < steps; i++) {
        const alpha = i / steps;
        const r = Math.floor(colorStart[0] * (1 - alpha) + colorEnd[0] * alpha);
        const g = Math.floor(colorStart[1] * (1 - alpha) + colorEnd[1] * alpha);
        const b = Math.floor(colorStart[2] * (1 - alpha) + colorEnd[2] * alpha);
        doc.setFillColor(r, g, b);
        doc.rect(x + i, y, 1, height, 'F');
    }
}


function drawProgressBar(doc, x, y, width, height, porcentaje) {
    // 1. Contenedor rojo (siempre el mismo)

    var r, g, b, barColor;


    if (porcentaje < 10) {
        r = 255;
        g = 0;
        b = 0;
    } else if (porcentaje < 60) {
        r = 255;
        g = 165;
        b = 0;
    } else if (porcentaje < 90) {
        r = 26;
        g = 247;
        b = 140;
    } else {
        r = 0;
        g = 128;
        b = 0;
    }

    barColor = [r, g, b];


    doc.setDrawColor(r, g, b); // borde
    doc.setFillColor(194, 14, 2); // rojo oscuro
    doc.rect(x, y, width, height, 'FD');



    // 3. Rellenar barra (opcional: simular gradiente con líneas verticales)
    const barWidth = (porcentaje / 100) * width;
    const step = 1; // resolución del gradiente simulado

    for (let i = 0; i < barWidth; i += step) {
        const alpha = i / barWidth; // transparencia simulada
        const r = barColor[0];
        const g = barColor[1];
        const b = barColor[2];
        doc.setFillColor(
            Math.floor(r * (0.7 + 0.3 * alpha)),
            Math.floor(g * (0.7 + 0.3 * alpha)),
            Math.floor(b * (0.7 + 0.3 * alpha))
        );
        doc.rect(x + i, y, step, height, 'F');
    }

    // 4. Texto centrado (porcentaje)
    const text = porcentaje >= 100 ? "Completado" : `${Math.round(porcentaje)}%`;


    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255); // blanco
    const textWidth = doc.getTextWidth(text);
    const textX = x + (width - textWidth) / 2;
    const textY = y + height / 2 + 3; // vertical centering
    doc.text(text, textX, textY - 2);
}


// Función para cargar la imagen asincrónicamente
function loadImage(imageData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageData;
    });
}


function getImageFormat(base64) {
    if (base64.startsWith('/9j/')) return 'JPEG'; // JPEG suele empezar con /9j/
    if (base64.startsWith('iVBOR')) return 'PNG'; // PNG suele empezar con iVBOR
    return null;
}





function borrarImagen() {
    const input = document.getElementById("Imagen");
    const img = document.getElementById("imgProducto");
    const p = document.getElementById("imgProd");

    input.value = "";
    img.src = "";
    img.style.display = "none";
    p.innerText = "";
}



function openModal(imageSrc) {
    // Cambia el src de la imagen del modal
    document.getElementById('modalImage').src = imageSrc;
    // Muestra el modal
    $('#imageModal').modal('show');
}



async function ObtenerImagen(idVenta) {
    let url = `/Rendimiento/ObtenerImagen?idVenta=${idVenta}`;

    let options = {
        type: "GET",
        url: url,
        async: true,
        contentType: "application/json",
        dataType: "json"
    };

    let result = await $.ajax(options);

    if (result != null) {
        return result.data;
    } else {
        return null;
    }
}


function agruparCobrosPorVentaManteniendoColumnas(cuotas) {

    const map = {};

    cuotas.forEach(c => {

        if (!map[c.IdVenta]) {
            map[c.IdVenta] = {
                ...c,
                __Cuotas: []
            };
        }

        map[c.IdVenta].__Cuotas.push(c);
    });

    return Object.values(map).map(v => {

        // ordenar cuotas por vencimiento
        v.__Cuotas.sort((a, b) =>
            new Date(a.FechaVencimiento) - new Date(b.FechaVencimiento)
        );

        const cuotaMasVieja = v.__Cuotas[0];

        return {
            ...cuotaMasVieja, // 👈 mantiene TODAS las columnas
            __CantidadCuotasPendientes: v.__Cuotas.length,
            __TodasLasCuotas: v.__Cuotas
        };
    });
}


function renderCantidadCuotas(cantidad) {
    return `
        <span class="badge badge-cuotas-pulse">
            ${cantidad} cuota${cantidad > 1 ? "s" : ""}
        </span>
    `;
}



function habilitarSeleccionFilasCuotasCobros() {

    // Delegación global: cualquier tabla dentro del acordeón (pendientes o finalizadas)
    $(document).off("click.vcSelCuotas").on("click.vcSelCuotas", ".accordion-sub table tbody tr", function (e) {

        // Si clickeás en botones/links/inputs/íconos, no cambiar selección
        if ($(e.target).closest("button, a, input, select, textarea, label, i").length) return;

        const $tbody = $(this).closest("tbody");

        // Solo desmarca dentro de ESA tabla (igual Historial)
        $tbody.find("tr").removeClass("row-selected");
        $(this).addClass("row-selected");
    });
}
