/* =========================================================
   InformacionVenta.js — Solo Info + Intereses + PDF
   ========================================================= */

let APP = {
    modo: null,              // "una" | "todas"
    clienteId: null,
    ventaSelId: null,
    from: null,

    ventasCache: [],         // TODAS las ventas del cliente (una vez)
    ventasFiltradas: [],     // vista actual según "saldadas"
    detalleCache: {},        // { [ventaId]: { productos, historial, head } }
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

async function ajaxGet(url) {
    try {
        return await MakeAjax({ type: "GET", url, async: true, dataType: "json" });
    } catch (e) { console.error(e); return null; }
}
async function ajaxPost(url, data) {
    try {
        return await MakeAjax({ type: "POST", url, async: true, data: JSON.stringify(data || {}), contentType: "application/json", dataType: "json" });
    } catch (e) { console.error(e); return null; }
}

/* ===== Overlay export ===== */
function ensureExportOverlay() {
    if (q$("#exportOverlay")) return;
    document.body.insertAdjacentHTML("beforeend", `
    <div class="export-overlay" id="exportOverlay" style="display:none;position:fixed;inset:0;background:rgba(2,6,23,.6);z-index:2147483647;backdrop-filter:blur(2px)">
      <div class="export-box" style="display:flex;flex-direction:column;gap:.75rem;align-items:center;justify-content:center;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#0b1220;border:1px solid rgba(255,255,255,.12);color:#e5e7eb;border-radius:14px;padding:18px 22px;min-width:260px">
        <div class="spinner" style="width:22px;height:22px;border:3px solid rgba(255,255,255,.15);border-top-color:#60a5fa;border-radius:50%;animation:spin .8s linear infinite"></div>
        <div id="exportMsg">Generando PDF...</div>
      </div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `);
}
function showOverlay(msg) { ensureExportOverlay(); q$("#exportMsg").textContent = msg || "Trabajando…"; q$("#exportOverlay").style.display = "flex"; }
function hideOverlay() { const el = q$("#exportOverlay"); if (el) el.style.display = "none"; }

/* ===== Boot ===== */
$(document).ready(async function () {
    const appEl = $("#infoVentasApp");
    APP.clienteId = appEl.data("cliente-id") ? parseInt(appEl.data("cliente-id"), 10) : null;
    APP.ventaSelId = appEl.data("venta-id") ? parseInt(appEl.data("venta-id"), 10) : null;
    APP.modo = (appEl.data("modo") || "").toLowerCase() || null;
    APP.from = (appEl.data("from") || "").toLowerCase() || null;

    wireGlobal();

    if (!APP.modo) APP.modo = APP.ventaSelId ? "una" : "todas";

    try {
        if (APP.modo === "una") {
            if (!APP.ventaSelId) { alert("Falta Id de venta."); return; }
            await renderSoloUna(APP.ventaSelId);
        } else {
            if (!APP.clienteId) { alert("Falta Id de cliente."); return; }
            await renderTodas(APP.clienteId, APP.ventaSelId || null);
        }
    } catch (e) {
        console.error(e);
        alert("Ocurrió un error cargando las ventas.");
    }

    // ======= Modal Interés =======
    // miles en el importe
    $(document).on("input", "#Int_Valor", function () {
        const pos = this.selectionStart, len = this.value.length;
        this.value = formatearMiles(this.value);
        const diff = this.value.length - len;
        this.setSelectionRange(pos + diff, pos + diff);
    });

    // Guardar interés
    $("#btnGuardarInteres").on("click", guardarInteres);
});

/* ===== Global topbar ===== */
function wireGlobal() {
    // init “Mostrar saldadas” desde localStorage
    const saved = localStorage.getItem("infoVentas_swSaldadas");
    const sw = q$("#swSaldadas");
    if (sw) sw.checked = saved === "1";

    $("#swSaldadas").off().on("change", async function () {
        localStorage.setItem("infoVentas_swSaldadas", this.checked ? "1" : "0");

        // preservamos cuál está abierta
        const reopenId = APP.currentVentaOpen || null;
        await applyFilterAndRender(reopenId);
        if (reopenId) {
            // si sigue existiendo, la reabrimos
            const exists = APP.ventasFiltradas.some(v => v.Id === reopenId);
            if (exists) await toggleVenta(reopenId, true);
        }
    });

    $("#btnExportPdf").off().on("click", async function () {
        if (!APP.ventasFiltradas.length) { alert("No hay ventas para exportar."); return; }
        await exportarVentasVisibles();
    });

    $("#btnRefrescar").off().on("click", async function () {
        // refresco respetando el filtro
        const reopenId = APP.currentVentaOpen || null;
        if (APP.modo === "una" && APP.ventaSelId) await renderSoloUna(APP.ventaSelId);
        else if (APP.modo === "todas" && APP.clienteId) await renderTodas(APP.clienteId, reopenId);
    });
}

/* ===== Modo: una venta ===== */
async function renderSoloUna(ventaId) {
    $("#switchSaldadasWrap").hide();
    const box = q$("#ventasAccordion"); box.innerHTML = "";
    const head = await getVentaHead(ventaId);
    if (!head) { $("#emptyState").show(); return; }
    setTituloCliente(head);
    box.insertAdjacentHTML("beforeend", buildVentaItem(head));
    attachVentaHeaderEvents(head.Id);
    await toggleVenta(head.Id, true);
}

/* ===== Modo: todas ===== */
async function renderTodas(clienteId, ventaSeleccionada = null) {
    $("#switchSaldadasWrap").show();
    const box = q$("#ventasAccordion"); box.innerHTML = "";
    $("#emptyState").hide();

    // 1 sola llamada para traer TODAS las ventas del cliente
    const r = await ajaxGet(`/Ventas/RestanteVentasCliente?idCliente=${clienteId}`);
    const ventas = (r?.data || r || []).slice();

    // orden: por fecha desc, luego id desc
    ventas.sort((a, b) => {
        const fa = a.Fecha ? new Date(a.Fecha) : new Date(0);
        const fb = b.Fecha ? new Date(b.Fecha) : new Date(0);
        if (fb - fa !== 0) return fb - fa;
        return (b.Id || 0) - (a.Id || 0);
    });

    APP.ventasCache = ventas;
    if (ventas.length) setTituloCliente(ventas[0]);

    await applyFilterAndRender(ventaSeleccionada);
}

function applyFilterAndRender(ventaSeleccionada = null) {
    const box = q$("#ventasAccordion"); box.innerHTML = "";

    const incluirSaldadas = q$("#swSaldadas")?.checked ?? false;

    // stats
    const totales = APP.ventasCache.length;
    const noSaldadas = APP.ventasCache.filter(v => Number(v.Restante || 0) > 0).length;
    const saldadas = totales - noSaldadas;

    APP.ventasFiltradas = APP.ventasCache.filter(v => {
        const rest = Number(v.Restante || 0);
        return incluirSaldadas ? true : rest > 0;
    });

    // pill con contadores
    const st = q$("#swStats");
    if (st) st.innerHTML = incluirSaldadas
        ? `<span class="chip-all">Todas ${totales}</span> · <span class="chip-ok">Saldadas ${saldadas}</span> · <span class="chip-pend">Pendientes ${noSaldadas}</span>`
        : `<span class="chip-pend">Pendientes ${noSaldadas}</span> · <span class="chip-ok">Saldadas ${saldadas}</span>`;

    if (!APP.ventasFiltradas.length) { $("#emptyState").show(); return; }
    $("#emptyState").hide();

    APP.ventasFiltradas.forEach(v => {
        box.insertAdjacentHTML("beforeend", buildVentaItem(v));
        attachVentaHeaderEvents(v.Id);
    });

    const toOpen = ventaSeleccionada && APP.ventasCache.some(x => x.Id === ventaSeleccionada)
        ? ventaSeleccionada : null;
    if (toOpen) toggleVenta(toOpen, true);
}

/* ===== Header title con nombre de cliente ===== */
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


/* ===== Item ===== */
function buildVentaItem(v) {
    const id = v.Id || v.id || v.ID;
    const fecha = v.Fecha ? moment(v.Fecha).format("DD/MM/YYYY") : (v.FechaCobro ? moment(v.FechaCobro).format("DD/MM/YYYY") : "-");
    // Total visible SIEMPRE: Entrega + Restante
    const totalNum = Number(v.Entrega || 0) + Number(v.Restante || 0);
    const totalTxt = money(totalNum);
    const restante = money(v.Restante || 0);

    return `
  <div class="venta-item" id="ventaItem_${id}">
    <div class="venta-head" data-venta="${id}">
      <div class="title-wrap">
        <div class="venta-title">Fecha: ${fecha}</div>
        <div class="venta-sub">Total: <span id="totalVenta_${id}">${totalTxt}</span></div>
      </div>

      <div class="spacer"></div>

      <div class="restante-pill">Restante ${restante}</div>

      <button class="btn-icon ms-2" data-action="interes" title="Agregar interés" data-venta="${id}">
        <i class="bi bi-percent"></i>
      </button>
      <button class="btn-icon ms-1" data-action="pdf" title="Comprobante" data-venta="${id}">
        <i class="bi bi-filetype-pdf"></i>
      </button>
      <button class="venta-toggle ms-1" data-venta="${id}" title="Abrir/cerrar">
        <i class="bi bi-chevron-down"></i>
      </button>
    </div>

    <div class="venta-body" id="ventaBody_${id}" style="display:none">
      <div class="p-3">
        <div class="card glass mb-3">
          <div class="card-header sticky"><i class="bi bi-bag me-2"></i>Productos</div>
          <div class="card-body" id="prodWrap_${id}">
            <div class="skel" style="height:64px"></div>
          </div>
        </div>

        <div class="card glass">
          <div class="card-header sticky"><i class="bi bi-clock-history me-2"></i>Historial</div>
          <div class="card-body" id="histWrap_${id}">
            <div class="skel" style="height:64px"></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ===== Eventos por item ===== */
function attachVentaHeaderEvents(ventaId) {
    // PDF único
    $(`[data-action="pdf"][data-venta="${ventaId}"]`).off().on("click", async function (e) {
        e.preventDefault(); e.stopPropagation();
        await exportarUnaVenta(ventaId);
    });

    // Abrir modal de Interés
    $(`[data-action="interes"][data-venta="${ventaId}"]`).off().on("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        abrirModalInteres(ventaId);
    });

    // Toggle por flecha
    $(`.venta-toggle[data-venta="${ventaId}"]`).off().on("click", async function (e) {
        e.preventDefault(); e.stopPropagation();
        const id = parseInt(this.getAttribute("data-venta"), 10);
        const isOpen = q$(`#ventaItem_${id}`).classList.contains("open");
        await toggleVenta(id, !isOpen);
    });

    // Toggle banda
    $(`.venta-head[data-venta="${ventaId}"]`).off("click.body").on("click.body", async function (e) {
        if (e.target.closest(".btn-icon") || e.target.closest(".venta-toggle")) return;
        const id = parseInt(this.getAttribute("data-venta"), 10);
        const isOpen = q$(`#ventaItem_${id}`).classList.contains("open");
        await toggleVenta(id, !isOpen);
    });
}

/* ===== Abrir / cerrar ===== */
async function toggleVenta(ventaId, abrir) {
    const item = q$(`#ventaItem_${ventaId}`);
    const body = q$(`#ventaBody_${ventaId}`);
    const icon = q$(`.venta-toggle[data-venta="${ventaId}"] i`);
    if (!item || !body) return;

    if (abrir) {
        item.classList.add("open");
        body.style.display = "block";
        if (icon) { icon.classList.remove("bi-chevron-down"); icon.classList.add("bi-chevron-up"); }
        APP.currentVentaOpen = ventaId;
        if (!APP.detalleCache[ventaId]) await cargarDetalles(ventaId);
    } else {
        item.classList.remove("open");
        body.style.display = "none";
        if (icon) { icon.classList.remove("bi-chevron-up"); icon.classList.add("bi-chevron-down"); }
        if (APP.currentVentaOpen === ventaId) APP.currentVentaOpen = null;
    }
}


/* ===== Detalles ===== */
async function cargarDetalles(ventaId) {
    try {
        q$(`#prodWrap_${ventaId}`).innerHTML = `<div class="skel" style="height:64px"></div>`;
        q$(`#histWrap_${ventaId}`).innerHTML = `<div class="skel" style="height:64px"></div>`;

        const det = await ajaxGet(`/Ventas/VentaDetalle?id=${ventaId}`);
        const productos = det?.data?.Productos || det?.Productos || [];

        const histWrap = await ajaxGet(`/Ventas/ListarInformacionVenta?id=${ventaId}`);
        let historial = histWrap?.data || histWrap || [];

        historial.sort((a, b) => {
            const fa = a.Fecha ? new Date(a.Fecha) : new Date(0);
            const fb = b.Fecha ? new Date(b.Fecha) : new Date(0);
            return fb - fa;
        });

        APP.detalleCache[ventaId] = { productos, historial, head: await getVentaHead(ventaId) };

        renderProductos(ventaId, productos);
        renderHistorial(ventaId, historial);
    } catch (e) {
        console.error(e);
        q$(`#prodWrap_${ventaId}`).innerHTML = `<div class="text-danger">Error al cargar productos.</div>`;
        q$(`#histWrap_${ventaId}`).innerHTML = `<div class="text-danger">Error al cargar historial.</div>`;
    }
}

/* ===== Productos (con fix imágenes) ===== */
function renderProductos(ventaId, lista) {
    const wrap = q$(`#prodWrap_${ventaId}`); if (!wrap) return;

    if (!lista || !lista.length) {
        wrap.innerHTML = `<div class="text-muted">Sin productos.</div>`;
        return;
    }

    let html = "";
    let subtotal = 0;

    lista.forEach(p => {
        const cant = p.Cantidad || 0;
        const precio = Number(p.PrecioTotal || 0);
        const linea = cant * precio;
        subtotal += linea;

        const idProd = p.IdProducto || p.IDProducto || p.ProductoId || null;
        const imgId = `imgp_${ventaId}_${idProd || Math.random().toString(36).slice(2)}`;

        html += `
      <div class="product-item">
        <img id="${imgId}" class="product-img" src="/Imagenes/productosdefault.png" alt="img"/>
        <div>
          <div class="product-name">${p.Producto || "-"}</div>
          <div class="product-meta">x${cant} • ${money(precio)}</div>
        </div>
        <div class="product-total">${money(linea)}</div>
      </div>`;

        // cargar imagen real (blob) si hay IdProducto
        if (idProd) setTimeout(() => cargarImgProducto(imgId, idProd), 0);
    });

    html += `<div class="d-flex justify-content-end mt-2"><b>Total productos:&nbsp;</b> ${money(subtotal)}</div>`;
    wrap.innerHTML = html;
}

function cargarImgProducto(imgElId, idProducto) {
    $.ajax({
        url: '/Productos/ObtenerImagen/' + idProducto,
        type: 'GET',
        xhr: function () { const x = new XMLHttpRequest(); x.responseType = 'blob'; return x; },
        success: function (blob, status, xhr) {
            const ct = xhr.getResponseHeader("Content-Type") || "";
            const el = document.getElementById(imgElId);
            if (!el) return;
            if (ct.includes("image")) {
                try {
                    const url = URL.createObjectURL(blob);
                    el.onload = () => { try { URL.revokeObjectURL(url); } catch { } };
                    el.src = url;
                } catch { el.src = "/Imagenes/productosdefault.png"; }
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
    const cls = t === "interes" ? "chip-interes" : t === "cobro" ? "chip-cobro" : t === "venta" ? "chip-venta" : "chip-obs";
    return `<span class="chip-date ${cls}">${fecha}</span>`;
}

function renderHistorial(ventaId, list) {
    const wrap = q$(`#histWrap_${ventaId}`);
    if (!wrap) return;

    if (!list || !list.length) {
        wrap.innerHTML = `<div class="text-muted">Sin movimientos.</div>`;
        return;
    }

    // --- ORDENAR: más nuevo primero ---
    const ts = (h) => {
        // usa Fecha; si no viene, probá algún otro campo o caé en 0
        if (h.Fecha) return new Date(h.Fecha).getTime();
        if (h.P_FechaCobro) return new Date(h.P_FechaCobro).getTime();
        return 0;
    };
    // copia + sort desc (fecha desc; de empate, Id desc)
    list = list.slice().sort((a, b) => (ts(b) - ts(a)) || ((b.Id || 0) - (a.Id || 0)));
    // -----------------------------------

    const rows = list.map(h => {
        const fecha = h.Fecha ? moment(h.Fecha).format("DD/MM/YYYY") : "-";
        const desc = h.Descripcion || h.Observacion || (h.Interes > 0 ? "Interés" : "—");
        const cobr = h.Cobrador || "N/A";
        const ent = money(h.Entrega || 0);
        const inte = money(h.Interes || 0);
        const rest = money(h.Restante || 0);
        const idInf = h.Id || 0;

        // misma regla vieja: si contiene "Venta" NO se muestra el botón
        const esVenta = (desc || "").toLowerCase().includes("venta");
        const puedeBorrar = (userSession?.IdRol === 1) && !esVenta; // IdRol==1 admin; vendedor no

        const btnDel = puedeBorrar
            ? `<button class="btn-icon btn-del-info" title="Eliminar"
                   data-info-id="${idInf}" data-venta-id="${ventaId}">
           <i class="bi bi-trash"></i>
         </button>`
            : "";

        return `
      <tr data-info-id="${idInf}" data-venta-id="${ventaId}">
        <td>${chipFecha(fecha, h)}</td>
        <td>${desc}</td>
        <td>${cobr}</td>
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

/* ===== Header / Venta head ===== */
async function getVentaHead(ventaId) {
    try {
        const r = await ajaxPost("/Ventas/EditarVenta", { id: ventaId });
        return r?.data || null;
    } catch (e) { console.error(e); return null; }
}

async function actualizarVistaVenta(idVenta) {
    try {
        // refresco rápido del header y restante
        const res = await ajaxPost("/Ventas/InformacionVentayProductos", { Id: idVenta });
        if (!res || !res.Venta) return;

        const pill = q$(`#ventaItem_${idVenta} .restante-pill`);
        if (pill) pill.textContent = `Restante ${money(res.Venta.Restante || 0)}`;

        const fecha = res.Venta.Fecha ? moment(res.Venta.Fecha).format("DD/MM/YYYY") :
            (res.Venta.FechaCobro ? moment(res.Venta.FechaCobro).format("DD/MM/YYYY") : "-");
        const title = q$(`#ventaItem_${idVenta} .venta-title`);
        if (title) title.textContent = `Fecha: ${fecha}`;

        // Total visible siempre = Entrega + Restante
        const total = Number(res.Venta.Restante || 0) + Number(res.Venta.Entrega || 0);
        const el = q$(`#totalVenta_${idVenta}`); if (el) el.textContent = money(total);
    } catch (e) {
        console.warn("No pude refrescar header de venta", e);
    }
}

/* ===== Exportación PDF ===== */
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
    doc.text('ARTICULO', 12, 98); doc.text('CANT', 102, 98); doc.text('PRECIO', 142, 98); doc.text('Total', 182, 98);
    y = 108;

    let zebra = false, total = 0;
    (factura?.Productos || []).forEach(item => {
        const linea = (item.PrecioTotal || 0) * (item.Cantidad || 0);
        total += linea;

        if (zebra) { doc.setFillColor(232, 238, 237); doc.rect(10, y - 7, 190, 10, 'F'); }
        zebra = !zebra;

        doc.text(item.Producto || "-", 12, y);
        doc.text(String(item.Cantidad || 0), 107, y);
        doc.text(money(item.PrecioTotal || 0), 147, y);
        doc.text(money(linea), 180, y);

        doc.setLineWidth(.5); doc.line(10, y + 3, 200, y + 3);
        y += 10; if (y > 260) { doc.addPage(); y = 20; }
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
        showOverlay("Generando PDF de la venta…");
        const r = await ajaxPost("/Ventas/InformacionVentayProductos", { Id: ventaId });
        if (!r) { hideOverlay(); return alert("No se pudo obtener la venta."); }
        const doc = new jsPDF();
        drawVentaEnDoc(doc, r);
        const nombre = (r?.Venta?.Cliente || "cliente").toString().replace(/[^\w\s\-]+/g, "").trim().replace(/\s+/g, "_");
        doc.save(`comprobante_${nombre}_venta_${ventaId}.pdf`);
    } catch (e) {
        console.error(e); alert("Error generando el PDF.");
    } finally { hideOverlay(); }
}

async function exportarVentasVisibles() {
    try {
        if (!APP.ventasFiltradas.length) return alert("No hay ventas para exportar.");
        showOverlay(`Generando PDF (0 / ${APP.ventasFiltradas.length})…`);
        const doc = new jsPDF(); let first = true;

        for (let i = 0; i < APP.ventasFiltradas.length; i++) {
            const v = APP.ventasFiltradas[i];
            q$("#exportMsg").textContent = `Generando PDF (${i + 1} / ${APP.ventasFiltradas.length})…`;
            const r = await ajaxPost("/Ventas/InformacionVentayProductos", { Id: v.Id });
            if (!first) doc.addPage();
            drawVentaEnDoc(doc, r); first = false;
        }
        const name = (APP.ventasFiltradas[0]?.Cliente || "cliente").toString().replace(/[^\w\s\-]+/g, "").trim().replace(/\s+/g, "_");
        doc.save(`comprobantes_${name}.pdf`);
    } catch (e) { console.error(e); alert("Error generando el PDF."); }
    finally { hideOverlay(); }
}

/* =========================================================
   INTERÉS
   ========================================================= */
function abrirModalInteres(idVenta) {
    try {
        $("#Int_IdVenta").val(idVenta);
        $("#Int_Valor").val("0");
        $("#Int_Tipo").val("");
        $("#Int_Obs").val("");
        $("#Int_Errores").addClass("d-none").empty();
        $("#interesModal").modal("show");
    } catch (e) { console.error(e); }
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

        if (errs.length) { errBox.removeClass("d-none").html(errs.map(e => `<div>• ${e}</div>`).join("")); return; }

        // POST -> Model
        const resp = await ajaxPost("/Ventas/AgregarInteresDesdeInfo", { IdVenta: idVenta, ValorInteres: valor, Tipo: tipo, Obs: obs });
        if (!resp || resp.success === false) {
            const msg = resp?.message || "No se pudo registrar el interés.";
            errBox.removeClass("d-none").html(`• ${msg}`);
            return;
        }

        // ok: refresco la vista puntual
        $("#interesModal").modal("hide");
        delete APP.detalleCache[idVenta];
        await actualizarVistaVenta(idVenta);
        // si está abierta, recargo sus detalles
        const isOpen = q$(`#ventaItem_${idVenta}`)?.classList.contains("open");
        if (isOpen) {
            await toggleVenta(idVenta, false);
            await toggleVenta(idVenta, true);
        }
        alert("Interés agregado correctamente.");
    } catch (e) {
        console.error(e);
        const errBox = $("#Int_Errores");
        errBox.removeClass("d-none").html("• Error inesperado al guardar el interés.");
    }
}


// Delegación: click en Eliminar
$(document).on("click", ".btn-del-info", async function (e) {
    e.preventDefault(); e.stopPropagation();
    const infoId = parseInt(this.getAttribute("data-info-id"), 10);
    const ventaId = parseInt(this.getAttribute("data-venta-id"), 10);
    await eliminarInformacion(infoId, ventaId);
});

async function eliminarInformacion(idInfo, idVenta) {
    if (!idInfo) return;

    const ok = confirm("¿Eliminar este registro de la información de la venta?");
    if (!ok) return;

    try {
        // Ajustá la URL si tu acción se llama distinto
        const resp = await ajaxPost("/Ventas/EliminarInformacionVenta", { id: idInfo });
        if (!resp || resp.success === false) {
            alert(resp?.message || "No se pudo eliminar.");
            return;
        }

        // limpiar cache y refrescar la vista puntual
        delete APP.detalleCache[idVenta];
        await actualizarVistaVenta(idVenta);

        // si la venta está abierta, recargo sus detalles
        const isOpen = q$(`#ventaItem_${idVenta}`)?.classList.contains("open");
        if (isOpen) {
            await toggleVenta(idVenta, false);
            await toggleVenta(idVenta, true);
        }

        alert("Registro eliminado correctamente.");
    } catch (err) {
        console.error(err);
        alert("Error eliminando el registro.");
    }
}
