const RA_COLORS = ["#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#f472b6", "#fb7185", "#22d3ee", "#a78bfa", "#4ade80", "#f59e0b"];
const raCharts = [];
const raChartsById = {};
const raBuscarValores = {};
const RA_FILTER_ITEMS = ".ra-vend-card, .ra-bar-row, .ra-rank-row, .ra-podium-card, .ra-hero-card, li";
const RA_LS_ORDEN = "raAnalisis.ordenSecciones";
const RA_LS_COLLAPSE = "raAnalisis.colapsadas";
const RA_LS_SORT = "raAnalisis.sort";
const RA_SEC_DEFAULT = ["periodo", "vendedor", "encero", "menos", "kpis", "destacados", "insights", "falencias", "evolucion", "metodos", "topventas", "topcobros", "ranking", "clienteventa", "clientecobro", "cuentas", "ausentes"];
const RA_STR_KEYS = { nombre: 1, texto: 1 };
let raLastAnalisis = null;
let raSortState = {};
let raKpiItems = [];

const RA_SEC_SORT = {
    vendedor: [
        { v: "fiado", t: "Fiado" },
        { v: "pctVencido", t: "% vencido" },
        { v: "vencido", t: "Vencido" },
        { v: "cobrado", t: "Cobrado" },
        { v: "vendio", t: "Vendió" },
        { v: "pctCobranza", t: "% cobranza" },
        { v: "nombre", t: "Nombre" }
    ],
    encero: [
        { v: "importe", t: "Importe" },
        { v: "dias", t: "Días" },
        { v: "fecha", t: "Fecha" },
        { v: "nombre", t: "Nombre" }
    ],
    menos: [
        { v: "importe", t: "Importe" },
        { v: "ultimaVenta", t: "Última venta" },
        { v: "nombre", t: "Nombre" }
    ],
    kpis: [
        { v: "valor", t: "Valor" },
        { v: "nombre", t: "Nombre" }
    ],
    destacados: [
        { v: "score", t: "Score / monto" },
        { v: "nombre", t: "Nombre" }
    ],
    insights: [
        { v: "original", t: "Original" },
        { v: "texto", t: "Texto" }
    ],
    falencias: [
        { v: "original", t: "Original" },
        { v: "texto", t: "Texto" }
    ],
    metodos: [
        { v: "importe", t: "Importe" },
        { v: "nombre", t: "Nombre" }
    ],
    topventas: [
        { v: "importe", t: "Ventas" },
        { v: "nombre", t: "Nombre" }
    ],
    topcobros: [
        { v: "importe", t: "Cobros" },
        { v: "nombre", t: "Nombre" }
    ],
    ranking: [
        { v: "score", t: "Score" },
        { v: "ventas", t: "Ventas" },
        { v: "cobros", t: "Cobros" },
        { v: "nombre", t: "Nombre" }
    ],
    clienteventa: [
        { v: "importe", t: "Importe" },
        { v: "cantidad", t: "Operaciones" },
        { v: "nombre", t: "Nombre" }
    ],
    clientecobro: [
        { v: "importe", t: "Importe" },
        { v: "cantidad", t: "Cobros" },
        { v: "nombre", t: "Nombre" }
    ],
    cuentas: [
        { v: "importe", t: "Importe" },
        { v: "porcentaje", t: "Porcentaje" },
        { v: "nombre", t: "Nombre" }
    ],
    ausentes: [
        { v: "cantidad", t: "Ausentes" },
        { v: "nombre", t: "Nombre" }
    ]
};

const RA_SORT_DEFAULT = {
    vendedor: { key: "fiado", dir: "desc" },
    encero: { key: "importe", dir: "desc" },
    menos: { key: "importe", dir: "asc" },
    kpis: { key: "valor", dir: "desc" },
    destacados: { key: "score", dir: "desc" },
    insights: { key: "original", dir: "asc" },
    falencias: { key: "original", dir: "asc" },
    metodos: { key: "importe", dir: "desc" },
    topventas: { key: "importe", dir: "desc" },
    topcobros: { key: "importe", dir: "desc" },
    ranking: { key: "score", dir: "desc" },
    clienteventa: { key: "importe", dir: "desc" },
    clientecobro: { key: "importe", dir: "desc" },
    cuentas: { key: "importe", dir: "desc" },
    ausentes: { key: "cantidad", dir: "desc" }
};

function raGet(o, pascal, camel) {
    if (!o) return undefined;
    if (o[pascal] != null && o[pascal] !== "") return o[pascal];
    if (camel && o[camel] != null && o[camel] !== "") return o[camel];
    if (o[pascal] != null) return o[pascal];
    if (camel && o[camel] != null) return o[camel];
    return undefined;
}

function raStr(o, pascal, camel) {
    const v = raGet(o, pascal, camel);
    return v == null ? "" : String(v);
}

function raNum(o, pascal, camel) {
    const n = Number(raGet(o, pascal, camel));
    return isNaN(n) ? 0 : n;
}

function raParseFecha(s) {
    if (!s) return 0;
    const str = String(s).trim();
    const p = str.split(/[\/\-]/);
    if (p.length === 3 && str.indexOf("/") >= 0)
        return new Date(+p[2], (+p[1] || 1) - 1, +p[0] || 1).getTime() || 0;
    const t = Date.parse(str);
    return isNaN(t) ? 0 : t;
}

function raRowNombre(x) {
    if (x == null) return "";
    if (typeof x === "string") return x;
    return raStr(x, "Nombre", "nombre") || raStr(x, "label", "Label");
}

function raReadJson(key, fallback) {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

function raWriteJson(key, val) {
    try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) { }
}

function raGetSort(seccion) {
    const def = RA_SORT_DEFAULT[seccion] || { key: "nombre", dir: "desc" };
    const cur = raSortState[seccion];
    if (!cur) return { key: def.key, dir: def.dir };
    return { key: cur.key || def.key, dir: cur.dir || def.dir };
}

function raLoadSortState() {
    const saved = raReadJson(RA_LS_SORT, {}) || {};
    raSortState = {};
    Object.keys(RA_SORT_DEFAULT).forEach(function (id) {
        const def = RA_SORT_DEFAULT[id];
        const s = saved[id] || {};
        const keys = (RA_SEC_SORT[id] || []).map(function (o) { return o.v; });
        raSortState[id] = {
            key: keys.indexOf(s.key) >= 0 ? s.key : def.key,
            dir: s.dir === "asc" || s.dir === "desc" ? s.dir : def.dir
        };
    });
}

function raSaveSortState() {
    raWriteJson(RA_LS_SORT, raSortState);
}

const RA_SORT_GETTERS = {
    vendedor: {
        fiado: function (p) { return Number(p.Fiado) || 0; },
        pctVencido: function (p) { return Number(p.PctVencidoFiado) || 0; },
        vencido: function (p) { return Number(p.MontoVencido) || 0; },
        cobrado: function (p) { return Number(p.TotalCobros) || Number(p.CobradoPeriodoFiado) || 0; },
        vendio: function (p) { return Number(p.TotalVentas) || 0; },
        pctCobranza: function (p) { return Number(p.PctCobradoPeriodo) || 0; },
        nombre: raRowNombre
    },
    encero: {
        importe: function (c) { return raNum(c, "Importe", "importe"); },
        dias: function (c) { return raNum(c, "DiasDesdeCero", "diasDesdeCero"); },
        fecha: function (c) { return raParseFecha(raGet(c, "FechaCero", "fechaCero")); },
        nombre: raRowNombre
    },
    menos: {
        importe: function (c) { return raNum(c, "Importe", "importe"); },
        ultimaVenta: function (c) { return raParseFecha(raGet(c, "FechaUltimaVenta", "fechaUltimaVenta")); },
        nombre: raRowNombre
    },
    kpis: {
        valor: function (x) { return Number(x.sortVal) || 0; },
        nombre: function (x) { return x.label || ""; }
    },
    destacados: {
        score: function (x) { return Number(x.sortVal) || 0; },
        nombre: function (x) { return x.sortName || ""; }
    },
    insights: {
        original: function () { return 0; },
        texto: function (x) { return String(x || ""); }
    },
    falencias: {
        original: function () { return 0; },
        texto: function (x) { return String(x || ""); }
    },
    metodos: {
        importe: function (x) { return raNum(x, "Importe", "importe"); },
        nombre: raRowNombre
    },
    topventas: {
        importe: function (x) { return raNum(x, "TotalVentas", "totalVentas"); },
        nombre: raRowNombre
    },
    topcobros: {
        importe: function (x) { return raNum(x, "TotalCobros", "totalCobros"); },
        nombre: raRowNombre
    },
    ranking: {
        score: function (p) { return raNum(p, "Score", "score"); },
        ventas: function (p) { return raNum(p, "TotalVentas", "totalVentas"); },
        cobros: function (p) { return raNum(p, "TotalCobros", "totalCobros"); },
        nombre: raRowNombre
    },
    clienteventa: {
        importe: function (x) { return raNum(x, "Importe", "importe"); },
        cantidad: function (x) { return raNum(x, "Cantidad", "cantidad"); },
        nombre: raRowNombre
    },
    clientecobro: {
        importe: function (x) { return raNum(x, "Importe", "importe"); },
        cantidad: function (x) { return raNum(x, "Cantidad", "cantidad"); },
        nombre: raRowNombre
    },
    cuentas: {
        importe: function (x) { return raNum(x, "Importe", "importe"); },
        porcentaje: function (x) { return raNum(x, "Porcentaje", "porcentaje"); },
        nombre: raRowNombre
    },
    ausentes: {
        cantidad: function (x) { return raNum(x, "CantOperaciones", "cantOperaciones"); },
        nombre: raRowNombre
    }
};

function raApplySort(list, seccion) {
    const arr = (list || []).slice();
    const getters = RA_SORT_GETTERS[seccion];
    if (!getters || !arr.length) return arr;
    const st = raGetSort(seccion);
    if (st.key === "original") return arr;
    const get = getters[st.key] || getters.nombre;
    const desc = st.dir === "desc";
    const str = !!RA_STR_KEYS[st.key];
    arr.sort(function (a, b) {
        const va = get(a);
        const vb = get(b);
        let cmp;
        if (str)
            cmp = String(va || "").localeCompare(String(vb || ""), "es", { sensitivity: "base" });
        else
            cmp = (Number(va) || 0) - (Number(vb) || 0);
        if (cmp === 0 && st.key !== "nombre")
            cmp = raRowNombre(a).localeCompare(raRowNombre(b), "es", { sensitivity: "base" });
        return desc ? -cmp : cmp;
    });
    return arr;
}

function raParam(name, fallback) {
    const q = new URLSearchParams(window.location.search);
    const v = q.get(name);
    return v == null || v === "" ? fallback : v;
}

function raMoney(n) {
    if (typeof formatNumber === "function") return formatNumber(n || 0);
    return "$" + Math.round(Number(n) || 0).toLocaleString("es-AR");
}

function raEsc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

$(document).ready(async function () {
    Chart.defaults.color = "#c5d2e6";
    Chart.defaults.borderColor = "rgba(255,255,255,.08)";
    Chart.defaults.font.family = "inherit";
    raLoadSortState();
    raMontarControlesSecciones();
    raAplicarOrdenGuardado();
    raAplicarColapsoGuardado();
    $(document).on("input", ".ra-buscar", function () {
        const key = this.getAttribute("data-ra-filter-target");
        if (key) raBuscarValores[key] = this.value || "";
        raAplicarFiltro(this);
    });
    $(document).on("change", ".ra-sort-select", function () {
        const sec = $(this).closest("[data-ra-seccion]").attr("data-ra-seccion");
        if (!sec) return;
        const cur = raGetSort(sec);
        raSortState[sec] = { key: this.value, dir: cur.dir };
        raSaveSortState();
        raRepintarSeccion(sec);
    });
    $(document).on("click", "[data-ra-sortdir]", function () {
        const sec = $(this).closest("[data-ra-seccion]").attr("data-ra-seccion");
        if (!sec) return;
        const cur = raGetSort(sec);
        raSortState[sec] = { key: cur.key, dir: cur.dir === "desc" ? "asc" : "desc" };
        raSaveSortState();
        raSyncSortUi(sec);
        raRepintarSeccion(sec);
    });
    $(document).on("click", "[data-ra-collapse]", function () {
        const $sec = $(this).closest("[data-ra-seccion]");
        $sec.toggleClass("is-collapsed");
        raSyncCollapseBtn($sec[0]);
        raSaveColapsadas();
        if (!$sec.hasClass("is-collapsed")) raResizeChartsIn($sec[0]);
    });
    $(document).on("click", "[data-ra-up]", function () {
        if (this.disabled) return;
        raMoverSeccion($(this).closest("[data-ra-seccion]").attr("data-ra-seccion"), -1);
    });
    $(document).on("click", "[data-ra-down]", function () {
        if (this.disabled) return;
        raMoverSeccion($(this).closest("[data-ra-seccion]").attr("data-ra-seccion"), 1);
    });
    await raInitFiltros();
    $("#raBtnAplicar").on("click", aplicarFiltrosAnalisis);
    $("#raFormFiltros").on("submit", function (e) {
        e.preventDefault();
        aplicarFiltrosAnalisis();
    });
    $("#raBtnHoy").on("click", function () {
        const hoy = momentFallback(0);
        $("#raFechaDesde").val(hoy);
        $("#raFechaHasta").val(hoy);
    });
    $("#raBtnMensual").on("click", function () {
        const d = new Date();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        $("#raFechaDesde").val(d.getFullYear() + "-" + m + "-01");
        $("#raFechaHasta").val(momentFallback(0));
    });
    $("#raMetodoPago").on("change", function () {
        raToggleCuenta();
        raCargarCuentas();
    });
    $("#raTipoNegocio").on("change", function () {
        raCargarVendedores();
    });
    $("#raEstadoUsuario").on("change", function () {
        raCargarVendedores();
    });
    await cargarAnalisisRendimiento();
});

function raMontarControlesSecciones() {
    document.querySelectorAll("#raContent [data-ra-seccion]").forEach(function (sec) {
        const id = sec.getAttribute("data-ra-seccion");
        let actions = sec.querySelector(".ra-sec-actions");
        if (!actions) {
            const toolbar = document.createElement("div");
            toolbar.className = "ra-sec-toolbar";
            actions = document.createElement("div");
            actions.className = "ra-sec-actions";
            toolbar.appendChild(actions);
            sec.insertBefore(toolbar, sec.firstChild);
        }
        if (RA_SEC_SORT[id] && !actions.querySelector(".ra-sort")) {
            const st = raGetSort(id);
            const opts = RA_SEC_SORT[id].map(function (o) {
                return '<option value="' + raEsc(o.v) + '"' + (o.v === st.key ? " selected" : "") + ">" + raEsc(o.t) + "</option>";
            }).join("");
            const wrap = document.createElement("div");
            wrap.className = "ra-sort";
            wrap.innerHTML = '<span class="ra-sort-lbl">Ordenar por</span>' +
                '<div class="ra-sort-row">' +
                '<select class="form-select ra-sort-select" aria-label="Ordenar por">' + opts + "</select>" +
                '<button type="button" class="ra-sec-icon" data-ra-sortdir title="Mayor a menor">' +
                '<i class="fa fa-sort-amount-desc"></i></button></div>';
            const search = actions.querySelector(".ra-buscar");
            if (search) actions.insertBefore(wrap, search.nextSibling);
            else actions.appendChild(wrap);
            raSyncSortUi(id);
        }
        if (!actions.querySelector("[data-ra-collapse]")) {
            actions.insertAdjacentHTML("beforeend",
                '<button type="button" class="ra-sec-icon" data-ra-collapse title="Plegar" aria-label="Plegar"><i class="fa fa-chevron-up"></i></button>' +
                '<button type="button" class="ra-sec-icon" data-ra-up title="Subir sección" aria-label="Subir"><i class="fa fa-arrow-up"></i></button>' +
                '<button type="button" class="ra-sec-icon" data-ra-down title="Bajar sección" aria-label="Bajar"><i class="fa fa-arrow-down"></i></button>');
        }
    });
    raUpdateMoveButtons();
}

function raSyncSortUi(seccion) {
    const sec = document.querySelector('#raContent [data-ra-seccion="' + seccion + '"]');
    if (!sec) return;
    const st = raGetSort(seccion);
    const sel = sec.querySelector(".ra-sort-select");
    if (sel && sel.value !== st.key) sel.value = st.key;
    const btn = sec.querySelector("[data-ra-sortdir]");
    if (!btn) return;
    const desc = st.dir === "desc";
    btn.title = desc ? "Mayor a menor" : "Menor a mayor";
    btn.setAttribute("aria-label", btn.title);
    const icon = btn.querySelector("i");
    if (icon) icon.className = "fa " + (desc ? "fa-sort-amount-desc" : "fa-sort-amount-asc");
}

function raSeccionesDom() {
    return Array.prototype.slice.call(document.querySelectorAll("#raContent [data-ra-seccion]"));
}

function raOrdenActual() {
    return raSeccionesDom().map(function (el) { return el.getAttribute("data-ra-seccion"); });
}

function raAplicarOrdenGuardado() {
    const root = document.getElementById("raContent");
    if (!root) return;
    const saved = raReadJson(RA_LS_ORDEN, null);
    const map = {};
    raSeccionesDom().forEach(function (el) { map[el.getAttribute("data-ra-seccion")] = el; });
    const order = [];
    const seen = {};
    (Array.isArray(saved) ? saved : []).concat(RA_SEC_DEFAULT).forEach(function (id) {
        if (map[id] && !seen[id]) {
            order.push(id);
            seen[id] = 1;
        }
    });
    order.forEach(function (id) { root.appendChild(map[id]); });
    raUpdateMoveButtons();
}

function raSaveOrden() {
    raWriteJson(RA_LS_ORDEN, raOrdenActual());
}

function raMoverSeccion(id, delta) {
    const root = document.getElementById("raContent");
    const list = raSeccionesDom();
    const idx = list.findIndex(function (el) { return el.getAttribute("data-ra-seccion") === id; });
    const dest = idx + delta;
    if (idx < 0 || dest < 0 || dest >= list.length) return;
    const el = list[idx];
    const other = list[dest];
    if (delta < 0) root.insertBefore(el, other);
    else root.insertBefore(other, el);
    raSaveOrden();
    raUpdateMoveButtons();
}

function raUpdateMoveButtons() {
    const list = raSeccionesDom();
    list.forEach(function (el, i) {
        const up = el.querySelector("[data-ra-up]");
        const down = el.querySelector("[data-ra-down]");
        if (up) up.disabled = i === 0;
        if (down) down.disabled = i === list.length - 1;
    });
}

function raAplicarColapsoGuardado() {
    const saved = raReadJson(RA_LS_COLLAPSE, {}) || {};
    raSeccionesDom().forEach(function (el) {
        const id = el.getAttribute("data-ra-seccion");
        el.classList.toggle("is-collapsed", !!saved[id]);
        raSyncCollapseBtn(el);
    });
}

function raSaveColapsadas() {
    const o = {};
    raSeccionesDom().forEach(function (el) {
        if (el.classList.contains("is-collapsed"))
            o[el.getAttribute("data-ra-seccion")] = true;
    });
    raWriteJson(RA_LS_COLLAPSE, o);
}

function raSyncCollapseBtn(sec) {
    if (!sec) return;
    const collapsed = sec.classList.contains("is-collapsed");
    const btn = sec.querySelector("[data-ra-collapse]");
    if (!btn) return;
    btn.title = collapsed ? "Desplegar" : "Plegar";
    btn.setAttribute("aria-label", btn.title);
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    const icon = btn.querySelector("i");
    if (icon) icon.className = "fa " + (collapsed ? "fa-chevron-down" : "fa-chevron-up");
}

function raResizeChartsIn(sec) {
    if (!sec || !window.Chart) return;
    $(sec).find("canvas").each(function () {
        const ch = raChartsById[this.id];
        if (ch && typeof ch.resize === "function") {
            try { ch.resize(); } catch (e) { }
        }
    });
}

function raRefiltrarSeccion(secId) {
    const sec = document.querySelector('#raContent [data-ra-seccion="' + secId + '"]');
    if (!sec) return;
    const input = sec.querySelector(".ra-buscar");
    if (input) raAplicarFiltro(input);
}

function raRepintarSeccion(secId) {
    const d = raLastAnalisis;
    if (!d) return;
    switch (secId) {
        case "vendedor": pintarPorVendedor(d); break;
        case "encero": pintarClientesCero(raGet(d, "ClientesEnCero", "clientesEnCero")); break;
        case "menos": pintarClientesMenos(raGet(d, "ClientesMenosCompra", "clientesMenosCompra")); break;
        case "kpis": pintarKpis(raGet(d, "Kpis", "kpis")); break;
        case "destacados": pintarDestacados(raGet(d, "Destacados", "destacados")); break;
        case "insights": pintarInsights(raGet(d, "Insights", "insights")); break;
        case "falencias": pintarFalencias(raGet(d, "Falencias", "falencias")); break;
        case "metodos": pintarChartMetodos(d); break;
        case "topventas": pintarRankingMonto("#raTopVentas", raGet(d, "TopVentas", "topVentas"), "topventas",
            function (p) { return raNum(p, "TotalVentas", "totalVentas"); },
            raNum(raGet(d, "Kpis", "kpis"), "TotalVentas", "totalVentas"), "venta"); break;
        case "topcobros": pintarRankingMonto("#raTopCobros", raGet(d, "TopCobros", "topCobros"), "topcobros",
            function (p) { return raNum(p, "TotalCobros", "totalCobros"); },
            raNum(raGet(d, "Kpis", "kpis"), "TotalCobros", "totalCobros"), "cobro"); break;
        case "ranking": pintarRanking(raGet(d, "RankingCompleto", "rankingCompleto")); break;
        case "clienteventa":
            pintarBarrasLista("#raClientesVenta", raGet(d, "TopClientesVenta", "topClientesVenta"),
                function (x) { return raNum(x, "Importe", "importe"); },
                function (x) { return raMoney(raGet(x, "Importe", "importe")) + " · " + raGet(x, "Cantidad", "cantidad") + " op."; },
                "clienteventa");
            break;
        case "clientecobro":
            pintarBarrasLista("#raClientesCobro", raGet(d, "TopClientesCobro", "topClientesCobro"),
                function (x) { return raNum(x, "Importe", "importe"); },
                function (x) { return raMoney(raGet(x, "Importe", "importe")) + " · " + raGet(x, "Cantidad", "cantidad") + " cobros"; },
                "clientecobro");
            break;
        case "cuentas":
            pintarBarrasLista("#raCuentas", raGet(d, "CuentasBancarias", "cuentasBancarias"),
                function (x) { return raNum(x, "Importe", "importe"); },
                function (x) { return raMoney(raGet(x, "Importe", "importe")) + " · " + raGet(x, "Porcentaje", "porcentaje") + "%"; },
                "cuentas");
            break;
        case "ausentes":
            pintarBarrasLista("#raAusentes", raGet(d, "AusentesPorCobrador", "ausentesPorCobrador"),
                function (x) { return raNum(x, "CantOperaciones", "cantOperaciones"); },
                function (x) { return raGet(x, "CantOperaciones", "cantOperaciones") + " ausentes"; },
                "ausentes");
            break;
        default: return;
    }
    raRefiltrarSeccion(secId);
}

async function raInitFiltros() {
    $("#raFechaDesde").val(raParam("fechaDesde", momentFallback(-30)));
    $("#raFechaHasta").val(raParam("fechaHasta", momentFallback(0)));
    await raCargarEstadosUsuario();
    const idEstado = raParam("idEstado", "1");
    if ($("#raEstadoUsuario option[value='" + idEstado + "']").length) $("#raEstadoUsuario").val(idEstado);
    else if ($("#raEstadoUsuario option[value='1']").length) $("#raEstadoUsuario").val("1");
    await raCargarTiposNegocio();
    const tipo = raParam("tipoNegocio", "-1");
    if ($("#raTipoNegocio option[value='" + tipo + "']").length) $("#raTipoNegocio").val(tipo);
    const metodo = raParam("metodoPago", "Todos");
    if ($("#raMetodoPago option[value='" + metodo + "']").length) $("#raMetodoPago").val(metodo);
    raToggleCuenta();
    await raCargarCuentas();
    const idCuenta = raParam("idCuenta", "-1");
    if ($("#raCuentaPago option[value='" + idCuenta + "']").length) $("#raCuentaPago").val(idCuenta);
    await raCargarVendedores();
    const idVendedor = raParam("idVendedor", "-1");
    if ($("#raVendedor option[value='" + idVendedor + "']").length) $("#raVendedor").val(idVendedor);
}

function raToggleCuenta() {
    const metodo = ($("#raMetodoPago").val() || "").toUpperCase();
    const show = metodo === "TRANSFERENCIA PROPIA" || metodo === "TRANSFERENCIA A TERCEROS";
    $("#raWrapCuenta").prop("hidden", !show);
    if (!show) $("#raCuentaPago").val("-1");
}

async function raCargarEstadosUsuario() {
    try {
        const result = await MakeAjax({
            type: "POST",
            url: "/Usuarios/ListarEstados",
            async: true,
            data: JSON.stringify({}),
            contentType: "application/json",
            dataType: "json"
        });
        const $sel = $("#raEstadoUsuario");
        $sel.find("option").remove();
        $sel.append('<option value="-1">Todos</option>');
        (result && result.data ? result.data : []).forEach(function (e) {
            $sel.append($("<option></option>").val(e.Id).text(e.Nombre));
        });
        if ($sel.find("option[value='1']").length) $sel.val("1");
    } catch (e) {
        console.error(e);
        const $sel = $("#raEstadoUsuario");
        if (!$sel.find("option").length) $sel.append('<option value="-1">Todos</option>');
    }
}

async function raCargarTiposNegocio() {
    try {
        const result = await MakeAjax({
            type: "POST",
            url: "/Usuarios/ListarTipoNegocio",
            async: true,
            data: JSON.stringify({}),
            contentType: "application/json",
            dataType: "json"
        });
        const $sel = $("#raTipoNegocio");
        $sel.find("option").remove();
        $sel.append('<option value="-1">Todos</option>');
        (result && result.data ? result.data : []).forEach(function (t) {
            $sel.append($("<option></option>").val(t.Id).text(t.Nombre));
        });
    } catch (e) {
        console.error(e);
    }
}

async function raCargarCuentas() {
    try {
        const metodo = $("#raMetodoPago option:selected").text() || "Todos";
        const result = await MakeAjax({
            type: "POST",
            url: "/Cobranzas/ListaCuentasBancarias",
            async: true,
            data: JSON.stringify({ metodopago: metodo }),
            contentType: "application/json",
            dataType: "json"
        });
        const $sel = $("#raCuentaPago");
        $sel.find("option").remove();
        $sel.append('<option value="-1">Todos</option>');
        (result || []).forEach(function (c) {
            $sel.append($("<option></option>").val(c.Id).text(c.Nombre));
        });
    } catch (e) {
        console.error(e);
    }
}

async function raCargarVendedores() {
    try {
        const tipo = parseInt($("#raTipoNegocio").val(), 10);
        const idEstado = parseInt($("#raEstadoUsuario").val(), 10);
        const result = await MakeAjax({
            type: "POST",
            url: "/Usuarios/ListarActivos",
            async: true,
            data: JSON.stringify({
                TipoNegocio: isNaN(tipo) ? -1 : tipo,
                idEstado: isNaN(idEstado) ? 1 : idEstado
            }),
            contentType: "application/json",
            dataType: "json"
        });
        const prev = $("#raVendedor").val() || "-1";
        const $sel = $("#raVendedor");
        $sel.find("option").remove();
        $sel.append('<option value="-1">Todos</option>');
        (result && result.data ? result.data : []).forEach(function (u) {
            const n = ((u.Nombre || "") + " " + (u.Apellido || "")).trim() || u.Usuario || ("#" + u.Id);
            $sel.append($("<option></option>").val(u.Id).text(n));
        });
        if ($sel.find("option[value='" + prev + "']").length) $sel.val(prev);
        else $sel.val("-1");
    } catch (e) {
        console.error(e);
    }
}

function raFiltrosActuales() {
    let fechaDesde = $("#raFechaDesde").val() || momentFallback(-30);
    let fechaHasta = $("#raFechaHasta").val() || momentFallback(0);
    if (fechaDesde > fechaHasta) {
        const tmp = fechaDesde;
        fechaDesde = fechaHasta;
        fechaHasta = tmp;
        $("#raFechaDesde").val(fechaDesde);
        $("#raFechaHasta").val(fechaHasta);
    }
    const metodoEl = document.getElementById("raMetodoPago");
    const metodoPago = metodoEl && metodoEl.selectedIndex >= 0 ? metodoEl.options[metodoEl.selectedIndex].text : "Todos";
    return {
        fechaDesde: fechaDesde,
        fechaHasta: fechaHasta,
        tipoNegocio: $("#raTipoNegocio").val() || "-1",
        metodoPago: metodoPago,
        idCuenta: $("#raCuentaPago").val() || "-1",
        idVendedor: $("#raVendedor").val() || "-1",
        idEstado: $("#raEstadoUsuario").val() || "1",
        comprobantesEnviados: raParam("comprobantesEnviados", "-1")
    };
}

function raSyncUrl(f) {
    const qs = new URLSearchParams({
        fechaDesde: f.fechaDesde,
        fechaHasta: f.fechaHasta,
        tipoNegocio: f.tipoNegocio,
        metodoPago: f.metodoPago,
        idCuenta: f.idCuenta,
        idVendedor: f.idVendedor,
        idEstado: f.idEstado,
        comprobantesEnviados: f.comprobantesEnviados
    });
    const url = window.location.pathname + "?" + qs.toString();
    if (window.history && window.history.replaceState) window.history.replaceState({}, "", url);
}

var raCargaXhr = null;

function aplicarFiltrosAnalisis() {
    const f = raFiltrosActuales();
    raSyncUrl(f);
    cargarAnalisisRendimiento();
}

function raAbortarCargaAnalisis() {
    if (typeof abortarXhrCargaTablas === "function") abortarXhrCargaTablas(raCargaXhr);
    else if (raCargaXhr && typeof raCargaXhr.abort === "function") {
        try { raCargaXhr.abort(); } catch (e) { /* ignore */ }
    }
}

async function cargarAnalisisRendimiento() {
    const f = raFiltrosActuales();
    raAbortarCargaAnalisis();
    $("#raContent").addClass("d-none");

    const genCarga = mostrarCargaTablas("Armando el análisis del período…", {
        abort: raAbortarCargaAnalisis,
        textoLento: function (segs) {
            return "La consulta lleva más de " + (typeof _textoDuracionCargaLenta === "function"
                ? _textoDuracionCargaLenta(segs)
                : (segs + " segundos")) +
                " y el análisis todavía no terminó. Puede seguir esperando o cancelar para cambiar los filtros e intentar de nuevo.";
        },
        onReiniciarFiltros: function () {
            $("#raContent").addClass("d-none");
            $("#raPeriodoLabel").text("Carga cancelada. Cambiá los filtros y pulsá Aplicar.");
            const form = document.getElementById("raFormFiltros");
            if (form && typeof form.scrollIntoView === "function") {
                form.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }
    });

    const xhr = $.get("/Rendimiento/ObtenerAnalisis", {
        fechadesde: f.fechaDesde,
        fechahasta: f.fechaHasta,
        tiponegocio: f.tipoNegocio,
        metodoPago: f.metodoPago,
        IdCuentaBancaria: f.idCuenta,
        idVendedor: f.idVendedor,
        idEstado: f.idEstado,
        comprobantesEnviados: f.comprobantesEnviados
    });
    raCargaXhr = xhr;

    try {
        const data = await xhr;
        if (typeof cargaTablasTokenActual === "function" && genCarga !== cargaTablasTokenActual()) return;
        pintarAnalisis(data);
        $("#raContent").removeClass("d-none");
        raSeccionesDom().forEach(function (el) {
            if (!el.classList.contains("is-collapsed")) raResizeChartsIn(el);
        });
    } catch (e) {
        if (typeof esAbortAjax === "function" && esAbortAjax(e)) return;
        const st = (e && (e.statusText || e.statusMessage)) || "";
        if (String(st).toLowerCase() === "abort") return;
        console.error(e);
        $("#raPeriodoLabel").text("No se pudo armar el análisis. Probá de nuevo o achicá el rango.");
    } finally {
        if (raCargaXhr === xhr) raCargaXhr = null;
        if (typeof ocultarCargaTablas === "function") ocultarCargaTablas(genCarga);
        else $("#globalLoading").addClass("hidden");
    }
}

function raDestroyChart(id) {
    const c = raChartsById[id];
    if (!c) return;
    try { c.destroy(); } catch (e) { }
    delete raChartsById[id];
    const i = raCharts.indexOf(c);
    if (i >= 0) raCharts.splice(i, 1);
}

function raRegisterChart(id, chart) {
    raDestroyChart(id);
    raChartsById[id] = chart;
    raCharts.push(chart);
}

function raDestroyCharts() {
    Object.keys(raChartsById).forEach(raDestroyChart);
    while (raCharts.length) {
        const c = raCharts.pop();
        try { if (c) c.destroy(); } catch (e) { }
    }
}

function momentFallback(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
}

function raGuardarBuscadores() {
    $(".ra-buscar").each(function () {
        const key = this.getAttribute("data-ra-filter-target");
        if (key) raBuscarValores[key] = this.value || "";
    });
}

function raAplicarFiltro(input) {
    if (!input) return;
    const sel = input.getAttribute("data-ra-filter-target");
    if (!sel) return;
    const root = document.querySelector(sel);
    if (!root) return;
    const q = (input.value || "").trim().toLowerCase();
    const items = root.querySelectorAll(RA_FILTER_ITEMS);
    let visibles = 0;
    items.forEach(function (el) {
        if (el.classList.contains("ra-filter-none")) return;
        const match = !q || (el.textContent || "").toLowerCase().indexOf(q) >= 0;
        el.classList.toggle("ra-filter-hide", !match);
        if (match) visibles++;
    });
    let empty = root.querySelector(".ra-filter-none");
    if (q && items.length && !visibles) {
        if (!empty) {
            empty = document.createElement(root.tagName === "UL" ? "li" : "div");
            empty.className = "ra-filter-none ra-empty";
            empty.textContent = "Sin coincidencias.";
            root.appendChild(empty);
        }
        empty.classList.remove("ra-filter-hide");
        empty.style.display = "";
    } else if (empty) {
        empty.classList.add("ra-filter-hide");
    }
}

function raRestaurarBuscadores() {
    $(".ra-buscar").each(function () {
        const key = this.getAttribute("data-ra-filter-target");
        if (key && Object.prototype.hasOwnProperty.call(raBuscarValores, key))
            this.value = raBuscarValores[key];
        raAplicarFiltro(this);
    });
}

function pintarAnalisis(d) {
    if (!d) return;
    raLastAnalisis = d;
    raGuardarBuscadores();
    raDestroyCharts();
    $("#raPeriodoLabel").text(raGet(d, "ResumenPeriodo", "resumenPeriodo") || (raGet(d, "FechaDesde", "fechaDesde") + " al " + raGet(d, "FechaHasta", "fechaHasta")));
    pintarResumenPeriodo(d);
    pintarPorVendedor(d);
    pintarClientesCero(raGet(d, "ClientesEnCero", "clientesEnCero"));
    pintarKpis(raGet(d, "Kpis", "kpis"));
    pintarDestacados(raGet(d, "Destacados", "destacados"));
    pintarInsights(raGet(d, "Insights", "insights"));
    pintarFalencias(raGet(d, "Falencias", "falencias"));
    pintarRanking(raGet(d, "RankingCompleto", "rankingCompleto"));
    pintarClientesMenos(raGet(d, "ClientesMenosCompra", "clientesMenosCompra"));
    pintarBarrasLista("#raClientesVenta", raGet(d, "TopClientesVenta", "topClientesVenta"),
        function (x) { return raNum(x, "Importe", "importe"); },
        function (x) { return raMoney(raGet(x, "Importe", "importe")) + " · " + raGet(x, "Cantidad", "cantidad") + " op."; },
        "clienteventa");
    pintarBarrasLista("#raClientesCobro", raGet(d, "TopClientesCobro", "topClientesCobro"),
        function (x) { return raNum(x, "Importe", "importe"); },
        function (x) { return raMoney(raGet(x, "Importe", "importe")) + " · " + raGet(x, "Cantidad", "cantidad") + " cobros"; },
        "clientecobro");
    pintarBarrasLista("#raCuentas", raGet(d, "CuentasBancarias", "cuentasBancarias"),
        function (x) { return raNum(x, "Importe", "importe"); },
        function (x) { return raMoney(raGet(x, "Importe", "importe")) + " · " + raGet(x, "Porcentaje", "porcentaje") + "%"; },
        "cuentas");
    pintarBarrasLista("#raAusentes", raGet(d, "AusentesPorCobrador", "ausentesPorCobrador"),
        function (x) { return raNum(x, "CantOperaciones", "cantOperaciones"); },
        function (x) { return raGet(x, "CantOperaciones", "cantOperaciones") + " ausentes"; },
        "ausentes");

    const serie = raGet(d, "SerieDiaria", "serieDiaria") || [];
    crearLinea("chartSerie", serie.map(function (x) { return raGet(x, "Fecha", "fecha"); }), [
        { label: "Ventas", data: serie.map(function (x) { return raGet(x, "Ventas", "ventas"); }), color: "#38bdf8" },
        { label: "Cobros", data: serie.map(function (x) { return raGet(x, "Cobros", "cobros"); }), color: "#34d399" },
        { label: "Interés", data: serie.map(function (x) { return raGet(x, "Interes", "interes"); }), color: "#fbbf24" }
    ]);

    pintarChartMetodos(d);
    pintarRankingMonto("#raTopVentas", raGet(d, "TopVentas", "topVentas"), "topventas",
        function (p) { return raNum(p, "TotalVentas", "totalVentas"); },
        raNum(raGet(d, "Kpis", "kpis"), "TotalVentas", "totalVentas"), "venta");
    pintarRankingMonto("#raTopCobros", raGet(d, "TopCobros", "topCobros"), "topcobros",
        function (p) { return raNum(p, "TotalCobros", "totalCobros"); },
        raNum(raGet(d, "Kpis", "kpis"), "TotalCobros", "totalCobros"), "cobro");
    raRestaurarBuscadores();
}

function pintarChartMetodos(d) {
    const list = raApplySort(raGet(d, "MetodosPago", "metodosPago") || [], "metodos");
    crearDona("chartMetodos", list);
}

function pintarRankingMonto(sel, rows, seccion, valFn, total, tone) {
    const $el = $(sel);
    const list = raApplySort(rows || [], seccion);
    if (!list.length) {
        $el.html('<div class="ra-empty">Sin datos en este recorte.</div>');
        return;
    }
    const tot = Number(total) || 0;
    const max = Math.max.apply(null, list.map(valFn).concat([1]));
    $el.html('<div class="ra-rank-list">' + list.map(function (p, i) {
        const v = Number(valFn(p)) || 0;
        const pctBar = Math.max(v > 0 ? 4 : 0, Math.round(v / max * 100));
        const pctTotal = tot > 0 ? Math.round(v / tot * 1000) / 10 : 0;
        const zero = v === 0 ? " ra-rank-zero" : "";
        return `<article class="ra-rank-row ra-rank-mini${zero}">
            <div class="ra-rank-pos">${i + 1}</div>
            <div>
                <div class="ra-rank-top">
                    <strong>${raEsc(raRowNombre(p))}</strong>
                </div>
                <div class="ra-bar-track"><div class="ra-bar-fill ra-bar-${raEsc(tone)}" style="width:${pctBar}%"></div></div>
            </div>
            <div class="ra-rank-score-box">
                <div class="ra-rank-score">${raEsc(raMoney(v))}</div>
                <div class="ra-rank-score-label">${raEsc(pctTotal.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }))}%</div>
            </div>
        </article>`;
    }).join("") + "</div>");
}

function pintarResumenPeriodo(d) {
    const k = raGet(d, "Kpis", "kpis") || {};
    const vendio = raNum(k, "TotalVentas", "totalVentas");
    const cobro = raNum(k, "TotalCobros", "totalCobros");
    const pct = vendio > 0 ? Math.round((cobro / vendio) * 1000) / 10 : 0;
    $("#raResumenPeriodo").html(`
        <div class="ra-periodo-grid">
            <div class="ra-periodo-card venta">
                <em>Vendió</em>
                <strong>${raEsc(raMoney(vendio))}</strong>
                <span>${raEsc(raGet(k, "CantVentas", "cantVentas") || 0)}</span>
            </div>
            <div class="ra-periodo-card cobro">
                <em>Cobrado</em>
                <strong>${raEsc(raMoney(cobro))}</strong>
                <span>${raEsc(raGet(k, "CantCobros", "cantCobros") || 0)}</span>
            </div>
            <div class="ra-periodo-card pct">
                <em>%</em>
                <strong>${raEsc(pct)}%</strong>
            </div>
        </div>`);
}

function raPctTxt(pct) {
    const n = Number(pct);
    if (n == null || isNaN(n) || n < 0) return "—";
    return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

function raPctCls(pct) {
    const n = Number(pct);
    if (n == null || isNaN(n) || n < 0) return "";
    if (n < 15) return " ra-fiado-bajo";
    if (n < 30) return " ra-fiado-medio";
    return " ra-fiado-ok";
}

function raPctVencidoCls(pct) {
    const n = Number(pct);
    if (n == null || isNaN(n) || n < 0) return "";
    if (n >= 40) return " ra-fiado-bajo";
    if (n >= 20) return " ra-fiado-medio";
    return " ra-fiado-ok";
}

function raMetricTone(label, extraCls) {
    const x = (extraCls || "");
    if (x.indexOf("ra-fiado-ok") >= 0) return "ok";
    if (x.indexOf("ra-fiado-medio") >= 0) return "mid";
    if (x.indexOf("ra-fiado-bajo") >= 0) return "bad";
    const l = (label || "").toLowerCase();
    if (/venc/.test(l)) return "vencido";
    if (/cobr/.test(l)) return "cobro";
    if (/fiado/.test(l)) return "fiado";
    if (/vend/.test(l)) return "venta";
    if (l === "%" || /%/.test(l)) return "pct";
    if (/d[ií]as/.test(l)) return "dias";
    if (/fecha/.test(l)) return "fecha";
    if (/cliente/.test(l)) return "clientes";
    if (/vendedor/.test(l)) return "vend";
    return "neutro";
}

function raMetric(label, value, hint, extraCls) {
    const extra = (extraCls || "").trim();
    const tone = raMetricTone(label, extra);
    return `<div class="ra-vend-metric ra-m-${tone}${extra ? " " + extra : ""}">
        <em>${raEsc(label)}</em>
        <span>${value}</span>
        ${hint ? "<small>" + hint + "</small>" : ""}
    </div>`;
}

function raNombreZona(c) {
    const zona = raStr(c, "Zona", "zona").trim();
    if (!zona) return "";
    if (/^\d+$/.test(zona)) return "";
    return zona;
}

function raAddrHtml(c) {
    const dir = raStr(c, "Direccion", "direccion").trim();
    const zona = raNombreZona(c);
    const parts = [];
    if (dir) parts.push(dir);
    if (zona) parts.push(zona);
    const full = parts.join(" · ");
    if (!full) return "";
    const opts = {
        direccion: full,
        lat: raStr(c, "Latitud", "latitud"),
        lng: raStr(c, "Longitud", "longitud"),
        cliente: raStr(c, "Nombre", "nombre"),
        cortaLen: 42
    };
    const inner = typeof buildCeldaDireccionHtml === "function"
        ? buildCeldaDireccionHtml(opts)
        : raEsc(full);
    return `<div class="ra-vend-addr">${inner}</div>`;
}

function raMergeVendedores(d) {
    const map = {};
    function ensure(id, nombre) {
        const key = String(id > 0 ? id : (nombre || "0"));
        if (!map[key]) {
            map[key] = {
                Id: id || 0,
                Nombre: nombre || "Sin asignar",
                TotalVentas: 0,
                TotalCobros: 0,
                CantVentas: 0,
                CantCobros: 0,
                PctCobradoPeriodo: -1,
                Fiado: 0,
                CobradoPeriodoFiado: 0,
                PctCobradoFiado: -1,
                CantVentasFiado: 0,
                CantCuotas: 0,
                MontoVencido: 0,
                CantClientes: 0,
                PctVencidoFiado: -1
            };
        }
        const row = map[key];
        if (nombre && (row.Nombre === "Sin asignar" || /^Usuario #/.test(row.Nombre)))
            row.Nombre = nombre;
        return row;
    }

    (raGet(d, "PorVendedorPeriodo", "porVendedorPeriodo") || []).forEach(p => {
        const row = ensure(raGet(p, "Id", "id"), raGet(p, "Nombre", "nombre"));
        row.TotalVentas = raNum(p, "TotalVentas", "totalVentas");
        row.TotalCobros = raNum(p, "TotalCobros", "totalCobros");
        row.CantVentas = raNum(p, "CantVentas", "cantVentas");
        row.CantCobros = raNum(p, "CantCobros", "cantCobros");
        row.PctCobradoPeriodo = Number(raGet(p, "PctCobradoPeriodo", "pctCobradoPeriodo"));
        if (isNaN(row.PctCobradoPeriodo)) row.PctCobradoPeriodo = -1;
    });

    (raGet(d, "FiadoCalle", "fiadoCalle") || []).forEach(p => {
        const row = ensure(raGet(p, "Id", "id"), raGet(p, "Nombre", "nombre"));
        row.Fiado = raNum(p, "Fiado", "fiado");
        row.CobradoPeriodoFiado = raNum(p, "Cobrado", "cobrado");
        row.CantVentasFiado = raNum(p, "CantVentas", "cantVentas");
        row.PctCobradoFiado = Number(raGet(p, "PctCobrado", "pctCobrado"));
        if (isNaN(row.PctCobradoFiado)) row.PctCobradoFiado = -1;
    });

    (raGet(d, "CuotasVencidas", "cuotasVencidas") || []).forEach(p => {
        const row = ensure(raGet(p, "Id", "id"), raGet(p, "Nombre", "nombre"));
        row.CantCuotas = raNum(p, "CantCuotas", "cantCuotas");
        row.MontoVencido = raNum(p, "MontoVencido", "montoVencido");
        row.CantClientes = raNum(p, "CantClientes", "cantClientes");
    });

    return Object.keys(map).map(k => {
        const row = map[k];
        if (row.PctCobradoFiado < 0 && row.Fiado > 0)
            row.PctCobradoFiado = Math.round((row.CobradoPeriodoFiado / row.Fiado) * 10000) / 100;
        row.PctVencidoFiado = row.Fiado > 0
            ? Math.round((row.MontoVencido / row.Fiado) * 10000) / 100
            : -1;
        return row;
    });
}

function pintarPorVendedor(d) {
    const merged = raMergeVendedores(d || {});
    const list = raApplySort(merged, "vendedor");
    let totFiado = 0;
    let totCobrado = 0;
    let totVencido = 0;
    let totCuotas = 0;
    merged.forEach(p => {
        totFiado += p.Fiado;
        totCobrado += p.CobradoPeriodoFiado || p.TotalCobros;
        totVencido += p.MontoVencido;
        totCuotas += p.CantCuotas;
    });
    const totPctCobrado = totFiado > 0 ? Math.round((totCobrado / totFiado) * 10000) / 100 : -1;
    const totPctVencido = totFiado > 0 ? Math.round((totVencido / totFiado) * 10000) / 100 : -1;

    $("#raResumenFiado").html(`
        <div class="ra-vend-team">
            ${raMetric("Fiado", raEsc(raMoney(totFiado)))}
            ${raMetric("Cobrado", raEsc(raMoney(totCobrado)))}
            ${raMetric("%", raEsc(raPctTxt(totPctCobrado)), "", totPctCobrado >= 0 ? raPctCls(totPctCobrado).trim() : "")}
            ${raMetric("Vencido", raEsc(raMoney(totVencido)))}
            ${raMetric("% vencido", raEsc(raPctTxt(totPctVencido)), totCuotas ? String(totCuotas) : "", totPctVencido >= 0 ? raPctVencidoCls(totPctVencido).trim() : "")}
        </div>`);

    if (!list.length) {
        $("#raPorVendedor").html('<div class="ra-empty">Sin datos.</div>');
        return;
    }

    const html = `<div class="ra-vend-grid">${list.map(p => {
        const pctPer = Number(p.PctCobradoPeriodo);
        const pctFiado = Number(p.PctCobradoFiado);
        const pctVenc = Number(p.PctVencidoFiado);
        return `<article class="ra-vend-card">
            <header class="ra-vend-head">
                <div class="ra-vend-name">${raEsc(p.Nombre)}</div>
                <div class="ra-vend-head-pct${raPctVencidoCls(pctVenc)}">${raEsc(raPctTxt(pctVenc))}<small>% vencido</small></div>
            </header>
            <div class="ra-vend-block">
                <div class="ra-vend-kicker">Período</div>
                <div class="ra-vend-metrics">
                    ${raMetric("Vendió", raEsc(raMoney(p.TotalVentas)), String(p.CantVentas || 0))}
                    ${raMetric("Cobrado", raEsc(raMoney(p.TotalCobros)), String(p.CantCobros || 0))}
                    ${raMetric("%", raEsc(pctPer < 0 ? "—" : pctPer + "%"))}
                </div>
            </div>
            <div class="ra-vend-block ra-vend-fiado">
                <div class="ra-vend-kicker">Fiado</div>
                <div class="ra-vend-metrics">
                    ${raMetric("Fiado", raEsc(raMoney(p.Fiado)), String(p.CantVentasFiado || 0))}
                    ${raMetric("Cobrado", raEsc(raMoney(p.CobradoPeriodoFiado || p.TotalCobros)))}
                    ${raMetric("%", raEsc(raPctTxt(pctFiado)), "", pctFiado >= 0 ? raPctCls(pctFiado).trim() : "")}
                </div>
            </div>
            <div class="ra-vend-block ra-vend-venc">
                <div class="ra-vend-kicker">Vencido</div>
                <div class="ra-vend-metrics">
                    ${raMetric("Vencido", raEsc(raMoney(p.MontoVencido)), String(p.CantCuotas || 0))}
                    ${raMetric("Clientes", raEsc(String(p.CantClientes || 0)))}
                    ${raMetric("%", raEsc(raPctTxt(pctVenc)), "", pctVenc >= 0 ? raPctVencidoCls(pctVenc).trim() : "")}
                </div>
            </div>
        </article>`;
    }).join("")}</div>`;
    $("#raPorVendedor").html(html);
}

function pintarClientesCero(rows) {
    const list = raApplySort(rows || [], "encero");
    if (!list.length) {
        $("#raClientesCero").html('<div class="ra-empty">Sin datos.</div>');
        return;
    }
    const html = `<div class="ra-vend-grid">${list.map(c => {
        const addrHtml = raAddrHtml(c);
        const nombre = raStr(c, "Nombre", "nombre");
        const vendedor = raStr(c, "Vendedor", "vendedor");
        const fecha = raStr(c, "FechaCero", "fechaCero");
        const dias = raNum(c, "DiasDesdeCero", "diasDesdeCero");
        return `<article class="ra-vend-card">
        <header class="ra-vend-head">
            <div class="ra-vend-id">
                <div class="ra-vend-name">${raEsc(nombre)}</div>
                ${addrHtml}
            </div>
            <div class="ra-vend-head-pct">${raEsc(raMoney(raGet(c, "Importe", "importe")))}<small>Canceló</small></div>
        </header>
        <div class="ra-vend-metrics">
            ${raMetric("Vendedor", raEsc(vendedor || "—"))}
            ${raMetric("Fecha", raEsc(fecha || "—"))}
            ${raMetric("Días", raEsc(String(dias || 0)))}
        </div>
    </article>`;
    }).join("")}</div>`;
    $("#raClientesCero").html(html);
}

function pintarClientesMenos(rows) {
    const list = raApplySort(rows || [], "menos");
    if (!list.length) {
        $("#raClientesMenos").html('<div class="ra-empty">No hay clientes con ventas.</div>');
        return;
    }
    const html = `<div class="ra-vend-grid ra-menos-grid">${list.map((c, i) => {
        const importe = raNum(c, "Importe", "importe");
        const cant = raNum(c, "Cantidad", "cantidad");
        const zero = importe <= 0;
        const ventasTxt = cant === 1 ? "1 venta" : cant + " ventas";
        return `<article class="ra-vend-card ra-menos-card${zero ? " ra-menos-zero" : ""}">
            <header class="ra-vend-head">
                <div class="ra-menos-title">
                    <span class="ra-menos-rank">${i + 1}</span>
                    <div class="ra-vend-name">${raEsc(raStr(c, "Nombre", "nombre"))}</div>
                </div>
            </header>
            <div class="ra-vend-metrics ra-menos-metrics">
                ${raMetric("Vendido en el período", raEsc(raMoney(importe)), raEsc(ventasTxt), zero ? "ra-fiado-bajo" : "")}
                ${raMetric("Última venta", raEsc(raStr(c, "FechaUltimaVenta", "fechaUltimaVenta") || "—"))}
            </div>
        </article>`;
    }).join("")}</div>`;
    $("#raClientesMenos").html(html);
}

function pintarKpis(k) {
    if (!k) return;
    raKpiItems = [
        { label: "Plata vendida", tone: "venta", value: raMoney(raGet(k, "TotalVentas", "totalVentas")), hint: raGet(k, "CantVentas", "cantVentas") + " ventas · ticket " + raMoney(raGet(k, "TicketPromedioVenta", "ticketPromedioVenta")), sortVal: raNum(k, "TotalVentas", "totalVentas") },
        { label: "Plata cobrada", tone: "cobro", value: raMoney(raGet(k, "TotalCobros", "totalCobros")), hint: raGet(k, "CantCobros", "cantCobros") + " cobros · ticket " + raMoney(raGet(k, "TicketPromedioCobro", "ticketPromedioCobro")), sortVal: raNum(k, "TotalCobros", "totalCobros") },
        { label: "Interés / recargos", tone: "mid", value: raMoney(raGet(k, "TotalInteres", "totalInteres")), hint: raGet(k, "CantIntereses", "cantIntereses") + " movimientos", sortVal: raNum(k, "TotalInteres", "totalInteres") },
        { label: "Efectivo", tone: "ok", value: raMoney(raGet(k, "TotalEfectivo", "totalEfectivo")), hint: raGet(k, "PctEfectivo", "pctEfectivo") + "% de lo cobrado", sortVal: raNum(k, "TotalEfectivo", "totalEfectivo") },
        { label: "Transferencias", tone: "fiado", value: raMoney(raGet(k, "TotalTransferencia", "totalTransferencia")), hint: "Propias " + raMoney(raGet(k, "TotalTransferenciaPropia", "totalTransferenciaPropia")) + " · Terceros " + raMoney(raGet(k, "TotalTransferenciaTerceros", "totalTransferenciaTerceros")), sortVal: raNum(k, "TotalTransferencia", "totalTransferencia") },
        { label: "Cobrado vs vendido", tone: "pct", value: (raGet(k, "RatioCobroSobreVenta", "ratioCobroSobreVenta") || 0) + "%", hint: raGet(k, "VentasUnicas", "ventasUnicas") + " ventas únicas", sortVal: raNum(k, "RatioCobroSobreVenta", "ratioCobroSobreVenta") },
        { label: "Equipo activo", tone: "vend", value: raGet(k, "CantVendedoresActivos", "cantVendedoresActivos") + " / " + raGet(k, "CantCobradoresActivos", "cantCobradoresActivos"), hint: "Vendedores / cobradores", sortVal: raNum(k, "CantVendedoresActivos", "cantVendedoresActivos") },
        { label: "Ausentes", tone: "vencido", value: String(raGet(k, "CantAusentes", "cantAusentes") || 0), hint: raGet(k, "CantClientesUnicos", "cantClientesUnicos") + " clientes en el recorte", sortVal: raNum(k, "CantAusentes", "cantAusentes") }
    ];
    const items = raApplySort(raKpiItems, "kpis");
    const html = items.map(it =>
        `<div class="col-12 col-sm-6 col-xl-3">
            <div class="ra-kpi ra-m-${raEsc(it.tone || "neutro")}">
                <div class="label">${raEsc(it.label)}</div>
                <div class="value">${raEsc(it.value)}</div>
                <div class="hint">${raEsc(it.hint)}</div>
            </div>
        </div>`
    ).join("");
    $("#raKpis").html(html);
}

function pintarDestacados(d) {
    if (!d) return;
    const cards = [
        { cls: "gold", kicker: "Más completo", p: raGet(d, "MasCompleto", "masCompleto"), extra: p => "Score " + raGet(p, "Score", "score") + " · " + raMoney(raGet(p, "TotalGenerado", "totalGenerado")) + " generados", sortVal: raNum(raGet(d, "MasCompleto", "masCompleto") || {}, "Score", "score"), sortName: raStr(raGet(d, "MasCompleto", "masCompleto") || {}, "Nombre", "nombre") },
        { cls: "blue", kicker: "Más ventas", p: raGet(d, "MejorVendedor", "mejorVendedor"), extra: p => raMoney(raGet(p, "TotalVentas", "totalVentas")) + " · " + raGet(p, "CantVentas", "cantVentas") + " ops", sortVal: raNum(raGet(d, "MejorVendedor", "mejorVendedor") || {}, "TotalVentas", "totalVentas"), sortName: raStr(raGet(d, "MejorVendedor", "mejorVendedor") || {}, "Nombre", "nombre") },
        { cls: "green", kicker: "Más cobró", p: raGet(d, "MejorCobrador", "mejorCobrador"), extra: p => raMoney(raGet(p, "TotalCobros", "totalCobros")) + " · " + raGet(p, "CantCobros", "cantCobros") + " cobros", sortVal: raNum(raGet(d, "MejorCobrador", "mejorCobrador") || {}, "TotalCobros", "totalCobros"), sortName: raStr(raGet(d, "MejorCobrador", "mejorCobrador") || {}, "Nombre", "nombre") },
        { cls: "violet", kicker: "Más operaciones", p: raGet(d, "MasOperaciones", "masOperaciones"), extra: p => raGet(p, "CantOperaciones", "cantOperaciones") + " movimientos", sortVal: raNum(raGet(d, "MasOperaciones", "masOperaciones") || {}, "CantOperaciones", "cantOperaciones"), sortName: raStr(raGet(d, "MasOperaciones", "masOperaciones") || {}, "Nombre", "nombre") }
    ];
    const sorted = raApplySort(cards, "destacados");
    const html = `<div class="ra-hero">${sorted.map(c => {
        const p = c.p;
        if (!p) {
            return `<div class="ra-hero-card ${c.cls}"><div class="kicker">${c.kicker}</div><div class="name">—</div><div class="meta">Sin datos</div></div>`;
        }
        return `<div class="ra-hero-card ${c.cls}">
            <div class="kicker">${c.kicker}</div>
            <div class="name">${raEsc(raGet(p, "Nombre", "nombre"))}</div>
            <div class="meta">${raEsc(c.extra(p))}</div>
        </div>`;
    }).join("")}</div>
    <div class="row g-3 mt-1">
        <div class="col-md-6"><div class="ra-kpi"><div class="label">Mejor día de ventas</div><div class="value" style="font-size:1rem">${raEsc(raGet(d, "MejorDiaVentas", "mejorDiaVentas") || "—")}</div></div></div>
        <div class="col-md-6"><div class="ra-kpi"><div class="label">Mejor día de cobros</div><div class="value" style="font-size:1rem">${raEsc(raGet(d, "MejorDiaCobros", "mejorDiaCobros") || "—")}</div></div></div>
    </div>`;
    $("#raDestacados").html(html);
}

function pintarInsights(list) {
    const items = raApplySort(list || [], "insights");
    $("#raInsights").html(items.map(t => `<li>${raEsc(t)}</li>`).join("") || "<li>Sin insights para este recorte.</li>");
}

function pintarFalencias(list) {
    const items = raApplySort(list || [], "falencias");
    $("#raFalencias").html(items.map(t => `<li>${raEsc(t)}</li>`).join("") || "<li>Sin falencias claras en este recorte.</li>");
}

function pintarRanking(rows) {
    const $box = $("#raRanking");
    const list = raApplySort(rows || [], "ranking");
    if (!list.length) {
        $box.html('<div class="ra-empty">No hay ranking para este período.</div>');
        return;
    }

    const maxScore = Math.max.apply(null, list.map(p => raNum(p, "Score", "score")).concat([1]));
    const top = list.slice(0, 3);
    const resto = list.slice(3);
    const medals = [
        { cls: "gold", label: "Oro", icon: "fa-trophy" },
        { cls: "silver", label: "Plata", icon: "fa-star" },
        { cls: "bronze", label: "Bronce", icon: "fa-certificate" }
    ];

    function statsHtml(p) {
        const pct = Number(raGet(p, "PctCobradoPeriodo", "pctCobradoPeriodo"));
        return `<div class="ra-rank-stats">
            <span><em>Ventas</em>${raEsc(raMoney(raGet(p, "TotalVentas", "totalVentas")))}</span>
            <span><em>Cobros</em>${raEsc(raMoney(raGet(p, "TotalCobros", "totalCobros")))}</span>
            <span><em>Interés</em>${raEsc(raMoney(raGet(p, "TotalInteres", "totalInteres")))}</span>
            <span><em>Ops</em>${raEsc(raGet(p, "CantOperaciones", "cantOperaciones"))}</span>
            <span><em>Equilibrio</em>${raEsc(raGet(p, "Equilibrio", "equilibrio"))}%</span>
            <span><em>Cobrado vs vendido</em>${pct < 0 ? "—" : raEsc(pct) + "%"}</span>
        </div>`;
    }

    const podium = `<div class="ra-podium">${top.map((p, i) => {
        const m = medals[i];
        const rolCls = (raStr(p, "Rol", "rol") || "").toLowerCase();
        return `<article class="ra-podium-card ${m.cls}">
            <div class="ra-podium-medal"><i class="fa ${m.icon}"></i> ${m.label}</div>
            <div class="ra-podium-place">#${i + 1}</div>
            <div class="ra-podium-name">${raEsc(raGet(p, "Nombre", "nombre"))}</div>
            <span class="ra-pill ${raEsc(rolCls)}">${raEsc(raGet(p, "Rol", "rol") || "")}</span>
            <div class="ra-podium-score">${raEsc(raGet(p, "Score", "score"))}</div>
            <div class="ra-podium-score-label">Score</div>
            ${statsHtml(p)}
        </article>`;
    }).join("")}</div>`;

    const lista = resto.length
        ? `<div class="ra-rank-list">${resto.map((p, idx) => {
            const n = idx + 4;
            const rolCls = (raStr(p, "Rol", "rol") || "").toLowerCase();
            const pct = Math.max(6, Math.round(raNum(p, "Score", "score") / maxScore * 100));
            return `<article class="ra-rank-row">
                <div class="ra-rank-pos">${n}</div>
                <div class="ra-rank-main">
                    <div class="ra-rank-top">
                        <strong>${raEsc(raGet(p, "Nombre", "nombre"))}</strong>
                        <span class="ra-pill ${raEsc(rolCls)}">${raEsc(raGet(p, "Rol", "rol") || "")}</span>
                    </div>
                    <div class="ra-bar-track"><div class="ra-bar-fill" style="width:${pct}%"></div></div>
                    ${statsHtml(p)}
                </div>
                <div class="ra-rank-score-box">
                    <div class="ra-rank-score">${raEsc(raGet(p, "Score", "score"))}</div>
                    <div class="ra-rank-score-label">Score</div>
                </div>
            </article>`;
        }).join("")}</div>`
        : "";

    $box.html(podium + lista);
}

function pintarBarrasLista(sel, rows, valFn, metaFn, seccion) {
    const $el = $(sel);
    const list = seccion ? raApplySort(rows || [], seccion) : (rows || []);
    if (!list.length) {
        $el.html('<div class="ra-empty">Sin datos en este recorte.</div>');
        return;
    }
    const max = Math.max.apply(null, list.map(valFn).concat([1]));
    $el.html(list.map(x => {
        const v = Number(valFn(x)) || 0;
        const pct = Math.max(4, Math.round(v / max * 100));
        return `<div class="ra-bar-row">
            <div class="top"><span>${raEsc(raRowNombre(x))}</span><span>${raEsc(metaFn(x))}</span></div>
            <div class="ra-bar-track"><div class="ra-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
    }).join(""));
}

function chartOpts(more) {
    return Object.assign({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { boxWidth: 12, color: "#c5d2e6" } },
            tooltip: {
                callbacks: {
                    label: function (ctx) {
                        const v = ctx.parsed.y != null ? ctx.parsed.y : ctx.parsed;
                        return " " + (ctx.dataset.label ? ctx.dataset.label + ": " : "") + raMoney(v);
                    }
                }
            }
        }
    }, more || {});
}

function crearLinea(id, labels, series) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    raRegisterChart(id, new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: series.map(s => ({
                label: s.label,
                data: s.data,
                borderColor: s.color,
                backgroundColor: s.color + "33",
                tension: .35,
                fill: false,
                pointRadius: labels.length > 20 ? 0 : 3,
                borderWidth: 2
            }))
        },
        options: chartOpts({
            scales: {
                x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 14 } },
                y: { beginAtZero: true }
            }
        })
    }));
}

function crearDona(id, items) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    raDestroyChart(id);
    const list = (items || []).filter(x => (raGet(x, "Importe", "importe") || 0) > 0);
    if (!list.length) return;
    raRegisterChart(id, new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: list.map(x => raRowNombre(x)),
            datasets: [{
                data: list.map(x => raGet(x, "Importe", "importe")),
                backgroundColor: RA_COLORS.slice(0, list.length),
                borderWidth: 0
            }]
        },
        options: chartOpts({
            cutout: "58%",
            plugins: {
                legend: { position: "bottom", labels: { boxWidth: 10, color: "#c5d2e6" } },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            const it = list[ctx.dataIndex];
                            return " " + ctx.label + ": " + raMoney(ctx.parsed) + " (" + (raGet(it, "Porcentaje", "porcentaje") || 0) + "%)";
                        }
                    }
                }
            }
        })
    }));
}

function crearBarrasHoriz(id, rows, labelFn, valFn, color) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    const list = rows || [];
    raRegisterChart(id, new Chart(ctx, {
        type: "bar",
        data: {
            labels: list.map(labelFn),
            datasets: [{
                data: list.map(valFn),
                backgroundColor: color,
                borderRadius: 8,
                barThickness: 18
            }]
        },
        options: chartOpts({
            indexAxis: "y",
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => " " + raMoney(c.parsed.x) } } },
            scales: { x: { beginAtZero: true }, y: { ticks: { autoSkip: false } } }
        })
    }));
}
