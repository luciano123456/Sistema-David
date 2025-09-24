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

        mensajeEl.innerText = mensaje;

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