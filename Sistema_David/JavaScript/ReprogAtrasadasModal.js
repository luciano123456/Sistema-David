/**
 * Modal pre-reprogramación (solo electrodomésticos):
 * pregunta qué cuotas reprogramar ANTES de guardar.
 */
(function (global) {
    "use strict";

    var CSS_ID = "reprog-atrasadas-css";
    var MODAL_ID = "modalReprogAtrasadas";
    var _ctx = null;
    var _resolvePromise = null;
    var _confirmed = false;

    function ensureStyles() {
        if (document.getElementById(CSS_ID)) return;
        var link = document.createElement("link");
        link.id = CSS_ID;
        link.rel = "stylesheet";
        link.href = "/Estilos/ReprogAtrasadasModal.css?v=1.1";
        document.head.appendChild(link);
    }

    function fmtFecha(isoOrDate) {
        if (!isoOrDate) return "—";
        if (typeof moment === "function") {
            return moment(isoOrDate).format("DD/MM/YYYY");
        }
        return String(isoOrDate);
    }

    function fmtMonto(n) {
        var num = Number(n) || 0;
        if (typeof formatearMiles === "function") return formatearMiles(num);
        return "$" + Math.ceil(num).toLocaleString("es-AR");
    }

    function toast(msg, tipo) {
        if (global.VC && typeof global.VC.toast === "function") {
            global.VC.toast(msg, tipo || "success");
            return;
        }
        if (typeof notificarExitoCobrosUi === "function" && (tipo === "success" || !tipo)) {
            notificarExitoCobrosUi(msg);
            return;
        }
        if (typeof exitoModal === "function" && (tipo === "success" || !tipo)) {
            exitoModal(msg);
            return;
        }
        if (typeof errorModal === "function" && tipo === "danger") {
            errorModal(msg);
        }
    }

    function getModalEl() {
        return document.getElementById(MODAL_ID);
    }

    function hideModal() {
        var el = getModalEl();
        if (el && global.bootstrap) {
            var inst = bootstrap.Modal.getInstance(el);
            if (inst) inst.hide();
        }
    }

    function finish(result) {
        if (_resolvePromise) {
            var r = _resolvePromise;
            _resolvePromise = null;
            r(result);
        }
    }

    function ensureModalDom() {
        ensureStyles();
        if (getModalEl()) return;

        document.body.insertAdjacentHTML("beforeend",
            '<div class="modal fade rp-reprog-modal" id="' + MODAL_ID + '" tabindex="-1" aria-hidden="true">' +
            '  <div class="modal-dialog modal-dialog-centered rp-reprog-dialog">' +
            '    <div class="modal-content rp-reprog-content">' +
            '      <div class="rp-reprog-handle" aria-hidden="true"></div>' +
            '      <div class="modal-header rp-reprog-header border-0">' +
            '        <div class="rp-reprog-head">' +
            '          <div class="rp-reprog-icon"><i class="fa fa-calendar-check-o" aria-hidden="true"></i></div>' +
            '          <div>' +
            '            <h5 class="modal-title mb-0">¿Qué cuotas reprogramar?</h5>' +
            '            <div class="rp-reprog-sub">Elegí las cuotas a las que querés aplicar la nueva fecha de cobro:</div>' +
            '            <div class="rp-reprog-cliente" id="rpReprogCliente"></div>' +
            '          </div>' +
            '        </div>' +
            '        <button type="button" class="rp-reprog-close" id="rpReprogClose" aria-label="Cerrar">' +
            '          <i class="fa fa-times"></i>' +
            '        </button>' +
            '      </div>' +
            '      <div class="modal-body rp-reprog-body">' +
            '        <div class="rp-reprog-fecha-card">' +
            '          <i class="fa fa-calendar" aria-hidden="true"></i>' +
            '          <div>' +
            '            <div class="rp-reprog-fecha-label">Nueva fecha de cobro</div>' +
            '            <div class="rp-reprog-fecha-val" id="rpReprogFechaVal">—</div>' +
            '          </div>' +
            '        </div>' +
            '        <div class="rp-reprog-toolbar">' +
            '          <span class="rp-reprog-count" id="rpReprogCount"></span>' +
            '          <button type="button" class="rp-reprog-sel-all" id="rpReprogSelAll">Seleccionar todas</button>' +
            '        </div>' +
            '        <div class="rp-reprog-list" id="rpReprogList"></div>' +
            '      </div>' +
            '      <div class="modal-footer rp-reprog-footer border-0">' +
            '        <div class="rp-reprog-btn-row">' +
            '          <button type="button" class="rp-reprog-btn rp-reprog-btn--ghost" id="rpReprogCancel">Cancelar</button>' +
            '          <button type="button" class="rp-reprog-btn rp-reprog-btn--primary" id="rpReprogConfirm" disabled>' +
            '            <i class="fa fa-check"></i> Reprogramar seleccionadas' +
            '          </button>' +
            '        </div>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '</div>');

        var el = getModalEl();
        if (!el) return;

        el.addEventListener("click", function (e) {
            var item = e.target.closest(".rp-reprog-item");
            if (!item || e.target.tagName === "INPUT") return;
            var cb = item.querySelector('input[type="checkbox"]');
            if (cb) {
                cb.checked = !cb.checked;
                cb.dispatchEvent(new Event("change", { bubbles: true }));
            }
        });

        document.getElementById("rpReprogSelAll").addEventListener("click", function () {
            var cbs = el.querySelectorAll('#rpReprogList input[type="checkbox"]');
            var allChecked = Array.prototype.every.call(cbs, function (c) { return c.checked; });
            cbs.forEach(function (c) {
                c.checked = !allChecked;
                syncItemVisual(c);
            });
            updateConfirmState();
        });

        document.getElementById("rpReprogConfirm").addEventListener("click", onConfirm);
        document.getElementById("rpReprogCancel").addEventListener("click", onCancel);
        document.getElementById("rpReprogClose").addEventListener("click", onCancel);

        el.addEventListener("hidden.bs.modal", function () {
            if (!_confirmed) {
                finish({ confirmed: false, applied: 0 });
            }
            _ctx = null;
            _confirmed = false;
        });
    }

    function onCancel() {
        hideModal();
    }

    function syncItemVisual(cb) {
        var item = cb && cb.closest(".rp-reprog-item");
        if (item) item.classList.toggle("is-checked", cb.checked);
    }

    function updateConfirmState() {
        var el = getModalEl();
        if (!el) return;
        var checked = el.querySelectorAll('#rpReprogList input[type="checkbox"]:checked').length;
        var btn = document.getElementById("rpReprogConfirm");
        if (btn) {
            btn.disabled = checked === 0;
            btn.innerHTML = checked > 0
                ? '<i class="fa fa-check"></i> Reprogramar ' + checked + (checked === 1 ? " cuota" : " cuotas")
                : '<i class="fa fa-check"></i> Reprogramar seleccionadas';
        }
    }

    function renderList(items, idCuotaActual) {
        var list = document.getElementById("rpReprogList");
        if (!list) return;
        list.innerHTML = "";

        items.forEach(function (it) {
            var id = it.Id;
            var esActual = it.EsCuotaActual || Number(id) === Number(idCuotaActual);
            var meta = it.FechaVencimiento
                ? "Venc. " + fmtFecha(it.FechaVencimiento)
                : (it.FechaCobroActual ? "Cobro " + fmtFecha(it.FechaCobroActual) : "");
            if (it.IdVenta) {
                meta = (meta ? meta + " · " : "") + "Venta #" + it.IdVenta;
            }

            var titulo = it.Etiqueta || ("Cuota " + (it.NumeroCuota || id));
            if (esActual) {
                titulo = "Cuota " + (it.NumeroCuota || "?") + '<span class="rp-reprog-badge-actual">Actual</span>';
            }

            var row = document.createElement("label");
            row.className = "rp-reprog-item" + (esActual ? " is-actual" : "");
            row.setAttribute("for", "rpReprogCb_" + id);
            row.innerHTML =
                '<input type="checkbox" id="rpReprogCb_' + id + '" value="' + id + '" ' + (esActual ? "checked" : "") + ' />' +
                '<div class="rp-reprog-item-main">' +
                '  <div class="rp-reprog-item-title">' + titulo + '</div>' +
                (meta ? '<div class="rp-reprog-item-meta">' + meta + '</div>' : '') +
                '</div>' +
                '<div class="rp-reprog-item-monto">' + fmtMonto(it.MontoRestante) + '</div>';

            var cb = row.querySelector("input");
            cb.addEventListener("change", function () {
                syncItemVisual(cb);
                updateConfirmState();
            });
            syncItemVisual(cb);
            list.appendChild(row);
        });

        updateConfirmState();
    }

    function showModal(items, ctx) {
        ensureModalDom();
        _ctx = ctx;
        _confirmed = false;

        document.getElementById("rpReprogCliente").textContent = ctx.clienteNombre || "";
        document.getElementById("rpReprogFechaVal").textContent = fmtFecha(ctx.nuevaFecha);
        document.getElementById("rpReprogCount").textContent =
            items.length + (items.length === 1 ? " cuota disponible" : " cuotas disponibles");

        renderList(items, ctx.idCuotaActual);

        var el = getModalEl();
        if (el && global.bootstrap) {
            bootstrap.Modal.getOrCreateInstance(el, { backdrop: "static", keyboard: false }).show();
        }
    }

    async function fetchCuotas(idCliente, idCuotaActual) {
        var url = "/Ventas_Electrodomesticos/CuotasAtrasadasReprogramacion"
            + "?idCliente=" + encodeURIComponent(idCliente)
            + "&idCuotaActual=" + encodeURIComponent(idCuotaActual);
        var resp = await fetch(url);
        var json = await resp.json();
        if (!json || json.success === false) return [];
        return Array.isArray(json.data) ? json.data : [];
    }

    async function aplicarReprogramacion(ids, fecha, observacion) {
        var ok = 0;
        var errores = [];
        for (var i = 0; i < ids.length; i++) {
            try {
                var body = new URLSearchParams({
                    idCuota: String(ids[i]),
                    nuevaFecha: fecha,
                    observacion: observacion || "Reprogramación de fecha de cobro"
                });
                var resp = await fetch("/Ventas_Electrodomesticos/ReprogramarCobroCuota", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                    body: body.toString()
                });
                var json = await resp.json();
                if (json && json.success) ok++;
                else errores.push(json && json.message ? json.message : "Error");
            } catch (e) {
                errores.push("Error de conexión");
            }
        }
        return { ok: ok, total: ids.length, errores: errores };
    }

    async function onConfirm() {
        if (!_ctx) return;
        var el = getModalEl();
        var ids = [];
        el.querySelectorAll('#rpReprogList input[type="checkbox"]:checked').forEach(function (c) {
            ids.push(parseInt(c.value, 10));
        });
        if (!ids.length) return;

        var btn = document.getElementById("rpReprogConfirm");
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Guardando…';
        }

        var res = await aplicarReprogramacion(ids, _ctx.nuevaFecha, _ctx.observacion);

        _confirmed = true;
        hideModal();

        if (typeof _ctx.onRefresh === "function") {
            try { await _ctx.onRefresh(); } catch (e) { /* ignore */ }
        }

        var fechaFmt = fmtFecha(_ctx.nuevaFecha);
        if (res.ok === res.total) {
            toast("Se reprogramaron " + res.ok + " cuota(s) a " + fechaFmt + ".", "success");
        } else if (res.ok > 0) {
            toast("Se reprogramaron " + res.ok + " de " + res.total + ". Algunas fallaron.", "danger");
        } else {
            toast("No se pudo reprogramar: " + (res.errores[0] || "error"), "danger");
        }

        finish({ confirmed: true, applied: res.ok, total: res.total });
    }

    async function reprogramarDirecta(opts) {
        var body = new URLSearchParams({
            idCuota: String(opts.idCuotaActual),
            nuevaFecha: opts.nuevaFecha,
            observacion: opts.observacion || "Cambio de fecha de cobro"
        });
        var resp = await fetch("/Ventas_Electrodomesticos/ReprogramarCobroCuota", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: body.toString()
        });
        var json = await resp.json();
        if (!json || json.success === false) {
            throw new Error(json && json.message ? json.message : "Error al cambiar la fecha.");
        }
        if (typeof opts.onRefresh === "function") {
            await opts.onRefresh();
        }
        return { confirmed: true, applied: 1, total: 1 };
    }

    global.ReprogAtrasadas = {
        /**
         * Muestra el modal ANTES de guardar. Resuelve { confirmed, applied }.
         * Si cancela: confirmed=false, applied=0 (no se guarda nada).
         */
        confirmarReprogramacion: function (opts) {
            opts = opts || {};
            return new Promise(async function (resolve) {
                _resolvePromise = resolve;

                if (!opts.idCliente || !opts.idCuotaActual || !opts.nuevaFecha) {
                    finish({ confirmed: false, applied: 0 });
                    return;
                }

                try {
                    var items = await fetchCuotas(opts.idCliente, opts.idCuotaActual);

                    if (!items.length) {
                        try {
                            var direct = await reprogramarDirecta(opts);
                            toast("Fecha de cobro actualizada a " + fmtFecha(opts.nuevaFecha) + ".", "success");
                            finish(direct);
                        } catch (e) {
                            finish({ confirmed: false, applied: 0, error: e.message });
                        }
                        return;
                    }

                    showModal(items, {
                        idCuotaActual: opts.idCuotaActual,
                        nuevaFecha: opts.nuevaFecha,
                        observacion: opts.observacion,
                        clienteNombre: opts.clienteNombre,
                        onRefresh: opts.onRefresh
                    });
                } catch (e) {
                    finish({ confirmed: false, applied: 0, error: e.message });
                }
            });
        },

        /** @deprecated usar confirmarReprogramacion */
        ofrecerElectro: function (opts) {
            opts = opts || {};
            opts.idCuotaActual = opts.idCuotaActual || opts.idCuotaExcluir;
            return global.ReprogAtrasadas.confirmarReprogramacion(opts);
        }
    };
})(typeof window !== "undefined" ? window : this);
