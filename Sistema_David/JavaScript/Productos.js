let userSession;
let gridVentas = null;
let gridProductos;
let prodImagenesExtra = [];
let prodWspProductoCache = null;
let prodWspClienteNombre = null;
let prodWspClientesMap = {};
let prodImgObserver = null;
const PROD_IMG_DEFAULT = "/Imagenes/productodefault.png";
const PROD_IMG_ENDPOINT = "/Productos/ObtenerImagen/";
var prodImgModalId = 0;
var prodImgModalB64 = "";
var prodImgModalNombre = "";

function prodEsAdmin() {
    return userSession && userSession.IdRol == 1;
}

function prodEsComprobante() {
    return userSession && userSession.IdRol == 4;
}

function prodPuedeMutar() {
    return prodEsAdmin() || prodEsComprobante();
}

function prodPuedeSeleccionar() {
    return prodEsAdmin();
}

var PROD_MSG_PENDIENTE = "Este producto tiene un cambio pendiente";
var PROD_MSG_PISAR = "Tenés cambios pendientes de este producto. ¿Deseás pisarlos?";

function prodFilaPorId(id) {
    if (!gridProductos) return null;
    var found = null;
    gridProductos.rows().every(function () {
        if (found) return;
        var d = this.data();
        if (d && Number(d.Id) === Number(id)) found = d;
    });
    return found;
}

function prodTienePendiente(id) {
    var d = prodFilaPorId(id);
    return !!(d && (d.TienePendiente === true || d.TienePendiente === 1));
}

async function prodPostJson(url, data) {
    return await MakeAjax({
        type: "POST",
        url: url,
        async: true,
        data: JSON.stringify(data || {}),
        contentType: "application/json",
        dataType: "json"
    });
}

async function prodConfirmarPisarPendiente() {
    return await confirmarModal(PROD_MSG_PISAR, {
        textoAceptar: "Aceptar",
        textoCancelar: "Cancelar",
        claseAceptar: "btn-warning"
    });
}

async function prodEnviarCambio(url, payload) {
    payload = payload || {};
    var result = await prodPostJson(url, payload);
    if (result && result.RequiereOverwrite) {
        var okPisar = await prodConfirmarPisarPendiente();
        if (!okPisar) return { cancelled: true };
        payload.ConfirmOverwrite = true;
        result = await prodPostJson(url, payload);
        return { result: result, overwrite: true };
    }
    return { result: result, overwrite: !!payload.ConfirmOverwrite };
}

function prodCitarNombre(nombre) {
    var n = String(nombre == null ? "" : nombre).trim();
    return n ? "«" + n + "»" : "el producto";
}

function prodNombrePorId(id) {
    var d = prodFilaPorId(id);
    if (d && d.Nombre) return d.Nombre;
    var modalNom = document.getElementById("Nombre");
    if (modalNom && String(modalNom.value || "").trim()) return modalNom.value;
    var stockNom = document.getElementById("ProductoStock");
    if (stockNom && String(stockNom.value || "").trim()) return stockNom.value;
    return "";
}

function prodNombresDeIds(ids) {
    var names = [];
    (ids || []).forEach(function (id) {
        var d = prodFilaPorId(id);
        if (d && d.Nombre) names.push(d.Nombre);
    });
    return names;
}

function prodListarNombres(nombres, fallbackCant) {
    if (nombres && nombres.length) {
        return nombres.map(function (n) { return "«" + n + "»"; }).join(", ");
    }
    var n = Number(fallbackCant) || 0;
    return n === 1 ? "1 producto" : n + " productos";
}

function prodToastPendiente(overwrite, accion, nombre) {
    var acc = accion || "el cambio";
    var n = String(nombre == null ? "" : nombre).trim();
    var msg = n
        ? ("Se envió a pendientes " + acc + " de «" + n + "»")
        : ("Se envió a pendientes " + acc);
    if (overwrite) msg += " (se pisó el cambio anterior)";
    mostrarToast(msg + ".", "success");
}

async function prodPrepararOverwrite(id) {
    if (!id || !prodEsComprobante() || !prodTienePendiente(id)) return true;
    return await prodConfirmarPisarPendiente();
}

function prodFormatCeldaMiles(data, type) {
    if (type === "sort" || type === "filter" || type === "type") return data;
    if (data == null || data === "") return "";
    return formatearMiles(data);
}

function prodFormatCeldaMoneda(data, type) {
    if (type === "sort" || type === "filter" || type === "type") return data;
    return formatNumber(data);
}

function prodLeerEntero(id) {
    return formatearSinMiles(document.getElementById(id).value || "0");
}

function prodActualizarKpiStock(total) {
    $("#precioventa").text(formatNumber(total || 0));
}

function prodRecalcularTotalStock(data) {
    if (!data || !data.length) {
        prodActualizarKpiStock(0);
        return;
    }
    var total = 0;
    for (var i = 0; i < data.length; i++) {
        total += data[i].Total || 0;
    }
    prodActualizarKpiStock(total);
}

function prodCargarThumb(img) {
    if (!img || img.getAttribute("data-loaded")) return;
    img.setAttribute("data-loaded", "1");
    var has = img.getAttribute("data-has-img") === "1";
    var id = img.getAttribute("data-prod-id");
    img.addEventListener("load", function () { img.classList.add("is-ready"); }, { once: true });
    img.addEventListener("error", function () {
        img.classList.remove("is-ready");
        if (img.src && img.src.indexOf(PROD_IMG_DEFAULT) < 0)
            img.src = PROD_IMG_DEFAULT;
    }, { once: true });
    if (img.complete && img.naturalWidth) img.classList.add("is-ready");
    if (!has || !id) return;
    var dest = PROD_IMG_ENDPOINT + id;
    if (!img.getAttribute("src") || img.getAttribute("src") === PROD_IMG_DEFAULT)
        img.src = dest;
}

function prodInitLazyImages() {
    var imgs = document.querySelectorAll("#grdProductos img.prod-thumb:not([data-loaded])");
    if (!imgs.length) return;

    if (!window.IntersectionObserver) {
        imgs.forEach(prodCargarThumb);
        return;
    }

    if (!prodImgObserver) {
        prodImgObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                prodCargarThumb(entry.target);
                prodImgObserver.unobserve(entry.target);
            });
        }, { root: null, rootMargin: "120px", threshold: 0.01 });
    }

    imgs.forEach(function (img) {
        prodImgObserver.observe(img);
    });
}

function prodUrlImagenProducto(id) {
    return PROD_IMG_ENDPOINT + id + "?t=" + Date.now();
}

function prodAbrirImagenProducto(id, tieneImagen) {
    prodImgModalId = parseInt(id, 10) || 0;
    prodImgModalB64 = "";
    var fila = prodFilaPorId(prodImgModalId);
    prodImgModalNombre = fila && fila.Nombre ? fila.Nombre : "";
    var hay = (tieneImagen === true || tieneImagen === 1 || tieneImagen === "1" || (fila && fila.TieneImagen));
    var src = hay ? prodUrlImagenProducto(prodImgModalId) : PROD_IMG_DEFAULT;
    prodImgModalMostrar(src, hay);
}

function prodImgModalResetUpload() {
    prodImgModalId = 0;
    prodImgModalB64 = "";
    prodImgModalNombre = "";
    var drop = document.getElementById("prodImgDrop");
    var hint = document.getElementById("prodImgDropHint");
    var btnElegir = document.getElementById("btnProdImgElegir");
    var btnGuardar = document.getElementById("btnProdImgGuardar");
    var file = document.getElementById("prodImgModalFile");
    if (drop) drop.classList.remove("is-uploadable", "is-empty", "is-drag");
    if (hint) hint.querySelector("span") && (hint.querySelector("span").textContent = "Arrastrá una foto o hacé clic para cargarla");
    if (btnElegir) btnElegir.hidden = true;
    if (btnGuardar) btnGuardar.hidden = true;
    if (file) file.value = "";
    var title = document.getElementById("imageModalTitle");
    if (title) title.textContent = "Imagen ampliada";
}

function prodImgModalMostrar(src, hayImagen) {
    var img = document.getElementById("modalImage");
    if (img) img.src = src || PROD_IMG_DEFAULT;
    var drop = document.getElementById("prodImgDrop");
    var btnElegir = document.getElementById("btnProdImgElegir");
    var btnGuardar = document.getElementById("btnProdImgGuardar");
    var title = document.getElementById("imageModalTitle");
    var puede = prodPuedeMutar() && prodImgModalId > 0;
    if (title) {
        title.textContent = prodImgModalNombre
            ? ("Imagen · " + prodImgModalNombre)
            : "Imagen ampliada";
    }
    if (drop) {
        drop.classList.toggle("is-uploadable", puede);
        drop.classList.toggle("is-empty", puede && !hayImagen);
        drop.classList.remove("is-drag");
    }
    if (btnElegir) btnElegir.hidden = !puede;
    if (btnGuardar) {
        btnGuardar.hidden = true;
        btnGuardar.textContent = prodEsComprobante() ? "Enviar a pendientes" : "Guardar";
    }
    $("#imageModal").modal("show");
}

function prodImgModalLeerArchivo(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|jpg)/i.test(file.type) && !/\.(jpe?g|png)$/i.test(file.name || "")) {
        mostrarToast("Usá una imagen JPG o PNG.", "warning");
        return;
    }
    var reader = new FileReader();
    reader.onloadend = function () {
        var raw = String(reader.result || "");
        prodImgModalB64 = raw.replace("data:", "").replace(/^.+,/, "");
        var img = document.getElementById("modalImage");
        if (img) img.src = raw;
        var drop = document.getElementById("prodImgDrop");
        if (drop) drop.classList.remove("is-empty", "is-drag");
        var btnGuardar = document.getElementById("btnProdImgGuardar");
        if (btnGuardar) btnGuardar.hidden = !prodImgModalB64;
    };
    reader.readAsDataURL(file);
}

function prodInitImgModal() {
    var drop = document.getElementById("prodImgDrop");
    var file = document.getElementById("prodImgModalFile");
    var btnElegir = document.getElementById("btnProdImgElegir");
    var btnGuardar = document.getElementById("btnProdImgGuardar");
    if (!drop || !file) return;

    function abrirFile() {
        if (!prodPuedeMutar() || !prodImgModalId) return;
        file.click();
    }

    drop.addEventListener("click", function () {
        abrirFile();
    });
    if (btnElegir) btnElegir.addEventListener("click", abrirFile);
    file.addEventListener("change", function () {
        prodImgModalLeerArchivo(file.files && file.files[0]);
        file.value = "";
    });
    ["dragenter", "dragover"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
            if (!prodPuedeMutar() || !prodImgModalId) return;
            e.preventDefault();
            drop.classList.add("is-drag");
        });
    });
    ["dragleave", "drop"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
            e.preventDefault();
            drop.classList.remove("is-drag");
        });
    });
    drop.addEventListener("drop", function (e) {
        if (!prodPuedeMutar() || !prodImgModalId) return;
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        prodImgModalLeerArchivo(f);
    });
    if (btnGuardar) btnGuardar.addEventListener("click", prodImgModalGuardar);
    $("#imageModal").on("hidden.bs.modal", function () {
        prodImgModalResetUpload();
    });
}

async function prodImgModalGuardar() {
    if (!prodImgModalId || !prodImgModalB64) {
        mostrarToast("Elegí una imagen.", "warning");
        return;
    }
    var okPisar = await prodPrepararOverwrite(prodImgModalId);
    if (!okPisar) return;
    try {
        var sent = await prodEnviarCambio("/Productos/ActualizarImagen", {
            id: prodImgModalId,
            imagen: prodImgModalB64,
            ConfirmOverwrite: prodEsComprobante() && prodTienePendiente(prodImgModalId)
        });
        if (sent && sent.cancelled) return;
        var result = sent && sent.result;
        if (result && result.Status) {
            if (prodEsComprobante()) {
                prodToastPendiente(sent.overwrite || (prodEsComprobante() && prodTienePendiente(prodImgModalId)), "la imagen", prodImgModalNombre);
            } else {
                mostrarToast(prodImgModalNombre
                    ? ("Se actualizó la imagen de «" + prodImgModalNombre + "».")
                    : "Se actualizó la imagen.", "success");
            }
            $("#imageModal").modal("hide");
            if (typeof prodRefreshPendientes === "function") prodRefreshPendientes();
            if (gridProductos) gridProductos.ajax.reload(null, false);
        } else {
            mostrarToast(prodMensajeAmigable(result && result.Mensaje, "No se pudo guardar la imagen."), "error");
        }
    } catch (e) {
        mostrarToast("No se pudo guardar la imagen. Intentá de nuevo.", "error");
    }
}

function prodEscaparHtml(texto) {
    if (!texto) return "";
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function prodFormatearCaracteristicas(texto) {
    if (!texto) return "";
    return String(texto).split(/\r?\n/)
        .map(function (l) { return l.trim(); })
        .filter(Boolean)
        .map(function (l) { return "✔ " + l.replace(/^✔\s*/, ""); })
        .join("\n");
}

function prodArmarBloqueFinanciacion(p) {
    if (!p) return "";
    var out = [];
    if (p.FinConEntrega) out.push("*CON ENTREGA:*\n" + p.FinConEntrega);
    if (p.FinSinEntrega) out.push("*SIN ENTREGA:*\n" + p.FinSinEntrega);
    if (p.FinSemanal) out.push("*CUOTAS SEMANALES:*\n" + p.FinSemanal);
    if (p.FinQuincenal) out.push("*CUOTAS QUINCENALES:*\n" + p.FinQuincenal);
    if (p.FinMensual) out.push("*CUOTAS MENSUALES:*\n" + p.FinMensual);
    return out.join("\n\n");
}

/* ── Calculadora de financiación ── */
var prodCalcPlanDefs = [
    { key: "mensual", label: "Mensual", icon: "fa-calendar", color: "#58a6ff", factor: 1 },
    { key: "quincenal", label: "Quincenal", icon: "fa-calendar-check-o", color: "#20d6a1", factor: 2 },
    { key: "semanal", label: "Semanal", icon: "fa-repeat", color: "#c678ff", factor: 4 }
];

function prodCalcFinId(prefix, name) {
    return "finCalc_" + prefix + "_" + name;
}

function prodCalcFinHtml(prefix) {
    var p = prefix;
    var planRows = prodCalcPlanDefs.map(function (pl) {
        return (
            '<div class="col-12 col-lg-4">' +
            '  <div class="prod-calc-plan" data-plan="' + pl.key + '" style="--calc-accent:' + pl.color + '">' +
            '    <div class="prod-calc-plan-head"><i class="fa ' + pl.icon + '"></i><span>' + pl.label + '</span></div>' +
            '    <label class="prod-field-label">Cant. cuotas</label>' +
            '    <input type="number" min="1" max="240" class="form-control form-control-sm prod-field-input prod-calc-plan-cuotas" id="' + prodCalcFinId(p, "n_" + pl.key) + '" data-plan="' + pl.key + '" value="' + (12 * pl.factor) + '" />' +
            '    <div class="prod-calc-plan-amount" id="' + prodCalcFinId(p, "amt_" + pl.key) + '">$0</div>' +
            '    <div class="prod-calc-plan-meta" id="' + prodCalcFinId(p, "meta_" + pl.key) + '">—</div>' +
            (p === "modal" ? '    <button type="button" class="btn btn-sm btn-outline-light w-100 mt-2 prod-calc-btn-aplicar" data-tipo="' + pl.key + '">Aplicar</button>' : "") +
            '  </div></div>'
        );
    }).join("");

    return (
        '<div class="prod-calc-fin" id="' + prodCalcFinId(p, "root") + '" data-prefix="' + p + '">' +
        '  <div class="prod-calc-head">' +
        '    <div class="prod-calc-head-icon"><i class="fa fa-calculator"></i></div>' +
        '    <div><h6 class="mb-0 text-white">Calculadora de financiación</h6>' +
        '    <small class="text-muted-cc">Elegí plazo base o personalizá cada tipo de cuota. Todo se actualiza al instante.</small></div>' +
        '  </div>' +
        '  <div class="row g-2 prod-calc-inputs">' +
        '    <div class="col-6 col-md-3"><label class="prod-field-label">Precio venta</label>' +
        '      <input type="text" class="form-control form-control-sm prod-field-input miles" id="' + prodCalcFinId(p, "precio") + '" placeholder="0" /></div>' +
        '    <div class="col-6 col-md-3"><label class="prod-field-label">Entrega inicial</label>' +
        '      <input type="text" class="form-control form-control-sm prod-field-input miles" id="' + prodCalcFinId(p, "entrega") + '" placeholder="0" /></div>' +
        '    <div class="col-6 col-md-3"><label class="prod-field-label">Meses referencia</label>' +
        '      <input type="number" min="1" max="60" class="form-control form-control-sm prod-field-input" id="' + prodCalcFinId(p, "meses") + '" value="12" /></div>' +
        '    <div class="col-6 col-md-3"><label class="prod-field-label">Recargo %</label>' +
        '      <input type="number" min="0" max="200" step="0.1" class="form-control form-control-sm prod-field-input" id="' + prodCalcFinId(p, "recargo") + '" value="0" /></div>' +
        '  </div>' +
        '  <div class="prod-calc-chips mt-2">' +
        '    <span class="prod-calc-chip-label">Plazo base:</span>' +
        '    <button type="button" class="prod-calc-chip" data-prefix="' + p + '" data-meses="6">6m</button>' +
        '    <button type="button" class="prod-calc-chip active" data-prefix="' + p + '" data-meses="12">12m</button>' +
        '    <button type="button" class="prod-calc-chip" data-prefix="' + p + '" data-meses="18">18m</button>' +
        '    <button type="button" class="prod-calc-chip" data-prefix="' + p + '" data-meses="24">24m</button>' +
        '    <button type="button" class="prod-calc-chip" data-prefix="' + p + '" data-meses="36">36m</button>' +
        '  </div>' +
        '  <div class="row g-2 mt-2 prod-calc-summary">' +
        '    <div class="col-4"><div class="prod-calc-kpi"><span>Saldo</span><strong id="' + prodCalcFinId(p, "saldo") + '">$0</strong></div></div>' +
        '    <div class="col-4"><div class="prod-calc-kpi"><span>Con recargo</span><strong id="' + prodCalcFinId(p, "totalFin") + '">$0</strong></div></div>' +
        '    <div class="col-4"><div class="prod-calc-kpi prod-calc-kpi--accent"><span>Total</span><strong id="' + prodCalcFinId(p, "totalPagar") + '">$0</strong></div></div>' +
        '  </div>' +
        '  <div class="row g-2 mt-2">' + planRows + '</div>' +
        '  <div class="prod-calc-live mt-3">' +
        '    <div class="prod-calc-live-title"><i class="fa fa-eye me-1"></i> Vista previa del plan</div>' +
        '    <div class="row g-2">' +
        '      <div class="col-md-6"><div class="prod-calc-live-box"><span>Con entrega</span><pre id="' + prodCalcFinId(p, "prev_con") + '">—</pre></div></div>' +
        '      <div class="col-md-6"><div class="prod-calc-live-box"><span>Sin entrega</span><pre id="' + prodCalcFinId(p, "prev_sin") + '">—</pre></div></div>' +
        '      <div class="col-md-4"><div class="prod-calc-live-box"><span>Semanal</span><pre id="' + prodCalcFinId(p, "prev_semanal") + '">—</pre></div></div>' +
        '      <div class="col-md-4"><div class="prod-calc-live-box"><span>Quincenal</span><pre id="' + prodCalcFinId(p, "prev_quincenal") + '">—</pre></div></div>' +
        '      <div class="col-md-4"><div class="prod-calc-live-box"><span>Mensual</span><pre id="' + prodCalcFinId(p, "prev_mensual") + '">—</pre></div></div>' +
        '    </div></div>' +
        '  <div class="prod-calc-actions mt-2">' +
        (p === "modal" ? '    <button type="button" class="btn btn-sm btn-primary" onclick="prodCalcFinAplicarTodos(\'modal\')"><i class="fa fa-magic me-1"></i>Aplicar todo al producto</button>' : "") +
        '    <button type="button" class="btn btn-sm btn-outline-info" onclick="prodCalcFinCopiar(\'' + p + '\')"><i class="fa fa-copy me-1"></i>Copiar plan</button>' +
        '  </div></div>'
    );
}

function prodCalcFinLeerNum(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    return formatearSinMiles(el.value || "0") || 0;
}

function prodCalcFinLeerCuotasPlan(prefix, planKey) {
    var el = document.getElementById(prodCalcFinId(prefix, "n_" + planKey));
    var n = el ? parseInt(el.value, 10) : 0;
    return Math.max(1, Math.min(240, n || 1));
}

function prodCalcFinSetCuotasDesdeMeses(prefix, meses) {
    meses = Math.max(1, Math.min(60, meses));
    prodCalcPlanDefs.forEach(function (pl) {
        var el = document.getElementById(prodCalcFinId(prefix, "n_" + pl.key));
        if (el) el.value = meses * pl.factor;
    });
    var mesesEl = document.getElementById(prodCalcFinId(prefix, "meses"));
    if (mesesEl) mesesEl.value = meses;
}

function prodCalcFinObtenerDatos(prefix) {
    var recargoEl = document.getElementById(prodCalcFinId(prefix, "recargo"));
    if (!recargoEl) return null;

    var precio = prodCalcFinLeerNum(prodCalcFinId(prefix, "precio"));
    var entrega = prodCalcFinLeerNum(prodCalcFinId(prefix, "entrega"));
    var recargo = parseFloat(recargoEl.value) || 0;
    var saldo = Math.max(0, precio - entrega);
    var saldoRec = recargo > 0 ? saldo * (1 + recargo / 100) : saldo;

    var resultados = prodCalcPlanDefs.map(function (pl) {
        var cuotas = prodCalcFinLeerCuotasPlan(prefix, pl.key);
        var importe = cuotas > 0 ? Math.ceil(saldoRec / cuotas) : 0;
        return {
            key: pl.key,
            label: pl.label,
            icon: pl.icon,
            color: pl.color,
            cuotas: cuotas,
            importe: importe,
            total: importe * cuotas + entrega
        };
    });

    return {
        precio: precio, entrega: entrega, recargo: recargo,
        resultados: resultados, saldo: saldo, saldoRec: saldoRec,
        totalPagar: entrega + saldoRec
    };
}

function prodCalcFinRender(prefix, data) {
    if (!data) return;

    var saldoEl = document.getElementById(prodCalcFinId(prefix, "saldo"));
    if (saldoEl) saldoEl.textContent = formatNumber(data.saldo);
    var totalFinEl = document.getElementById(prodCalcFinId(prefix, "totalFin"));
    if (totalFinEl) totalFinEl.textContent = formatNumber(data.saldoRec);
    var totalPagarEl = document.getElementById(prodCalcFinId(prefix, "totalPagar"));
    if (totalPagarEl) totalPagarEl.textContent = formatNumber(data.totalPagar);

    data.resultados.forEach(function (r) {
        var amt = document.getElementById(prodCalcFinId(prefix, "amt_" + r.key));
        var meta = document.getElementById(prodCalcFinId(prefix, "meta_" + r.key));
        if (amt) amt.textContent = formatNumber(r.importe);
        if (meta) meta.textContent = r.cuotas + " cuotas · Total " + formatNumber(r.total);
    });

    prodCalcFinRenderPreview(prefix, data);
}

function prodCalcFinRenderPreview(prefix, data) {
    if (!data) return;
    var setPre = function (id, txt) {
        var el = document.getElementById(prodCalcFinId(prefix, id));
        if (el) el.textContent = txt || "—";
    };
    setPre("prev_con", prodCalcFinTextoConEntrega(prefix, data));
    setPre("prev_sin", prodCalcFinTextoSinEntrega(prefix, data));
    setPre("prev_semanal", prodCalcFinTextoPlan(prefix, "semanal", data));
    setPre("prev_quincenal", prodCalcFinTextoPlan(prefix, "quincenal", data));
    setPre("prev_mensual", prodCalcFinTextoPlan(prefix, "mensual", data));
}

function prodCalcFinCalcular(prefix) {
    var data = prodCalcFinObtenerDatos(prefix);
    prodCalcFinRender(prefix, data);
    return data;
}

function prodCalcFinBuscarResultado(resultados, tipo) {
    if (!resultados) return null;
    for (var i = 0; i < resultados.length; i++) {
        if (resultados[i].key === tipo) return resultados[i];
    }
    return null;
}

function prodCalcFinLabelCuotas(tipo) {
    if (tipo === "semanal") return "semanales";
    if (tipo === "quincenal") return "quincenales";
    return "mensuales";
}

function prodCalcFinTextoPlan(prefix, tipo, dataOpt) {
    var data = dataOpt || prodCalcFinObtenerDatos(prefix);
    if (!data) return "";
    var r = prodCalcFinBuscarResultado(data.resultados, tipo);
    if (!r) return "";

    var lineas = [];
    if (data.entrega > 0) lineas.push("Entrega inicial: $" + formatearMiles(data.entrega));
    lineas.push(r.cuotas + " cuotas " + prodCalcFinLabelCuotas(tipo) + " de $" + formatearMiles(r.importe));
    lineas.push("Total: $" + formatearMiles(r.total));
    if (data.recargo > 0) lineas.push("Recargo: " + data.recargo + "%");
    return lineas.join("\n");
}

function prodCalcFinTextoConEntrega(prefix, dataOpt) {
    var data = dataOpt || prodCalcFinObtenerDatos(prefix);
    if (!data) return "";
    var mensual = prodCalcFinBuscarResultado(data.resultados, "mensual");
    if (!mensual) return "";
    var lineas = ["*CON ENTREGA*"];
    if (data.entrega > 0) lineas.push("Entrega: $" + formatearMiles(data.entrega));
    lineas.push(mensual.cuotas + " cuotas mensuales de $" + formatearMiles(mensual.importe));
    lineas.push("Total: $" + formatearMiles(mensual.total));
    return lineas.join("\n");
}

function prodCalcFinTextoSinEntrega(prefix, dataOpt) {
    var data = dataOpt || prodCalcFinObtenerDatos(prefix);
    if (!data) return "";
    var mensual = prodCalcFinBuscarResultado(data.resultados, "mensual");
    if (!mensual) return "";
    var importe = mensual.cuotas > 0 ? Math.ceil((data.saldoRec || 0) / mensual.cuotas) : 0;
    var lineas = ["*SIN ENTREGA*"];
    lineas.push(mensual.cuotas + " cuotas mensuales de $" + formatearMiles(importe));
    lineas.push("Total: $" + formatearMiles(importe * mensual.cuotas));
    return lineas.join("\n");
}

function prodCalcFinAplicar(prefix, tipo) {
    try {
        if (prefix === "modal" && !prodPuedeMutar()) {
            mostrarToast("No tenés permiso para guardar la financiación en el producto.", "warning");
            return;
        }
        var map = { semanal: "FinSemanal", quincenal: "FinQuincenal", mensual: "FinMensual" };
        var id = map[tipo];
        if (!id) return;
        var data = prodCalcFinObtenerDatos(prefix);
        var texto = prodCalcFinTextoPlan(prefix, tipo, data);
        if (!texto || !data.precio) {
            mostrarToast("Completá el precio de venta antes de aplicar.", "warning");
            return;
        }
        document.getElementById(id).value = texto;
        mostrarToast("Aplicado en cuotas " + tipo, "success");
    } catch (e) {
        mostrarToast("No se pudo aplicar el plan.", "error");
    }
}

function prodCalcFinAplicarTodos(prefix) {
    try {
        if (!prodPuedeMutar()) {
            mostrarToast("No tenés permiso para guardar la financiación en el producto.", "warning");
            return;
        }
        var data = prodCalcFinObtenerDatos(prefix);
        if (!data || !data.precio) {
            mostrarToast("Completá el precio de venta antes de aplicar.", "warning");
            return;
        }
        document.getElementById("FinSemanal").value = prodCalcFinTextoPlan(prefix, "semanal", data);
        document.getElementById("FinQuincenal").value = prodCalcFinTextoPlan(prefix, "quincenal", data);
        document.getElementById("FinMensual").value = prodCalcFinTextoPlan(prefix, "mensual", data);
        document.getElementById("FinConEntrega").value = prodCalcFinTextoConEntrega(prefix, data);
        document.getElementById("FinSinEntrega").value = prodCalcFinTextoSinEntrega(prefix, data);
        mostrarToast("Financiación aplicada en todos los campos", "success");
    } catch (e) {
        mostrarToast("No se pudo aplicar la financiación.", "error");
    }
}

function prodCalcFinCopiar(prefix) {
    var data = prodCalcFinObtenerDatos(prefix);
    if (!data) return;
    var partes = ["*PLAN DE FINANCIACIÓN*"];
    if (data.entrega > 0) partes.push("Entrega: $" + formatearMiles(data.entrega));
    data.resultados.forEach(function (r) {
        partes.push(r.label + ": " + r.cuotas + " x $" + formatearMiles(r.importe));
    });
    var txt = partes.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { mostrarToast("Plan copiado", "success"); });
    } else {
        confirmarModal(
            '<div class="text-start">Copiá el plan:</div><pre class="text-white text-start mt-2 mb-0" style="white-space:pre-wrap">' + prodEscaparHtml(txt) + "</pre>",
            { titulo: "Plan de financiación", textoAceptar: "Aceptar", textoCancelar: "Cancelar" }
        );
    }
}

function prodCalcFinSetPrecio(prefix, precio) {
    var el = document.getElementById(prodCalcFinId(prefix, "precio"));
    if (!el) return;
    el.value = precio ? formatearMiles(precio) : "";
    prodCalcFinCalcular(prefix);
}

function prodCalcFinMount(prefix, mountSelector, producto) {
    var $mount = $(mountSelector);
    if (!$mount.length) return;
    $mount.html(prodCalcFinHtml(prefix));
    prodInitCalculadoraFin(prefix, producto);
}

function prodInitCalculadoraFin(prefix, producto) {
    var root = document.getElementById(prodCalcFinId(prefix, "root"));
    if (!root) return;

    prodCalcFinSetCuotasDesdeMeses(prefix, 12);

    if (producto && producto.PrecioVenta) {
        prodCalcFinSetPrecio(prefix, producto.PrecioVenta);
    } else {
        prodCalcFinCalcular(prefix);
    }

    ["precio", "entrega", "meses", "recargo"].forEach(function (name) {
        var el = document.getElementById(prodCalcFinId(prefix, name));
        if (!el || el._prodCalcBound) return;
        el._prodCalcBound = true;
        el.addEventListener("input", function () {
            if (name === "meses") prodCalcFinSetCuotasDesdeMeses(prefix, parseInt(el.value, 10) || 12);
            prodCalcFinCalcular(prefix);
        });
        el.addEventListener("change", function () {
            if (name === "meses") prodCalcFinSetCuotasDesdeMeses(prefix, parseInt(el.value, 10) || 12);
            prodCalcFinCalcular(prefix);
        });
    });

    $(root).find(".prod-calc-plan-cuotas").each(function () {
        if (this._prodCalcBound) return;
        this._prodCalcBound = true;
        this.addEventListener("input", function () { prodCalcFinCalcular(prefix); });
        this.addEventListener("change", function () { prodCalcFinCalcular(prefix); });
    });

    $(root).find(".prod-calc-chip").off("click.prodCalc").on("click.prodCalc", function () {
        var meses = $(this).data("meses");
        var p = $(this).data("prefix");
        prodCalcFinSetCuotasDesdeMeses(p, meses);
        $(root).find(".prod-calc-chip").removeClass("active");
        $(this).addClass("active");
        prodCalcFinCalcular(p);
    });

    $(document).off("click.prodCalcAplicar", ".prod-calc-btn-aplicar").on("click.prodCalcAplicar", ".prod-calc-btn-aplicar", function (e) {
        e.preventDefault();
        e.stopPropagation();
        prodCalcFinAplicar("modal", $(this).data("tipo"));
    });

    aplicarSeparadorMilesAlEscribir("#" + prodCalcFinId(prefix, "precio") + ", #" + prodCalcFinId(prefix, "entrega"));
}

function prodObtenerSaludoWhatsapp() {
    var h = new Date().getHours();
    if (h >= 5 && h < 12) return "Buenos días";
    if (h >= 12 && h < 20) return "Buenas tardes";
    return "Buenas noches";
}

function prodPrimerNombre(nombre) {
    if (!nombre) return "";
    return String(nombre).trim().split(/\s+/)[0];
}

function prodLimpiarFinanciacionCliente(texto) {
    if (!texto) return "";
    return String(texto)
        .split(/\r?\n/)
        .filter(function (line) {
            var t = line.trim();
            return !t || !/^Total\s*:/i.test(t);
        })
        .join("\n")
        .trim();
}

function prodArmarMensajeWhatsapp(p, nombreCliente) {
    if (!p) return "";

    var lineas = [];
    var detalles = [];
    var financiacion = [];
    var nombre = prodPrimerNombre(nombreCliente);

    if (nombre) {
        lineas.push(prodObtenerSaludoWhatsapp() + " " + nombre + ",");
        lineas.push("a continuación te enviamos la información del producto solicitado.");
    } else {
        lineas.push("¡Hola! 👋");
        lineas.push("A continuación te enviamos la información del producto solicitado.");
    }

    lineas.push("");
    lineas.push("✨ *" + (p.Nombre || "Producto") + "* ✨");

    if (p.Marca) detalles.push("• *Marca:* " + p.Marca);
    if (p.Modelo) detalles.push("• *Modelo:* " + p.Modelo);
    if (p.Color) detalles.push("• *Color:* " + p.Color);
    if (p.Accesorios) detalles.push("• *Incluye:* " + p.Accesorios);

    if (detalles.length) {
        lineas.push("");
        lineas.push("📌 *Detalles del producto*");
        lineas.push(detalles.join("\n"));
    }

    var textoComercial = p.Descripcion ? String(p.Descripcion).trim() : "";
    var caracteristicas = prodFormatearCaracteristicas(p.Caracteristicas);
    if (textoComercial || caracteristicas) {
        lineas.push("");
        lineas.push("✅ *Características*");
        if (textoComercial) lineas.push(textoComercial);
        if (textoComercial && caracteristicas) lineas.push("");
        if (caracteristicas) lineas.push(caracteristicas);
    }

    var tienePlanMensualEnBloques = !!(p.FinConEntrega || p.FinSinEntrega);

    if (p.FinConEntrega) {
        financiacion.push(prodLimpiarFinanciacionCliente(p.FinConEntrega.trim()));
    }

    if (p.FinSinEntrega) {
        financiacion.push(prodLimpiarFinanciacionCliente(p.FinSinEntrega.trim()));
    }

    if (p.FinSemanal) {
        financiacion.push(prodLimpiarFinanciacionCliente(p.FinSemanal.trim()));
    }

    if (p.FinQuincenal) {
        financiacion.push(prodLimpiarFinanciacionCliente(p.FinQuincenal.trim()));
    }

    if (p.FinMensual && !tienePlanMensualEnBloques) {
        financiacion.push(prodLimpiarFinanciacionCliente(p.FinMensual.trim()));
    }

    if (financiacion.length) {
        lineas.push("");
        lineas.push("━━━━━━━━━━━━━━━━");
        lineas.push("💸 *Opciones de financiación*");
        lineas.push(financiacion.join("\n\n"));
    }

    lineas.push("");
    lineas.push("📲 Consultanos por stock, colores disponibles o cualquier duda.");

    return lineas.join("\n");
}

function prodRegenerarMensajeWsp() {
    if (!prodWspProductoCache) return;
    $("#wspMensaje").val(prodArmarMensajeWhatsapp(prodWspProductoCache, prodWspClienteNombre));
}

function prodSeleccionarClienteWsp(c) {
    if (!c) return;
    prodWspClienteNombre = c.Nombre || "";
    if (c.Telefono) {
        $("#wspTelefono").val(String(c.Telefono).replace(/\D/g, "").slice(-10));
    }
    prodRegenerarMensajeWsp();
}

function prodFormatearEtiquetaClienteWsp(c) {
    return (c.Apellido || "") + ", " + (c.Nombre || "") + " — DNI " + (c.Dni || "");
}

function prodInitWspClienteSelect2() {
    if (!window.jQuery || !jQuery.fn || !jQuery.fn.select2) return;

    var $el = $("#wspCliente");
    if (!$el.length) return;

    if ($el.hasClass("select2-hidden-accessible")) {
        $el.off("change.prodWsp");
        $el.select2("destroy");
    }

    $el.select2({
        width: "100%",
        placeholder: "Buscar cliente por nombre, apellido o DNI...",
        allowClear: true,
        dropdownParent: $("#modalWspProducto"),
        matcher: select2MatcherBusquedaLibre
    });

    $el.on("change.prodWsp", function () {
        var id = $(this).val();
        if (!id) {
            prodWspClienteNombre = null;
            $("#wspTelefono").val("");
            prodRegenerarMensajeWsp();
            return;
        }
        var c = prodWspClientesMap[id];
        if (c) prodSeleccionarClienteWsp(c);
    });
}

async function prodCargarClientesWspSelect() {
    prodWspClientesMap = {};

    var idVendedor = (userSession && userSession.IdRol == 2) ? userSession.Id : -1;
    var url = "/Clientes/Listar?idVendedor=" + encodeURIComponent(idVendedor)
        + "&Nombre=&Apellido=&Dni=&idZona=-1";

    var result = await MakeAjax({
        type: "GET",
        url: url,
        async: true,
        dataType: "json"
    });

    var $ddl = $("#wspCliente");
    if ($ddl.hasClass("select2-hidden-accessible")) {
        $ddl.off("change.prodWsp");
        $ddl.select2("destroy");
    }

    $ddl.empty();
    $ddl.append('<option value=""></option>');

    (result && result.data ? result.data : []).forEach(function (c) {
        if (!c || !c.Id) return;
        prodWspClientesMap[c.Id] = c;
        $ddl.append(
            $("<option></option>")
                .val(c.Id)
                .text(prodFormatearEtiquetaClienteWsp(c))
        );
    });

    prodInitWspClienteSelect2();
    $ddl.val(null).trigger("change");
}

function prodResetWspModal() {
    prodWspClienteNombre = null;
    $("#wspTelefono").val("");
    $("#wspCliente").val(null).trigger("change");
}
function prodActualizarPreviewDescripcion() {
    var p = {
        Nombre: $("#Nombre").val(),
        Marca: $("#Marca").val(),
        Modelo: $("#Modelo").val(),
        Color: $("#Color").val(),
        Accesorios: $("#Accesorios").val(),
        Caracteristicas: $("#Caracteristicas").val(),
        Descripcion: $("#Descripcion").val(),
        PrecioVenta: formatearSinMiles($("#PrecioVenta").val() || "0")
    };
    $("#previewDescripcion").text(prodArmarMensajeWhatsapp(p));
}

function prodRenderGaleriaExtra() {
    var $gal = $("#galeriaExtra");
    $gal.empty();
    prodImagenesExtra.forEach(function (b64, idx) {
        var src = "data:image/jpeg;base64," + b64;
        $gal.append(
            '<div class="prod-gallery-item">' +
            '<img src="' + src + '" onclick="openModal(\'' + src + '\')" />' +
            '<button type="button" class="prod-gallery-remove" onclick="prodQuitarImagenExtra(' + idx + ')">&times;</button>' +
            '</div>'
        );
    });
}

function prodQuitarImagenExtra(idx) {
    prodImagenesExtra.splice(idx, 1);
    prodRenderGaleriaExtra();
}

function prodPayloadExtended() {
    return {
        Marca: $("#Marca").val(),
        Modelo: $("#Modelo").val(),
        Color: $("#Color").val(),
        Accesorios: $("#Accesorios").val(),
        Caracteristicas: $("#Caracteristicas").val(),
        Descripcion: $("#Descripcion").val(),
        FinConEntrega: $("#FinConEntrega").val(),
        FinSinEntrega: $("#FinSinEntrega").val(),
        FinSemanal: $("#FinSemanal").val(),
        FinQuincenal: $("#FinQuincenal").val(),
        FinMensual: $("#FinMensual").val(),
        ImagenesExtra: prodImagenesExtra
    };
}

function prodBuildProductoPayload(conId) {
    var payload = {
        Codigo: "",
        Nombre: (document.getElementById("Nombre").value || "").trim(),
        Imagen: document.getElementById("imgProd").value || "",
        idCategoria: null,
        Stock: prodLeerEntero("Stock"),
        PrecioCompra: formatearSinMiles(document.getElementById("PrecioCompra").value),
        PrecioVenta: formatearSinMiles(document.getElementById("PrecioVenta").value),
        PorcVenta: prodLeerEntero("PorcVenta"),
        DiasVencimiento: prodLeerEntero("DiasVencimiento")
    };
    if (conId) {
        payload.Id = parseInt(document.getElementById("IdProducto").value, 10) || 0;
    }
    return Object.assign(payload, prodPayloadExtended());
}

function prodValidarProductoPayload(payload) {
    if (!payload.Nombre) return "Ingresá el nombre del producto.";
    return "";
}

function prodMensajeAmigable(msg, fallback) {
    var texto = (msg || "").toString().trim();
    var generico = fallback || "No se pudo completar la operación. Intentá de nuevo.";
    if (!texto) return generico;
    if (/exception|sql|edmx|column|entity framework|invalid column|system\.|object reference|nullreference|innerexception|stack trace|timeout expired|the given key/i.test(texto))
        return generico;
    return texto;
}

function prodMostrarErrorProducto(msg) {
    var $err = $("#datosProducto");
    $err.text(prodMensajeAmigable(msg, "Ha ocurrido un error.")).removeClass("d-none");
}

function prodOcultarErrorProducto() {
    $("#datosProducto").addClass("d-none").text("");
}

function prodCargarCamposExtendidos(p) {
    $("#Marca").val(p.Marca || "");
    $("#Modelo").val(p.Modelo || "");
    $("#Color").val(p.Color || "");
    $("#Accesorios").val(p.Accesorios || "");
    $("#Caracteristicas").val(p.Caracteristicas || "");
    $("#Descripcion").val(p.Descripcion || "");
    $("#FinConEntrega").val(p.FinConEntrega || "");
    $("#FinSinEntrega").val(p.FinSinEntrega || "");
    $("#FinSemanal").val(p.FinSemanal || "");
    $("#FinQuincenal").val(p.FinQuincenal || "");
    $("#FinMensual").val(p.FinMensual || "");
    prodImagenesExtra = (p.ImagenesExtra && p.ImagenesExtra.length) ? p.ImagenesExtra.slice() : [];
    prodRenderGaleriaExtra();
    prodActualizarPreviewDescripcion();
    prodCalcFinSetPrecio("modal", p.PrecioVenta);
}

function prodLimpiarCamposExtendidos() {
    $("#Marca,#Modelo,#Color,#Accesorios,#Caracteristicas,#Descripcion").val("");
    $("#FinConEntrega,#FinSinEntrega,#FinSemanal,#FinQuincenal,#FinMensual").val("");
    prodImagenesExtra = [];
    prodRenderGaleriaExtra();
    $("#previewDescripcion").text("");
}

function prodResetTabs() {
    var el = document.querySelector('#productoModal .prod-tabs a[href="#tabProdGeneral"]');
    if (el && typeof bootstrap !== "undefined" && bootstrap.Tab) {
        bootstrap.Tab.getOrCreateInstance(el).show();
    }
}

function prodMostrarCarga(msg) {
    if (typeof mostrarCargaTablas === "function") {
        window._prodCargaToken = mostrarCargaTablas(msg || "Cargando tablas...", {
            abort: function () {
                if (typeof abortarAjaxDataTable === "function") abortarAjaxDataTable("#grdProductos");
            }
        });
    }
}

function prodOcultarCarga() {
    if (typeof ocultarCargaTablas === "function") ocultarCargaTablas(window._prodCargaToken);
}

function prodTablaEnDomVisible() {
    var el = document.getElementById("grdProductos");
    if (!el) return false;
    if (document.body.classList.contains("prod-mode-cards")) return false;
    if (document.body.classList.contains("prod-sec-pendientes") || document.body.classList.contains("prod-sec-historial")) return false;
    return $(el).is(":visible");
}

function prodAdjustColumnsSafe() {
    if (!gridProductos || !prodTablaEnDomVisible()) return;
    try { gridProductos.columns.adjust(); } catch (e) { }
}

$(document).ready(function () {
    userSession = JSON.parse(localStorage.getItem('usuario')) || {};
    configurarDataTable();
    prodInitImgModal();
    $("#btnProductos").css("background", "#2E4053");

    if (prodEsAdmin()) {
        document.getElementById("btnImportarDatos").removeAttribute("hidden");
        document.getElementById("divStock").removeAttribute("hidden");
        var btnStock = document.getElementById("btnStockGeneral");
        if (btnStock) btnStock.removeAttribute("hidden");
        var btnStockMenu = document.getElementById("btnStockGeneralMenu");
        if (btnStockMenu) btnStockMenu.removeAttribute("hidden");
        var btnImpMenu = document.getElementById("btnImportarMenu");
        if (btnImpMenu) btnImpMenu.removeAttribute("hidden");
        var tabs = document.getElementById("prodSecTabs");
        if (tabs) tabs.removeAttribute("hidden");
        document.body.classList.remove("prod-no-multisel");
    } else {
        $("#prodDropMas").addClass("d-none");
        $("#prodSecPendientes, #prodSecHistorial").remove();
        var tabsOff = document.getElementById("prodSecTabs");
        if (tabsOff) tabsOff.setAttribute("hidden", "hidden");
        document.body.classList.add("prod-no-multisel");
        var selWrap = document.getElementById("prodSelWrap");
        if (selWrap) selWrap.setAttribute("hidden", "hidden");
    }

    if (prodPuedeMutar()) {
        document.getElementById("btnNuevo").removeAttribute("hidden");
    }

    if (prodEsComprobante()) {
        $(".prod-admin-field").addClass("d-none");
        $("#prodHintPendiente").removeClass("d-none");
        $("#prodPendHint").remove();
    }

    prodInitVista();
    prodMostrarCarga("Cargando tablas...");

    $("#Caracteristicas, #Descripcion, #Nombre, #Marca, #Modelo, #Color, #Accesorios, #PrecioVenta").on("input", function () {
        prodActualizarPreviewDescripcion();
        if (this.id === "PrecioVenta") {
            prodCalcFinSetPrecio("modal", formatearSinMiles($("#PrecioVenta").val() || "0"));
        }
    });

    prodCalcFinMount("modal", "#prodCalcModalMount", null);

    $("#ImagenesExtraInput").on("change", function (e) {
        var files = e.target.files;
        if (!files || !files.length) return;
        Array.from(files).forEach(function (file) {
            var reader = new FileReader();
            reader.onloadend = function () {
                var b64 = reader.result.replace("data:", "").replace(/^.+,/, "");
                prodImagenesExtra.push(b64);
                prodRenderGaleriaExtra();
            };
            reader.readAsDataURL(file);
        });
        e.target.value = "";
    });

    aplicarSeparadorMilesAlEscribir(".miles");

    $(document).on("click", "#btnWspClienteClear", function () {
        prodResetWspModal();
    });
});

function configurarFiltrosPorColumnaProductos() {
    if (!gridProductos) return;

    const columnConfigProductos = [
        { index: 1, filterType: "text" },
        { index: 2, filterType: "text" },
        { index: 3, filterType: "text" },
        { index: 4, filterType: "text" },
        { index: 5, filterType: "text" },
        { index: 6, filterType: "text" },
        { index: 7, filterType: "text" }
    ];

    inicializarFiltrosColumnas(gridProductos, columnConfigProductos, "productos_col_filters_v3");
}

async function configurarDataTable() {
    var $tbl = $("#grdProductos");
    if (!$tbl.length) return;

    $("#grdProductos thead tr.filters").remove();
    inicializarEncabezadoColumnas("#grdProductos");

    var ocultasComprobante = prodEsComprobante() ? [3, 4, 6] : [];
    var columnDefsProd = [
        { "render": prodFormatCeldaMiles, "targets": [2, 6, 7] },
        { "render": prodFormatCeldaMoneda, "targets": [3, 4, 5] },
        { "visible": false, "targets": [8].concat(ocultasComprobante) }
    ];

    gridProductos = $tbl.DataTable({
        "ajax": {
            "url": "/Productos/Listar",
            "type": "GET",
            "dataType": "json",
            "dataSrc": function (json) {
                prodOcultarCarga();
                if (json && json.error) {
                    mostrarToast(prodMensajeAmigable(json.error, "No se pudieron cargar los productos. Intentá de nuevo."), "error");
                }
                if (json.totalStock != null) {
                    prodActualizarKpiStock(json.totalStock);
                } else if (json.data) {
                    prodRecalcularTotalStock(json.data);
                }
                return json.data || [];
            },
            "error": function (xhr, status) {
                if (status === "abort") return;
                prodOcultarCarga();
                try { configurarOpcionesColumnas(); } catch (e) { }
            }
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        "lengthMenu": DT_LENGTH_MENU,
        "pageLength": 25,
        "paging": true,
        "deferRender": true,
        "searchDelay": 350,
        "order": [[8, 'desc']],
        scrollX: false,
        scrollY: false,
        scrollCollapse: false,
        autoWidth: true,
        orderCellsTop: true,
        createdRow: function (row, data) {
            if (data && (data.TienePendiente === true || data.TienePendiente === 1)) {
                $(row).addClass("prod-row-pendiente");
                row.title = PROD_MSG_PENDIENTE;
            }
        },
        "columns": [
            {
                "data": "Id",
                "render": function (data, type, full) {
                    var hasImg = full.TieneImagen ? "1" : "0";
                    var src = hasImg === "1" ? (PROD_IMG_ENDPOINT + data) : PROD_IMG_DEFAULT;
                    return '<img class="prod-thumb img-thumbnail" ' +
                        'data-prod-id="' + data + '" data-has-img="' + hasImg + '" ' +
                        'src="' + src + '" width="45" height="45" ' +
                        'loading="lazy" decoding="async" alt="" ' +
                        'onclick="prodAbrirImagenProducto(' + data + ',' + hasImg + ')" />';
                }
            },
            { "data": "Nombre", "render": function (data, type, full) {
                if (type !== "display") return data;
                var pendiente = full && (full.TienePendiente === true || full.TienePendiente === 1);
                var txt = prodEscaparHtml(data || "");
                if (!pendiente) return txt;
                return '<span class="prod-name-pendiente" title="' + PROD_MSG_PENDIENTE + '">' +
                    '<i class="fa fa-hourglass-half prod-pend-ico" aria-hidden="true"></i> ' + txt + "</span>";
            } },
            { "data": "Stock" },
            { "data": "PrecioCompra" },
            { "data": "Total" },
            { "data": "PrecioVenta" },
            { "data": "PorcVenta" },
            { "data": "DiasVencimiento" },
            { "data": "Activo", "visible": false },
            {
                "data": "Id",
                "render": function (data, type, full) {
                    var activo = Number(full.Activo) === 1;
                    var color = activo ? "success" : "danger";
                    var titulo = activo ? "Desactivar" : "Activar";
                    var estadoInverso = activo ? 0 : 1;

                    var iconWsp = "<button class='btn btn-sm btn-wsp btnacciones prod-action-btn' type='button' onclick='abrirWhatsappProducto(" + data + ")' title='WhatsApp'><i class='fa fa-whatsapp text-white'></i></button>";

                    var iconHist = prodEsAdmin() ?
                        "<button class='btn btn-sm btn-info btnacciones prod-action-btn' type='button' onclick='prodAbrirHistorialProducto(" + data + ")' title='Historial'><i class='fa fa-clock-o text-white'></i></button>" : "";

                    var iconEditar = prodPuedeMutar() ?
                        "<button class='btn btn-sm btneditar btnacciones prod-action-btn' type='button' onclick='editarProducto(" + data + ")' title='Editar'><i class='fa fa-pencil-square-o text-white'></i></button>" : "";

                    var iconStock = prodPuedeMutar() ?
                        "<button class='btn btn-sm btneditar btnacciones prod-action-btn' type='button' onclick='editarStock(" + data + ")' title='Editar Stock'><i class='fa fa-arrows-v text-white'></i></button>" : "";

                    var iconEliminar = prodPuedeMutar() ?
                        "<button class='btn btn-sm btn-danger btnacciones prod-action-btn' type='button' onclick='eliminarProducto(" + data + ")' title='Eliminar'><i class='fa fa-trash text-white'></i></button>" : "";

                    var iconEstado = prodPuedeMutar() ?
                        "<button class='btn btn-sm btn-" + color + " btnacciones prod-action-btn prod-btn-estado' type='button' onclick='cambiarEstadoProducto(" + data + ", " + estadoInverso + ")' title='" + titulo + "'><i class='fa fa-power-off text-white'></i></button>" : "";

                    return "<div class='prod-actions-cell'>" + iconWsp + iconHist + iconEstado + iconStock + iconEditar + iconEliminar + "</div>";
                },
                "orderable": false,
                "searchable": false
            }
        ],

        "columnDefs": columnDefsProd,

        "initComplete": function () {
            prodOcultarCarga();
            try {
                configurarOpcionesColumnas();
                configurarFiltrosPorColumnaProductos();
                prodInitLazyImages();
            } catch (e) { }
        },
        "drawCallback": function () {
            try {
                prodInitLazyImages();
                prodRenderCardsDesdeTabla();
            } catch (e) { }
        }
    });

    configurarOpcionesColumnas();

    $('#grdProductos tbody').on('click', 'tr', function (e) {
        if ($(e.target).closest("button, a, input, select, .btnacciones, .rp-filter-input, .rp-filter-select").length) return;

        $('#grdProductos tbody tr').removeClass('seleccionada');
        $(this).addClass('seleccionada');
    });
}


const cambiarEstadoProducto = async (id, estado) => {
    var verboEstado = estado == 1 ? "activar" : "desactivar";
    var okEstado = await confirmarModal(
        "¿Confirmás " + verboEstado + " este producto?",
        {
            textoAceptar: "Aceptar",
            textoCancelar: "Cancelar",
            claseAceptar: estado == 1 ? "btn-success" : "btn-warning"
        }
    );
    if (!okEstado) return;

    try {
            var overwrite = false;
            if (!(await prodPrepararOverwrite(id))) return;
            if (prodEsComprobante() && prodTienePendiente(id)) overwrite = true;

            let resultWrap = await prodEnviarCambio("/Productos/EditarActivo", {
                id: id,
                activo: estado,
                ConfirmOverwrite: overwrite
            });
            if (resultWrap.cancelled) return;
            let result = resultWrap.result;

            var nombreEst = prodNombrePorId(id);
            var accEst = estado == 1 ? "la activación" : "la desactivación";
            if (result && result.Status) {
                if (result.Pendiente) {
                    prodToastPendiente(resultWrap.overwrite || overwrite, accEst, nombreEst);
                    if (typeof prodRefreshPendientes === "function") prodRefreshPendientes();
                } else {
                    mostrarToast((estado == 1 ? "Se activó " : "Se desactivó ") + prodCitarNombre(nombreEst) + ".", "success");
                }
                const table = $('#grdProductos').DataTable();
                table.ajax.reload(null, false);
            } else {
                mostrarToast(prodMensajeAmigable(result && result.Mensaje, "No se pudo " + verboEstado + " " + prodCitarNombre(nombreEst) + ". Intentá de nuevo."), "error");
            }
    } catch (error) {
        mostrarToast("No se pudo cambiar el estado de " + prodCitarNombre(prodNombrePorId(id)) + ". Intentá de nuevo.", "error");
    }
}

const eliminarProducto = async id => {
    try {
        const okEliminar = await confirmarModal("¿Seguro desea eliminar este producto?", {
            textoAceptar: "Aceptar",
            textoCancelar: "Cancelar",
            claseAceptar: "btn-danger"
        });
        if (!okEliminar) return;

            if (!(await prodPrepararOverwrite(id))) return;
            var overwriteDel = prodEsComprobante() && prodTienePendiente(id);
            const resultWrap = await prodEnviarCambio("/Productos/Eliminar", { Id: id, ConfirmOverwrite: overwriteDel });
            if (resultWrap.cancelled) return;
            const result = resultWrap.result;

            var nombreDel = prodNombrePorId(id);
            if (result.TieneStock) {
                const mensaje = result.Mensaje + "\n\n" + result.Detalle.join("\n");
                mostrarToast(mensaje, "error");
                return;
            }

            if (result.Status) {
                if (result.Pendiente) {
                    prodToastPendiente(resultWrap.overwrite || overwriteDel, "la eliminación", nombreDel);
                    if (typeof prodRefreshPendientes === "function") prodRefreshPendientes();
                } else {
                    mostrarToast("Se eliminó " + prodCitarNombre(nombreDel) + ".", "success");
                }
                const table = $('#grdProductos').DataTable();
                table.ajax.reload();
            } else {
                mostrarToast(prodMensajeAmigable(result && result.Mensaje, "No se pudo eliminar " + prodCitarNombre(nombreDel) + ". Intentá de nuevo."), "error");
            }
    } catch (error) {
        mostrarToast("No se pudo eliminar " + prodCitarNombre(prodNombrePorId(id)) + ". Intentá de nuevo.", "error");
    }
};




const editarProducto = async id => {

    try {
        var url = "/Productos/EditarInfo";

        let value = JSON.stringify({
            Id: id
        });

        let options = {
            type: "POST",
            url: url,
            async: true,
            data: value,
            contentType: "application/json",
            dataType: "json"
        };

        let result = await MakeAjax(options);



        if (result != null && result.Producto) {

            $("#productoModal").modal("show");
            prodResetTabs();
            $('.datos-error').text('')

            document.getElementById("IdProducto").value = result.Producto.Id;
            document.getElementById("Nombre").value = result.Producto.Nombre;
            document.getElementById("imgProd").value = result.Producto.Imagen;
            document.getElementById("Stock").value = formatearMiles(result.Producto.Stock);
            document.getElementById("PrecioCompra").value = formatearMiles(result.Producto.PrecioCompra);
            document.getElementById("PrecioVenta").value = formatearMiles(result.Producto.PrecioVenta);
            document.getElementById("PorcVenta").value = formatearMiles(result.Producto.PorcVenta);
            document.getElementById("DiasVencimiento").value = formatearMiles(result.Producto.DiasVencimiento);
            prodCargarCamposExtendidos(result.Producto);
            document.getElementById("btnRegistrarModificar").textContent = prodEsComprobante() ? "Enviar a pendientes" : "Modificar";
            document.getElementById("productoModalLabel").textContent = "Modificar " + document.getElementById("Nombre").value;

            if (result.Producto.Imagen != null && result.Producto.Imagen !== "") {
                $("#imgProducto").attr("src", "data:image/png;base64," + result.Producto.Imagen).css("display", "block");
            } else {
                $("#imgProducto").attr("src", "").css("display", "none");
            }

        } else {
            mostrarToast(prodMensajeAmigable(result && result.Mensaje, "No se pudo cargar el producto. Intentá de nuevo."), "error");
        }
    } catch (error) {
        mostrarToast("No se pudo cargar el producto. Intentá de nuevo.", "error");
    }
}




async function AccionBtn() {
    if (!prodPuedeMutar()) {
        mostrarToast("No tienes permisos para realizar esta accion.", "error");
        return false;
    }
    var id = document.getElementById("IdProducto").value;
    if (!id) await registrarProducto();
    else await modificarProducto();
}

async function registrarProducto() {
    try {
        prodOcultarErrorProducto();
        var payload = prodBuildProductoPayload(false);
        var validErr = prodValidarProductoPayload(payload);
        if (validErr) {
            prodMostrarErrorProducto(validErr);
            return;
        }

        let result = await MakeAjax({
            type: "POST",
            url: "/Productos/Nuevo",
            async: true,
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json"
        });

        var nombreNuevo = payload && payload.Nombre;
        if (result && result.Status) {
            $("#productoModal").modal("hide");
            if (result.Pendiente) {
                prodToastPendiente(false, "el alta", nombreNuevo);
                if (typeof prodRefreshPendientes === "function") prodRefreshPendientes();
            } else {
                mostrarToast("Se agregó " + prodCitarNombre(nombreNuevo) + ".", "success");
            }
            $("#grdProductos").DataTable().ajax.reload();
        } else {
            prodMostrarErrorProducto(prodMensajeAmigable(result && result.Mensaje, "No se pudo registrar el producto. Revisá los datos e intentá de nuevo."));
        }
    } catch (error) {
        prodMostrarErrorProducto("No se pudo registrar el producto. Revisá los datos e intentá de nuevo.");
    }
}

async function modificarProducto() {
    try {
        prodOcultarErrorProducto();
        var payload = prodBuildProductoPayload(true);
        var validErr = prodValidarProductoPayload(payload);
        if (validErr) {
            prodMostrarErrorProducto(validErr);
            return;
        }

        if (!(await prodPrepararOverwrite(payload.Id))) return;
        if (prodEsComprobante() && prodTienePendiente(payload.Id)) payload.ConfirmOverwrite = true;

        let sent = await prodEnviarCambio("/Productos/Editar", payload);
        if (sent.cancelled) return;
        let result = sent.result;

        var nombreEdit = (payload && payload.Nombre) || prodNombrePorId(payload && payload.Id);
        if (result && result.Status) {
            $("#productoModal").modal("hide");
            if (result.Pendiente) {
                prodToastPendiente(sent.overwrite || payload.ConfirmOverwrite, "la edición", nombreEdit);
                if (typeof prodRefreshPendientes === "function") prodRefreshPendientes();
            } else {
                mostrarToast("Se modificó " + prodCitarNombre(nombreEdit) + ".", "success");
            }
            $("#grdProductos").DataTable().ajax.reload(null, false);
        } else {
            prodMostrarErrorProducto(prodMensajeAmigable(result && result.Mensaje, "No se pudo guardar el producto. Intentá otra vez."));
        }
    } catch (error) {
        prodMostrarErrorProducto("No se pudo guardar el producto. Intentá otra vez.");
    }
}

function abrirmodal() {

    $("#productoModal").modal('show');
    prodResetTabs();
    document.getElementById("IdProducto").value = ""
    document.getElementById("Nombre").value = ""
    document.getElementById("imgProd").value = ""
    document.getElementById("Stock").value = ""
    document.getElementById("PrecioCompra").value = ""
    document.getElementById("PrecioVenta").value = ""
    document.getElementById("PorcVenta").value = ""
    document.getElementById("DiasVencimiento").value = "";
    prodLimpiarCamposExtendidos();
    prodCalcFinSetPrecio("modal", 0);
    document.getElementById("FinConEntrega").value = "";
    document.getElementById("FinSinEntrega").value = "";
    document.getElementById("btnRegistrarModificar").textContent = prodEsComprobante() ? "Enviar a pendientes" : "Registrar";
    document.getElementById("productoModalLabel").textContent = "Registrar nuevo producto";
    $("#imgProducto").attr("src", "").css("display", "none");
};




// get a reference to the file input

const fileInput = document.getElementById("Imagen");


// listen for the change event so we can capture the file
fileInput.addEventListener("change", (e) => {
    var files = e.target.files
    let base64String = "";
    let baseTotal = "";

    // get a reference to the file
    const file = e.target.files[0];

  

    // encode the file using the FileReader API
    const reader = new FileReader();
    reader.onloadend = () => {
        // use a regex to remove data url part

        base64String = reader.result
            .replace("data:", "")
            .replace(/^.+,/, "");

       
        var inputImg = document.getElementById("imgProd");
        inputImg.value = base64String;

        $("#imgProducto").removeAttr('hidden');
        $("#imgProducto").attr("src", "data:image/png;base64," + base64String);

    };

    reader.readAsDataURL(file);

}
);

function abrirmodalimportacionmasiva() {
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        mostrarToast("No tienes permisos para realizar esta accion.", "error")
        return false;
    }
    $("#modalImportacionMasiva").modal("show");
}

async function enviarImportacionMasiva() {
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        mostrarToast("No tienes permisos para realizar esta accion.", "error")
        return false;
    }
    try {
        var url = "/Productos/GuardarDatos";
        var model = new FormData();
        model.append("File", $('#fileImportacionMasiva')[0].files[0]);
        model.append("Name", "Name");
        $.ajax({
            type: "post",
            url: url,
            data: model,
            processData: false,
            contentType: false,
            success: function (data, textStatus) {
                if (data == "True") {
                    $("#modalImportacionMasiva").modal("hide");
                    mostrarToast("Los productos han sido registrados con exito.", "success")
                    const table = $('#grdProductos').DataTable();
                    table.ajax.reload();
                } else {

                    $("#modalImportacionMasiva").modal("hide");
                    mostrarToast("Ha ocurrido un error con los datos.", "error")
                }

            },
            error: function (data, textStatus) {
                mostrarToast("Ha ocurrido un error, consulte a un Administrador.", "error")
            }
        });


    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

//ACCIONES AL APRETAR ENTER
document.getElementById('Nombre').addEventListener('keydown', inputNombre);
function inputNombre(event) {
    if (event.keyCode == 13) {
        document.getElementById('Stock').focus();
    }
}

document.getElementById('Stock').addEventListener('keydown', inputStock);
function inputStock(event) {
    if (event.keyCode == 13) {
        document.getElementById('PrecioCompra').focus();
    }
}

document.getElementById('PrecioCompra').addEventListener('keydown', inputPrecioCompra);
function inputPrecioCompra(event) {
    if (event.keyCode == 13) {
        document.getElementById('PrecioVenta').focus();
    }
}

document.getElementById('PrecioVenta').addEventListener('keydown', inputPrecioVenta);
function inputPrecioVenta(event) {
    if (event.keyCode == 13) {
        document.getElementById('PorcVenta').focus();
    }
}

function openModal(imageSrc) {
    prodImgModalResetUpload();
    prodImgModalMostrar(imageSrc, true);
}



// Función para cargar la imagen del producto de manera asíncrona
function cargarImagenProducto(idProducto) {
    $.ajax({
        url: '/Productos/ObtenerImagen/' + idProducto,
        type: 'GET',
        success: function (response) {
            if (response.imagen) {
                $('#img_' + idProducto).attr('src', 'data:image/png;base64,' + response.imagen);
            }
        },
        error: function () {
            console.log('Error al cargar la imagen del producto ' + idProducto);
        }
    });
}


function abrirstockGeneral() {
    document.location.href = "../../Stock/General/";
}

function configurarOpcionesColumnas() {
    if (!gridProductos) return;
    const grid = gridProductos;
    const columnas = grid.settings().init().columns;
    const container = $("#configColumnasMenu");
    if (!container.length) return;

    const storageKey = "Productos_Columnas";
    let savedConfig = {};
    try { savedConfig = JSON.parse(localStorage.getItem(storageKey) || "{}") || {}; } catch (e) { savedConfig = {}; }
    container.empty();

    const titulos = ["Imagen", "Nombre", "Stock", "Precio Compra", "Total", "Precio Venta", "Porc. Venta", "Días vencimiento", "Activo", "Acciones"];

    columnas.forEach((col, index) => {
        if (index === 8 || index === 9) return;
        if (prodEsComprobante() && (index === 3 || index === 4 || index === 6)) return;

        const isChecked = savedConfig["col_" + index] !== undefined ? savedConfig["col_" + index] : true;
        try { grid.column(index).visible(!!isChecked); } catch (e) { }

        var tituloCol = (index === 0) ? "Imagen" : (titulos[index] || col.data || ("Col " + index));

        container.append(
            '<li><label class="dropdown-item">' +
            '<input type="checkbox" class="toggle-column" data-column="' + index + '"' + (isChecked ? " checked" : "") + "> " +
            tituloCol +
            "</label></li>"
        );
    });

    container.find(".toggle-column").off("change.prodCol").on("change.prodCol", function () {
        const columnIdx = parseInt($(this).data("column"), 10);
        const isChecked = $(this).is(":checked");
        savedConfig["col_" + columnIdx] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));
        try { grid.column(columnIdx).visible(isChecked); } catch (e) { }
        prodAdjustColumnsSafe();
    });
}

const editarStock = async id => {

    try {
        var url = "/Productos/EditarInfo";

        let value = JSON.stringify({
            Id: id
        });

        let options = {
            type: "POST",
            url: url,
            async: true,
            data: value,
            contentType: "application/json",
            dataType: "json"
        };

        let result = await MakeAjax(options);



        if (result != null && result.Producto) {

            // Ocultar los campos y botones adicionales (Cantidad Nueva, Quitar, Agregar)
            $("#CantidadNuevaStock").show();
            $("#btnQuitar").show();
            $("#btnAgregar").show();
            $("#lblAgregarQuitar").show();
            $("#CantidadStock").prop('disabled', true);

            document.getElementById("nuevoStockModalLabel").textContent = "Editar Stock"

           
            $("#nuevoStockModal").modal("show");
            $("#btnRegistrarModificar").text("Editar");


            $("#ProductoStock").val(result.Producto.Nombre);
            $("#IdProductoStock").val(id);



            $("#CantidadStock").val(formatearMiles(result.Producto.Stock));
            $("#CantidadNuevaStock").val(formatearMiles(1));


            

        } else {
            mostrarToast(prodMensajeAmigable(result && result.Mensaje, "No se pudo cargar el producto. Intentá de nuevo."), "error");
        }
    } catch (error) {
        mostrarToast("No se pudo cargar el producto. Intentá de nuevo.", "error");
    }
}

async function agregarStockCantidad() {
    try {
        var idStock = parseInt(document.getElementById("IdProductoStock").value, 10) || 0;
        if (!(await prodPrepararOverwrite(idStock))) return;
        var overwriteStock = prodEsComprobante() && prodTienePendiente(idStock);
        var sent = await prodEnviarCambio("/Productos/AgregarStockCantidad", {
            Cantidad: prodLeerEntero("CantidadNuevaStock"),
            Id: idStock,
            ConfirmOverwrite: overwriteStock
        });
        if (sent.cancelled) return;
        var result = sent.result;

        var nombreStock = prodNombrePorId(idStock) || ($("#ProductoStock").val() || "");
        var cantStock = prodLeerEntero("CantidadNuevaStock");
        if (result && result.Status) {
            $("#nuevoStockModal").modal("hide");
            if (result.Pendiente) {
                prodToastPendiente(sent.overwrite || overwriteStock, "el agregado de stock", nombreStock);
                if (typeof prodRefreshPendientes === "function") prodRefreshPendientes();
            } else {
                mostrarToast("Se agregó stock (" + formatearMiles(cantStock) + ") a " + prodCitarNombre(nombreStock) + ".", "success");
            }
            const table = $('#grdProductos').DataTable();
            table.ajax.reload();
        } else {
            mostrarToast(prodMensajeAmigable(result && result.Mensaje, "No se pudo agregar stock a " + prodCitarNombre(nombreStock) + ". Intentá de nuevo."), "error");
        }
    } catch (error) {
        mostrarToast("No se pudo agregar stock a " + prodCitarNombre($("#ProductoStock").val()) + ". Intentá de nuevo.", "error");
    }
}

async function restarStockCantidad() {
    try {
        var idStockR = parseInt(document.getElementById("IdProductoStock").value, 10) || 0;
        if (!(await prodPrepararOverwrite(idStockR))) return;
        var overwriteStockR = prodEsComprobante() && prodTienePendiente(idStockR);
        var sentR = await prodEnviarCambio("/Productos/RestarStockCantidad", {
            Cantidad: prodLeerEntero("CantidadNuevaStock"),
            Id: idStockR,
            ConfirmOverwrite: overwriteStockR
        });
        if (sentR.cancelled) return;
        var result = sentR.result;

        var nombreStockR = prodNombrePorId(idStockR) || ($("#ProductoStock").val() || "");
        var cantStockR = prodLeerEntero("CantidadNuevaStock");
        if (result && result.Status) {
            $("#nuevoStockModal").modal("hide");
            if (result.Pendiente) {
                prodToastPendiente(sentR.overwrite || overwriteStockR, "el restado de stock", nombreStockR);
                if (typeof prodRefreshPendientes === "function") prodRefreshPendientes();
            } else {
                mostrarToast("Se restó stock (" + formatearMiles(cantStockR) + ") de " + prodCitarNombre(nombreStockR) + ".", "success");
            }
             const table = $('#grdProductos').DataTable();
                table.ajax.reload();
        } else {
            mostrarToast(prodMensajeAmigable(result && result.Mensaje, "No se pudo restar stock de " + prodCitarNombre(nombreStockR) + ". Intentá de nuevo."), "error");
        }
    } catch (error) {
        mostrarToast("No se pudo restar stock de " + prodCitarNombre($("#ProductoStock").val()) + ". Intentá de nuevo.", "error");
    }
}


function borrarImagen() {
    const input = document.getElementById("Imagen");
    const img = document.getElementById("imgProducto");
    const p = document.getElementById("imgProd");

    input.value = "";
    p.value = "";
    img.src = "";
    img.style.display = "none";
}

async function abrirWhatsappProducto(id) {
    try {
        var result = await MakeAjax({
            type: "GET",
            url: "/Productos/ObtenerDetalle?id=" + id,
            async: true,
            dataType: "json"
        });
        if (!result || !result.Status || !result.Producto) {
            mostrarToast("No se pudo cargar el producto.", "error");
            return;
        }
        var p = result.Producto;
        prodWspProductoCache = p;
        prodWspClienteNombre = null;
        $("#wspIdProducto").val(p.Id);
        $("#wspNombreProducto").text(p.Nombre || "");
        prodRegenerarMensajeWsp();

        await prodCargarClientesWspSelect();
        prodResetWspModal();

        var $gal = $("#wspGaleriaPreview");
        $gal.empty();
        var imgs = [];
        if (p.Imagen) {
            imgs.push(PROD_IMG_ENDPOINT + p.Id);
        } else {
            imgs.push(PROD_IMG_DEFAULT);
        }
        if (p.ImagenesExtra && p.ImagenesExtra.length) {
            p.ImagenesExtra.forEach(function (b) {
                imgs.push("data:image/jpeg;base64," + b);
            });
        }
        imgs.forEach(function (src) {
            $gal.append('<div class="prod-gallery-item"><img src="' + src + '" loading="lazy" decoding="async" onclick="openModal(\'' + src + '\')" /></div>');
        });

        $("#modalWspProducto").modal("show");
    } catch (e) {
        mostrarToast("Error al abrir WhatsApp.", "error");
    }
}

function prodNormalizarTelefonoWspLink(tel) {
    var numeros = String(tel || "").replace(/\D/g, "");
    if (!numeros) return "";

    numeros = numeros.replace(/^0+/, "");
    if (numeros.startsWith("54")) return numeros;
    if (numeros.length > 10) numeros = numeros.slice(-10);

    return "549" + numeros;
}

function enviarWhatsappProducto() {
    var tel = ($("#wspTelefono").val() || "").trim();
    var mensaje = ($("#wspMensaje").val() || "").trim();

    if (!tel) {
        mostrarToast("Ingresá un celular válido o seleccioná un cliente.", "error");
        return;
    }

    if (!mensaje) {
        mostrarToast("El mensaje está vacío.", "error");
        return;
    }

    var telefono = prodNormalizarTelefonoWspLink(tel);
    if (!telefono) {
        mostrarToast("Ingresá un celular válido.", "error");
        return;
    }

    var urlwsp = "https://api.whatsapp.com/send?phone=+" + telefono + "&text=" + encodeURIComponent(mensaje);
    window.open(urlwsp, "_blank");
    $("#modalWspProducto").modal("hide");
}

var PROD_VISTA_KEY = "productos_vista_v1";
var prodCardChip = "todos";
var prodCardQuery = "";
var prodSelectedIds = {};
var prodLastSelId = null;

function prodLeerVista() {
    try {
        var v = localStorage.getItem(PROD_VISTA_KEY);
        if (v === "cards" || v === "tabla") return v;
    } catch (e) { }
    return window.matchMedia("(max-width: 992px)").matches ? "cards" : "tabla";
}

function prodGuardarVista(v) {
    try { localStorage.setItem(PROD_VISTA_KEY, v); } catch (e) { }
}

function prodAplicarVista(vista, persist) {
    var v = (vista === "tabla") ? "tabla" : "cards";
    document.body.classList.toggle("prod-mode-cards", v === "cards");
    document.body.classList.toggle("prod-mode-tabla", v === "tabla");
    $("#btnProdVistaCards").toggleClass("is-on", v === "cards");
    $("#btnProdVistaTabla").toggleClass("is-on", v === "tabla");
    if (persist !== false) prodGuardarVista(v);
    if (v === "cards") prodRenderCardsDesdeTabla();
    else setTimeout(prodAdjustColumnsSafe, 50);
    if (gridProductos) {
        try { gridProductos.draw(false); } catch (e) { }
    }
}

function prodCardIconBtn(cls, title, onclick, icon) {
    return '<button type="button" class="prod-icon-btn ' + cls + '" title="' + title + '" aria-label="' + title + '" onclick="' + onclick + '"><i class="fa ' + icon + '"></i></button>';
}

function prodSelCount() {
    return Object.keys(prodSelectedIds).length;
}

function prodSelSet(id, on) {
    var key = String(id);
    if (on) prodSelectedIds[key] = true;
    else delete prodSelectedIds[key];
}

function prodSelClear() {
    prodSelectedIds = {};
    prodLastSelId = null;
}

function prodCardsVisibles() {
    return Array.prototype.slice.call(document.querySelectorAll("#prodCardsGrid .prod-card:not(.is-hidden)"));
}

function prodSyncSelUi() {
    var n = prodSelCount();
    document.querySelectorAll("#prodCardsGrid .prod-card").forEach(function (el) {
        var id = el.getAttribute("data-id");
        var on = !!prodSelectedIds[id];
        el.classList.toggle("is-selected", on);
        var chk = el.querySelector(".prod-card-check");
        if (chk) chk.checked = on;
    });
    var countEl = document.getElementById("prodSelCount");
    var clearBtn = document.getElementById("prodSelClear");
    if (countEl) {
        countEl.textContent = n === 1 ? "1 seleccionado" : n + " seleccionados";
        countEl.classList.toggle("is-empty", n === 0);
    }
    if (clearBtn) clearBtn.hidden = n === 0;
    var actions = document.getElementById("prodSelActions");
    if (actions) actions.hidden = n === 0 || !prodPuedeSeleccionar();
}

function prodSelClickCard(card, e) {
    var id = card.getAttribute("data-id");
    if (!id) return;
    var visibles = prodCardsVisibles();
    var multi = e.ctrlKey || e.metaKey;
    var range = e.shiftKey;

    if (range && prodLastSelId) {
        var from = -1, to = -1, i;
        for (i = 0; i < visibles.length; i++) {
            var vid = visibles[i].getAttribute("data-id");
            if (vid === prodLastSelId) from = i;
            if (vid === id) to = i;
        }
        if (from >= 0 && to >= 0) {
            if (!multi) prodSelClear();
            var a = Math.min(from, to), b = Math.max(from, to);
            for (i = a; i <= b; i++) prodSelSet(visibles[i].getAttribute("data-id"), true);
            prodLastSelId = id;
            prodSyncSelUi();
            return;
        }
    }

    if (multi) {
        prodSelSet(id, !prodSelectedIds[id]);
    } else {
        var onlyThis = prodSelCount() === 1 && prodSelectedIds[id];
        prodSelClear();
        if (!onlyThis) prodSelSet(id, true);
    }
    prodLastSelId = id;
    prodSyncSelUi();
}

function prodInitVista() {
    prodAplicarVista(prodLeerVista(), false);
    $("#prodVistaToggle").off("click.prodVista").on("click.prodVista", "button[data-vista]", function () {
        prodAplicarVista(this.getAttribute("data-vista"), true);
    });
    $("#prodCardChips").off("click.prodChip").on("click.prodChip", "[data-chip]", function () {
        prodCardChip = this.getAttribute("data-chip") || "todos";
        $("#prodCardChips .prod-chip").removeClass("is-on");
        $(this).addClass("is-on");
        if (gridProductos) gridProductos.draw();
        else prodFiltrarCardsDom();
    });
    $("#prodCardQ").off("input.prodQ").on("input.prodQ", function () {
        prodCardQuery = String(this.value || "").toLowerCase().trim();
        if (gridProductos) gridProductos.search(this.value || "").draw();
        else prodFiltrarCardsDom();
    });
    $("#prodSelAll").off("click.prodSel").on("click.prodSel", function () {
        if (!prodPuedeSeleccionar()) return;
        prodCardsVisibles().forEach(function (el) { prodSelSet(el.getAttribute("data-id"), true); });
        prodSyncSelUi();
    });
    $("#prodSelClear").off("click.prodSel").on("click.prodSel", function () {
        prodSelClear();
        prodSyncSelUi();
    });
    $("#prodSelActivar").off("click.prodBulk").on("click.prodBulk", function () {
        if (!prodPuedeSeleccionar()) return;
        prodAccionMasiva("activar");
    });
    $("#prodSelDesactivar").off("click.prodBulk").on("click.prodBulk", function () {
        if (!prodPuedeSeleccionar()) return;
        prodAccionMasiva("desactivar");
    });
    $("#prodSelEliminar").off("click.prodBulk").on("click.prodBulk", function () {
        if (!prodPuedeSeleccionar()) return;
        prodAccionMasiva("eliminar");
    });
    if (!window._prodDtChipFilter) {
        window._prodDtChipFilter = true;
        $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
            if (!settings || !settings.nTable || settings.nTable.id !== "grdProductos") return true;
            if (!document.body.classList.contains("prod-mode-cards")) return true;
            if (prodCardChip === "todos") return true;
            if (!gridProductos) return true;
            var row = gridProductos.row(dataIndex).data();
            if (!row) return true;
            var activo = row.Activo === 1 || row.Activo === "1";
            if (prodCardChip === "activo") return activo;
            if (prodCardChip === "inactivo") return !activo;
            return true;
        });
    }
    $("#prodCardsGrid").off("click.prodSel").on("click.prodSel", ".prod-card", function (e) {
        if (!prodPuedeSeleccionar()) return;
        if ($(e.target).closest(".prod-card-actions, .prod-icon-btn, .prod-card-zoom, .prod-card-media, .prod-card-check, .prod-pend-mark").length) return;
        prodSelClickCard(this, e);
    });
    $("#prodCardsGrid").off("change.prodSel").on("change.prodSel", ".prod-card-check", function (e) {
        if (!prodPuedeSeleccionar()) return;
        e.stopPropagation();
        var card = this.closest(".prod-card");
        if (!card) return;
        prodSelSet(card.getAttribute("data-id"), this.checked);
        prodLastSelId = card.getAttribute("data-id");
        prodSyncSelUi();
    });
    $("#prodCardsGrid").off("click.prodZoom").on("click.prodZoom", ".prod-card-zoom, .prod-card-media", function (e) {
        e.stopPropagation();
        var card = this.closest(".prod-card");
        if (!card) return;
        var id = card.getAttribute("data-id");
        var hasImg = card.querySelector("img.prod-thumb[data-has-img='1']") ? 1 : 0;
        prodAbrirImagenProducto(id, hasImg);
    });
}

function prodRenderCardsDesdeTabla() {
    var $grid = $("#prodCardsGrid");
    if (!$grid.length || !gridProductos) return;

    var rows = gridProductos.rows({ page: "current", search: "applied" }).data().toArray();
    if (!rows.length) {
        $grid.html(
            '<div class="prod-empty-hero">' +
            '<div class="prod-empty-orb is-cube"><i class="fa fa-cube"></i></div>' +
            '<h4>Sin productos para mostrar</h4>' +
            '<p>Cuando haya ítems en el catálogo van a aparecer acá, en tarjetas o en tabla.</p>' +
            '</div>'
        );
        prodSyncSelUi();
        return;
    }

    var html = rows.map(function (p) {
        var activo = Number(p.Activo) === 1;
        var pendiente = p.TienePendiente === true || p.TienePendiente === 1;
        var hasImg = !!p.TieneImagen;
        var extraAdmin = "";
        if (prodEsAdmin()) {
            extraAdmin = '<div class="prod-card-mini">Compra ' + formatNumber(p.PrecioCompra) + ' · Total ' + formatNumber(p.Total) + '</div>';
        }
        var zoom = hasImg
            ? '<button type="button" class="prod-card-zoom" data-id="' + p.Id + '" title="Ver imagen" aria-label="Ver imagen"><i class="fa fa-search-plus"></i></button>'
            : "";
        var img = hasImg
            ? '<img class="prod-thumb" data-prod-id="' + p.Id + '" data-has-img="1" src="' + PROD_IMG_ENDPOINT + p.Id + '" loading="lazy" decoding="async" alt="" />'
            : "";
        var acciones =
            prodCardIconBtn("is-wsp", "WhatsApp", "abrirWhatsappProducto(" + p.Id + ")", "fa-whatsapp") +
            (prodEsAdmin() ? prodCardIconBtn("is-info", "Historial", "prodAbrirHistorialProducto(" + p.Id + ")", "fa-clock-o") : "") +
            (prodPuedeMutar() ? prodCardIconBtn("is-edit", "Editar", "editarProducto(" + p.Id + ")", "fa-pencil-square-o") : "") +
            (prodPuedeMutar() ? prodCardIconBtn("is-stock", "Stock", "editarStock(" + p.Id + ")", "fa-arrows-v") : "") +
            (prodPuedeMutar() ? prodCardIconBtn(activo ? "is-on" : "is-off", activo ? "Desactivar" : "Activar", "cambiarEstadoProducto(" + p.Id + ", " + (activo ? 0 : 1) + ")", "fa-power-off") : "") +
            (prodPuedeMutar() ? prodCardIconBtn("is-del", "Eliminar", "eliminarProducto(" + p.Id + ")", "fa-trash") : "");

        var selHtml = prodPuedeSeleccionar()
            ? '<span class="prod-card-tick" aria-hidden="true"><i class="fa fa-check"></i></span>' +
              '<input type="checkbox" class="prod-card-check" title="Seleccionar" aria-label="Seleccionar" />'
            : "";
        var pendHtml = pendiente
            ? '<span class="prod-pend-mark" data-tip="' + PROD_MSG_PENDIENTE + '" title="' + PROD_MSG_PENDIENTE + '" aria-label="' + PROD_MSG_PENDIENTE + '"><i class="fa fa-hourglass-half"></i></span>'
            : "";

        return (
            '<article class="prod-card' + (activo ? "" : " is-off") + (pendiente ? " has-pendiente" : "") + '" data-id="' + p.Id + '" data-activo="' + (activo ? "1" : "0") + '" data-q="' + prodEscaparHtml((p.Nombre || "") + " " + (p.Marca || "")).toLowerCase() + '"' + (pendiente ? ' title="' + PROD_MSG_PENDIENTE + '"' : "") + '>' +
            selHtml + pendHtml +
            '<div class="prod-card-media">' +
            '<div class="prod-card-ph" aria-hidden="true"><i class="fa fa-image"></i></div>' +
            img + zoom +
            '<span class="prod-card-badge ' + (activo ? "ok" : "off") + '">' + (activo ? "Activo" : "Inactivo") + '</span></div>' +
            '<div class="prod-card-body">' +
            '<h3 class="prod-card-name">' + prodEscaparHtml(p.Nombre || "") + '</h3>' +
            (p.Marca ? '<div class="prod-card-marca">' + prodEscaparHtml(p.Marca) + '</div>' : "") +
            '<div class="prod-card-price">' + formatNumber(p.PrecioVenta) + '</div>' + extraAdmin +
            '<div class="prod-card-stock">Stock ' + formatearMiles(p.Stock || 0) + '</div>' +
            '<div class="prod-card-actions">' + acciones + '</div></div></article>'
        );
    }).join("");

    $grid.html(html);
    prodInitLazyImagesCards();
    prodFiltrarCardsDom();
}

function prodInitLazyImagesCards() {
    var imgs = document.querySelectorAll("#prodCardsGrid img.prod-thumb:not([data-loaded])");
    if (!imgs.length) return;
    if (!window.IntersectionObserver) {
        imgs.forEach(prodCargarThumb);
        return;
    }
    if (!prodImgObserver) {
        prodImgObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                prodCargarThumb(entry.target);
                prodImgObserver.unobserve(entry.target);
            });
        }, { root: null, rootMargin: "120px", threshold: 0.01 });
    }
    imgs.forEach(function (img) { prodImgObserver.observe(img); });
}

function prodSelIds() {
    return Object.keys(prodSelectedIds).map(function (k) { return parseInt(k, 10); }).filter(function (n) { return n > 0; });
}

async function prodAccionMasiva(accion) {
    if (!prodPuedeSeleccionar()) {
        mostrarToast("La selección masiva solo está disponible para el administrador.", "error");
        return;
    }
    var ids = prodSelIds();
    if (!ids.length) {
        mostrarToast("Seleccioná al menos un producto.", "warning");
        return;
    }
    var verbos = { activar: "activar", desactivar: "desactivar", eliminar: "eliminar" };
    var verbo = verbos[accion] || accion;
    var okMasiva = await confirmarModal("¿Confirmás " + verbo + " <b>" + ids.length + "</b> producto(s)?", {
        textoAceptar: "Aceptar",
        textoCancelar: "Cancelar",
        claseAceptar: accion === "eliminar" ? "btn-danger" : (accion === "activar" ? "btn-success" : "btn-warning")
    });
    if (!okMasiva) return;

    try {
        var result = await MakeAjax({
            type: "POST",
            url: "/Productos/AccionMasiva",
            async: true,
            data: JSON.stringify({ Ids: ids, Accion: accion }),
            contentType: "application/json",
            dataType: "json"
        });
        var listaNombres = prodListarNombres(prodNombresDeIds(ids), ids.length);
        var accMasiva = { activar: "la activación", desactivar: "la desactivación", eliminar: "la eliminación" }[accion] || "el cambio";
        var okMasivaMsg = { activar: "Se activaron", desactivar: "Se desactivaron", eliminar: "Se eliminaron" }[accion] || "Listo";
        if (ids.length === 1) {
            okMasivaMsg = { activar: "Se activó", desactivar: "Se desactivó", eliminar: "Se eliminó" }[accion] || "Listo";
        }
        if (result && result.Status) {
            if (result.Pendiente) {
                mostrarToast("Se envió a pendientes " + accMasiva + " de " + listaNombres + ".", "success");
                if (typeof prodRefreshPendientes === "function") prodRefreshPendientes();
            } else {
                mostrarToast(okMasivaMsg + " " + listaNombres + ".", "success");
            }
            prodSelClear();
            if (gridProductos) gridProductos.ajax.reload(null, false);
        } else {
            mostrarToast(prodMensajeAmigable(result && result.Mensaje, "No se pudo " + verbo + " " + listaNombres + ". Intentá de nuevo."), "error");
        }
    } catch (e) {
        mostrarToast("No se pudo completar la acción masiva. Intentá de nuevo.", "error");
    }
}

function prodFiltrarCardsDom() {
    var q = prodCardQuery;
    var chip = prodCardChip;
    document.querySelectorAll("#prodCardsGrid .prod-card").forEach(function (el) {
        var okChip = chip === "todos" ||
            (chip === "activo" && el.getAttribute("data-activo") === "1") ||
            (chip === "inactivo" && el.getAttribute("data-activo") === "0");
        var okQ = !q || (el.getAttribute("data-q") || "").indexOf(q) >= 0;
        el.classList.toggle("is-hidden", !(okChip && okQ));
    });
    prodSyncSelUi();
}