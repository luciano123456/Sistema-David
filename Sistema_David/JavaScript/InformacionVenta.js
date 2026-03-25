/* =========================================================
   InformacionVenta.js — Info ventas completa
   - Mantiene todo lo existente
   - Mejora diseño/UX
   - Agrega badge tipo de venta
   - Mobile real
   - FIX ids compuestos para evitar colisión entre
     Indumentaria y Electrodomésticos
   ========================================================= */

let APP = {
    modo: null,              // "una" | "todas"
    clienteId: null,
    ventaSelId: null,
    from: null,

    ventasCache: [],
    ventasFiltradas: [],
    detalleCache: {},
    currentVentaOpen: null
};

let userSession = {};
try { userSession = JSON.parse(localStorage.getItem("usuario") || "{}"); } catch { userSession = {}; }

/* ===== Helpers ===== */
const q$ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function money(n) {
    n = Number(n || 0);
    const p = n.toFixed(0).split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return "$ " + p.join(",");
}
function formatearSinMiles(v) {
    if (v == null) return 0;
    return Number(String(v).replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.]/g, "")) || 0;
}
function formatearMiles(val) {
    const n = formatearSinMiles(val);
    return n.toLocaleString("es-AR");
}
function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeTipoVenta(tipo) {
    const t = (tipo || "").toString().trim().toUpperCase();
    if (!t) return "INDUMENTARIA";
    if (t === "NORMAL") return "INDUMENTARIA";
    if (t === "INDUMENTARIA") return "INDUMENTARIA";
    if (t === "ELECTRO") return "ELECTRO";
    if (t === "ELECTRODOMESTICOS") return "ELECTRO";
    if (t === "ELECTRODOMÉSTICOS") return "ELECTRO";
    return t;
}

function isElectroVenta(v) {
    const tipo = normalizeTipoVenta(v?.TipoVenta || v?.tipoVenta || v?.Tipo || "");
    return tipo === "ELECTRO";
}
function getTipoVentaLabel(v) {
    return isElectroVenta(v) ? "Electrodomésticos" : "Indumentaria";
}
function getTipoVentaClass(v) {
    return isElectroVenta(v) ? "tipo-electro" : "tipo-normal";
}

/* ===== FIX ids compuestos ===== */
function getVentaUniqueId(v) {
    const tipo = normalizeTipoVenta(v?.TipoVenta || v?.tipoVenta || v?.Tipo || "INDUMENTARIA");
    const id = v?.Id || v?.id || v?.ID || 0;
    return `${tipo}_${id}`;
}
function buildVentaUniqueId(tipo, id) {
    return `${normalizeTipoVenta(tipo)}_${id}`;
}
function parseVentaUniqueId(value) {
    if (typeof value === "string" && value.includes("_")) {
        const ix = value.lastIndexOf("_");
        const tipo = normalizeTipoVenta(value.substring(0, ix));
        const id = parseInt(value.substring(ix + 1), 10) || 0;
        return { tipo, id };
    }
    return { tipo: null, id: parseInt(value, 10) || 0 };
}
function getVentaByUniqueId(uniqueId) {
    const { tipo, id } = parseVentaUniqueId(uniqueId);
    return APP.ventasCache.find(v => {
        const vId = v?.Id || v?.id || v?.ID;
        const vTipo = normalizeTipoVenta(v?.TipoVenta || v?.tipoVenta || v?.Tipo || "");
        return Number(vId) === Number(id) && (!tipo || vTipo === tipo);
    }) || null;
}

/* ===== Normalizadores ===== */
function normalizeProducto(p) {
    if (!p) return null;

    const cantidad = Number(p.Cantidad || 0);
    const precioUnitario = Number(
        p.PrecioTotal ??
        p.PrecioUnitario ??
        p.Precio ??
        p.Valor ??
        0
    );

    return {
        ...p,
        IdProducto: p.IdProducto ?? p.IDProducto ?? p.ProductoId ?? p.idProducto ?? null,
        Producto: p.Producto ?? p.Nombre ?? p.Descripcion ?? "-",
        Cantidad: cantidad,
        PrecioTotal: precioUnitario
    };
}

function normalizeVentaItem(v) {
    if (!v) return null;

    const tipo = normalizeTipoVenta(v.TipoVenta || v.tipoVenta || v.Tipo || "INDUMENTARIA");
    const id = v.Id ?? v.id ?? v.ID ?? v.IdVenta ?? 0;

    return {
        ...v,
        Id: id,
        TipoVenta: tipo,
        Fecha: v.Fecha ?? v.FechaVenta ?? v.FechaCobro ?? null,
        Entrega: Number(v.Entrega || 0),
        Restante: Number(v.Restante || 0),
        Cliente:
            v.Cliente ??
            v.ClienteNombre ??
            v.NombreCliente ??
            v.ClienteDescripcion ??
            v.ClienteNombreCompleto ??
            v.Cliente?.Nombre ??
            null
    };
}

function normalizeDetalleResponse(raw, forcedTipo = null) {
    if (!raw) return null;

    const tipo = normalizeTipoVenta(
        forcedTipo ||
        raw.TipoVenta ||
        raw.tipoVenta ||
        raw.Tipo ||
        (raw.IdVenta ? "ELECTRO" : "INDUMENTARIA")
    );

    const id = raw.Id ?? raw.id ?? raw.ID ?? raw.IdVenta ?? 0;

    const productosRaw = raw.Productos || raw.Items || [];
    const historialRaw = raw.Historial || raw.Pagos || [];

    return {
        ...raw,
        Id: id,
        TipoVenta: tipo,
        Fecha: raw.Fecha ?? raw.FechaVenta ?? raw.FechaCobro ?? null,
        Entrega: Number(raw.Entrega || 0),
        Restante: Number(raw.Restante || 0),
        Cliente:
            raw.Cliente ??
            raw.ClienteNombre ??
            raw.NombreCliente ??
            raw.ClienteDescripcion ??
            raw.ClienteNombreCompleto ??
            raw.Cliente?.Nombre ??
            null,
        Productos: Array.isArray(productosRaw) ? productosRaw.map(normalizeProducto).filter(Boolean) : [],
        Historial: Array.isArray(historialRaw) ? historialRaw.slice() : []
    };
}

/* ===== Requests ===== */
async function ajaxGet(url) {
    try {
        return await MakeAjax({ type: "GET", url, async: true, dataType: "json" });
    } catch (e) { console.error(e); return null; }
}
async function ajaxPost(url, data) {
    try {
        return await MakeAjax({
            type: "POST",
            url,
            async: true,
            data: JSON.stringify(data || {}),
            contentType: "application/json",
            dataType: "json"
        });
    } catch (e) { console.error(e); return null; }
}

/* ===== Resolución central de detalle/head ===== */
async function fetchVentaDetalle(id, tipo = null) {
    try {
        const t = normalizeTipoVenta(tipo);

        if (t) {
            const r = await ajaxGet(`/Ventas/VentaDetalle?id=${id}&tipo=${tipo}`);
            const data = r?.data || r || null;
            return normalizeDetalleResponse(data, t);
        }

        let r = await ajaxGet(`/Ventas/VentaDetalle?id=${id}&tipo=INDUMENTARIA`);
        let data = r?.data || r || null;
        let det = normalizeDetalleResponse(data, "INDUMENTARIA");
        if (det && det.Id) return det;

        r = await ajaxGet(`/Ventas/VentaDetalle?id=${id}&tipo=ELECTRO`);
        data = r?.data || r || null;
        det = normalizeDetalleResponse(data, "ELECTRO");
        if (det && det.Id) return det;

        return null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

/* ===== Overlay export ===== */
function ensureExportOverlay() {
    if (q$("#exportOverlay")) return;
    document.body.insertAdjacentHTML("beforeend", `
    <div class="export-overlay" id="exportOverlay" style="display:none;">
      <div class="export-box">
        <div class="spinner"></div>
        <div id="exportMsg">Generando PDF...</div>
      </div>
    </div>`);
}
function showOverlay(msg) {
    ensureExportOverlay();
    q$("#exportMsg").textContent = msg || "Trabajando…";
    q$("#exportOverlay").style.display = "flex";
}
function hideOverlay() {
    const el = q$("#exportOverlay");
    if (el) el.style.display = "none";
}

/* ===== Boot ===== */
$(document).ready(async function () {
    const appEl = $("#infoVentasApp");

    APP.clienteId = appEl.data("cliente-id") ? parseInt(appEl.data("cliente-id"), 10) : null;
    APP.ventaSelId = appEl.data("venta-id") ? parseInt(appEl.data("venta-id"), 10) : null;
    APP.tipoSel = appEl.data("tipo") ? normalizeTipoVenta(appEl.data("tipo")) : null;
    APP.modo = (appEl.data("modo") || "").toLowerCase() || null;
    APP.from = (appEl.data("from") || "").toLowerCase() || null;

    wireGlobal();

    if (!APP.modo) APP.modo = APP.ventaSelId ? "una" : "todas";

    try {
        if (APP.modo === "una") {
            if (!APP.ventaSelId) {
                alert("Falta Id de venta.");
                return;
            }
            await renderSoloUna(APP.ventaSelId);
        } else {
            if (!APP.clienteId) {
                alert("Falta Id de cliente.");
                return;
            }
            await renderTodas(APP.clienteId, APP.ventaSelId || null);
        }
    } catch (e) {
        console.error(e);
        alert("Ocurrió un error cargando las ventas.");
    }

    $(document).on("input", "#Int_Valor", function () {
        const pos = this.selectionStart, len = this.value.length;
        this.value = formatearMiles(this.value);
        const diff = this.value.length - len;
        this.setSelectionRange(pos + diff, pos + diff);
    });

    $("#btnGuardarInteres").on("click", guardarInteres);
});
/* ===== Topbar ===== */
function wireGlobal() {
    const saved = localStorage.getItem("infoVentas_swSaldadas");
    const sw = q$("#swSaldadas");
    if (sw) sw.checked = saved === "1";

    $("#swSaldadas").off().on("change", async function () {
        localStorage.setItem("infoVentas_swSaldadas", this.checked ? "1" : "0");

        const reopenId = APP.currentVentaOpen || null;
        await applyFilterAndRender(reopenId);

        if (reopenId) {
            const exists = APP.ventasFiltradas.some(v => getVentaUniqueId(v) === reopenId);
            if (exists) await toggleVenta(reopenId, true);
        }
    });

    $("#btnExportPdf").off().on("click", async function () {
        if (!APP.ventasFiltradas.length) {
            alert("No hay ventas para exportar.");
            return;
        }
        await exportarVentasVisibles();
    });

    $("#btnRefrescar").off().on("click", async function () {
        const reopenId = APP.currentVentaOpen || null;
        if (APP.modo === "una" && APP.ventaSelId) await renderSoloUna(APP.ventaSelId);
        else if (APP.modo === "todas" && APP.clienteId) await renderTodas(APP.clienteId, reopenId);
    });
}

/* ===== Modo: una ===== */
async function renderSoloUna(ventaId) {

    $("#switchSaldadasWrap").hide();

    const box = q$("#ventasAccordion");
    box.innerHTML = "";

    const uniqueId = APP.tipoSel
        ? `${APP.tipoSel}_${ventaId}`
        : ventaId;

    const head = await getVentaHead(uniqueId);

    if (!head) {
        $("#emptyState").show();
        return;
    }

    APP.ventasCache = [head];

    box.insertAdjacentHTML("beforeend", buildVentaItem(head));
    attachVentaHeaderEvents(getVentaUniqueId(head));

    await toggleVenta(getVentaUniqueId(head), true);
}
/* ===== Modo: todas ===== */
async function renderTodas(clienteId, ventaSeleccionada = null) {
    $("#switchSaldadasWrap").show();

    const box = q$("#ventasAccordion");
    box.innerHTML = "";
    $("#emptyState").hide();

    const r = await ajaxGet(`/Ventas/RestanteVentasCliente?idCliente=${clienteId}`);
    const data = r?.data ?? r ?? [];
    const ventas = Array.isArray(data)
        ? data.map(normalizeVentaItem).filter(Boolean)
        : [];

    APP.ventasCache = ventas;

    if (!ventas.length) {
        const st = q$("#swStats");
        if (st) {
            st.innerHTML = `
                <span class="chip-all">Todas 0</span>
                <span class="chip-ok">Saldadas 0</span>
                <span class="chip-pend">Pendientes 0</span>
            `;
        }

        box.innerHTML = `
            <div class="empty-ventas-box">
                <div class="empty-ventas-icon">
                    <i class="bi bi-receipt-cutoff"></i>
                </div>
                <div class="empty-ventas-title">Este cliente no tiene ventas</div>
                <div class="empty-ventas-text">Cuando se registren ventas, aparecerán acá.</div>
            </div>
        `;

        const t = q$("#clienteNombreTop");
        if (t) t.textContent = "—";

        return;
    }

    ventas.sort((a, b) => {
        const fa = a.Fecha ? new Date(a.Fecha) : new Date(0);
        const fb = b.Fecha ? new Date(b.Fecha) : new Date(0);
        if (fb - fa !== 0) return fb - fa;

        const ta = normalizeTipoVenta(a?.TipoVenta || a?.tipoVenta || a?.Tipo || "");
        const tb = normalizeTipoVenta(b?.TipoVenta || b?.tipoVenta || b?.Tipo || "");
        if (tb.localeCompare(ta) !== 0) return tb.localeCompare(ta);

        return (b.Id || 0) - (a.Id || 0);
    });

    setTituloCliente(ventas[0]);

    let uniqueOpen = null;
    if (ventaSeleccionada != null) {
        if (typeof ventaSeleccionada === "string" && ventaSeleccionada.includes("_")) {
            uniqueOpen = ventaSeleccionada;
        } else {
            const firstMatch = ventas.find(x => Number(x.Id || 0) === Number(ventaSeleccionada));
            if (firstMatch) uniqueOpen = getVentaUniqueId(firstMatch);
        }
    }

    await applyFilterAndRender(uniqueOpen);
}
async function applyFilterAndRender(ventaSeleccionada = null) {
    const box = q$("#ventasAccordion");
    box.innerHTML = "";

    const incluirSaldadas = q$("#swSaldadas")?.checked ?? false;

    const totales = APP.ventasCache.length;
    const noSaldadas = APP.ventasCache.filter(v => Number(v.Restante || 0) > 0).length;
    const saldadas = totales - noSaldadas;

    APP.ventasFiltradas = APP.ventasCache.filter(v => {
        const rest = Number(v.Restante || 0);
        return incluirSaldadas ? true : rest > 0;
    });

    const st = q$("#swStats");
    if (st) {
        st.innerHTML = incluirSaldadas
            ? `<span class="chip-all">Todas ${totales}</span><span class="chip-ok">Saldadas ${saldadas}</span><span class="chip-pend">Pendientes ${noSaldadas}</span>`
            : `<span class="chip-pend">Pendientes ${noSaldadas}</span><span class="chip-ok">Saldadas ${saldadas}</span>`;
    }

    if (!APP.ventasFiltradas.length) {
        box.innerHTML = `
        <div class="empty-ventas-box">
            <div class="empty-ventas-icon">
                <i class="bi bi-funnel"></i>
            </div>
            <div class="empty-ventas-title">No hay ventas para mostrar</div>
            <div class="empty-ventas-text">Probá desactivando el filtro de pendientes/saldadas.</div>
        </div>
    `;
        $("#emptyState").hide();
        return;
    }

    $("#emptyState").hide();

    APP.ventasFiltradas.forEach(v => {
        const uniqueId = getVentaUniqueId(v);
        box.insertAdjacentHTML("beforeend", buildVentaItem(v));
        attachVentaHeaderEvents(uniqueId);
    });

    const toOpen = ventaSeleccionada && APP.ventasCache.some(x => getVentaUniqueId(x) === ventaSeleccionada)
        ? ventaSeleccionada
        : null;

    if (toOpen) await toggleVenta(toOpen, true);
}

/* ===== Cliente ===== */
function setTituloCliente(head) {
    const name =
        head?.Venta?.Cliente ||
        head?.Cliente ||
        head?.ClienteNombre ||
        head?.NombreCliente ||
        head?.ClienteDescripcion ||
        head?.ClienteNombreCompleto ||
        head?.Cliente?.Nombre ||
        null;

    const t = q$("#clienteNombreTop");
    if (t) t.textContent = name || "—";
}

/* ===== Venta item ===== */
function buildVentaItem(v) {
    const vv = normalizeVentaItem(v);
    const rawId = vv.Id || vv.id || vv.ID;
    const uniqueId = getVentaUniqueId(vv);

    const fecha = vv.Fecha
        ? moment(vv.Fecha).format("DD/MM/YYYY")
        : (vv.FechaCobro ? moment(vv.FechaCobro).format("DD/MM/YYYY") : "-");

    const totalNum = Number(vv.Entrega || 0) + Number(vv.Restante || 0);
    const totalTxt = money(totalNum);
    const restante = money(vv.Restante || 0);
    const entrega = money(vv.Entrega || 0);

    const tipoClass = getTipoVentaClass(vv);
    const tipoLabel = getTipoVentaLabel(vv);
    const idVenta = rawId;

    const esElectro = isElectroVenta(vv);

    /* =========================
       🔒 ACCIONES SEGÚN TIPO
    ========================= */
    const accionesHtml = esElectro
        ? `
        <div class="venta-head-actions">
            <button class="venta-toggle" data-venta="${uniqueId}" title="Abrir/cerrar">
                <i class="bi bi-chevron-down"></i>
            </button>
        </div>
        `
        : `
        <div class="venta-head-actions">
            <button class="btn-icon" data-action="interes" title="Agregar interés" data-venta="${uniqueId}">
                <i class="bi bi-percent"></i>
            </button>

            <button class="btn-icon" data-action="pdf" title="Comprobante" data-venta="${uniqueId}">
                <i class="bi bi-filetype-pdf"></i>
            </button>

            <button class="venta-toggle" data-venta="${uniqueId}" title="Abrir/cerrar">
                <i class="bi bi-chevron-down"></i>
            </button>
        </div>
        `;

    return `
    <div class="venta-item ${tipoClass}" id="ventaItem_${uniqueId}">
        <div class="venta-head" data-venta="${uniqueId}">
            
            <div class="venta-head-main">

                <div class="venta-title-row">
                    <div class="venta-title">Fecha: ${fecha}</div>

                    <span class="venta-tipo-badge ${tipoClass}">
                        <i class="bi ${esElectro ? 'bi-tv' : 'bi-bag'}"></i>
                        ${tipoLabel}
                        <span class="venta-id">#${idVenta}</span>
                    </span>
                </div>

                <div class="venta-sub-grid">
                    <div class="mini-kpi">
                        <span class="mini-kpi-label">Total</span>
                        <span class="mini-kpi-value" id="totalVenta_${uniqueId}">${totalTxt}</span>
                    </div>

                    <div class="mini-kpi">
                        <span class="mini-kpi-label">Entrega</span>
                        <span class="mini-kpi-value">${entrega}</span>
                    </div>

                    <div class="mini-kpi mini-kpi-restante">
                        <span class="mini-kpi-label">Restante</span>
                        <span class="mini-kpi-value">${restante}</span>
                    </div>
                </div>

            </div>

            ${accionesHtml}

        </div>

        <div class="venta-body" id="ventaBody_${uniqueId}" style="display:none">
            <div class="venta-body-inner">

                <div class="card glass mb-3">
                    <div class="card-header sticky">
                        <i class="bi bi-bag me-2"></i>Productos
                    </div>
                    <div class="card-body" id="prodWrap_${uniqueId}">
                        <div class="skel" style="height:64px"></div>
                    </div>
                </div>

                <div class="card glass">
                    <div class="card-header sticky">
                        <i class="bi bi-clock-history me-2"></i>Historial
                    </div>
                    <div class="card-body" id="histWrap_${uniqueId}">
                        <div class="skel" style="height:64px"></div>
                    </div>
                </div>

            </div>
        </div>
    </div>`;
}

/* ===== Eventos ===== */
function attachVentaHeaderEvents(ventaUniqueId) {
    $(`[data-action="pdf"][data-venta="${ventaUniqueId}"]`).off().on("click", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        await exportarUnaVenta(ventaUniqueId);
    });

    $(`[data-action="interes"][data-venta="${ventaUniqueId}"]`).off().on("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        abrirModalInteres(ventaUniqueId);
    });

    $(`.venta-toggle[data-venta="${ventaUniqueId}"]`).off().on("click", async function (e) {
        e.preventDefault();
        e.stopPropagation();

        const uniqueId = this.getAttribute("data-venta");
        const isOpen = q$(`#ventaItem_${uniqueId}`)?.classList.contains("open");
        await toggleVenta(uniqueId, !isOpen);
    });

    $(`.venta-head[data-venta="${ventaUniqueId}"]`).off("click.body").on("click.body", async function (e) {
        if (e.target.closest(".btn-icon") || e.target.closest(".venta-toggle")) return;

        const uniqueId = this.getAttribute("data-venta");
        const isOpen = q$(`#ventaItem_${uniqueId}`)?.classList.contains("open");
        await toggleVenta(uniqueId, !isOpen);
    });
}

/* ===== Toggle ===== */
async function toggleVenta(ventaUniqueId, abrir) {
    const item = q$(`#ventaItem_${ventaUniqueId}`);
    const body = q$(`#ventaBody_${ventaUniqueId}`);
    const icon = q$(`.venta-toggle[data-venta="${ventaUniqueId}"] i`);

    if (!item || !body) return;

    if (abrir) {
        item.classList.add("open");
        body.style.display = "block";
        if (icon) {
            icon.classList.remove("bi-chevron-down");
            icon.classList.add("bi-chevron-up");
        }
        APP.currentVentaOpen = ventaUniqueId;

        if (!APP.detalleCache[ventaUniqueId]) await cargarDetalles(ventaUniqueId);
    } else {
        item.classList.remove("open");
        body.style.display = "none";
        if (icon) {
            icon.classList.remove("bi-chevron-up");
            icon.classList.add("bi-chevron-down");
        }
        if (APP.currentVentaOpen === ventaUniqueId) APP.currentVentaOpen = null;
    }
}

/* ===== Detalles ===== */
async function cargarDetalles(ventaUniqueId) {
    try {
        const { id, tipo } = parseVentaUniqueId(ventaUniqueId);

        q$(`#prodWrap_${ventaUniqueId}`).innerHTML = `<div class="skel" style="height:64px"></div>`;
        q$(`#histWrap_${ventaUniqueId}`).innerHTML = `<div class="skel" style="height:64px"></div>`;

        const det = await fetchVentaDetalle(id, tipo);
        if (!det) throw new Error("No se encontró el detalle de la venta.");

        const productos = det?.Productos || [];
        const historial = det?.Historial || [];

        historial.sort((a, b) => {
            const fa = a.Fecha ? new Date(a.Fecha) : new Date(0);
            const fb = b.Fecha ? new Date(b.Fecha) : new Date(0);
            return fb - fa;
        });

        APP.detalleCache[ventaUniqueId] = {
            productos,
            historial,
            head: det
        };

        renderProductos(ventaUniqueId, productos);
        renderHistorial(ventaUniqueId, historial);

    } catch (e) {
        console.error(e);

        q$(`#prodWrap_${ventaUniqueId}`).innerHTML =
            `<div class="text-danger">Error al cargar productos.</div>`;

        q$(`#histWrap_${ventaUniqueId}`).innerHTML =
            `<div class="text-danger">Error al cargar historial.</div>`;
    }
}

/* ===== Productos ===== */
function renderProductos(ventaUniqueId, lista) {
    const wrap = q$(`#prodWrap_${ventaUniqueId}`);
    if (!wrap) return;

    if (!lista || !lista.length) {
        wrap.innerHTML = `<div class="text-muted">Sin productos.</div>`;
        return;
    }

    let html = `<div class="productos-lista">`;
    let subtotal = 0;

    lista.forEach(pp => {
        const p = normalizeProducto(pp);

        const cant = p.Cantidad || 0;
        const precio = Number(p.PrecioTotal || 0);
        const linea = cant * precio;
        subtotal += linea;

        const idProd = p.IdProducto || null;
        const imgId = `imgp_${ventaUniqueId}_${idProd || Math.random().toString(36).slice(2)}`;

        html += `
        <div class="product-item">
            <img id="${imgId}" class="product-img" src="/Imagenes/productosdefault.png" alt="img"/>
            <div class="product-center">
                <div class="product-name">${escapeHtml(p.Producto || "-")}</div>
                <div class="product-meta">Cantidad: ${cant} • Unitario: ${money(precio)}</div>
            </div>
            <div class="product-total">${money(linea)}</div>
        </div>`;

        if (idProd) setTimeout(() => cargarImgProducto(imgId, idProd), 0);
    });

    html += `
        <div class="productos-footer">
            <b>Total productos:</b>
            <span>${money(subtotal)}</span>
        </div>
    </div>`;

    wrap.innerHTML = html;
}

function cargarImgProducto(imgElId, idProducto) {
    $.ajax({
        url: '/Productos/ObtenerImagen/' + idProducto,
        type: 'GET',
        xhr: function () {
            const x = new XMLHttpRequest();
            x.responseType = 'blob';
            return x;
        },
        success: function (blob, status, xhr) {
            const ct = xhr.getResponseHeader("Content-Type") || "";
            const el = document.getElementById(imgElId);
            if (!el) return;

            if (ct.includes("image")) {
                try {
                    const url = URL.createObjectURL(blob);
                    el.onload = () => { try { URL.revokeObjectURL(url); } catch { } };
                    el.src = url;
                } catch {
                    el.src = "/Imagenes/productosdefault.png";
                }
            } else {
                el.src = "/Imagenes/productosdefault.png";
            }
        },
        error: function () {
            const el = document.getElementById(imgElId);
            if (el) el.src = "/Imagenes/productosdefault.png";
        }
    });
}

/* ===== Historial ===== */
function tipoInfo(h) {
    if ((h.Interes || 0) > 0) return "interes";
    if ((h.Entrega || 0) > 0) return "cobro";
    const d = (h.Descripcion || h.Observacion || "").toLowerCase();
    if (d.includes("venta")) return "venta";
    return "obs";
}
function chipFecha(fecha, h) {
    const t = tipoInfo(h);
    const cls = t === "interes" ? "chip-interes"
        : t === "cobro" ? "chip-cobro"
            : t === "venta" ? "chip-venta"
                : "chip-obs";

    return `<span class="chip-date ${cls}">${fecha}</span>`;
}

function renderHistorial(ventaUniqueId, list) {
    const wrap = q$(`#histWrap_${ventaUniqueId}`);
    if (!wrap) return;

    if (!list || !list.length) {
        wrap.innerHTML = `<div class="text-muted">Sin movimientos.</div>`;
        return;
    }

    const ventaObj = getVentaByUniqueId(ventaUniqueId) || APP.detalleCache[ventaUniqueId]?.head || null;

    const ts = (h) => {
        if (h.Fecha) return new Date(h.Fecha).getTime();
        if (h.P_FechaCobro) return new Date(h.P_FechaCobro).getTime();
        return 0;
    };

    list = list.slice().sort((a, b) => (ts(b) - ts(a)) || ((b.Id || 0) - (a.Id || 0)));

    const isMobile = window.innerWidth <= 768;

    /* =========================
       📱 MOBILE → CARDS
    ========================= */
    if (isMobile) {

        const cards = list.map(h => {
            const fecha = h.Fecha ? moment(h.Fecha).format("DD/MM/YYYY") : "-";
            const desc = h.Descripcion || h.Observacion || (h.Interes > 0 ? "Interés" : "—");
            const cobr = h.Cobrador || "N/A";
            const ent = money(h.Entrega || 0);
            const inte = money(h.Interes || 0);
            const rest = money(h.Restante || 0);
            const idInf = h.Id || 0;

            const esVenta = (desc || "").toLowerCase().includes("venta");
            const esElectro = isElectroVenta(ventaObj);

            const btnDel = ((userSession?.IdRol === 1) && !esVenta && !esElectro)
                ? `<button class="btn-icon btn-del-info" data-info-id="${idInf}" data-venta-id="${ventaUniqueId}">
                        <i class="bi bi-trash"></i>
                   </button>`
                : "";

            return `
            <div class="hist-card" data-info-id="${idInf}" data-venta-id="${ventaUniqueId}">

                <div class="hist-card-top">
                    ${chipFecha(fecha, h)}
                    ${btnDel}
                </div>

                <div class="hist-desc">${escapeHtml(desc)}</div>

                <div class="hist-grid">
                    <div>
                        <span>Cobrador</span>
                        <b>${escapeHtml(cobr)}</b>
                    </div>
                    <div>
                        <span>Entrega</span>
                        <b>${ent}</b>
                    </div>
                    <div>
                        <span>Interés</span>
                        <b>${inte}</b>
                    </div>
                    <div>
                        <span>Restante</span>
                        <b>${rest}</b>
                    </div>
                </div>

            </div>`;
        }).join("");

        wrap.innerHTML = `<div class="hist-mobile">${cards}</div>`;
        return;
    }

    /* =========================
       💻 DESKTOP → TABLA ORIGINAL
    ========================= */

    const rows = list.map(h => {
        const fecha = h.Fecha ? moment(h.Fecha).format("DD/MM/YYYY") : "-";
        const desc = h.Descripcion || h.Observacion || (h.Interes > 0 ? "Interés" : "—");
        const cobr = h.Cobrador || "N/A";
        const ent = money(h.Entrega || 0);
        const inte = money(h.Interes || 0);
        const rest = money(h.Restante || 0);
        const idInf = h.Id || 0;

        const esVenta = (desc || "").toLowerCase().includes("venta");
        const esElectro = isElectroVenta(ventaObj);

        const btnDel = ((userSession?.IdRol === 1) && !esVenta && !esElectro)
            ? `<button class="btn-icon btn-del-info" data-info-id="${idInf}" data-venta-id="${ventaUniqueId}">
                   <i class="bi bi-trash"></i>
               </button>`
            : "";

        return `
        <tr data-info-id="${idInf}" data-venta-id="${ventaUniqueId}">
            <td>${chipFecha(fecha, h)}</td>
            <td>${escapeHtml(desc)}</td>
            <td>${escapeHtml(cobr)}</td>
            <td>${ent}</td>
            <td>${inte}</td>
            <td>${rest}</td>
            <td class="text-center">${btnDel}</td>
        </tr>`;
    }).join("");

    wrap.innerHTML = `
    <div class="table-responsive">
        <table class="table-mini">
            <colgroup>
                <col class="col-fecha">
                <col class="col-desc">
                <col class="col-cobr">
                <col class="col-imp">
                <col class="col-imp">
                <col class="col-imp">
                <col class="col-acc">
            </colgroup>
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Cobrador</th>
                    <th>Entrega</th>
                    <th>Interés</th>
                    <th>Restante</th>
                    <th class="text-center">Acc.</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
}

/* ===== Venta head ===== */
async function getVentaHead(ventaUniqueId) {
    const { id, tipo } = parseVentaUniqueId(ventaUniqueId);
    return await fetchVentaDetalle(id, tipo);
}

async function actualizarVistaVenta(ventaUniqueId) {
    try {
        const current = getVentaByUniqueId(ventaUniqueId) || APP.detalleCache[ventaUniqueId]?.head || null;
        if (!current) return;

        const det = await fetchVentaDetalle(current.Id, current.TipoVenta);
        if (!det) return;

        const title = q$(`#ventaItem_${ventaUniqueId} .venta-title`);
        const fecha = det.Fecha
            ? moment(det.Fecha).format("DD/MM/YYYY")
            : "-";

        if (title) title.textContent = `Fecha: ${fecha}`;

        const total = Number(det.Restante || 0) + Number(det.Entrega || 0);
        const totalEl = q$(`#totalVenta_${ventaUniqueId}`);
        if (totalEl) totalEl.textContent = money(total);

        const restEl = q$(`#ventaItem_${ventaUniqueId} .mini-kpi-restante .mini-kpi-value`);
        if (restEl) restEl.textContent = money(det.Restante || 0);

        const idx = APP.ventasCache.findIndex(x => getVentaUniqueId(x) === ventaUniqueId);
        if (idx >= 0) {
            APP.ventasCache[idx] = normalizeVentaItem({ ...APP.ventasCache[idx], ...det });
        }

        APP.detalleCache[ventaUniqueId] = {
            ...(APP.detalleCache[ventaUniqueId] || {}),
            head: det,
            productos: det.Productos || APP.detalleCache[ventaUniqueId]?.productos || [],
            historial: det.Historial || APP.detalleCache[ventaUniqueId]?.historial || []
        };
    } catch (e) {
        console.warn("No pude refrescar header de venta", e);
    }
}

/* ===== PDF ===== */
function buildFacturaFromDetalle(det) {
    const productos = (det?.Productos || []).map(p => ({
        Producto: p.Producto || "-",
        Cantidad: p.Cantidad || 0,
        PrecioTotal: Number(p.PrecioTotal || 0)
    }));

    return {
        Venta: {
            Cliente: det?.Cliente || "cliente",
            Entrega: det?.Entrega || 0,
            Restante: det?.Restante || 0,
            Vendedor: det?.Vendedor || "-",
            P_FechaCobro: det?.P_FechaCobro || det?.Fecha || null,
            P_ValorCuota: det?.P_ValorCuota || 0
        },
        Productos: productos
    };
}

function drawVentaEnDoc(doc, factura) {
    doc.setFontSize(32);
    doc.setTextColor(115, 195, 178);
    doc.text('Comprobante', 80, 20, 'right');

    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text('Documento no válido como factura', 80, 28, 'right');
    doc.text(`Fecha: ${moment().format('DD/MM/YYYY')}`, 80, 35, 'right');

    doc.setFontSize(32);
    doc.setTextColor(115, 195, 178);
    doc.text(`David Godoy`, 10, 60);
    doc.setTextColor(0);
    doc.setFontSize(12);

    const vendedor = factura?.Venta?.Vendedor || "-";
    const pfCobro = factura?.Venta?.P_FechaCobro ? moment(factura.Venta.P_FechaCobro).format('DD/MM/YYYY') : "-";
    const pVCuota = factura?.Venta?.P_ValorCuota || 0;
    doc.text(`Indumentaria Dg`, 10, 70);
    doc.text(`Vendedor: ${vendedor}`, 10, 78);
    doc.text(`Primer Fecha de Cobro: ${pfCobro}`, 10, 86);
    doc.text(`Primer Valor cuota: ${money(pVCuota)}`, 90, 86);

    let y = 90;
    doc.setFontSize(12);
    doc.setFillColor(115, 195, 178);
    doc.rect(10, y, 190, 10, 'F');
    doc.text('ARTICULO', 12, 98);
    doc.text('CANT', 102, 98);
    doc.text('PRECIO', 142, 98);
    doc.text('Total', 182, 98);
    y = 108;

    let zebra = false, total = 0;
    (factura?.Productos || []).forEach(item => {
        const linea = (item.PrecioTotal || 0) * (item.Cantidad || 0);
        total += linea;

        if (zebra) {
            doc.setFillColor(232, 238, 237);
            doc.rect(10, y - 7, 190, 10, 'F');
        }
        zebra = !zebra;

        doc.text(item.Producto || "-", 12, y);
        doc.text(String(item.Cantidad || 0), 107, y);
        doc.text(money(item.PrecioTotal || 0), 147, y);
        doc.text(money(linea), 180, y);

        doc.setLineWidth(.5);
        doc.line(10, y + 3, 200, y + 3);
        y += 10;
        if (y > 260) {
            doc.addPage();
            y = 20;
        }
    });

    doc.setFontSize(14);
    doc.text(`SUBTOTAL: ${money(total)}`, 150, y);
    doc.text(`ENTREGA: ${money(factura?.Venta?.Entrega || 0)}`, 150, y + 10);
    doc.text(`RESTANTE: ${money(total - (factura?.Venta?.Entrega || 0))}`, 150, y + 20);

    doc.setFontSize(12);
    doc.text(`¿Alguna Pregunta?`, 10, y + 40);
    doc.text(`Envianos un Whatssap al (54 9)  3777 71-0884`, 10, y + 45);

    doc.setFontSize(32);
    doc.setTextColor(115, 195, 178);
    doc.text(`¡Gracias!`, 150, y + 40);
    doc.setTextColor(0);
}

async function exportarUnaVenta(ventaId) {
    try {
        const { id, tipo } = parseVentaUniqueId(ventaId);

        showOverlay("Generando PDF de la venta…");

        let factura = null;

        if (normalizeTipoVenta(tipo) === "INDUMENTARIA") {
            const r = await ajaxPost("/Ventas/InformacionVentayProductos", { Id: id });
            if (r?.Venta || r?.Productos) {
                factura = r;
            }
        }

        if (!factura) {
            const det = await fetchVentaDetalle(id, tipo);
            if (det) factura = buildFacturaFromDetalle(det);
        }

        if (!factura) {
            hideOverlay();
            return alert("No se pudo obtener la venta.");
        }

        const doc = new jsPDF();
        drawVentaEnDoc(doc, factura);

        const nombre = (factura?.Venta?.Cliente || "cliente")
            .toString()
            .replace(/[^\w\s\-]+/g, "")
            .trim()
            .replace(/\s+/g, "_");

        doc.save(`comprobante_${nombre}_venta_${id}.pdf`);
    } catch (e) {
        console.error(e);
        alert("Error generando el PDF.");
    } finally {
        hideOverlay();
    }
}

async function exportarVentasVisibles() {
    try {
        if (!APP.ventasFiltradas.length) return alert("No hay ventas para exportar.");

        showOverlay(`Generando PDF (0 / ${APP.ventasFiltradas.length})…`);
        const doc = new jsPDF();
        let first = true;

        for (let i = 0; i < APP.ventasFiltradas.length; i++) {
            const v = APP.ventasFiltradas[i];
            const uniqueId = getVentaUniqueId(v);

            q$("#exportMsg").textContent = `Generando PDF (${i + 1} / ${APP.ventasFiltradas.length})…`;

            let factura = null;

            if (normalizeTipoVenta(v.TipoVenta) === "INDUMENTARIA") {
                const r = await ajaxPost("/Ventas/InformacionVentayProductos", { Id: v.Id });
                if (r?.Venta || r?.Productos) {
                    factura = r;
                }
            }

            if (!factura) {
                const det = await fetchVentaDetalle(v.Id, v.TipoVenta);
                if (det) factura = buildFacturaFromDetalle(det);
            }

            if (!factura) continue;

            if (!first) doc.addPage();
            drawVentaEnDoc(doc, factura);
            first = false;
        }

        const name = (APP.ventasFiltradas[0]?.Cliente || "cliente")
            .toString()
            .replace(/[^\w\s\-]+/g, "")
            .trim()
            .replace(/\s+/g, "_");

        doc.save(`comprobantes_${name}.pdf`);
    } catch (e) {
        console.error(e);
        alert("Error generando el PDF.");
    } finally {
        hideOverlay();
    }
}

/* ===== Interés ===== */
function abrirModalInteres(idVenta) {
    try {
        const { id } = parseVentaUniqueId(idVenta);
        $("#Int_IdVenta").val(id);
        $("#Int_Valor").val("0");
        $("#Int_Tipo").val("");
        $("#Int_Obs").val("");
        $("#Int_Errores").addClass("d-none").empty();
        $("#interesModal").modal("show");
    } catch (e) {
        console.error(e);
    }
}

async function guardarInteres() {
    try {
        const idVenta = parseInt($("#Int_IdVenta").val(), 10);
        const valor = formatearSinMiles($("#Int_Valor").val() || "0");
        const tipo = ($("#Int_Tipo").val() || "").trim();
        const obs = ($("#Int_Obs").val() || "").trim();

        const errBox = $("#Int_Errores");
        errBox.addClass("d-none").empty();
        const errs = [];

        if (!idVenta) errs.push("Falta Id de venta.");
        if (valor <= 0) errs.push("El importe del interés debe ser mayor a cero.");
        if (!tipo) errs.push("Seleccioná el tipo de interés.");

        if (errs.length) {
            errBox.removeClass("d-none").html(errs.map(e => `<div>• ${e}</div>`).join(""));
            return;
        }

        const resp = await ajaxPost("/Ventas/AgregarInteresDesdeInfo", {
            IdVenta: idVenta,
            ValorInteres: valor,
            Tipo: tipo,
            Obs: obs
        });

        if (!resp || resp.success === false) {
            const msg = resp?.message || "No se pudo registrar el interés.";
            errBox.removeClass("d-none").html(`• ${msg}`);
            return;
        }

        $("#interesModal").modal("hide");

        let uniqueId = APP.currentVentaOpen;
        if (!uniqueId || parseVentaUniqueId(uniqueId).id !== idVenta) {
            const v = APP.ventasCache.find(x => Number(x.Id || 0) === Number(idVenta));
            uniqueId = v ? getVentaUniqueId(v) : buildVentaUniqueId("INDUMENTARIA", idVenta);
        }

        delete APP.detalleCache[uniqueId];
        await actualizarVistaVenta(uniqueId);

        const isOpen = q$(`#ventaItem_${uniqueId}`)?.classList.contains("open");
        if (isOpen) {
            await toggleVenta(uniqueId, false);
            await toggleVenta(uniqueId, true);
        }

        alert("Interés agregado correctamente.");
    } catch (e) {
        console.error(e);
        const errBox = $("#Int_Errores");
        errBox.removeClass("d-none").html("• Error inesperado al guardar el interés.");
    }
}

/* ===== Eliminar info ===== */
$(document).on("click", ".btn-del-info", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    const infoId = parseInt(this.getAttribute("data-info-id"), 10);
    const ventaId = this.getAttribute("data-venta-id");
    await eliminarInformacion(infoId, ventaId);
});

async function eliminarInformacion(idInfo, ventaUniqueId) {
    if (!idInfo) return;

    const ok = confirm("¿Eliminar este registro de la información de la venta?");
    if (!ok) return;

    try {
        const resp = await ajaxPost("/Ventas/EliminarInformacionVenta", { id: idInfo });
        if (!resp || resp.success === false) {
            alert(resp?.message || "No se pudo eliminar.");
            return;
        }

        delete APP.detalleCache[ventaUniqueId];
        await actualizarVistaVenta(ventaUniqueId);

        const isOpen = q$(`#ventaItem_${ventaUniqueId}`)?.classList.contains("open");
        if (isOpen) {
            await toggleVenta(ventaUniqueId, false);
            await toggleVenta(ventaUniqueId, true);
        }

        alert("Registro eliminado correctamente.");
    } catch (err) {
        console.error(err);
        alert("Error eliminando el registro.");
    }
}