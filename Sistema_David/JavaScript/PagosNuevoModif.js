/* Pagos – NuevoModif (create/update con firma y PDF con bloque de firma)
   Requiere utils.js: formatearMiles, formatearSinMiles, formatNumber */
(function () {
    const sueldoIdInicial = (window.PAGOS_ID_SUELDO || 0) || null;

    // ====== Estado ======
    let sueldoId = sueldoIdInicial;
    let calcFull = null;   // cálculo con ambos tipos (para re-filtrar)
    let calcView = null;   // cálculo filtrado según segTipo
    let pagos = [];        // {FechaPago, Metodo, Importe, Nota, IdPagoSuelto?}
    let reglaEditingId = 0;
    let rutaComprobanteSrv = null; // si viene desde servidor
    let editPagoIdx = null;        // null = alta, >=0 = edición de ese índice

    // ====== DOM ======
    const $tipoNeg = $('#slcTipoNegocio');
    const $usuario = $('#slcUsuario');
    const $desde = $('#inpDesde');
    const $hasta = $('#inpHasta');
    const $btnCalc = $('#btnCalcular');
    const $segTipo = $('#segTipo'); // Ambos/Ventas/Cobros

    // resumen
    const $sumTotal = $('#sumTotal');
    const $sumAbonado = $('#sumAbonado');
    const $sumSaldo = $('#sumSaldo');
    const $sumVentas = $('#sumVentas');
    const $sumCobros = $('#sumCobros');

    // detalle
    const $tblDet = $('#tblDetalle tbody');
    const $tfoot = $('#tfootDetalle');
    //const $ftBase = $('#ftBase');
    const $ftImporte = $('#ftImporte');

    // pagos
    const modalPago = new bootstrap.Modal(document.getElementById('modalPago'));
    const $pgFecha = $('#pgFecha');
    const $pgMetodo = $('#pgMetodo');
    const $pgImporte = $('#pgImporte');
    const $pgNota = $('#pgNota');
    const $pgSaldo = $('#pgSaldo');

    // reglas
    const modalReglas = new bootstrap.Modal(document.getElementById('modalReglas'));
    const $segReglaTipo = $('#segReglaTipo');
    const $rgTipoNegocio = $('#rgTipoNegocio');
    const $tblReglas = $('#tblReglas tbody');
    const $reglaEditor = $('#reglaEditor');
    const $edDesde = $('#edDesde'), $edHasta = $('#edHasta'), $edPorc = $('#edPorc'), $edActiva = $('#edActiva');

    // firma período
    const $firmaFile = $('#firmaFile');
    const $firmaPreviewWrap = $('#firmaPreviewWrap');
    const $firmaPreviewImg = $('#firmaPreviewImg');
    const $comprobanteLink = $('#comprobanteLink');

    // acciones
    const $btnRegistrarTodo = $('#btnRegistrarTodo');
    const $btnRegistrarTodoTxt = $('#btnRegistrarTodo .txt');
    const $btnOpenPago = $('#btnOpenPago');
    const $btnOpenReglas = $('#btnOpenReglas');

    // lightbox
    const $lightbox = $('#imgLightbox');
    const $lightboxImg = $('#imgLightboxImg');

    // Fechas por defecto: últimos 7 días
    const today = new Date(); const start = new Date(); start.setDate(today.getDate() - 6);
    $desde.val(toISO(start)); $hasta.val(toISO(today));
    $pgFecha.val(toISO(today));

    // ====== Init ======
    (async function init() {
        // label del botón según modo
        if (sueldoId) {
            $btnRegistrarTodo.removeClass('btn-primary').addClass('btn-success');
            $btnRegistrarTodo.find('i').removeClass('bi-check2-circle').addClass('bi-save2');
            $btnRegistrarTodoTxt.text('Guardar cambios');
        } else {
            $btnRegistrarTodo.removeClass('btn-success').addClass('btn-primary');
            $btnRegistrarTodo.find('i').removeClass('bi-save2').addClass('bi-check2-circle');
            $btnRegistrarTodoTxt.text('Registrar');
        }

        toggleCalcularVisibility();

        // (en reglas no existe “Ambos” en UI)
        $segReglaTipo.find('[data-tipo="0"]').remove();

        await loadTiposNegocio($tipoNeg, null, true);        // principal: incluye "Todos"
        await loadTiposNegocio($rgTipoNegocio, null, false); // modal: SIN "Todos"

        // Cargamos usuarios del TN actual (o -1)
        await loadUsuarios($usuario, $tipoNeg.val());

        // Cambia TN → recargar usuarios
        $tipoNeg.on('change', async () => { await loadUsuarios($usuario, $tipoNeg.val()); });

        // Formateo live con utils (miles)
        $edDesde.on('input', function () { this.value = formatearMiles(String(this.value)); });
        $edHasta.on('input', function () { this.value = formatearMiles(String(this.value)); });
        $pgImporte.on('input', function () { this.value = formatearMiles(String(this.value)); });

        // Si es EDICIÓN, cargar el sueldo una vez están los combos listos
        if (sueldoId) { await cargarSueldo(sueldoId); }
    })();

    // ====== Eventos ======
    $btnCalc.on('click', calcular);

    // cambio de tipo (Ambos / Ventas / Cobros)
    $segTipo.on('click', '.segment', function () {
        $segTipo.find('.segment').removeClass('active');
        $(this).addClass('active');
        if (calcFull) renderCalculo(calcFull); // re-filtra y redibuja
    });

    // abrir modal “nuevo pago”
    $btnOpenPago.on('click', () => {
        if (!calcFull && !sueldoId) { toast('Primero realiza un Cálculo.', 'warning'); return; }
        editPagoIdx = null; // modo alta
        $('#modalPago .modal-title').text('Registrar Pago');
        $('#btnRegistrarPago').html('<i class="bi bi-check2-circle me-1"></i>Registrar');

        $pgFecha.val(toISO(new Date()));
        $pgMetodo.val('EFECTIVO');
        $pgImporte.val('');
        $pgNota.val('');

        const totalCalc = (calcView?.ImporteTotal || calcFull?.ImporteTotal || 0);
        $pgSaldo.text(formatNumber(totalCalc - sumPagos()));
        modalPago.show();
    });

    $('#btnRegistrarPago').off('click').on('click', guardarPagoDesdeModal);

    function toggleCalcularVisibility() {
        if (sueldoId && Number(sueldoId) > 0) $btnCalc.addClass('d-none');
        else $btnCalc.removeClass('d-none');
    }

    function guardarPagoDesdeModal() {
        const imp = formatearSinMiles($pgImporte.val());
        if (!imp || imp <= 0) { toast('Importe inválido.', 'warning'); return; }

        const item = {
            FechaPago: $pgFecha.val(),
            Metodo: $pgMetodo.val(),
            Importe: imp,
            Nota: $pgNota.val()
        };

        if (editPagoIdx !== null && editPagoIdx >= 0) {
            pagos[editPagoIdx] = item;
            toast('Pago actualizado.');
        } else {
            pagos.push(item);
            toast('Pago agregado a la lista.');
        }

        editPagoIdx = null;
        modalPago.hide();
        renderPagos();
    }

    // firma preview (archivo local)
    $firmaFile.on('change', e => {
        const f = e.target.files?.[0];
        if (!f) { $firmaPreviewWrap.addClass('d-none'); $comprobanteLink.addClass('d-none'); return; }

        $('#firmaName').text(f.name || 'Archivo seleccionado');

        if (f.type.startsWith('image/')) {
            const fr = new FileReader();
            fr.onload = ev => {
                $firmaPreviewImg.attr('src', ev.target.result);
                $firmaPreviewWrap.removeClass('d-none');
                $comprobanteLink.addClass('d-none');
                rutaComprobanteSrv = null; // va a subirse uno nuevo
            };
            fr.readAsDataURL(f);
        } else {
            // PDF u otro -> no hay preview de imagen
            $firmaPreviewWrap.addClass('d-none');
            $comprobanteLink.removeClass('d-none').attr('href', '#').off('click').on('click', () => {
                const url = URL.createObjectURL(f);
                window.open(url, '_blank');
                setTimeout(() => URL.revokeObjectURL(url), 60000);
            });
        }
    });

    // lightbox open/close
    $firmaPreviewImg.on('click', () => {
        const src = $firmaPreviewImg.attr('src'); if (!src) return;
        $lightboxImg.attr('src', src);
        $lightbox.fadeIn(120);
    });
    $lightbox.on('click', (e) => {
        if (e.target === $lightbox[0] || $(e.target).hasClass('close')) $lightbox.fadeOut(120);
    });
    $(document).on('keydown', (e) => { if (e.key === 'Escape') $lightbox.fadeOut(120); });

    $btnOpenReglas.on('click', () => { reglaEditingId = 0; $reglaEditor.addClass('d-none'); loadReglas(); modalReglas.show(); });
    $('#btnNuevaRegla').on('click', () => { reglaEditingId = 0; $edDesde.val(''); $edHasta.val(''); $edPorc.val(''); $edActiva.prop('checked', true); $reglaEditor.removeClass('d-none'); $edDesde.focus(); });
    $('#btnCancelarRegla').on('click', () => { $reglaEditor.addClass('d-none'); reglaEditingId = 0; });
    $('#btnGuardarRegla').on('click', guardarRegla);
    $rgTipoNegocio.on('change', loadReglas);
    $segReglaTipo.off('click', '.segment').on('click', '.segment', function () {
        $segReglaTipo.find('.segment').removeClass('active'); $(this).addClass('active'); loadReglas();
    });

    $('#btnExportPdf').on('click', exportPdf);
    $btnRegistrarTodo.on('click', registrarTodoUI);

    // ====== Calcular ======
    async function calcular() {
        const idUser = +$usuario.val() || 0;
        if (!idUser) { toast('Seleccioná un vendedor.', 'warning'); return; }

        // 🚦 Verificación previa: si no hay reglas, ofrezco crearlas y corto
        if (!await verificarReglasAntesDeCalcular()) return;

        try {
            const desdeISO = $desde.val(), hastaISO = $hasta.val();
            const r = await $.getJSON('/Pagos/Calcular', { idUsuario: idUser, desde: desdeISO, hasta: hastaISO });
            calcFull = r;
            renderCalculo(r);

            // Si es NUEVO sueldo → precargar pagos Parciales del período (sin asociar)
            if (!sueldoId) {
                const Parciales = await listarPagosParcialesPeriodo(idUser, desdeISO, hastaISO);
                pagos = [];
                Parciales.forEach(s => {
                    pagos.push({
                        FechaPago: moment(s.FechaPago).format('YYYY-MM-DD'),
                        Metodo: s.Metodo || 'EFECTIVO',
                        Importe: Number(s.Importe) || 0,
                        Nota: s.Nota || '',
                        IdPagoSuelto: s.Id
                    });
                });
                renderPagos();
            }

            toast('Cálculo realizado.');
        } catch (e) {
            console.error(e);
            toast('No se pudo calcular.', 'danger');
        }
    }

    // ====== Totales resumen ======
    function sumPagos() {
        return (Array.isArray(pagos) ? pagos : []).reduce((acc, p) => acc + (Number(p?.Importe) || 0), 0);
    }

    function updateResumen(importeCalc, abonadoActual) {
        const total = Number(importeCalc || 0);
        const abonado = Number(abonadoActual || 0);
        const saldo = Math.round((total - abonado) * 100) / 100;

        if ($sumTotal?.length) $sumTotal.text(formatNumber(total));
        if ($sumAbonado?.length) $sumAbonado.text(formatNumber(abonado));
        if ($sumSaldo?.length) $sumSaldo.text(formatNumber(saldo));

        const $saldoBox = $sumSaldo?.closest('.info-box');
        if ($saldoBox?.length) {
            $saldoBox.removeClass('info-ok info-warn');
            $saldoBox.addClass(saldo <= 0 ? 'info-ok' : 'info-warn');
        }
        if ($pgSaldo.length) $pgSaldo.text(formatNumber(saldo));
    }

    // ====== Render (según tipo seleccionado)
    function getTipoSel() { return +$segTipo.find('.segment.active').data('tipo') || 0; }

    function renderCalculo(vmBoth) {
        const det = (vmBoth?.Detalles || []);
        const tipoSel = getTipoSel(); // 0 ambos, 1 ventas, 2 cobros

        // KPIs por tipo
        const sumPorTipo = (t) => det.filter(d => d.TipoOrigen === t)
            .reduce((a, d) => ({ base: a.base + (+d.BaseMonto || 0), imp: a.imp + (+d.ImporteCalc || 0) }), { base: 0, imp: 0 });
        const v = sumPorTipo(1), c = sumPorTipo(2);
        $sumVentas.text(formatNumber(v.imp));
        $sumCobros.text(formatNumber(c.imp));

        // Filtrado por segmentación
        const detFiltrado = (tipoSel === 0) ? det : det.filter(d => d.TipoOrigen === tipoSel);

        // Agrupación por TipoOrigen + Porcentaje
        const groupsMap = {};
        for (const d of detFiltrado) {
            const pct = Number(d.Porcentaje);
            const key = `${d.TipoOrigen}|${pct.toFixed(2)}`;
            if (!groupsMap[key]) groupsMap[key] = { tipo: d.TipoOrigen, pct, base: 0, imp: 0 };
            groupsMap[key].base += (+d.BaseMonto || 0);
            groupsMap[key].imp += (+d.ImporteCalc || 0);
        }
        const groups = Object.values(groupsMap).sort((a, b) => (a.tipo - b.tipo) || (a.pct - b.pct));

        // Render
        $tblDet.empty();
        let baseTot = 0, impTot = 0;

        if (!groups.length) {
            $tblDet.append(`
                <tr class="empty-row">
                    <td colspan="4" class="text-center text-muted py-5">
                        <div class="empty">
                            <i class="bi bi-ui-checks-grid"></i>
                            <div class="empty-title">Sin detalle</div>
                            <div class="empty-sub">Calculá para ver los ítems de comisión</div>
                        </div>
                    </td>
                </tr>`);
            //$ftBase.text('—'); $ftImporte.text('—');
            $tfoot.addClass('d-none');
            updateResumen(0, sumPagos());
            calcView = { IdUsuario: vmBoth.IdUsuario, Desde: vmBoth.Desde, Hasta: vmBoth.Hasta, Detalles: detFiltrado.slice(0), ImporteTotal: 0 };
            return;
        }

        for (const g of groups) {
            const pctTxt = g.pct.toLocaleString('es-AR', { maximumFractionDigits: 2 });
            const desc = `Comisión por ${g.tipo === 1 ? 'Ventas' : 'Cobranzas'} al ${pctTxt}%`;
            $tblDet.append(`
                <tr>
                    <td>${desc}</td>
                    <td class="text-end">${formatNumber(g.base)}</td>
                    <td class="text-end">${pctTxt}%</td>
                    <td class="text-end">${formatNumber(g.imp)}</td>
                </tr>`);
            baseTot += g.base; impTot += g.imp;
        }

        //$ftBase.text(formatNumber(baseTot));
        $ftImporte.text(formatNumber(impTot));
        $tfoot.removeClass('d-none');

        updateResumen(impTot, sumPagos());

        calcView = {
            IdUsuario: vmBoth.IdUsuario,
            Desde: vmBoth.Desde,
            Hasta: vmBoth.Hasta,
            Detalles: detFiltrado.slice(0),
            ImporteTotal: impTot
        };
    }

    // ====== Pagos (UI)
    function renderPagos(listFromServer) {
        if (listFromServer) {
            pagos = listFromServer.map(p => ({
                FechaPago: toISOfromSrv(p.FechaPago),
                Metodo: p.Metodo,
                Importe: p.Importe,
                Nota: p.Nota
            }));
        }

        const $tb = $('#tblPagos tbody');
        $tb.empty();

        if (!pagos.length) {
            $tb.append(`
            <tr class="empty-row">
              <td colspan="5" class="text-center text-muted py-4">
                <div class="empty"><i class="bi bi-wallet2"></i>
                  <div class="empty-title">Sin pagos…</div>
                  <div class="empty-sub">Registrá un pago para verlo aquí</div>
                </div>
              </td>
            </tr>`);
        } else {
            pagos.forEach((p, idx) => {
                const badge = p.IdPagoSuelto ? `<span class="badge bg-info ms-2">Parcial</span>` : '';
                $tb.append(`
                <tr>
                  <td>${formatearFechaParaVista(p.FechaPago)}</td>
                  <td>${escapeHtml(p.Metodo || '')}${badge}</td>
                  <td class="text-end">${formatNumber(p.Importe)}</td>
                  <td>${escapeHtml(p.Nota || '')}</td>
                  <td class="text-center">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-ghost" data-ed="${idx}" title="Editar"><i class="bi bi-pencil"></i></button>
                      <button class="btn btn-outline-danger btn-sm" data-del="${idx}" title="Quitar"><i class="bi bi-trash"></i></button>
                    </div>
                  </td>
                </tr>`);
            });

            // Editar
            $tb.off('click', '[data-ed]').on('click', '[data-ed]', function () {
                const i = +$(this).data('ed');
                abrirEditarPago(i);
            });

            // Eliminar
            $tb.off('click', '[data-del]').on('click', '[data-del]', function () {
                const i = +$(this).data('del');
                pagos.splice(i, 1);
                renderPagos();
                updateResumen(calcView?.ImporteTotal || 0, sumPagos());
            });
        }

        updateResumen(calcView?.ImporteTotal || 0, sumPagos());
    }

    function abrirEditarPago(idx) {
        const p = pagos[idx]; if (!p) return;
        editPagoIdx = idx;

        $('#modalPago .modal-title').text('Editar Pago');
        $('#btnRegistrarPago').html('<i class="bi bi-save2 me-1"></i>Guardar');

        $pgFecha.val(p.FechaPago || toISO(new Date()));
        $pgMetodo.val(p.Metodo || 'EFECTIVO');
        $pgImporte.val(formatearMiles(String(p.Importe ?? 0)));
        $pgNota.val(p.Nota || '');

        // saldo considerando que voy a reemplazar este pago (lo excluyo del total actual)
        const totalCalc = (calcView?.ImporteTotal || calcFull?.ImporteTotal || 0);
        const saldoSinEste = totalCalc - (sumPagos() - (Number(p.Importe) || 0));
        $pgSaldo.text(formatNumber(saldoSinEste));

        modalPago.show();
    }

    // ====== Guardar TODO (create/update) ======
    async function registrarTodoUI() {
        try {
            if (!calcView && !sueldoId) return toast('Primero calculá el período.', 'warning');

            const idUser = +$usuario.val() || (calcView?.IdUsuario || 0);
            if (!idUser) return toast('Falta vendedor.', 'warning');

            // Evito doble submit
            $btnRegistrarTodo.prop('disabled', true);

            const fd = new FormData();

            if (sueldoId) fd.append('id', String(sueldoId));

            const calcJson = JSON.stringify(
                calcView || { IdUsuario: idUser, Desde: $desde.val(), Hasta: $hasta.val(), Detalles: [], ImporteTotal: 0 }
            );
            fd.append('calcJson', calcJson);
            fd.append('concepto', $('#inpConcepto').val() || 'Liquidación');
            fd.append('nota', $('#inpNota').val() || '');

            // ========= Pagos =========
            // 1) Quedo SOLO con pagos MANUALES (excluyo los que tienen IdPagoSuelto, que los manda el array aparte)
            const pagosManuales = (pagos || []).filter(p => !p.IdPagoSuelto);

            // 2) Deduplico manuales por (fecha|método|importe|nota)
            const seen = new Set();
            const pagosDedup = [];
            for (const p of pagosManuales) {
                const f = String(p.FechaPago || '').slice(0, 10);
                const m = String(p.Metodo || 'EFECTIVO').trim().toUpperCase();
                const i = Number(p.Importe || 0);
                const n = String(p.Nota || '').trim();
                if (!f || !i || i <= 0) continue;

                const key = `${f}|${m}|${i.toFixed(2)}|${n.toLowerCase()}`;
                if (seen.has(key)) continue;
                seen.add(key);

                pagosDedup.push({ Fecha: f, Metodo: m, Importe: i, Nota: n });
            }
            fd.append('pagosJson', JSON.stringify(pagosDedup));

            // 3) IDs únicos de pagos parciales (se asocian en el server y NO se envían duplicados en pagosJson)
            const idsParciales = [...new Set((pagos || []).map(p => p.IdPagoSuelto).filter(x => Number.isInteger(x)))];
            fd.append('pagosParcialesIdsJson', JSON.stringify(idsParciales));

            // ========= Firma/comprobante (opcional) =========
            const firmaFile = $firmaFile[0]?.files?.[0] || null;
            if (firmaFile) fd.append('comprobanteFirma', firmaFile);

            const resp = await $.ajax({
                url: '/Pagos/GuardarTodo',
                method: 'POST',
                data: fd,
                contentType: false,
                processData: false
            });

            if (!(resp && resp.ok && resp.id > 0)) throw new Error(resp?.error || 'No se guardó');

            toast(sueldoId ? 'Cambios guardados.' : 'Registro guardado correctamente.');
            window.location.href = '/Pagos';
        } catch (e) {
            console.error(e);
            toast('Error al guardar. ' + (e?.message || ''), 'danger');
        } finally {
            $btnRegistrarTodo.prop('disabled', false);
        }
    }

    // ====== Cargar para editar ======
    function ensureSelectValue($slc, value, textFallback = '') {
        if (value === undefined || value === null) return;
        const exists = $slc.find(`option[value="${value}"]`).length > 0;
        if (!exists && textFallback) {
            $slc.append(`<option value="${value}">${escapeHtml(textFallback)}</option>`);
        }
        $slc.val(String(value));
    }

    async function cargarSueldo(id) {
        try {
            const r = await $.ajax({ url: '/Pagos/Obtener', method: 'GET', data: { id }, dataType: 'json' });
            if (r && r.error) { toast(r.error || 'No se encontró el sueldo.', 'danger'); return; }

            const cab = r?.Cab || {};
            const det = Array.isArray(r?.Det) ? r.Det : [];
            const pg = Array.isArray(r?.Pagos) ? r.Pagos : [];

            calcFull = {
                IdUsuario: cab.IdUsuario || 0,
                Desde: toISOfromSrv(cab.FechaDesde),
                Hasta: toISOfromSrv(cab.FechaHasta),
                ImporteTotal: cab.ImporteTotal || 0,
                Detalles: det.map(d => ({
                    TipoOrigen: d.TipoOrigen,
                    IdTipoNegocio: d.IdTipoNegocio,
                    BaseMonto: d.BaseMonto,
                    Porcentaje: d.Porcentaje,
                    ImporteCalc: d.ImporteCalc,
                    Observacion: d.Observacion
                }))
            };

            ensureSelectValue($usuario, calcFull.IdUsuario);

            if (calcFull.Desde) $desde.val(calcFull.Desde);
            if (calcFull.Hasta) $hasta.val(calcFull.Hasta);

            if (typeof cab.Concepto !== 'undefined') $('#inpConcepto').val(cab.Concepto || '');
            if (typeof cab.NotaInterna !== 'undefined') $('#inpNota').val(cab.NotaInterna || '');

            renderCalculo(calcFull);

            const pagosNormalizados = pg.map(p => ({
                FechaPago: toISOfromSrv(p.FechaPago),
                Metodo: p.Metodo,
                Importe: p.Importe,
                Nota: p.Nota,
                RutaComprobante: p.RutaComprobante || null
            }));
            renderPagos(pagosNormalizados);

            rutaComprobanteSrv = cab.RutaComprobante || null;
            if (rutaComprobanteSrv) {
                if (/\.(png|jpg|jpeg|gif|webp)$/i.test(rutaComprobanteSrv)) {
                    $firmaPreviewImg.attr('src', rutaComprobanteSrv);
                    $firmaPreviewWrap.removeClass('d-none');
                    $('#firmaName').text(rutaComprobanteSrv.split('/').pop());
                    $comprobanteLink.addClass('d-none');
                } else {
                    $firmaPreviewWrap.addClass('d-none');
                    $('#firmaName').text(rutaComprobanteSrv.split('/').pop());
                    $comprobanteLink.removeClass('d-none').attr('href', rutaComprobanteSrv);
                }
            }
        } catch (xhr) {
            const txt = xhr?.responseText || '';
            if (typeof txt === 'string' && /<html[\s\S]*<\/html>/i.test(txt) && /login|account/i.test(txt)) {
                window.location.href = '/Account/Login';
                return;
            }
            console.error('Obtener sueldo - error:', xhr);
            console.error('Respuesta del servidor:', txt);
            toast('No se pudo cargar el sueldo.', 'danger');
        }
    }

    // ====== Reglas ======
    async function loadReglas() {
        const tipo = +$segReglaTipo.find('.segment.active').data('tipo') || 1; // 1 ventas, 2 cobros
        const idTN = $rgTipoNegocio.val() || null;

        $tblReglas.empty();

        let rows = await $.getJSON('/Pagos/ListarReglas', { tipo, idTipoNegocio: idTN });
        rows = (rows || []).map(x => ({ ...x, _Tipo: tipo }));

        if (!rows.length) {
            $tblReglas.append(`<tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-slash-circle me-2"></i> No hay reglas para este filtro</td></tr>`);
            return;
        }

        $tblReglas.html(rows.map(r => `
          <tr>
            <td>${tipo === 1 ? 'Ventas' : 'Cobranzas'}</td>
            <td>${$('#rgTipoNegocio option:selected').text()}</td>
            <td class="text-end">${formatNumber(r.MontoDesde)}</td>
            <td class="text-end">${r.MontoHasta ? formatNumber(r.MontoHasta) : '—'}</td>
            <td class="text-end">${(r.Porcentaje || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%</td>
            <td class="text-center">${r.Activo ? '<span class="badge bg-success">Activa</span>' : '<span class="badge bg-secondary">Inactiva</span>'}</td>
            <td class="text-center">
              <div class="btn-group btn-group-sm">
                <button class="btn btn-ghost btn-ed" data-id="${r.Id}" title="Editar"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-outline-danger btn-del" data-id="${r.Id}" title="Eliminar"><i class="bi bi-trash"></i></button>
              </div>
            </td>
          </tr>`).join(''));

        // delegados
        $tblReglas.off('click', '.btn-ed').on('click', '.btn-ed', function () {
            const id = +$(this).data('id'); const row = rows.find(x => x.Id === id); if (!row) return;
            reglaEditingId = id;
            $edDesde.val(formatearMiles(String(row.MontoDesde ?? 0)));
            $edHasta.val(row.MontoHasta ? formatearMiles(String(row.MontoHasta)) : '');
            $edPorc.val(String(row.Porcentaje ?? 0).replace('.', ','));
            $edActiva.prop('checked', !!row.Activo);
            $reglaEditor.removeClass('d-none');
        });

        $tblReglas.off('click', '.btn-del').on('click', '.btn-del', async function () {
            if (!confirm('¿Eliminar regla?')) return;
            const id = +$(this).data('id');
            const ok = await $.ajax({ url: '/Pagos/EliminarRegla', method: 'POST', data: { id } });
            if (ok === true || ok?.ok === true) { toast('Regla eliminada.'); loadReglas(); } else toast('No se pudo eliminar.', 'danger');
        });
    }

    async function guardarRegla() {
        const tipo = +$segReglaTipo.find('.segment.active').data('tipo') || 1;
        const idTN = $rgTipoNegocio.val() ? +$rgTipoNegocio.val() : null;

        const obj = {
            Id: reglaEditingId,
            IdTipoRegla: tipo,
            IdTipoNegocio: idTN,
            MontoDesde: formatearSinMiles(String($edDesde.val())) || 0,
            MontoHasta: $edHasta.val().trim() ? (formatearSinMiles(String($edHasta.val())) || 0) : null,
            Porcentaje: parseFloat(($edPorc.val() || '0').replace(',', '.')) || 0,
            Activo: $edActiva.is(':checked')
        };

        if (obj.MontoHasta !== null && obj.MontoHasta <= obj.MontoDesde) return toast('“Hasta” debe ser mayor que “Desde”.', 'warning');
        if (obj.Porcentaje <= 0) return toast('Porcentaje inválido.', 'warning');

        const ok = await $.ajax({ url: '/Pagos/GuardarRegla', method: 'POST', data: obj });
        if (ok === true || ok?.ok === true) { toast('Regla guardada.'); $reglaEditor.addClass('d-none'); reglaEditingId = 0; loadReglas(); }
        else toast('No se pudo guardar.', 'danger');
    }

    // ====== Pagos Parciales (helpers) ======
    async function listarPagosParcialesPeriodo(idUsuario, desdeISO, hastaISO) {
        try {
            const res = await $.getJSON('/Pagos/PagosParcialesListar', {
                idUsuario,
                desde: desdeISO,
                hasta: hastaISO,
                soloSinAsignar: true
            });
            return Array.isArray(res) ? res : [];
        } catch (e) {
            console.warn('Pagos Parciales - error:', e);
            return [];
        }
    }

    // ====== Export PDF (mejorado) ======
    // ====== Export PDF (robusto a la carga de jsPDF) ======
    async function exportPdf() {
        // 1) Asegurar jsPDF
        const JsPDF = await ensureJsPDF();
        if (!JsPDF) { toast('No se pudo cargar jsPDF.', 'danger'); return; }

        // 2) Tu código actual, igualito pero usando "new JsPDF(...)"
        const doc = new JsPDF('p', 'pt', 'a4');
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();

        // Helpers
        const center = (txt, y) => doc.text(txt, W / 2 - doc.getTextWidth(txt) / 2, y);
        const right = (txt, x, y) => doc.text(txt, x - doc.getTextWidth(txt), y);

        // Header gradiente
        headerGrad(doc, 20, 20, W - 40, 52, [34, 95, 184], [119, 182, 255]);
        doc.setFontSize(18); doc.setTextColor(255, 255, 255);
        center('Liquidación de Comisión', 50);
        doc.setFontSize(10);
        right(`Emitido: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`, W - 40, 68);

        // Watermark estado (Pagado / Pendiente)
        const total = Number(calcView?.ImporteTotal || calcFull?.ImporteTotal || 0);
        const saldo = Math.round((total - sumPagos()) * 100) / 100;
        try {
            if (doc.saveGraphicsState && doc.setGState && doc.GState) {
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.08 }));
            }
        } catch { }
        doc.setFontSize(90);
        const [r, g, b] = (saldo <= 0) ? [40, 160, 40] : [200, 80, 80];
        doc.setTextColor(r, g, b);

        center(saldo <= 0 ? 'PAGADO' : 'PENDIENTE', H / 2);
        try { if (doc.restoreGraphicsState) doc.restoreGraphicsState(); } catch { }

        // Cabecera
        doc.setTextColor(34, 34, 34); doc.setFontSize(11);
        let y = 100;
        const vendedor = $('#slcUsuario option:selected').text() || '-';
        doc.text(`Vendedor: ${vendedor}`, 40, y);
        doc.text(`Período: ${moment($desde.val()).format("DD-MM-YYYY")} a ${moment($hasta.val()).format("DD-MM-YYYY")}`, 300, y); y += 16;
        const concepto = ($('#inpConcepto').val() || '').trim();
        if (concepto) { doc.text(`Concepto: ${concepto}`, 40, y); y += 16; }
        const nota = ($('#inpNota').val() || '').trim();
        if (nota) { doc.text(`Nota: ${nota.substring(0, 90)}`, 40, y); y += 6; }

        y += 10; doc.setFontSize(12);
        doc.text(`Importe: ${$sumTotal.text()}`, 40, y);
        doc.text(`Abonado: ${$sumAbonado.text()}`, 200, y);
        doc.text(`Saldo: ${$sumSaldo.text()}`, 360, y); y += 24;

        // Detalle
        const newSection = (title) => { doc.setFontSize(13); doc.text(title, 40, y); y += 8; doc.setLineWidth(.5); doc.line(40, y, W - 40, y); y += 12; doc.setFontSize(11); };
        const ensureSpace = (needs) => { if (y > H - needs) { doc.addPage(); y = 40; footer(); } };

        newSection('Detalle de Comisión');
        let x = 40; doc.text('Descripción', x, y); x = 325; doc.text('Base', x, y); x = 400; doc.text('%', x, y); x = 480; doc.text('Importe', x, y);
        y += 8; doc.line(40, y, W - 40, y); y += 12;

        $('#tblDetalle tbody tr').each(function () {
            const $tds = $(this).find('td'); if (!$tds.length) return;
            const d = ($($tds[0]).text() || '').trim(), base = ($($tds[1]).text() || '').trim(), pct = ($($tds[2]).text() || '').trim(), imp = ($($tds[3]).text() || '').trim();
            ensureSpace(120);
            x = 40; doc.text(d, x, y); right(base, 380, y); right(pct, 440, y); right(imp, 560, y);
            y += 18;
        });

        // Pagos
        y += 12; ensureSpace(180);
        newSection('Pagos Registrados');
        x = 40; doc.text('Fecha', x, y); x = 140; doc.text('Método', x, y); x = 260; doc.text('Nota', x, y); x = 460; doc.text('Importe', x, y);
        y += 8; doc.line(40, y, W - 40, y); y += 12;

        $('#tblPagos tbody tr').each(function () {
            const $tds = $(this).find('td'); if (!$tds.length) return;
            const f = ($($tds[0]).text() || '').trim(), m = ($($tds[1]).text() || '').trim(), imp = ($($tds[2]).text() || '').trim(), nota = ($($tds[3]).text() || '').trim();
            ensureSpace(180);
            x = 40; doc.text(f, x, y); x = 140; doc.text(m, x, y); x = 260; doc.text((nota || '').substring(0, 70), x, y); right(imp, 560, y);
            y += 18;
        });

        // Firma (con imagen si es dataURL)
        y = Math.min(y + 30, H - 200);
        doc.setLineWidth(0.8);
        doc.roundedRect(40, y, W - 80, 140, 6, 6);
        doc.setFontSize(12);
        doc.text('FIRMA DE CONFORMIDAD', 50, y + 20);
        doc.setFontSize(10); doc.setTextColor(80, 80, 80);
        doc.text('He leído y acepto la liquidación detallada arriba. Dejo constancia de mi conformidad.', 50, y + 38);

        const firmaSrc = $firmaPreviewImg.attr('src') || '';
        if (firmaSrc && firmaSrc.startsWith('data:image')) {
            try { doc.addImage(firmaSrc, 'PNG', 50, y + 50, 180, 60, undefined, 'FAST'); } catch { }
        } else if (rutaComprobanteSrv && /\.(png|jpg|jpeg|gif|webp)$/i.test(rutaComprobanteSrv)) {
            doc.setTextColor(34, 34, 34); doc.setFontSize(10);
            doc.text('Imagen de comprobante no embebida (origen externo).', 50, y + 56);
        } else if (rutaComprobanteSrv) {
            doc.setTextColor(34, 34, 34); doc.setFontSize(10);
            doc.text('Comprobante adjunto: ver archivo (PDF/otro).', 50, y + 56);
        }

        // líneas firma
        doc.setTextColor(34, 34, 34);
        doc.line(50, y + 120, 260, y + 120); doc.text('Firma', 50, y + 132);
        doc.line(280, y + 120, 530, y + 120); doc.text('Aclaración', 280, y + 132);

        // Footer
        function footer() {
            doc.setFontSize(9); doc.setTextColor(120, 120, 120);
            const foot = 'Documento no fiscal — Adjuntar comprobante firmado al expediente del período';
            center(foot, H - 24);
            try {
                const page = (doc.getCurrentPageInfo && doc.getCurrentPageInfo().pageNumber) || doc.internal.getCurrentPageInfo().pageNumber;
                right(`Pág. ${page}`, W - 40, H - 24);
            } catch { }
        }
        footer();

        const nombre = sanitize($('#slcUsuario option:selected').text() || 'Vendedor');
        doc.save(`Liquidacion_${nombre}_${$desde.val()}_${$hasta.val()}.pdf`);
    }

    /* ===== Helpers para jsPDF ===== */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src; s.async = true;
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    async function ensureJsPDF() {
        // UMD (recomendado): window.jspdf.jsPDF
        if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
        // Global legacy: window.jsPDF
        if (window.jsPDF) return window.jsPDF;

        // Intento cargar UMD desde CDN si no está presente
        try {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
        } catch { }

        // Fallback: intentar build global
        try {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.min.js');
            if (window.jsPDF) return window.jsPDF;
        } catch { }

        return null;
    }

    // ====== Loaders ======
    async function loadTiposNegocio($slc, sel, allowTodos) {
        const r = await $.getJSON('/Usuarios/ListarTipoNegocio');
        const list = (r && r.data) || [];

        $slc.empty();
        if (allowTodos) $slc.append(`<option value="-1">Todos</option>`);

        list.forEach(x => $slc.append(`<option value="${x.Id}">${escapeHtml(x.Nombre)}</option>`));

        let valueToSelect = null;
        if (sel !== undefined && sel !== null && $slc.find(`option[value="${sel}"]`).length) {
            valueToSelect = String(sel);
        } else {
            valueToSelect = $slc.find('option:last').val() ?? '';
        }

        $slc.val(valueToSelect).trigger('change');
        return list;
    }

    async function loadUsuarios($slc, idTN) {
        const r = await $.getJSON('/Usuarios/ListarActivos', { TipoNegocio: idTN ?? -1 });
        const list = (r && r.data) || [];
        $slc.empty().append(`<option value="">Seleccionar</option>`);
        list.forEach(x => $slc.append(`<option value="${x.Id}">${escapeHtml(x.Nombre)}</option>`));
        return list;
    }

    // ====== Utils locales mínimos ======
    function toISO(d) { if (typeof d === 'string') return d.substring(0, 10); const m = (d.getMonth() + 1 + '').padStart(2, '0'); const day = (d.getDate() + '').padStart(2, '0'); return `${d.getFullYear()}-${m}-${day}`; }
    function fmtDate(iso) { if (!iso) return '-'; const dd = new Date(iso); return dd.toLocaleDateString('es-AR'); }
    function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
    function sanitize(s) { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^\w\-]/g, ''); }
    function toast(msg, type = 'success') {
        const cls = (type === 'danger' ? 'bg-danger' : type === 'warning' ? 'bg-warning text-dark' : 'bg-success');
        const $t = $(`<div class="position-fixed top-0 end-0 p-3" style="z-index:1080">
          <div class="toast align-items-center text-white ${cls}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
              <div class="toast-body">${escapeHtml(msg)}</div>
              <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
          </div></div>`);
        $('body').append($t); const t = new bootstrap.Toast($t.find('.toast')[0], { delay: 2200 }); t.show(); $t.on('hidden.bs.toast', () => $t.remove());
    }
    function headerGrad(doc, x, y, w, h, c1, c2) {
        const steps = Math.max(1, Math.floor(w));
        for (let i = 0; i < steps; i++) {
            const a = i / steps; const r = Math.floor(c1[0] * (1 - a) + c2[0] * a), g = Math.floor(c1[1] * (1 - a) + c2[1] * a), b = Math.floor(c1[2] * (1 - a) + c2[2] * a);
            doc.setFillColor(r, g, b); doc.rect(x + i, y, 1, h, 'F');
        }
    }

    // === Verificación de reglas antes de calcular ===
    async function tieneReglas(tnParam) {
        const tnSel = (tnParam !== undefined && tnParam !== null)
            ? String(tnParam)
            : (document.getElementById('slcTipoNegocio')?.value ?? '-1');

        const fetchReglas = (tipo, idTN) => $.getJSON('/Pagos/ListarReglas', { tipo, idTipoNegocio: (idTN ?? '') });

        const pedidos = [fetchReglas(1, ''), fetchReglas(2, '')];
        if (tnSel && tnSel !== '-1' && tnSel !== '') {
            pedidos.push(fetchReglas(1, tnSel));
            pedidos.push(fetchReglas(2, tnSel));
        }

        const res = await Promise.allSettled(pedidos);
        return res.some(r => r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0);
    }

    async function verificarReglasAntesDeCalcular() {
        try {
            const tnSel = document.getElementById('slcTipoNegocio')?.value ?? '-1';
            const hay = await tieneReglas(tnSel);
            if (!hay) {
                const ir = confirm('Para calcular un sueldo, primero debés crear reglas.\n¿Deseás crear una ahora?');
                if (ir) {
                    const $rg = $('#rgTipoNegocio');
                    if ($rg.length) {
                        const val = (tnSel && tnSel !== '-1') ? tnSel : $rg.find('option:first').val();
                        $rg.val(val).trigger('change');
                    }
                    await loadReglas();
                    modalReglas.show();
                }
                return false;
            }
            return true;
        } catch (e) {
            console.warn('No se pudieron verificar reglas:', e);
            return true;
        }
    }

    // firma file name
    $('#firmaFile').on('change', function () {
        $('#firmaName').text(this.files?.[0]?.name || 'Ningún archivo seleccionado');
    });

})(); // fin IIFE


// ==== Helpers compartidos fuera del IIFE ====

// Convierte /Date(ms)/, ISO o Date a un Date nativo
function parseSrvDate(x) {
    if (!x) return null;
    if (x instanceof Date) return x;
    if (typeof x === 'string') {
        const m = /\/Date\((\d+)\)\//.exec(x);
        if (m) return new Date(Number(m[1])); // epoch ms (UTC)
        return new Date(x);
    }
    if (typeof x === 'number') return new Date(x);
    return null;
}

// Devuelve yyyy-MM-dd sin desfase de huso (usa componentes UTC)
function toISOfromSrv(x) {
    const d = parseSrvDate(x);
    if (!d || isNaN(d.getTime())) return '';
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Para mostrar al usuario (dd/mm/aaaa) usando su zona horaria
function fmtDate(val) {
    if (!val) return '-';
    if (typeof val === 'string') {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
        if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    }
    const d = parseSrvDate(val);
    if (!d || isNaN(d.getTime())) return '-';
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

// Mantener este: para "hoy" en input date
function toISO(d) {
    if (typeof d === 'string') return d.slice(0, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Formatea fecha yyyy-mm-dd a dd/mm/yyyy sin crear Date
function formatearFechaParaVista(iso) {
    if (!iso) return '-';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : fmtDate(iso);
}
