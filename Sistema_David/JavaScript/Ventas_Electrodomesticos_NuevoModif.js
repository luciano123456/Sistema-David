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

    let userSession = JSON.parse(localStorage.getItem('usuario') || '{}');
    const esVendedor = (userSession && Number(userSession.IdRol) === 2);
    const esCobrador = (userSession && Number(userSession.IdRol) === 3);
    let limiteDiasPrimerCuota = null; // 🔒 límite desde tabla Limites



    let diasVencimientoVenta = null; // 🔥 define la regla de toda la venta
    let idxProductoEditando = null; // null = nuevo, number = editando


    aplicarSeparadorMilesAlEscribir(".miles");


    function calcularMaxPermitidoProducto(idProducto) {
        const opt = $('#selProducto option:selected');
        const stockTotal = Number(opt.data('stock')) || 0;

        // Cantidad ya usada en la venta del MISMO producto (excepto el que estoy editando)
        let usadoEnVenta = 0;

        productos.forEach((p, i) => {
            if (Number(p.id) === Number(idProducto)) {
                if (idxProductoEditando !== null && i === idxProductoEditando) return;
                usadoEnVenta += Number(p.cant || 0);
            }
        });

        // Máximo que puedo poner en el modal
        const max = Math.max(0, stockTotal - usadoEnVenta);
        return { stockTotal, usadoEnVenta, max };
    }

    function aplicarMaxCantidadModal() {
        const idSel = Number($('#selProducto').val() || 0);
        if (!idSel) return;

        const { max } = calcularMaxPermitidoProducto(idSel);

        // max mínimo 1 para que no se rompa el input, pero si max=0 igual bloqueamos guardado
        $('#cantidadProducto')
            .attr('max', Math.max(1, max))
            .attr('min', 1);

        const actual = Number($('#cantidadProducto').val() || 1);
        if (max > 0 && actual > max) $('#cantidadProducto').val(max);
    }


    $('#mdProducto').on('hidden.bs.modal', function () {
        idxProductoEditando = null;
        setModoModalProducto('nuevo');
    });

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



    let cliente = null;
    let productos = [];   // {id, nombre, cant, total, img}
    let cuotas = [];      // {idCuota, n, venc, original, recargo, desc, total, restante, estado, hist[]}
    let idxCuotaSel = -1;

    let idVenta = 0;
    let modoEdicion = false; // true = venta existente

    /* ====================== INIT ====================== */

    $(document).ready(() => {

        cargarLimitePrimerCuota();

        if (!modoEdicion) {
            $('#fechaLimite').prop('disabled', true);
        }


        if (esVendedor || esCobrador) {
            $('#fechaVenta').prop('disabled', true);
        }


        if (userSession.IdRol == 1 || userSession.IdRol == 4) {
            document.getElementById("btnExportarPdf").removeAttribute("hidden");
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

            if (res.data.LimiteVentas == 0) {
                showTip($('#dni')[0], 'El cliente no posee un scoring crediticio. Avisar a un administrador', 'danger');
                return;
            }

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

        // seguridad: si no existe el modal, corto
        const modalEl = document.getElementById('mdProducto');
        if (!modalEl) {
            console.error("No existe #mdProducto en el DOM");
            showToast("No se encontró el modal de producto (#mdProducto).", "danger");
            return;
        }

        // reset UI
        $('#msgStock')
            .removeClass('text-danger text-warning text-success')
            .text('');

        // si estoy agregando, default 1 (si edito, lo setea editarProducto)
        if (typeof idxProductoEditando === "undefined" || idxProductoEditando === null) {
            $('#cantidadProducto').val(1);
        }

        try {
            const res = await $.ajax({
                type: 'POST',
                url: '/Stock/BuscarStockElectrodomesticos',
                data: JSON.stringify({ Id: userSession?.Id || 0 }),
                contentType: 'application/json',
                dataType: 'json'
            });

            const list = res?.data || [];
            const $sel = $('#selProducto').empty();

            if (!list.length) {
                $sel.append(`<option value="">No hay productos</option>`);
                $('#msgStock').addClass('text-warning').text('No tenés productos disponibles.');
                $('#imgProducto').attr('src', '/Content/imagenes/default-image.jpg');

                // botón disabled si no hay productos
                $('#btnGuardarProducto').prop('disabled', true);

            } else {

                // lleno combo
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

                // si estoy editando, preselecciono el producto del item editado
                if (typeof idxProductoEditando !== "undefined" && idxProductoEditando !== null && productos[idxProductoEditando]) {
                    $sel.val(productos[idxProductoEditando].id);
                }

                // imagen + info
                await cargarImagenProducto($sel.val());
                renderInfoStock();

                // habilito botón
                $('#btnGuardarProducto').prop('disabled', false);

                // change handler
                $('#selProducto').off('change').on('change', async function () {
                    await cargarImagenProducto(this.value);
                    renderInfoStock();

                    // si tenés aplicarMaxCantidadModal, la uso (no rompe si no existe)
                    if (typeof aplicarMaxCantidadModal === "function") {
                        aplicarMaxCantidadModal();
                    }
                });

                // set max si existe helper
                if (typeof aplicarMaxCantidadModal === "function") {
                    aplicarMaxCantidadModal();
                }
            }

            // 🔥 texto del botón según modo
            const editando = (typeof idxProductoEditando !== "undefined" && idxProductoEditando !== null);
            $('#btnGuardarProducto')
                .text(editando ? 'Guardar' : 'Añadir');

            // mostrar modal (Bootstrap 5 correcto)
            const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static' });
            bsModal.show();

        } catch (err) {
            console.error(err);
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

        const id = Number(opt.val());
        const nombre = opt.text();
        const precio = Number(opt.data('precio')) || 0;

        const cant = Math.max(1, Number($('#cantidadProducto').val() || 1));
        const diasProd = Number(opt.data('diasvenc')) || 0;

        if (diasProd <= 0) {
            showToast('Este producto no está preparado para un plan de cuotas.', 'danger');
            return;
        }

        // 🔥 VALIDACIÓN DÍAS DE VENCIMIENTO
        if (diasVencimientoVenta === null) {
            diasVencimientoVenta = diasProd;

            const fVenta = moment($('#fechaVenta').val());
            const fLim = fVenta.clone().add(diasVencimientoVenta, 'days');
            $('#fechaLimite').val(fLim.format('YYYY-MM-DD'));

        } else if (diasProd !== diasVencimientoVenta) {
            showToast(
                `Este producto tiene ${diasProd} días. La venta está configurada para ${diasVencimientoVenta}.`,
                'danger'
            );
            return;
        }

        // ✅ VALIDACIÓN STOCK REAL (TOTAL)
        const { stockTotal, usadoEnVenta, max } = calcularMaxPermitidoProducto(id);

        if (max <= 0) {
            showTip($('#cantidadProducto')[0], `Stock insuficiente. Stock total: ${stockTotal}`, 'danger');
            return;
        }

        if (cant > max) {
            showTip($('#cantidadProducto')[0], `Stock insuficiente. Máximo permitido: ${max}`, 'danger');
            $('#cantidadProducto').val(max);
            return;
        }

        const total = precio * cant;

        // ===============================
        // EDITAR ITEM EXISTENTE
        // ===============================
        if (idxProductoEditando !== null) {

            productos[idxProductoEditando] = {
                id,
                nombre,
                cant,
                total,
                diasVencimiento: diasProd
            };

            idxProductoEditando = null;

        } else {
            // ===============================
            // AGREGAR: si ya existe, acumulo pero sin pasar stock total
            // ===============================
            const idxExist = productos.findIndex(p => Number(p.id) === id);

            if (idxExist > -1) {

                // max permitido en este caso es stockTotal - (cantidad ya usada por ese mismo producto)
                const yaUsado = productos[idxExist].cant;
                const maxAdd = Math.max(0, stockTotal - yaUsado);

                if (cant > maxAdd) {
                    showTip($('#cantidadProducto')[0], `Stock insuficiente. Máximo a agregar: ${maxAdd}`, 'danger');
                    return;
                }

                productos[idxExist].cant += cant;
                productos[idxExist].total += (precio * cant);

            } else {
                productos.push({
                    id,
                    nombre,
                    cant,
                    total,
                    diasVencimiento: diasProd
                });
            }
        }

        bootstrap.Modal.getInstance($('#mdProducto')[0]).hide();

        renderProductos();

        if (!modoEdicion) generarPlanCuotas();

        showToast("Producto guardado correctamente.", "success");
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

        productos.forEach((p, idx) => {

            const imgUrl = p.id
                ? `/Productos/ObtenerImagen/${p.id}?v=${Date.now()}`
                : `/Content/imagenes/default-image.jpg`;

            const acciones = !modoEdicion
                ? `
                <button class="btn btn-sm btn-danger me-1"
                        onclick="eliminarProducto(${idx})">
                    <i class="fa fa-trash"></i>
                </button>
                <button class="btn btn-sm btn-warning"
                        onclick="editarProducto(${idx})">
                    <i class="fa fa-pencil"></i>
                </button>
              `
                : `
                <button class="btn btn-sm btn-danger" disabled>
                    <i class="fa fa-trash"></i>
                </button>
                <button class="btn btn-sm btn-warning" disabled>
                    <i class="fa fa-pencil"></i>
                </button>
              `;

            $tb.append(`
            <tr>
                <td class="text-center">
                    <img src="${imgUrl}"
                         height="45"
                         width="45"
                         class="img-thumbnail"
                         style="cursor:pointer"
                         onerror="this.src='/Content/imagenes/default-image.jpg'"
                         onclick="openModal('${imgUrl}')">
                </td>

                <td>${p.nombre}</td>
                <td class="text-end">${p.cant}</td>
                <td class="text-end">${fmt(p.total)}</td>

                <td class="text-center">
                    ${acciones}
                </td>
            </tr>
        `);
        });

        actualizarKpis();
    }

    window.eliminarProducto = async function (idx) {

        if (modoEdicion) {
            showToast("No se pueden eliminar productos en una venta ya registrada.", "warn");
            return;
        }

        const p = productos[idx];
        if (!p) return;

        const ok = await showConfirm(`¿Eliminar "${p.nombre}" de la venta?`);
        if (!ok) return;

        productos.splice(idx, 1);

        if (!productos.length) {
            diasVencimientoVenta = null;
            cuotas = [];
            renderCuotas();
        }

        renderProductos();

        if (productos.length) {
            generarPlanCuotas();
        }

        showToast("Producto eliminado.", "success");
    };

    window.editarProducto = function (idx) {

        if (modoEdicion) {
            showToast("No se pueden editar productos en una venta ya registrada.", "warn");
            return;
        }

        const p = productos[idx];
        if (!p) return;

        idxProductoEditando = idx;

        abrirModalProducto().then(() => {
            // Cantidad actual del item
            $('#cantidadProducto').val(p.cant);

            // Forzar max correcto (stock total - otros iguales)
            aplicarMaxCantidadModal();

            setModoModalProducto('editar');
        });
    };



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

        if (modoEdicion) {
            showToast("No se puede regenerar cuotas en una venta existente.", "danger");
            return;
        }

        const total = productos.reduce((a, b) => a + (b.total || 0), 0);
        if (total <= 0) {
            cuotas = [];
            renderCuotas();
            return;
        }

        const entrega = parseMoney($('#entrega').val());
        const restante = Math.max(0, total - entrega);

        const forma = $('#forma').val();
        const cant = parseInt($('#cantCuotas').val() || 0, 10);

        const fVenta = parseDateStrict($('#fechaVenta').val());
        const fIni = parseDateStrict($('#fechaPrimerCobro').val());
        const fLim = parseDateStrict($('#fechaLimite').val());

        if (!fVenta.isValid() || !fIni.isValid() || !fLim.isValid()) {
            showTip($('#fechaLimite')[0], 'Fechas inválidas.', 'danger');
            return;
        }

        if (!fLim.isAfter(fIni, 'day')) {
            showTip($('#fechaLimite')[0],
                'La fecha límite debe ser posterior a la primera cuota.',
                'danger'
            );
            return;
        }

        // ===============================
        // 🔢 FECHAS DE CUOTAS
        // ===============================
        let fechas = [];
        let cur = fIni.clone();

        if (cant > 0) {
            for (let i = 0; i < cant; i++) {
                fechas.push(cur.clone());
                nextPeriod(cur, forma);
            }
        } else {
            while (cur.isSameOrBefore(fLim, 'day')) {
                fechas.push(cur.clone());
                nextPeriod(cur, forma);
            }
        }

        if (!fechas.length) {
            cuotas = [];
            renderCuotas();
            return;
        }

        // ===============================
        // 🔥 RECARGO / DESCUENTO GLOBAL
        // ===============================
        const r = parseMoney($('#recargo').val());
        const rt = getTipoFromUI('#recargoTipoWrap', '#recargoTipo');

        const d = parseMoney($('#descuento').val());
        const dt = getTipoFromUI('#descuentoTipoWrap', '#descuentoTipo');

        const basePorCuota = round2(restante / fechas.length);

        let recargoGlobal = rt === '%' ? basePorCuota * r / 100 : r;
        let descuentoGlobal = dt === '%' ? basePorCuota * d / 100 : d;

        recargoGlobal = round2(recargoGlobal);
        descuentoGlobal = round2(descuentoGlobal);

        // ===============================
        // 📦 ARMAR CUOTAS
        // ===============================
        cuotas = fechas.map((f, i) => {
            const totalCuota = round2(
                basePorCuota + recargoGlobal - descuentoGlobal
            );

            return {
                idCuota: 0,
                n: i + 1,
                venc: f.format("DD/MM/YYYY"),
                original: basePorCuota,
                recargo: recargoGlobal,
                desc: descuentoGlobal,
                total: totalCuota,
                restante: totalCuota,
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
                    <div class="btn-group">

    <button class="btn btn-accion btn-cobrar me-1"
        onclick="abrirCobroDesdeNuevoModif(${idVenta}, ${c.idCuota})"
        title="Cobrar">
        <i class="fa fa-money"></i>
    </button>

    <button class="btn btn-accion btn-ajuste me-1"
        onclick="abrirAjusteDesdeNuevoModif(${idVenta}, ${c.idCuota})"
        title="Ajustar">
        <i class="fa fa-bolt"></i>
    </button>

    <button class="btn btn-accion btn-historial"
        onclick="abrirHistorialDesdeNuevoModif(${idVenta}, ${c.idCuota})"
        title="Historial">
        <i class="fa fa-eye"></i>
    </button>

</div>
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
<button class="btn btn-accion btn-historial btn-sm"
    onclick="abrirHistorialDesdeNuevoModif(${idVenta}, ${c.idCuota})"
    title="Historial">
    <i class="fa fa-eye"></i>
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
            showToast('Los ajustes se hacen sobre ventas existentes.', 'warn');
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

        rVal = round2(rVal);
        dVal = round2(dVal);

        // 🔥 ACUMULAR
        const nuevoRecargo = round2(c.recargo + rVal);
        const nuevoDescuento = round2(c.desc + dVal);

        const nuevoTotal = round2(
            c.original + nuevoRecargo - nuevoDescuento
        );

        const pagado = round2(c.total - c.restante);

        if (nuevoTotal < pagado) {
            showTip(
                $('#btnConfirmarAjuste')[0],
                'El total no puede ser menor a lo ya pagado.',
                'danger'
            );
            return;
        }

        try {
            const resp = await $.ajax({
                url: "/Ventas_Electrodomesticos/ActualizarRecargoDescuentoCuota",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({
                    idCuota: c.idCuota,
                    recargo: nuevoRecargo,
                    descuento: nuevoDescuento
                })
            });

            if (!resp.success) {
                showToast(resp.message || "Error al ajustar cuota.", "danger");
                return;
            }

            showToast("Ajuste aplicado correctamente.", "success");
            bootstrap.Modal.getInstance($('#mdAjuste')[0]).hide();

            await cargarVentaExistente(idVenta);

        } catch {
            showToast("Error al ajustar cuota.", "danger");
        }
    });


    /* ====================== HISTORIAL POR CUOTA ====================== */


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

        if (!cliente || !Number(cliente.Id || 0)) {
            showToast("Elegí un cliente.", "danger");
            return false;
        }

        // 2) Turno / Franja
        const turno = ($('#turno').val() || '').trim();
        const franja = ($('#franja').val() || '').trim();

        if (!turno) {
            showToast("Seleccioná un turno.", "warn");
            return false;
        }

        if (!franja) {
            showToast("Seleccioná una franja horaria.", "warn");
            return false;
        }

        // 3) Productos
        if (!Array.isArray(productos) || productos.length === 0) {
            showToast("Agregá al menos un producto.", "danger");
            return false;
        }

        // 4) Validar consistencia de diasVencimientoVenta (regla de venta)
        //    (se setea cuando agregás el primer producto, pero acá lo rechecamos)
        const diasVenta = Number(diasVencimientoVenta || 0);

        if (!diasVenta || diasVenta <= 0) {
            showToast("La venta no tiene configurados los días de vencimiento (producto inválido).", "danger");
            return false;
        }

        // 5) Validar que todos los productos cumplan la regla de días
        //    (si por algún motivo entró uno distinto)
        for (const p of productos) {
            const diasProd = Number(p?.diasVencimiento || 0);

            // Si en tu estructura no guardás diasVencimiento en productos (solo al agregar),
            // igual validamos lo mínimo para no romper.
            if (diasProd && diasProd !== diasVenta) {
                showToast(`Producto "${p.nombre}" no coincide en días (${diasProd}) con la venta (${diasVenta}).`, "danger");
                return false;
            }
        }

        // 6) Fechas: venta, primer cobro, límite
        const rawVenta = ($('#fechaVenta').val() || '').trim();
        const rawIni = ($('#fechaPrimerCobro').val() || '').trim();
        const rawLim = ($('#fechaLimite').val() || '').trim();

        const fVenta = parseDateStrict(rawVenta);
        const fIni = parseDateStrict(rawIni);
        const fLim = parseDateStrict(rawLim);

        if (!fVenta.isValid() || !fIni.isValid() || !fLim.isValid()) {
            showToast("Fechas inválidas.", "danger");
            return false;
        }

        if (!fLim.isAfter(fIni, 'day')) {
            showToast("La fecha límite debe ser posterior a la primera cuota.", "danger");
            return false;
        }

        // 7) Límite de primer cuota (si existe)
        if (limiteDiasPrimerCuota && Number(limiteDiasPrimerCuota) > 0) {
            const diasDesdeVenta = fIni.diff(fVenta, "days");
            if (diasDesdeVenta > Number(limiteDiasPrimerCuota)) {
                showToast(`La fecha de primer cobro no puede superar ${limiteDiasPrimerCuota} días desde la fecha de venta.`, "danger");
                return false;
            }
        }

        // 8) Validación de cuotas (re-generar si hace falta)
        //    Si no hay cuotas o no coincide cantidad/fechas, no dejamos pasar.
        const forma = ($('#forma').val() || '').trim();
        const cantCuotas = parseInt($('#cantCuotas').val() || '0', 10) || 0;

        if (!Array.isArray(cuotas) || cuotas.length === 0) {
            showToast("Generá el plan de cuotas.", "danger");
            return false;
        }

        // 9) Chequeo básico: ninguna cuota puede tener total <= 0
        //    y vencimientos deben estar dentro de [primerCobro..limite] (no estricto, pero coherente)
        for (const c of cuotas) {
            const totalCuota = Number(c?.total ?? (Number(c?.original || 0) + Number(c?.recargo || 0) - Number(c?.desc || 0)));
            if (!totalCuota || totalCuota <= 0) {
                showToast("Hay cuotas con importe inválido. Revisá el plan.", "danger");
                return false;
            }

            const venc = moment(c?.venc, "DD/MM/YYYY", true);
            if (!venc.isValid()) {
                showToast("Hay cuotas con vencimiento inválido. Revisá el plan.", "danger");
                return false;
            }

            if (venc.isBefore(fIni, "day") || venc.isAfter(fLim, "day")) {
                showToast("Hay cuotas fuera del rango de fechas (primer cobro / límite). Revisá el plan.", "danger");
                return false;
            }
        }

        // 10) Entrega / Totales
        const totalProductos = productos.reduce((a, b) => a + Number(b?.total || 0), 0);
        const entrega = parseMoney($('#entrega').val());

        if (totalProductos <= 0) {
            showToast("El total de la venta es inválido.", "danger");
            return false;
        }

        if (entrega < 0) {
            showToast("La entrega no puede ser negativa.", "danger");
            return false;
        }

        if (entrega > totalProductos) {
            showToast("La entrega no puede ser mayor al total de la venta.", "danger");
            return false;
        }

        let total = productos.reduce((a, b) => a + b.total, 0);
     

        let payload = {
            FechaVenta: $('#fechaVenta').val(),
            IdCliente: cliente.Id,
            IdVendedor: userSession.Id,
            ImporteTotal: total,
            Entrega: entrega,
            Restante: total - entrega,
            Observacion: $('#observacion').val(),
            Turno: $('#turno').val(),
            FranjaHoraria: $('#franja').val(),

            FormaCuotas: $('#forma').val(),
            CantidadCuotas: parseInt($('#cantCuotas').val() || 0),
            FechaVencimiento: $('#fechaLimite').val(),

            RecargoTipo: getTipoFromUI('#recargoTipoWrap', '#recargoTipo'),
            RecargoValor: parseMoney($('#recargo').val()) || null,

            DescuentoTipo: getTipoFromUI('#descuentoTipoWrap', '#descuentoTipo'),
            DescuentoValor: parseMoney($('#descuento').val()) || null,


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

        if (!$('#turno').val())
            return showToast("Seleccioná un turno.", "warn");

        if (!$('#franja').val())
            return showToast("Seleccioná una franja horaria.", "warn");


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
            Turno: $('#turno').val(),
            FranjaHoraria: $('#franja').val(),
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

         

            // 🔒 BLOQUEAR
            setRecargoDescuentoReadonlyDesdeVenta(v)

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

    $('#cantCuotas').on('input blur', function () {

        let val = parseInt(this.value || 0, 10);

        // 0 = auto → permitido
        if (val === 0) return;

        const max = calcularMaxCuotasPermitidas();
        if (!max) return;

        if (val > max) {
            this.value = max;

            showTip(
                this,
                `Máximo permitido para ${$('#forma').val()} días: ${max}`,
                'warn'
            );
        }
    });

    $('#forma').on('change', function () {
        const max = calcularMaxCuotasPermitidas();
        if (!max) return;

        let actual = parseInt($('#cantCuotas').val() || 0, 10);

        if (actual > max && actual !== 0) {
            $('#cantCuotas').val(max);

            showToast(
                `La forma seleccionada permite hasta ${max} cuotas.`,
                'warn'
            );
        }

        if (!modoEdicion) generarPlanCuotas();
    });




    function calcularMaxCuotasPermitidas() {
        if (!diasVencimientoVenta) return null;

        const forma = ($('#forma').val() || '').toLowerCase();

        let diasPorCuota = 1;

        switch (forma) {
            case 'diaria':
                diasPorCuota = 1;
                break;
            case 'semanal':
                diasPorCuota = 7;
                break;
            case 'quincenal':
                diasPorCuota = 15;
                break;
            case 'mensual':
                diasPorCuota = 30;
                break;
            default:
                diasPorCuota = 1;
        }

        const max = Math.floor(diasVencimientoVenta / diasPorCuota);
        return Math.max(1, max);
    }


    function parseDateStrict(value) {
        if (!value) return moment.invalid();

        // Si tu input es type="date", el value viene "YYYY-MM-DD"
        // Igual dejo fallback por si algún día viene "DD/MM/YYYY"
        return moment(value, ["YYYY-MM-DD", "DD/MM/YYYY"], true).startOf("day");
    }

    let fechaPrimerCobroAnterior = null;

    $("#fechaPrimerCobro")
        .on("focusin", function () {
            // guardo el valor anterior real ANTES de cambiar
            fechaPrimerCobroAnterior = this.value;
        })
        .on("blur", function () {

            if (!diasVencimientoVenta) return;
            if (!limiteDiasPrimerCuota) return;

            const rawVenta = $("#fechaVenta").val();
            const rawIni = this.value;

            // 🔒 si no hay fecha de venta no podés validar
            if (!rawVenta) {
                showTip(this, "Primero seleccioná la fecha de venta.", "danger");
                this.value = fechaPrimerCobroAnterior || "";
                return;
            }

            const fVenta = parseDateStrict(rawVenta);
            const fIni = parseDateStrict(rawIni);

            if (!fVenta.isValid() || !fIni.isValid()) {
                showTip(this, "Fechas inválidas.", "danger");
                this.value = fechaPrimerCobroAnterior || "";
                return;
            }

            // 🔥 VALIDACIÓN: primer cobro no puede superar límite desde fecha venta
            const diasDesdeVenta = fIni.diff(fVenta, "days");

            if (diasDesdeVenta > limiteDiasPrimerCuota) {
                showTip(
                    this,
                    `La fecha de primer cobro no puede superar ${limiteDiasPrimerCuota} días desde la fecha de venta.`,
                    "danger"
                );
                this.value = fechaPrimerCobroAnterior || "";
                return;
            }

            // ✅ TU FLUJO ORIGINAL (no lo tocamos)
            const fLim = fIni.clone().add(diasVencimientoVenta, "days");
            $("#fechaLimite").val(fLim.format("YYYY-MM-DD"));

                generarPlanCuotas();
            
        });


async function cargarLimitePrimerCuota() {
    try {
        const resp = await $.getJSON(
            "/Limite/BuscarValorLimite",
            { nombre: "VentasPrimerCuota" }
        );

        const val = parseInt(resp?.data?.Valor, 10);

        limiteDiasPrimerCuota = (!isNaN(val) && val > 0) ? val : null;

        console.log("✔ Límite primer cuota:", limiteDiasPrimerCuota);

    } catch (err) {
        console.error("No se pudo cargar límite de primer cuota", err);
        limiteDiasPrimerCuota = null;
    }
    }


    function setRecargoDescuentoReadonlyDesdeVenta(v) {

        // 🔒 Solo en edición
        if (!modoEdicion) return;
        if (!v) return;

        /* ===============================
           RECARGO
        =============================== */
        const recargoVal = Number(v.RecargoValor);
        const recargoTipo = v.RecargoTipo;

        if (!isNaN(recargoVal) && recargoVal > 0 && recargoTipo) {

            $('#recargo').val(recargoVal.toFixed(2));
            $('#recargoTipo').val(recargoTipo);
            marcarToggleActivo('#recargoTipoWrap', recargoTipo);

        } else {
            // 👉 0 sin tipo seleccionado
            $('#recargo').val('0');
            $('#recargoTipo').val('');
            limpiarToggle('#recargoTipoWrap');
        }

        /* ===============================
           DESCUENTO
        =============================== */
        const descVal = Number(v.DescuentoValor);
        const descTipo = v.DescuentoTipo;

        if (!isNaN(descVal) && descVal > 0 && descTipo) {

            $('#descuento').val(descVal.toFixed(2));
            $('#descuentoTipo').val(descTipo);
            marcarToggleActivo('#descuentoTipoWrap', descTipo);

        } else {
            // 👉 0 sin tipo seleccionado
            $('#descuento').val('0');
            $('#descuentoTipo').val('');
            limpiarToggle('#descuentoTipoWrap');
        }

        /* ===============================
           🔒 BLOQUEAR UI
        =============================== */
        bloquearRecargoDescuentoUI();
    }


    function limpiarToggle(wrapperSel) {
        const wrap = document.querySelector(wrapperSel);
        if (!wrap) return;

        wrap.querySelectorAll('.btn').forEach(b => {
            b.classList.remove('active');
        });
    }

    function marcarToggleActivo(wrapperSel, value) {
        const $wrap = $(wrapperSel);
        $wrap.find('.btn').removeClass('active');
        $wrap.find(`.btn[data-value="${value}"]`).addClass('active');
    }


    function bloquearRecargoDescuentoUI() {

        $('#recargo').prop('readonly', true);
        $('#descuento').prop('readonly', true);

        $('#recargoTipoWrap button').prop('disabled', true);
        $('#descuentoTipoWrap button').prop('disabled', true);

        $('#recargoTipo').prop('disabled', true);
        $('#descuentoTipo').prop('disabled', true);

        $('#recargo').addClass('readonly');
        $('#descuento').addClass('readonly');
    }


})();




function openModal(imageSrc) {
    // Cambia el src de la imagen del modal
    document.getElementById('modalImage').src = imageSrc;
    // Muestra el modal
    $('#imageModal').modal('show');
}


function setModoModalProducto(modo) {
    const $btn = $('#btnGuardarProducto');

    if (modo === 'editar') {
        $btn
            .text('Guardar')
            .removeClass('btn-primary')
            .addClass('btn-success');
    } else {
        $btn
            .text('Añadir')
            .removeClass('btn-success')
            .addClass('btn-primary');
    }
}


window.abrirHistorialDesdeNuevoModif = function (idVenta, idCuota) {

    if (typeof window.abrirHistorialDesdeCobros !== "function") {
        showToast("Historial no disponible", "danger");
        return;
    }

    window.abrirHistorialDesdeCobros(idVenta, idCuota);
};


window.abrirCobroDesdeNuevoModif = function (idVenta, idCuota) {

    if (typeof window.abrirModalCobro !== "function") {
        showToast("Cobro no disponible", "danger");
        return;
    }

    window.abrirModalCobro(idVenta, idCuota);
};

window.abrirAjusteDesdeNuevoModif = function (idVenta, idCuota) {

    if (typeof window.abrirAjusteDesdeCobros !== "function") {
        showToast("Ajuste no disponible", "danger");
        return;
    }

    window.abrirAjusteDesdeCobros(idVenta, idCuota);
};


window.exportarPdfDesdeNuevoModif = function () {

    if (typeof window.exportarVentaPDF !== "function") {
        showToast("Exportación PDF no disponible", "danger");
        return;
    }

    if (!window.ventaActual && !window.idVenta) {
        showToast("No hay venta cargada para exportar", "warn");
        return;
    }

    var ventaId = document.getElementById("idVenta").value;

    // 🔥 El partial ya sabe qué venta exportar
    window.exportarVentaPDF(ventaId);
};

function generarPdfVenta(venta) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    const money = v =>
        Number(v || 0).toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS"
        });

    // ===== Helpers fechas =====
    const parseFechaVenc = (x) => {
        // backend suele venir ISO/Date
        const m = moment(x);
        return m.isValid() ? m : moment(String(x), "DD/MM/YYYY", true);
    };

    const hoy = moment().startOf("day");

    let y = 14;

    /* ================= HEADER ================= */
    doc.setFontSize(16);
    doc.text("VENTA ELECTRODOMÉSTICOS", 105, y, { align: "center" });
    y += 8;

    doc.setFontSize(10);
    doc.text(`Venta Nº: ${venta.IdVenta}`, 10, y);
    doc.text(`Fecha: ${venta.FechaVenta ? moment(venta.FechaVenta).format("DD/MM/YYYY") : ""}`, 150, y);
    y += 6;

    doc.text(`Cliente: ${venta.ClienteNombre || ""}`, 10, y);


    y += 6;

    let recargoTipo = (venta?.RecargoTipo ?? "").toString().trim();
    let recargoVal = Number(venta?.RecargoValor ?? 0) || 0;

    let descuentoTipo = (venta?.DescuentoTipo ?? "").toString().trim();
    let descuentoVal = Number(venta?.DescuentoValor ?? 0) || 0;

    // 2) Fallback a UI si backend no trae
    if (!recargoTipo) recargoTipo = (typeof getTipoFromUI === "function")
        ? getTipoFromUI("#recargoTipoWrap", "#recargoTipo")
        : (document.querySelector("#recargoTipo")?.value || "%");

    if (!recargoVal) recargoVal = (typeof parseMoney === "function")
        ? parseMoney(document.querySelector("#recargo")?.value)
        : (Number(document.querySelector("#recargo")?.value || 0) || 0);

    if (!descuentoTipo) descuentoTipo = (typeof getTipoFromUI === "function")
        ? getTipoFromUI("#descuentoTipoWrap", "#descuentoTipo")
        : (document.querySelector("#descuentoTipo")?.value || "%");

    if (!descuentoVal) descuentoVal = (typeof parseMoney === "function")
        ? parseMoney(document.querySelector("#descuento")?.value)
        : (Number(document.querySelector("#descuento")?.value || 0) || 0);

    // 3) Armar texto por separado
    const abs = n => Math.abs(Number(n || 0));
   

    let recargoTxt = "";
    if (abs(recargoVal) > 0.0001) {
        recargoTxt = (recargoTipo === "%") ? `${recargoVal}%` : money(recargoVal);
    }

    let descuentoTxt = "";
    if (abs(descuentoVal) > 0.0001) {
        descuentoTxt = (descuentoTipo === "%") ? `${descuentoVal}%` : money(descuentoVal);
    }

    // 4) ✅ IMPRIMIR como vos querés
    if (recargoTxt || descuentoTxt) {
        let linea = [];
        if (recargoTxt) linea.push(`Recargo: ${recargoTxt}`);
        if (descuentoTxt) linea.push(`Descuento: ${descuentoTxt}`);

        doc.setFontSize(10);
        doc.text(linea.join("  |  "), 10, y);
        y += 8;
    }


    /* ================= TOTALES ================= */
    const totalVenta = Number(venta.ImporteTotal || venta.Total || 0);

    const cuotasVenta = Array.isArray(venta.Cuotas) ? venta.Cuotas : [];

    const totalPagado = cuotasVenta.reduce((a, c) => a + Number(c.MontoPagado || 0), 0);
    const restante = Math.max(totalVenta - totalPagado, 0);

    doc.setFontSize(12);
    doc.text("Resumen", 10, y);
    y += 5;

    doc.setFontSize(10);
    doc.text(`Total venta: ${money(totalVenta)}`, 10, y); y += 5;
    doc.text(`Total pagado: ${money(totalPagado)}`, 10, y); y += 5;
    doc.text(`Restante: ${money(restante)}`, 10, y); y += 8;

    /* ================= PLAN DE CUOTAS ================= */
    doc.setFontSize(12);
    doc.text("Plan de cuotas", 10, y);
    y += 3;

    // ===== Detectar "PRÓXIMA" =====
    // Regla:
    // 1) primera NO pagada con vencimiento <= hoy (la que corresponde pagar hoy/atrasada)
    // 2) si no hay, la NO pagada con vencimiento más cercano futuro
    const cuotasNorm = cuotasVenta.map(c => {
        const vencM = parseFechaVenc(c.FechaVencimiento).startOf("day");
        const totalCuota =
            Number(c.MontoOriginal || 0) +
            Number(c.MontoRecargos || 0) -
            Number(c.MontoDescuentos || 0);

        const pagado = Number(c.MontoPagado || 0);
        const restanteCuota = (c.MontoRestante != null)
            ? Number(c.MontoRestante)
            : Math.max(totalCuota - pagado, 0);

        const estadoRaw = (c.Estado || "Pendiente").trim();

        return {
            c,
            vencM,
            totalCuota,
            pagado,
            restanteCuota,
            estadoRaw,
            numero: Number(c.NumeroCuota || 0)
        };
    });

    const noPagadas = cuotasNorm
        .filter(x => x.estadoRaw !== "Pagada" && x.restanteCuota > 0.0001)
        .sort((a, b) => a.vencM.valueOf() - b.vencM.valueOf());

    let proximaNumero = null;

    if (noPagadas.length) {
        const candidatasHoyOAntes = noPagadas.filter(x => x.vencM.isSameOrBefore(hoy, "day"));
        if (candidatasHoyOAntes.length) {
            proximaNumero = candidatasHoyOAntes[0].numero; // la más vieja impaga
        } else {
            proximaNumero = noPagadas[0].numero; // la futura más cercana
        }
    }

    // ===== Armar body + meta por fila =====
    const filasMeta = [];

    const body = cuotasNorm
        .sort((a, b) => a.numero - b.numero)
        .map(x => {

            let estadoTxt = x.estadoRaw;
            let estadoTipo = "pendiente"; // pagada | vencida | proxima | pendiente

            if (x.estadoRaw === "Pagada" || x.restanteCuota <= 0.0001) {
                estadoTxt = "Pagada";
                estadoTipo = "pagada";
            } else {
                // vencida?
                if (hoy.isAfter(x.vencM, "day")) {
                    const dias = hoy.diff(x.vencM, "days");
                    estadoTxt = `Vencida - ${dias} días`;
                    estadoTipo = "vencida";
                } else {
                    estadoTxt = "Pendiente";
                    estadoTipo = "pendiente";
                }

                // proxima?
                if (proximaNumero != null && x.numero === proximaNumero) {
                    estadoTxt = "Próxima";
                    estadoTipo = "proxima";
                }
            }

            filasMeta.push({
                estadoTipo,
                // fila amarilla SOLO si es proxima
                rowFill: (estadoTipo === "proxima") ? [255, 243, 205] : null // amarillo suave
            });

            return [
                String(x.numero),
                x.vencM.isValid() ? x.vencM.format("DD/MM/YYYY") : "",
                money(x.totalCuota),
                money(x.pagado),
                money(x.restanteCuota),
                estadoTxt
            ];
        });

    doc.autoTable({
        startY: y,
        head: [["#", "Vencimiento", "Total", "Pagado", "Restante", "Estado"]],
        body,
        theme: "grid",
        styles: { fontSize: 9, valign: "middle" },

        // ✅ FIX: el header NO se pinta raro
        headStyles: {
            fillColor: [22, 160, 133],   // verde header (como tu diseño)
            textColor: [255, 255, 255],
            fontStyle: "bold"
        },

        // ✅ Pintar SOLO lo que corresponde (estado o fila próxima)
        didParseCell: function (data) {
            // Ignorar el header totalmente
            if (data.section === "head") return;

            const meta = filasMeta[data.row.index];
            if (!meta) return;

            // 1) Si es "próxima", pintar TODA la fila amarilla
            if (meta.rowFill) {
                data.cell.styles.fillColor = meta.rowFill;
            }

            // 2) Columna Estado: SOLO pintar el texto (sin borde raro)
            const colEstado = 5; // índice en el body
            if (data.column.index === colEstado) {
                if (meta.estadoTipo === "pagada") {
                    data.cell.styles.textColor = [25, 135, 84]; // verde
                    data.cell.styles.fontStyle = "bold";
                }
                else if (meta.estadoTipo === "vencida") {
                    data.cell.styles.textColor = [220, 53, 69]; // rojo
                    data.cell.styles.fontStyle = "bold";
                }
                else if (meta.estadoTipo === "proxima") {
                    data.cell.styles.textColor = [33, 37, 41]; // negro prolijo
                    data.cell.styles.fontStyle = "bold";
                }
                else {
                    // pendiente normal
                    data.cell.styles.textColor = [33, 37, 41];
                }
            }
        }
    });

    /* ================= FOOTER ================= */
    const fileName = `Venta_${venta.IdVenta}_${moment().format("YYYYMMDD_HHmm")}.pdf`;
    doc.save(fileName);
}





function getTextoRecargoDescuento(venta) {

    // 1) Preferir backend si viene (lo más correcto)
    let rTipo = (venta?.RecargoTipo ?? '').toString().trim();
    let rVal = Number(venta?.RecargoValor ?? 0) || 0;

    let dTipo = (venta?.DescuentoTipo ?? '').toString().trim();
    let dVal = Number(venta?.DescuentoValor ?? 0) || 0;

    // 2) Fallback UI (tu caso: inputs + toggles)
    if (!rTipo) rTipo = (typeof getTipoFromUI === "function")
        ? getTipoFromUI('#recargoTipoWrap', '#recargoTipo')
        : (document.querySelector('#recargoTipo')?.value || '%');

    if (!rVal) rVal = (typeof parseMoney === "function")
        ? parseMoney(document.querySelector('#recargo')?.value)
        : (Number(document.querySelector('#recargo')?.value || 0) || 0);

    if (!dTipo) dTipo = (typeof getTipoFromUI === "function")
        ? getTipoFromUI('#descuentoTipoWrap', '#descuentoTipo')
        : (document.querySelector('#descuentoTipo')?.value || '%');

    if (!dVal) dVal = (typeof parseMoney === "function")
        ? parseMoney(document.querySelector('#descuento')?.value)
        : (Number(document.querySelector('#descuento')?.value || 0) || 0);

    const abs = x => Math.abs(Number(x || 0));
    const tieneRec = abs(rVal) > 0.0001;
    const tieneDes = abs(dVal) > 0.0001;

    // formateo: % => “10%” | $ => “$ 10.000,00”
    const money = v => Number(v || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
    const fmtVal = (val, tipo) => (tipo === '%') ? `${Number(val)}%` : money(val);

    if (!tieneRec && !tieneDes) return "Sin recargos ni descuentos";

    if (tieneRec && tieneDes)
        return `Recargo: ${fmtVal(rVal, rTipo)} | Descuento: ${fmtVal(dVal, dTipo)}`;

    if (tieneRec)
        return `Recargo: ${fmtVal(rVal, rTipo)}`;

    return `Descuento: ${fmtVal(dVal, dTipo)}`;
}
