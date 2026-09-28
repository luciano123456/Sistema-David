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

function fmtHistMoney(val) {
    const n = (typeof val === "number" && Number.isFinite(val))
        ? val
        : parseMontoFlexible(val);
    if (!Number.isFinite(n)) return "";
    return Math.round(n).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function fmtHistTextoConMontos(texto) {
    if (texto == null || texto === "") return "";
    return String(texto).replace(
        /\$\s*(?:\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/g,
        (m) => {
            const raw = m.replace(/\$/g, "").trim();
            const fmt = fmtHistMoney(raw);
            return fmt || m;
        }
    );
}

/** Parsea montos guardados en auditoría (p. ej. "Antes=0,00", "Ahora=39000,00" desde C# N2 / cultura es-AR). */
function parseValorAuditHistorial(val) {
    if (val == null) return 0;
    let s = String(val).trim().replace(/\u00a0/g, " ");
    if (!s) return 0;
    // Quita etiqueta Antes=/Ahora=… con o sin espacios alrededor del =
    s = s
        .replace(/^\s*(antes|ahora|pagadoantes|pagadoahora)\s*=\s*/i, "")
        .trim();
    if (!s) return 0;
    const n = parseMontoFlexible(s);
    return Number.isFinite(n) ? n : 0;
}

/** Importe aplicado en un registro PagoCuota (observación "… Aplicado=…"). */
function parseAplicadoDesdeObs(obs) {
    if (!obs) return 0;
    const m = String(obs).match(/Aplicado\s*=\s*([\d.,\s\u00a0]+)/i);
    if (!m) return 0;
    const n = parseMontoFlexible(m[1].replace(/\s/g, "").replace(/\u00a0/g, ""));
    return Number.isFinite(n) ? n : 0;
}

/**
 * Convierte montos que vienen de JSON/BD (número, o string "39.000" / "1.234,56").
 * OJO: Number("39.000") en JS da 39, no 39000.
 */
function parseMontoFlexible(val) {
    if (val == null || val === "") return NaN;
    if (typeof val === "number" && Number.isFinite(val)) return val;
    let s = String(val).trim().replace(/\s/g, "");
    if (!s) return NaN;
    // Miles con punto y decimal con coma: 1.234.567,89
    if (s.includes(",")) {
        s = s.replace(/\./g, "").replace(",", ".");
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : NaN;
    }
    // Solo puntos: 1.234.567 o 39.000 (miles AR) vs 1234.56 (decimal EN)
    if (s.includes(".")) {
        const parts = s.split(".");
        const last = parts[parts.length - 1];
        if (parts.length > 2 || (parts.length === 2 && last.length === 3 && /^\d{3}$/.test(last))) {
            s = s.replace(/\./g, "");
        }
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
}

/** Lee un número de la cuota probando PascalCase y camelCase. */
function pickCuotaNum(cuota, keys) {
    if (!cuota) return 0;
    for (const k of keys) {
        const v = cuota[k];
        if (v == null || v === "") continue;
        const n = parseMontoFlexible(v);
        if (Number.isFinite(n)) return n;
    }
    return 0;
}

/** Lee un número de la venta (PascalCase / camelCase). */
function pickVentaNum(venta, keys) {
    if (!venta) return 0;
    for (const k of keys) {
        const v = venta[k];
        if (v == null || v === "") continue;
        const n = parseMontoFlexible(v);
        if (Number.isFinite(n)) return n;
    }
    return 0;
}

/**
 * Importe de un movimiento PagoCuota en historial (misma heurística que el modal de cuota).
 * Actualiza pagadoPorCuota[idCuota] con el acumulado simulado en orden cronológico global.
 */
function getImportePagoCuotaHistorialIncremental(h, pagadoPorCuota) {
    const idC = Number(h.IdCuota ?? h.idCuota);
    const obsRaw = h.Observacion ?? h.observacion;
    const va = h.ValorAnterior ?? h.valorAnterior;
    const vn = h.ValorNuevo ?? h.valorNuevo;
    const valorAnteriorSim = pagadoPorCuota[idC] || 0;
    const ahoraCum = parseValorAuditHistorial(vn);
    let importePagado = Math.round(parseAplicadoDesdeObs(obsRaw));
    if (!Number.isFinite(importePagado) || importePagado <= 0) {
        if (ahoraCum > valorAnteriorSim) {
            importePagado = Math.round(ahoraCum - valorAnteriorSim);
        }
    }
    if (!Number.isFinite(importePagado) || importePagado <= 0) {
        importePagado = Math.round(
            parseValorAuditHistorial(vn) - parseValorAuditHistorial(va)
        );
    }
    importePagado = Math.max(0, importePagado);
    pagadoPorCuota[idC] = Math.round((pagadoPorCuota[idC] || 0) + importePagado);
    return importePagado;
}

/**
 * Restante de la venta después de aplicar cada PagoCuota (todos los movimientos de la venta).
 * Se obtiene desde Restante actual + pagos posteriores en el tiempo (suma sufija).
 */
function buildMapRestanteVentaDespuesDePago(venta) {
    const map = new Map();
    if (!venta || !Array.isArray(venta.Historial)) return map;

    const rows = venta.Historial
        .filter((h) => (h.Campo ?? h.campo) === "PagoCuota")
        .map((h) => ({
            h,
            t: new Date(h.FechaCambio ?? h.fechaCambio).getTime(),
            id: h.Id ?? h.id
        }))
        .sort((a, b) => (a.t - b.t) || (Number(a.id) - Number(b.id)));

    const pagadoPorCuota = {};
    const imp = rows.map(({ h }) =>
        getImportePagoCuotaHistorialIncremental(h, pagadoPorCuota)
    );

    const restDb = Math.round(pickVentaNum(venta, ["Restante", "restante"]));
    let accFuture = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
        const hid = rows[i].h.Id ?? rows[i].h.id;
        const restDespues = Math.max(0, restDb + accFuture);
        map.set(hid, restDespues);
        map.set(String(hid), restDespues);
        const n = Number(hid);
        if (Number.isFinite(n)) map.set(n, restDespues);
        accFuture += imp[i];
    }
    return map;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Fecha sugerida para cobro/reprogramación: no antes del vencimiento de la cuota. */
function defaultFechaCobroCuotaIso(cuota) {
    const t = moment().startOf("day").add(7, "days");
    if (!cuota?.FechaVencimiento) return t.format("YYYY-MM-DD");
    const v = moment(cuota.FechaVencimiento).startOf("day");
    return (v.isAfter(t) ? v : t).format("YYYY-MM-DD");
}

function actualizarTextoFechaCobroUI(importe, restante) {
    const lbl = qs("cb_fecha_label");
    if (!lbl) return;
    const esParcial = restante > 0 && importe > 0 && importe < restante;
    lbl.textContent = (importe === 0 || esParcial)
        ? "Próxima fecha de cobro"
        : "Fecha de cobro";
}

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

function puedeVerMontosCuentasBancarias() {
    try {
        const sesion = (typeof userSession !== "undefined" && userSession)
            ? userSession
            : JSON.parse(localStorage.getItem("usuario") || "null");
        const rol = Number(sesion && sesion.IdRol);
        return rol === 1 || rol === 4;
    } catch (e) {
        return false;
    }
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

    if (!puedeVerMontosCuentasBancarias()) {
        clearProgress();
        return;
    }

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
    qs("cb_fecha").disabled = false;
    qs("cb_fecha").classList.remove("opacity-50");
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

        // Fecha (desde vencimiento de la cuota hacia adelante)
        qs("cb_fecha").value = defaultFechaCobroCuotaIso(cuotaActual);

        // Valor cuota (monto restante real)
        const restante = Math.round(
            Number(cuotaActual.MontoOriginal || 0) +
            Number(cuotaActual.MontoRecargos || 0) -
            Number(cuotaActual.MontoDescuentos || 0) -
            Number(cuotaActual.MontoPagado || 0)
        );

        qs("cb_montoRestante").value = restante;
        qs("cb_importe").value = 0;
        evaluarFechaCobroUI();

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

function evaluarFechaCobroUI() {
    const importe = formatearSinMiles(qs("cb_importe").value);
    const restante = Number(qs("cb_montoRestante").value || 0);
    const inputFecha = qs("cb_fecha");
    if (!inputFecha) return;
    const hoy = todayISO();
    actualizarTextoFechaCobroUI(importe, restante);

    // 🔁 Reprogramación: fecha editable (sin min/max en el input; el usuario elige el día de cobro)
    if (importe === 0) {
        inputFecha.disabled = false;
        inputFecha.classList.remove("opacity-50");
        inputFecha.removeAttribute("min");
        inputFecha.removeAttribute("max");

        if (!inputFecha.value || inputFecha.value === hoy) {
            inputFecha.value = defaultFechaCobroCuotaIso(cuotaActual);
        }
        return;
    }

    // 💰 Cobro parcial: pago hoy, pero se puede programar próxima fecha de cobro de la cuota.
    if (restante > 0 && importe > 0 && importe < restante) {
        inputFecha.disabled = false;
        inputFecha.classList.remove("opacity-50");
        inputFecha.removeAttribute("max");
        inputFecha.min = hoy;
        if (!inputFecha.value || inputFecha.value < hoy || inputFecha.value === hoy) {
            inputFecha.value = defaultFechaCobroCuotaIso(cuotaActual);
        }
        return;
    }

    // 💰 Cobro total (o sin restante): fecha de la cuota queda hoy y bloqueada
    inputFecha.value = todayISO();
    inputFecha.disabled = true;
    inputFecha.classList.add("opacity-50");
    inputFecha.removeAttribute("min");
    inputFecha.removeAttribute("max");
}
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

        qs("cb_wrapCuenta").hidden = false;

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
        if (puedeVerMontosCuentasBancarias()) {
            renderProgress(cuentasCache[0]);
        } else {
            clearProgress();
        }
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
        await actualizarGrillaCobros();

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

let histScopeModo = "cuota"; // "cuota" | "venta"
let histCatFiltro = "todos";
let histTimelineCache = [];

function esAdminHistorialElectro() {
    try {
        const u = window.userSession
            || (typeof userSession !== "undefined" ? userSession : null)
            || JSON.parse(localStorage.getItem("usuario") || "{}");
        return Number(u?.IdRol) === 1;
    } catch (e) {
        return false;
    }
}

function etiquetaEventoHistorial(campo) {
    const map = {
        CrearVenta: "Alta de venta",
        RegistrarPago: "Cobro de la venta",
        PagoCuota: "Pago de cuota",
        EliminarPago: "Pago eliminado",
        RecargoCuota: "Recargo / interés",
        EliminarRecargoCuota: "Recargo eliminado",
        MontoRecargosCuota: "Recargos de cuota",
        MontoDescuentosCuota: "Descuentos de cuota",
        MontoOriginalCuota: "Monto de cuota",
        FechaVencimientoCuota: "Vencimiento de cuota",
        NumeroCuota: "Número de cuota",
        EstadoCuota: "Estado de cuota",
        FechaCobro: "Fecha de cobro",
        ReprogramarCobro: "Reprogramación",
        CobroPendiente: "Cobro pendiente",
        "Transferencia Pendiente": "Transferencia pendiente",
        EstadoVenta: "Estado de la venta",
        AsignarCobradorVenta: "Cobrador",
        ObservacionCobro: "Observación de cobro",
        EstadoCobro: "Marca de cobro",
        ObservacionVenta: "Observación",
        FechaVenta: "Fecha de venta",
        IdVendedor: "Vendedor",
        IdCliente: "Cliente",
        FranjaHoraria: "Franja horaria",
        Turno: "Turno",
        ArchivarVenta: "Venta eliminada",
        RestaurarVenta: "Venta restaurada",
        Comprobante: "Comprobante",
        WhatsAppPago: "WhatsApp de pago",
        WhatsAppVenta: "WhatsApp de venta",
        WhatsAppRecargo: "WhatsApp de recargo",
        TipoInteres: "Tipo de interés",
        RecargoTipo: "Tipo de recargo",
        RecargoValor: "Valor de recargo",
        DescuentoTipo: "Tipo de descuento",
        DescuentoValor: "Valor de descuento",
        EditarCuota: "Edición de cuota",
        EditarVenta: "Edición de la venta",
        Entrega: "Entrega / seña",
        ImporteTotal: "Total de la venta",
        CantidadCuotas: "Cantidad de cuotas",
        FormaCuotas: "Forma de cuotas",
        ProductoAgregado: "Producto agregado",
        ProductoQuitado: "Producto quitado",
        ProductoCantidad: "Cantidad de producto",
        ProductoPrecio: "Precio de producto",
        ProductoNombre: "Nombre de producto",
        CuotaNueva: "Cuota agregada",
        CuotaEliminada: "Cuota quitada"
    };
    return map[campo] || campo || "Movimiento";
}

function histCategoriaDe(campo) {
    const c = String(campo || "");
    if (/^Producto/.test(c)) return "productos";
    const pagos = {
        PagoCuota: 1, RegistrarPago: 1, EliminarPago: 1, RecargoCuota: 1,
        EliminarRecargoCuota: 1, CobroPendiente: 1, ReprogramarCobro: 1,
        FechaCobro: 1, TipoInteres: 1, RECARGO_LEGACY: 1
    };
    if (pagos[c] || c === "Transferencia Pendiente") return "pagos";
    const cuotas = {
        FechaVencimientoCuota: 1, MontoOriginalCuota: 1, EstadoCuota: 1,
        CuotaNueva: 1, CuotaEliminada: 1, Entrega: 1, ImporteTotal: 1,
        CantidadCuotas: 1, FormaCuotas: 1, EditarCuota: 1, NumeroCuota: 1,
        MontoRecargosCuota: 1, MontoDescuentosCuota: 1, RecargoTipo: 1,
        RecargoValor: 1, DescuentoTipo: 1, DescuentoValor: 1
    };
    if (cuotas[c]) return "cuotas";
    return "general";
}

function histToneDe(campo) {
    const c = String(campo || "");
    if (c === "PagoCuota" || c === "RegistrarPago" || c === "ProductoAgregado" || c === "CuotaNueva" || c === "RestaurarVenta")
        return "ok";
    if (c === "EliminarPago" || c === "ArchivarVenta" || c === "ProductoQuitado" || c === "CuotaEliminada" || /^Eliminar/.test(c))
        return "danger";
    if (c === "RecargoCuota" || c === "TipoInteres" || c === "MontoRecargosCuota" || c === "RECARGO_LEGACY" || c === "CobroPendiente" || c === "Transferencia Pendiente")
        return "warn";
    if (c === "ReprogramarCobro" || c === "FechaCobro" || c === "FechaVencimientoCuota")
        return "info";
    if (c === "CrearVenta" || c === "EstadoVenta" || c === "EditarVenta" || /^Producto/.test(c) || c === "ImporteTotal")
        return "edit";
    if (c === "AsignarCobradorVenta" || c === "IdVendedor")
        return "muted";
    return "edit";
}

function histIconoDe(campo) {
    const c = String(campo || "");
    if (c === "PagoCuota" || c === "RegistrarPago") return "fa-money";
    if (c === "EliminarPago") return "fa-undo";
    if (c === "RecargoCuota" || c === "RECARGO_LEGACY" || c === "TipoInteres") return "fa-percent";
    if (c === "ReprogramarCobro" || c === "FechaCobro" || c === "FechaVencimientoCuota") return "fa-calendar";
    if (c === "AsignarCobradorVenta") return "fa-user";
    if (c === "EstadoVenta" || c === "CrearVenta") return "fa-flag";
    if (c === "ProductoAgregado") return "fa-plus";
    if (c === "ProductoQuitado") return "fa-minus";
    if (/^Producto/.test(c)) return "fa-cubes";
    if (c === "CuotaNueva" || c === "CuotaEliminada" || c === "MontoOriginalCuota") return "fa-list-ol";
    if (c === "Transferencia Pendiente") return "fa-exchange";
    if (c === "EditarVenta") return "fa-pencil";
    if (c === "ImporteTotal" || c === "Entrega") return "fa-tag";
    return "fa-circle-o";
}

function histMoneyPretty(val) {
    return fmtHistMoney(val);
}

function histModoCambioCampo(campo) {
    const c = String(campo || "");
    if (/^(ImporteTotal|Entrega|MontoOriginalCuota|MontoRecargosCuota|MontoDescuentosCuota|ProductoPrecio|RecargoValor|DescuentoValor)$/.test(c))
        return "money";
    if (/Cantidad|NumeroCuota/.test(c))
        return "qty";
    if (/Fecha|Reprogramar/.test(c))
        return "date";
    return "text";
}

function histTextoCambio(val, modo) {
    if (val == null || String(val).trim() === "") return "—";
    const s = String(val).trim();
    if (modo === "money") {
        return fmtHistMoney(s) || s;
    }
    if (modo === "date") {
        const m = moment(s);
        if (m.isValid() && (/^\d{4}-\d{2}-\d{2}/.test(s) || /T\d{2}:/.test(s) || /^\d{2}\/\d{2}\/\d{4}/.test(s)))
            return m.format("DD/MM/YYYY");
        return s;
    }
    return s;
}

function histDirCambio(anterior, nuevo) {
    const a = parseValorAuditHistorial(anterior);
    const n = parseValorAuditHistorial(nuevo);
    const aOk = Number.isFinite(a) && /\d/.test(String(anterior ?? ""));
    const nOk = Number.isFinite(n) && /\d/.test(String(nuevo ?? ""));
    if (aOk && nOk) {
        if (n > a) return "up";
        if (n < a) return "down";
        return "now";
    }
    const aq = parseMontoFlexible(anterior);
    const nq = parseMontoFlexible(nuevo);
    if (Number.isFinite(aq) && Number.isFinite(nq) && String(anterior ?? "").trim() !== "" && String(nuevo ?? "").trim() !== "") {
        if (nq > aq) return "up";
        if (nq < aq) return "down";
    }
    return "now";
}

function histPrefijoProductoObs(obs) {
    const s = String(obs || "");
    const m = s.match(/^(.+?)\s*:\s*(cantidad|precio)\b/i);
    return m ? m[1].trim() : "";
}

function histHtmlParCambio(anterior, nuevo, modo) {
    const dir = histDirCambio(anterior, nuevo);
    const sign = dir === "down" ? "&gt;" : "&lt;";
    return `<span class="ve-hist-old">${escapeHist(histTextoCambio(anterior, modo))}</span>` +
        ` <span class="ve-hist-cmp">${sign}</span> ` +
        `<span class="ve-hist-new">${escapeHist(histTextoCambio(nuevo, modo))}</span>`;
}

function histHayParCambio(h) {
    if (!h) return false;
    const a = h.anterior;
    const n = h.nuevo;
    if (a == null || n == null) return false;
    if (String(a).trim() === "" || String(n).trim() === "") return false;
    if (String(n).trim().toUpperCase() === "OK") return false;
    return String(a) !== String(n);
}

function histParDeItem(h) {
    if (histHayParCambio(h)) return { a: h.anterior, n: h.nuevo };
    const s = String((h && h.obs) || "");
    const m = s.match(/([\d][\d.,]*)\s*(?:\u2192|->|=>|[<>?])\s*([\d][\d.,]*)/);
    return m ? { a: m[1], n: m[2] } : null;
}

function histNombreDesdeObs(obs, prefix) {
    const s = String(obs || "");
    const re = new RegExp((prefix || "cobrador") + "\\s*=\\s*(.+)$", "i");
    const m = s.match(re);
    return m ? m[1].trim() : "";
}

function tituloEventoHistorial(item) {
    if (item._tipo === "RECARGO_LEGACY") {
        const tipo = item.tipo === "Porcentaje" ? "Recargo (%)" : "Recargo ($)";
        const nro = item.numeroCuota != null ? " cuota " + item.numeroCuota : "";
        return tipo + nro + " — " + fmtHistMoney(item.importe);
    }

    const h = item.h;
    const campo = h.campo;
    const nro = h.numeroCuota != null ? h.numeroCuota : null;
    const cuotaTxt = nro != null ? " cuota " + nro : "";

    if (campo === "PagoCuota") {
        const imp = parseAplicadoDesdeObs(h.obs);
        return "Pago" + cuotaTxt + (imp ? " — " + fmtHistMoney(imp) : "");
    }
    if (campo === "RegistrarPago") {
        const mPor = String(h.nuevo || h.obs || "").match(/por\s*([\d.,]+)/i);
        const imp = parseValorAuditHistorial(h.nuevo)
            || (mPor ? parseMontoFlexible(mPor[1]) : 0)
            || parseValorAuditHistorial(h.obs);
        const mPago = String(h.nuevo || h.obs || "").match(/Pago\s*#?\s*(\d+)/i);
        const extra = mPago ? " · pago #" + mPago[1] : "";
        return "Cobro de la venta" + (imp ? " — " + fmtHistMoney(imp) : "") + extra;
    }
    if (campo === "EliminarPago") {
        const imp = parseValorAuditHistorial(h.anterior) || parseValorAuditHistorial(h.nuevo);
        return "Pago eliminado" + (imp ? " — " + fmtHistMoney(imp) : "");
    }
    if (campo === "RecargoCuota") {
        const mImp = String(h.nuevo || "").match(/Importe\s*=\s*([\d.,]+)/i);
        const n = mImp ? parseMontoFlexible(mImp[1]) : 0;
        return "Recargo" + cuotaTxt + (n ? " — " + fmtHistMoney(n) : "");
    }
    if (campo === "AsignarCobradorVenta") {
        const nom = histNombreDesdeObs(h.obs, "cobrador")
            || (h.nuevo && h.nuevo !== "(sin)" && !/^\d+$/.test(String(h.nuevo).trim()) ? h.nuevo : "");
        if (h.nuevo === "(sin)" || /desasign/i.test(h.obs || ""))
            return nom ? "Cobrador desasignado (" + nom + ")" : "Cobrador desasignado";
        return nom ? "Cobrador: " + nom : "Cambio de cobrador";
    }
    if (campo === "EstadoVenta")
        return "Estado: " + (h.anterior || "—") + " → " + (h.nuevo || "—");
    if (campo === "ProductoAgregado")
        return fmtHistTextoConMontos(h.obs && /^Se agreg/.test(h.obs) ? h.obs : ("Se agregó " + (h.nuevo || "producto")));
    if (campo === "ProductoQuitado")
        return fmtHistTextoConMontos(h.obs && /^Se quit/.test(h.obs) ? h.obs : ("Se quitó " + (h.anterior || "producto")));
    if (campo === "ProductoCantidad") {
        const pref = histPrefijoProductoObs(h.obs);
        return (pref ? pref + ": " : "Cantidad") + (histHayParCambio(h) ? " " + h.anterior + " " + h.nuevo : "");
    }
    if (campo === "ProductoPrecio") {
        const pref = histPrefijoProductoObs(h.obs);
        return (pref ? pref + ": " : "Precio") + (histHayParCambio(h) ? " " + (histMoneyPretty(h.anterior) || h.anterior) + " " + (histMoneyPretty(h.nuevo) || h.nuevo) : "");
    }
    if (campo === "ProductoNombre")
        return "Producto: " + (h.anterior || "") + " → " + (h.nuevo || "");
    if (campo === "CuotaNueva" || campo === "CuotaEliminada")
        return fmtHistTextoConMontos(h.obs) || etiquetaEventoHistorial(campo);
    if (campo === "ImporteTotal" || campo === "Entrega" || campo === "MontoOriginalCuota") {
        const a = histMoneyPretty(h.anterior) || h.anterior || "—";
        const n = histMoneyPretty(h.nuevo) || h.nuevo || "—";
        return etiquetaEventoHistorial(campo) + ": " + a + " → " + n;
    }
    if (campo === "EditarVenta")
        return tituloEditarVentaHumano(item);
    if (campo === "CrearVenta")
        return "Se creó la venta";
    if (campo === "ReprogramarCobro" || campo === "FechaCobro")
        return "Reprogramó cobro" + cuotaTxt + (h.nuevo ? " → " + h.nuevo : "");
    if (campo === "Transferencia Pendiente")
        return "Transferencia pendiente" + cuotaTxt;
    if (campo === "CobroPendiente")
        return "Cobro pendiente" + cuotaTxt;

    const label = etiquetaEventoHistorial(campo);
    if (histHayParCambio(h))
        return label + ": " + histTextoCambio(h.anterior, histModoCambioCampo(campo)) + " → " + histTextoCambio(h.nuevo, histModoCambioCampo(campo));
    return label;
}

function tituloEventoHistorialHtml(item) {
    if (item._tipo === "RECARGO_LEGACY")
        return escapeHist(tituloEventoHistorial(item));

    const h = item.h;
    if (!h) return escapeHist(tituloEventoHistorial(item));
    const campo = h.campo;
    const nro = h.numeroCuota != null ? h.numeroCuota : null;
    const cuotaTxt = nro != null ? " cuota " + nro : "";
    const modo = histModoCambioCampo(campo);
    const label = etiquetaEventoHistorial(campo);

    if (campo === "PagoCuota" || campo === "RegistrarPago" || campo === "EliminarPago" || campo === "RecargoCuota")
        return escapeHist(tituloEventoHistorial(item));

    if (campo === "AsignarCobradorVenta") {
        if (h.nuevo === "(sin)" || /desasign/i.test(h.obs || ""))
            return escapeHist(tituloEventoHistorial(item));
        if (histHayParCambio(h))
            return escapeHist("Cobrador: ") + histHtmlParCambio(h.anterior, h.nuevo, "text");
        return escapeHist(tituloEventoHistorial(item));
    }
    if (campo === "EstadoVenta" && histHayParCambio(h))
        return escapeHist("Estado: ") + histHtmlParCambio(h.anterior, h.nuevo, "text");
    if (campo === "ProductoCantidad") {
        const par = histParDeItem(h);
        if (par) {
            const pref = histPrefijoProductoObs(h.obs);
            return escapeHist((pref ? pref + ": " : "Cantidad: ")) + histHtmlParCambio(par.a, par.n, "qty");
        }
    }
    if (campo === "ProductoPrecio") {
        const par = histParDeItem(h);
        if (par) {
            const pref = histPrefijoProductoObs(h.obs);
            return escapeHist((pref ? pref + ": " : "Precio: ")) + histHtmlParCambio(par.a, par.n, "money");
        }
    }
    if (campo === "ProductoNombre" && histHayParCambio(h))
        return escapeHist("Producto: ") + histHtmlParCambio(h.anterior, h.nuevo, "text");
    if (campo === "ImporteTotal" || campo === "Entrega" || campo === "MontoOriginalCuota" || campo === "MontoRecargosCuota" || campo === "MontoDescuentosCuota") {
        if (histHayParCambio(h))
            return escapeHist(label + ": ") + histHtmlParCambio(h.anterior, h.nuevo, "money");
    }
    if (campo === "CuotaNueva" || campo === "CuotaEliminada")
        return escapeHist(fmtHistTextoConMontos(h.obs) || etiquetaEventoHistorial(campo));
    if (campo === "EditarVenta")
        return escapeHist(fmtHistTextoConMontos(tituloEditarVentaHumano(item)));
    if (campo === "ReprogramarCobro" || campo === "FechaCobro") {
        if (histHayParCambio(h))
            return escapeHist("Reprogramó cobro" + cuotaTxt + ": ") + histHtmlParCambio(h.anterior, h.nuevo, "date");
        if (h.nuevo)
            return escapeHist("Reprogramó cobro" + cuotaTxt + " ") + `<span class="ve-hist-new is-now">${escapeHist(histTextoCambio(h.nuevo, "date"))}</span>`;
        return escapeHist(tituloEventoHistorial(item));
    }
    if (histHayParCambio(h))
        return escapeHist(label + ": ") + histHtmlParCambio(h.anterior, h.nuevo, modo);
    return escapeHist(fmtHistTextoConMontos(tituloEventoHistorial(item)));
}

function histObsTecnicaEdicion(obs) {
    const s = String(obs || "");
    return /Edición completa admin|Edición de cabecera y plan|Items\s*=\s*\d+|Cuotas\s*=\s*\d+/i.test(s)
        || /^OK$/i.test(s.trim());
}

function histHermanosEdicion(item) {
    if (!item || !item.h) return [];
    const t = new Date(item.h.fecha).getTime() || 0;
    const user = item.h.usuario || "";
    return histTimelineCache.filter((it) => {
        if (it === item || it._tipo === "RECARGO_LEGACY" || !it.h) return false;
        if (it.campo === "EditarVenta") return false;
        const dt = Math.abs((new Date(it.fecha).getTime() || 0) - t);
        if (dt > 120000) return false;
        if (user && it.h.usuario && it.h.usuario !== user) return false;
        return true;
    });
}

function histEditarVentaRedundante(item) {
    if (!item || item.campo !== "EditarVenta") return false;
    return histHermanosEdicion(item).some((it) => {
        const c = String(it.campo || "");
        return /^Producto/.test(c)
            || /^(CuotaNueva|CuotaEliminada|ImporteTotal|Entrega|CantidadCuotas|FormaCuotas|IdCliente|IdVendedor|FechaVenta|ObservacionVenta|MontoOriginalCuota|FechaVencimientoCuota|NumeroCuota)$/.test(c);
    });
}

function tituloEditarVentaHumano(item) {
    const h = item.h || {};
    const obs = String(h.obs || "").trim();
    const hermanos = histHermanosEdicion(item);
    const hayProducto = hermanos.some((it) => /^Producto/.test(it.campo || ""));
    const hayPlan = hermanos.some((it) =>
        /^(CuotaNueva|CuotaEliminada|ImporteTotal|Entrega|CantidadCuotas|FormaCuotas|MontoOriginalCuota|FechaVencimientoCuota|NumeroCuota)$/.test(it.campo || "")
    );

    if (obs && !histObsTecnicaEdicion(obs))
        return obs;

    const mCuotas = obs.match(/Cuotas\s*=\s*(\d+)/i);
    const mItems = obs.match(/Items\s*=\s*(\d+)/i);
    if (!hayProducto && (hayPlan || (mCuotas && !mItems)))
        return "Se modificó el plan de cuotas";
    if (h.anterior && h.nuevo && h.nuevo !== "OK" && h.anterior !== h.nuevo)
        return "Se actualizó la venta: " + h.anterior + " → " + h.nuevo;
    return "Se actualizó la venta";
}

function detalleEventoHistorial(item) {
    if (item._tipo === "RECARGO_LEGACY")
        return item.obs || "";
    const h = item.h;
    const campo = h.campo;
    if (campo === "EditarVenta")
        return "";
    const bits = [];
    if (h.numeroCuota != null && !/cuota/i.test(tituloEventoHistorial(item)))
        bits.push("Cuota " + h.numeroCuota);
    const skipObs = /^(ProductoAgregado|ProductoQuitado|ProductoCantidad|ProductoPrecio|ProductoNombre|CuotaNueva|CuotaEliminada|ImporteTotal|Entrega|MontoOriginalCuota|EstadoVenta|FechaCobro|ReprogramarCobro)$/.test(campo);
    if (h.obs && !skipObs) {
        if (!histObsTecnicaEdicion(h.obs)) {
            const titulo = tituloEventoHistorial(item);
            if (titulo.indexOf(h.obs) === -1)
                bits.push(fmtHistTextoConMontos(h.obs));
        }
    }
    if ((campo === "PagoCuota" || campo === "RegistrarPago") && h.nuevo && bits.indexOf(h.nuevo) < 0) {
        const t = tituloEventoHistorial(item);
        if (h.nuevo && t.indexOf(h.nuevo) === -1 && !/^OK$/i.test(h.nuevo))
            bits.push(fmtHistTextoConMontos(h.nuevo));
    }
    return bits.filter(Boolean).join(" · ");
}

function badgeClaseHistorial(campo) {
    const tone = histToneDe(campo);
    if (tone === "ok") return "ve-hist-badge ve-hist-badge-ok";
    if (tone === "danger") return "ve-hist-badge ve-hist-badge-danger";
    if (tone === "warn") return "ve-hist-badge ve-hist-badge-warn";
    if (tone === "info") return "ve-hist-badge ve-hist-badge-info";
    if (tone === "muted") return "ve-hist-badge ve-hist-badge-muted";
    return "ve-hist-badge ve-hist-badge-edit";
}

function normalizarHistRow(h) {
    return {
        id: h.Id ?? h.id,
        idCuota: h.IdCuota ?? h.idCuota,
        numeroCuota: h.NumeroCuota ?? h.numeroCuota,
        usuario: (h.UsuarioNombre ?? h.usuarioNombre) || ("#" + (h.UsuarioCambio ?? h.usuarioCambio ?? "")),
        fecha: h.FechaCambio ?? h.fechaCambio,
        campo: h.Campo ?? h.campo ?? "",
        anterior: h.ValorAnterior ?? h.valorAnterior ?? "",
        nuevo: h.ValorNuevo ?? h.valorNuevo ?? "",
        obs: h.Observacion ?? h.observacion ?? ""
    };
}

function escapeHist(s) {
    return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function histDiaKey(fecha) {
    const m = moment(fecha);
    if (!m.isValid()) return "sin-fecha";
    return m.format("YYYY-MM-DD");
}

function histDiaLabel(key) {
    if (key === "sin-fecha") return "Sin fecha";
    const m = moment(key, "YYYY-MM-DD");
    if (m.isSame(moment(), "day")) return "Hoy";
    if (m.isSame(moment().subtract(1, "day"), "day")) return "Ayer";
    return m.format("dddd D [de] MMMM YYYY");
}

function histCamposPlanExtra(campo) {
    const extra = {
        RecargoCuota: 1,
        EliminarRecargoCuota: 1,
        ReprogramarCobro: 1,
        FechaCobro: 1,
        TipoInteres: 1,
        RECARGO_LEGACY: 1,
        RecargoTipo: 1,
        RecargoValor: 1,
        MontoRecargosCuota: 1
    };
    return !!extra[String(campo || "")];
}

function histPasaFiltroCat(it) {
    const cat = it && it.cat;
    const campo = it && it.campo;
    if (histCatFiltro === "todos") return true;
    if (histCatFiltro === "general") return cat === "general" || cat === "productos";
    if (histCatFiltro === "cuotas")
        return cat === "cuotas" || histCamposPlanExtra(campo);
    return cat === histCatFiltro;
}

function pickVentaArr(venta, keys) {
    if (!venta) return [];
    for (const k of keys) {
        if (Array.isArray(venta[k])) return venta[k];
    }
    return [];
}

function pickVentaStr(venta, keys) {
    if (!venta) return "";
    for (const k of keys) {
        const v = venta[k];
        if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
}

function formaCuotasLabel(venta) {
    const raw = pickVentaStr(venta, ["FormaCuotas", "formaCuotas"]);
    if (!raw) return "";
    const map = {
        diaria: "Diaria",
        semanal: "Semanal",
        quincenal: "Quincenal",
        mensual: "Mensual"
    };
    const k = raw.toLowerCase();
    return map[k] || (raw.charAt(0).toUpperCase() + raw.slice(1));
}

function estadoCuotaActual(c) {
    const est = String(c.Estado ?? c.estado ?? "").toLowerCase();
    const orig = pickCuotaNum(c, ["MontoOriginal", "montoOriginal"]);
    const rec = pickCuotaNum(c, ["MontoRecargos", "montoRecargos"]);
    const desc = pickCuotaNum(c, ["MontoDescuentos", "montoDescuentos"]);
    const pagado = pickCuotaNum(c, ["MontoPagado", "montoPagado"]);
    const restPick = pickCuotaNum(c, ["MontoRestante", "montoRestante"]);
    const total = orig + rec - desc;
    const rest = restPick || (total - pagado);
    if (est.indexOf("pagad") >= 0 || rest <= 0.5)
        return { key: "pagada", label: "Pagada" };
    const fv = c.FechaVencimiento ?? c.fechaVencimiento;
    if (fv && moment(fv).isValid() && moment(fv).startOf("day").isBefore(moment().startOf("day")))
        return { key: "vencida", label: "Vencida" };
    return { key: "pendiente", label: "Pendiente" };
}

function histFechaCorta(val) {
    const m = moment(val);
    return m.isValid() ? m.format("DD/MM/YYYY") : "—";
}

function renderHistSnapshotCuotas() {
    const cuotas = pickVentaArr(ventaActual, ["Cuotas", "cuotas"])
        .slice()
        .sort((a, b) =>
            (Number(a.NumeroCuota ?? a.numeroCuota) || 0) -
            (Number(b.NumeroCuota ?? b.numeroCuota) || 0)
        );

    const nPlan = Math.round(pickVentaNum(ventaActual, ["CantidadCuotas", "cantidadCuotas"])) || cuotas.length;
    const forma = formaCuotasLabel(ventaActual);
    let totalFin = 0;
    let totalPag = 0;
    let totalDeb = 0;
    let nPagadas = 0;
    cuotas.forEach((c) => {
        const orig = pickCuotaNum(c, ["MontoOriginal", "montoOriginal"]);
        const rec = pickCuotaNum(c, ["MontoRecargos", "montoRecargos"]);
        const desc = pickCuotaNum(c, ["MontoDescuentos", "montoDescuentos"]);
        const pagado = pickCuotaNum(c, ["MontoPagado", "montoPagado"]);
        const restPick = pickCuotaNum(c, ["MontoRestante", "montoRestante"]);
        const total = orig + rec - desc;
        totalFin += total;
        totalPag += pagado;
        totalDeb += restPick || (total - pagado);
        if (estadoCuotaActual(c).key === "pagada") nPagadas += 1;
    });

    let html = `<section class="ve-hist-snap">
        <div class="ve-hist-section-label">Plan de cuotas</div>
        <div class="ve-hist-kpis">
            <article class="ve-hist-kpi">
                <span>Cuotas</span>
                <b>${escapeHist(String(nPlan || 0))}</b>
            </article>
            <article class="ve-hist-kpi ve-hist-kpi-ok">
                <span>Pagadas</span>
                <b>${escapeHist(String(nPagadas))} / ${escapeHist(String(nPlan || 0))}</b>
            </article>
            ${forma ? `<article class="ve-hist-kpi"><span>Forma</span><b>${escapeHist(forma)}</b></article>` : ""}
            <article class="ve-hist-kpi">
                <span>A financiar</span>
                <b>${escapeHist(fmtHistMoney(totalFin))}</b>
            </article>
            <article class="ve-hist-kpi ve-hist-kpi-ok">
                <span>Pagado</span>
                <b>${escapeHist(fmtHistMoney(totalPag))}</b>
            </article>
            <article class="ve-hist-kpi ve-hist-kpi-warn">
                <span>Debe</span>
                <b>${escapeHist(fmtHistMoney(totalDeb))}</b>
            </article>
        </div>`;

    if (!cuotas.length) {
        html += `<div class="ve-hist-empty ve-hist-empty-sm"><span>Esta venta no tiene cuotas cargadas.</span></div></section>`;
        return html;
    }

    html += `<div class="ve-hist-cuotas">`;
    cuotas.forEach((c) => {
        const nro = c.NumeroCuota ?? c.numeroCuota ?? "—";
        const orig = pickCuotaNum(c, ["MontoOriginal", "montoOriginal"]);
        const rec = pickCuotaNum(c, ["MontoRecargos", "montoRecargos"]);
        const desc = pickCuotaNum(c, ["MontoDescuentos", "montoDescuentos"]);
        const pagado = pickCuotaNum(c, ["MontoPagado", "montoPagado"]);
        const restPick = pickCuotaNum(c, ["MontoRestante", "montoRestante"]);
        const total = orig + rec - desc;
        const rest = restPick || (total - pagado);
        const st = estadoCuotaActual(c);
        const fv = c.FechaVencimiento ?? c.fechaVencimiento;
        html += `
            <article class="ve-hist-cuota is-${escapeHist(st.key)}">
                <div class="ve-hist-cuota-top">
                    <h6>Cuota ${escapeHist(String(nro))}</h6>
                    <span class="ve-hist-badge ve-hist-badge-${st.key === "pagada" ? "ok" : (st.key === "vencida" ? "danger" : "warn")}">${escapeHist(st.label)}</span>
                </div>
                <div class="ve-hist-cuota-vence">Vence ${escapeHist(histFechaCorta(fv))}</div>
                <div class="ve-hist-cuota-grid">
                    <div><span>Original</span><b>${escapeHist(fmtHistMoney(orig))}</b></div>
                    <div><span>Recargos</span><b>${escapeHist(fmtHistMoney(rec))}</b></div>
                    <div><span>Descuentos</span><b>${escapeHist(fmtHistMoney(desc))}</b></div>
                    <div><span>Total</span><b>${escapeHist(fmtHistMoney(total))}</b></div>
                    <div><span>Pagado</span><b>${escapeHist(fmtHistMoney(pagado))}</b></div>
                    <div><span>Restante</span><b>${escapeHist(fmtHistMoney(rest))}</b></div>
                </div>
            </article>`;
    });
    html += `</div></section>`;
    return html;
}

function renderHistSnapshotProductos() {
    const items = pickVentaArr(ventaActual, ["Items", "items"]);
    let html = `<section class="ve-hist-snap">
        <div class="ve-hist-section-label">Productos de la venta</div>`;

    if (!items.length) {
        html += `<div class="ve-hist-empty ve-hist-empty-sm"><span>Esta venta no tiene productos cargados.</span></div></section>`;
        return html;
    }

    html += `<div class="ve-hist-prods">`;
    items.forEach((it) => {
        const nom = it.Producto ?? it.producto ?? "Producto";
        const cant = pickCuotaNum(it, ["Cantidad", "cantidad"]);
        const pu = pickCuotaNum(it, ["PrecioUnitario", "precioUnitario"]);
        const subPick = pickCuotaNum(it, ["Subtotal", "subtotal"]);
        const sub = subPick || (cant * pu);
        html += `
            <article class="ve-hist-prod">
                <h6>${escapeHist(nom)}</h6>
                <div class="ve-hist-prod-row">
                    <span>${escapeHist(String(cant))} × ${escapeHist(fmtHistMoney(pu))}</span>
                    <b>${escapeHist(fmtHistMoney(sub))}</b>
                </div>
            </article>`;
    });
    html += `</div></section>`;
    return html;
}

function renderHistTimelineHtml(items) {
    const groups = [];
    const map = {};
    items.forEach((it) => {
        const k = histDiaKey(it.fecha);
        if (!map[k]) {
            map[k] = [];
            groups.push(k);
        }
        map[k].push(it);
    });

    let html = "";
    groups.forEach((k) => {
        html += `<div class="ve-hist-day"><div class="ve-hist-day-label">${escapeHist(histDiaLabel(k))}</div>`;
        map[k].forEach((it) => {
            const campo = it.campo;
            const titulo = tituloEventoHistorialHtml(it);
            const det = detalleEventoHistorial(it);
            const hora = it.fecha && moment(it.fecha).isValid()
                ? moment(it.fecha).format("HH:mm")
                : "";
            const usuario = it._tipo === "RECARGO_LEGACY" ? "" : (it.h.usuario || "");
            const badge = etiquetaEventoHistorial(campo === "RECARGO_LEGACY" ? "RecargoCuota" : campo);
            html += `
                <article class="ve-hist-card tone-${histToneDe(campo)}">
                    <div class="ve-hist-icon"><i class="fa ${histIconoDe(campo)}"></i></div>
                    <div class="ve-hist-main">
                        <div class="ve-hist-top">
                            <span class="${badgeClaseHistorial(campo)}">${escapeHist(badge)}</span>
                            <span class="ve-hist-meta">${hora ? escapeHist(hora) : ""}${usuario ? " · " + escapeHist(usuario) : ""}</span>
                        </div>
                        <h6 class="ve-hist-title">${titulo}</h6>
                        ${det ? `<p class="ve-hist-detail">${escapeHist(det)}</p>` : ""}
                    </div>
                </article>`;
        });
        html += `</div>`;
    });
    return html;
}

function syncHistChips() {
    document.querySelectorAll("#histCatChips .ve-hist-chip").forEach((btn) => {
        const on = btn.getAttribute("data-hist-cat") === histCatFiltro;
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
    });
}

function renderHistFeed() {
    const feed = qs("histCuotaBody");
    if (!feed) return;

    const snap = histCatFiltro === "cuotas"
        ? renderHistSnapshotCuotas()
        : (histCatFiltro === "productos" ? renderHistSnapshotProductos() : "");

    const items = histTimelineCache.filter(it =>
        histPasaFiltroCat(it) && !histEditarVentaRedundante(it)
    );

    const richTab = histCatFiltro === "cuotas" || histCatFiltro === "productos";
    const timelineHtml = items.length ? renderHistTimelineHtml(items) : "";

    if (!snap && !items.length) {
        if (!histTimelineCache.length) {
            feed.innerHTML = `
            <div class="ve-hist-empty">
                <i class="fa fa-clock-o"></i>
                <strong>Sin movimientos</strong>
                <span>Cuando haya cobros, cambios de cobrador o ediciones, van a aparecer acá.</span>
            </div>`;
            return;
        }
        feed.innerHTML = `
            <div class="ve-hist-empty">
                <i class="fa fa-filter"></i>
                <strong>Nada en este filtro</strong>
                <span>Probá con Todos o con otra categoría.</span>
            </div>`;
        return;
    }

    let html = snap || "";
    if (richTab) {
        html += `<div class="ve-hist-section-label">${histCatFiltro === "cuotas" ? "Cambios del plan" : "Cambios de productos"}</div>`;
        html += timelineHtml || `
            <div class="ve-hist-empty ve-hist-empty-sm">
                <span>Todavía no hay cambios en esta pestaña.</span>
            </div>`;
    } else {
        html += timelineHtml;
    }
    feed.innerHTML = html;
}

function abrirHistorialCuota() {

    if (!ventaActual) {
        setCbError("No hay venta seleccionada.");
        return;
    }

    const esAdmin = esAdminHistorialElectro();
    const filtros = qs("histCuotaFiltros");
    const btnCuota = qs("histBtnCuota");
    const btnVenta = qs("histBtnVenta");
    const titulo = qs("histCuotaTitulo");
    const nroCuota = cuotaActual
        ? (cuotaActual.NumeroCuota ?? cuotaActual.numeroCuota)
        : null;
    const hayCuotaContexto = !!(cuotaActual && cuotaActual.Id);

    if (btnCuota) {
        btnCuota.hidden = !hayCuotaContexto;
        btnCuota.classList.toggle("d-none", !hayCuotaContexto);
        btnCuota.disabled = false;
    }
    if (filtros) {
        const mostrarFiltros = esAdmin && hayCuotaContexto;
        filtros.hidden = !mostrarFiltros;
        filtros.classList.toggle("d-none", !mostrarFiltros);
        filtros.classList.toggle("d-flex", mostrarFiltros);
    }

    const verVentaCompleta = histScopeModo === "venta" || !hayCuotaContexto;
    if (titulo) {
        titulo.innerHTML = verVentaCompleta
            ? '<i class="fa fa-clock-o text-info me-2"></i>Movimientos de la venta'
            : ('<i class="fa fa-clock-o text-info me-2"></i>Historial cuota ' + (nroCuota ?? ""));
    }

    btnCuota?.classList.toggle("btn-info", !verVentaCompleta);
    btnCuota?.classList.toggle("btn-outline-info", verVentaCompleta);
    btnVenta?.classList.toggle("btn-info", verVentaCompleta);
    btnVenta?.classList.toggle("btn-outline-info", !verVentaCompleta);

    const histAll = Array.isArray(ventaActual.Historial)
        ? ventaActual.Historial.map(normalizarHistRow)
        : [];

    let movimientos = histAll;
    if (!verVentaCompleta && cuotaActual) {
        const idC = Number(cuotaActual.Id);
        movimientos = histAll.filter(h => {
            const id = h.idCuota == null || h.idCuota === "" ? null : Number(h.idCuota);
            return id === idC;
        });
    }

    movimientos = movimientos.slice().sort((a, b) => {
        const fa = new Date(a.fecha).getTime() || 0;
        const fb = new Date(b.fecha).getTime() || 0;
        if (fa !== fb) return fb - fa;
        return (b.id || 0) - (a.id || 0);
    });

    const recargosLegacy = [];
    const cuotasSrc = verVentaCompleta
        ? (Array.isArray(ventaActual.Cuotas) ? ventaActual.Cuotas : [])
        : (cuotaActual ? [cuotaActual] : []);

    cuotasSrc.forEach((c) => {
        const idC = Number(c.Id ?? c.id);
        const hayAuditRec = histAll.some(h =>
            Number(h.idCuota) === idC &&
            (h.campo === "RecargoCuota" || h.campo === "EliminarRecargoCuota")
        );
        if (hayAuditRec) return;
        const recs = Array.isArray(c.Recargos) ? c.Recargos : [];
        recs.forEach((r) => {
            recargosLegacy.push({
                _tipo: "RECARGO_LEGACY",
                fecha: r.Fecha,
                numeroCuota: c.NumeroCuota ?? c.numeroCuota,
                importe: Number(r.ImporteCalculado || 0),
                obs: r.Observacion || "",
                tipo: r.Tipo,
                campo: "RECARGO_LEGACY",
                cat: "pagos"
            });
        });
    });

    histTimelineCache = movimientos.map(h => ({
        _tipo: "AUDIT",
        h,
        fecha: h.fecha,
        campo: h.campo,
        cat: histCategoriaDe(h.campo)
    })).concat(recargosLegacy);

    histTimelineCache.sort((a, b) => {
        const fa = new Date(a.fecha).getTime() || 0;
        const fb = new Date(b.fecha).getTime() || 0;
        return fb - fa;
    });

    histCatFiltro = "todos";
    syncHistChips();
    renderHistFeed();
    getModal("mdHistorialCuota").show();
}


async function confirmarCobro() {
    setCbError(null);

    if (!ventaActual?.IdVenta || !cuotaActual?.Id) {
        setCbError("Falta venta o cuota.");
        return;
    }

    const importe = formatearSinMiles(qs("cb_importe").value);
    const restante = Number(qs("cb_montoRestante").value || 0);
    let fecha = qs("cb_fecha").value;
    const obs = qs("cb_obs").value || "";

    if (importe > 0) {
        // Fecha real del pago siempre es hoy.
        if (qs("cb_fecha") && (importe >= restante || restante <= 0)) {
            qs("cb_fecha").value = todayISO();
        }
    }

    // ⛔ VALIDACIÓN DE CUOTAS ANTERIORES (MISMA QUE COBROS)
    if ((importe > 0) && !puedeCobrarCuota(ventaActual, cuotaActual?.Id)) {
        showToast("No se puede cobrar esta cuota hasta completar las cuotas anteriores.", "danger");
        return;
    }


    /* =============================
       🔁 CAMBIO DE FECHA
    ============================= */
    if (importe === 0) {

        if (!fecha) {
            setCbError("Seleccioná una fecha válida.");
            return;
        }

        const obsReprog = (obs || "").trim() || "Cambio de fecha de cobro";

        if (typeof ReprogAtrasadas !== "undefined" && ventaActual?.IdCliente && cuotaActual?.Id) {
            try {
                const result = await ReprogAtrasadas.confirmarReprogramacion({
                    idCliente: ventaActual.IdCliente,
                    idVenta: ventaActual.IdVenta,
                    idCuotaActual: cuotaActual.Id,
                    nuevaFecha: fecha,
                    observacion: obsReprog,
                    clienteNombre: ventaActual.ClienteNombre,
                    onRefresh: actualizarGrillaCobros
                });

                if (result.error) {
                    setCbError(result.error);
                    notificarErrorCobrosUi(result.error);
                    return;
                }

                if (result.confirmed && result.applied > 0) {
                    getModal("mdCobro").hide();
                    await actualizarGrillaCobros();

                    if (userSession?.IdRol === 1 || userSession?.IdRol === 4) {
                        const enviar = await confirmarModal(`
                            <div class="text-start px-1">
                                <div class="mb-2 fw-bold">
                                    <i class="fa fa-whatsapp me-1" style="color:#25D366"></i>
                                    Aviso al cliente
                                </div>
                                <div>¿Deseás enviarle por <b>WhatsApp</b> el aviso del <b>cambio de fecha de cobro</b>?</div>
                            </div>
                        `);
                        if (enviar) {
                            await preguntarWhatsappDespuesCobro(cuotaActual.Id, "Reprogramar");
                        }
                    }
                }
                return;
            } catch {
                const m = "Error de conexión al cambiar la fecha.";
                setCbError(m);
                notificarErrorCobrosUi(m);
                return;
            }
        }

        try {
            const body = new URLSearchParams({
                idCuota: String(cuotaActual.Id),
                nuevaFecha: fecha,
                observacion: obsReprog
            });

            const resp = await fetch("/Ventas_Electrodomesticos/ReprogramarCobroCuota", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                body: body.toString()
            });

            const json = await resp.json();
            if (!json || json.success === false) {
                const m = json?.message || "Error al cambiar la fecha.";
                setCbError(m);
                notificarErrorCobrosUi(m);
                return;
            }

            getModal("mdCobro").hide();
            await actualizarGrillaCobros();
            const fechaFmt = moment(fecha).format("DD/MM/YYYY");
            notificarExitoCobrosUi(`Fecha de cobro actualizada a ${fechaFmt}.`);

            if (userSession?.IdRol === 1 || userSession?.IdRol === 4) {
                const enviar = await confirmarModal(`
                    <div class="text-start px-1">
                        <div class="mb-2 fw-bold">
                            <i class="fa fa-whatsapp me-1" style="color:#25D366"></i>
                            Aviso al cliente
                        </div>
                        <div>¿Deseás enviarle por <b>WhatsApp</b> el aviso del <b>cambio de fecha de cobro</b>?</div>
                    </div>
                `);
                if (enviar) {
                    await preguntarWhatsappDespuesCobro(cuotaActual.Id, "Reprogramar");
                }
            }
            return;

        } catch {
            const m = "Error de conexión al cambiar la fecha.";
            setCbError(m);
            notificarErrorCobrosUi(m);
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

    const esParcial = restante > 0 && importe < restante;
    if (esParcial) {
        if (!fecha) {
            setCbError("Seleccioná la próxima fecha de cobro para el saldo pendiente.");
            return;
        }
        if (moment(fecha).isBefore(moment(), "day")) {
            setCbError("La próxima fecha de cobro no puede ser anterior a hoy.");
            return;
        }
    }

    const medio = qs("cb_metodo").value;
    if (!medio) {
        setCbError("Seleccioná un método de pago.");
        return;
    }

    if (esTransferencia(medio)) {

        const comprobante = qs("cb_imagenBase64")?.value;

        if (!comprobante || comprobante.length < 20) {
            setCbError("Debe adjuntar el comprobante de transferencia.");
            return;
        }

        if (!Number(qs("cb_cuenta")?.value || 0)) {
            setCbError("Seleccioná la cuenta bancaria.");
            return;
        }
    }

    const payload = {
        IdVenta: ventaActual.IdVenta,
        FechaPago: todayISO(),
        FechaCobroCuota: esParcial ? fecha : null,
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
        await actualizarGrillaCobros();

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
        } else {
            exitoModal("Cobranza realizada con éxito.");
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

        aplicarModoCobroUI(); // ya lo tenías
        evaluarFechaCobroUI(); // 🔥 NUEVO
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

        clearProgress();
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
    qs("cb_btnHistorial")?.addEventListener("click", () => {
        histScopeModo = "cuota";
        abrirHistorialCuota();
    });
    qs("histBtnCuota")?.addEventListener("click", () => {
        if (!cuotaActual?.Id) return;
        histScopeModo = "cuota";
        abrirHistorialCuota();
    });
    qs("histBtnVenta")?.addEventListener("click", () => {
        histScopeModo = "venta";
        abrirHistorialCuota();
    });
    qs("histCatChips")?.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-hist-cat]");
        if (!btn) return;
        histCatFiltro = btn.getAttribute("data-hist-cat") || "todos";
        syncHistChips();
        renderHistFeed();
    });

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


function showToast(msg, type) {
    if (typeof mostrarToast === "function") {
        mostrarToast(msg, type);
        return;
    }
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

/** Éxito post-cobro/reprogramación: VC.toast en Cobros, showToast si existe, sino exitoModal (layout). */
function notificarExitoCobrosUi(mensaje) {
    if (typeof mostrarToast === "function") {
        mostrarToast(mensaje, "success");
        return;
    }
    if (window.VC && typeof VC.toast === "function") {
        VC.toast(mensaje, "success");
        return;
    }
    if (typeof showToast === "function") {
        showToast(mensaje, "success");
        return;
    }
    if (typeof exitoModal === "function") exitoModal(mensaje);
}

/** Error visible fuera del modal (toast o ErrorModal). */
function notificarErrorCobrosUi(mensaje) {
    if (typeof mostrarToast === "function") {
        mostrarToast(mensaje, "error");
        return;
    }
    if (window.VC && typeof VC.toast === "function") {
        VC.toast(mensaje, "danger");
        return;
    }
    if (typeof showToast === "function") {
        showToast(mensaje, "danger");
        return;
    }
    if (typeof errorModal === "function") errorModal(mensaje);
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
        const idC = idCuota == null || idCuota === "" ? 0 : Number(idCuota);
        cuotaActual = idC > 0
            ? cuotas.find(c => Number(c.Id) === idC)
            : null;

        if (idC > 0 && !cuotaActual) {
            showToast("Cuota no encontrada", "danger");
            return;
        }

        histScopeModo = (idC > 0) ? "cuota" : "venta";
        abrirHistorialCuota();

    } catch (e) {
        console.error(e);
        showToast("Error cargando historial", "danger");
    }
};

window.abrirHistorialVentaCompleto = function (idVenta) {
    return window.abrirHistorialDesdeCobros(idVenta, null);
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

    const money = (v) =>
        Math.round(Number(v || 0)).toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });

    const toInt = (v) => Math.round(Number(v || 0));

    const round1000 = (v) => Math.round((v || 0) / 1000) * 1000;

    let y = 18;

    /* ================= HEADER ================= */
    doc.setFillColor(12, 18, 32);
    doc.rect(0, 0, 210, 30, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("COMPROBANTE DE VENTA", 105, 14, { align: "center" });


    // 🔥 Leyenda legal debajo
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200); // gris suave
    doc.text("Documento no válido como factura", 173, 28, { align: "center" });

    doc.setFontSize(9);
    doc.text(`Nro ${venta.IdVenta}`, 200, 10, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(moment().format("DD/MM/YYYY HH:mm"), 200, 16, { align: "right" });

    y = 38;
    doc.setTextColor(0, 0, 0);

    /* ================= CLIENTE ================= */
    const direccion = [
        venta.ClienteDireccion,
        venta.Localidad,
        venta.Provincia
    ].filter(Boolean).join(" - ");

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(220);
    doc.roundedRect(10, y, 190, 22, 2, 2, "FD");

    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("CLIENTE", 14, y + 6);

    doc.setFont(undefined, "normal");
    doc.setFontSize(11);
    doc.text(venta.ClienteNombre || "-", 14, y + 12);

    if (direccion) {
        doc.setFontSize(9);
        doc.setTextColor(90);
        doc.text(direccion, 14, y + 18);
    }

    y += 28;

    /* ================= PRODUCTOS ================= */
    if (venta.Items?.length) {

        doc.setFont(undefined, "bold");
        doc.setFontSize(11);
        doc.text("Productos", 15, y);
        y += 4;

        doc.autoTable({
            startY: y,
            head: [["Cant", "Producto", "Precio", "Subtotal"]],
            body: venta.Items.map(i => [
                i.Cantidad,
                i.Producto,
                money(i.PrecioUnitario),
                money(toInt(i.Subtotal || (i.Cantidad * i.PrecioUnitario)))
            ]),
            theme: "grid",
            styles: { fontSize: 9 },
            headStyles: { fillColor: [30, 30, 30], textColor: 255 }
        });

        y = doc.lastAutoTable.finalY + 8;
    }

    /* ================= CUOTAS ================= */
    doc.setFont(undefined, "bold");
    doc.setFontSize(11);
    doc.text("Cuotas", 15, y);
    y += 4;

    const cuotas = venta.Cuotas || [];

    doc.autoTable({
        startY: y,
        head: [["#", "Vencimiento", "Original", "Descuentos", "Total", "Pagado", "Restante", "Estado"]],
        body: cuotas.map(c => {

            const original = toInt(c.MontoOriginal);
            const recargos = toInt(c.MontoRecargos);
            const descuentos = toInt(c.MontoDescuentos);
            const pagado = toInt(c.MontoPagado);

            const total = original + recargos - descuentos;
            const restante = Math.max(total - pagado, 0);

            let estado = c.Estado || "Pendiente";
            if (estado !== "Pagada" && moment().isAfter(moment(c.FechaVencimiento))) {
                estado = "Vencida";
            }

            return [
                c.NumeroCuota,
                moment(c.FechaVencimiento).format("DD/MM/YYYY"),
                money(original),
                money(descuentos),
                money(total),
                money(pagado),
                money(restante),
                estado
            ];
        }),
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [20, 20, 20], textColor: 255 }
    });

    y = doc.lastAutoTable.finalY + 10;

    /* ================= RESUMEN (FIX REAL FINAL) ================= */

    let subtotal = 0;
    let totalDescuentos = 0;
    let totalPagado = 0;

    /* 🔹 SUBTOTAL DESDE PRODUCTOS */
    if (venta.Items?.length) {
        venta.Items.forEach(i => {
            const sub = toInt(i.Subtotal || (i.Cantidad * i.PrecioUnitario));
            subtotal += sub;
        });
    }

    /* 🔹 DESCUENTOS Y PAGADO DESDE CUOTAS */
    cuotas.forEach(c => {
        totalDescuentos += toInt(c.MontoDescuentos);
        totalPagado += toInt(c.MontoPagado);
    });

    /* 🔹 SUMAR ENTREGA */
    const entrega = toInt(venta.Entrega);
    totalPagado += entrega;

    /* 🔹 REDONDEO A MILES */
    subtotal = round1000(subtotal);
    totalDescuentos = round1000(totalDescuentos);

    const totalFinal = round1000(subtotal - totalDescuentos);
    totalPagado = round1000(totalPagado);

    const restante = round1000(Math.max(totalFinal - totalPagado, 0));

    const x = 120;

    doc.setDrawColor(180);
    doc.rect(x, y, 80, 40);

    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Resumen", x + 4, y + 6);

    doc.setFont(undefined, "normal");

    doc.text("Subtotal:", x + 4, y + 12);
    doc.text(money(subtotal), x + 75, y + 12, { align: "right" });

    doc.text("Descuentos:", x + 4, y + 18);
    doc.setTextColor(200, 0, 0);
    doc.text("- " + money(totalDescuentos), x + 75, y + 18, { align: "right" });

    doc.setTextColor(0, 0, 0);
    doc.text("Total:", x + 4, y + 24);
    doc.text(money(totalFinal), x + 75, y + 24, { align: "right" });

    doc.text("Pagado:", x + 4, y + 30);
    doc.text(money(totalPagado), x + 75, y + 30, { align: "right" });

    doc.text("Restante:", x + 4, y + 36);
    doc.text(money(restante), x + 75, y + 36, { align: "right" });

    /* ================= FOOTER ================= */
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("Comprobante de venta. Conservar para reclamos.", 105, 290, { align: "center" });

    const nombre = (venta.ClienteNombre || "Cliente")
        .replace(/[^a-zA-Z0-9]/g, "_");

    const fecha = moment(venta.FechaVenta).format("YYYYMMDD");

    doc.save(`Venta_${venta.IdVenta}_${nombre}_${fecha}.pdf`);
}

function toggleModoReprogramacion() {

    const importe = formatearSinMiles(qs("cb_importe").value);
    const esReprogramacion = importe === 0;

    // Fecha se gobierna en evaluarFechaCobroUI (reprogramación / parcial / total)

    // Ocultar grupos de pago
    safeToggle(qs("cb_metodo")?.closest(".col-6, .col-lg-3"), !esReprogramacion);
    safeToggle(qs("cb_wrapCuenta"), !esReprogramacion && esTransferencia(qs("cb_metodo")?.value));
    safeToggle(qs("cb_wrapObs"), !esReprogramacion);
    safeToggle(qs("cb_wrapComprobante"), !esReprogramacion);
    safeToggle(qs("progressBarContainerCobro"), !esReprogramacion && puedeVerMontosCuentasBancarias() && esTransferencia(qs("cb_metodo")?.value));

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

    evaluarFechaCobroUI();
}


async function preguntarWhatsappDespuesCobro(idMovimiento, descripcion) {

    try {
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

        if (base?.success === false) return;
        if (!base || !base.Venta || !base.Cliente?.ClienteTelefono) return;

        const mensaje = armarMensajeWhatsappElectro(base, descripcion, idMovimiento);
        if (!mensaje) {
            console.warn("WhatsApp electro: mensaje vacío", { idMovimiento, descripcion, base });
            if (typeof VC?.toast === "function") {
                VC.toast("No se pudo armar el mensaje de WhatsApp", "warning");
            }
            return;
        }

        abrirWhatsapp(base.Cliente.ClienteTelefono, mensaje);

        const tipoMensaje = obtenerTipoMensajeElectro(descripcion);
        const esAjuste = tipoMensaje === "recargo" || tipoMensaje === "descuento";
        const idMarcado = esAjuste
            ? idMovimiento
            : Number(base.IdPagoActual || idMovimiento);

        const marca = await MakeAjax({
            type: "POST",
            url: "/Ventas_Electrodomesticos/MarcarWhatssapPago",
            async: true,
            data: JSON.stringify({
                id: idMarcado,
                descripcion: descripcion
            }),
            contentType: "application/json",
            dataType: "json"
        });

        if (marca?.success) {
            marcarWhatssapEnRendimientoGrilla(idMarcado);
            if (window.gridRendimiento?.ajax?.reload) {
                gridRendimiento.ajax.reload(null, false);
            }
        }

    } catch (e) {
        console.warn("No se pudo enviar WhatsApp", e);
    }
}

/** Pone el ícono de WhatsApp en verde en Rendimiento (misma fila del cobro). */
function marcarWhatssapEnRendimientoGrilla(idMovimiento) {
    if (!window.gridRendimiento || !idMovimiento) return;

    gridRendimiento.rows().every(function () {
        const d = this.data();
        if (Number(d.Id) === Number(idMovimiento)) {
            d.whatssap = 1;
            this.data(d);
            this.invalidate().draw(false);
        }
    });
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
    if (d.includes("reprogram")) return "reprogramar";

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



function formatearProductosWhatsappElectro(v) {
    if (!Array.isArray(v?.Items) || !v.Items.length) return "";

    let productos = v.Items
        .slice(0, 3)
        .map(i => `• ${i.Cantidad || 1} x ${(i.Producto || "").trim()}`)
        .filter(linea => !linea.endsWith(" x "))
        .join("\n");

    if (v.Items.length > 3) {
        productos += `\n• y otros ${v.Items.length - 3} productos`;
    }

    return productos;
}

function bloqueProductosWhatsappElectro(v, titulo = "Productos") {
    const productos = formatearProductosWhatsappElectro(v);
    if (!productos) return "";
    return `\n📦 *${titulo}:*\n${productos}\n`;
}

function armarMensajeWhatsappElectro(base, descripcion, idPago) {

    if (!base || !base.Venta || !base.Cliente)
        return "";

    const v = base.Venta;

    const tipo = obtenerTipoMensajeElectro(descripcion);

    const nombreCliente = (v.ClienteNombre || "").trim();
    const saldo = formatNumber(v.Restante || 0);
    const bloqueProductos = bloqueProductosWhatsappElectro(v, "Productos");
    const bloqueProductosAdquiridos = bloqueProductosWhatsappElectro(v, "Productos adquiridos");

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

        return `${saludo} ${nombreCliente} 😊

🛒 *VENTA DE ELECTRODOMÉSTICOS*
Le informamos que el día ${fechaVenta} hemos registrado una nueva venta.
${bloqueProductosAdquiridos}
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

        const pagos = Array.isArray(v.Pagos) ? v.Pagos : [];
        let pago = pagos.find(p => Number(p.Id) === Number(idPago))
            || pagos.find(p => Number(p.Id) === Number(base.IdPagoActual))
            || null;

        if (!pago && pagos.length) {
            pago = [...pagos].sort(
                (a, b) => new Date(b.FechaPago || 0) - new Date(a.FechaPago || 0)
            )[0];
        }

        if (!pago) return "";

        const detalles = Array.isArray(pago.Detalles) ? pago.Detalles : [];
        const cuotas = Array.isArray(v.Cuotas) ? v.Cuotas : [];

        let importePagado = 0;
        const cuotasDelPago = [];

        if (detalles.length) {
            detalles.forEach(det => {
                const aplicado = Number(det.ImporteAplicado || 0);
                importePagado += aplicado;
                const cuota = cuotas.find(c => Number(c.Id) === Number(det.IdCuota));
                if (cuota) {
                    cuotasDelPago.push({
                        NumeroCuota: cuota.NumeroCuota,
                        MontoRestante: Number(cuota.MontoRestante || 0),
                        ImporteAplicado: aplicado
                    });
                }
            });
        } else {
            importePagado = Number(pago.ImporteTotal || 0);
        }

        let textoCuotaPagada = "Cuota";
        if (cuotasDelPago.length > 1) {
            textoCuotaPagada = `Cuotas ${cuotasDelPago.map(x => x.NumeroCuota).join(", ")}`;
        } else if (cuotasDelPago.length === 1) {
            textoCuotaPagada = `Cuota ${cuotasDelPago[0].NumeroCuota}`;
        }

        let lineasRestanteCuota = "";
        if (cuotasDelPago.length === 1) {
            const c0 = cuotasDelPago[0];
            lineasRestanteCuota = c0.MontoRestante > 0.009
                ? `💲 *Restante de la cuota:* ${formatNumber(c0.MontoRestante)}\n`
                : `✅ *Cuota ${c0.NumeroCuota} cancelada*\n`;
        } else if (cuotasDelPago.length > 1) {
            lineasRestanteCuota = cuotasDelPago.map(c =>
                c.MontoRestante > 0.009
                    ? `💲 *Restante cuota ${c.NumeroCuota}:* ${formatNumber(c.MontoRestante)}`
                    : `✅ *Cuota ${c.NumeroCuota} cancelada*`
            ).join("\n") + "\n";
        }

        const saldoVenta = formatNumber(v.Restante || 0);
        const cuotasRestantes = cuotas.filter(c => Number(c.MontoRestante || 0) > 0).length;

        return `${saludo} ${nombreCliente} 👋

💳 *COBRO REGISTRADO – ELECTRODOMÉSTICOS*

Se ha registrado correctamente el pago de la *${textoCuotaPagada}*.
${bloqueProductos}
💰 *Importe abonado:* ${formatNumber(importePagado)}
${lineasRestanteCuota}📉 *Saldo pendiente de la venta:* ${saldoVenta}
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

    /* =====================================================
       ============== REPROGRAMACIÓN / FECHA ===============
       ===================================================== */
    if (tipo === "reprogramar") {

        const idCuota = Number(idPago);
        const cuota = Array.isArray(v.Cuotas)
            ? v.Cuotas.find(c => Number(c.Id) === idCuota)
            : null;

        if (!cuota) return "";

        const nroCuota = cuota.NumeroCuota ?? "?";
        const fechaCobro = cuota.FechaCobro
            ? moment(cuota.FechaCobro).format("DD/MM/YYYY")
            : "—";
        const fechaVto = cuota.FechaVencimiento
            ? moment(cuota.FechaVencimiento).format("DD/MM/YYYY")
            : "—";
        const restanteCuota = formatNumber(
            Number(cuota.MontoRestante != null
                ? cuota.MontoRestante
                : (Number(cuota.MontoOriginal || 0) + Number(cuota.MontoRecargos || 0) - Number(cuota.MontoDescuentos || 0) - Number(cuota.MontoPagado || 0)))
        );

        return `${saludo} ${nombreCliente} 👋

📅 *CAMBIO DE FECHA DE COBRO – ELECTRODOMÉSTICOS*

Le informamos que se confirmó la nueva fecha de cobro de su *Cuota ${nroCuota}*.
${bloqueProductos}
📆 *Nueva fecha de cobro:* ${fechaCobro}
📌 *Vencimiento de la cuota:* ${fechaVto}
💲 *Saldo de la cuota:* ${restanteCuota}

Ante cualquier consulta, quedamos a disposición.`;
    }


    return "";
}


function obtenerSaludo() {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return "Buenos días";
    if (h >= 12 && h < 20) return "Buenas tardes";
    return "Buenas noches";
}

async function actualizarGrillaCobros() {

    // 🔹 Pantalla COBROS ELECTRO
    if (window.VC && typeof VC.cargarTabla === "function") {
        await VC.cargarTabla();
        if (typeof VC.cargarCobrosPendientes === "function") {
            await VC.cargarCobrosPendientes();
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
        .filter(h => {
            const campo = h.Campo ?? h.campo;
            if (campo !== "PagoCuota") return false;
            const va = h.ValorAnterior ?? h.valorAnterior;
            const vn = h.ValorNuevo ?? h.valorNuevo;
            const obs = h.Observacion ?? h.observacion;
            const a = parseValorAuditHistorial(va);
            const b = parseValorAuditHistorial(vn);
            const aplic = parseAplicadoDesdeObs(obs);
            return aplic > 0 || b > a;
        })
        .sort((a, b) =>
            new Date(b.FechaCambio ?? b.fechaCambio) - new Date(a.FechaCambio ?? a.fechaCambio)
        )[0];

    if (!ultimoPago)
        return null;

    // 2️⃣ Importe REAL pagado en este cobro
    const obsU = ultimoPago.Observacion ?? ultimoPago.observacion;
    let importePagado = Math.round(parseAplicadoDesdeObs(obsU));
    if (!Number.isFinite(importePagado) || importePagado <= 0) {
        const antes = parseValorAuditHistorial(ultimoPago.ValorAnterior ?? ultimoPago.valorAnterior);
        const ahora = parseValorAuditHistorial(ultimoPago.ValorNuevo ?? ultimoPago.valorNuevo);
        importePagado = Math.round(ahora - antes);
    }

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


let _ventaSeleccionada = null;
let _clienteSeleccionado = null;

function informacionVenta(idVenta, grid) {
    const row = grid
        .row((idx, data) => parseInt(data.IdVenta, 10) === parseInt(idVenta, 10))
        .data();

    if (!row) return;

    const ventaId = parseInt(idVenta, 10);
    const clienteId = parseInt(row.IdCliente, 10);

    // En esta pantalla de cobranzas es electro
    const tipo = "ELECTRO";

    const canVerTodas = Number.isInteger(clienteId) && clienteId > 0;
    const modalEl = document.getElementById('modalInfoSelector');

    if (!modalEl || !canVerTodas) {
        const urlUna = `/Ventas/Informacion?modo=una&ventaId=${encodeURIComponent(ventaId)}&tipo=${encodeURIComponent(tipo)}&from=cobranzas`;
        window.location.href = urlUna;
        return;
    }

    const $modal = new bootstrap.Modal(modalEl);
    $modal.show();

    $('#btnSoloEsta').off('click').on('click', () => {
        $modal.hide();
        const url = `/Ventas/Informacion?modo=una&ventaId=${encodeURIComponent(ventaId)}&tipo=${encodeURIComponent(tipo)}&from=cobranzas`;
        window.location.href = url;
    });

    $('#btnTodasCliente').off('click').on('click', () => {
        $modal.hide();
        const url = `/Ventas/Informacion?modo=todas&clienteId=${encodeURIComponent(clienteId)}&ventaId=${encodeURIComponent(ventaId)}&from=cobranzas`;
        window.location.href = url;
    });
}
