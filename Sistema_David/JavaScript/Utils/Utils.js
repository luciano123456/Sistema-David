async function MakeAjax(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: options.dataType,
        contentType: options.contentType
    });
}


function MakeAjaxSync(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: options.dataType,
        contentType: options.contentType
    });
}


async function MakeAjaxFormData(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: false,
        contentType: false,
        isFormData: true,
        processData: false
    });
}



function formatearFechaParaInput(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('YYYY-MM-DD') : '';
}
function formatearFechaParaVista(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('DD/MM/YYYY') : '';
}


function formatNumber(number) {
    if (number == null || number === "") return "$0";
    let n;
    if (typeof number === "number") {
        n = number;
    } else if (typeof number === "string") {
        const t = String(number).trim().replace(/\s/g, "");
        if (t === "") return "$0";
        n = Number(t);
        if (isNaN(n)) {
            n = parseFloat(t.replace(/\./g, "").replace(",", "."));
        }
    } else {
        n = Number(number);
    }
    if (typeof n !== "number" || isNaN(n)) {
        return "$0";
    }

    const parts = n.toFixed(0).toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return "$" + parts.join(",");
}


function formatearMiles(valor) {
    let num = String(valor).replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}


function formatearSinMiles(valor) {
    if (!valor) return 0;

    // Si no tiene puntos, devolvés directamente el número original
    if (!valor.includes('.')) return parseFloat(valor) || 0;

    const limpio = valor.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(limpio);
    return isNaN(num) ? 0 : num;
}


function aplicarSeparadorMilesAlEscribir(selector) {
    document.querySelectorAll(selector).forEach(input => {

        // Al escribir
        input.addEventListener("input", function () {
            const antes = this.value;
            const pos = this.selectionStart;

            // Convertimos a número con tu función y volvemos a formatear con tu función
            const numero = formatearSinMiles(antes);
            const formateado = formatearMiles(numero);

            this.value = formateado;

            // Intento simple de mantener el cursor (no perfecto, pero suele andar muy bien)
            const delta = this.value.length - antes.length;
            const nuevaPos = Math.max(0, pos + delta);
            this.setSelectionRange(nuevaPos, nuevaPos);
        });

        // Al salir del input (por si quedó algo raro)
        input.addEventListener("blur", function () {
            const numero = formatearSinMiles(this.value);
            this.value = numero ? formatearMiles(numero) : "";
        });
    });
}




function mostrarModalConContador(modal, texto, tiempo) {
    $(`#${modal}Text`).text(texto);
    $(`#${modal}`).modal('show');

    setTimeout(function () {
        $(`#${modal}`).modal('hide');
    }, tiempo);
}

function exitoModal(texto) {
    mostrarModalConContador('exitoModal', texto, 1000);
}

function errorModal(texto) {
    mostrarModalConContador('ErrorModal', texto, 3000);
}

function advertenciaModal(texto) {
    mostrarModalConContador('AdvertenciaModal', texto, 3000);
}

function confirmarModal(mensaje) {
    return new Promise((resolve) => {
        const modalEl = document.getElementById('modalConfirmar');
        const mensajeEl = document.getElementById('modalConfirmarMensaje');
        const btnAceptar = document.getElementById('btnModalConfirmarAceptar');

        mensajeEl.innerHTML = mensaje;

        const modal = new bootstrap.Modal(modalEl, {
            backdrop: 'static',
            keyboard: false
        });

        // Flag para que no resuelva dos veces
        let resuelto = false;

        // Limpia todos los listeners anteriores
        modalEl.replaceWith(modalEl.cloneNode(true));
        // Re-obtener referencias luego de clonar
        const nuevoModalEl = document.getElementById('modalConfirmar');
        const nuevoBtnAceptar = document.getElementById('btnModalConfirmarAceptar');

        const nuevoModal = new bootstrap.Modal(nuevoModalEl, {
            backdrop: 'static',
            keyboard: false
        });

        nuevoBtnAceptar.onclick = function () {
            if (resuelto) return;
            resuelto = true;
            resolve(true);
            nuevoModal.hide();
        };

        nuevoModalEl.addEventListener('hidden.bs.modal', () => {
            if (resuelto) return;
            resuelto = true;
            resolve(false);
        }, { once: true });

        nuevoModal.show();
    });
}


function parseSrvDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val;

    if (typeof val === 'string') {
        // /Date(1757390400000)/  ó  /Date(-62135596800000)/
        const m = /\/Date\((\-?\d+)\)\//.exec(val);
        if (m) {
            const d = new Date(parseInt(m[1], 10));
            return isNaN(d.getTime()) ? null : d;
        }
        const d2 = new Date(val);            // intenta ISO u otros
        return isNaN(d2.getTime()) ? null : d2;
    }

    if (typeof val === 'number') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function fmtFecha(val) {
    const d = parseSrvDate(val);
    if (!d) return '-';
    return (window.moment
        ? moment(d).format('DD/MM/YYYY')
        : d.toLocaleDateString('es-AR'));
}

function fmtFechaHora(val) {
    const d = parseSrvDate(val);
    if (!d) return '-';
    return (window.moment
        ? moment(d).format('DD/MM/YYYY HH:mm')
        : d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
}


function inicializarEncabezadoColumnas(grd) {
    const $thead = $(`${grd} thead`);
    if ($thead.find('tr.filters').length === 0) {
        $thead.find('tr').first().clone(true).addClass('filters').appendTo($thead);
    }
}

/** Escapa texto para usarlo dentro de RegExp en búsquedas de DataTables. */
function escapeRegex(value) {
    return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function columnFilterValueFromCell($cell) {
    if (!$cell || !$cell.length) return "";
    const $in = $cell.find(".rp-filter-input");
    if ($in.length) return String($in.val() || "").trim();
    const $sel = $cell.find(".rp-filter-select");
    if ($sel.length) return String($sel.val() || "").trim();
    return "";
}

function ensureColumnTitleLabel($titleTh, withDot) {
    if (!$titleTh || !$titleTh.length) return $();
    if ($titleTh.find(".rp-filter-input, .rp-filter-select").length) return $();
    let $label = $titleTh.children(".rp-col-title-label").first();
    if (!$label.length) {
        const html = ($titleTh.html() || "")
            .replace(/<span class="rp-col-filter-dot"[^>]*><\/span>/gi, "")
            .trim();
        if (!html) return $();
        $titleTh.html(`<span class="rp-col-title-label">${html}</span>`);
        $label = $titleTh.children(".rp-col-title-label").first();
    }
    $titleTh.children(".rp-col-filter-dot").remove();
    if (withDot) {
        $titleTh.append('<span class="rp-col-filter-dot" aria-hidden="true"></span>');
    }
    return $label;
}

function rpSetFilterColor($el, active) {
    if (!$el || !$el.length) return;
    const node = $el[0];
    if (!node || !node.style) return;
    if (active) node.style.setProperty("color", "#ff6b6b", "important");
    else node.style.removeProperty("color");
}

function rpSetFilterControlHighlight($controls, active) {
    if (!$controls || !$controls.length) return;
    $controls.each(function () {
        if (active) {
            this.style.setProperty("border-color", "#ff6b6b", "important");
            this.style.setProperty("box-shadow", "0 0 0 1px rgba(255, 107, 107, 0.45)", "important");
            this.style.setProperty("color", "#ffe8e8", "important");
        } else {
            this.style.removeProperty("border-color");
            this.style.removeProperty("box-shadow");
            this.style.removeProperty("color");
        }
    });
}

function getDataTableWrapper(api) {
    if (!api) return $();
    try {
        if (api.table && api.table()) {
            const $c = $(api.table().container());
            if ($c.length) return $c;
        }
    } catch (e) { /* ignore */ }
    try {
        const s = api.settings && api.settings()[0];
        if (s && s.nTableWrapper) return $(s.nTableWrapper);
        if (s && s.sTableId) return $("#" + s.sTableId + "_wrapper");
    } catch (e) { /* ignore */ }
    return $();
}

function applyColumnFilterControlMarker($filterCell, active) {
    if (!$filterCell || !$filterCell.length) return;
    const $in = $filterCell.find(".rp-filter-input");
    const $sel = $filterCell.find(".rp-filter-select");
    $in.add($sel).toggleClass("rp-filter-active", active);
    $filterCell.toggleClass("rp-col-filter-active", active);
    rpSetFilterControlHighlight($in.add($sel), active);
}

function applyColumnFilterTitleMarker($titleTh, active, showDot) {
    if (!$titleTh || !$titleTh.length) return;
    if ($titleTh.find(".rp-filter-input, .rp-filter-select, input[type=checkbox]").length) return;

    ensureColumnTitleLabel($titleTh, !!showDot);
    const $label = $titleTh.children(".rp-col-title-label").first();
    const $dot = $titleTh.children(".rp-col-filter-dot").first();

    $titleTh.toggleClass("rp-col-filter-active", active);
    if ($label.length) {
        $label.toggleClass("rp-col-filter-active", active);
        rpSetFilterColor($label, active);
    } else {
        rpSetFilterColor($titleTh, active);
    }
    if ($dot.length) $dot.toggle(!!(active && showDot));
}

/** Marca en rojo título y control de filtro cuando la columna tiene filtro activo. */
function syncColumnFilterMarkers(api, configColumns) {
    const $wrapper = getDataTableWrapper(api);
    // Con scrollX los inputs viven en el wrapper, no siempre en api.table().node()
    const $filtersRow = $wrapper.find("thead tr.filters").first();
    if (!$filtersRow.length) return;

    const states = configColumns.map((config) => {
        const $filterCell = $filtersRow.find("th").eq(config.index);
        return {
            index: config.index,
            active: columnFilterValueFromCell($filterCell) !== ""
        };
    });

    const $scrollHeadTable = $wrapper.find(".dataTables_scrollHead table").first();
    const mainTableEl = api.table().node();

    states.forEach(({ index, active }) => {
        const $filterCell = $filtersRow.find("th").eq(index);
        applyColumnFilterControlMarker($filterCell, active);

        $wrapper.find("table").each(function () {
            const $titleTh = $(this).find("thead tr").not(".filters").first().find("th").eq(index);
            const showDot = $scrollHeadTable.length
                ? this === $scrollHeadTable[0]
                : this === mainTableEl;
            applyColumnFilterTitleMarker($titleTh, active, showDot);
        });
    });
}

/**
 * Filtros por columna en la fila clonada del thead.
 * @param {object} api API DataTables
 * @param {Array<{index:number, filterType:string}>} configColumns
 * @param {string} [storageKey] Si se pasa, guarda/restaura valores en localStorage (solo Cobros).
 * @param {boolean} [markActiveFilters] Si true, resalta encabezado y control con filtro activo.
 * @param {object} [uiOptions] skin: 'cobros', placeholder, inputType ('search'|'text')
 */
function inicializarFiltrosColumnas(api, configColumns, storageKey, markActiveFilters, uiOptions) {

    const tableContainer = getDataTableWrapper(api);
    const filtersRow = tableContainer.find("thead tr.filters");
    uiOptions = uiOptions || {};
    const useCobrosSkin = uiOptions.skin === "cobros";
    const filterPlaceholder = uiOptions.placeholder || "Buscar...";
    const filterInputType = uiOptions.inputType || "text";

    if (!filtersRow.length) return;

    if (useCobrosSkin) {
        filtersRow.addClass("rp-filters-row-cobros");
        tableContainer.addClass("vc-cobros-filters-on");
    }

    function mountFilterControl($control, $cell, isSelect) {
        if (useCobrosSkin) {
            const $wrap = $('<div class="rp-filter-cell"/>');
            if (isSelect) $wrap.addClass("rp-filter-cell--select");
            $wrap.append($control).appendTo($cell);
        } else {
            $control.appendTo($cell);
        }
    }

    function refreshFilterMarkers() {
        if (markActiveFilters) syncColumnFilterMarkers(api, configColumns);
    }

    if (markActiveFilters) {
        api.off("draw.rpColFilterMarkers").on("draw.rpColFilterMarkers", refreshFilterMarkers);
        tableContainer
            .off("input.rpColFilterMarkers change.rpColFilterMarkers", ".rp-filter-input, .rp-filter-select")
            .on("input.rpColFilterMarkers change.rpColFilterMarkers", ".rp-filter-input, .rp-filter-select", refreshFilterMarkers);
    }

    let saved = {};
    if (storageKey) {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) saved = JSON.parse(raw) || {};
        } catch (e) {
            saved = {};
        }
    }

    let persistTimer = null;
    function persistColumnFilters() {
        if (!storageKey) return;
        clearTimeout(persistTimer);
        persistTimer = setTimeout(function () {
            const out = {};
            for (const config of configColumns) {
                const cell = filtersRow.find("th").eq(config.index);
                if (!cell.length) continue;
                const $in = cell.find(".rp-filter-input");
                const $sel = cell.find(".rp-filter-select");
                let val = "";
                if ($in.length) val = String($in.val() || "").trim();
                else if ($sel.length) val = String($sel.val() || "").trim();
                if (val) out[String(config.index)] = val;
            }
            try {
                if (Object.keys(out).length)
                    localStorage.setItem(storageKey, JSON.stringify(out));
                else
                    localStorage.removeItem(storageKey);
            } catch (e) { /* ignore */ }
        }, 250);
    }

    let appliedAnySaved = false;

    for (const config of configColumns) {

        const cell = filtersRow.find("th").eq(config.index);

        if (!cell.length) continue;

        cell.empty();

        const savedVal = saved[String(config.index)];

        if (config.filterType === "select" || config.filterType === "select_local") {

            const $select = $(`
                <select class="rp-filter-select">
                    <option value="">Todos</option>
                </select>
            `);
            mountFilterControl($select, cell, true);

            const uniques = new Set();

            api.column(config.index).data().each((v) => {
                const txt = (v ?? "").toString().trim();
                if (txt) uniques.add(txt);
            });

            [...uniques].sort().forEach((txt) => {
                $("<option/>", { value: txt, text: txt }).appendTo($select);
            });

            if (savedVal) {
                const has = $select.find("option").filter(function () {
                    return $(this).val() === savedVal;
                }).length;
                if (has) {
                    $select.val(savedVal);
                    api.column(config.index)
                        .search("^" + escapeRegex(savedVal) + "$", true, false);
                    appliedAnySaved = true;
                }
            }

            $select.on("change", function () {

                const value = $(this).val();

                if (!value) {
                    api.column(config.index).search("");
                } else {
                    api.column(config.index)
                        .search("^" + escapeRegex(value) + "$", true, false);
                }
                api.draw(false);
                persistColumnFilters();
                refreshFilterMarkers();
            });

        } else {

            const $inp = $("<input>", {
                class: "rp-filter-input",
                type: filterInputType,
                placeholder: filterPlaceholder,
                autocomplete: "off",
                spellcheck: false
            });
            mountFilterControl($inp, cell, false);

            if (savedVal) {
                $inp.val(savedVal);
                api.column(config.index).search(savedVal);
                appliedAnySaved = true;
            }

            $inp.on("input keyup change", function () {
                const q = String(this.value || "");
                api.column(config.index).search(q.trim() ? q : "");
                api.draw(false);
                persistColumnFilters();
                refreshFilterMarkers();
            });
        }
    }

    if (appliedAnySaved) {
        api.draw(false);
    }

    // Columnas sin filtro (p. ej. Acciones): el clone del thead copia el título; dejar la celda vacía.
    const configuredIndices = new Set(configColumns.map((c) => c.index));
    filtersRow.find("th").each(function (i) {
        if (!configuredIndices.has(i)) {
            $(this).empty();
        }
    });

    refreshFilterMarkers();
}

/**
 * Limpia filtros por columna de una DataTable (inputs, búsquedas y localStorage).
 * @param {object} api API DataTables
 * @param {Array<{index:number, filterType:string}>} configColumns
 * @param {string} [storageKey]
 */
function limpiarFiltrosColumnas(api, configColumns, storageKey) {
    if (!api || !configColumns || !configColumns.length) return;

    if (storageKey) {
        try {
            localStorage.removeItem(storageKey);
        } catch (e) { /* ignore */ }
    }

    for (const config of configColumns) {
        api.column(config.index).search("");
    }

    const tableContainer = getDataTableWrapper(api);
    const filtersRow = tableContainer.find("thead tr.filters");
    if (filtersRow.length) {
        for (const config of configColumns) {
            const cell = filtersRow.find("th").eq(config.index);
            if (!cell.length) continue;
            cell.find(".rp-filter-input").val("");
            cell.find(".rp-filter-select").val("");
        }
    }

    api.draw(false);
    syncColumnFilterMarkers(api, configColumns);
}

/* =========================================================
   Dirección — celda tabla + modal (Cobranzas / Electro)
   ========================================================= */

function escapeHtml(text) {
    if (text == null) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function encodeDirAttr(value) {
    return encodeURIComponent(value == null ? "" : String(value));
}

function decodeDirAttr(value) {
    if (value == null || value === "") return "";
    try {
        return decodeURIComponent(value);
    } catch (_) {
        return String(value);
    }
}

function formatearTelefonoVista(telefono) {
    if (!telefono) return "";
    const digits = String(telefono).replace(/\D/g, "");
    if (digits.length >= 10) {
        const local = digits.slice(-10);
        return "+54 9 " + local.slice(0, 2) + " " + local.slice(2, 6) + "-" + local.slice(6);
    }
    return String(telefono).trim();
}

function buildTelHref(telefono) {
    if (!telefono) return "";
    let digits = String(telefono).replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("54")) return "tel:+" + digits;
    if (digits.startsWith("9") && digits.length >= 10) return "tel:+54" + digits;
    if (digits.length >= 10) return "tel:+549" + digits.slice(-10);
    return "tel:" + digits;
}

function buildCeldaDireccionHtml(opts) {
    opts = opts || {};
    const dir = (opts.direccion || "").trim();
    if (!dir) return '<span class="text-muted">—</span>';

    const cortaLen = opts.cortaLen || 20;
    const dirCorta = dir.length > cortaLen ? dir.substring(0, cortaLen) + "…" : dir;
    const lat = parseFloat(opts.lat) || 0;
    const lng = parseFloat(opts.lng) || 0;
    const hasCoords = !!(lat && lng);

    const dataAttrs =
        ' data-dir="' + encodeDirAttr(dir) + '"' +
        ' data-tel="' + encodeDirAttr(opts.telefono || "") + '"' +
        ' data-cliente="' + encodeDirAttr(opts.cliente || "") + '"' +
        ' data-lat="' + (hasCoords ? lat : "") + '"' +
        ' data-lng="' + (hasCoords ? lng : "") + '"';

    let html = '<div class="location-cell d-inline-flex align-items-center gap-2">';

    if (hasCoords) {
        html +=
            '<button type="button" class="btn btn-link p-0 border-0 js-dir-maps location-icon-maps"' +
            ' title="Ir a Google Maps"' + dataAttrs + '>' +
            '<i class="fa fa-map-marker fa-lg text-warning" aria-hidden="true"></i>' +
            '</button>';
    }

    html +=
        '<a href="javascript:void(0);" class="direccion-link js-dir-text"' + dataAttrs + '>' +
        escapeHtml(dirCorta) +
        '</a></div>';

    return html;
}

function readDirDataFromEl(el) {
    if (el && el.jquery) el = el[0];
    if (!el || !el.getAttribute) {
        return { direccion: "", telefono: "", cliente: "", lat: 0, lng: 0 };
    }
    return {
        direccion: decodeDirAttr(el.getAttribute("data-dir")),
        telefono: decodeDirAttr(el.getAttribute("data-tel")),
        cliente: decodeDirAttr(el.getAttribute("data-cliente")),
        lat: parseFloat(el.getAttribute("data-lat")) || 0,
        lng: parseFloat(el.getAttribute("data-lng")) || 0
    };
}

function ensureDireccionModalStyles() {
    if (document.getElementById("direccion-modal-css")) return;
    const link = document.createElement("link");
    link.id = "direccion-modal-css";
    link.rel = "stylesheet";
    link.href = "/Estilos/DireccionModal.css?v=1.1";
    document.head.appendChild(link);
}

function buildWhatsAppHref(telefono, cliente) {
    const digits = String(telefono || "").replace(/\D/g, "");
    if (!digits) return "";
    let phone = digits;
    if (!phone.startsWith("54")) {
        phone = "549" + phone.slice(-10);
    } else if (phone.startsWith("54") && !phone.startsWith("549")) {
        phone = "549" + phone.slice(2);
    }
    const msg = cliente
        ? "Hola " + cliente + ", "
        : "Hola, ";
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(msg);
}

function ensureModalDireccionCliente() {
    ensureDireccionModalStyles();
    var existing = document.getElementById("modalDireccionCliente");
    if (existing && !document.getElementById("mdDirTelActions")) {
        existing.remove();
    }
    if (document.getElementById("modalDireccionCliente")) return;

    document.body.insertAdjacentHTML("beforeend",
        '<div class="modal fade md-dir-modal" id="modalDireccionCliente" tabindex="-1" aria-hidden="true">' +
        '  <div class="modal-dialog modal-dialog-centered md-dir-dialog">' +
        '    <div class="modal-content md-dir-content">' +
        '      <div class="md-dir-handle" aria-hidden="true"></div>' +
        '      <div class="modal-header md-dir-header border-0">' +
        '        <div class="md-dir-head">' +
        '          <div class="md-dir-icon"><i class="fa fa-map-marker" aria-hidden="true"></i></div>' +
        '          <div class="md-dir-title-wrap">' +
        '            <h5 class="modal-title mb-0">Datos de contacto</h5>' +
        '            <div class="md-dir-cliente" id="mdDirClienteNombre"></div>' +
        '          </div>' +
        '        </div>' +
        '        <button type="button" class="md-dir-close" data-bs-dismiss="modal" aria-label="Cerrar">' +
        '          <i class="fa fa-times"></i>' +
        '        </button>' +
        '      </div>' +
        '      <div class="modal-body md-dir-body">' +
        '        <div class="md-dir-card md-dir-card--addr">' +
        '          <div class="md-dir-label"><i class="fa fa-home"></i> Dirección completa</div>' +
        '          <div class="md-dir-value md-dir-addr-display" id="mdDirTexto"></div>' +
        '          <button type="button" class="md-dir-btn md-dir-btn--ghost md-dir-btn--block" id="mdDirCopyDir">' +
        '            <i class="fa fa-copy"></i> Copiar dirección' +
        '          </button>' +
        '        </div>' +
        '        <div class="md-dir-card md-dir-card--tel d-none" id="mdDirTelWrap">' +
        '          <div class="md-dir-label"><i class="fa fa-phone"></i> Teléfono</div>' +
        '          <div class="md-dir-tel-display" id="mdDirTelDisplay"></div>' +
        '          <div class="md-dir-actions-row" id="mdDirTelActions">' +
        '            <a class="md-dir-btn md-dir-btn--call" id="mdDirBtnCall" href="#">' +
        '              <i class="fa fa-phone"></i> Llamar' +
        '            </a>' +
        '            <a class="md-dir-btn md-dir-btn--wa" id="mdDirBtnWa" href="#" target="_blank" rel="noopener">' +
        '              <i class="fa fa-whatsapp"></i> WhatsApp' +
        '            </a>' +
        '            <button type="button" class="md-dir-btn md-dir-btn--ghost md-dir-btn--copy-tel" id="mdDirCopyTel">' +
        '              <i class="fa fa-copy"></i> Copiar número' +
        '            </button>' +
        '          </div>' +
        '        </div>' +
        '      </div>' +
        '      <div class="modal-footer md-dir-footer border-0">' +
        '        <button type="button" class="md-dir-btn md-dir-btn--ghost" data-bs-dismiss="modal">Cerrar</button>' +
        '        <button type="button" class="md-dir-btn md-dir-btn--maps d-none" id="mdDirBtnMaps">' +
        '          <i class="fa fa-map-marker"></i> Abrir en Maps' +
        '        </button>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>');
}

function copiarTextoPortapapeles(texto, okMsg) {
    if (!texto) return;
    const done = function () {
        if (window.VC && typeof VC.toast === "function") {
            VC.toast(okMsg || "Copiado", "success");
        }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(done).catch(function () {
            window.prompt("Copiá el texto:", texto);
        });
        return;
    }
    window.prompt("Copiá el texto:", texto);
}

var _mdDirMapsCtx = { lat: 0, lng: 0, direccion: "" };

function mostrarDireccionModal(opts) {
    opts = opts || {};
    ensureModalDireccionCliente();

    const dir = (opts.direccion || "").trim() || "—";
    const tel = opts.telefono || "";
    const cliente = (opts.cliente || "").trim();
    const lat = parseFloat(opts.lat) || 0;
    const lng = parseFloat(opts.lng) || 0;
    const hasCoords = !!(lat && lng);
    const telFmt = formatearTelefonoVista(tel);
    const telHref = buildTelHref(tel);
    const waHref = buildWhatsAppHref(tel, cliente);

    const elCliente = document.getElementById("mdDirClienteNombre");
    const elDir = document.getElementById("mdDirTexto");
    const telWrap = document.getElementById("mdDirTelWrap");
    const telActions = document.getElementById("mdDirTelActions");
    const elTelDisplay = document.getElementById("mdDirTelDisplay");
    const btnCall = document.getElementById("mdDirBtnCall");
    const btnWa = document.getElementById("mdDirBtnWa");
    const btnMaps = document.getElementById("mdDirBtnMaps");
    const btnCopyDir = document.getElementById("mdDirCopyDir");
    const btnCopyTel = document.getElementById("mdDirCopyTel");

    if (elCliente) elCliente.textContent = cliente || "Cliente";
    if (elDir) elDir.textContent = dir;

    if (telWrap && telFmt && telHref) {
        telWrap.classList.remove("d-none");
        if (elTelDisplay) elTelDisplay.textContent = telFmt;
        if (btnCall) btnCall.setAttribute("href", telHref);
        if (btnWa && waHref) {
            btnWa.setAttribute("href", waHref);
            btnWa.classList.remove("d-none");
            if (telActions) telActions.classList.remove("md-dir-actions-row--solo-call");
        } else {
            if (btnWa) btnWa.classList.add("d-none");
            if (telActions) telActions.classList.add("md-dir-actions-row--solo-call");
        }
    } else if (telWrap) {
        telWrap.classList.add("d-none");
    }

    if (btnMaps) {
        if (hasCoords) {
            btnMaps.classList.remove("d-none");
            _mdDirMapsCtx = { lat: lat, lng: lng, direccion: dir };
        } else {
            btnMaps.classList.add("d-none");
            _mdDirMapsCtx = { lat: 0, lng: 0, direccion: dir };
        }
    }

    if (btnCopyDir) {
        btnCopyDir.onclick = function () {
            copiarTextoPortapapeles(dir, "Dirección copiada");
        };
    }
    if (btnCopyTel) {
        btnCopyTel.onclick = function () {
            copiarTextoPortapapeles(telFmt || tel, "Teléfono copiado");
        };
    }
    if (btnMaps) {
        btnMaps.onclick = function () {
            abrirDireccionEnMaps(_mdDirMapsCtx.lat, _mdDirMapsCtx.lng, _mdDirMapsCtx.direccion);
        };
    }

    const el = document.getElementById("modalDireccionCliente");
    if (el && window.bootstrap && bootstrap.Modal) {
        const modal = bootstrap.Modal.getOrCreateInstance(el, { backdrop: true, keyboard: true });
        modal.show();
    }
}

function abrirDireccionEnMaps(latDestino, lonDestino, direccion) {
    latDestino = parseFloat(latDestino) || 0;
    lonDestino = parseFloat(lonDestino) || 0;
    if (!latDestino || !lonDestino) {
        if (direccion) {
            window.open("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(direccion), "_blank");
        }
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (posicion) {
            const latOrigen = posicion.coords.latitude;
            const lonOrigen = posicion.coords.longitude;
            const mapaUrl = "https://www.google.com/maps/dir/?api=1&origin=" + latOrigen + "," + lonOrigen +
                "&destination=" + latDestino + "," + lonDestino + "&travelmode=driving";
            window.open(mapaUrl, "_blank");
        }, function () {
            window.open("https://www.google.com/maps/search/?api=1&query=" + latDestino + "," + lonDestino + "&zoom=20", "_blank");
        });
    } else {
        window.open("https://www.google.com/maps/search/?api=1&query=" + latDestino + "," + lonDestino + "&zoom=20", "_blank");
    }
}

function initDireccionUiHandlers() {
    if (window._direccionUiInit) return;
    window._direccionUiInit = true;

    document.addEventListener("click", function (e) {
        const textEl = e.target.closest(".js-dir-text");
        if (textEl) {
            e.preventDefault();
            e.stopPropagation();
            mostrarDireccionModal(readDirDataFromEl(textEl));
            return;
        }

        const mapsEl = e.target.closest(".js-dir-maps");
        if (mapsEl) {
            e.preventDefault();
            e.stopPropagation();
            const data = readDirDataFromEl(mapsEl);
            abrirDireccionEnMaps(data.lat, data.lng, data.direccion);
        }
    }, true);
}

function bootDireccionUi() {
    initDireccionUiHandlers();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootDireccionUi);
} else {
    bootDireccionUi();
}