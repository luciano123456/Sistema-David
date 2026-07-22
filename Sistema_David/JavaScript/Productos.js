let userSession;
let gridVentas = null;
let gridProductos;
let prodImagenesExtra = [];
let prodProductoSeleccionado = null;
let prodWspProductoCache = null;
let prodWspClienteNombre = null;
let prodWspClientesMap = {};
let prodImgObserver = null;
const PROD_IMG_DEFAULT = "/Imagenes/productodefault.png";
const PROD_IMG_ENDPOINT = "/Productos/ObtenerImagen/";

function prodEsAdmin() {
    return userSession && userSession.IdRol == 1;
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
    if (img.getAttribute("data-has-img") !== "1") return;
    var id = img.getAttribute("data-prod-id");
    if (!id) return;
    img.src = PROD_IMG_ENDPOINT + id;
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

function prodAbrirImagenProducto(id, tieneImagen) {
    var src = (tieneImagen === true || tieneImagen === 1 || tieneImagen === "1")
        ? PROD_IMG_ENDPOINT + id
        : PROD_IMG_DEFAULT;
    openModal(src);
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
        if (prefix === "modal" && !prodEsAdmin()) {
            advertenciaModal("Solo administradores pueden guardar la financiación en el producto.");
            return;
        }
        var map = { semanal: "FinSemanal", quincenal: "FinQuincenal", mensual: "FinMensual" };
        var id = map[tipo];
        if (!id) return;
        var data = prodCalcFinObtenerDatos(prefix);
        var texto = prodCalcFinTextoPlan(prefix, tipo, data);
        if (!texto || !data.precio) {
            advertenciaModal("Completá el precio de venta antes de aplicar.");
            return;
        }
        document.getElementById(id).value = texto;
        exitoModal("Aplicado en cuotas " + tipo);
    } catch (e) {
        errorModal("No se pudo aplicar el plan.");
    }
}

function prodCalcFinAplicarTodos(prefix) {
    try {
        if (!prodEsAdmin()) {
            advertenciaModal("Solo administradores pueden guardar la financiación en el producto.");
            return;
        }
        var data = prodCalcFinObtenerDatos(prefix);
        if (!data || !data.precio) {
            advertenciaModal("Completá el precio de venta antes de aplicar.");
            return;
        }
        document.getElementById("FinSemanal").value = prodCalcFinTextoPlan(prefix, "semanal", data);
        document.getElementById("FinQuincenal").value = prodCalcFinTextoPlan(prefix, "quincenal", data);
        document.getElementById("FinMensual").value = prodCalcFinTextoPlan(prefix, "mensual", data);
        document.getElementById("FinConEntrega").value = prodCalcFinTextoConEntrega(prefix, data);
        document.getElementById("FinSinEntrega").value = prodCalcFinTextoSinEntrega(prefix, data);
        exitoModal("Financiación aplicada en todos los campos");
    } catch (e) {
        errorModal("No se pudo aplicar la financiación.");
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
        navigator.clipboard.writeText(txt).then(function () { exitoModal("Plan copiado"); });
    } else {
        prompt("Copiá el plan:", txt);
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

    if (p.PrecioVenta) {
        lineas.push("");
        lineas.push("💰 *Precio contado:* $" + formatearMiles(p.PrecioVenta));
    }

    if (p.Marca) detalles.push("• *Marca:* " + p.Marca);
    if (p.Modelo) detalles.push("• *Modelo:* " + p.Modelo);
    if (p.Color) detalles.push("• *Color:* " + p.Color);
    if (p.Accesorios) detalles.push("• *Incluye:* " + p.Accesorios);

    if (detalles.length) {
        lineas.push("");
        lineas.push("📌 *Detalles del producto*");
        lineas.push(detalles.join("\n"));
    }

    var caracteristicas = prodFormatearCaracteristicas(p.Caracteristicas);
    if (caracteristicas) {
        lineas.push("");
        lineas.push("✅ *Características*");
        lineas.push(caracteristicas);
    }

    if (p.Descripcion) {
        lineas.push("");
        lineas.push("📝 *Descripción*");
        lineas.push(p.Descripcion.trim());
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
        matcher: function (params, data) {
            var term = (params.term || "").toLowerCase();
            if (!term) return data;
            var text = (data.text || "").toLowerCase();
            return text.indexOf(term) >= 0 ? data : null;
        }
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

    var url = (userSession && userSession.IdRol == 2)
        ? "/Clientes/GetClientesVendedor?idVendedor=" + userSession.Id
        : "/Clientes/GetClientesElectrodomesticos";

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

function prodMostrarFinanciacionPanel(data) {
    prodProductoSeleccionado = data;
    if (!data) {
        $("#panelFinanciacion").attr("hidden", "hidden");
        return;
    }
    $("#lblFinProducto").text("Financiación — " + (data.Nombre || ""));

    prodCalcFinMount("panel", "#prodCalcPanelMount", data);

    var html = "";
    var bloques = [
        { t: "Con entrega", v: data.FinConEntrega },
        { t: "Sin entrega", v: data.FinSinEntrega },
        { t: "Cuotas semanales", v: data.FinSemanal },
        { t: "Cuotas quincenales", v: data.FinQuincenal },
        { t: "Cuotas mensuales", v: data.FinMensual }
    ];
    bloques.forEach(function (b) {
        html += '<div class="col-md-6 col-lg-4"><div class="prod-fin-block"><h6>' + prodEscaparHtml(b.t) + '</h6><p class="mb-0">' +
            (b.v ? prodEscaparHtml(b.v).replace(/\n/g, "<br>") : '<span class="text-muted">Sin datos</span>') + '</p></div></div>';
    });
    $("#financiacionContenido").html(html);
    $("#panelFinanciacion").removeAttr("hidden");
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
    var cat = parseInt(document.getElementById("Categorias").value, 10);
    var payload = {
        Codigo: (document.getElementById("Codigo").value || "").trim(),
        Nombre: (document.getElementById("Nombre").value || "").trim(),
        Imagen: document.getElementById("imgProd").value || "",
        idCategoria: isNaN(cat) ? null : cat,
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
    if (!payload.Codigo) return "Ingresá el código del producto.";
    if (!payload.Nombre) return "Ingresá el nombre del producto.";
    if (!payload.idCategoria) return "Seleccioná una categoría.";
    return "";
}

function prodMostrarErrorProducto(msg) {
    var $err = $("#datosProducto");
    $err.text(msg || "Ha ocurrido un error.").removeClass("d-none");
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

$(document).ready(function () {
    configurarDataTable();
    $("#btnProductos").css("background", "#2E4053")
    userSession = JSON.parse(localStorage.getItem('usuario'));

    if (userSession.IdRol == 1) {
        document.getElementById("btnImportarDatos").removeAttribute("hidden");
        document.getElementById("divStock").removeAttribute("hidden");
        document.getElementById("btnNuevo").removeAttribute("hidden");
    }

    $("#Caracteristicas, #Descripcion, #Nombre, #Marca, #Modelo, #PrecioVenta").on("input", function () {
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
        { index: 2, filterType: "text" },
        { index: 3, filterType: "text" },
        { index: 4, filterType: "select" },
        { index: 5, filterType: "text" },
        { index: 6, filterType: "text" },
        { index: 7, filterType: "text" },
        { index: 8, filterType: "text" },
        { index: 9, filterType: "text" },
        { index: 10, filterType: "text" }
    ];

    inicializarFiltrosColumnas(gridProductos, columnConfigProductos, "productos_col_filters_v1");
}

async function configurarDataTable() {
    $("#grdProductos thead tr.filters").remove();
    inicializarEncabezadoColumnas("#grdProductos");

    gridProductos = $('#grdProductos').DataTable({
        "ajax": {
            "url": "/Productos/Listar",
            "type": "GET",
            "dataType": "json",
            "dataSrc": function (json) {
                if (json.totalStock != null) {
                    prodActualizarKpiStock(json.totalStock);
                } else if (json.data) {
                    prodRecalcularTotalStock(json.data);
                }
                return json.data || [];
            }
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        "lengthMenu": [[10, 25, 50, 100], [10, 25, 50, 100]],
        "pageLength": 25,
        "deferRender": true,
        "searchDelay": 350,
        "order": [[11, 'desc']],
        scrollX: true,
        orderCellsTop: true,
        "columns": [
            {
                "data": "Id",
                "render": function (data, type, full) {
                    var hasImg = full.TieneImagen ? "1" : "0";
                    return '<img class="prod-thumb img-thumbnail" ' +
                        'data-prod-id="' + data + '" data-has-img="' + hasImg + '" ' +
                        'src="' + PROD_IMG_DEFAULT + '" width="45" height="45" ' +
                        'loading="lazy" decoding="async" alt="" ' +
                        'onclick="prodAbrirImagenProducto(' + data + ',' + hasImg + ')" />';
                }
            },
            { "data": "Codigo" },
            { "data": "Nombre" },
            { "data": "Marca", "defaultContent": "" },
            { "data": "Categoria" },
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
                    var activo = full.Activo === 1;
                    var color = activo ? "success" : "danger";
                    var titulo = activo ? "Desactivar" : "Activar";
                    var estadoInverso = full.Activo ? 0 : 1;

                    var iconWsp = "<button class='btn btn-sm btn-wsp btnacciones prod-action-btn' type='button' onclick='abrirWhatsappProducto(" + data + ")' title='WhatsApp'><i class='fa fa-whatsapp text-white'></i></button>";

                    var iconEditar = prodEsAdmin() ?
                        "<button class='btn btn-sm btneditar btnacciones prod-action-btn' type='button' onclick='editarProducto(" + data + ")' title='Editar'><i class='fa fa-pencil-square-o text-white'></i></button>" : "";

                    var iconStock = prodEsAdmin() ?
                        "<button class='btn btn-sm btneditar btnacciones prod-action-btn' type='button' onclick='editarStock(" + data + ")' title='Editar Stock'><i class='fa fa-arrows-v text-white'></i></button>" : "";

                    var iconEliminar = prodEsAdmin() ?
                        "<button class='btn btn-sm btn-danger btnacciones prod-action-btn' type='button' onclick='eliminarProducto(" + data + ")' title='Eliminar'><i class='fa fa-trash text-white'></i></button>" : "";

                    var iconEstado = prodEsAdmin() ?
                        "<button class='btn btn-sm btn-" + color + " btnacciones prod-action-btn' type='button' onclick='cambiarEstadoProducto(" + data + ", " + estadoInverso + ")' title='" + titulo + "'><i class='fa fa-power-off text-white'></i></button>" : "";

                    return "<div class='prod-actions-cell'>" + iconWsp + iconEstado + iconStock + iconEditar + iconEliminar + "</div>";
                },
                "orderable": false,
                "searchable": false
            }
        ],

        "columnDefs": [
            {
                "render": prodFormatCeldaMiles,
                "targets": [5, 9, 10]
            },
            {
                "render": prodFormatCeldaMoneda,
                "targets": [6, 7, 8]
            }
        ],

        "initComplete": async function (settings, json) {

            if (userSession.IdRol == 4) {
                gridProductos.column(6).visible(false);
                gridProductos.column(7).visible(false);
                gridProductos.column(9).visible(false);
            }

            await configurarOpcionesColumnas();
            configurarFiltrosPorColumnaProductos();
            prodInitLazyImages();
        },
        "drawCallback": function () {
            prodInitLazyImages();
        }
    });

    $('#grdProductos tbody').on('click', 'tr', function (e) {
        if ($(e.target).closest("button, a, input, select, .btnacciones, .rp-filter-input, .rp-filter-select").length) return;

        $('#grdProductos tbody tr').removeClass('seleccionada');
        $('td', '#grdProductos tbody tr').removeClass('prod-col-seleccionada');

        $(this).addClass('seleccionada');
        $(this).find('td:visible').first().addClass('prod-col-seleccionada');

        var row = gridProductos.row(this).data();
        if (row && row.Id) {
            cargarFinanciacionProducto(row.Id);
        }
    });
}


const cambiarEstadoProducto = async (id, estado) => {

    try {
            var url = "/Productos/EditarActivo";

            let value = JSON.stringify({
                id: id,
                activo: estado
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

            if (result.Status) {
                $('.datos-error').removeClass('d-none');
                const table = $('#grdProductos').DataTable();
                table.ajax.reload();
            } else {
                $('.datos-error').text('Ha ocurrido un error en los datos.')
                $('.datos-error').removeClass('d-none')
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

const eliminarProducto = async id => {
    try {
        if (confirm("¿Seguro desea eliminar este producto?")) {
            const url = "/Productos/Eliminar";
            const value = JSON.stringify({ Id: id });

            const options = {
                type: "POST",
                url: url,
                async: true,
                data: value,
                contentType: "application/json",
                dataType: "json"
            };

            const result = await MakeAjax(options);

            if (result.TieneStock) {
                const mensaje = result.Mensaje + "\n\n" + result.Detalle.join("\n");
                errorModal(mensaje);
                return;
            }

            if (result.Status) {
                exitoModal('Producto eliminado correctamente.');
                const table = $('#grdProductos').DataTable();
                table.ajax.reload();
            } else {
                $('.datos-error').text('Ha ocurrido un error en los datos.').removeClass('d-none');
            }
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.').removeClass('d-none');
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



        if (result != null) {

            $("#productoModal").modal("show");
            prodResetTabs();
            $('.datos-error').text('')

            document.getElementById("IdProducto").value = result.Producto.Id;
            document.getElementById("Codigo").value = result.Producto.Codigo;
            document.getElementById("Nombre").value = result.Producto.Nombre;
            document.getElementById("imgProd").value = result.Producto.Imagen;
            document.getElementById("Categorias").value = result.Producto.idCategoria;
            document.getElementById("Stock").value = formatearMiles(result.Producto.Stock);
            document.getElementById("PrecioCompra").value = formatearMiles(result.Producto.PrecioCompra);
            document.getElementById("PrecioVenta").value = formatearMiles(result.Producto.PrecioVenta);
            document.getElementById("PorcVenta").value = formatearMiles(result.Producto.PorcVenta);
            document.getElementById("DiasVencimiento").value = formatearMiles(result.Producto.DiasVencimiento);
            prodCargarCamposExtendidos(result.Producto);
            document.getElementById("btnRegistrarModificar").textContent = "Modificar";
            document.getElementById("productoModalLabel").textContent = "Modificar " + document.getElementById("Nombre").value;

            selectCategorias = document.getElementById("Categorias");

            $('#Categorias option').remove();
            for (i = 0; i < result.Categorias.length; i++) {
                option = document.createElement("option");
                option.value = result.Categorias[i].Id;
                option.text = result.Categorias[i].Nombre;
                selectCategorias.appendChild(option);
            }

            if (result.Producto.Imagen != null && result.Producto.Imagen !== "") {
                $("#imgProducto").attr("src", "data:image/png;base64," + result.Producto.Imagen).css("display", "block");
            } else {
                $("#imgProducto").attr("src", "").css("display", "none");
            }

        } else {
            errorModal("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        errorModal("Ha ocurrido un error en los datos");
    }
}




async function AccionBtn() {
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        errorModal("No tienes permisos para realizar esta accion.")
        return false;
    }
    if (document.getElementById("btnRegistrarModificar").textContent == "Registrar") {
        await registrarProducto();
    } else {
        await modificarProducto();
    }
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

        if (result && result.Status) {
            $("#productoModal").modal("hide");
            exitoModal("Producto agregado correctamente.");
            $("#grdProductos").DataTable().ajax.reload();
        } else {
            prodMostrarErrorProducto((result && result.Mensaje) || "Ha ocurrido un error al registrar.");
        }
    } catch (error) {
        prodMostrarErrorProducto("Ha ocurrido un error al registrar.");
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

        let result = await MakeAjax({
            type: "POST",
            url: "/Productos/Editar",
            async: true,
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json"
        });

        if (result && result.Status) {
            $("#productoModal").modal("hide");
            exitoModal("Producto modificado correctamente.");
            $("#grdProductos").DataTable().ajax.reload(null, false);
        } else {
            prodMostrarErrorProducto((result && result.Mensaje) || "Ha ocurrido un error al modificar.");
        }
    } catch (error) {
        prodMostrarErrorProducto("Ha ocurrido un error al modificar.");
    }
}

function abrirmodal() {

    $("#productoModal").modal('show');
    prodResetTabs();
    document.getElementById("IdProducto").value = ""
    document.getElementById("Codigo").value = ""
    document.getElementById("Nombre").value = ""
    document.getElementById("imgProd").value = ""
    document.getElementById("Categorias").value = ""
    document.getElementById("Stock").value = ""
    document.getElementById("PrecioCompra").value = ""
    document.getElementById("PrecioVenta").value = ""
    document.getElementById("PorcVenta").value = ""
    document.getElementById("DiasVencimiento").value = "";
    prodLimpiarCamposExtendidos();
    cargarCategorias();
    prodCalcFinSetPrecio("modal", 0);
    document.getElementById("FinConEntrega").value = "";
    document.getElementById("FinSinEntrega").value = "";
    document.getElementById("btnRegistrarModificar").textContent = "Registrar";
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

async function cargarCategorias() {
    try {
        var url = "/Productos/ListarCategorias";

        let value = JSON.stringify({
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

        if (result != null) {
            selectCategorias = document.getElementById("Categorias");

            $('#Categorias option').remove();
            for (i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre;
                selectCategorias.appendChild(option);
            }
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

function abrirmodalimportacionmasiva() {
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        errorModal("No tienes permisos para realizar esta accion.")
        return false;
    }
    $("#modalImportacionMasiva").modal("show");
}

async function enviarImportacionMasiva() {
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        errorModal("No tienes permisos para realizar esta accion.")
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
                    exitoModal("Los productos han sido registrados con exito.")
                    const table = $('#grdProductos').DataTable();
                    table.ajax.reload();
                } else {

                    $("#modalImportacionMasiva").modal("hide");
                    errorModal("Ha ocurrido un error con los datos.")
                }

            },
            error: function (data, textStatus) {
                errorModal("Ha ocurrido un error, consulte a un Administrador.")
            }
        });


    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

//ACCIONES AL APRETAR ENTER
document.getElementById('Codigo').addEventListener('keydown', inputCodigo);
function inputCodigo(event) {
    if (event.keyCode == 13) {
        document.getElementById('Nombre').focus();
    }
}

document.getElementById('Nombre').addEventListener('keydown', inputNombre);
function inputNombre(event) {
    if (event.keyCode == 13) {
        document.getElementById('Categorias').focus();
    }
}

document.getElementById('Categorias').addEventListener('keydown', inputCategoria);
function inputCategoria(event) {
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
    // Cambia el src de la imagen del modal
    document.getElementById('modalImage').src = imageSrc;
    // Muestra el modal
    $('#imageModal').modal('show');
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
    const grid = $('#grdProductos').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Productos_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {

       

        if (col.data && col.data !== "Id" && col.data != "Activo") { // Solo agregar columnas que no sean "Id"

            if (userSession.IdRol == 4) {
                if (index == 5 || index == 6 || index == 8) {
                    return;
                }
            }

            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = index == 0 ? "Imagen" : col.data;

            // Ahora agregamos el checkbox, asegurándonos de que se marque solo si 'isChecked' es 'true'
            container.append(`
                <li>
                    <label class="dropdown-item">
                        <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? 'checked' : ''}>
                        ${columnName}
                    </label>
                </li>
            `);
        }
    });

    // Asocia el evento para ocultar/mostrar columnas
    $('.toggle-column').on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');
        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));
        grid.column(columnIdx).visible(isChecked);
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



        if (result != null) {

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
            errorModal("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        errorModal("Ha ocurrido un error en los datos");
    }
}

async function agregarStockCantidad() {
    try {
        var url = "/Productos/AgregarStockCantidad";

        let value = JSON.stringify({
            Cantidad: prodLeerEntero("CantidadNuevaStock"),
            Id: document.getElementById("IdProductoStock").value
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

        if (result.Status) {
            $("#nuevoStockModal").modal("hide");
            exitoModal('Stock agregado correctamente.');
            $('.datos-error').removeClass('d-none');
            const table = $('#grdProductos').DataTable();
            table.ajax.reload();
        } else {
            errorModal("Ha ocurrido un error al restar el stock.")
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

async function restarStockCantidad() {
    try {
        var url = "/Productos/RestarStockCantidad";

        let value = JSON.stringify({
            Cantidad: prodLeerEntero("CantidadNuevaStock"),
            Id: document.getElementById("IdProductoStock").value
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

        if (result.Status) {
            $("#nuevoStockModal").modal("hide");
            exitoModal('Stock restado correctamente.');
            $('.datos-error').removeClass('d-none');
             const table = $('#grdProductos').DataTable();
                table.ajax.reload();
        } else {
            errorModal("Ha ocurrido un error al agregar el stock.")
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
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

async function cargarFinanciacionProducto(id) {
    try {
        var result = await MakeAjax({
            type: "GET",
            url: "/Productos/ObtenerDetalle?id=" + id,
            async: true,
            dataType: "json"
        });
        if (result && result.Status && result.Producto) {
            prodMostrarFinanciacionPanel(result.Producto);
        }
    } catch (e) { /* ignore */ }
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
            errorModal("No se pudo cargar el producto.");
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
        errorModal("Error al abrir WhatsApp.");
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
        errorModal("Ingresá un celular válido o seleccioná un cliente.");
        return;
    }

    if (!mensaje) {
        errorModal("El mensaje está vacío.");
        return;
    }

    var telefono = prodNormalizarTelefonoWspLink(tel);
    if (!telefono) {
        errorModal("Ingresá un celular válido.");
        return;
    }

    var urlwsp = "https://api.whatsapp.com/send?phone=+" + telefono + "&text=" + encodeURIComponent(mensaje);
    window.open(urlwsp, "_blank");
    $("#modalWspProducto").modal("hide");
}