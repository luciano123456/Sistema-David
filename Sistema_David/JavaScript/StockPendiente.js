let userSession;
let idUserStock = 0;
let cardsSeleccionadas = [];
let enProceso = false;

function escapeSpHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setCardsLoading(loading) {
    const $loading = $('#spCardsLoading');
    const $empty = $('#spCardsEmpty');
    const $container = $('.sp-cards-container');
    if (loading) {
        $loading.removeClass('d-none');
        $empty.addClass('d-none');
        $container.empty();
    } else {
        $loading.addClass('d-none');
    }
}

function updateCardsCount(count) {
    $('#spCountBadge').text(count);
    const $empty = $('#spCardsEmpty');
    const $container = $('.sp-cards-container');
    if (count === 0) {
        $empty.removeClass('d-none');
        $container.empty();
    } else {
        $empty.addClass('d-none');
    }
}

function toggleBulkActionsVisibility() {
    const visible = cardsSeleccionadas.length > 0;
    $('#spBulkActions').prop('hidden', !visible);
}

function getFiltrosPayload() {
    const idVendedorEl = document.getElementById('Vendedores');
    const estadosEl = document.getElementById('Estados');
    const idVendedor = idVendedorEl && idVendedorEl.value !== '' ? idVendedorEl.value : -1;
    const estado = estadosEl && estadosEl.selectedIndex >= 0
        ? estadosEl.options[estadosEl.selectedIndex].text
        : 'Pendiente';
    const fecha = document.getElementById('Fecha').value;
    const asignacionEl = document.getElementById('Asignacion');
    const asignacion = asignacionEl ? asignacionEl.value : 'Todos';

    if (userSession.IdRol == 1) {
        return {
            idUsuario: parseInt(idVendedor, 10) || -1,
            Estado: estado,
            Fecha: fecha,
            Asignacion: asignacion
        };
    }

    return {
        idUsuario: userSession.Id,
        Estado: 'Pendiente',
        Fecha: fecha,
        Asignacion: 'Todos'
    };
}

function buildCardFooter(item) {
    const id = item.Id;
    const e = item.Estado;
    const a = (item.Asignacion || '').toUpperCase();
    const rol = userSession.IdRol;
    const uid = userSession.Id;
    const iu = item.IdUsuario;

    if (e === 'Aceptado') {
        return '<div class="sp-card-actions"><button type="button" class="btn btn-success btn-status"><i class="fa fa-check me-1"></i> Aceptado</button></div>';
    }
    if (e === 'Rechazado') {
        return '<div class="sp-card-actions"><button type="button" class="btn btn-danger btn-status"><i class="fa fa-times me-1"></i> Rechazado</button></div>';
    }

    const pair =
        '<div class="sp-card-actions">' +
        '<button type="button" class="btn btn-success" onclick="aceptarStock(' + id + ')"><i class="fa fa-check me-1"></i> Aceptar</button>' +
        '<button type="button" class="btn btn-danger" onclick="rechazarStock(' + id + ')"><i class="fa fa-times me-1"></i> Rechazar</button>' +
        '</div>';

    const pending =
        '<div class="sp-card-actions"><button type="button" class="btn btn-warning btn-pendiente"><i class="fa fa-clock-o me-1"></i> Pendiente</button></div>';

    if (uid === iu && e === 'Pendiente' && (a === 'ADMINISTRADOR' || a === 'TRANSFERENCIA') && rol != 1) return pair;
    if (uid == iu && e === 'Pendiente' && (a === 'USUARIO' || a === 'TRANSFERENCIA') && rol != 1) return pending;
    if (uid === iu && e === 'Pendiente' && (a === 'ADMINISTRADOR' || a === 'TRANSFERENCIA') && rol == 1) return pair;
    if (uid === iu && e === 'Pendiente' && (a === 'USUARIO' || a === 'TRANSFERENCIA') && rol == 1) return pair;
    if (uid !== iu && e === 'Pendiente' && a === 'USUARIO') return pair;
    if (uid !== iu && e === 'Pendiente') return pending;
    return '';
}

function buildCardElement(item) {
    const cardId = item.Id;
    const asignacion = (item.Asignacion || '').toUpperCase();
    const isTransferencia = asignacion === 'TRANSFERENCIA';
    const isResta = item.Tipo === 'ELIMINAR' || item.Tipo === 'RESTAR';
    const fechaTxt = item.Fecha ? moment(item.Fecha).format('DD/MM/YYYY') : '—';
    const signo = isResta ? '−' : '+';
    const productClass = isResta ? 'sp-card-product--resta' : 'sp-card-product--suma';
    const estado = item.Estado || 'Pendiente';

    let heroClass = 'sp-card-hero--admin';
    if (isTransferencia) heroClass = 'sp-card-hero--transferencia';
    else if (asignacion === 'USUARIO') heroClass = 'sp-card-hero--usuario';

    let estadoClass = '';
    if (estado === 'Aceptado') estadoClass = ' sp-card--aceptado';
    else if (estado === 'Rechazado') estadoClass = ' sp-card--rechazado';
    else if (estado === 'Pendiente') estadoClass = ' sp-card--pendiente';

    const showAdminTools = userSession.IdRol === 1 && estado === 'Pendiente' && asignacion === 'USUARIO';
    const showCheckboxOnly = userSession.IdRol != 1 && estado === 'Pendiente' && asignacion !== 'USUARIO';

    let topbar = '';
    if (showAdminTools || showCheckboxOnly) {
        topbar = '<div class="sp-card-topbar">' +
            '<label class="sp-card-select" for="checkbox-' + cardId + '">' +
            '<input type="checkbox" class="sp-card-check" data-card-id="' + cardId + '" id="checkbox-' + cardId + '" onclick="toggleCheckbox(' + cardId + ')" />' +
            '<span class="sp-card-select-box" aria-hidden="true"><i class="fa fa-check"></i></span>' +
            '<span class="sp-card-select-text">Seleccionar</span>' +
            '</label>';

        if (showAdminTools) {
            topbar +=
                '<div class="sp-card-tools">' +
                '<button type="button" class="sp-card-tool-btn sp-card-tool-btn--edit" aria-label="Editar" onclick="editarStock(' + cardId + ')"><i class="fa fa-pencil-square-o"></i></button>' +
                '<button type="button" class="sp-card-tool-btn sp-card-tool-btn--delete" aria-label="Eliminar" onclick="eliminarStock(' + cardId + ')"><i class="fa fa-trash-o"></i></button>' +
                '</div>';
        }

        topbar += '</div>';
    }

    const card = document.createElement('article');
    card.id = String(cardId);
    card.className = 'sp-card' + estadoClass;
    card.innerHTML =
        topbar +
        '<div class="sp-card-hero ' + heroClass + '">' +
        '<span class="sp-card-estado-pill sp-card-estado-pill--' + escapeSpHtml(estado.toLowerCase()) + '">' + escapeSpHtml(estado) + '</span>' +
        '<span class="sp-card-badge">' + escapeSpHtml(item.Asignacion || 'ADMINISTRADOR') + '</span>' +
        '<div class="sp-card-recibe-wrap">' +
        '<span class="sp-card-recibe-label">Recibe</span>' +
        '<span class="sp-card-recibe-name">' + escapeSpHtml(item.Usuario) + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="sp-card-body">' +
        '<div class="sp-card-img-wrap">' +
        '<img class="sp-card-img" src="/Productos/ObtenerImagen/' + item.IdProducto + '" alt="' + escapeSpHtml(item.Producto) + '" loading="lazy" decoding="async" onerror="this.classList.add(\'sp-card-img--error\')" />' +
        '</div>' +
        '<div class="sp-card-meta"><i class="fa fa-calendar-o"></i><span>' + fechaTxt + '</span></div>' +
        '<div class="sp-card-product ' + productClass + '">' +
        '<span class="sp-card-qty">' + signo + escapeSpHtml(item.Cantidad) + '</span>' +
        '<span class="sp-card-product-name">' + escapeSpHtml(item.Producto) + '</span>' +
        '</div>' +
        '<div class="sp-card-envia"><i class="fa fa-share me-1"></i><span>Env&iacute;a <strong>' + escapeSpHtml(item.UsuarioAsignado) + '</strong></span></div>' +
        buildCardFooter(item) +
        '</div>';

    return card;
}

function renderCards(items) {
    const container = document.querySelector('.sp-cards-container');
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < items.length; i++) {
        fragment.appendChild(buildCardElement(items[i]));
    }

    container.innerHTML = '';
    container.appendChild(fragment);
    updateCardsCount(items.length);
    desmarcarCheckBoxes();
}

$(document).ready(async function () {
    userSession = JSON.parse(localStorage.getItem('usuario'));
    document.getElementById('Fecha').value = moment().format('YYYY-MM-DD');

    if (userSession.IdRol == 1) {
        idUserStock = localStorage.getItem('idUserStock') || -1;
        $('#Filtros').prop('hidden', false);
        $('#wrapSelectAll').prop('hidden', false);
    } else {
        idUserStock = userSession.Id;
        $('#wrapSelectAll').prop('hidden', false);
    }

    cargarEstados();

    const filtros = getFiltrosPayload();
    if (userSession.IdRol == 1) {
        await Promise.all([
            cargarUsuarios(),
            cargarStock(filtros)
        ]);
        $('#btnUsuarios').css('background', '#2E4053');
    } else {
        await cargarStock(filtros);
        $('#btnStock').css('background', '#2E4053');
    }

    $('#btnToggleFiltrosSp').on('click', function () {
        $('#Filtros').toggleClass('d-none');
    });

    $('#selectAllCheckbox').on('change', function () {
        const isChecked = $(this).is(':checked');
        cardsSeleccionadas = [];

        $('.sp-card-check:visible').each(function () {
            $(this).prop('checked', isChecked);
            const cardId = parseInt($(this).data('card-id'), 10);
            const $card = $(this).closest('.sp-card');
            if (isChecked) {
                if (!cardsSeleccionadas.includes(cardId)) cardsSeleccionadas.push(cardId);
                $card.addClass('is-selected');
            } else {
                $card.removeClass('is-selected');
            }
        });

        toggleBulkActionsVisibility();
    });
});

async function aplicarFiltros() {
    await cargarStock(getFiltrosPayload());
    if (userSession.IdRol == 1) {
        $('#btnUsuarios').css('background', '#2E4053');
    } else {
        $('#btnStock').css('background', '#2E4053');
    }
}

function limpiarFiltrosSp() {
    document.getElementById('Fecha').value = moment().format('YYYY-MM-DD');
    if (userSession.IdRol == 1) {
        const vendedores = document.getElementById('Vendedores');
        if (vendedores) vendedores.value = -1;
        document.getElementById('Asignacion').value = 'Usuario';
    }
    cargarEstados();
    aplicarFiltros();
}

function cargarEstados() {
    const selectEstados = document.getElementById('Estados');
    if (!selectEstados) return;

    selectEstados.innerHTML = '';
    const estados = [
        { value: -1, text: 'Todos' },
        { value: 1, text: 'Aceptado' },
        { value: 2, text: 'Rechazado' },
        { value: 3, text: 'Pendiente' }
    ];

    estados.forEach(function (e) {
        const option = document.createElement('option');
        option.value = e.value;
        option.text = e.text;
        selectEstados.appendChild(option);
    });

    selectEstados.value = 3;
}

async function cargarUsuarios() {
    try {
        const options = {
            type: 'POST',
            url: '/usuarios/ListarUserActivos',
            async: true,
            data: JSON.stringify({}),
            contentType: 'application/json',
            dataType: 'json'
        };

        const result = await MakeAjax(options);
        const selectUsuarios = document.getElementById('Vendedores');
        if (!selectUsuarios || !result || !result.data) return;

        selectUsuarios.innerHTML = '';

        if (userSession.IdRol == 1) {
            const optTodos = document.createElement('option');
            optTodos.value = -1;
            optTodos.text = 'Todos';
            selectUsuarios.appendChild(optTodos);
        }

        for (let i = 0; i < result.data.length; i++) {
            const option = document.createElement('option');
            option.value = result.data[i].Id;
            option.text = result.data[i].Nombre;
            selectUsuarios.appendChild(option);
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.').removeClass('d-none');
    }
}

async function cargarStock(filtros) {
    filtros = filtros || getFiltrosPayload();
    setCardsLoading(true);

    try {
        const options = {
            type: 'POST',
            url: '/StockPendiente/ListarStockPendiente',
            async: true,
            data: JSON.stringify({
                Id: filtros.idUsuario,
                Estado: filtros.Estado,
                Fecha: filtros.Fecha,
                Asignacion: filtros.Asignacion
            }),
            contentType: 'application/json',
            dataType: 'json'
        };

        const result = await MakeAjax(options);
        setCardsLoading(false);

        if (result && result.data) {
            renderCards(result.data);
        } else {
            updateCardsCount(0);
            alert('Ha ocurrido un error en los datos');
        }
    } catch (error) {
        setCardsLoading(false);
        updateCardsCount(0);
        alert('Ha ocurrido un error en los datos');
    }
}

async function modificarStock() {
    try {
        const options = {
            type: 'POST',
            url: '/StockPendiente/ModificarStock',
            async: true,
            data: JSON.stringify({
                id: document.querySelector('#idStock').value,
                cantidad: document.querySelector('#Cantidad').value
            }),
            contentType: 'application/json',
            dataType: 'json'
        };

        const result = await MakeAjax(options);

        if (result != null) {
            $('#modalEdit').modal('hide');
            alert('Stock modificado correctamente');
            await aplicarFiltros();
        } else {
            alert('Ha ocurrido un error en los datos');
        }
    } catch (error) {
        alert('Ha ocurrido un error en los datos');
    }
}

const editarStock = async id => {
    try {
        const options = {
            type: 'POST',
            url: '/StockPendiente/EditarInfo',
            async: true,
            data: JSON.stringify({ Id: id }),
            contentType: 'application/json',
            dataType: 'json'
        };

        const result = await MakeAjax(options);

        if (result != null) {
            $('#modalEdit').modal('show');
            document.getElementById('idStock').value = result.data.Id;
            document.getElementById('Cantidad').value = result.data.Cantidad;
        } else {
            alert('Ha ocurrido un error en los datos');
        }
    } catch (error) {
        alert('Ha ocurrido un error en los datos');
    }
};

async function aceptarStock(id) {
    if (enProceso) return;
    enProceso = true;

    try {
        const options = {
            type: 'POST',
            url: '/StockPendiente/AceptarStock',
            async: true,
            data: JSON.stringify({ Id: id }),
            contentType: 'application/json',
            dataType: 'json'
        };

        const result = await MakeAjax(options);

        if (result != null) {
            alert('Stock pendiente aceptado correctamente.');
            await aplicarFiltros();
            desmarcarCheckBoxes();
        } else {
            alert('Ha ocurrido un error en los datos');
        }
    } catch (error) {
        alert('Ha ocurrido un error en los datos');
    } finally {
        enProceso = false;
    }
}

async function rechazarStock(id) {
    if (enProceso) return;
    enProceso = true;

    try {
        const options = {
            type: 'POST',
            url: '/StockPendiente/RechazarStock',
            async: true,
            data: JSON.stringify({ Id: id }),
            contentType: 'application/json',
            dataType: 'json'
        };

        const result = await MakeAjax(options);

        if (result != null) {
            alert('Has rechazado el stock.');
            await aplicarFiltros();
            desmarcarCheckBoxes();
        } else {
            alert('Ha ocurrido un error en los datos');
        }
    } catch (error) {
        alert('Ha ocurrido un error en los datos');
    } finally {
        enProceso = false;
    }
}

function toggleCheckbox(cardId) {
    const checkbox = document.getElementById('checkbox-' + cardId);
    const $card = $('#' + cardId);

    if (checkbox.checked) {
        if (!cardsSeleccionadas.includes(cardId)) cardsSeleccionadas.push(cardId);
        $card.addClass('is-selected');
    } else {
        const index = cardsSeleccionadas.indexOf(cardId);
        if (index > -1) cardsSeleccionadas.splice(index, 1);
        $card.removeClass('is-selected');
    }

    toggleBulkActionsVisibility();
}

function desmarcarCheckBoxes(resetSelectAll) {
    if (resetSelectAll !== false) {
        cardsSeleccionadas = [];
    }
    document.querySelectorAll('.sp-card-check').forEach(function (checkbox) {
        checkbox.checked = false;
        $(checkbox).closest('.sp-card').removeClass('is-selected');
    });
    $('#selectAllCheckbox').prop('checked', false);
    toggleBulkActionsVisibility();
}

const eliminarStock = async id => {
    try {
        if (confirm('¿Está seguro que desea eliminar este stock?')) {
            const options = {
                type: 'POST',
                url: '/StockPendiente/EliminarStock',
                async: true,
                data: JSON.stringify({ Id: id }),
                contentType: 'application/json',
                dataType: 'json'
            };

            const result = await MakeAjax(options);

            if (result.data) {
                alert('Stock eliminado correctamente.');
                await aplicarFiltros();
                desmarcarCheckBoxes();
            } else {
                $('.datos-error').text('Ha ocurrido un error en los datos.').removeClass('d-none');
            }
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.').removeClass('d-none');
    }
};

async function aceptarStocks() {
    if (enProceso) return;
    enProceso = true;

    try {
        const options = {
            type: 'POST',
            url: '/StockPendiente/ModificarEstadoStockList',
            async: true,
            data: JSON.stringify({
                stocks: JSON.stringify(cardsSeleccionadas),
                estado: 'Aceptado'
            }),
            contentType: 'application/json',
            dataType: 'json'
        };

        const result = await MakeAjax(options);

        if (result) {
            $('#modalEdit').modal('hide');
            alert('Stocks aceptados exitosamente.');
            await aplicarFiltros();
            desmarcarCheckBoxes();
        } else {
            alert('No se han podido cambiar los estados correctamente.');
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.').removeClass('d-none');
    } finally {
        enProceso = false;
    }
}

async function rechazarStocks() {
    try {
        const options = {
            type: 'POST',
            url: '/StockPendiente/ModificarEstadoStockList',
            async: true,
            data: JSON.stringify({
                stocks: JSON.stringify(cardsSeleccionadas),
                estado: 'Rechazado'
            }),
            contentType: 'application/json',
            dataType: 'json'
        };

        const result = await MakeAjax(options);

        if (result) {
            $('#modalEdit').modal('hide');
            alert('Stocks rechazados exitosamente.');
            await aplicarFiltros();
            desmarcarCheckBoxes();
        } else {
            alert('No se han podido cambiar los estados correctamente.');
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.').removeClass('d-none');
    }
}

function abrirstockPendiente() {
    document.location.href = '../../StockPendiente/Index/';
}
