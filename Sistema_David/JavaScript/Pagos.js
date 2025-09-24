/* ===== Pagos: Sueldos + Modal de Pagos Parciales ===== */
let gridSueldos = null;
let gridParciales = null; // DataTable del modal
let userSession = null;
let usuariosCache = [];
let usuariosById = {};

/* ========= Config ========= */
const ENDPOINT_ELIMINAR_SUELDO = '/Pagos/Eliminar'; // si lo tenés
const EP_PARCIALES_LISTAR = '/Pagos/PagosParcialesListar';   // GET  { idUsuario, desde, hasta, soloSinAsignar? }
const EP_PARCIALES_GUARDAR = '/Pagos/GuardarPagoSuelto';      // POST { idUsuario, fecha, importe, metodo, nota }
const EP_PARCIALES_ELIMINAR = '/Pagos/EliminarPagoSuelto';     // POST { id }

const ICON_EYE = "<i class='fa fa-eye fa-lg text-info'></i>";
const ICON_TRASH = "<i class='fa fa-trash fa-lg text-danger'></i>";

$(document).ready(async function () {
    try { userSession = JSON.parse(localStorage.getItem('usuario') || '{}'); } catch { userSession = {}; }
    if (userSession && userSession.IdRol == 1) { $("#exportacionExcel,#Filtros").removeAttr("hidden"); }

    if (!moment.fn.addDays) { moment.fn.addDays = function (n) { return this.add(n, 'days'); }; }
    const lastWeek = () => {
        const hoy = moment(); const inicio = moment().addDays(-6);
        return { desde: inicio.format('YYYY-MM-DD'), hasta: hoy.format('YYYY-MM-DD') };
    };

    await cargarUsuarios();

    const p = lastWeek();
    $('#FechaDesde').val(p.desde);
    $('#FechaHasta').val(p.hasta);

    configurarDataTableSueldos(
        $('#Vendedores').val() || '',
        $('#FechaDesde').val(),
        $('#FechaHasta').val(),
        $('#Estado').val() || ''
    );

    // Abrir modal pagos parciales
    $('#btnPagosParciales').on('click', abrirModalPagosParciales);

    $("#btnSueldos").css("background", "#2E4053");
});

/* ===== Usuarios ===== */
async function cargarUsuarios() {
    try {
        const r = await $.getJSON('/Usuarios/ListarActivos', { TipoNegocio: -1 });
        const list = (r && r.data) || [];
        usuariosCache = list.slice(0);
        usuariosById = {};
        list.forEach(x => usuariosById[x.Id] = x.Nombre);

        const $sel = $('#Vendedores');
        $sel.empty().append(`<option value="">Seleccionar</option>`);
        list.forEach(x => $sel.append(`<option value="${x.Id}">${escapeHtml(x.Nombre)}</option>`));
    } catch (e) { console.error(e); }
}
function getNombreUsuario(id) {
    return usuariosById[id] || ('#' + (id ?? ''));
}

/* ===== Filtros generales ===== */
function aplicarFiltros() {
    const idVendedor = $('#Vendedores').val() || '';
    const fDesde = $('#FechaDesde').val() || '';
    const fHasta = $('#FechaHasta').val() || '';
    const estado = $('#Estado').val() || '';

    if (gridSueldos) gridSueldos.destroy();
    configurarDataTableSueldos(idVendedor, fDesde, fHasta, estado);

    // si el modal está abierto, refresco también
    if ($('#modalPagosParciales').is(':visible')) recargarPagosParciales();

    localStorage.setItem('Pagos_Filtro_Vendedor', idVendedor);
    localStorage.setItem('Pagos_Filtro_Desde', fDesde);
    localStorage.setItem('Pagos_Filtro_Hasta', fHasta);
    localStorage.setItem('Pagos_Filtro_Estado', estado);
}

/* ========== SUELDOS ========== */
function configurarDataTableSueldos(idVendedor, fechaDesde, fechaHasta, estado) {
    const url = `/Pagos/Historial?idVendedor=${encodeURIComponent(idVendedor)}&desde=${encodeURIComponent(fechaDesde)}&hasta=${encodeURIComponent(fechaHasta)}&estado=${encodeURIComponent(estado)}`;

    gridSueldos = $('#grdSueldos').DataTable({
        ajax: { url, type: 'GET', dataType: 'json' },
        language: { url: "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json" },
        responsive: true, scrollX: true, colReorder: true,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
        columns: [
            { data: 'FechaAlta', title: 'Fecha', className: 'text-center', render: d => fmtFechaSrv(d) },
            { data: 'Vendedor', title: 'Vendedor', className: 'text-center', visible: false },
            {
                data: null, title: 'Período', className: 'text-center',
                render: (row) => `${fmtFechaSrv(row.FechaDesde)} a ${fmtFechaSrv(row.FechaHasta)}`
            },
            { data: 'Concepto', title: 'Concepto', className: 'text-center' },
            { data: 'ImporteTotal', title: 'Importe', className: 'text-center', render: n => formatNumber(n) },
            { data: 'Abonado', title: 'Abonado', className: 'text-center', render: n => formatNumber(n) },
            {
                data: 'Saldo', title: 'Saldo', className: 'text-center',
                render: n => {
                    const v = Number(n) || 0;
                    const entero = (v > -1 && v < 1) ? 0 : Math.trunc(v);
                    return '$ ' + entero.toLocaleString('es-AR');
                }
            },
            {
                data: 'Estado', title: 'Estado', className: 'text-center', render: v => {
                    if (v == 2) return '<span class="badge bg-success">Pagado</span>';
                    if (v == 1) return '<span class="badge bg-warning text-dark">Parcial</span>';
                    return '<span class="badge bg-secondary">Pendiente</span>';
                }
            },
            {
                data: 'Id', title: 'Acciones', width: '150px', className: 'text-center',
                render: (id) => {
                    const editar = `<a class='btn btn-sm btnacciones' title='Editar' href='/Pagos/NuevoModif/${id}'>${ICON_EYE}</a>`;
                    const eliminar = `<button class='btn btn-sm ms-1 btnacciones' type='button' title='Eliminar' onclick='eliminarSueldo(${id})'>${ICON_TRASH}</button>`;
                    return editar + eliminar;
                },
                orderable: false, searchable: false
            }
        ],
        initComplete: function () { configurarOpcionesColumnas(); }
    });

    let filaSel = null;
    $('#grdSueldos tbody').on('click', 'tr', function () {
        if (filaSel) { $(filaSel).removeClass('seleccionada'); $('td', filaSel).removeClass('seleccionada'); }
        filaSel = $(this);
        $(filaSel).addClass('seleccionada'); $('td', filaSel).addClass('seleccionada');
    });
}

function configurarOpcionesColumnas() {
    const grid = $('#grdSueldos').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');
    const storageKey = 'Sueldos_Columnas';
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');

    container.empty();
    columnas.forEach((col, index) => {
        if (col.title === 'Acciones') return;
        const isChecked = (saved[`col_${index}`] !== undefined) ? !!saved[`col_${index}`] : true;
        grid.column(index).visible(isChecked);
        container.append(`
            <li>
                <label class="dropdown-item">
                    <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? 'checked' : ''}>
                    ${col.title || col.data || ('Col ' + index)}
                </label>
            </li>
        `);
    });

    $('.toggle-column').on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');
        saved[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(saved));
        $('#grdSueldos').DataTable().column(columnIdx).visible(isChecked);
    });
}

/* ========== MODAL: Pagos Parciales ========== */
function abrirModalPagosParciales() {
    // seteo selects y fechas
    const hoy = moment();
    const desdeDef = moment().add(-6, 'days');

    const $vSel = $('#ppVendedor');
    const $vNew = $('#ppVendedorNuevo');
    $vSel.empty().append(`<option value="">Todos</option>`);
    $vNew.empty().append(`<option value="">Vendedor…</option>`);
    usuariosCache.forEach(x => {
        $vSel.append(`<option value="${x.Id}">${escapeHtml(x.Nombre)}</option>`);
        $vNew.append(`<option value="${x.Id}">${escapeHtml(x.Nombre)}</option>`);
    });

    // preselecciono el mismo vendedor del filtro principal si existe
    const ven = $('#Vendedores').val() || '';
    if (ven) { $vSel.val(ven); $vNew.val(ven); }

    $('#ppDesde').val($('#FechaPagoDesde').val() || desdeDef.format('YYYY-MM-DD'));
    $('#ppHasta').val($('#FechaPagoHasta').val() || hoy.format('YYYY-MM-DD'));

    $('#ppNuevaFecha').val(hoy.format('YYYY-MM-DD'));
    $('#ppNuevoMetodo').val('EFECTIVO');
    $('#ppNuevoImporte').val('');
    $('#ppNuevaNota').val('');

    // eventos
    $('#ppBtnFiltrar').off('click').on('click', recargarPagosParciales);
    $('#ppBtnAgregar').off('click').on('click', guardarPagoParcial);

    // si ya existe un DataTable previo, destruirlo prolijamente
    if ($.fn.DataTable.isDataTable('#ppGrid')) {
        try { gridParciales.clear().destroy(); } catch { /* ignore */ }
        gridParciales = null;
        // aseguramos tbody limpio para la nueva init
        if (!$('#ppGrid tbody').length) $('#ppGrid').append('<tbody></tbody>');
        else $('#ppGrid tbody').empty();
    }

    // inicializo / recargo grilla
    configurarDataTablePagosParciales();

    const $modal = $('#modalPagosParciales');

    // al mostrarse: pequeño timeout + adjust de columnas
    $modal.off('shown.bs.modal.pp').on('shown.bs.modal.pp', function () {
        setTimeout(() => { if (gridParciales) gridParciales.columns.adjust().draw(false); }, 10);
    });

    // al ocultarse: limpiar DT y handlers para evitar acumulación
    $modal.off('hidden.bs.modal.pp').on('hidden.bs.modal.pp', function () {
        if (gridParciales) {
            try { gridParciales.clear().destroy(); } catch { /* ignore */ }
            gridParciales = null;
        }
        $(this).off('shown.bs.modal.pp hidden.bs.modal.pp');
        if (!$('#ppGrid tbody').length) $('#ppGrid').append('<tbody></tbody>');
        else $('#ppGrid tbody').empty();
    });

    // abrir modal
    new bootstrap.Modal(document.getElementById('modalPagosParciales')).show();
}


function urlPagosParciales() {
    const idUsuario = $('#ppVendedor').val() || '';
    const d = $('#ppDesde').val() || '1900-01-01';
    const h = $('#ppHasta').val() || '2100-12-31';
    // soloSinAsignar=true → no muestra los que ya fueron aplicados a un sueldo (si querés)
    return `${EP_PARCIALES_LISTAR}?idUsuario=${encodeURIComponent(idUsuario || 0)}&desde=${encodeURIComponent(d)}&hasta=${encodeURIComponent(h)}&soloSinAsignar=false`;
}


/* ========== PAGOS Parciales ========== */
function configurarDataTablePagosParciales() {
    const $tbl = $('#ppGrid');
    if (!$tbl.length) return;

    const buildUrl = () => {
        const idUsuario = $('#ppVendedor').val() || $('#Vendedores').val() || '';
        const desde = $('#ppDesde').val() || $('#FechaPagoDesde').val() || '1900-01-01';
        const hasta = $('#ppHasta').val() || $('#FechaPagoHasta').val() || '2100-12-31';
        return `/Pagos/PagosParcialesListar?idUsuario=${encodeURIComponent(idUsuario || 0)}&desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&soloSinAsignar=true`;
    };

    gridParciales = $tbl.DataTable({
        destroy: true,          // <- permite re-inicializar sin error
        autoWidth: false,
        ajax: {
            url: buildUrl(),
            type: 'GET',
            dataType: 'json',
            dataSrc: function (json) {
                if (Array.isArray(json)) return json;
                return json && Array.isArray(json.data) ? json.data : [];
            }
        },
        language: { url: "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json" },
        responsive: true,
        scrollX: true,
        colReorder: true,
        deferRender: true,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
        columns: [
            { data: 'FechaPago', title: 'Fecha', className: 'text-center', render: d => moment(d).format('DD-MM-YYYY') },
            {
                data: null, title: 'Vendedor', className: 'text-center',
                render: (row) => row.Vendedor
                    || $('#ppVendedor option[value="' + (row.IdUsuario || '') + '"]').text()
                    || $('#Vendedores option[value="' + (row.IdUsuario || '') + '"]').text()
                    || '-'
            },
            { data: 'Metodo', title: 'Método', className: 'text-center' },
            { data: 'Nota', title: 'Nota', className: 'text-center', render: s => escapeHtml(s || '') },
            { data: 'Importe', title: 'Importe', className: 'text-end', render: n => formatNumber(n) },
            {
                data: 'Id', title: 'Acciones', className: 'text-center', width: '110px',
                orderable: false, searchable: false,
                render: (id, t, row) => {
                    const disabled = row.IdSueldo ? 'disabled title="Ya asociado"' : '';
                    // ⬇⬇⬇ llamar a TU función existente (no cambiar nombre)
                    return `<button class="btn btn-sm btnacciones" ${disabled}
                                onclick="eliminarPagoParcial(${id})" title="Eliminar">
                                ${ICON_TRASH}
                            </button>`;
                }
            }
        ],
        dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>>" +
            "tr" +
            "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
        initComplete: function () {
            const api = this.api();

            // total en el tfoot
            const updateTotal = () => {
                const data = api.rows({ page: 'current' }).data().toArray();
                const total = data.reduce((a, r) => a + (Number(r.Importe) || 0), 0);
                $('#ppTotal').text('$ ' + (total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            };
            api.on('draw', updateTotal);
            updateTotal();

            // pequeño ajuste de columnas tras 10ms (mejora layout por defecto)
            setTimeout(() => api.columns.adjust().draw(false), 10);
        }
    });

    // botón Buscar del modal
    $('#ppBtnFiltrar').off('click').on('click', function () {
        gridParciales.ajax.url(buildUrl()).load();
    });
}

// Alta rápida desde el modal
async function guardarPagoParcial() {
    try {
        const idUsuario = +($('#ppVendedorNuevo').val() || $('#ppVendedor').val() || $('#Vendedores').val() || 0);
        const fecha = $('#ppNuevaFecha').val();
        const metodo = $('#ppNuevoMetodo').val() || 'EFECTIVO';
        const importe = parseFloat(($('#ppNuevoImporte').val() || '0').replace(/\./g, '').replace(',', '.'));
        const nota = $('#ppNuevaNota').val() || '';

        if (!idUsuario) return alert('Seleccioná un vendedor.');
        if (!fecha) return alert('Fecha inválida.');
        if (!importe || importe <= 0) return alert('Importe inválido.');

        const resp = await $.post('/Pagos/GuardarPagoSuelto', { idUsuario, fecha, importe, metodo, nota });
        if (resp === true || resp?.ok === true) {
            $('#ppNuevoImporte').val(''); $('#ppNuevaNota').val('');
            $('#ppGrid').DataTable().ajax.reload(null, false);
        } else {
            alert(resp?.error || 'No se pudo guardar.');
        }
    } catch (e) {
        console.error(e);
        alert('Error guardando el pago parcial.');
    }
}



function recargarPagosParciales() {
    if (!gridParciales) return configurarDataTablePagosParciales();
    gridParciales.ajax.url(urlPagosParciales()).load();
}


async function eliminarPagoParcial(id) {
    if (!confirm('¿Eliminar el pago parcial?')) return;
    try {
        const resp = await $.post(EP_PARCIALES_ELIMINAR, { id });
        if (resp === true || resp?.ok === true) {
            recargarPagosParciales();
        } else {
            alert(resp?.error || 'No se pudo eliminar.');
        }
    } catch (e) { console.error(e); alert('Error eliminando.'); }
}

/* ========== Acciones sueldos (opcional) ========== */
async function eliminarSueldo(id) {
    if (!ENDPOINT_ELIMINAR_SUELDO) return;
    if (!confirm('¿Eliminar el sueldo seleccionado?')) return;
    try {
        const resp = await $.post(ENDPOINT_ELIMINAR_SUELDO, { id });
        if (resp === true || resp?.ok === true) {
            alert('Sueldo eliminado.');
            $('#grdSueldos').DataTable().ajax.reload(null, false);
        } else { alert(resp?.error || 'No se pudo eliminar.'); }
    } catch (e) { console.error(e); alert('Error eliminando.'); }
}

/* ===== Exportación ===== */
function exportarExcel() {
    if (userSession && userSession.IdRol != 1) { alert("No tienes permisos."); return; }
    exportarDataTableAExcel($('#grdSueldos').DataTable(), "Sueldos");
}
function exportarDataTableAExcel(dataTable, fileName) {
    const data = [], headers = [];
    for (let i = 0; i < dataTable.columns().count(); i++) {
        const title = dataTable.column(i).header().textContent.trim();
        if (title === 'Acciones') continue;
        headers.push(title);
    }
    data.push(headers);

    const rows = dataTable.rows({ search: 'applied' }).data().toArray();
    rows.forEach(row => {
        const periodo = `${fmtFechaSrv(row.FechaDesde)} a ${fmtFechaSrv(row.FechaHasta)}`;
        const estadoTxt = row.Estado == 2 ? 'Pagado' : (row.Estado == 1 ? 'Parcial' : 'Pendiente');
        data.push([
            fmtFechaSrv(row.FechaAlta),
            row.Vendedor,
            periodo,
            row.Concepto,
            cleanformatNumber(row.ImporteTotal),
            cleanformatNumber(row.Abonado),
            cleanformatNumber(row.Saldo),
            estadoTxt
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Sueldos");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, fileName + ".xlsx");
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fileName + ".xlsx";
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    }
    alert("Exportación creada con éxito.");
}

/* ===== Utils ===== */
function fmtFecha(iso) {
    if (!iso) return '-';
    const m = moment(iso, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('DD/MM/YYYY') : '-';
}
// robusto para /Date(ms)/, ISO y date-only
function fmtFechaSrv(x) {
    if (!x) return '-';
    if (typeof x === 'string') {
        const m = /\/Date\((\d+)\)\//.exec(x);
        if (m) { const d = new Date(Number(m[1])); return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`; }
        const mm = moment(x, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD'], true);
        if (mm.isValid()) return mm.format('DD/MM/YYYY');
        return fmtFecha(x);
    }
    if (typeof x === 'number') {
        const d = new Date(x);
        return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
    }
    return fmtFecha(x);
}
function fmtFechaHora(iso) {
    if (!iso) return '-';
    const m = moment(iso, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('DD/MM/YYYY HH:mm') : '-';
}

function cleanformatNumber(v) {
    v = Number(v || 0);
    return v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseformatNumber(str) {
    if (!str) return 0;
    return Number(String(str).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '') || 0);
}
function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
