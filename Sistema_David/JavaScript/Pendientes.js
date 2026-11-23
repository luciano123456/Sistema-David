let gridPendientes = null;
let pestana = "pendientes";
let usuariosModulo = [];
let vendedoresLista = [];
let destManual = false;
let select2Listos = false;
let pdAdjuntosNuevos = [];
let pdAdjuntosGuardados = [];
let pdFilaSelId = 0;
let pdEditorCancelar = null;
let pdGuardando = false;
let pdRefreshPendiente = false;
let pdSheetToken = 0;
let pdSheetCtx = null;
let pdSheetAnchor = null;
let pdFlash = null;
let pdFlashTimer = 0;
let pdResizeTimer = 0;
const esAdminPd = document.querySelector(".pd-root")?.getAttribute("data-es-admin") === "1";
const idAbrirPd = Number(document.querySelector(".pd-root")?.getAttribute("data-abrir") || 0);
const userSessionPd = JSON.parse(localStorage.getItem("usuario") || "null");

function escapePd(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function tieneSelect2() {
    return !!(window.jQuery && jQuery.fn && jQuery.fn.select2);
}

function chipPrioridad(v, type) {
    if (type === "filter") return v || "";
    const cls = v === "Alta" ? "is-alta" : v === "Baja" ? "is-baja" : "is-media";
    return '<span class="pd-chip ' + cls + '">' + escapePd(v || "") + "</span>";
}

function chipEstado(v, type) {
    if (type === "filter") return v || "";
    const cls = v === "Solucionado" ? "is-ok" : v === "En proceso" ? "is-proc" : "is-pend";
    return '<span class="pd-chip ' + cls + '">' + escapePd(v || "") + "</span>";
}

function chipTipo(v, type) {
    if (type === "filter") return v || "";
    const cls = v === "Cliente" ? "is-cli" : v === "Vendedor" ? "is-ven" : "is-int";
    return '<span class="pd-chip ' + cls + '">' + escapePd(v || "") + "</span>";
}

function modalPendienteEl() {
    const el = document.getElementById("modalPendiente");
    if (el && el.parentElement !== document.body)
        document.body.appendChild(el);
    return el;
}

function resetScrollModalPendiente() {
    const el = document.getElementById("modalPendiente");
    if (!el) return;
    el.scrollTop = 0;
    const cuerpo = el.querySelector(".pd-modal-body");
    if (cuerpo) cuerpo.scrollTop = 0;
}

function limpiarBackdrops() {
    const abiertos = document.querySelectorAll(".modal.show");
    const backs = document.querySelectorAll("body > .modal-backdrop, .modal-backdrop");
    if (!abiertos.length) {
        backs.forEach(function (b) { b.remove(); });
        document.body.classList.remove("modal-open");
        document.body.style.removeProperty("overflow");
        document.body.style.removeProperty("padding-right");
        document.documentElement.style.removeProperty("overflow");
        return;
    }
    const extras = Array.from(backs);
    extras.slice(0, Math.max(0, extras.length - 1)).forEach(function (b) { b.remove(); });
    document.body.classList.add("modal-open");
}

function instanciaModalPendiente() {
    const el = modalPendienteEl();
    if (!el || typeof bootstrap === "undefined") return null;
    return bootstrap.Modal.getOrCreateInstance(el, { backdrop: true, keyboard: true, focus: false });
}

function mostrarModalPendiente() {
    const el = modalPendienteEl();
    if (!el) return;
    const abrir = function () {
        if (el.classList.contains("show")) {
            limpiarBackdrops();
            resetScrollModalPendiente();
            return;
        }
        document.documentElement.classList.add("pd-modal-lock");
        const inst = instanciaModalPendiente();
        if (inst) inst.show();
        resetScrollModalPendiente();
        requestAnimationFrame(resetScrollModalPendiente);
        setTimeout(resetScrollModalPendiente, 60);
    };
    const alarma = document.getElementById("modalAlarmaPendiente");
    if (alarma && alarma.classList.contains("show") && typeof bootstrap !== "undefined") {
        const instAlarma = bootstrap.Modal.getInstance(alarma);
        alarma.addEventListener("hidden.bs.modal", function onHid() {
            alarma.removeEventListener("hidden.bs.modal", onHid);
            abrir();
        }, { once: true });
        if (instAlarma) instAlarma.hide();
        else abrir();
        return;
    }
    abrir();
}

function ocultarModalPendiente() {
    const el = modalPendienteEl();
    if (!el) {
        limpiarBackdrops();
        return;
    }
    const inst = typeof bootstrap !== "undefined" ? bootstrap.Modal.getInstance(el) : null;
    if (inst) inst.hide();
    setTimeout(limpiarBackdrops, 380);
}

function engancharLimpiezaModales() {
    document.addEventListener("hidden.bs.modal", function (ev) {
        if (!ev.target || !ev.target.classList.contains("modal")) return;
        if (ev.target.id === "modalPendiente")
            document.documentElement.classList.remove("pd-modal-lock");
        setTimeout(limpiarBackdrops, 0);
        setTimeout(limpiarBackdrops, 400);
    });
    document.addEventListener("hide.bs.modal", function (ev) {
        if (ev.target && ev.target.id === "modalPendiente") {
            setTimeout(function () {
                const el = modalPendienteEl();
                const otros = document.querySelectorAll(".modal.show");
                if (!el?.classList.contains("show") && !otros.length)
                    limpiarBackdrops();
            }, 420);
        }
    });
}

function pdSelect2ParentModal() {
    const $m = $("#modalPendiente");
    return $m.length ? $m : $(document.body);
}

function pdSelect2Base(extra) {
    return Object.assign({
        width: "100%",
        dropdownParent: pdSelect2ParentModal(),
        dropdownCssClass: "pd-s2-dropdown",
        language: {
            noResults: function () { return "Sin resultados"; },
            searching: function () { return "Buscando…"; },
            inputTooShort: function () { return "Escribí al menos 2 letras"; },
            removeAllItems: function () { return "Quitar todos"; }
        }
    }, extra || {});
}

function engancharSelect2FocoModal() {
    $(document).off("focusin.pdS2").on("focusin.pdS2", function (e) {
        if ($(e.target).closest(".select2-container, .select2-dropdown, .select2-search, .pd-s2-dropdown").length)
            e.stopImmediatePropagation();
    });
    $(document).off("select2:open.pdS2").on("select2:open.pdS2", function () {
        setTimeout(function () {
            const field = document.querySelector(".select2-container--open .select2-search__field");
            if (field) {
                field.setAttribute("inputmode", "search");
                field.style.fontSize = "16px";
                field.focus();
            }
        }, 0);
    });
}

function pdInitSelect2($el, opts) {
    if (!tieneSelect2() || !$el.length) return;
    if ($el.hasClass("select2-hidden-accessible")) {
        try { $el.select2("destroy"); } catch (e) { }
    }
    $el.select2(pdSelect2Base(opts));
}

function initSelect2Filtros() {
    if (!tieneSelect2()) return;
    ["#pdFiltroTipo", "#pdFiltroResponsable", "#pdFiltroPrioridad", "#pdFiltroEstado"].forEach(function (sel) {
        const $el = $(sel);
        if (!$el.length) return;
        if ($el.hasClass("select2-hidden-accessible")) {
            try { $el.select2("destroy"); } catch (e) { }
        }
        $el.select2({
            width: "100%",
            minimumResultsForSearch: 8,
            dropdownCssClass: "pd-s2-dropdown",
            dropdownParent: $(".pd-filters").length ? $(".pd-filters") : $(document.body)
        });
    });
}

function pdAjaxCliente() {
    return {
        url: "/Pendientes/BuscarClientes",
        dataType: "json",
        delay: 280,
        data: function (params) { return { q: params.term || "" }; },
        processResults: function (r) {
            const data = (r && r.data) || [];
            return {
                results: data.map(function (c) {
                    const id = c.Id != null ? c.Id : c.id;
                    const nombre = c.NombreCompleto || c.nombreCompleto ||
                        ((c.Nombre || c.nombre || "") + " " + (c.Apellido || c.apellido || "")).trim();
                    const dni = c.Dni || c.dni || "";
                    return {
                        id: id,
                        text: nombre + (dni ? " · " + dni : ""),
                        cliente: c
                    };
                })
            };
        }
    };
}

function initSelect2Modal() {
    if (!tieneSelect2() || select2Listos) return;
    pdInitSelect2($("#pdPrioridad"), { minimumResultsForSearch: Infinity });
    pdInitSelect2($("#pdEstado"), { minimumResultsForSearch: Infinity });
    pdInitSelect2($("#pdIdResponsable"), {
        placeholder: "Elegí uno o varios",
        allowClear: false,
        closeOnSelect: false,
        minimumResultsForSearch: 0
    });
    pdInitSelect2($("#pdDestinatarios"), {
        placeholder: "Elegí quién recibe la alarma",
        allowClear: true,
        closeOnSelect: false,
        minimumResultsForSearch: 0
    });
    pdInitSelect2($("#pdIdCliente"), {
        placeholder: "Buscá por nombre o DNI",
        allowClear: true,
        minimumInputLength: 2,
        ajax: pdAjaxCliente()
    });
    $("#pdIdCliente").on("select2:select", function (e) {
        aplicarCliente(e.params && e.params.data && e.params.data.cliente);
    });
    $("#pdIdCliente").on("select2:clear", function () {
        aplicarCliente(null);
    });
    select2Listos = true;
}

function setSelectVal(selector, value) {
    const $el = $(selector);
    if (!$el.length) return;
    if (value === null || value === undefined) $el.val(null);
    else $el.val(String(value));
    if ($el.hasClass("select2-hidden-accessible")) $el.trigger("change.select2");
    else $el.trigger("change");
}

function aplicarCliente(c) {
    if (!c) {
        $("#pdClienteNombre, #pdClienteDni, #pdClienteDireccion, #pdClienteTelefono").val("");
        return;
    }
    const nombre = c.NombreCompleto || c.nombreCompleto ||
        ((c.Nombre || c.nombre || "") + " " + (c.Apellido || c.apellido || "")).trim();
    $("#pdClienteNombre").val(nombre);
    $("#pdClienteDni").val(c.Dni || c.dni || "");
    $("#pdClienteDireccion").val(c.Direccion || c.direccion || "");
    $("#pdClienteTelefono").val(c.Telefono || c.telefono || "");
}

function setClienteSeleccionado(id, texto, datos) {
    const $s = $("#pdIdCliente");
    $s.find("option").remove();
    if (id) {
        const opt = new Option(texto || "Cliente", String(id), true, true);
        $s.append(opt);
    }
    if ($s.hasClass("select2-hidden-accessible")) $s.trigger("change.select2");
    else $s.trigger("change");
    aplicarCliente(datos || null);
}

function pdUserId(x) {
    return x && (x.Id != null ? x.Id : x.id);
}

function pdUserNombre(x) {
    return (x && (x.Nombre || x.nombre)) || "";
}

function pdUserRol(x) {
    return (x && (x.Rol || x.rol)) || "";
}

function pdUserLogin(x) {
    return (x && (x.Usuario || x.usuario)) || "";
}

function pdTextoVendedor(x) {
    const nom = pdUserNombre(x);
    const login = pdUserLogin(x);
    const rol = pdUserRol(x);
    let t = nom;
    if (login) t += " · " + login;
    if (rol) t += " (" + rol + ")";
    return t;
}

function pdBusquedaVendedor(x) {
    return [pdUserNombre(x), pdUserLogin(x), pdUserRol(x)].join(" ").toLowerCase();
}

function pdMatcherVendedor(params, data) {
    if ($.trim(params.term) === "") return data;
    if (typeof data.text === "undefined") return null;
    const extra = ((data.element && data.element.getAttribute("data-busqueda")) || "") + " " + (data.text || "");
    if (extra.toLowerCase().indexOf(params.term.toLowerCase()) > -1)
        return data;
    return null;
}

function llenarSelectVendedor(valor) {
    const $vend = $("#pdIdVendedor");
    if (!$vend.length) return;
    const keep = valor != null && valor !== "" ? String(valor) : ($vend.val() || "");
    if ($vend.hasClass("select2-hidden-accessible")) {
        try { $vend.select2("destroy"); } catch (e) { }
    }
    $vend.empty().append('<option value=""></option>');
    vendedoresLista.forEach(function (x) {
        const id = pdUserId(x);
        const nom = pdUserNombre(x);
        if (!id || !nom) return;
        const opt = new Option(pdTextoVendedor(x), String(id), false, false);
        opt.setAttribute("data-busqueda", pdBusquedaVendedor(x));
        $vend.append(opt);
    });
    pdInitSelect2($vend, {
        placeholder: "Buscá por nombre o usuario",
        allowClear: false,
        minimumResultsForSearch: 0,
        matcher: pdMatcherVendedor
    });
    if (keep && $vend.find('option[value="' + keep + '"]').length)
        $vend.val(keep).trigger("change.select2");
}

async function cargarCombos() {
    const u = await $.getJSON("/Pendientes/UsuariosModulo");
    usuariosModulo = (u && u.data) || [];
    const v = await $.getJSON("/Pendientes/Vendedores");
    vendedoresLista = (v && v.data) || [];

    const $respFiltro = $("#pdFiltroResponsable");
    const $resp = $("#pdIdResponsable");
    const $dest = $("#pdDestinatarios");
    usuariosModulo.forEach(function (x) {
        const id = pdUserId(x);
        const nom = pdUserNombre(x);
        const rol = pdUserRol(x);
        if (!id || !nom) return;
        $respFiltro.append('<option value="' + id + '">' + escapePd(nom) + "</option>");
        $resp.append('<option value="' + id + '">' + escapePd(nom) + " (" + escapePd(rol) + ")</option>");
        $dest.append('<option value="' + id + '">' + escapePd(nom) + " (" + escapePd(rol) + ")</option>");
    });
    asegurarOpcionTodos($resp);
    asegurarOpcionTodos($dest);
    initSelect2Filtros();
    initSelect2Modal();
    llenarSelectVendedor("");
    const idsYo = userSessionPd && userSessionPd.Id ? [userSessionPd.Id] : [];
    setResponsables(idsYo);
    setDestinatarios(idsYo);
}

function pdEsValorTodos(val) {
    const s = String(val == null ? "" : val).trim().toLowerCase();
    return s === "todos" || s === "-1";
}

function pdOptionEsTodos(opt) {
    if (!opt) return false;
    if (opt.getAttribute && opt.getAttribute("data-pd-todos") === "1") return true;
    if (pdEsValorTodos(opt.value)) return true;
    const n = Number(opt.value);
    const texto = String(opt.textContent || "").trim().toLowerCase();
    return texto === "todos" && !(n > 0);
}

function pdDatoEsTodos(data) {
    if (!data) return false;
    if (data.element && pdOptionEsTodos(data.element)) return true;
    if (Number(data.id) > 0) return false;
    const texto = String(data.text == null ? "" : data.text).trim().toLowerCase();
    return pdEsValorTodos(data.id) || texto === "todos";
}

function pdDatoSelecting(e) {
    const p = e && e.params;
    if (!p) return null;
    if (p.args && p.args.data) return p.args.data;
    if (p.data) return p.data;
    return null;
}

function idsPersonasDe($select) {
    const ids = [];
    if (!$select || !$select.length) return ids;
    $select.find("option").each(function () {
        if (pdOptionEsTodos(this)) return;
        const n = Number(this.value);
        if (n > 0) ids.push(String(n));
    });
    return ids;
}

function asegurarOpcionTodos($select) {
    if (!$select || !$select.length) return;
    let ya = false;
    $select.find("option").each(function () {
        if (pdOptionEsTodos(this)) ya = true;
    });
    if (!ya)
        $select.prepend('<option value="todos" data-pd-todos="1">Todos</option>');
}

function aplicarIdsEnMulti($select, ids) {
    const vals = [];
    (ids || []).forEach(function (id) {
        const s = String(id);
        if (!s || pdEsValorTodos(s) || vals.indexOf(s) >= 0) return;
        vals.push(s);
    });
    $select.val(vals.length ? vals : null);
    if ($select.hasClass("select2-hidden-accessible")) $select.trigger("change.select2");
    else $select.trigger("change");
}

function engancharAtajoTodos($select) {
    if (!$select || !$select.length || !$select.prop("multiple")) return;
    let tieneTodos = false;
    $select.find("option").each(function () {
        if (pdOptionEsTodos(this)) tieneTodos = true;
    });
    if (!tieneTodos) return;
    $select.off("select2:selecting.pdTodos").on("select2:selecting.pdTodos", function (e) {
        const data = pdDatoSelecting(e);
        if (!pdDatoEsTodos(data)) return;
        e.preventDefault();
        if ($select.is("#pdDestinatarios")) destManual = true;
        const ids = idsPersonasDe($select);
        setTimeout(function () {
            aplicarIdsEnMulti($select, ids);
            if ($select.hasClass("select2-hidden-accessible")) {
                try { $select.select2("close"); } catch (err) { }
            }
        }, 0);
    });
    $select.off("select2:select.pdTodos").on("select2:select.pdTodos", function (e) {
        const data = e.params && e.params.data;
        if (!pdDatoEsTodos(data)) return;
        if ($select.is("#pdDestinatarios")) destManual = true;
        aplicarIdsEnMulti($select, idsPersonasDe($select));
        if ($select.hasClass("select2-hidden-accessible")) {
            try { $select.select2("close"); } catch (err) { }
        }
    });
}

function setResponsables(ids) {
    aplicarIdsEnMulti($("#pdIdResponsable"), ids || []);
}

function responsablesSeleccionados($select) {
    const $s = ($select && $select.length) ? $select : $("#pdIdResponsable");
    const val = $s.val();
    const lista = !val ? [] : (Array.isArray(val) ? val : [val]);
    if (lista.some(function (v) { return pdEsValorTodos(v); })) {
        const ids = idsPersonasDe($s);
        aplicarIdsEnMulti($s, ids);
        return ids.map(Number).filter(function (n) { return n > 0; });
    }
    return lista.map(Number).filter(function (n) { return n > 0; });
}

function textoResponsables(ids) {
    const nombres = [];
    (ids || []).forEach(function (id) {
        const u = (usuariosModulo || []).filter(function (x) {
            return Number(pdUserId(x)) === Number(id);
        })[0];
        if (u) nombres.push(pdUserNombre(u));
    });
    return nombres.join(", ");
}

function setDestinatarios(ids) {
    const $d = $("#pdDestinatarios");
    const personas = idsPersonasDe($d);
    const permitidos = {};
    personas.forEach(function (id) { permitidos[id] = true; });
    const vals = [];
    (ids || []).forEach(function (id) {
        if (id == null || id === "") return;
        const s = String(id);
        if (pdEsValorTodos(s)) return;
        if (personas.length && !permitidos[s]) return;
        if (vals.indexOf(s) < 0) vals.push(s);
    });
    aplicarIdsEnMulti($d, vals);
}

function destinatariosSeleccionados($select) {
    const $d = ($select && $select.length) ? $select : $("#pdDestinatarios");
    const val = $d.val();
    const lista = !val ? [] : (Array.isArray(val) ? val : [val]);
    if (lista.some(function (v) { return pdEsValorTodos(v); })) {
        const ids = idsPersonasDe($d);
        aplicarIdsEnMulti($d, ids);
        return ids.map(Number).filter(function (n) { return n > 0; });
    }
    return lista.map(Number).filter(function (n) { return n > 0; });
}

function tipoActual() {
    return document.getElementById("pdTipo")?.value || "Cliente";
}

function setTipoUi(tipo) {
    tipo = tipo || "Cliente";
    const hid = document.getElementById("pdTipo");
    if (hid) hid.value = tipo;
    document.querySelectorAll("#modalPendiente .pd-tipo-card").forEach(function (btn) {
        const on = btn.getAttribute("data-tipo") === tipo;
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll(".pd-box-cliente").forEach(function (el) {
        el.hidden = tipo !== "Cliente";
    });
    document.querySelectorAll(".pd-box-vendedor").forEach(function (el) {
        el.hidden = tipo !== "Vendedor";
    });
    const sub = document.getElementById("pdModalSub");
    if (sub) {
        sub.textContent = tipo === "Cliente"
            ? "Buscá el cliente y contá qué pasó"
            : tipo === "Vendedor"
                ? "Elegí el vendedor y contá qué pasó"
                : "Pendiente interno, sin cliente ni vendedor";
    }
    if (tieneSelect2()) {
        setTimeout(function () {
            if (tipo === "Vendedor")
                llenarSelectVendedor($("#pdIdVendedor").val());
            $("#pdIdCliente").each(function () {
                if ($(this).hasClass("select2-hidden-accessible"))
                    $(this).next(".select2-container").css("width", "100%");
            });
        }, 0);
    }
}

function aplicarTipoUi() {
    setTipoUi(tipoActual());
}

const PD_COL_FILTER_UI = { skin: "cobros", placeholder: "Filtrar…", inputType: "search" };
const PD_COL_FILTER_KEY = "pd_col_filtros_v2";
const PD_COL_SELECT = { Tipo: true, Responsable: true, Prioridad: true, Estado: true };
let pdColumnConfig = [];
let pdFiltroResizeTimer = 0;

function pdBuildColumnConfig(api) {
    const list = [];
    api.columns().every(function (idx) {
        let src = null;
        try { src = this.dataSrc(); } catch (e) { src = null; }
        if (typeof src !== "string" || !src) return;
        list.push({
            index: idx,
            filterType: PD_COL_SELECT[src] ? "select" : "text"
        });
    });
    return list;
}

function pdHasSelect2Col() {
    return !!(window.jQuery && jQuery.fn && jQuery.fn.select2);
}

function pdMontarSelect2Filtro($sel) {
    if (!pdHasSelect2Col() || !$sel || !$sel.length) return;
    if ($sel.hasClass("select2-hidden-accessible")) {
        try { $sel.select2("destroy"); } catch (e) { }
    }
    $sel.select2({
        width: "100%",
        allowClear: true,
        placeholder: "Todos",
        minimumResultsForSearch: 5,
        dropdownAutoWidth: true,
        dropdownParent: $(document.body),
        dropdownCssClass: "pd-col-filter-s2-dropdown"
    });
    $sel.off("select2:open.pdColFilter").on("select2:open.pdColFilter", function () {
        window.requestAnimationFrame(function () {
            $(".select2-container--open .select2-dropdown").addClass("pd-col-filter-s2-dropdown");
        });
    });
}

function pdInitSelect2ColumnFilters(api) {
    if (!pdHasSelect2Col()) return;
    const $container = typeof getDataTableWrapper === "function"
        ? getDataTableWrapper(api)
        : $(api.table().container());
    $container.find("thead tr.filters .rp-filter-select").each(function () {
        pdMontarSelect2Filtro($(this));
    });
}

function pdRefrescarSelectsColumna(api, configColumns) {
    if (!api || !configColumns || !configColumns.length) return;
    if (typeof getColumnFilterRows !== "function") return;
    const $row = getColumnFilterRows(api).first();
    if (!$row.length) return;

    configColumns.forEach(function (config) {
        if (config.filterType !== "select" && config.filterType !== "select_local") return;
        const $sel = $row.children("th").eq(config.index).find(".rp-filter-select");
        if (!$sel.length) return;
        const s2 = $sel.data("select2");
        if (s2 && s2.isOpen && s2.isOpen()) return;

        const actual = String($sel.val() || "");
        const uniques = [];
        const seen = {};
        api.column(config.index).data().each(function (v) {
            const txt = (v == null ? "" : String(v)).replace(/\s+/g, " ").trim();
            if (!txt || seen[txt]) return;
            seen[txt] = true;
            uniques.push(txt);
        });
        uniques.sort();
        const firma = uniques.join("\n");
        if ($sel.attr("data-pd-opts") === firma) return;

        $sel.attr("data-pd-opts", firma);
        $sel.empty();
        $sel.append('<option value="">Todos</option>');
        uniques.forEach(function (txt) {
            $("<option/>", { value: txt, text: txt }).appendTo($sel);
        });
        if (actual && !seen[actual])
            $("<option/>", { value: actual, text: actual }).appendTo($sel);
        $sel.val(actual && (seen[actual] || actual) ? actual : "");
        pdMontarSelect2Filtro($sel);
    });
}

function pdAjustarFiltrosSobreCards() {
    const wrap = document.querySelector(".pd-root .pd-dt-wrap");
    if (!wrap) return;
    wrap.classList.remove("pd-filtros-sobre-cards");
    wrap.style.removeProperty("display");
}

function pdInitColumnFilters(api) {
    if (!api || typeof inicializarFiltrosColumnas !== "function") return;
    pdColumnConfig = pdBuildColumnConfig(api);
    inicializarFiltrosColumnas(api, pdColumnConfig, PD_COL_FILTER_KEY, true, PD_COL_FILTER_UI);
    pdInitSelect2ColumnFilters(api);
    if (typeof syncColumnFilterMarkers === "function")
        syncColumnFilterMarkers(api, pdColumnConfig);
    try { api.columns.adjust(); } catch (e) { }

    api.off("draw.pdColFiltros").on("draw.pdColFiltros", function () {
        pdRefrescarSelectsColumna(api, pdColumnConfig);
        pdAjustarFiltrosSobreCards();
    });
    pdAjustarFiltrosSobreCards();

    if (!pdInitColumnFilters.resizeOn) {
        pdInitColumnFilters.resizeOn = true;
        $(window).on("resize.pdColFiltros", function () {
            clearTimeout(pdFiltroResizeTimer);
            pdFiltroResizeTimer = setTimeout(function () {
                pdAjustarFiltrosSobreCards();
                if (gridPendientes) {
                    try { gridPendientes.columns.adjust(); } catch (e) { }
                }
            }, 160);
        });
    }
}

async function listarPendientes() {
    const filtro = {
        Pestana: pestana,
        Tipo: $("#pdFiltroTipo").val() || "",
        IdResponsable: Number($("#pdFiltroResponsable").val() || 0),
        Prioridad: $("#pdFiltroPrioridad").val() || "",
        Estado: pestana === "pendientes" ? ($("#pdFiltroEstado").val() || "") : "",
        Busqueda: $("#pdFiltroBusqueda").val() || ""
    };

    const result = await MakeAjax({
        type: "POST",
        url: "/Pendientes/Listar",
        async: true,
        data: JSON.stringify(filtro),
        contentType: "application/json",
        dataType: "json"
    });

    const data = (result && result.data) || [];
    if (gridPendientes) {
        gridPendientes.clear();
        gridPendientes.rows.add(data);
        gridPendientes.draw();
        return;
    }

    $("#grdPendientes thead tr.filters").remove();
    if (typeof inicializarEncabezadoColumnas === "function")
        inicializarEncabezadoColumnas("#grdPendientes");

    gridPendientes = $("#grdPendientes").DataTable({
        data: data,
        deferRender: true,
        destroy: true,
        language: { url: "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json" },
        scrollX: true,
        scrollCollapse: true,
        autoWidth: false,
        orderCellsTop: true,
        order: [[7, "asc"], [10, "desc"]],
        initComplete: function () {
            pdInitColumnFilters(this.api());
        },
        rowCallback: function (row, data) {
            if (!data) return;
            row.setAttribute("data-pd-id", data.Id);
            row.classList.toggle("seleccionada", data.Id === pdFilaSelId);
        },
        drawCallback: function () {
            renderCardsPd(this.api());
            aplicarFlashCeldas();
        },
        columns: [
            { data: "Tipo", className: "text-center", render: chipTipo, createdCell: marcaCampo("tipo") },
            { data: "Nombre", className: "text-center", createdCell: marcaCampo("persona") },
            { data: "Dni", className: "text-center" },
            { data: "Direccion" },
            { data: "Telefono", className: "text-center" },
            { data: "Titulo", className: "pd-col-titulo", render: renderProblematica, createdCell: marcaCampo("titulo") },
            { data: "Responsable", className: "text-center", createdCell: marcaCampo("responsable") },
            { data: "Prioridad", className: "text-center", render: chipPrioridad, createdCell: marcaCampo("prioridad") },
            { data: "Estado", className: "text-center", render: chipEstado, createdCell: marcaCampo("estado") },
            { data: "UsuarioCarga", className: "text-center" },
            {
                data: "FechaCargaDiaTexto",
                className: "text-center",
                render: function (data, type, row) {
                    if (type === "sort" || type === "type") return ordenFechaCarga(row);
                    return data || parteFechaCarga(row).dia || "—";
                }
            },
            {
                data: "HorarioCargaTexto",
                className: "text-center",
                render: function (data, type, row) {
                    if (type === "sort" || type === "type") return (data || parteFechaCarga(row).hora || "");
                    return data || parteFechaCarga(row).hora || "—";
                }
            },
            { data: "FechaAlarmaTexto", className: "text-center", createdCell: marcaCampo("alarma") },
            { data: "FechaResolucionTexto", className: "text-center" },
            {
                data: null,
                orderable: false,
                searchable: false,
                className: "text-center pd-col-ver",
                render: renderVerPd
            }
        ]
    });

    $("#grdPendientes tbody")
        .off("click.pdFila dblclick.pdEditar click.pdVer")
        .on("click.pdFila", "tr", function (e) {
            if ($(e.target).closest("input, select, textarea, .select2-container").length) return;
            const row = gridPendientes.row(this).data();
            if (!row || !row.Id) return;
            pdFilaSelId = row.Id;
            $("#grdPendientes tbody tr.seleccionada").removeClass("seleccionada");
            this.classList.add("seleccionada");
            marcarSeleccion(row.Id);
        })
        .on("dblclick.pdEditar", "td", function (e) {
            if (pdEsTelefono()) return;
            const $hit = $(e.target).closest("[data-pd-campo]");
            if (!$hit.length) return;
            e.preventDefault();
            const campo = $hit.attr("data-pd-campo");
            const row = gridPendientes.row($(this).closest("tr")).data();
            editarCampo(campo, row, $(this));
        })
        .on("click.pdEditarMovil", "td", function (e) {
            if (!pdEsTelefono() || !document.body.classList.contains("vh-mode-tabla")) return;
            if ($(e.target).closest("input, select, textarea, .select2-container, .pd-ver, a").length) return;
            const $hit = $(e.target).closest("[data-pd-campo]");
            if (!$hit.length) return;
            const row = gridPendientes.row($(this).closest("tr")).data();
            if (!row) return;
            editarCampo($hit.attr("data-pd-campo"), row, null);
        })
        .on("click.pdVer", ".pd-ver", function (e) {
            e.preventDefault();
            const id = Number(this.getAttribute("data-id"));
            if (id) abrirDetalle(id);
        });
}

function pdEsTelefono() {
    return window.matchMedia("(max-width: 767.98px)").matches;
}

const PD_VISTA_KEY = "pd_vista";
let pdVistaManual = false;

function pdLeerVista() {
    try {
        const v = localStorage.getItem(PD_VISTA_KEY);
        if (v === "cards" || v === "tabla") {
            pdVistaManual = true;
            return v;
        }
    } catch (err) { }
    return pdEsTelefono() ? "cards" : "tabla";
}

function pdGuardarVista(v) {
    try { localStorage.setItem(PD_VISTA_KEY, v); } catch (err) { }
}

function pdAplicarVista(vista, persist) {
    const v = vista === "tabla" ? "tabla" : "cards";
    document.body.classList.toggle("vh-mode-cards", v === "cards");
    document.body.classList.toggle("vh-mode-tabla", v === "tabla");
    const btnCards = document.getElementById("btnPdVistaCards");
    const btnTabla = document.getElementById("btnPdVistaTabla");
    if (btnCards) btnCards.classList.toggle("is-on", v === "cards");
    if (btnTabla) btnTabla.classList.toggle("is-on", v === "tabla");
    if (persist !== false) {
        pdVistaManual = true;
        pdGuardarVista(v);
    }
    if (gridPendientes) {
        try { gridPendientes.columns.adjust(); } catch (err) { }
        renderCardsPd(gridPendientes);
    }
    pdAjustarFiltrosSobreCards();
}

function pdInitVista() {
    pdAplicarVista(pdLeerVista(), false);
    const toggle = document.getElementById("pdVistaToggle");
    if (toggle) {
        toggle.addEventListener("click", function (e) {
            const btn = e.target.closest("button[data-vista]");
            if (!btn) return;
            pdAplicarVista(btn.getAttribute("data-vista"), true);
        });
    }
    let vistaResizeTimer = 0;
    window.addEventListener("resize", function () {
        if (pdVistaManual) return;
        clearTimeout(vistaResizeTimer);
        vistaResizeTimer = setTimeout(function () {
            pdAplicarVista(pdEsTelefono() ? "cards" : "tabla", false);
        }, 160);
    });
}

function sheetAbierto() {
    const sheet = document.getElementById("pdInlineSheet");
    return !!(sheet && sheet.classList.contains("is-open"));
}

function pdTrasEditar() {
    if (pdGuardando || pdEditorCancelar || sheetAbierto()) return;
    if (!pdRefreshPendiente) return;
    pdRefreshPendiente = false;
    listarPendientes();
}

function pdCerrarEditorLocal() {
    const fn = pdEditorCancelar;
    pdEditorCancelar = null;
    if (typeof fn === "function") fn();
}

function pdResponsableMultiple() {
    const el = document.getElementById("pdIdResponsable");
    return !!(el && el.multiple);
}

function idResponsableDe($sel) {
    const val = $sel && $sel.length ? $sel.val() : null;
    const primero = Array.isArray(val) ? val[0] : val;
    return Number(primero || 0);
}

function clonarOpciones($from, $to) {
    $to.empty();
    if (!$from || !$from.length) return;
    $from.find("option").each(function () {
        $to.append($(this).clone());
    });
}

function destruirSelectEn($root) {
    if (!$root || !$root.length) return;
    $root.find("select").addBack("select").each(function () {
        const $s = $(this);
        $s.off(".pdInline");
        if ($s.hasClass("select2-hidden-accessible")) {
            try { $s.select2("destroy"); } catch (err) { }
        }
    });
}

function tdDe(rowId, campo) {
    const tr = document.querySelector('#grdPendientes tbody tr[data-pd-id="' + rowId + '"]');
    if (!tr) return $();
    const td = tr.querySelector('td[data-pd-campo="' + campo + '"]');
    return td ? $(td) : $();
}

function marcaCampo(campo) {
    const ayudas = {
        tipo: "Doble clic para editar el tipo",
        persona: "Doble clic para cambiar la persona",
        titulo: "Doble clic para editar el título. La línea de abajo edita la descripción",
        responsable: "Doble clic para editar el responsable",
        prioridad: "Doble clic para editar la prioridad",
        estado: "Doble clic para editar el estado",
        alarma: "Doble clic para editar la alarma y a quién le suena"
    };
    return function (td, _cell, row) {
        if (!row || row.Estado === "Solucionado") return;
        if (campo === "persona" && row.Tipo !== "Cliente" && row.Tipo !== "Vendedor") return;
        td.setAttribute("data-pd-campo", campo);
        td.classList.add("pd-celda-edit");
        if (ayudas[campo]) td.setAttribute("title", ayudas[campo]);
    };
}

function renderProblematica(data, type, row) {
    if (type === "filter") {
        const desc = row && row.Descripcion ? String(row.Descripcion) : "";
        return ((data || "") + " " + desc).trim();
    }
    if (type && type !== "display") return data;
    const titulo = '<span class="pd-titulo-txt">' + escapePd(data || "") + "</span>";
    const descTxt = row && row.Descripcion ? String(row.Descripcion).trim() : "";
    const solucionado = row && row.Estado === "Solucionado";
    let desc = "";
    if (solucionado) {
        if (descTxt) desc = '<span class="pd-desc-prev">' + escapePd(descTxt) + "</span>";
    } else {
        desc = '<span class="pd-desc-prev" data-pd-campo="descripcion">' + escapePd(descTxt || "Agregar descripción") + "</span>";
    }
    return '<div class="pd-prob">' + titulo + desc + "</div>";
}

function renderVerPd(_d, type, row) {
    if (type && type !== "display") return "";
    if (!row || !row.Id) return "";
    return '<button type="button" class="pd-ver" data-id="' + row.Id + '"><i class="fa fa-eye"></i><span>Ver</span></button>';
}

function claseFlash(id, campo) {
    if (!pdFlash || pdFlash.id !== id || pdFlash.campo !== campo) return "";
    return " pd-flash";
}

function marcarFlash(id, campo) {
    pdFlash = { id: id, campo: campo || "" };
    clearTimeout(pdFlashTimer);
    pdFlashTimer = setTimeout(function () { pdFlash = null; }, 1600);
}

function aplicarFlashCeldas() {
    if (!pdFlash) return;
    const tr = document.querySelector('#grdPendientes tbody tr[data-pd-id="' + pdFlash.id + '"]');
    if (!tr) return;
    const el = tr.querySelector('[data-pd-campo="' + pdFlash.campo + '"]');
    if (el) el.classList.add("pd-flash");
}

function filaPorId(id) {
    let found = null;
    if (!gridPendientes) return null;
    gridPendientes.rows().every(function () {
        const d = this.data();
        if (d && d.Id === id) found = d;
    });
    return found;
}

function marcarSeleccion(id) {
    $("#grdPendientes tbody tr.seleccionada").removeClass("seleccionada");
    $('#grdPendientes tbody tr[data-pd-id="' + id + '"]').addClass("seleccionada");
    document.querySelectorAll("#pdCards .pd-card").forEach(function (c) {
        c.classList.toggle("is-sel", Number(c.getAttribute("data-pd-id")) === id);
    });
}

function telHref(v) {
    const t = String(v || "").replace(/[^\d+]/g, "");
    return t.length >= 5 ? "tel:" + t : "";
}

function kickerValor(k, v) {
    return '<span class="pd-card-k">' + k + '</span><span class="pd-card-v">' + v + "</span>";
}

function botonCampo(row, campo, htmlInterno, clase) {
    const cls = (clase || "pd-card-hit") + claseFlash(row.Id, campo);
    if (row.Estado === "Solucionado")
        return '<div class="' + cls + '">' + htmlInterno + "</div>";
    return '<button type="button" class="' + cls + '" data-pd-campo="' + campo + '">' + htmlInterno + "</button>";
}

function parteFechaCarga(row) {
    const dia = row && row.FechaCargaDiaTexto ? String(row.FechaCargaDiaTexto).trim() : "";
    const hora = row && row.HorarioCargaTexto ? String(row.HorarioCargaTexto).trim() : "";
    if (dia || hora) return { dia: dia, hora: hora };
    const texto = String((row && row.FechaCargaTexto) || "").trim();
    const i = texto.lastIndexOf(" ");
    if (i < 0) return { dia: texto, hora: "" };
    return { dia: texto.slice(0, i), hora: texto.slice(i + 1) };
}

function ordenFechaCarga(row) {
    const p = parteFechaCarga(row);
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(p.dia);
    const h = /^(\d{2}):(\d{2})$/.exec(p.hora);
    if (!m) return 0;
    return new Date(+m[3], +m[2] - 1, +m[1], h ? +h[1] : 0, h ? +h[2] : 0).getTime();
}

function htmlFechaCargaCard(row) {
    const p = parteFechaCarga(row);
    if (!p.dia && !p.hora) return "";
    return escapePd(p.dia) + (p.hora ? ' <span class="pd-card-hora">' + escapePd(p.hora) + "</span>" : "");
}

function htmlCardPd(row) {
    const sel = row.Id === pdFilaSelId ? " is-sel" : "";
    const alarmaTxt = row.FechaAlarmaTexto && row.FechaAlarmaTexto !== "—" ? row.FechaAlarmaTexto : "Sin alarma";
    const descTxt = row.Descripcion && String(row.Descripcion).trim() ? String(row.Descripcion).trim() : "Tocá para completar";
    let quien = "";
    if (row.Tipo === "Cliente" || row.Tipo === "Vendedor") {
        const lineas = [];
        if (row.Nombre && row.Nombre !== "—") lineas.push("<strong>" + escapePd(row.Nombre) + "</strong>");
        if (row.Dni && row.Dni !== "—") lineas.push("<span>DNI " + escapePd(row.Dni) + "</span>");
        if (row.Direccion && row.Direccion !== "—") lineas.push("<span>" + escapePd(row.Direccion) + "</span>");
        if (row.Telefono && row.Telefono !== "—") {
            const href = telHref(row.Telefono);
            lineas.push(href
                ? '<a class="pd-tel" href="' + escapePd(href) + '">' + escapePd(row.Telefono) + "</a>"
                : "<span>" + escapePd(row.Telefono) + "</span>");
        }
        const cambiar = row.Estado === "Solucionado" ? "" : botonCampo(row, "persona",
            '<span class="pd-card-k">' + (row.Tipo === "Vendedor" ? "Cambiar vendedor" : "Cambiar cliente") + "</span>",
            "pd-card-hit pd-card-sec");
        quien = '<div class="pd-card-quien">' + lineas.join("") + "</div>" + cambiar;
    }
    return '<article class="pd-card' + sel + '" data-pd-id="' + row.Id + '">' +
        '<div class="pd-card-top">' +
        '<span class="pd-card-fecha">' + htmlFechaCargaCard(row) + "</span>" +
        botonCampo(row, "tipo", chipTipo(row.Tipo), "pd-card-chip") +
        '<button type="button" class="pd-ver" data-id="' + row.Id + '"><i class="fa fa-eye"></i><span>Ver</span></button>' +
        "</div>" +
        botonCampo(row, "titulo", kickerValor("Problemática", escapePd(row.Titulo || "")), "pd-card-hit pd-card-main") +
        '<div class="pd-card-pills">' +
        botonCampo(row, "prioridad", chipPrioridad(row.Prioridad), "pd-card-pill") +
        botonCampo(row, "estado", chipEstado(row.Estado), "pd-card-pill") +
        "</div>" +
        botonCampo(row, "responsable", kickerValor("Responsable", escapePd(row.Responsable || "")), "pd-card-hit") +
        quien +
        botonCampo(row, "alarma", kickerValor("Alarma", escapePd(alarmaTxt)), "pd-card-hit") +
        botonCampo(row, "descripcion", kickerValor("Descripción", escapePd(descTxt)), "pd-card-hit pd-card-sec") +
        "</article>";
}

function renderCardsPd(api) {
    const dt = api || gridPendientes;
    const root = document.getElementById("pdCards");
    if (!root || !dt) return;
    const filas = [];
    dt.rows({ search: "applied", order: "applied", page: "current" }).every(function () {
        const d = this.data();
        if (d) filas.push(d);
    });
    if (!filas.length)
        root.innerHTML = '<div class="pd-card pd-card-vacio">No hay actividades con estos filtros.</div>';
    else
        root.innerHTML = filas.map(htmlCardPd).join("");
    if (typeof pdAjustarFiltrosSobreCards === "function")
        pdAjustarFiltrosSobreCards();
}

function editarCampo(campo, row, $td) {
    if (pdGuardando || !campo || !row || !row.Id) return;
    if (row.Estado === "Solucionado") {
        errorModal("La actividad ya está solucionada. Usá Ver si hay que reabrirla.");
        return;
    }
    if (campo === "persona" && row.Tipo !== "Cliente" && row.Tipo !== "Vendedor") return;
    if ($td && $td.length && $td.hasClass("pd-editando")) return;
    const telefono = pdEsTelefono() || !$td || !$td.length;
    if (!telefono && (campo === "prioridad" || campo === "estado")) {
        editarOpcionEnCelda($td, row, campo);
        return;
    }
    if (!telefono && campo === "responsable" && !pdResponsableMultiple()) {
        editarResponsableEnCelda($td, row);
        return;
    }
    if (!telefono && campo === "titulo") {
        editarTituloEnCelda($td, row);
        return;
    }
    const ancla = (!telefono && $td && $td.length) ? $td.get(0) : null;
    abrirSheet(campo, row, ancla);
}

function editarOpcionEnCelda($td, row, campo) {
    pdCerrarEditorLocal();
    const fresco = tdDe(row.Id, campo);
    if (fresco.length) $td = fresco;
    const actual = campo === "estado" ? (row.Estado || "Pendiente") : (row.Prioridad || "Media");
    const opciones = campo === "estado" ? ["Pendiente", "En proceso"] : ["Alta", "Media", "Baja"];
    if (opciones.indexOf(actual) < 0) opciones.push(actual);
    const idx = gridPendientes.cell($td).index();
    const select = document.createElement("select");
    select.className = "pd-inline-select";
    select.setAttribute("aria-label", campo === "estado" ? "Estado" : "Prioridad");
    opciones.forEach(function (op) {
        const o = document.createElement("option");
        o.value = op;
        o.textContent = op;
        select.appendChild(o);
    });
    select.value = actual;
    $td.empty().addClass("pd-editando").append(select);
    let cerrado = false;
    function restaurar() {
        if (cerrado) return;
        cerrado = true;
        pdEditorCancelar = null;
        $td.removeClass("pd-editando");
        if (idx) gridPendientes.cell(idx.row, idx.column).data(actual).draw(false);
        pdTrasEditar();
    }
    async function guardar() {
        if (cerrado) return;
        const valor = select.value;
        if (!valor || valor === actual) { restaurar(); return; }
        cerrado = true;
        pdEditorCancelar = null;
        $td.removeClass("pd-editando").text("Guardando…");
        const patch = campo === "estado" ? { Estado: valor } : { Prioridad: valor };
        const ok = await guardarPatch(row.Id, patch, campo);
        if (!ok && idx) gridPendientes.cell(idx.row, idx.column).data(actual).draw(false);
        pdTrasEditar();
    }
    select.addEventListener("change", function () { guardar(); });
    select.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); restaurar(); }
        else if (e.key === "Enter") { e.preventDefault(); guardar(); }
    });
    select.addEventListener("blur", function () {
        setTimeout(function () { if (!cerrado) restaurar(); }, 180);
    });
    pdEditorCancelar = restaurar;
    select.focus();
}

function editarResponsableEnCelda($td, row) {
    if (pdResponsableMultiple()) {
        abrirSheet("responsable", row, $td.get(0));
        return;
    }
    pdCerrarEditorLocal();
    const fresco = tdDe(row.Id, "responsable");
    if (fresco.length) $td = fresco;
    const actual = Number(row.IdResponsable || 0);
    const idx = gridPendientes.cell($td).index();
    const $sel = $("<select class='pd-inline-select' aria-label='Responsable'></select>");
    clonarOpciones($("#pdIdResponsable"), $sel);
    if (!$sel.find("option").length) {
        errorModal("No hay responsables cargados.");
        return;
    }
    $td.empty().addClass("pd-editando").append($sel);
    if (tieneSelect2()) {
        pdInitSelect2($sel, {
            dropdownParent: $(document.body),
            minimumResultsForSearch: 0,
            width: "100%",
            placeholder: "Responsable"
        });
    }
    $sel.val(String(actual));
    if ($sel.hasClass("select2-hidden-accessible")) $sel.trigger("change.select2");
    let cerrado = false;
    function restaurar() {
        if (cerrado) return;
        cerrado = true;
        pdEditorCancelar = null;
        destruirSelectEn($td);
        $td.removeClass("pd-editando");
        if (idx) gridPendientes.cell(idx.row, idx.column).data(row.Responsable).draw(false);
        pdTrasEditar();
    }
    async function guardar() {
        if (cerrado) return;
        const id = idResponsableDe($sel);
        if (!id || id === actual) { restaurar(); return; }
        cerrado = true;
        pdEditorCancelar = null;
        destruirSelectEn($td);
        $td.removeClass("pd-editando").text("Guardando…");
        const ok = await guardarPatch(row.Id, { IdResponsable: id }, "responsable");
        if (!ok && idx) gridPendientes.cell(idx.row, idx.column).data(row.Responsable).draw(false);
        pdTrasEditar();
    }
    $sel.on("change.pdInline", function () { setTimeout(guardar, 0); });
    $sel.on("keydown.pdInline", function (e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); restaurar(); }
        else if (e.key === "Enter") { e.preventDefault(); guardar(); }
    });
    if (tieneSelect2()) {
        $sel.on("select2:close.pdInline", function () {
            setTimeout(function () { if (!cerrado) restaurar(); }, 120);
        });
        try { $sel.select2("open"); } catch (err) { }
    } else {
        $sel.on("blur.pdInline", function () {
            setTimeout(function () { if (!cerrado) restaurar(); }, 180);
        });
        $sel.focus();
    }
    pdEditorCancelar = restaurar;
}

function editarTituloEnCelda($td, row) {
    pdCerrarEditorLocal();
    const fresco = tdDe(row.Id, "titulo");
    if (fresco.length) $td = fresco;
    const actual = row.Titulo || "";
    const idx = gridPendientes.cell($td).index();
    const input = document.createElement("input");
    input.type = "text";
    input.className = "pd-inline-input";
    input.maxLength = 200;
    input.value = actual;
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Problemática");
    $td.empty().addClass("pd-editando").append(input);
    let cerrado = false;
    function restaurar() {
        if (cerrado) return;
        cerrado = true;
        pdEditorCancelar = null;
        $td.removeClass("pd-editando");
        if (idx) gridPendientes.cell(idx.row, idx.column).data(actual).draw(false);
        pdTrasEditar();
    }
    async function guardar() {
        if (cerrado) return;
        const valor = input.value.trim();
        if (valor === String(actual).trim()) { restaurar(); return; }
        if (!valor) {
            input.classList.add("is-bad");
            input.focus();
            return;
        }
        cerrado = true;
        pdEditorCancelar = null;
        $td.removeClass("pd-editando").text("Guardando…");
        const ok = await guardarPatch(row.Id, { Titulo: valor }, "titulo");
        if (!ok && idx) gridPendientes.cell(idx.row, idx.column).data(actual).draw(false);
        pdTrasEditar();
    }
    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); guardar(); }
        else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); restaurar(); }
    });
    input.addEventListener("change", function () { guardar(); });
    input.addEventListener("blur", function () {
        setTimeout(function () { if (!cerrado) restaurar(); }, 180);
    });
    pdEditorCancelar = restaurar;
    input.focus();
    input.select();
}

function tomar(patch, key, fallback) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, key)) return patch[key];
    return fallback;
}

function fechaPayloadDesde(val, horaDefecto) {
    const p = toLocalParts(val);
    if (!p.dia) return null;
    return p.dia + "T" + (p.hora || horaDefecto || "00:00");
}

function textoAlarma(iso) {
    const p = toLocalParts(iso);
    if (!p.dia) return "—";
    const partes = p.dia.split("-");
    if (partes.length !== 3) return "—";
    return partes[2] + "/" + partes[1] + "/" + partes[0] + (p.hora ? " " + p.hora : "");
}

function aplicarPatchLocal(id, patch) {
    if (!gridPendientes || !patch) return;
    gridPendientes.rows().every(function () {
        const cur = this.data();
        if (!cur || cur.Id !== id) return;
        const next = Object.assign({}, cur);
        if (Object.prototype.hasOwnProperty.call(patch, "Titulo")) next.Titulo = patch.Titulo;
        if (Object.prototype.hasOwnProperty.call(patch, "Descripcion")) next.Descripcion = patch.Descripcion;
        if (Object.prototype.hasOwnProperty.call(patch, "Prioridad")) next.Prioridad = patch.Prioridad;
        if (Object.prototype.hasOwnProperty.call(patch, "Estado")) next.Estado = patch.Estado;
        if (Object.prototype.hasOwnProperty.call(patch, "Tipo")) {
            next.Tipo = patch.Tipo;
            if (patch.Tipo === "Interno") {
                next.Nombre = "—";
                next.Dni = "—";
                next.Direccion = "—";
                next.Telefono = "—";
            }
        }
        if (Object.prototype.hasOwnProperty.call(patch, "Responsables") || Object.prototype.hasOwnProperty.call(patch, "IdResponsable")) {
            const ids = Array.isArray(patch.Responsables) && patch.Responsables.length
                ? patch.Responsables
                : [patch.IdResponsable || next.IdResponsable];
            next.Responsables = ids;
            next.IdResponsable = Number(ids[0] || 0);
            const txt = textoResponsables(ids);
            if (txt) next.Responsable = txt;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "FechaAlarma"))
            next.FechaAlarmaTexto = patch.FechaAlarma ? textoAlarma(patch.FechaAlarma) : "—";
        this.data(next);
    });
    gridPendientes.draw(false);
}

async function guardarPatch(id, patch, campo) {
    pdGuardando = true;
    try {
        const r = await $.getJSON("/Pendientes/Detalle", { id: id });
        if (!r || !r.ok || !r.data) {
            errorModal("No se pudo leer la actividad.");
            return false;
        }
        const d = r.data;
        if (d.Estado === "Solucionado") {
            errorModal("La actividad ya está solucionada. Usá Ver si hay que reabrirla.");
            return false;
        }
        const tipo = tomar(patch, "Tipo", d.Tipo || "Interno");
        let idCliente = tomar(patch, "IdCliente", d.IdCliente);
        let idVendedor = tomar(patch, "IdVendedor", d.IdVendedor);
        if (tipo !== "Cliente") idCliente = null;
        if (tipo !== "Vendedor") idVendedor = null;
        const estado = tomar(patch, "Estado", d.Estado || "Pendiente");
        if (estado === "Solucionado") {
            errorModal("Para marcarla solucionada abrí Ver y escribí cómo se resolvió.");
            return false;
        }
        const titulo = String(tomar(patch, "Titulo", d.Titulo || "") || "").trim();
        if (!titulo) {
            errorModal("Escribí el título de la problemática.");
            return false;
        }
        if (tipo === "Cliente" && !(Number(idCliente) > 0)) {
            errorModal("Buscá y seleccioná un cliente.");
            return false;
        }
        if (tipo === "Vendedor" && !(Number(idVendedor) > 0)) {
            errorModal("Seleccioná un vendedor.");
            return false;
        }
        let responsables = tomar(patch, "Responsables", null);
        if (!Array.isArray(responsables))
            responsables = Array.isArray(d.Responsables) ? d.Responsables.slice() : [];
        responsables = responsables.map(Number).filter(function (n) { return n > 0; });
        const idResp = responsables.length
            ? responsables[0]
            : Number(tomar(patch, "IdResponsable", d.IdResponsable) || 0);
        if (!responsables.length && idResp > 0)
            responsables = [idResp];
        if (!responsables.length) {
            errorModal("Elegí al menos un responsable.");
            return false;
        }
        const model = {
            Id: d.Id,
            Tipo: tipo,
            Fecha: fechaPayloadDesde(d.Fecha, "00:00"),
            IdCliente: Number(idCliente) > 0 ? Number(idCliente) : null,
            IdVendedor: Number(idVendedor) > 0 ? Number(idVendedor) : null,
            Titulo: titulo,
            Descripcion: tomar(patch, "Descripcion", d.Descripcion || ""),
            ObservacionInicial: "",
            IdResponsable: idResp,
            Responsables: responsables,
            Prioridad: tomar(patch, "Prioridad", d.Prioridad || "Media"),
            Estado: estado,
            FechaAlarma: tomar(patch, "FechaAlarma", fechaPayloadDesde(d.FechaAlarma, "09:00")),
            Destinatarios: tomar(patch, "Destinatarios", d.Destinatarios || [])
        };
        const result = await MakeAjax({
            type: "POST",
            url: "/Pendientes/Guardar",
            async: true,
            data: JSON.stringify(model),
            contentType: "application/json",
            dataType: "json"
        });
        if (!result || !result.ok) {
            errorModal((result && result.mensaje) || "No se pudo guardar.");
            return false;
        }
        marcarFlash(id, campo);
        aplicarPatchLocal(id, patch);
        try { await listarPendientes(); } catch (err) { }
        return true;
    } catch (err) {
        errorModal("No se pudo guardar.");
        return false;
    } finally {
        pdGuardando = false;
        if (pdRefreshPendiente && !pdEditorCancelar && !sheetAbierto()) {
            pdRefreshPendiente = false;
            listarPendientes();
        }
    }
}

function tituloSheet(campo, row) {
    if (campo === "persona") return row && row.Tipo === "Vendedor" ? "Vendedor" : "Cliente";
    const map = {
        prioridad: "Prioridad",
        estado: "Estado",
        responsable: "Responsable",
        titulo: "Problemática",
        descripcion: "Descripción",
        tipo: "Tipo de actividad",
        alarma: "Alarma"
    };
    return map[campo] || "Editar";
}

function htmlOpciones(vals, actual) {
    return '<div class="pd-choice-grid">' + vals.map(function (v) {
        const on = v === actual;
        const tono = v === "Alta" ? "is-alta" : v === "Baja" ? "is-baja" : v === "Media" ? "is-media"
            : v === "En proceso" ? "is-proc" : v === "Solucionado" ? "is-ok" : "is-pend";
        return '<button type="button" class="pd-choice ' + tono + (on ? " is-on" : "") + '" data-val="' + escapePd(v) + '" aria-pressed="' + (on ? "true" : "false") + '">' + escapePd(v) + "</button>";
    }).join("") + "</div>";
}

function engancharChoices(root) {
    root.querySelectorAll(".pd-choice").forEach(function (b) {
        b.addEventListener("click", function () {
            root.querySelectorAll(".pd-choice").forEach(function (x) {
                const on = x === b;
                x.classList.toggle("is-on", on);
                x.setAttribute("aria-pressed", on ? "true" : "false");
            });
        });
    });
}

function mostrarPersonaDeTipo(root, tipo) {
    root.querySelectorAll(".pd-sheet-persona").forEach(function (box) {
        box.hidden = box.getAttribute("data-para") !== tipo;
    });
    setTimeout(function () {
        $(root).find(".pd-sheet-persona select").each(function () {
            const $s = $(this);
            if ($s.hasClass("select2-hidden-accessible"))
                $s.next(".select2-container").css("width", "100%");
        });
    }, 0);
}

function htmlTipoCards(tipoActual) {
    const items = [
        ["Cliente", "fa-user"],
        ["Vendedor", "fa-briefcase"],
        ["Interno", "fa-building"]
    ];
    return '<div class="pd-tipo-grid pd-sheet-tipos">' + items.map(function (it) {
        const on = it[0] === tipoActual;
        return '<button type="button" class="pd-tipo-card' + (on ? " is-on" : "") + '" data-tipo="' + it[0] + '" aria-pressed="' + (on ? "true" : "false") + '"><i class="fa ' + it[1] + '"></i><strong>' + it[0] + "</strong></button>";
    }).join("") + "</div>" +
        '<div class="pd-sheet-persona" data-para="Cliente"><label class="pd-label" for="pdInlineCliente">Buscar por nombre o DNI</label><select id="pdInlineCliente" class="pd-input"></select></div>' +
        '<div class="pd-sheet-persona" data-para="Vendedor"><label class="pd-label" for="pdInlineVendedor">Vendedor</label><select id="pdInlineVendedor" class="pd-input"></select></div>';
}

function engancharTiposSheet(root) {
    root.querySelectorAll(".pd-tipo-card").forEach(function (b) {
        b.addEventListener("click", function () {
            root.querySelectorAll(".pd-tipo-card").forEach(function (x) {
                const on = x === b;
                x.classList.toggle("is-on", on);
                x.setAttribute("aria-pressed", on ? "true" : "false");
            });
            mostrarPersonaDeTipo(root, b.getAttribute("data-tipo"));
        });
    });
}

function initClienteInline(id, texto) {
    const $s = $("#pdInlineCliente");
    if (!$s.length) return;
    pdInitSelect2($s, {
        placeholder: "Buscá por nombre o DNI",
        allowClear: true,
        minimumInputLength: 2,
        ajax: pdAjaxCliente(),
        dropdownParent: $(document.body)
    });
    if (id) {
        $s.append(new Option(texto || "Cliente", String(id), true, true));
        if ($s.hasClass("select2-hidden-accessible")) $s.trigger("change.select2");
    }
}

function initVendedorInline(valor) {
    const $vend = $("#pdInlineVendedor");
    if (!$vend.length) return;
    $vend.empty().append('<option value=""></option>');
    vendedoresLista.forEach(function (x) {
        const id = pdUserId(x);
        const nom = pdUserNombre(x);
        if (!id || !nom) return;
        const opt = new Option(pdTextoVendedor(x), String(id), false, false);
        opt.setAttribute("data-busqueda", pdBusquedaVendedor(x));
        $vend.append(opt);
    });
    pdInitSelect2($vend, {
        placeholder: "Buscá por nombre o usuario",
        allowClear: false,
        minimumResultsForSearch: 0,
        matcher: pdMatcherVendedor,
        dropdownParent: $(document.body)
    });
    if (valor && $vend.find('option[value="' + valor + '"]').length)
        $vend.val(String(valor)).trigger("change.select2");
}

function textoClienteDetalle(d) {
    const nombre = d && d.Nombre && d.Nombre !== "—" ? d.Nombre : "Cliente";
    const dni = d && d.Dni && d.Dni !== "—" ? d.Dni : "";
    return (nombre + (dni ? " · " + dni : "")).trim();
}

function initRespInline(valor) {
    const $sel = $("#pdInlineResp");
    if (!$sel.length) return [];
    $sel.attr("multiple", "multiple");
    clonarOpciones($("#pdIdResponsable"), $sel);
    pdInitSelect2($sel, {
        placeholder: "Elegí uno o varios",
        allowClear: false,
        closeOnSelect: false,
        minimumResultsForSearch: 0,
        dropdownParent: $(document.body)
    });
    engancharAtajoTodos($sel);
    const ids = Array.isArray(valor) ? valor : (valor ? [valor] : []);
    aplicarIdsEnMulti($sel, ids);
    return responsablesSeleccionados($sel);
}

function initAlarmaInline(detalle) {
    const partes = toLocalParts(detalle && detalle.FechaAlarma);
    const dia = document.getElementById("pdInlineAlarmaDia");
    const hora = document.getElementById("pdInlineAlarmaHora");
    if (dia) dia.value = partes.dia || "";
    if (hora) hora.value = partes.hora || "";
    const $d = $("#pdInlineDest");
    clonarOpciones($("#pdDestinatarios"), $d);
    pdInitSelect2($d, {
        placeholder: "Elegí quién recibe la alarma",
        allowClear: true,
        closeOnSelect: false,
        minimumResultsForSearch: 0,
        dropdownParent: $(document.body)
    });
    engancharAtajoTodos($d);
    aplicarIdsEnMulti($d, (detalle && detalle.Destinatarios) || []);
}

function opcionElegida(root) {
    const b = root.querySelector(".pd-choice.is-on");
    return b ? b.getAttribute("data-val") : "";
}

function leerTipoDesde(root, fijo) {
    const btn = root.querySelector(".pd-tipo-card.is-on");
    const tipo = fijo || (btn ? btn.getAttribute("data-tipo") : "Interno");
    const patch = { Tipo: tipo, IdCliente: null, IdVendedor: null };
    if (tipo === "Cliente") {
        const id = Number($("#pdInlineCliente").val() || 0);
        if (!id) { errorModal("Buscá y seleccioná un cliente."); return false; }
        patch.IdCliente = id;
    }
    if (tipo === "Vendedor") {
        const id = Number($("#pdInlineVendedor").val() || 0);
        if (!id) { errorModal("Seleccioná un vendedor."); return false; }
        patch.IdVendedor = id;
    }
    return patch;
}

function pintarCuerpoSheet(campo, row, detalle) {
    const body = document.getElementById("pdSheetBody");
    if (!body) return;
    destruirSelectEn($(body));
    const d = detalle || row;
    if (campo === "prioridad") {
        body.innerHTML = htmlOpciones(["Alta", "Media", "Baja"], d.Prioridad || "Media");
        engancharChoices(body);
        pdSheetCtx.leerPatch = function () {
            const v = opcionElegida(body);
            if (!v) { errorModal("Elegí una prioridad."); return false; }
            return { Prioridad: v };
        };
    } else if (campo === "estado") {
        body.innerHTML = htmlOpciones(["Pendiente", "En proceso"], d.Estado || "Pendiente");
        engancharChoices(body);
        pdSheetCtx.leerPatch = function () {
            const v = opcionElegida(body);
            if (!v) { errorModal("Elegí un estado."); return false; }
            return { Estado: v };
        };
    } else if (campo === "responsable") {
        const idsResp = (d.Responsables && d.Responsables.length)
            ? d.Responsables
            : [d.IdResponsable || row.IdResponsable];
        body.innerHTML = '<label class="pd-label" for="pdInlineResp">Responsables</label><select id="pdInlineResp" class="pd-input" multiple></select><p class="pd-hint">Todos marca a todas las personas. Después podés sacar de a una.</p>';
        initRespInline(idsResp);
        pdSheetCtx.leerPatch = function () {
            const elegidos = responsablesSeleccionados($("#pdInlineResp"));
            if (!elegidos.length) { errorModal("Elegí al menos un responsable."); return false; }
            return { IdResponsable: elegidos[0], Responsables: elegidos };
        };
    } else if (campo === "titulo") {
        body.innerHTML = '<label class="pd-label" for="pdInlineTitulo">Título</label><input type="text" id="pdInlineTitulo" class="pd-input" maxlength="200" autocomplete="off" />';
        document.getElementById("pdInlineTitulo").value = d.Titulo || "";
        pdSheetCtx.leerPatch = function () {
            const val = document.getElementById("pdInlineTitulo").value.trim();
            if (!val) { errorModal("Escribí el título de la problemática."); return false; }
            return { Titulo: val };
        };
    } else if (campo === "descripcion") {
        body.innerHTML = '<label class="pd-label" for="pdInlineDesc">Descripción</label><textarea id="pdInlineDesc" class="pd-input" rows="5"></textarea>';
        document.getElementById("pdInlineDesc").value = d.Descripcion || "";
        pdSheetCtx.leerPatch = function () {
            return { Descripcion: document.getElementById("pdInlineDesc").value };
        };
    } else if (campo === "tipo" || campo === "persona") {
        const tipo = (campo === "persona" ? (row.Tipo || d.Tipo) : (d.Tipo || row.Tipo)) || "Interno";
        if (campo === "persona") {
            body.innerHTML = tipo === "Vendedor"
                ? '<label class="pd-label" for="pdInlineVendedor">Vendedor</label><select id="pdInlineVendedor" class="pd-input"></select>'
                : '<label class="pd-label" for="pdInlineCliente">Buscar por nombre o DNI</label><select id="pdInlineCliente" class="pd-input"></select>';
        } else {
            body.innerHTML = htmlTipoCards(tipo);
            engancharTiposSheet(body);
            mostrarPersonaDeTipo(body, tipo);
        }
        if (tipo === "Cliente" || campo === "tipo")
            initClienteInline(d.IdCliente, d.IdCliente ? textoClienteDetalle(d) : "");
        if (tipo === "Vendedor" || campo === "tipo")
            initVendedorInline(d.IdVendedor || "");
        pdSheetCtx.leerPatch = function () {
            return leerTipoDesde(body, campo === "persona" ? tipo : "");
        };
    } else if (campo === "alarma") {
        body.innerHTML =
            '<label class="pd-label" for="pdInlineAlarmaDia">Fecha de alarma</label>' +
            '<input type="date" id="pdInlineAlarmaDia" class="pd-input" />' +
            '<label class="pd-label" for="pdInlineAlarmaHora">Hora</label>' +
            '<input type="time" id="pdInlineAlarmaHora" class="pd-input" />' +
            '<label class="pd-label" for="pdInlineDest">¿A quién le suena la alarma?</label>' +
            '<select id="pdInlineDest" class="pd-input" multiple></select>' +
            '<p class="pd-hint">Todos elige a todas las personas. Después podés sacar de a una.</p>';
        initAlarmaInline(d);
        pdSheetCtx.leerPatch = function () {
            const diaEl = document.getElementById("pdInlineAlarmaDia");
            const horaEl = document.getElementById("pdInlineAlarmaHora");
            const dia = diaEl ? diaEl.value : "";
            const hora = horaEl ? horaEl.value : "";
            return {
                FechaAlarma: dia ? (dia + "T" + (hora || "09:00")) : null,
                Destinatarios: destinatariosSeleccionados($("#pdInlineDest"))
            };
        };
    }
}

function posicionarSheet(anchorEl) {
    const sheet = document.getElementById("pdInlineSheet");
    if (!sheet) return;
    const panel = sheet.querySelector(".pd-sheet-panel");
    const telefono = pdEsTelefono();
    sheet.classList.toggle("is-sheet", telefono);
    sheet.classList.toggle("is-pop", !telefono);
    document.body.classList.toggle("pd-sheet-open", telefono && sheet.classList.contains("is-open"));
    if (!panel) return;
    panel.style.left = "";
    panel.style.top = "";
    panel.style.width = "";
    panel.style.bottom = "";
    panel.style.maxHeight = "";
    if (telefono) {
        ajustarSheetTeclado();
        return;
    }
    const ancho = Math.min(440, window.innerWidth - 16);
    let left = 8;
    let top = 72;
    if (anchorEl && anchorEl.getBoundingClientRect) {
        const r = anchorEl.getBoundingClientRect();
        left = Math.max(8, Math.min(r.left, window.innerWidth - ancho - 8));
        top = Math.max(8, r.bottom + 8);
    }
    panel.style.width = ancho + "px";
    panel.style.left = left + "px";
    panel.style.top = top + "px";
    requestAnimationFrame(function () {
        if (!sheet.classList.contains("is-pop")) return;
        const h = panel.offsetHeight;
        if (top + h > window.innerHeight - 8) {
            const arriba = anchorEl && anchorEl.getBoundingClientRect ? anchorEl.getBoundingClientRect().top - h - 8 : 8;
            panel.style.top = Math.max(8, arriba) + "px";
        }
    });
}

function ajustarSheetTeclado() {
    const sheet = document.getElementById("pdInlineSheet");
    if (!sheet || !sheet.classList.contains("is-sheet")) return;
    const panel = sheet.querySelector(".pd-sheet-panel");
    if (!panel) return;
    const vv = window.visualViewport;
    if (!vv) {
        panel.style.bottom = "0px";
        panel.style.maxHeight = "88dvh";
        return;
    }
    const cubre = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    panel.style.bottom = cubre + "px";
    panel.style.maxHeight = Math.max(240, vv.height - 8) + "px";
}

function cerrarSheet() {
    const sheet = document.getElementById("pdInlineSheet");
    if (!sheet) return;
    pdSheetToken++;
    destruirSelectEn($("#pdSheetBody"));
    sheet.classList.remove("is-open", "is-sheet", "is-pop");
    sheet.hidden = true;
    document.body.classList.remove("pd-sheet-open");
    const body = document.getElementById("pdSheetBody");
    if (body) body.innerHTML = "";
    const btn = document.getElementById("pdSheetGuardar");
    if (btn) {
        btn.disabled = false;
        btn.textContent = "Guardar";
    }
    const panel = sheet.querySelector(".pd-sheet-panel");
    if (panel) {
        panel.style.left = "";
        panel.style.top = "";
        panel.style.width = "";
        panel.style.bottom = "";
        panel.style.maxHeight = "";
    }
    pdSheetCtx = null;
    pdSheetAnchor = null;
    pdTrasEditar();
}

async function abrirSheet(campo, row, anchorEl) {
    const rect = anchorEl && anchorEl.getBoundingClientRect ? anchorEl.getBoundingClientRect() : null;
    const ancla = rect ? { getBoundingClientRect: function () { return rect; } } : null;
    pdCerrarEditorLocal();
    cerrarSheet();
    const sheet = document.getElementById("pdInlineSheet");
    const body = document.getElementById("pdSheetBody");
    const titulo = document.getElementById("pdSheetTitulo");
    if (!sheet || !body || !titulo) return;
    const token = ++pdSheetToken;
    pdSheetCtx = { campo: campo, row: row, listo: false, leerPatch: function () { return false; } };
    titulo.textContent = tituloSheet(campo, row);
    body.innerHTML = '<p class="pd-hint">Cargando…</p>';
    const btn = document.getElementById("pdSheetGuardar");
    if (btn) btn.disabled = true;
    sheet.hidden = false;
    sheet.classList.add("is-open");
    pdSheetAnchor = ancla;
    posicionarSheet(ancla);
    let detalle = row;
    if (campo === "tipo" || campo === "persona" || campo === "alarma" || campo === "responsable") {
        try {
            const r = await $.getJSON("/Pendientes/Detalle", { id: row.Id });
            if (token !== pdSheetToken) return;
            if (!r || !r.ok || !r.data) {
                errorModal("No se pudo leer la actividad.");
                cerrarSheet();
                return;
            }
            detalle = r.data;
        } catch (err) {
            if (token !== pdSheetToken) return;
            errorModal("No se pudo leer la actividad.");
            cerrarSheet();
            return;
        }
    }
    if (token !== pdSheetToken) return;
    if (detalle && detalle.Estado === "Solucionado") {
        errorModal("La actividad ya está solucionada. Usá Ver si hay que reabrirla.");
        cerrarSheet();
        return;
    }
    try {
        pintarCuerpoSheet(campo, row, detalle);
    } catch (err) {
        errorModal("No se pudo abrir el editor.");
        cerrarSheet();
        return;
    }
    if (token !== pdSheetToken || !pdSheetCtx) return;
    pdSheetCtx.listo = true;
    if (btn) btn.disabled = false;
    enfocarSheet();
}

function enfocarSheet() {
    const body = document.getElementById("pdSheetBody");
    if (!body) return;
    const el = body.querySelector("input, textarea");
    if (!el) return;
    setTimeout(function () {
        try { el.focus(); } catch (err) { }
        if (el.select && (el.type === "text" || el.tagName === "TEXTAREA")) {
            try { el.select(); } catch (e2) { }
        }
        ajustarSheetTeclado();
    }, 50);
}

async function guardarSheet() {
    if (pdGuardando || !pdSheetCtx || !pdSheetCtx.listo) return;
    const patch = pdSheetCtx.leerPatch();
    if (patch === false) return;
    const btn = document.getElementById("pdSheetGuardar");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Guardando…";
    }
    const id = pdSheetCtx.row.Id;
    const campo = pdSheetCtx.campo;
    const ok = await guardarPatch(id, patch, campo);
    if (ok) cerrarSheet();
    else if (btn) {
        btn.disabled = false;
        btn.textContent = "Guardar";
    }
}

function engancharCards() {
    const root = document.getElementById("pdCards");
    if (!root || root.getAttribute("data-on") === "1") return;
    root.setAttribute("data-on", "1");
    root.addEventListener("click", function (e) {
        const card = e.target.closest(".pd-card");
        if (!card) return;
        const id = Number(card.getAttribute("data-pd-id") || 0);
        if (!id) return;
        pdFilaSelId = id;
        marcarSeleccion(id);
        if (e.target.closest("a.pd-tel")) return;
        const ver = e.target.closest(".pd-ver");
        if (ver) {
            abrirDetalle(id);
            return;
        }
        const field = e.target.closest("[data-pd-campo]");
        if (!field) return;
        const row = filaPorId(id);
        if (!row) return;
        const campo = field.getAttribute("data-pd-campo");
        editarCampo(campo, row, null);
    });
}

function engancharTecladoSheet() {
    if (engancharTecladoSheet.listo) return;
    engancharTecladoSheet.listo = true;
    const vv = window.visualViewport;
    if (!vv) return;
    const aplicar = function () { ajustarSheetTeclado(); };
    vv.addEventListener("resize", aplicar);
    vv.addEventListener("scroll", aplicar);
}

function engancharInlinePd() {
    engancharCards();
    engancharTecladoSheet();
    const sheet = document.getElementById("pdInlineSheet");
    const cancelar = document.getElementById("pdSheetCancelar");
    const guardar = document.getElementById("pdSheetGuardar");
    const fondo = document.getElementById("pdSheetBackdrop");
    const cuerpo = document.getElementById("pdSheetBody");
    if (cancelar) cancelar.addEventListener("click", cerrarSheet);
    if (fondo) fondo.addEventListener("click", cerrarSheet);
    if (guardar) guardar.addEventListener("click", guardarSheet);
    if (cuerpo) {
        cuerpo.addEventListener("focusin", function (e) {
            setTimeout(function () {
                ajustarSheetTeclado();
                if (e.target && e.target.scrollIntoView)
                    e.target.scrollIntoView({ block: "center" });
            }, 280);
        });
    }
    if (sheet) {
        sheet.addEventListener("keydown", function (e) {
            if (!sheet.classList.contains("is-open")) return;
            const t = e.target;
            if (e.key === "Escape") {
                if ($(".select2-container--open").length) return;
                e.preventDefault();
                cerrarSheet();
            } else if (e.key === "Enter") {
                if (!t || !t.closest) return;
                if (t.id === "pdSheetCancelar" || t.closest("textarea") || t.closest(".pd-choice") || t.closest(".pd-tipo-card") || t.closest(".select2-search"))
                    return;
                e.preventDefault();
                guardarSheet();
            }
        });
    }
    engancharInlinePd.tel = pdEsTelefono();
    window.addEventListener("resize", function () {
        clearTimeout(pdResizeTimer);
        pdResizeTimer = setTimeout(function () {
            const ahora = pdEsTelefono();
            if (ahora !== engancharInlinePd.tel) {
                engancharInlinePd.tel = ahora;
                pdCerrarEditorLocal();
                if (sheetAbierto()) posicionarSheet(pdSheetAnchor);
            } else if (sheetAbierto()) {
                posicionarSheet(pdSheetAnchor);
            }
            if (!ahora && gridPendientes) {
                try { gridPendientes.columns.adjust(); } catch (err) { }
            }
        }, 160);
    });
}

function toLocalParts(val) {
    if (!val) return { dia: "", hora: "" };
    let d = val;
    if (typeof val === "string") {
        const m = /\/Date\((-?\d+)\)\//.exec(val);
        d = m ? new Date(Number(m[1])) : new Date(val);
    }
    if (!(d instanceof Date) || isNaN(d.getTime())) return { dia: "", hora: "" };
    const pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return {
        dia: d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()),
        hora: pad(d.getHours()) + ":" + pad(d.getMinutes())
    };
}

function fechaAlarmaPayload() {
    const dia = $("#pdFechaAlarmaDia").val();
    const hora = $("#pdHoraAlarma").val();
    if (!dia) return null;
    return dia + "T" + (hora || "09:00");
}

function resetFormulario() {
    destManual = false;
    $("#pdId").val("0");
    $("#pdTitulo, #pdDescripcion, #pdObsInicial, #pdObsNueva, #pdSolucion, #pdClienteNombre, #pdClienteDni, #pdClienteDireccion, #pdClienteTelefono").val("");
    $("#pdFechaAlarmaDia, #pdHoraAlarma").val("");
    $("#pdFiles").val("");
    limpiarAdjuntosNuevos();
    pdAdjuntosGuardados = [];
    $("#pdAdjuntosLista, #pdObsLista, #pdMeta").html("");
    $("#pdSeguimientoWrap, #pdCierreWrap, #pdMetaWrap").attr("hidden", true);
    $("#pdBtnSolucionar, #pdBtnReabrir").attr("hidden", true);
    $("#pdBtnGuardar").removeAttr("hidden");
    $("#pdSolucion").prop("readonly", false);
    $("#pdBtnObs").prop("disabled", false);
    setClienteSeleccionado(null, "", null);
    llenarSelectVendedor("");
    setSelectVal("#pdPrioridad", "Media");
    setSelectVal("#pdEstado", "Pendiente");
    setTipoUi("Cliente");
    const ids = userSessionPd && userSessionPd.Id ? [userSessionPd.Id] : [];
    setResponsables(ids);
    setDestinatarios(ids);
    $(".pd-obs-nueva").show();
    $("#pdModalTitulo").text("Nueva actividad");
    const sub = document.getElementById("pdModalSub");
    if (sub) sub.textContent = "Elegí el tipo y completá lo que pasó";
    destManual = false;
}

function abrirNuevo() {
    resetFormulario();
    mostrarModalPendiente();
}

function cargarEnFormulario(d) {
    destManual = true;
    $("#pdId").val(d.Id);
    $("#pdModalTitulo").text("Actividad #" + d.Id);
    const tipo = d.Tipo || "Interno";
    setTipoUi(tipo);
    $("#pdTitulo").val(d.Titulo || "");
    $("#pdDescripcion").val(d.Descripcion || "");
    setSelectVal("#pdPrioridad", d.Prioridad || "Media");
    setSelectVal("#pdEstado", d.Estado === "Solucionado" ? "En proceso" : (d.Estado || "Pendiente"));
    setResponsables((d.Responsables && d.Responsables.length) ? d.Responsables : [d.IdResponsable || 0]);
    const alarma = toLocalParts(d.FechaAlarma);
    $("#pdFechaAlarmaDia").val(alarma.dia);
    $("#pdHoraAlarma").val(alarma.hora);
    setDestinatarios(d.Destinatarios || []);
    if (tipo === "Cliente") {
        const nombre = d.Nombre || "";
        const dni = d.Dni === "—" ? "" : (d.Dni || "");
        setClienteSeleccionado(d.IdCliente || 0, (nombre + (dni ? " · " + dni : "")).trim(), {
            NombreCompleto: nombre,
            Dni: dni,
            Direccion: d.Direccion === "—" ? "" : (d.Direccion || ""),
            Telefono: d.Telefono === "—" ? "" : (d.Telefono || "")
        });
    } else {
        setClienteSeleccionado(null, "", null);
    }
    if (tipo === "Vendedor")
        llenarSelectVendedor(d.IdVendedor || "");
    else
        llenarSelectVendedor("");

    $(".pd-obs-nueva").hide();
    $("#pdSeguimientoWrap, #pdCierreWrap, #pdMetaWrap").removeAttr("hidden");
    $("#pdMeta").html(
        "Cargó <b>" + escapePd(d.UsuarioCarga) + "</b> el " + escapePd(d.FechaCargaTexto) +
        (d.UsuarioResolvio ? ". Resolvió <b>" + escapePd(d.UsuarioResolvio) + "</b> el " + escapePd(d.FechaResolucionTexto) : "")
    );
    pintarObs(d.Observaciones || []);
    pintarAdjuntos(d.Adjuntos || []);

    const solucionado = d.Estado === "Solucionado";
    if (solucionado) {
        $("#pdBtnGuardar, #pdBtnSolucionar").attr("hidden", true);
        $("#pdSolucion").val(d.Solucion || "").prop("readonly", true);
        if (esAdminPd) $("#pdBtnReabrir").removeAttr("hidden");
        else $("#pdBtnReabrir").attr("hidden", true);
        $("#pdBtnObs").prop("disabled", true);
    } else {
        $("#pdBtnGuardar").removeAttr("hidden");
        $("#pdBtnSolucionar").removeAttr("hidden");
        $("#pdBtnReabrir").attr("hidden", true);
        $("#pdSolucion").val(d.Solucion || "").prop("readonly", false);
        $("#pdBtnObs").prop("disabled", false);
    }
}

async function abrirDetalle(id, opts) {
    const r = await $.getJSON("/Pendientes/Detalle", { id: id });
    if (!r || !r.ok || !r.data) {
        errorModal("No se pudo abrir la actividad.");
        return;
    }
    resetFormulario();
    cargarEnFormulario(r.data);
    if (!(opts && opts.sinAbrir))
        mostrarModalPendiente();
}

function pintarObs(items) {
    const list = items || [];
    if (!list.length) {
        $("#pdObsLista").html('<div class="pd-hint">Sin observaciones todavía.</div>');
        return;
    }
    $("#pdObsLista").html(list.map(function (o) {
        const del = esAdminPd
            ? '<button type="button" class="pd-obs-del" data-del-obs="' + o.Id + '" aria-label="Eliminar comentario"><i class="fa fa-trash"></i></button>'
            : "";
        return '<div class="pd-obs-item" data-obs-id="' + o.Id + '">' +
            '<div class="pd-obs-top">' +
            '<div class="pd-hint">' + escapePd(o.Usuario) + " · " + escapePd(o.FechaTexto) + "</div>" +
            del +
            "</div><div>" + escapePd(o.Texto) + "</div></div>";
    }).join(""));
}

async function eliminarObs(id) {
    if (!esAdminPd || !id) return;
    const okConfirm = await confirmarModal("¿Eliminar este comentario del seguimiento?");
    if (!okConfirm) return;
    const r = await $.post("/Pendientes/EliminarObservacion", { id: id });
    if (!r || !r.ok) {
        errorModal((r && r.mensaje) || "No se pudo eliminar.");
        return;
    }
    const item = document.querySelector('.pd-obs-item[data-obs-id="' + id + '"]');
    if (item) item.remove();
    if (!$("#pdObsLista .pd-obs-item").length)
        $("#pdObsLista").html('<div class="pd-hint">Sin observaciones todavía.</div>');
    exitoModal(r.mensaje || "Comentario eliminado.");
}

function limpiarAdjuntosNuevos() {
    pdAdjuntosNuevos.forEach(function (x) {
        if (x.url) try { URL.revokeObjectURL(x.url); } catch (e) { }
    });
    pdAdjuntosNuevos = [];
}

function esArchivoAdjuntoOk(f) {
    if (!f) return false;
    const t = String(f.type || "").toLowerCase();
    const n = String(f.name || "").toLowerCase();
    return t.indexOf("image/") === 0 || t === "application/pdf" || n.endsWith(".pdf");
}

function agregarArchivosPendiente(fileList) {
    Array.from(fileList || []).forEach(function (f) {
        if (!esArchivoAdjuntoOk(f)) return;
        const img = String(f.type || "").indexOf("image/") === 0;
        pdAdjuntosNuevos.push({
            idLocal: "n" + Date.now() + "-" + Math.random().toString(36).slice(2),
            file: f,
            url: img ? URL.createObjectURL(f) : null
        });
    });
    pintarAdjuntos();
}

function initDropzonePendiente() {
    const drop = document.getElementById("pdDrop");
    const input = document.getElementById("pdFiles");
    if (!drop || !input) return;
    const abrir = function () { input.click(); };
    drop.addEventListener("click", abrir);
    drop.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            abrir();
        }
    });
    ["dragenter", "dragover"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
            e.preventDefault();
            drop.classList.add("is-over");
        });
    });
    ["dragleave", "drop"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
            e.preventDefault();
            drop.classList.remove("is-over");
        });
    });
    drop.addEventListener("drop", function (e) {
        if (e.dataTransfer && e.dataTransfer.files)
            agregarArchivosPendiente(e.dataTransfer.files);
    });
    input.addEventListener("change", function () {
        agregarArchivosPendiente(input.files);
        input.value = "";
    });
}

function pintarAdjuntos(items) {
    if (items)
        pdAdjuntosGuardados = items || [];
    const cards = [];
    pdAdjuntosGuardados.forEach(function (a) {
        const cuerpo = a.EsImagen
            ? '<a href="' + escapePd(a.Url) + '" target="_blank"><img class="pd-adj-thumb" src="' + escapePd(a.Url) + '" alt=""></a>'
            : '<a class="pd-adj-pdf" href="' + escapePd(a.Url) + '" target="_blank"><i class="fa fa-file-pdf-o"></i><span>PDF</span></a>';
        cards.push('<div class="pd-adj-card">' + cuerpo +
            '<span class="pd-adj-name">' + escapePd(a.Nombre || "") + "</span>" +
            '<button type="button" class="pd-adj-x" data-del-adj="' + a.Id + '" aria-label="Quitar"><i class="fa fa-times"></i></button></div>');
    });
    pdAdjuntosNuevos.forEach(function (x) {
        const cuerpo = x.url
            ? '<img class="pd-adj-thumb" src="' + escapePd(x.url) + '" alt="">'
            : '<div class="pd-adj-pdf"><i class="fa fa-file-pdf-o"></i><span>PDF</span></div>';
        cards.push('<div class="pd-adj-card">' + cuerpo +
            '<span class="pd-adj-name">' + escapePd(x.file && x.file.name ? x.file.name : "Archivo") + "</span>" +
            '<button type="button" class="pd-adj-x" data-del-nuevo="' + escapePd(x.idLocal) + '" aria-label="Quitar"><i class="fa fa-times"></i></button></div>');
    });
    $("#pdAdjuntosLista").html(cards.join(""));
}

function pdBotonOcupado(id, ocupado, texto) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (ocupado) {
        if (!btn.getAttribute("data-pd-texto"))
            btn.setAttribute("data-pd-texto", btn.innerHTML);
        btn.disabled = true;
        if (texto) btn.textContent = texto;
        return;
    }
    btn.disabled = false;
    const previo = btn.getAttribute("data-pd-texto");
    if (previo) {
        btn.innerHTML = previo;
        btn.removeAttribute("data-pd-texto");
    }
}

async function guardarActividad() {
    if (pdGuardando) return;
    const id = Number($("#pdId").val() || 0);
    const tipo = tipoActual();
    const responsables = responsablesSeleccionados();
    if (!responsables.length) {
        errorModal("Elegí al menos un responsable.");
        return;
    }
    const model = {
        Id: id,
        Tipo: tipo,
        IdCliente: tipo === "Cliente" ? Number($("#pdIdCliente").val() || 0) : null,
        IdVendedor: tipo === "Vendedor" ? Number($("#pdIdVendedor").val() || 0) : null,
        Titulo: $("#pdTitulo").val(),
        Descripcion: $("#pdDescripcion").val(),
        ObservacionInicial: id ? "" : $("#pdObsInicial").val(),
        IdResponsable: responsables[0],
        Responsables: responsables,
        Prioridad: $("#pdPrioridad").val(),
        Estado: $("#pdEstado").val(),
        FechaAlarma: fechaAlarmaPayload(),
        Destinatarios: destinatariosSeleccionados()
    };

    pdGuardando = true;
    pdBotonOcupado("pdBtnGuardar", true, "Guardando…");
    try {
        const result = await MakeAjax({
            type: "POST",
            url: "/Pendientes/Guardar",
            async: true,
            data: JSON.stringify(model),
            contentType: "application/json",
            dataType: "json"
        });

        if (!result || !result.ok) {
            errorModal((result && result.mensaje) || "No se pudo guardar.");
            return;
        }

        const idGuardado = Number(result.id || result.Id || 0);
        const yaExistia = !!(result.yaExistia || result.YaExistia);
        if (idGuardado > 0)
            $("#pdId").val(String(idGuardado));

        if (yaExistia)
            limpiarAdjuntosNuevos();
        else if (pdAdjuntosNuevos.length && idGuardado > 0) {
            const fd = new FormData();
            pdAdjuntosNuevos.forEach(function (x) {
                if (x.file) fd.append("file", x.file);
            });
            await MakeAjaxFormData({
                type: "POST",
                url: "/Pendientes/SubirAdjuntos?id=" + idGuardado,
                async: true,
                data: fd
            });
            limpiarAdjuntosNuevos();
        }

        exitoModal(result.mensaje || "Guardado.");
        ocultarModalPendiente();
        await listarPendientes();
    } catch (err) {
        errorModal("No se pudo guardar.");
    } finally {
        pdGuardando = false;
        pdBotonOcupado("pdBtnGuardar", false);
    }
}

async function agregarObs() {
    if (pdGuardando) return;
    const id = Number($("#pdId").val() || 0);
    const texto = $("#pdObsNueva").val();
    pdGuardando = true;
    pdBotonOcupado("pdBtnObs", true, "Agregando…");
    try {
        const r = await MakeAjax({
            type: "POST",
            url: "/Pendientes/AgregarObservacion",
            async: true,
            data: JSON.stringify({ Id: id, Texto: texto }),
            contentType: "application/json",
            dataType: "json"
        });
        if (!r || !r.ok) {
            errorModal((r && r.mensaje) || "No se pudo agregar.");
            return;
        }
        $("#pdObsNueva").val("");
        await abrirDetalle(id, { sinAbrir: true });
    } catch (err) {
        errorModal("No se pudo agregar.");
    } finally {
        pdGuardando = false;
        pdBotonOcupado("pdBtnObs", false);
    }
}

async function solucionar() {
    if (pdGuardando) return;
    const id = Number($("#pdId").val() || 0);
    const solucion = $("#pdSolucion").val();
    if (!String(solucion || "").trim()) {
        errorModal("Escribí cómo se resolvió el problema.");
        return;
    }
    pdGuardando = true;
    pdBotonOcupado("pdBtnSolucionar", true, "Guardando…");
    try {
        const r = await MakeAjax({
            type: "POST",
            url: "/Pendientes/Solucionar",
            async: true,
            data: JSON.stringify({ Id: id, Solucion: solucion }),
            contentType: "application/json",
            dataType: "json"
        });
        if (!r || !r.ok) {
            errorModal((r && r.mensaje) || "No se pudo solucionar.");
            return;
        }
        exitoModal(r.mensaje);
        ocultarModalPendiente();
        pestana = "solucionados";
        document.querySelectorAll(".pd-tab").forEach(function (t) {
            t.classList.toggle("is-on", t.getAttribute("data-pestana") === "solucionados");
        });
        $("#pdFiltroEstadoWrap").attr("hidden", true);
        await listarPendientes();
    } catch (err) {
        errorModal("No se pudo solucionar.");
    } finally {
        pdGuardando = false;
        pdBotonOcupado("pdBtnSolucionar", false);
    }
}

async function reabrir() {
    if (pdGuardando) return;
    const id = Number($("#pdId").val() || 0);
    pdGuardando = true;
    pdBotonOcupado("pdBtnReabrir", true, "Reabriendo…");
    try {
        const r = await MakeAjax({
            type: "POST",
            url: "/Pendientes/Reabrir",
            async: true,
            data: JSON.stringify({ id: id }),
            contentType: "application/json",
            dataType: "json"
        });
        if (!r || !r.ok) {
            errorModal((r && r.mensaje) || "No se pudo reabrir.");
            return;
        }
        exitoModal(r.mensaje);
        pestana = "pendientes";
        document.querySelectorAll(".pd-tab").forEach(function (t) {
            t.classList.toggle("is-on", t.getAttribute("data-pestana") === "pendientes");
        });
        $("#pdFiltroEstadoWrap").removeAttr("hidden");
        await abrirDetalle(id, { sinAbrir: true });
        await listarPendientes();
    } catch (err) {
        errorModal("No se pudo reabrir.");
    } finally {
        pdGuardando = false;
        pdBotonOcupado("pdBtnReabrir", false);
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    if (!document.getElementById("grdPendientes")) return;
    pdInitVista();
    engancharLimpiezaModales();
    engancharSelect2FocoModal();
    initDropzonePendiente();
    await cargarCombos();
    await listarPendientes();

    var btnNuevaActividad = document.getElementById("btnNuevaActividad");
    if (btnNuevaActividad) btnNuevaActividad.addEventListener("click", abrirNuevo);
    document.getElementById("pdBtnFiltrar").addEventListener("click", listarPendientes);
    document.getElementById("pdFiltroBusqueda").addEventListener("keydown", function (e) {
        if (e.key === "Enter") listarPendientes();
    });
    document.querySelectorAll(".pd-tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
            pestana = tab.getAttribute("data-pestana");
            document.querySelectorAll(".pd-tab").forEach(function (t) { t.classList.toggle("is-on", t === tab); });
            if (pestana === "solucionados") $("#pdFiltroEstadoWrap").attr("hidden", true);
            else $("#pdFiltroEstadoWrap").removeAttr("hidden");
            listarPendientes();
        });
    });
    document.querySelectorAll("#modalPendiente .pd-tipo-card").forEach(function (btn) {
        btn.addEventListener("click", function () {
            setTipoUi(btn.getAttribute("data-tipo"));
        });
    });
    document.getElementById("pdIdResponsable").addEventListener("change", function () {
        if (destManual) return;
        setDestinatarios(responsablesSeleccionados($("#pdIdResponsable")));
    });
    $("#pdDestinatarios").on("select2:select.pdDest select2:unselect.pdDest", function () {
        destManual = true;
    });
    engancharAtajoTodos($("#pdDestinatarios"));
    engancharAtajoTodos($("#pdIdResponsable"));
    document.getElementById("pdBtnGuardar").addEventListener("click", guardarActividad);
    document.getElementById("pdBtnObs").addEventListener("click", agregarObs);
    document.getElementById("pdObsLista").addEventListener("click", function (e) {
        const btn = e.target.closest("[data-del-obs]");
        if (!btn) return;
        eliminarObs(Number(btn.getAttribute("data-del-obs")));
    });
    document.getElementById("pdBtnSolucionar").addEventListener("click", solucionar);
    document.getElementById("pdBtnReabrir").addEventListener("click", reabrir);
    document.getElementById("pdAdjuntosLista").addEventListener("click", async function (e) {
        const nuevo = e.target.closest("[data-del-nuevo]");
        if (nuevo) {
            const idLocal = nuevo.getAttribute("data-del-nuevo");
            const item = pdAdjuntosNuevos.filter(function (x) { return x.idLocal === idLocal; })[0];
            if (item && item.url) try { URL.revokeObjectURL(item.url); } catch (err) { }
            pdAdjuntosNuevos = pdAdjuntosNuevos.filter(function (x) { return x.idLocal !== idLocal; });
            pintarAdjuntos();
            return;
        }
        const btn = e.target.closest("[data-del-adj]");
        if (!btn) return;
        await $.post("/Pendientes/EliminarAdjunto", { id: Number(btn.getAttribute("data-del-adj")) });
        const id = Number($("#pdId").val() || 0);
        if (id) abrirDetalle(id, { sinAbrir: true });
    });

    engancharInlinePd();

    if (window.TiempoReal) {
        window.TiempoReal.on("PendienteCambio", function () {
            if (pdGuardando || pdEditorCancelar || sheetAbierto()) {
                pdRefreshPendiente = true;
                return;
            }
            listarPendientes();
        });
    }

    if (idAbrirPd > 0) abrirDetalle(idAbrirPd);
});
