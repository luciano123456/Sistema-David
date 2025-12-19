/* ============================================================
 * Ventas_Electrodomesticos_NuevoModif.js — FULL v11.0
 * ============================================================
 * - Usa #idVenta oculto (NO el pathname)
 * - NUEVA venta:
 *      - podés generar plan de cuotas
 *      - NO se pueden cobrar / ajustar (muestra aviso)
 * - EDICIÓN:
 *      - NO se puede regenerar plan de cuotas
 *      - cuotas y pagos vienen del backend
 *      - cobro / ajuste / historial por cuota -> igual que Historial
 *      - historial combina Pagos + Historial (por IdCuota)
 *      - muestra: Fecha, Importe, Medio, Obs
 * ============================================================ */

; (() => {

    let diasVencimientoVenta = null; // 🔥 define la regla de toda la venta


    /* ====================== HELPERS ====================== */

    const $D = s => document.querySelector(s);

    // ====================== CONFIRM BOOTSTRAP ASYNC ======================
    window.showConfirm = function (mensaje) {
        return new Promise(resolve => {
            let modal = document.createElement("div");
            modal.className = "modal fade";
            modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content ve-modal">

                    <div class="modal-header">
                        <h5 class="modal-title text-white">
                            <i class="fa fa-question-circle text-accent me-2"></i>
                            Confirmación
                        </h5>
                        <button class="btn-close" data-bs-dismiss="modal"></button>
                    </div>

                    <div class="modal-body">
                        <p class="text-white fs-5">${mensaje}</p>
                    </div>

                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button id="btnOkConfirm" class="btn btn-danger">Eliminar</button>
                    </div>
                </div>
            </div>
        `;

            document.body.appendChild(modal);

            const bsModal = new bootstrap.Modal(modal);

            modal.querySelector("#btnOkConfirm").onclick = () => {
                resolve(true);
                bsModal.hide();
            };

            modal.addEventListener("hidden.bs.modal", () => {
                resolve(false);
                modal.remove();
            });

            bsModal.show();
        });
    };


    const fmt = n => {
        try {
            const v = Number(n || 0);
            return v.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
        } catch { return '$ 0,00'; }
    };

    const parseMoney = s => {
        if (s == null) return 0;
        return Number(String(s)
            .replace(/[^\d,-]/g, '')
            .replace(/\./g, '')
            .replace(',', '.')) || 0;
    };

    const round2 = n => Math.round((n || 0) * 100) / 100;

    function showTip(el, msg, type = 'info') {
        if (!el) return;

        let exists = bootstrap.Tooltip.getInstance(el);
        if (exists) exists.dispose();

        let tip = new bootstrap.Tooltip(el, {
            trigger: 'manual',
            placement: 'top',
            container: 'body',
            customClass: `tt-${type}`,
            title: msg
        });

        tip.show();

        setTimeout(() => {
            el.addEventListener('hidden.bs.tooltip', () => {
                let inst = bootstrap.Tooltip.getInstance(el);
                if (inst) inst.dispose();
            }, { once: true });

            tip.hide();
        }, 2000);
    }

    // Toast global abajo a la derecha
    function showToast(msg, type = 'info') {
        let cont = document.getElementById('toastContainerBR');
        if (!cont) {
            cont = document.createElement('div');
            cont.id = 'toastContainerBR';
            cont.className = 'position-fixed bottom-0 end-0 p-3';
            cont.style.zIndex = '1080';
            document.body.appendChild(cont);
        }

        const typeClass = {
            success: 'bg-success text-white',
            danger: 'bg-danger text-white',
            warn: 'bg-warning text-dark',
            info: 'bg-info text-dark'
        }[type] || 'bg-info text-dark';

        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center ${typeClass} border-0 mb-2`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');

        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${msg}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto"
                        data-bs-dismiss="toast" aria-label="Cerrar"></button>
            </div>
        `;

        cont.appendChild(toastEl);

        const t = new bootstrap.Toast(toastEl, { delay: 2500 });
        t.show();

        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    }

    /* ====================== ESTADO GLOBAL ====================== */

    let userSession = JSON.parse(localStorage.getItem('usuario') || '{}');
    let cliente = null;
    let productos = [];   // {id, nombre, cant, total, img}
    let cuotas = [];      // {idCuota, n, venc, original, recargo, desc, total, restante, estado, hist[]}
    let idxCuotaSel = -1;

    let idVenta = 0;
    let modoEdicion = false; // true = venta existente

    /* ====================== INIT ====================== */

    $(document).ready(() => {

        if (!modoEdicion) {
            $('#fechaLimite').prop('readonly', true);
        }


        // 1) obtener idVenta desde hidden
        idVenta = obtenerIdVentaDesdeUrl();
        modoEdicion = idVenta > 0;

        // Sincronizar hidden (por si el backend lo usa)
        $("#idVenta").val(idVenta);

        // Cambiar texto de botón si es edición
        if (modoEdicion) {
            $('#btnRegistrarVenta')
                .removeClass('btn-success')
                .addClass('btn-warning')
                .html('<i class="fa fa-save"></i> Guardar Cambios');
        }

        // Fechas por defecto (para NUEVA venta)
        const hoy = moment().format('YYYY-MM-DD');
        const fCobro = moment().add(7, 'days').format('YYYY-MM-DD');
        const fLim = moment().add(60, 'days').format('YYYY-MM-DD');

        if (!modoEdicion) {
            $('#fechaVenta').val(hoy);
            $('#fechaPrimerCobro').val(fCobro);
            $('#fechaLimite').val(fLim);
        }

        setupTipoToggle('#recargoTipoWrap', '#recargoTipo');
        setupTipoToggle('#descuentoTipoWrap', '#descuentoTipo');
        setupTipoToggle('#ajRecargoTipoWrap', '#ajRecargoTipo');
        setupTipoToggle('#ajDescuentoTipoWrap', '#ajDescuentoTipo');

        wireCliente();
        wireProductos();
        wireCuotas();

        renderProductos();

        // Si es edición, cargar la venta del backend
        if (modoEdicion) {
            cargarVentaExistente(idVenta);
        }
    });


    function obtenerIdVentaDesdeUrl() {
        const partes = window.location.pathname.split('/');
        const ultimo = partes.pop() || partes.pop(); // por si termina con /
        const id = parseInt(ultimo);

        return isNaN(id) ? 0 : id;
    }


    /* ====================== TOGGLES (% / $) ====================== */

    function getTipoFromUI(wrapperSel, fallbackSelectSel) {
        const wrap = $D(wrapperSel);
        if (wrap) {
            const act = wrap.querySelector('.btn.active');
            return act?.dataset?.value || '%';
        }
        const sel = $D(fallbackSelectSel);
        return sel ? sel.value : '%';
    }

    function setupTipoToggle(wrapperSel, fallbackSelectSel) {
        const wrap = $D(wrapperSel);
        if (!wrap) return;

        const sel = $D(fallbackSelectSel);
        const init = sel ? sel.value : '%';

        wrap.querySelectorAll('.btn').forEach(b => {
            b.classList.toggle('active', b.dataset.value === init);
            b.addEventListener('click', () => {
                wrap.querySelectorAll('.btn').forEach(x => x.classList.remove('active'));
                b.addEventListener('click', () => { });
                b.classList.add('active');
                if (sel) sel.value = b.dataset.value;

                // solo para generación de plan (NUEVA venta)
                if ((wrapperSel === '#recargoTipoWrap' || wrapperSel === '#descuentoTipoWrap') && !modoEdicion) {
                    generarPlanCuotas();
                }
            });
        });
    }

    /* ====================== CLIENTE ====================== */

    function wireCliente() {
        $('#btnBuscarDni').on('click', traerClientePorDni);
        $('#dni').on('keypress', e => { if (e.which === 13) traerClientePorDni(); });

        $('#crearClienteLink').on('click', e => {
            e.preventDefault();
            localStorage.setItem('RegistrarClienteVenta', 1);
            localStorage.setItem('DNIClienteVenta', $('#dni').val().trim());
            location.href = '../../Clientes/Editar/';
        });

        $('#btnNuevoCliente').on('click', () => {
            localStorage.setItem('RegistrarClienteVenta', 1);
            localStorage.setItem('DNIClienteVenta', $('#dni').val().trim());
            location.href = '../../Clientes/Editar/';
        });
    }

    async function traerClientePorDni() {
        const dni = $('#dni').val().trim();
        if (!dni) { showTip($('#dni')[0], 'Ingresá un DNI', 'warn'); return; }

        try {
            const res = await $.ajax({
                type: 'POST',
                url: '/Clientes/GetCliente',
                data: JSON.stringify({ Dni: dni }),
                contentType: 'application/json',
                dataType: 'json'
            });

            const c = res?.data || null;

            if (!c) {
                $('#msgCliente').removeClass('d-none');
                $('#wrapBadges').addClass('d-none');
                cliente = null;
                return;
            }
            $('#msgCliente').addClass('d-none');
            cliente = c;

            const estado = (c.Estado || '').toLowerCase();
            if (estado.includes('inhabilitado')) {
                showTip($('#dni')[0], 'Cliente inhabilitado para ventas', 'danger');
                return;
            }

            $('#wrapBadges').removeClass('d-none');
            $('#bNombre').html(`<i class="fa fa-user"></i> ${c.Nombre} ${c.Apellido}`);

            const $b = $('#bEstado');
            $b.removeClass('ok warn danger');
            if (estado.includes('muy')) $b.addClass('ok').html(`<i class="fa fa-circle"></i> Muy Bueno`);
            else if (estado.includes('regular')) $b.addClass('warn').html(`<i class="fa fa-circle"></i> Regular`);
            else $b.addClass('danger').html(`<i class="fa fa-circle"></i> Inhabilitado`);

            $('#bDireccion').html(`<i class="fa fa-map-marker"></i> ${c.Direccion || '—'}`);
            $('#bTelefono').html(`<i class="fa fa-phone"></i> ${c.Telefono || '—'}`);

        } catch {
            showTip($('#btnBuscarDni')[0], 'Error consultando cliente', 'danger');
        }
    }

    /* ====================== PRODUCTOS ====================== */

    function wireProductos() {
        $('#btnAbrirProducto').on('click', () => {
            if (modoEdicion) {
                showToast('No podés modificar productos en una venta ya registrada.', 'warn');
                return;
            }
            abrirModalProducto();
        });

        $('#btnMenos').on('click', () =>
            $('#cantidadProducto').val(Math.max(1, (+$('#cantidadProducto').val() || 1) - 1)));

        $('#btnMas').on('click', () =>
            $('#cantidadProducto').val((+$('#cantidadProducto').val() || 1) + 1));

        $('#btnGuardarProducto').on('click', guardarProductoDesdeModal);
    }

    async function abrirModalProducto() {
        $('#msgStock')
            .removeClass('text-danger text-warning text-success')
            .text('');
        $('#cantidadProducto').val(1);

        try {
            const res = await $.ajax({
                type: 'POST',
                url: '/Stock/BuscarStock',
                data: JSON.stringify({ Id: userSession?.Id || 0 }),
                contentType: 'application/json',
                dataType: 'json'
            });

            const list = res?.data || [];
            const $sel = $('#selProducto').empty();

            if (!list.length) {
                $sel.append(`<option value="">No hay productos</option>`);
                $('#msgStock').addClass('text-warning').text('No tenés productos disponibles.');
            } else {
                for (const p of list) {
                    $sel.append(`
    <option value="${p.IdProducto}"
            data-precio="${p.PrecioVenta}"
            data-stock="${p.Cantidad}"
            data-diasvenc="${p.DiasVencimiento || 0}">
        ${p.Producto}
    </option>
`);
                }

                await cargarImagenProducto($sel.val());
                renderInfoStock();

                $('#selProducto').off('change').on('change', async e => {
                    await cargarImagenProducto(e.target.value);
                    renderInfoStock();
                });
            }

            new bootstrap.Modal('#mdProducto').show();

        } catch {
            showTip($('#btnAbrirProducto')[0], 'No se pudo abrir productos', 'danger');
        }
    }

    function renderInfoStock() {
        const opt = $('#selProducto option:selected');
        const st = +opt.data('stock') || 0;
        const precio = +opt.data('precio') || 0;

        $('#msgStock')
            .removeClass('text-danger text-warning text-success')
            .addClass(st > 0 ? 'text-success' : 'text-danger')
            .html(`Stock: <b>${st}</b> — Total: <b>${fmt(precio)}</b> ${st <= 0 ? ' — <b>Stock insuficiente</b>' : ''}`);
    }

    async function cargarImagenProducto(idProducto) {
        const $img = $('#imgProducto');
        if (!idProducto) {
            $img.attr('src', '/Content/imagenes/default-image.jpg');
            return;
        }
        try {
            const resp = await $.ajax({
                url: '/Productos/ObtenerImagen/' + idProducto,
                type: 'GET',
                xhrFields: { responseType: 'blob' }
            });
            const url = URL.createObjectURL(resp);
            $img.attr('src', url);
        } catch {
            $img.attr('src', '/Content/imagenes/default-image.jpg');
        }
    }

    function guardarProductoDesdeModal() {

        const opt = $('#selProducto option:selected');
        if (!opt.val()) {
            showTip($('#selProducto')[0], 'Elegí un producto', 'warn');
            return;
        }

        const cant = Math.max(1, +$('#cantidadProducto').val() || 1);
        const stock = +opt.data('stock') || 0;
        if (cant > stock) {
            showTip($('#cantidadProducto')[0], 'Stock insuficiente', 'danger');
            return;
        }

        const diasProd = Number(opt.data('diasvenc')) || 0;

        if (diasProd <= 0) {
            showToast(
                'Este producto no está preparado para un plan de cuotas. ' +
                'No tiene días de vencimiento configurados.',
                'danger'
            );
            return;
        }

        // 🔥 VALIDACIÓN DE DÍAS DE VENCIMIENTO
        if (diasVencimientoVenta === null) {
            diasVencimientoVenta = diasProd;

            // setear fecha límite automáticamente
            const fVenta = moment($('#fechaVenta').val());
            const fLim = fVenta.clone().add(diasVencimientoVenta, 'days');
            $('#fechaLimite').val(fLim.format('YYYY-MM-DD'));

        } else if (diasProd !== diasVencimientoVenta) {
            showToast(
                `Este producto tiene ${diasProd} días de vencimiento.
            La venta está configurada para ${diasVencimientoVenta} días.`,
                'danger'
            );
            return;
        }

        const id = +opt.val();
        const nombre = opt.text();
        const precio = +opt.data('precio') || 0;
        const total = precio * cant;

        const idx = productos.findIndex(p => p.id === id);

        if (idx > -1) {
            if (productos[idx].cant + cant > stock) {
                showTip($('#cantidadProducto')[0], 'Stock insuficiente', 'danger');
                return;
            }
            productos[idx].cant += cant;
            productos[idx].total += total;
        } else {
            productos.push({
                id,
                nombre,
                cant,
                total,
                diasVencimiento: diasProd
            });
        }

        bootstrap.Modal.getInstance($('#mdProducto')[0]).hide();

        renderProductos();

        // 🔁 regenerar plan automáticamente
        if (!modoEdicion) {
            generarPlanCuotas();
        }
    }

    function renderProductos() {

        const $tb = $('#tblProductos tbody').empty();

        if (!productos.length) {
            $tb.append(`
            <tr>
                <td colspan="5" class="text-center text-muted">
                    No hay productos cargados
                </td>
            </tr>
        `);
            actualizarKpis();
            return;
        }

        productos.forEach(p => {

            const imgUrl = p.id
                ? `/Productos/ObtenerImagen/${p.id}?v=${Date.now()}`
                : `/Content/imagenes/default-image.jpg`;

            $tb.append(`
            <tr>
                <td class="text-center">
                    <img src="${imgUrl}"
                         height="45"
                         width="45"
                         class="img-thumbnail"
                         style="background-color: transparent; cursor: pointer;"
                         onerror="this.src='/Content/imagenes/default-image.jpg'"
                         onclick="openModal('${imgUrl}')">
                </td>

                <td>${p.nombre}</td>
                <td class="text-end">${p.cant}</td>
                <td class="text-end">${fmt(p.total)}</td>

                <td class="text-center">
                    <button class="btn btn-sm btn-danger" disabled>
                        <i class="fa fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" disabled>
                        <i class="fa fa-pencil"></i>
                    </button>
                </td>
            </tr>
        `);
        });

        actualizarKpis();
    }

    function actualizarKpis() {

        const totalProductos = productos.reduce(
            (acc, p) => acc + (p.total || 0), 0
        );

        const entrega = parseMoney($("#entrega").val());
        const pagadoCuotas = calcularPagadoEnCuotas();

        const restante = Math.max(
            0,
            totalProductos - entrega - pagadoCuotas
        );

        $("#kpiTotal").text(fmt(totalProductos));
        $("#kpiEntrega").text(fmt(entrega));
        $("#kpiEntregaCuotas").text(fmt(pagadoCuotas));
        $("#kpiRestante").text(fmt(restante));
    }


    /* ====================== PLAN DE CUOTAS ====================== */

    function wireCuotas() {

        $('#entrega').on('blur', () => {
            const v = parseMoney($('#entrega').val());
            $('#entrega').val(fmt(v));

            const total = productos.reduce((a, b) => a + (b.total || 0), 0);
            $('#kpiEntrega').text(fmt(v));
            $('#kpiRestante').text(fmt(Math.max(0, total - v)));

            if (!modoEdicion && cuotas.length > 0) {
                generarPlanCuotas();
            }
        });

        $('#turno').on('change', () => {
            const t = $('#turno').val();
            const franjas = (t === 'mañana')
                ? rangeHours(8, 15)
                : (t === 'tarde')
                    ? rangeHours(15, 21)
                    : [];
            const $f = $('#franja').empty().append(`<option value="">Seleccionar</option>`);
            franjas.forEach(h => $f.append(`<option value="${h}">${h}</option>`));
        });

        // NUEVA venta → se puede generar / limpiar / tocar forma
        if (!modoEdicion) {
            $('#btnGenerarCuotas').on('click', generarPlanCuotas);
            $('#btnLimpiarCuotas').on('click', () => { cuotas = []; renderCuotas(); });
            $('#btnExportarPdf').on('click', exportarPDF);

            $('#forma, #cantCuotas, #fechaPrimerCobro, #fechaLimite, #recargo, #descuento')
                .on('change blur', () => generarPlanCuotas());
        } else {
            // EDICIÓN → bloquear generación
            $('#btnGenerarCuotas').prop('disabled', true);
            $('#btnLimpiarCuotas').prop('disabled', true);

            $('#entrega').prop('disabled', true);
            $('#forma').prop('disabled', true);
            $('#cantCuotas').prop('disabled', true);
            $('#fechaPrimerCobro').prop('disabled', true);
            $('#fechaLimite').prop('disabled', true);
        }

        // acciones por cuota (en tabla)
        $('#tblCuotas tbody').on('click', '.btn-cobrar', onCobrarClick);
        $('#tblCuotas tbody').on('click', '.btn-ajustar', onAjustarClick);
        $('#tblCuotas tbody').on('click', '.btn-hist', onHistorialClick);
    }

    function rangeHours(a, b) {
        const out = [];
        for (let i = a; i < b; i++) {
            const s = `${i.toString().padStart(2, '0')}-${(i + 1).toString().padStart(2, '0')}`;
            out.push(s);
        }
        return out;
    }

    function nextPeriod(d, forma) {
        switch ((forma || '').toLowerCase()) {
            case 'diaria': return d.add(1, 'day');
            case 'semanal': return d.add(1, 'week');
            case 'quincenal': return d.add(15, 'day');
            default: return d.add(1, 'month');
        }
    }

    function generarPlanCuotas() {
        // en edición NUNCA se regenera
        if (modoEdicion) {
            showToast("No se puede regenerar cuotas en una venta existente.", "danger");
            return;
        }

        const total = productos.reduce((a, b) => a + (b.total || 0), 0);
        if (total <= 0) { cuotas = []; renderCuotas(); return; }

        const entrega = parseMoney($('#entrega').val());
        const restante = Math.max(0, total - entrega);

        const forma = $('#forma').val();
        const cant = parseInt($('#cantCuotas').val() || 0, 10);
        const fIni = moment($('#fechaPrimerCobro').val());
        const fLim = moment($('#fechaLimite').val());
        const fVenta = moment($('#fechaVenta').val());

        if (!fIni.isValid() || !fLim.isValid() || fLim.isSameOrBefore(fVenta, 'day')) {
            showTip($('#fechaLimite')[0], 'La fecha límite debe ser posterior a la venta.', 'danger');
            return;
        }

        let fechas = [];
        if (cant > 0) {
            let cur = fIni.clone();
            for (let i = 0; i < cant; i++) {
                fechas.push(cur.clone());
                nextPeriod(cur, forma);
            }
        } else {
            let cur = fIni.clone();
            while (cur.isSameOrBefore(fLim, 'day')) {
                fechas.push(cur.clone());
                nextPeriod(cur, forma);
            }
        }

        if (fechas.length === 0) { cuotas = []; renderCuotas(); return; }

        const porCuota = restante / fechas.length;

        cuotas = fechas.map((f, i) => {
            const base = round2(porCuota);
            return {
                idCuota: 0,           // aún no existe en DB
                n: i + 1,
                venc: f.format("DD/MM/YYYY"),
                original: base,
                recargo: 0,
                desc: 0,
                total: base,
                restante: base,
                estado: "Pendiente",
                hist: []
            };
        });

        renderCuotas();
    }

    function badgeEstado(c) {
        if (c.estado === 'Pagada') return `<span class="badge bg-success">Pagada</span>`;

        const hoy = moment();
        const v = moment(c.venc, 'DD/MM/YYYY');

        if (hoy.isAfter(v, 'day')) {
            const dif = hoy.diff(v, 'days');
            return `<span class="badge bg-danger">Vencida - ${dif} dias</span>`;
        }

        return `<span class="badge bg-warning text-dark">Pendiente</span>`;
    }

    function renderCuotas() {
        const $tb = $('#tblCuotas tbody').empty();

        const pendientes = cuotas.filter(c => c.estado !== 'Pagada');

        for (const c of pendientes) {
            const acciones = modoEdicion
                ? `
                    <button class="btn btn-warning btn-cobrar me-2" data-bs-toggle="tooltip" title="Cobrar">
                        <i class="fa fa-money"></i>
                    </button>
                    <button class="btn btn-info btn-ajustar me-2" data-bs-toggle="tooltip" title="Recargo/Descuento">
                        <i class="fa fa-flash"></i>
                    </button>
                    <button class="btn btn-secondary btn-hist" data-bs-toggle="tooltip" title="Historial">
                        <i class="fa fa-clock-o"></i>
                    </button>
                  `
                : `
                    <button class="btn btn-warning btn-cobrar me-2" disabled>
                        <i class="fa fa-money"></i>
                    </button>
                    <button class="btn btn-info btn-ajustar me-2" disabled>
                        <i class="fa fa-flash"></i>
                    </button>
                    <button class="btn btn-secondary btn-hist" disabled>
                        <i class="fa fa-clock-o"></i>
                    </button>
                  `;

            $tb.append(`
                <tr data-n="${c.n}">
                    <td class="text-center">${c.n}</td>
                    <td>${c.venc}</td>
                    <td class="text-end">${fmt(c.original)}</td>
                    <td class="text-end">${fmt(c.recargo)}</td>
                    <td class="text-end">${fmt(c.desc)}</td>
                    <td class="text-end">${fmt(c.total)}</td>
                    <td class="text-end fw-bold">${fmt(c.restante)}</td>
                    <td class="text-center">${badgeEstado(c)}</td>
                    <td class="text-center">
                        <div class="btn-group btn-group-sm">
                            ${acciones}
                        </div>
                    </td>
                </tr>
            `);
        }

        $('#qTotales').text(cuotas.length);
        $('#qPagadas').text(cuotas.filter(x => x.estado === 'Pagada').length);

        renderFinalizadas();
    }


    function renderFinalizadas() {

        // 🔒 Guardar estado actual del acordeón (abierto / cerrado)
        const col = document.getElementById('colFinalizadas');
        const estabaAbierto = col && col.classList.contains('show');

        if (!Array.isArray(cuotas) || !cuotas.length) {
            $('#qFinalizadas').text('0');

            const $tbf = $('#tblFinalizadas tbody').empty();
            $tbf.append(`
            <tr>
                <td colspan="9" class="text-center text-muted py-3">
                    No hay cuotas finalizadas.
                </td>
            </tr>
        `);

            // 🔁 Restaurar estado del acordeón
            if (estabaAbierto && col) {
                const inst = bootstrap.Collapse.getOrCreateInstance(col, { toggle: false });
                inst.show();
            }

            return;
        }

        // Filtrar solo las pagadas
        const finalizadas = cuotas.filter(c => c.estado === "Pagada");

        // Badge
        $('#qFinalizadas').text(finalizadas.length);

        const $tbf = $('#tblFinalizadas tbody').empty();

        if (!finalizadas.length) {
            $tbf.append(`
            <tr>
                <td colspan="9" class="text-center text-muted py-3">
                    No hay cuotas finalizadas.
                </td>
            </tr>
        `);

            // 🔁 Restaurar estado del acordeón
            if (estabaAbierto && col) {
                const inst = bootstrap.Collapse.getOrCreateInstance(col, { toggle: false });
                inst.show();
            }

            return;
        }

        finalizadas.forEach(c => {

            // monto pagado
            const pagado = (c.hist && c.hist.length)
                ? c.hist
                    .filter(h => h.tipo === 'pago')
                    .reduce((a, b) => a + (b.importe || 0), 0)
                : (c.total - c.restante);

            $tbf.append(`
            <tr>
                <td class="text-center">${c.n}</td>
                <td>${c.venc}</td>
                <td class="text-end">${fmt(c.original)}</td>
                <td class="text-end">${fmt(c.recargo)}</td>
                <td class="text-end">${fmt(c.desc)}</td>
                <td class="text-end">${fmt(c.total)}</td>
                <td class="text-end">${fmt(pagado)}</td>
                <td class="text-center">
                    <span class="badge bg-success">Pagada</span>
                </td>
                <td class="text-center">
                    <button class="btn btn-secondary btn-sm"
                            onclick="verHistPorNumero(${c.n})">
                        <i class="fa fa-clock-o"></i>
                    </button>
                </td>
            </tr>
        `);
        });

        // 🔁 Restaurar estado del acordeón si estaba abierto
        if (estabaAbierto && col) {
            const inst = bootstrap.Collapse.getOrCreateInstance(col, { toggle: false });
            inst.show();
        }
    }

    $(document).on("click", "#btnFinalizadas", function (e) {
        e.preventDefault();

        const $btn = $(this);
        const $panel = $("#colFinalizadas");

        const abierto = $panel.is(":visible");

        if (abierto) {
            // 🔽 CERRAR
            $panel.slideUp(180);
            $btn.addClass("collapsed").attr("aria-expanded", "false");
        } else {
            // 🔼 ABRIR
            $panel.slideDown(180);
            $btn.removeClass("collapsed").attr("aria-expanded", "true");
        }
    });


    /* ====================== COBRAR (EDICIÓN) ====================== */

    function onCobrarClick(e) {
        if (!modoEdicion) {
            showToast('Primero registrá la venta. Los cobros se hacen sobre ventas existentes.', 'warn');
            return;
        }

        const n = +$(e.currentTarget).closest('tr').data('n');
        idxCuotaSel = cuotas.findIndex(c => c.n === n);
        if (idxCuotaSel < 0) return;

        const c = cuotas[idxCuotaSel];

        $('#cobroRestante').val(fmt(c.restante));
        $('#cobroImporte').val(fmt(c.restante));
        $('#cobroObs').val('');

        new bootstrap.Modal('#mdCobro').show();
    }

    $('#btnConfirmarCobro').on('click', async () => {
        if (!modoEdicion) {
            showToast('No podés registrar pagos en una venta nueva aún no guardada.', 'warn');
            return;
        }

        if (idxCuotaSel < 0) return;
        const cSel = cuotas[idxCuotaSel];

        const imp = parseMoney($('#cobroImporte').val());
        const obs = $('#cobroObs').val() || '';

        if (imp <= 0) {
            showToast("Importe inválido.", "danger");
            return;
        }

        const payload = {
            IdVenta: idVenta,
            FechaPago: moment().format("YYYY-MM-DD"),
            MedioPago: "EFECTIVO",
            ImporteTotal: imp,
            Observacion: obs,
            Aplicaciones: [{
                IdCuota: cSel.idCuota,
                ImporteAplicado: imp
            }]
        };

        try {
            const resp = await $.ajax({
                url: "/Ventas_Electrodomesticos/RegistrarPago",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(payload)
            });

            if (!resp.success) {
                showToast(resp.message || "Error al registrar pago.", "danger");
                return;
            }

            showToast("Pago registrado.", "success");
            bootstrap.Modal.getInstance($('#mdCobro')[0]).hide();

            // recargar venta desde backend
            await cargarVentaExistente(idVenta);

        } catch {
            showToast("Error al registrar pago.", "danger");
        }
    });

    /* ====================== AJUSTE (EDICIÓN) ====================== */

    function onAjustarClick(e) {
        if (!modoEdicion) {
            showToast('Los ajustes se hacen sobre cuotas de ventas ya registradas.', 'warn');
            return;
        }

        const n = +$(e.currentTarget).closest('tr').data('n');
        idxCuotaSel = cuotas.findIndex(c => c.n === n);
        if (idxCuotaSel < 0) return;

        $('#ajRecargo').val('');
        $('#ajDescuento').val('');

        new bootstrap.Modal('#mdAjuste').show();
    }

    $('#btnConfirmarAjuste').on('click', async () => {
        if (!modoEdicion) {
            showToast('Los ajustes se hacen sobre cuotas de ventas ya registradas.', 'warn');
            return;
        }
        if (idxCuotaSel < 0) return;

        const c = cuotas[idxCuotaSel];

        const r = parseMoney($('#ajRecargo').val());
        const rt = getTipoFromUI('#ajRecargoTipoWrap', '#ajRecargoTipo');

        const d = parseMoney($('#ajDescuento').val());
        const dt = getTipoFromUI('#ajDescuentoTipoWrap', '#ajDescuentoTipo');

        let rVal = rt === '%' ? c.original * r / 100 : r;
        let dVal = dt === '%' ? c.original * d / 100 : d;

        const nuevo = round2(Math.max(0, c.original + rVal - dVal));
        const pagado = c.total - c.restante; // lo que ya tiene pago

        if (nuevo < pagado) {
            showTip($('#btnConfirmarAjuste')[0], 'No puede ser menor a lo ya pagado', 'danger');
            return;
        }

        try {
            const resp = await $.post("/Ventas_Electrodomesticos/ActualizarRecargoDescuentoCuota", {
                idCuota: c.idCuota,
                recargo: rVal,
                descuento: dVal
            });

            if (!resp.success) {
                showToast(resp.message || "Error al ajustar cuota.", "danger");
                return;
            }

            showToast("Ajuste actualizado.", "success");
            bootstrap.Modal.getInstance($('#mdAjuste')[0]).hide();

            await cargarVentaExistente(idVenta);

        } catch {
            showToast("Error al ajustar cuota.", "danger");
        }
    });

    /* ====================== HISTORIAL POR CUOTA ====================== */

    function onHistorialClick(e) {
        const n = +$(e.currentTarget).closest('tr').data('n');
        const idx = cuotas.findIndex(c => c.n === n);
        if (idx < 0) return;
        pintarHistorial(cuotas[idx]);
    }

    window.verHistPorNumero = function (n) {
        const c = cuotas.find(x => x.n === n);
        if (!c) {
            showToast("No se encontró la cuota.", "danger");
            return;
        }
        pintarHistorial(c);
    };

    function pintarHistorial(c) {
        const $hb = $('#histBody').empty();

        if (!c.hist || !c.hist.length) {
            $hb.append(`
            <tr>
                <td colspan="5" class="text-center text-muted">Sin movimientos</td>
            </tr>
        `);
        } else {

            c.hist.forEach((h, i) => {
                $hb.append(`
                <tr data-i="${i}" data-idpago="${h.idPago}">
                    <td>${i + 1}</td>
                    <td>${h.fecha}</td>
                    <td class="text-end">${fmt(h.importe)}</td>
                    <td>${h.obs || ''}</td>
                    <td class="text-center">
                        <button class="btn btn-danger btn-sm btn-del-pago">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
            });
        }

        // Evento eliminar pago
        $('#histBody .btn-del-pago').on('click', function () {
            const $tr = $(this).closest('tr');
            const idxHist = Number($tr.data('i'));
            const idPago = Number($tr.data('idpago'));

            if (!idPago) {
                showToast("No se pudo obtener el ID del pago.", "danger");
                return;
            }

            eliminarPago(idPago);
        });

        new bootstrap.Modal('#mdHistorial').show();
    }



    async function eliminarPago(idPago) {
        if (!idPago) return;

        const ok = await showConfirm("¿Eliminar este pago permanentemente?");
        if (!ok) return;

        try {
            const resp = await fetch('/Ventas_Electrodomesticos/EliminarPago', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idPago })
            });

            const data = await resp.json();

            if (!data.success) {
                showToast(data.message || "Error al eliminar el pago", "danger");
                return;
            }

            showToast("Pago eliminado correctamente", "success");

            // 🔥 Recargar venta completa del backend
            await cargarVentaExistente(idVenta);

        } catch (err) {
            console.error(err);
            showToast("Error eliminando pago", "danger");
        }
    }


    function eliminarPagoDeCuota(cuota, idxHist) {
        const pago = cuota.hist[idxHist];
        if (!pago) return;

        // Confirmación amistosa
        if (!confirm("¿Eliminar este pago? Esta acción restablecerá el estado de la cuota."))
            return;

        // 1) Remover pago
        cuota.hist.splice(idxHist, 1);

        // 2) Recalcular totales
        const pagado = cuota.hist
            .filter(h => h.tipo === "pago")
            .reduce((a, b) => a + b.importe, 0);

        cuota.restante = round2(cuota.total - pagado);
        cuota.estado = cuota.restante > 0 ? "Pendiente" : "Pagada";

        // 3) Re-render UI
        recalcularTodo();
        renderCuotas();
        renderFinalizadas();

        showToast("Pago eliminado correctamente.", "success");

        // 4) Cerrar modal y volverlo a abrir actualizado
        bootstrap.Modal.getInstance($('#mdHistorial')[0]).hide();
    }

    function recalcularTodo() {

        if (!cuotas || !cuotas.length) return;

        cuotas.forEach(c => {
            const pagado = c.hist
                .filter(h => h.tipo === "pago")
                .reduce((a, b) => a + (b.importe || 0), 0);

            c.restante = round2(c.total - pagado);
            c.estado = c.restante <= 0 ? "Pagada" : "Pendiente";
        });

        renderCuotas();
        renderFinalizadas();
        actualizarKpis();
    }


    /* ====================== EXPORTAR PDF (plan cuotas) ====================== */

    function exportarPDF() {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            showToast("No está disponible jsPDF.", "danger");
            return;
        }

        const doc = new jspdf.jsPDF('p', 'pt', 'a4');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Detalle de Venta — Plan de Cuotas', 40, 40);

        const cli = cliente
            ? `${cliente?.Nombre || ''} ${cliente?.Apellido || ''}`
            : '—';

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        doc.text(`Cliente: ${cli}`, 40, 60);
        doc.text(`Fecha venta: ${moment($('#fechaVenta').val()).format('DD/MM/YYYY')}`, 40, 72);

        const pendientes = cuotas.filter(c => c.estado !== 'Pagada')
            .map(c => [
                c.n, c.venc, fmt(c.original), fmt(c.recargo),
                fmt(c.desc), fmt(c.total), fmt(c.restante), c.estado
            ]);

        doc.autoTable({
            startY: 90,
            head: [['#', 'Vencimiento', 'Original', 'Recargo', 'Descuento', 'Total', 'Restante', 'Estado']],
            body: pendientes,
            theme: 'grid',
            styles: { fontSize: 9 }
        });

        const y = doc.lastAutoTable.finalY + 20;

        const final = cuotas.filter(c => c.estado === 'Pagada')
            .map(c => {
                const pag = c.hist
                    .filter(h => h.tipo === 'pago')
                    .reduce((a, b) => a + (b.importe || 0), 0);
                return [c.n, c.venc, fmt(c.total), fmt(pag), 'Pagada'];
            });

        doc.autoTable({
            startY: y,
            head: [['#', 'Vencimiento', 'Total', 'Pagado', 'Estado']],
            body: final,
            theme: 'grid',
            styles: { fontSize: 9 }
        });

        doc.save(`PlanCuotas_${moment().format('YYYYMMDD_HHmm')}.pdf`);
    }

    /* ====================== BOTÓN PRINCIPAL ====================== */

    $('#btnRegistrarVenta').on('click', async function () {

        const idActual = Number($("#idVenta").val() || 0);

        if (idActual > 0) {
            // EDICIÓN básica de datos de venta (no toca cuotas)
            return editarVenta(idActual);
        }

        // NUEVA venta
        return registrarVentaNueva();
    });

    /* ====================== REGISTRAR NUEVA VENTA ====================== */

    async function registrarVentaNueva() {

        if (!cliente)
            return showTip($('#dni')[0], "Elegí un cliente.", "danger");

        if (!productos.length)
            return showTip($('#btnAbrirProducto')[0], "Agregá al menos un producto.", "danger");

        if (!cuotas.length)
            return showTip($('#btnGenerarCuotas')[0], "Generá el plan de cuotas.", "danger");

        let total = productos.reduce((a, b) => a + b.total, 0);
        let entrega = parseMoney($('#entrega').val());

        let payload = {
            FechaVenta: $('#fechaVenta').val(),
            IdCliente: cliente.Id,
            IdVendedor: userSession.Id,
            ImporteTotal: total,
            Entrega: entrega,
            Restante: total - entrega,
            Observacion: $('#observacion').val(),

            FormaCuotas: $('#forma').val(),
            CantidadCuotas: parseInt($('#cantCuotas').val() || 0),
            FechaVencimiento: $('#fechaLimite').val(),

            Items: productos.map(p => ({
                IdProducto: p.id,
                Producto: p.nombre,
                Cantidad: p.cant,
                PrecioUnitario: p.total / p.cant,
                Subtotal: p.total
            })),

            Cuotas: cuotas.map(c => ({
                NumeroCuota: c.n,
                FechaVencimiento: moment(c.venc, "DD/MM/YYYY").format("YYYY-MM-DD"),
                MontoOriginal: c.original,
                MontoRecargos: c.recargo,
                MontoDescuentos: c.desc
            })),

            UsuarioOperador: userSession.Id
        };

        try {
            const res = await $.ajax({
                url: '/Ventas_Electrodomesticos/CrearVenta',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(payload)
            });

            if (!res.success) {
                showToast(res.message || "Error al registrar venta.", "danger");
                return;
            }

            showToast("Venta registrada correctamente.", "success");
            setTimeout(() => {
                window.location.href = '/Ventas_Electrodomesticos/Historial';
            }, 1200);

        } catch (err) {
            console.error(err);
            showToast("Error inesperado al registrar venta.", "danger");
        }
    }

    /* ====================== EDITAR VENTA EXISTENTE (DATOS) ====================== */

    async function editarVenta(id) {

        if (!cliente)
            return showTip($('#dni')[0], "Elegí un cliente.", "danger");

        if (!productos.length)
            return showTip($('#btnAbrirProducto')[0], "No se encontraron productos en la venta.", "danger");

        let total = productos.reduce((a, b) => a + b.total, 0);
        let entrega = parseMoney($('#entrega').val());

        let payload = {
            IdVenta: id,
            FechaVenta: $('#fechaVenta').val(),
            IdCliente: cliente.Id,
            IdVendedor: userSession.Id,
            ImporteTotal: total,
            Entrega: entrega,
            Restante: total - entrega,
            Observacion: $('#observacion').val(),
            UsuarioOperador: userSession.Id
            // NO mandamos Items/Cuotas para no romper lo existente
        };

        try {
            const res = await $.ajax({
                url: '/Ventas_Electrodomesticos/EditarVenta',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(payload)
            });

            if (!res.success) {
                showToast(res.message || "No se pudo modificar la venta.", "danger");
                return;
            }

            showToast("Venta modificada correctamente.", "success");
            setTimeout(() => {
                window.location.href = '/Ventas_Electrodomesticos/Historial';
            }, 1200);

        } catch (err) {
            console.error(err);
            showToast("Error inesperado al modificar venta.", "danger");
        }
    }

    /* ====================== CARGAR VENTA EXISTENTE ====================== */

    async function cargarVentaExistente(id) {
        try {
            idVenta = id;
            $("#idVenta").val(id);

            const resp = await fetch(`/Ventas_Electrodomesticos/GetDetalleVenta?idVenta=${id}`);
            const json = await resp.json();

            if (!json.success || !json.data) {
                showToast("No se pudo obtener la venta.", "danger");
                return;
            }

            const v = json.data;

            cliente = {
                Id: v.IdCliente,
                Nombre: v.ClienteNombre,
                Apellido: "",
                Direccion: v.ClienteDireccion,
                Telefono: v.ClienteTelefono,
                Estado: v.ClienteEstado,
                Dni: v.ClienteDNI
            };

            $("#dni").val(cliente.Dni);
            $("#wrapBadges").removeClass("d-none");
            $("#bNombre").html(`<i class="fa fa-user"></i> ${cliente.Nombre}`);
            $("#bDireccion").html(`<i class="fa fa-map-marker"></i> ${cliente.Direccion || "—"}`);
            $("#bTelefono").html(`<i class="fa fa-phone"></i> ${cliente.Telefono || "—"}`);

            const estadoCli = (cliente.Estado || "").toLowerCase();
            const $bEstado = $("#bEstado").removeClass("ok warn danger");

            if (estadoCli.includes("muy")) {
                $bEstado.addClass("ok").html(`<i class="fa fa-circle"></i> Muy Bueno`);
            } else if (estadoCli.includes("regular")) {
                $bEstado.addClass("warn").html(`<i class="fa fa-circle"></i> Regular`);
            } else {
                $bEstado.addClass("danger").html(`<i class="fa fa-circle"></i> Inhabilitado`);
            }

            /* =====================================================
               DATOS PRINCIPALES
            ===================================================== */
            $("#fechaVenta").val(moment(v.FechaVenta).format("YYYY-MM-DD"));
            $("#observacion").val(v.Observacion || "");
            $("#entrega").val(fmt(v.Entrega || 0));

            $("#forma").val(v.FormaCuotas || "diaria");
            $("#cantCuotas").val(v.CantidadCuotas || 0);

            if (Array.isArray(v.Cuotas) && v.Cuotas.length > 0) {
                $("#fechaPrimerCobro").val(
                    moment(v.Cuotas[0].FechaVencimiento).format("YYYY-MM-DD")
                );
                $("#fechaLimite").val(
                    moment(v.Cuotas[v.Cuotas.length - 1].FechaVencimiento).format("YYYY-MM-DD")
                );
            }

            /* =====================================================
               PRODUCTOS (CARGA DE ESTADO, NO RENDER DIRECTO)
            ===================================================== */
            productos = [];

            (v.Items || []).forEach(item => {
                productos.push({
                    id: item.IdProducto,
                    nombre: item.Producto,
                    cant: Number(item.Cantidad),
                    total: Number(item.Cantidad * item.PrecioUnitario)
                });
            });

            // 🔥 Render único y centralizado
            renderProductos();

            // Guardar días de vencimiento de la venta (si aplica)
            if (productos.length) {
                diasVencimientoVenta = productos[0].diasVencimiento || null;
            }

            armarCuotasDesdeBackend(v);
            renderCuotas();

            actualizarKpis();

            $("#btnRegistrarVenta").html(`<i class="fa fa-save"></i> Guardar cambios`);

            showToast("Venta cargada correctamente.", "success");

        } catch (err) {
            console.error(err);
            showToast("Error inesperado al cargar la venta.", "danger");
        }
    }


    function calcularPagadoEnCuotas() {
        if (!Array.isArray(cuotas)) return 0;

        let totalPagado = 0;

        cuotas.forEach(c => {
            if (Array.isArray(c.hist)) {
                c.hist.forEach(h => {
                    if (h.tipo === 'pago') {
                        totalPagado += Number(h.importe || 0);
                    }
                });
            }
        });

        return totalPagado;
    }


    function armarCuotasDesdeBackend(v) {
        cuotas = [];

        const listaCuotas = v.Cuotas || [];
        const pagos = v.Pagos || [];
        const hist = v.Historial || [];

        listaCuotas.forEach(c => {
            const total = Number(c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos);
            const restante = Number(c.MontoRestante);

            const movimientos = [];

            // PAGOS por cuota
            pagos.forEach(p => {
                (p.Detalles || []).forEach(d => {
                    if (d.IdCuota === c.Id) {
                        movimientos.push({
                            tipo: 'pago',
                            fecha: moment(p.FechaPago).format("DD/MM/YYYY"),
                            importe: Number(d.ImporteAplicado),
                            medio: p.MedioPago,
                            obs: p.Observacion || ''
                        });
                    }
                });
            });

            // HISTORIAL por cuota (ajustes, etc.)
            hist.forEach(h => {
                if (h.IdCuota === c.Id) {
                    movimientos.push({
                        tipo: 'ajuste',
                        fecha: moment(h.FechaCambio).format("DD/MM/YYYY HH:mm"),
                        importe: parseFloat(h.ValorNuevo) || 0,
                        medio: h.Campo || 'AJUSTE',
                        obs: h.Observacion || ''
                    });
                }
            });

            // ordenar movimientos por fecha (aprox)
            movimientos.sort((a, b) => {
                const da = moment(a.fecha, "DD/MM/YYYY HH:mm").toDate();
                const db = moment(b.fecha, "DD/MM/YYYY HH:mm").toDate();
                return da - db;
            });

            cuotas.push({
                idCuota: c.Id,
                n: c.NumeroCuota,
                venc: moment(c.FechaVencimiento).format("DD/MM/YYYY"),
                original: Number(c.MontoOriginal),
                recargo: Number(c.MontoRecargos),
                desc: Number(c.MontoDescuentos),
                total: total,
                restante: restante,
                estado: c.Estado,
                hist: movimientos
            });
        });
    }



})();




function openModal(imageSrc) {
    // Cambia el src de la imagen del modal
    document.getElementById('modalImage').src = imageSrc;
    // Muestra el modal
    $('#imageModal').modal('show');
}