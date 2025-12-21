/* ===========================================================
   _CobroModal_Partial.js — FINAL (alineado a TU HTML + TU backend)
   =========================================================== */

const qs = (id) => document.getElementById(id);
const money = (v) => Number(v || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const todayISO = () => new Date().toISOString().slice(0, 10);
const getModal = (id) => bootstrap.Modal.getOrCreateInstance(qs(id));

function setCbError(msg) {
    const box = qs("cb_error");
    if (!box) return;
    if (!msg) {
        box.classList.add("d-none");
        box.innerText = "";
    } else {
        box.classList.remove("d-none");
        box.innerText = msg;
    }
}

function setAjError(msg) {
    const box = qs("aj_errorBox");
    if (!box) return;
    if (!msg) {
        box.classList.add("d-none");
        box.innerText = "";
    } else {
        box.classList.remove("d-none");
        box.innerText = msg;
    }
}

/* ===================== STATE ===================== */
let ventaActual = null;
let cuotaActual = null;
let cuentasCache = [];
let tipoRecargo = "Fijo"; // "Fijo" | "Porcentaje"

/* ===================== UTILS ===================== */
function esTransferencia(m) {
    return m === "TRANSFERENCIA PROPIA" || m === "TRANSFERENCIA A TERCEROS";
}

function safeToggle(el, show) {
    if (!el) return;
    el.hidden = !show;
}

function safeToggleClass(el, className, enabled) {
    if (!el) return;
    el.classList.toggle(className, !!enabled);
}

/* ===================== PROGRESS ===================== */
function clearProgress() {
    const cont = qs("progressBarContainerCobro");
    if (cont) cont.hidden = true;

    if (qs("progressBarCobro")) qs("progressBarCobro").style.width = "0%";
    if (qs("progressPercentageCobro")) qs("progressPercentageCobro").innerText = "";

    if (qs("total-labelCobro")) qs("total-labelCobro").innerText = "Total: $0";
    if (qs("cobrosPendientesCobro")) qs("cobrosPendientesCobro").innerText = "Pendientes: $0";
    if (qs("entregas-labelCobro")) qs("entregas-labelCobro").innerText = "Entregas: $0";
    if (qs("restante-labelCobro")) qs("restante-labelCobro").innerText = "Restante: $0";
}

function renderProgress(accountData) {
    const cont = qs("progressBarContainerCobro");
    const bar = qs("progressBarCobro");
    const pct = qs("progressPercentageCobro");

    if (!cont || !bar) return;

    const total = Number(accountData?.MontoPagar || 0);
    const entregas = Number(accountData?.Entrega || 0);
    const restante = Math.max(total - entregas, 0);

    if (total <= 0) {
        clearProgress();
        return;
    }

    cont.hidden = false;

    const porcentaje = Math.min((entregas / total) * 100, 100);
    bar.style.width = `${porcentaje}%`;

    if (qs("total-labelCobro")) qs("total-labelCobro").innerText = `Total: ${money(total)}`;
    if (qs("entregas-labelCobro")) qs("entregas-labelCobro").innerText = `Entregas: ${money(entregas)}`;
    if (qs("restante-labelCobro")) qs("restante-labelCobro").innerText = `Restante: ${money(restante)}`;
    if (qs("cobrosPendientesCobro")) qs("cobrosPendientesCobro").innerText = `Pendientes: ${money(restante)}`;

    if (pct) pct.innerText = porcentaje >= 100 ? "✔ Completado" : `${Math.round(porcentaje)}%`;
}

/* ===================== COMPROBANTE (ACORDEÓN) ===================== */
function setComprobanteOpen(open) {
    const body = qs("cb_comprobanteBody");
    const icon = qs("cb_iconToggleComp");
    const txt = qs("cb_txtToggleComp");
    if (!body || !icon || !txt) return;

    if (open) {
        body.classList.remove("d-none");
        icon.className = "fa fa-eye-slash me-1";
        txt.innerText = "Ocultar";
    } else {
        body.classList.add("d-none");
        icon.className = "fa fa-eye me-1";
        txt.innerText = "Ver";
    }
}

function clearComprobante() {
    if (qs("cb_comprobante")) qs("cb_comprobante").value = "";
    if (qs("cb_imagenBase64")) qs("cb_imagenBase64").value = "";
    const img = qs("cb_comprobantePreview");
    if (img) {
        img.src = "";
        img.classList.add("d-none");
    }
}

/* ===================== CASITAS ===================== */
function resetCasas() {
    qs("cb_clienteAusente").value = "0";
    qs("cb_actualizoUbicacion").value = "0";

    qs("cb_casaRoja").classList.add("d-none");
    qs("cb_casaVerde").classList.add("d-none");
    qs("cb_casaNeutral").classList.remove("d-none");

    qs("cb_casaNeutral").className = "fa fa-home text-secondary";
}

function abrirOpcionesCasas() {
    qs("cb_casaRoja").classList.remove("d-none");
    qs("cb_casaVerde").classList.remove("d-none");
}

function seleccionarCasaRoja() {
    qs("cb_clienteAusente").value = "1";
    qs("cb_actualizoUbicacion").value = "0";

    qs("cb_casaNeutral").className = "fa fa-home text-danger";
    qs("cb_casaRoja").classList.add("d-none");
    qs("cb_casaVerde").classList.add("d-none");
}

function seleccionarCasaVerde() {
    qs("cb_clienteAusente").value = "0";
    qs("cb_actualizoUbicacion").value = "1";

    qs("cb_casaNeutral").className = "fa fa-home text-success";
    qs("cb_casaRoja").classList.add("d-none");
    qs("cb_casaVerde").classList.add("d-none");
}

/* ===================== RESET MODAL COBRO ===================== */
function resetCobroModal() {
    ventaActual = null;
    cuotaActual = null;
    cuentasCache = [];
    tipoRecargo = "Fijo";

    setCbError(null);

    qs("cb_idVenta").value = "";
    qs("cb_idCuota").value = "";
    qs("cb_montoRestante").value = "0";

    qs("cb_importe").value = "";
    qs("cb_obs").value = "";

    qs("cb_metodo").value = "";
    qs("cb_fecha").value = todayISO(); // aunque esté disabled, se puede setear igual

    qs("cb_valorCuotaBox").innerText = "Valor de la cuota: $0";

    qs("cb_wrapCuenta").hidden = true;
    qs("cb_wrapComprobante").hidden = true;
    qs("progressBarContainerCobro").hidden = true;

    qs("cb_cuenta").innerHTML = "";

    // 🔒 FIX: estado inicial limpio (sin método)
    qs("cb_wrapCuenta").hidden = true;
    qs("cb_wrapComprobante").hidden = true;
    qs("progressBarContainerCobro").hidden = true;
    clearProgress();
    clearComprobante();

    setComprobanteOpen(false);

    resetCasas();

    // título base
    const t = qs("mdCobro")?.querySelector(".modal-title");
    if (t) {
        t.innerHTML = `<i class="fa fa-money text-warning me-2"></i> Registrar cobro`;
    }
}

/* ===================== ABRIR MODAL COBRO (GLOBAL) ===================== */
window.abrirModalCobro = async function (idVenta, idCuota) {
    resetCobroModal();

    qs("cb_metodo").value = "";
    qs("cb_wrapCuenta").hidden = true;
    qs("cb_wrapComprobante").hidden = true;
    clearProgress();


    try {
        const resp = await fetch(`/Ventas_Electrodomesticos/GetDetalleVenta?idVenta=${encodeURIComponent(idVenta)}`);
        const json = await resp.json();

        if (!json || json.success === false || !json.data) {
            setCbError(json?.message || "Venta no encontrada");
            getModal("mdCobro").show();
            return;
        }

        ventaActual = json.data;

        // ⛔ VALIDACIÓN DE CUOTAS ANTERIORES (MISMA QUE COBROS)
        if (!puedeCobrarCuota(ventaActual, idCuota)) {
            showToast("No se puede cobrar esta cuota hasta completar las cuotas anteriores.", "danger");
            return;
        }

        const cuotas = Array.isArray(ventaActual.Cuotas) ? ventaActual.Cuotas : [];
        cuotaActual = cuotas.find(c => Number(c.Id) === Number(idCuota));

        if (!cuotaActual) {
            setCbError("Cuota no encontrada");
            getModal("mdCobro").show();
            return;
        }

        // IDs
        qs("cb_idVenta").value = ventaActual.IdVenta;
        qs("cb_idCuota").value = cuotaActual.Id;

        // Fecha (SIEMPRE)
        qs("cb_fecha").value = todayISO();

        // Valor cuota (monto restante real)
        const restante =
            Number(cuotaActual.MontoOriginal || 0) +
            Number(cuotaActual.MontoRecargos || 0) -
            Number(cuotaActual.MontoDescuentos || 0) -
            Number(cuotaActual.MontoPagado || 0);

        qs("cb_montoRestante").value = restante;
        qs("cb_importe").value = restante;

        qs("cb_valorCuotaBox").innerText = `Valor de la cuota: ${money(restante)}`;

        // Título modal
        const nro = cuotaActual.NumeroCuota ?? "";
        const venc = cuotaActual.FechaVencimiento ? moment(cuotaActual.FechaVencimiento).format("DD/MM/YYYY") : "";
        const cliente = ventaActual.ClienteNombre ?? "";

        const t = qs("mdCobro")?.querySelector(".modal-title");
        if (t) {
            t.innerHTML = `
                <div class="fw-bold text-white">
                    <i class="fa fa-money text-warning me-2"></i> Registrar cobro
                    ${nro ? `<span class="badge bg-info ms-2">Cuota ${nro}</span>` : ""}
                    ${venc ? `<span class="badge bg-secondary ms-2">Vence: ${venc}</span>` : ""}
                </div>
                ${cliente ? `<div class="small text-white-50 mt-1">${cliente}</div>` : ""}
            `;
        }

        toggleModoReprogramacion();
        aplicarModoCobroUI();


        getModal("mdCobro").show();
    } catch (e) {
        setCbError("Error de conexión al cargar la venta");
        getModal("mdCobro").show();
    }
};

/* ===================== CUENTAS (TU ENDPOINT) ===================== */
async function cargarCuentasTotales() {
    const metodo = qs("cb_metodo").value;
    if (!esTransferencia(metodo)) return;

    try {
        const resp = await fetch("/Cobranzas/ListaCuentasBancariasTotales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ metodopago: metodo })
        });

        const result = await resp.json();
        const select = qs("cb_cuenta");
        select.innerHTML = "";
        cuentasCache = [];

        if (!Array.isArray(result) || !result.length) {
            qs("cb_wrapCuenta").hidden = true;
            clearProgress();
            return;
        }

        cuentasCache = result.map(c => ({
            Id: Number(c.Id),
            Nombre: c.Nombre,
            MontoPagar: Number(c.MontoPagar || 0),
            Entrega: Number(c.Entrega || 0)
        }));

        for (const c of cuentasCache) {
            const opt = document.createElement("option");
            opt.value = c.Id;
            opt.textContent = c.Nombre;
            select.appendChild(opt);
        }

        select.selectedIndex = 0;
        renderProgress(cuentasCache[0]);
    } catch {
        qs("cb_wrapCuenta").hidden = true;
        clearProgress();
    }
}

/* ===================== RECARGO (NUEVO BACKEND) ===================== */
async function recargarVentaYCuota() {
    if (!ventaActual?.IdVenta || !cuotaActual?.Id) return;

    try {
        const resp = await fetch(`/Ventas_Electrodomesticos/GetDetalleVenta?idVenta=${encodeURIComponent(ventaActual.IdVenta)}`);
        const json = await resp.json();

        if (!json || json.success === false || !json.data) return;

        ventaActual = json.data;

        const cuotas = Array.isArray(ventaActual.Cuotas) ? ventaActual.Cuotas : [];
        cuotaActual = cuotas.find(c => Number(c.Id) === Number(qs("cb_idCuota").value));
        if (!cuotaActual) return;

        const restante =
            Number(cuotaActual.MontoOriginal || 0) +
            Number(cuotaActual.MontoRecargos || 0) -
            Number(cuotaActual.MontoDescuentos || 0) -
            Number(cuotaActual.MontoPagado || 0);

        qs("cb_montoRestante").value = restante;
        qs("cb_importe").value = restante;
        qs("cb_valorCuotaBox").innerText = `Valor de la cuota: ${money(restante)}`;

    } catch (e) {
        console.error("Error recargando venta/cuota", e);
    }
}

async function aplicarRecargo() {
    setAjError(null);

    if (!cuotaActual?.Id) {
        setAjError("No hay cuota seleccionada.");
        return;
    }

    const valorTxt = (qs("aj_valor").value || "").trim();
    const valor = Number(valorTxt.replace(",", "."));

    if (!valor || valor <= 0) {
        setAjError("Ingresá un valor válido.");
        return;
    }

    // ✅ NUEVO: Observación
    const observacion = (qs("aj_obs")?.value || "").trim();
    const obsFinal = observacion.length ? observacion : null;

    try {
        const payload = {
            IdCuota: cuotaActual.Id,
            Tipo: tipoRecargo, // "Fijo" | "Porcentaje"
            Valor: valor,
            Observacion: obsFinal, // ✅ acá va
            Fecha: null
        };

        const resp = await fetch("/Ventas_Electrodomesticos/AgregarRecargoCuota", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const json = await resp.json();
        if (!json || json.success === false) {
            setAjError(json?.message || "Error al aplicar recargo.");
            return;
        }

        getModal("mdAjuste").hide();
        await recargarVentaYCuota();

    } catch (e) {
        setAjError("Error de conexión al aplicar recargo.");
    }
}

function abrirHistorialCuota() {

    if (!ventaActual || !cuotaActual) {
        setCbError("No hay cuota seleccionada.");
        return;
    }

    const tbody = qs("histCuotaBody");
    tbody.innerHTML = "";

    // =============================
    // 1) PAGOS (TU CÓDIGO TAL CUAL)
    // =============================
    const movimientos = Array.isArray(ventaActual.Historial)
        ? ventaActual.Historial
            .filter(h =>
                h.Campo === "PagoCuota" &&
                Number(h.IdCuota) === Number(cuotaActual.Id)
            )
            .sort((a, b) => new Date(a.FechaCambio) - new Date(b.FechaCambio))
        : [];

    // =============================
    // 2) RECARGOS (NUEVO)
    // =============================
    const recargos = Array.isArray(cuotaActual.Recargos)
        ? cuotaActual.Recargos
            .map(r => ({
                _tipo: "RECARGO",
                FechaCambio: r.Fecha, // para ordenar igual que pagos
                TipoRecargo: r.Tipo,
                Importe: Number(r.ImporteCalculado || 0),
                Observacion: r.Observacion || ""
            }))
            .sort((a, b) => new Date(a.FechaCambio) - new Date(b.FechaCambio))
        : [];

    // =============================
    // 3) SI NO HAY NADA (PAGOS NI RECARGOS)
    //    (mantiene tu mensaje, pero ampliado)
    // =============================
    if (!movimientos.length && !recargos.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    Sin movimientos registrados para esta cuota
                </td>
            </tr>`;
        getModal("mdHistorialCuota").show();
        return;
    }

    // =============================
    // 4) TIMELINE (PAGOS + RECARGOS)
    // =============================
    const timeline = [];

    // pagos -> los metemos con su estructura original
    movimientos.forEach(h => {
        timeline.push({ _tipo: "PAGO", h });
    });

    // recargos -> ya vienen normalizados
    recargos.forEach(r => {
        timeline.push(r);
    });

    // ordenar todo por fecha (pago usa FechaCambio, recargo ya trae FechaCambio)
    timeline.sort((a, b) => {
        const fa = a._tipo === "PAGO" ? new Date(a.h.FechaCambio) : new Date(a.FechaCambio);
        const fb = b._tipo === "PAGO" ? new Date(b.h.FechaCambio) : new Date(b.FechaCambio);
        return fa - fb;
    });

    // Partimos del monto ORIGINAL de la cuota (TU LÓGICA)
    let restante = Number(cuotaActual.MontoOriginal || 0);

    // =============================
    // 5) RENDER (TU TABLA, MISMO FORMATO)
    // =============================
    timeline.forEach((item, i) => {

        // ---------- PAGO (TU LÓGICA ORIGINAL) ----------
        if (item._tipo === "PAGO") {
            const h = item.h;

            const fecha = moment(h.FechaCambio).format("DD/MM/YYYY HH:mm");

            const antes = h.ValorAnterior
                ? Number(h.ValorAnterior.replace("Antes=", ""))
                : 0;

            const ahora = h.ValorNuevo
                ? Number(h.ValorNuevo.replace("Ahora=", ""))
                : 0;

            const importePagado = ahora - antes;

            // Restamos en orden cronológico
            restante -= importePagado;
            if (restante < 0) restante = 0;

            // Observación limpia (solo lo útil)
            let obs = "";
            if (h.Observacion) {
                obs = h.Observacion.split("|")[0].trim();
            }

            tbody.insertAdjacentHTML("beforeend", `
                <tr>
                    <td>${i + 1}</td>
                    <td>${fecha}</td>
                    <td>
                        <span class="badge bg-success">
                            Pago de cuota
                        </span>
                    </td>
                    <td class="text-end">${money(importePagado)}</td>
                    <td class="text-end">${money(restante)}</td>
                    <td>${obs}</td>
                </tr>
            `);

            return;
        }

        // ---------- RECARGO (NUEVO) ----------
        const fechaR = moment(item.FechaCambio).format("DD/MM/YYYY HH:mm");
        const importeRec = Number(item.Importe || 0);

        // Recargo suma al restante
        restante += importeRec;

        let obsR = (item.Observacion || "").trim();

        const badgeTxt = item.TipoRecargo === "Porcentaje"
            ? "Recargo (%)"
            : "Recargo ($)";

        tbody.insertAdjacentHTML("beforeend", `
            <tr>
                <td>${i + 1}</td>
                <td>${fechaR}</td>
                <td>
                    <span class="badge bg-warning text-dark">
                        ${badgeTxt}
                    </span>
                </td>
                <td class="text-end">${money(importeRec)}</td>
                <td class="text-end">${money(restante)}</td>
                <td>${obsR}</td>
            </tr>
        `);
    });

    getModal("mdHistorialCuota").show();
}


/* ===================== CONFIRMAR COBRO ===================== */
async function confirmarCobro() {
    setCbError(null);

    if (!ventaActual?.IdVenta || !cuotaActual?.Id) {
        setCbError("Falta venta o cuota.");
        return;
    }

    const importe = Number(qs("cb_importe").value || 0);
    const fecha = qs("cb_fecha").value;
    const obs = qs("cb_obs").value || "";

    // =============================
    // 🔁 CAMBIO DE FECHA (IMPORTE = 0)
    // =============================
    if (importe === 0) {

        if (!fecha) {
            setCbError("Seleccioná una fecha válida.");
            return;
        }

        const payload = {
            IdCuota: cuotaActual.Id,
            NuevaFecha: fecha,
            Observacion: obs
        };

        try {
            const resp = await fetch("/Ventas_Electrodomesticos/ReprogramarCobroCuota", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const json = await resp.json();
            if (!json || json.success === false) {
                setCbError(json?.message || "Error al cambiar la fecha.");
                return;
            }

            location.reload();
            return;
        } catch {
            setCbError("Error de conexión al cambiar la fecha.");
            return;
        }
    }

    // =============================
    // 💰 COBRO NORMAL
    // =============================
    if (importe <= 0) {
        setCbError("Importe inválido.");
        return;
    }

    const medio = qs("cb_metodo").value;
    if (!medio) {
        setCbError("Seleccioná un método de pago.");
        return;
    }

    const payload = {
        IdVenta: ventaActual.IdVenta,
        FechaPago: fecha,
        MedioPago: medio,
        ImporteTotal: importe,
        Observacion: obs,
        ClienteAusente: qs("cb_clienteAusente").value === "1",
        ActualizoUbicacion: qs("cb_actualizoUbicacion").value === "1",
        IdCuentaBancaria: esTransferencia(medio)
            ? Number(qs("cb_cuenta").value || 0) || null
            : null,
        Imagen: esTransferencia(medio)
            ? (qs("cb_imagenBase64").value || null)
            : null,
        Aplicaciones: [
            { IdCuota: cuotaActual.Id, ImporteAplicado: importe }
        ]
    };

    try {
        const resp = await fetch("/Ventas_Electrodomesticos/RegistrarPago", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const json = await resp.json();
        if (!json || json.success === false) {
            setCbError(json?.message || "Error al registrar el pago.");
            return;
        }

        location.reload();
    } catch {
        setCbError("Error de conexión al registrar el pago.");
    }
}

/* ===================== EVENTS (SEGUROS) ===================== */
document.addEventListener("DOMContentLoaded", () => {

    qs("cb_importe")?.addEventListener("input", () => {
        aplicarModoCobroUI();
    });


    // Fecha default (por si abrís modal sin abrirModalCobro en alguna pantalla)
    if (qs("cb_fecha")) qs("cb_fecha").value = todayISO();

    // Método pago
    qs("cb_metodo")?.addEventListener("change", async () => {
        const metodo = qs("cb_metodo").value;
        const transf = esTransferencia(metodo);

        qs("cb_wrapCuenta").hidden = !transf;
        qs("cb_wrapComprobante").hidden = !transf;

        if (!transf) {
            clearProgress();
            clearComprobante();
            setComprobanteOpen(false);
            return;
        }

        await cargarCuentasTotales();
    });


    // Cambio cuenta
    qs("cb_cuenta")?.addEventListener("change", () => {
        const id = Number(qs("cb_cuenta").value || 0);
        const acc = cuentasCache.find(c => c.Id === id);
        if (acc) renderProgress(acc);
    });

    // Acordeón comprobante
    qs("cb_btnToggleComprobante")?.addEventListener("click", () => {
        const open = qs("cb_comprobanteBody")?.classList.contains("d-none");
        setComprobanteOpen(open);
    });

    // Subir comprobante
    qs("cb_comprobante")?.addEventListener("change", (e) => {
        const f = e.target.files?.[0];
        if (!f) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const b64 = ev.target.result;
            qs("cb_imagenBase64").value = b64 || "";
            const img = qs("cb_comprobantePreview");
            img.src = b64;
            img.classList.remove("d-none");
            setComprobanteOpen(true);
        };
        reader.readAsDataURL(f);
    });

    // Quitar comprobante
    qs("cb_btnLimpiarComp")?.addEventListener("click", () => {
        clearComprobante();
    });

    // Casitas: gris abre opciones / si ya está pintada, reset
    qs("cb_casaNeutral")?.addEventListener("click", () => {
        const cls = qs("cb_casaNeutral").className || "";
        const isPainted = cls.includes("text-success") || cls.includes("text-danger");

        if (isPainted) {
            resetCasas();
            return;
        }
        abrirOpcionesCasas();
    });

    qs("cb_casaRoja")?.addEventListener("click", seleccionarCasaRoja);
    qs("cb_casaVerde")?.addEventListener("click", seleccionarCasaVerde);

    // Recargo
    qs("cb_btnRecargo")?.addEventListener("click", () => {
        setAjError(null);

        if (!cuotaActual?.Id) {
            setCbError("No hay cuota seleccionada.");
            return;
        }

        qs("aj_idCuota").value = cuotaActual.Id;
        qs("aj_valor").value = "";

        tipoRecargo = "Fijo";
        qs("aj_obs").value = ""; 
        setTipoRecargo(tipoRecargo);

        getModal("mdAjuste").show();
    });

    qs("aj_tipo_fijo")?.addEventListener("click", () => tipoRecargo = "Fijo");
    qs("aj_tipo_porc")?.addEventListener("click", () => tipoRecargo = "Porcentaje");

    qs("aj_btnAplicar")?.addEventListener("click", aplicarRecargo);

    // Historial
    qs("cb_btnHistorial")?.addEventListener("click", abrirHistorialCuota);

    // Confirmar cobro
    qs("cb_confirmarBtn")?.addEventListener("click", confirmarCobro);

    // Cuando se cierre modal cobro -> limpiar errores
    qs("mdCobro")?.addEventListener("hidden.bs.modal", () => {
        setCbError(null);
    });

});


function puedeCobrarCuota(venta, idCuota) {
    if (!venta || !Array.isArray(venta.Cuotas)) return false;

    const cuota = venta.Cuotas.find(c => Number(c.Id) === Number(idCuota));
    if (!cuota) return false;

    return !venta.Cuotas.some(c =>
        Number(c.NumeroCuota) < Number(cuota.NumeroCuota) &&
        c.Estado !== "Pagada" &&
        Number(c.MontoRestante || 0) > 0.0001
    );
}


function showToast(msg, type = "info") {
    let cont = document.getElementById("toastContainerBR");
    if (!cont) {
        cont = document.createElement("div");
        cont.id = "toastContainerBR";
        cont.className = "position-fixed bottom-0 end-0 p-3";
        cont.style.zIndex = "2000";
        document.body.appendChild(cont);
    }

    const typeClass = {
        success: "bg-success text-white",
        danger: "bg-danger text-white",
        warn: "bg-warning text-dark",
        info: "bg-info text-dark"
    }[type] || "bg-info text-dark";

    const el = document.createElement("div");
    el.className = `toast align-items-center ${typeClass} border-0 mb-2`;
    el.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${msg}</div>
            <button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    cont.appendChild(el);

    if (window.bootstrap && bootstrap.Toast) {
        new bootstrap.Toast(el, { delay: 2500 }).show();
    } else if (window.$ && $(el).toast) {
        $(el).toast({ delay: 2500 }).toast("show");
    }

    el.addEventListener("hidden.bs.toast", () => el.remove());
}



function setTipoRecargo(tipo) {
    tipoRecargo = tipo;

    const btnPorc = qs("aj_tipo_porc");
    const btnFijo = qs("aj_tipo_fijo");

    if (!btnPorc || !btnFijo) return;

    btnPorc.classList.toggle("active", tipo === "Porcentaje");
    btnFijo.classList.toggle("active", tipo === "Fijo");
}

qs("aj_tipo_fijo")?.addEventListener("click", () => setTipoRecargo("Fijo"));
qs("aj_tipo_porc")?.addEventListener("click", () => setTipoRecargo("Porcentaje"));


window.abrirHistorialDesdeCobros = async function (idVenta, idCuota) {
    try {
        const resp = await fetch(
            `/Ventas_Electrodomesticos/GetDetalleVenta?idVenta=${encodeURIComponent(idVenta)}`
        );
        const json = await resp.json();

        if (!json || json.success === false || !json.data) {
            showToast("No se pudo cargar el historial", "danger");
            return;
        }

        ventaActual = json.data;

        const cuotas = Array.isArray(ventaActual.Cuotas) ? ventaActual.Cuotas : [];
        cuotaActual = cuotas.find(c => Number(c.Id) === Number(idCuota));

        if (!cuotaActual) {
            showToast("Cuota no encontrada", "danger");
            return;
        }

        // 🔥 abre SOLO el historial
        abrirHistorialCuota();

    } catch (e) {
        console.error(e);
        showToast("Error cargando historial", "danger");
    }
};


window.abrirAjusteDesdeCobros = async function (idVenta, idCuota) {
    try {
        const resp = await fetch(
            `/Ventas_Electrodomesticos/GetDetalleVenta?idVenta=${encodeURIComponent(idVenta)}`
        );
        const json = await resp.json();

        if (!json || json.success === false || !json.data) {
            showToast("No se pudo cargar la venta", "danger");
            return;
        }

        // Reutilizamos el estado del partial
        ventaActual = json.data;

        const cuotas = Array.isArray(ventaActual.Cuotas) ? ventaActual.Cuotas : [];
        cuotaActual = cuotas.find(c => Number(c.Id) === Number(idCuota));

        if (!cuotaActual) {
            showToast("Cuota no encontrada", "danger");
            return;
        }

        // ===== RESET UI AJUSTE =====
        setAjError(null);

        qs("aj_idCuota").value = cuotaActual.Id;
        qs("aj_valor").value = "";
        qs("aj_obs").value = "";

        // Fijo por defecto
        setTipoRecargo("Fijo");

        // Abrimos SOLO el modal de ajuste
        getModal("mdAjuste").show();

    } catch (e) {
        console.error(e);
        showToast("Error cargando ajuste", "danger");
    }
};






window.exportarVentaPDF = async function (idVenta) {

    try {
        showToast("Generando PDF...", "info");

        const resp = await fetch(
            `/Ventas_Electrodomesticos/GetDetalleVenta?idVenta=${encodeURIComponent(idVenta)}`
        );

        const json = await resp.json();

        if (!json || json.success === false || !json.data) {
            showToast("No se pudo obtener la venta", "danger");
            return;
        }

        const venta = json.data;

        generarPdfVenta(venta);

    } catch (e) {
        console.error(e);
        showToast("Error generando el PDF", "danger");
    }
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
    y += 8;

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
        .filter(x =>
            x.estadoRaw !== "Pagada" &&
            x.restanteCuota > 0.0001 &&
            x.vencM.isAfter(hoy, "day")   // 👈 SOLO FUTURAS
        )
        .sort((a, b) => a.vencM.valueOf() - b.vencM.valueOf());

    let proximaNumero = noPagadas.length
        ? noPagadas[0].numero   // la futura más cercana
        : null;

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

function toggleModoReprogramacion() {

    const importe = Number(qs("cb_importe").value || 0);
    const esReprogramacion = importe <= 0;

    // Fecha
    qs("cb_fecha").disabled = !esReprogramacion;

    // Ocultar grupos de pago
    safeToggle(qs("cb_metodo")?.closest(".col-6, .col-lg-3"), !esReprogramacion);
    safeToggle(qs("cb_wrapCuenta"), !esReprogramacion);
    safeToggle(qs("cb_wrapObs"), !esReprogramacion);
    safeToggle(qs("cb_wrapComprobante"), !esReprogramacion);
    safeToggle(qs("progressBarContainerCobro"), !esReprogramacion);

    // Casitas
    safeToggle(qs("cb_casaNeutral")?.parentElement?.parentElement, !esReprogramacion);

    // Botones secundarios
    safeToggle(qs("cb_btnRecargo"), !esReprogramacion);
    safeToggle(qs("cb_btnHistorial"), !esReprogramacion);

    // Botón principal
    const btn = qs("cb_confirmarBtn");
    if (!btn) return;

    if (esReprogramacion) {
        btn.classList.remove("btn-success");
        btn.classList.add("btn-warning");
        btn.innerHTML = `<i class="fa fa-calendar"></i> Reprogramar cobro`;
    } else {
        btn.classList.add("btn-success");
        btn.classList.remove("btn-warning");
        btn.innerHTML = `<i class="fa fa-check"></i> Confirmar cobro`;
    }
}


qs("cb_importe")?.addEventListener("input", toggleModoReprogramacion);

function esCambioFecha() {
    const importe = Number(qs("cb_importe").value || 0);
    return importe === 0;
}

function aplicarModoCobroUI() {
    const cambioFecha = esCambioFecha();

    // Fecha SIEMPRE editable en cambio de fecha
    qs("cb_fecha").disabled = false;

    // Observación siempre visible
    qs("cb_wrapObs").hidden = false;

    // 🔴 Ocultar TODO lo de cobro si es cambio de fecha
    qs("cb_metodo").closest(".col-6")?.classList.toggle("d-none", cambioFecha);
    qs("cb_wrapCuenta").hidden = true;
    qs("cb_wrapComprobante").hidden = true;
    qs("progressBarContainerCobro").hidden = true;

    if (cambioFecha) {
        qs("cb_metodo").value = "";
        clearComprobante();
        clearProgress();
        setComprobanteOpen(false);
    }
}
