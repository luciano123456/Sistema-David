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
    const t = moment().startOf("day");
    if (!cuota?.FechaVencimiento) return todayISO();
    const v = moment(cuota.FechaVencimiento).startOf("day");
    return (v.isAfter(t) ? v : t).format("YYYY-MM-DD");
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

    const aplicarMinReprogramacion = () => {
        if (importe === 0 && cuotaActual?.FechaVencimiento) {
            inputFecha.min = moment(cuotaActual.FechaVencimiento).format("YYYY-MM-DD");
        } else {
            inputFecha.removeAttribute("min");
        }
    };

    // ===============================
    // 💰 PAGO TOTAL
    // ===============================
    if (importe >= restante && restante > 0) {
        inputFecha.disabled = true;
        inputFecha.classList.add("opacity-50");
        inputFecha.removeAttribute("min");

        // 🔥 opcional: setear hoy igual
        inputFecha.value = todayISO();

        return;
    }

    // ===============================
    // 💸 PARCIAL
    // ===============================
    if (importe > 0 && importe < restante) {
        inputFecha.disabled = false;
        inputFecha.classList.remove("opacity-50");
        inputFecha.removeAttribute("min");

        if (!inputFecha.value) {
            inputFecha.value = defaultFechaCobroCuotaIso(cuotaActual);
        }

        return;
    }

    // ===============================
    // 🔁 REPROGRAMACIÓN (0)
    // ===============================
    if (importe === 0) {
        inputFecha.disabled = false;
        inputFecha.classList.remove("opacity-50");
        aplicarMinReprogramacion();

        if (!inputFecha.value) {
            inputFecha.value = defaultFechaCobroCuotaIso(cuotaActual);
        }

        return;
    }

    // ===============================
    // 🧼 DEFAULT
    // ===============================
    inputFecha.disabled = false;
    inputFecha.classList.remove("opacity-50");
    aplicarMinReprogramacion();

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
            .filter(h => {
                const campo = h.Campo ?? h.campo;
                const idCuota = h.IdCuota ?? h.idCuota;
                return campo === "PagoCuota" && Number(idCuota) === Number(cuotaActual.Id);
            })
            .sort((a, b) => {
                const fa = new Date(a.FechaCambio ?? a.fechaCambio);
                const fb = new Date(b.FechaCambio ?? b.fechaCambio);
                return fa - fb;
            })
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
                <td colspan="7" class="text-center text-muted">
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
        const fa = a._tipo === "PAGO"
            ? new Date(a.h.FechaCambio ?? a.h.fechaCambio)
            : new Date(a.FechaCambio);
        const fb = b._tipo === "PAGO"
            ? new Date(b.h.FechaCambio ?? b.h.fechaCambio)
            : new Date(b.FechaCambio);
        return fa - fb;
    });

    const sumRecTimeline = recargos.reduce(
        (s, r) => s + Math.round(parseMontoFlexible(r.Importe) || 0),
        0
    );
    const orig = pickCuotaNum(cuotaActual, ["MontoOriginal", "montoOriginal"]);
    const desc = pickCuotaNum(cuotaActual, ["MontoDescuentos", "montoDescuentos"]);
    const recField = pickCuotaNum(cuotaActual, ["MontoRecargos", "montoRecargos"]);
    const mp = pickCuotaNum(cuotaActual, ["MontoPagado", "montoPagado"]);
    const mr = pickCuotaNum(cuotaActual, ["MontoRestante", "montoRestante"]);

    // Capital: original - desc + recargos ya reflejados en MontoRecargos pero no duplicados en filas del timeline
    let deuda = Math.round(orig - desc + Math.max(0, recField - sumRecTimeline));
    if (deuda <= 0) {
        const tot = Math.round(mp + mr);
        if (tot > 0) deuda = tot;
    }

    let pagadoAcum = 0;

    const restanteVentaDespuesPago = buildMapRestanteVentaDespuesDePago(ventaActual);

    // =============================
    // 5) RENDER (TU TABLA, MISMO FORMATO)
    // =============================
    timeline.forEach((item, i) => {

        // ---------- PAGO (TU LÓGICA ORIGINAL) ----------
        if (item._tipo === "PAGO") {
            const h = item.h;

            const fechaC = h.FechaCambio ?? h.fechaCambio;
            const fecha = moment(fechaC).format("DD/MM/YYYY HH:mm");

            const va = h.ValorAnterior ?? h.valorAnterior;
            const vn = h.ValorNuevo ?? h.valorNuevo;
            const obsRaw = h.Observacion ?? h.observacion;

            // El back a veces guarda Antes=0 mal; simulamos "MontoPagado antes" recorriendo el tiempo (orden del timeline).
            const valorAnteriorSim = pagadoAcum;
            const ahoraCum = parseValorAuditHistorial(vn);

            // 1) Aplicado= en obs (importe de ESTE movimiento).
            let importePagado = Math.round(parseAplicadoDesdeObs(obsRaw));
            // 2) Si Ahora es acumulado y > lo ya pagado en simulación, la cuota del movimiento es la diferencia.
            if (!Number.isFinite(importePagado) || importePagado <= 0) {
                if (ahoraCum > valorAnteriorSim) {
                    importePagado = Math.round(ahoraCum - valorAnteriorSim);
                }
            }
            // 3) Último recurso: strings del audit (pueden venir con cultura rara).
            if (!Number.isFinite(importePagado) || importePagado <= 0) {
                const antesAudit = parseValorAuditHistorial(va);
                const ahoraAudit = parseValorAuditHistorial(vn);
                importePagado = Math.round(ahoraAudit - antesAudit);
            }

            pagadoAcum = Math.round(pagadoAcum + importePagado);

            const importeActual = Math.max(0, Math.round(deuda - pagadoAcum));

            const hid = h.Id ?? h.id;
            const restVenta =
                restanteVentaDespuesPago.get(hid) ??
                restanteVentaDespuesPago.get(String(hid)) ??
                restanteVentaDespuesPago.get(Number(hid));
            const ventaCell =
                restVenta != null && Number.isFinite(restVenta)
                    ? money(restVenta)
                    : '<span class="text-muted">—</span>';

            // Observación limpia (solo lo útil)
            let obs = "";
            if (obsRaw) {
                obs = String(obsRaw).split("|")[0].trim();
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
                    <td class="text-end">${money(importeActual)}</td>
                    <td class="text-end">${ventaCell}</td>
                    <td>${obs}</td>
                </tr>
            `);

            return;
        }

        // ---------- RECARGO (NUEVO) ----------
        const fechaR = moment(item.FechaCambio).format("DD/MM/YYYY HH:mm");
        const importeRec = Math.round(Number(item.Importe || 0));

        deuda = Math.round(deuda + importeRec);

        const importeActualRec = Math.max(0, Math.round(deuda - pagadoAcum));

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
                <td class="text-end">${money(importeActualRec)}</td>
                <td class="text-end text-muted">—</td>
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

        if (
            cuotaActual?.FechaVencimiento &&
            moment(fecha).isBefore(moment(cuotaActual.FechaVencimiento), "day")
        ) {
            setCbError("La fecha de cobro no puede ser anterior al vencimiento de la cuota.");
            return;
        }

        try {
            const body = new URLSearchParams({
                idCuota: String(cuotaActual.Id),
                nuevaFecha: fecha,
                observacion: (obs || "").trim() || "Cambio de fecha de cobro"
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

/** Éxito post-cobro/reprogramación: VC.toast en Cobros, showToast si existe, sino exitoModal (layout). */
function notificarExitoCobrosUi(mensaje) {
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
    doc.text(`N° ${venta.IdVenta}`, 200, 10, { align: "right" });

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