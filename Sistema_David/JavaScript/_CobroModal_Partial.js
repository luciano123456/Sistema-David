/* ===========================================================
   _CobroModal_Partial.js — FINAL (alineado a TU HTML + TU backend)
   =========================================================== */

const qs = (id) => document.getElementById(id);
const money = (v) =>
    Math.round(Number(v || 0))
        .toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
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
    const bar = qs("progressBarCobro");
    const pct = qs("progressPercentageCobro");

    if (bar) {
        bar.style.width = "0%";
        bar.className = "progress-bar";
    }

    pct && (pct.innerText = "");

    qs("total-labelCobro") && (qs("total-labelCobro").innerText = "Total: $0");
    qs("entregas-labelCobro") && (qs("entregas-labelCobro").innerText = "Entregas: $0");
    qs("restante-labelCobro") && (qs("restante-labelCobro").innerText = "Restante: $0");
    qs("cobrosPendientesCobro") && (qs("cobrosPendientesCobro").innerText = "Pendientes: $0");

    cont && (cont.hidden = true);
}

function renderProgress(accountData) {

    const cont = qs("progressBarContainerCobro");
    const bar = qs("progressBarCobro");
    const pct = qs("progressPercentageCobro");

    if (!cont || !bar) return;

    /* ===============================
       1️⃣ SIN CUENTA → OCULTAR TODO
    =============================== */
    if (!accountData) {
        clearProgress();
        cont.hidden = true;
        return;
    }

    const total = Number(accountData.MontoPagar || 0);
    const entregas = Number(accountData.Entrega || 0);
    const restante = Math.max(total - entregas, 0);

    /* ===============================
       2️⃣ SIN TOTAL → OCULTAR
    =============================== */
    if (total <= 0) {
        clearProgress();
        cont.hidden = true;
        return;
    }

    cont.hidden = false;

    /* ===============================
       3️⃣ LABELS (igual sistema viejo)
    =============================== */
    qs("total-labelCobro") && (qs("total-labelCobro").innerText = `Total: ${money(total)}`);
    qs("entregas-labelCobro") && (qs("entregas-labelCobro").innerText = `Entregas: ${money(entregas)}`);
    qs("restante-labelCobro") && (qs("restante-labelCobro").innerText = `Restante: ${money(restante)}`);
    qs("cobrosPendientesCobro") && (qs("cobrosPendientesCobro").innerText = `Pendientes: ${money(restante)}`);

    /* ===============================
       4️⃣ PROGRESO
    =============================== */
    const porcentaje = Math.min(Math.round((entregas / total) * 100), 100);

    bar.style.width = porcentaje + "%";

    if (pct) {
        pct.innerText = porcentaje >= 100
            ? "✔ Completado"
            : porcentaje + "%";
    }

    /* ===============================
       5️⃣ COLORES (CSS viejo)
    =============================== */
    bar.classList.remove("low", "medium", "high", "full");

    if (porcentaje >= 100) {
        bar.classList.add("full");
    } else if (porcentaje >= 70) {
        bar.classList.add("high");
    } else if (porcentaje >= 30) {
        bar.classList.add("medium");
    } else {
        bar.classList.add("low");
    }
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
        const restante = Math.round(
            Number(cuotaActual.MontoOriginal || 0) +
            Number(cuotaActual.MontoRecargos || 0) -
            Number(cuotaActual.MontoDescuentos || 0) -
            Number(cuotaActual.MontoPagado || 0)
        );

        qs("cb_montoRestante").value = restante;
        qs("cb_importe").value = formatearMiles(restante);

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

        const restante = Math.round(
            Number(cuotaActual.MontoOriginal || 0) +
            Number(cuotaActual.MontoRecargos || 0) -
            Number(cuotaActual.MontoDescuentos || 0) -
            Number(cuotaActual.MontoPagado || 0)
        );

        qs("cb_montoRestante").value = restante;
        qs("cb_importe").value = formatearMiles(restante);
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

    const observacion = (qs("aj_obs")?.value || "").trim();
    const obsFinal = observacion.length ? observacion : null;

    try {
        const payload = {
            IdCuota: cuotaActual.Id,
            Tipo: tipoRecargo, // "Fijo" | "Porcentaje"
            Valor: valor,
            Observacion: obsFinal,
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

        // 🔒 cerrar modal ajuste
        getModal("mdAjuste").hide();

        // 🔄 refrescar datos en pantalla
        await recargarVentaYCuota();
        actualizarGrillaCobros();

        // ===================================================
        // 📲 WHATSAPP (MISMO FLUJO QUE COBRO)
        // ===================================================
        if (userSession?.IdRol === 1 || userSession?.IdRol === 4) {

            const enviar = await confirmarModal(
                "Recargo aplicado correctamente. ¿Deseas notificar al cliente por WhatsApp?"
            );

            if (enviar) {
                await preguntarWhatsappDespuesCobro(
                    json.idRecargo,     // 🔥 ESTE ES EL MOVIMIENTO
                    "Recargo"           // 🔥 CLAVE PARA EL MENSAJE
                );
            }
        }

    } catch (e) {
        console.error(e);
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

            const importePagado = Math.round(ahora - antes);

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
        const importeRec = Math.round(Number(item.Importe || 0));

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


async function confirmarCobro() {
    setCbError(null);

    if (!ventaActual?.IdVenta || !cuotaActual?.Id) {
        setCbError("Falta venta o cuota.");
        return;
    }

    const importe = formatearSinMiles(qs("cb_importe").value);
    const fecha = qs("cb_fecha").value;
    const obs = qs("cb_obs").value || "";

    /* =============================
       🔁 CAMBIO DE FECHA
    ============================= */
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

            getModal("mdCobro").hide();
            actualizarGrillaCobros();
            return;

        } catch {
            setCbError("Error de conexión al cambiar la fecha.");
            return;
        }
    }

    /* =============================
       💰 COBRO NORMAL (SIN CONFIRMAR)
    ============================= */
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

        /* =============================
           ✅ COBRO OK
        ============================= */
        getModal("mdCobro").hide();
        actualizarGrillaCobros();

        /* =============================
           📲 WHATSAPP (POST-COBRO, IGUAL COBRANZAS)
        ============================= */
        if (userSession?.IdRol === 1 || userSession?.IdRol === 4) {

            const enviar = await confirmarModal(
                "Cobranza realizada con éxito. ¿Deseas enviar el comprobante al cliente vía WhatsApp?"
            );

            if (enviar) {
                await preguntarWhatsappDespuesCobro(
                    json.idMovimiento || json.idPago,
                    "Cobranza"
                );

            }
        }

    } catch {
        setCbError("Error de conexión al registrar el pago.");
    }
}


/* ===================== EVENTS (SEGUROS) ===================== */
document.addEventListener("DOMContentLoaded", () => {

    qs("cb_importe")?.addEventListener("input", (e) => {

        const limpio = formatearSinMiles(e.target.value);
        e.target.value = formatearMiles(limpio);

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

        try {
            await fetch("/Ventas_Electrodomesticos/MarcarComprobante", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idVenta: idVenta })
            });

            // 🔥 ACTUALIZAR ICONO EN LA GRILLA SIN RECARGAR
            marcarComprobanteEnGrilla(idVenta);

        } catch (e) {
            console.warn("No se pudo marcar comprobante", e);
        }

    } catch (e) {
        console.error(e);
        showToast("Error generando el PDF", "danger");
    }
};


function marcarComprobanteEnGrilla(idVenta) {

    if (!gridVentas) return;

    // 1️⃣ actualizar cache
    const venta = ventasCache.find(v => Number(v.IdVenta) === Number(idVenta));
    if (venta) {
        venta.Comprobante = 1;
    }

    // 2️⃣ buscar fila en DataTable y redibujarla
    gridVentas.rows().every(function () {
        const d = this.data();
        if (Number(d.IdVenta) === Number(idVenta)) {

            // actualizar dato interno
            d.Comprobante = 1;
            this.data(d);

            // redibujar solo esa fila
            this.invalidate().draw(false);
        }
    });
}


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
        const m = moment(x);
        return m.isValid() ? m : moment(String(x), "DD/MM/YYYY", true);
    };

    // ===== Helpers recargo / descuento =====
    const fmtValTipo = (val, tipo) => {
        const t = (tipo || "").trim();
        const n = Number(val || 0);
        if (!t || isNaN(n) || n <= 0) return null;

        if (t === "%") return `${n.toFixed(2)}%`;
        // $ o cualquier otro -> lo muestro como dinero
        return money(n);
    };

    const recargoTxt = fmtValTipo(venta.RecargoValor, venta.RecargoTipo);
    const descuentoTxt = fmtValTipo(venta.DescuentoValor, venta.DescuentoTipo);

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

    // ✅ NUEVO: Mostrar recargo / descuento si existen
    if (recargoTxt || descuentoTxt) {
        let linea = [];
        if (recargoTxt) linea.push(`Recargo: ${recargoTxt}`);
        if (descuentoTxt) linea.push(`Descuento: ${descuentoTxt}`);

        doc.setFontSize(10);
        doc.text(linea.join("  |  "), 10, y);
        y += 6;
    }

    y += 2;

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
            proximaNumero = candidatasHoyOAntes[0].numero;
        } else {
            proximaNumero = noPagadas[0].numero;
        }
    }

    const filasMeta = [];

    const body = cuotasNorm
        .sort((a, b) => a.numero - b.numero)
        .map(x => {

            let estadoTxt = x.estadoRaw;
            let estadoTipo = "pendiente";

            if (x.estadoRaw === "Pagada" || x.restanteCuota <= 0.0001) {
                estadoTxt = "Pagada";
                estadoTipo = "pagada";
            } else {
                if (hoy.isAfter(x.vencM, "day")) {
                    const dias = hoy.diff(x.vencM, "days");
                    estadoTxt = `Vencida - ${dias} días`;
                    estadoTipo = "vencida";
                } else {
                    estadoTxt = "Pendiente";
                    estadoTipo = "pendiente";
                }

                if (proximaNumero != null && x.numero === proximaNumero) {
                    estadoTxt = "Próxima";
                    estadoTipo = "proxima";
                }
            }

            filasMeta.push({
                estadoTipo,
                rowFill: (estadoTipo === "proxima") ? [255, 243, 205] : null
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
        headStyles: {
            fillColor: [22, 160, 133],
            textColor: [255, 255, 255],
            fontStyle: "bold"
        },
        didParseCell: function (data) {
            if (data.section === "head") return;

            const meta = filasMeta[data.row.index];
            if (!meta) return;

            if (meta.rowFill) {
                data.cell.styles.fillColor = meta.rowFill;
            }

            const colEstado = 5;
            if (data.column.index === colEstado) {
                if (meta.estadoTipo === "pagada") {
                    data.cell.styles.textColor = [25, 135, 84];
                    data.cell.styles.fontStyle = "bold";
                }
                else if (meta.estadoTipo === "vencida") {
                    data.cell.styles.textColor = [220, 53, 69];
                    data.cell.styles.fontStyle = "bold";
                }
                else if (meta.estadoTipo === "proxima") {
                    data.cell.styles.textColor = [33, 37, 41];
                    data.cell.styles.fontStyle = "bold";
                }
                else {
                    data.cell.styles.textColor = [33, 37, 41];
                }
            }
        }
    });

    const fileName = `Venta_${venta.IdVenta}_${moment().format("YYYYMMDD_HHmm")}.pdf`;
    doc.save(fileName);
}

function toggleModoReprogramacion() {

    const importe = formatearSinMiles(qs("cb_importe").value);
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
    const importe = formatearSinMiles(qs("cb_importe").value);
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


async function preguntarWhatsappDespuesCobro(idMovimiento, descripcion) {

    try {
        const base = await MakeAjax({
            type: "POST",
            url: "/Ventas_Electrodomesticos/EnvWhatssapElectro",
            async: true,
            data: JSON.stringify({
                id: idMovimiento,
                descripcion: descripcion // ✅ AHORA DINÁMICO
            }),
            contentType: "application/json",
            dataType: "json"
        });

        if (!base || !base.Venta || !base.Cliente || !base.Cliente.ClienteTelefono) {
            return;
        }

        const mensaje = armarMensajeWhatsappElectro(
            base,
            descripcion,
            idMovimiento
        );

        if (!mensaje) return;

        abrirWhatsapp(base.Cliente.ClienteTelefono, mensaje);

    } catch (e) {
        console.warn("No se pudo enviar WhatsApp", e);
    }
}

async function enviarWhatssapElectro(idMovimiento, descripcion) {

    const base = await MakeAjax({
        type: "POST",
        url: "/Ventas_Electrodomesticos/EnvWhatssapElectro",
        async: true,
        data: JSON.stringify({
            id: idMovimiento,
            descripcion: descripcion
        }),
        contentType: "application/json",
        dataType: "json"
    });

    if (!base) {
        mostrarError("No se pudo obtener la venta de electrodomésticos.");
        return;
    }

    const mensaje = armarMensajeWhatsappElectro(base, descripcion);
    abrirWhatsapp(base.Cliente.Telefono, mensaje);
}

function obtenerTipoMensajeElectro(descripcion = "") {
    const d = String(descripcion).toLowerCase();

    if (d === "cobro") return "cobro";
    if (d === "recargo") return "recargo";
    if (d === "venta") return "venta";

    if (d.includes("cobranza")) return "cobro";
    if (d.includes("recargo")) return "recargo";
    if (d.includes("venta")) return "venta";

    // ❌ antes devolvía "venta"
    return "cobro"; // ✅ seguro por defecto
}



function abrirWhatsapp(telefono, mensaje) {

    const tel = normalizarTelefonoAR(telefono);
    if (!tel) {
        console.warn("Teléfono inválido:", telefono);
        return;
    }

    const msg = encodeURIComponent(mensaje);
    const url = `https://api.whatsapp.com/send?phone=${tel}&text=${msg}`;
    window.open(url, "_blank");
}

function normalizarTelefonoAR(tel) {
    if (!tel) return "";

    let limpio = String(tel).replace(/\D/g, "");

    // quitar 0 inicial
    if (limpio.startsWith("0")) {
        limpio = limpio.slice(1);
    }

    // quitar 549 si ya viene
    if (limpio.startsWith("549")) {
        limpio = limpio.slice(3);
    }

    // quitar 54 si viene
    if (limpio.startsWith("54")) {
        limpio = limpio.slice(2);
    }

    // devolver con prefijo correcto
    return "549" + limpio;
}



function armarMensajeWhatsappElectro(base, descripcion, idPago) {

    if (!base || !base.Venta || !base.Cliente)
        return "";

    const v = base.Venta;

    const tipo = obtenerTipoMensajeElectro(descripcion);

    const nombreCliente = (v.ClienteNombre || "").trim();
    const saldo = formatNumber(v.Restante || 0);

    /* ===============================
       SALUDO
    =============================== */
    const h = new Date().getHours();
    const saludo =
        h >= 5 && h < 12 ? "Buenos días" :
            h >= 12 && h < 20 ? "Buenas tardes" :
                "Buenas noches";

    /* ===============================
       PRÓXIMA CUOTA REAL
    =============================== */
    let textoCuota = "—";

    if (Array.isArray(v.Cuotas)) {
        const hoy = moment().startOf("day");

        const proxima = v.Cuotas
            .filter(c =>
                (c.MontoRestante || 0) > 0 &&
                moment(c.FechaVencimiento).isSameOrAfter(hoy, "day")
            )
            .sort((a, b) =>
                new Date(a.FechaVencimiento) - new Date(b.FechaVencimiento)
            )[0];

        if (proxima) {
            textoCuota =
                `Cuota ${proxima.NumeroCuota} – ` +
                `${moment(proxima.FechaVencimiento).format("DD/MM/YYYY")} – ` +
                `${formatNumber(proxima.MontoRestante)}`;
        }
    }

    /* =====================================================
       ======================= VENTA =======================
       ===================================================== */
    if (tipo === "venta") {

        const fechaVenta = v.FechaVenta
            ? moment(v.FechaVenta).format("DD/MM/YYYY")
            : "";

        const total = formatNumber(v.ImporteTotal || 0);
        const entrega = formatNumber(v.Entrega || 0);

        let productos = "";
        if (Array.isArray(v.Items) && v.Items.length) {
            productos = v.Items
                .slice(0, 3)
                .map(i => `• ${i.Cantidad || 1} x ${i.Producto}`)
                .join("\n");

            if (v.Items.length > 3) {
                productos += `\n• y otros ${v.Items.length - 3} productos`;
            }
        }

        return `${saludo} ${nombreCliente} 😊

🛒 *VENTA DE ELECTRODOMÉSTICOS*
Le informamos que el día ${fechaVenta} hemos registrado una nueva venta.

📦 *Productos adquiridos:*
${productos}

💰 *Total:* ${total}
💵 *Entrega:* ${entrega}
📉 *Saldo pendiente:* ${saldo}

📆 *Próxima cuota a vencer:*
${textoCuota}

Muchas gracias por su compra 🙌
Ante cualquier consulta, quedamos a disposición.`;
    }

    /* =====================================================
       ======================= COBRO =======================
       ===================================================== */
    if (tipo === "cobro") {

        if (!Array.isArray(v.Pagos) || !v.Pagos.length)
            return "";

        // 🔥 PAGO REAL (EL QUE ACABÁS DE HACER)
        const pago = v.Pagos.find(p => Number(p.Id) === Number(idPago));
        if (!pago || !Array.isArray(pago.Detalles) || !pago.Detalles.length)
            return "";

        // 🔥 DETALLE REAL
        const det = pago.Detalles[0];

        // 🔥 CUOTA REAL PAGADA
        const cuota = Array.isArray(v.Cuotas)
            ? v.Cuotas.find(c => Number(c.Id) === Number(det.IdCuota))
            : null;

        const nroCuota = cuota?.NumeroCuota ?? "?";
        const importePagado = formatNumber(det.ImporteAplicado || 0);

        // 🔥 CUOTAS RESTANTES REALES
        const cuotasRestantes = Array.isArray(v.Cuotas)
            ? v.Cuotas.filter(c => (c.MontoRestante || 0) > 0).length
            : 0;

        return `${saludo} ${nombreCliente} 👋

💳 *COBRO REGISTRADO – ELECTRODOMÉSTICOS*

Se ha registrado correctamente el pago de la *Cuota ${nroCuota}*.

💰 *Importe abonado:* ${importePagado}
📉 *Saldo pendiente total:* ${saldo}
📊 *Cuotas restantes:* ${cuotasRestantes}

📆 *Próxima cuota a vencer:*
${textoCuota}

Muchas gracias por su pago 🙌
Ante cualquier consulta, quedamos a disposición.`;
    }

    /* =====================================================
       ===================== RECARGO =======================
       ===================================================== */
    /* =====================================================
    ===================== RECARGO =======================
    ===================================================== */
    if (tipo === "recargo") {

        const ultimoRecargo = obtenerUltimoRecargoReal(v);

        if (!ultimoRecargo) return "";

        const importeRecargo = formatNumber(ultimoRecargo.Importe);

        const saldoFinal = v.Restante + ultimoRecargo.Importe;

        const cuotaAfectada =
            `Cuota ${ultimoRecargo.NumeroCuota} – ` +
            `${moment(ultimoRecargo.FechaVencimiento).format("DD/MM/YYYY")}`;

        return `${saludo} ${nombreCliente} ⚠️

📌 *RECARGO APLICADO – ELECTRODOMÉSTICOS*
Le informamos que se ha aplicado un recargo sobre su plan de pagos.

💲 *Importe del recargo:* ${importeRecargo}
📉 *Saldo actualizado:* ${formatNumber(saldoFinal)}

📆 *Cuota afectada:*
${cuotaAfectada}

📆 *Próxima cuota:*
${textoCuota}

Ante cualquier duda o consulta, quedamos a disposición.`;
    }


    return "";
}


function obtenerSaludo() {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return "Buenos días";
    if (h >= 12 && h < 20) return "Buenas tardes";
    return "Buenas noches";
}

function actualizarGrillaCobros() {

    // 🔹 Pantalla COBROS ELECTRO
    if (window.VC && typeof VC.cargarTabla === "function") {
        VC.cargarTabla();              // tabla principal
        if (typeof VC.cargarCobrosPendientes === "function") {
            VC.cargarCobrosPendientes(); // 🔥 pendientes
        }
        return;
    }

    // 🔹 Otras pantallas (fallbacks)
    if (window.gridCobros && typeof gridCobros.ajax?.reload === "function") {
        gridCobros.ajax.reload(null, false);
    }

    if (window.gridCobrosPendientes && typeof gridCobrosPendientes.ajax?.reload === "function") {
        gridCobrosPendientes.ajax.reload(null, false);
    }

    if (window.gridRendimiento && typeof gridRendimiento.ajax?.reload === "function") {
        gridRendimiento.ajax.reload(null, false);
    }
}


function obtenerInfoUltimoCobro(v) {

    if (!v || !Array.isArray(v.Historial) || !Array.isArray(v.Cuotas))
        return null;

    // 1️⃣ Último movimiento de PAGO DE CUOTA
    const ultimoPago = v.Historial
        .filter(h =>
            h.Campo === "PagoCuota" &&
            Number(h.ValorNuevo) > Number(h.ValorAnterior)
        )
        .sort((a, b) =>
            new Date(b.FechaCambio) - new Date(a.FechaCambio)
        )[0];

    if (!ultimoPago)
        return null;

    // 2️⃣ Importe REAL pagado en este cobro
    const antes = Number(
        String(ultimoPago.ValorAnterior || "0").replace("Antes=", "")
    );

    const ahora = Number(
        String(ultimoPago.ValorNuevo || "0").replace("Ahora=", "")
    );

    const importePagado = ahora - antes;

    // 3️⃣ Cuota afectada
    const idCuota = Number(ultimoPago.IdCuota);
    const cuota = v.Cuotas.find(c => Number(c.Id) === idCuota);

    if (!cuota)
        return null;

    // 4️⃣ Cuotas restantes
    const cuotasRestantes = v.Cuotas.filter(c =>
        Number(c.MontoRestante || 0) > 0
    ).length;

    return {
        NumeroCuota: cuota.NumeroCuota,
        ImportePagado: importePagado,
        CuotasRestantes: cuotasRestantes
    };
}


function obtenerUltimoRecargoReal(v) {

    if (!v || !Array.isArray(v.Cuotas)) return null;

    const recargos = [];

    v.Cuotas.forEach(c => {
        if (Array.isArray(c.Recargos)) {
            c.Recargos.forEach(r => {
                recargos.push({
                    NumeroCuota: c.NumeroCuota,
                    FechaVencimiento: c.FechaVencimiento,
                    Importe: Number(r.ImporteCalculado || 0),
                    Fecha: r.Fecha
                });
            });
        }
    });

    if (!recargos.length) return null;

    return recargos.sort(
        (a, b) => new Date(b.Fecha) - new Date(a.Fecha)
    )[0];
}


