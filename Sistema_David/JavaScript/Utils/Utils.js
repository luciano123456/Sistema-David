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
    if (typeof number !== 'number' || isNaN(number)) {
        return "$0"; // Devuelve un valor predeterminado si 'number' no es válido
    }

    const parts = number.toFixed(0).toString().split(".");
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

/**
 * Filtros por columna en la fila clonada del thead.
 * @param {object} api API DataTables
 * @param {Array<{index:number, filterType:string}>} configColumns
 * @param {string} [storageKey] Si se pasa, guarda/restaura valores en localStorage (solo Cobros).
 */
function inicializarFiltrosColumnas(api, configColumns, storageKey) {

    const tableContainer = $(api.table().container());
    const filtersRow = tableContainer.find("thead tr.filters");

    if (!filtersRow.length) return;

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
                <select class="rp-filter-select" style="width:100%">
                    <option value="">Todos</option>
                </select>
            `).appendTo(cell);

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
                    api.column(config.index).search("").draw(false);
                    persistColumnFilters();
                    return;
                }

                api.column(config.index)
                    .search("^" + escapeRegex(value) + "$", true, false)
                    .draw(false);
                persistColumnFilters();
            });

        } else {

            const $inp = $("<input>", {
                class: "rp-filter-input",
                type: "text",
                placeholder: "Buscar..."
            }).appendTo(cell);

            if (savedVal) {
                $inp.val(savedVal);
                api.column(config.index).search(savedVal);
                appliedAnySaved = true;
            }

            $inp.on("keyup change", function () {
                api.column(config.index).search(this.value).draw(false);
                persistColumnFilters();
            });
        }
    }

    if (appliedAnySaved) {
        api.draw(false);
    }

    const configHasColZero = configColumns.some((c) => c.index === 0);
    if (!configHasColZero) {
        filtersRow.find("th").eq(0).html("");
    }
}