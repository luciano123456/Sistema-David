var cliAdjItems = [];
var cliAdjIndex = 0;
var cliAdjTouchX = null;

function htmlAdjuntosCliente(idCliente, tiene, nombre, modo) {
    var id = parseInt(idCliente, 10) || 0;
    var ok = tiene === true || tiene === 1 || tiene === "true";
    var base = modo === "venta" ? "btn-accion " : "btn btn-sm btnacciones ";
    var cls = base + "cli-adj-btn " + (ok ? "cli-adj-ok" : "cli-adj-warn");
    var icon = ok ? "fa-paperclip" : "fa-exclamation-triangle";
    var title = ok ? "Ver imágenes del cliente" : "Sin imágenes adjuntas";
    var nom = String(nombre || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return '<button type="button" class="' + cls + '" data-cli-adj="' + (ok ? "1" : "0") + '" data-cli-id="' + id + '" data-cli-nom="' + nom + '" title="' + title + '" onclick="clickAdjuntosCliente(this, event)"><i class="fa ' + icon + '" aria-hidden="true"></i></button>';
}

function clickAdjuntosCliente(btn, ev) {
    if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
    }
    if (!btn) return;
    if (btn.getAttribute("data-cli-adj") === "1")
        abrirImagenesCliente(btn.getAttribute("data-cli-id"), btn.getAttribute("data-cli-nom") || "");
    else
        avisarSinImagenesCliente();
}

function avisarSinImagenesCliente() {
    var texto = "Este cliente no tiene imágenes adjuntas.";
    var el = document.getElementById("AdvertenciaModalText");
    var modalEl = document.getElementById("AdvertenciaModal");
    if (el) el.textContent = texto;
    if (modalEl && window.bootstrap && bootstrap.Modal) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
        return;
    }
    alert(texto);
}

function abrirImagenesCliente(idCliente, nombre) {
    var id = parseInt(idCliente, 10) || 0;
    if (!id) {
        avisarSinImagenesCliente();
        return;
    }

    var titulo = document.getElementById("cliAdjTitulo");
    var main = document.getElementById("cliAdjMain");
    var empty = document.getElementById("cliAdjEmpty");
    var count = document.getElementById("cliAdjCount");
    var strip = document.getElementById("cliAdjStrip");
    if (titulo) titulo.textContent = nombre || "Cliente";
    if (main) {
        main.removeAttribute("src");
        main.hidden = true;
    }
    if (empty) {
        empty.hidden = false;
        empty.textContent = "Cargando imágenes…";
    }
    if (count) count.textContent = "";
    if (strip) strip.innerHTML = "";
    mostrarNavImagenes(false);
    mostrarModalImagenes();

    $.ajax({
        url: "/Clientes/ListarAdjuntos",
        type: "GET",
        data: { idCliente: id },
        dataType: "json"
    }).done(function (result) {
        var data = (result && result.data) ? result.data : [];
        cliAdjItems = data.filter(function (x) { return x && (x.EsImagen === true || x.esImagen === true) && x.Url; });
        cliAdjIndex = 0;
        if (!cliAdjItems.length) {
            cerrarModalImagenes();
            avisarSinImagenesCliente();
            return;
        }
        pintarImagenCliente();
    }).fail(function () {
        if (empty) {
            empty.hidden = false;
            empty.textContent = "No se pudieron cargar las imágenes.";
        }
    });
}

function pintarImagenCliente() {
    var item = cliAdjItems[cliAdjIndex];
    var main = document.getElementById("cliAdjMain");
    var empty = document.getElementById("cliAdjEmpty");
    var count = document.getElementById("cliAdjCount");
    var strip = document.getElementById("cliAdjStrip");
    var varias = cliAdjItems.length > 1;

    if (!item || !main) return;
    main.hidden = false;
    main.src = item.Url;
    main.alt = item.Nombre || "Imagen del cliente";
    if (empty) empty.hidden = true;
    if (count) count.textContent = varias ? ((cliAdjIndex + 1) + " / " + cliAdjItems.length) : "";
    mostrarNavImagenes(varias);

    if (!strip) return;
    if (!varias) {
        strip.innerHTML = "";
        return;
    }

    var html = "";
    for (var i = 0; i < cliAdjItems.length; i++) {
        html += '<button type="button" class="cli-adj-thumb' + (i === cliAdjIndex ? " is-on" : "") + '" onclick="irImagenCliente(' + i + ')"><img src="' + cliAdjItems[i].Url + '" alt="" /></button>';
    }
    strip.innerHTML = html;
    var activo = strip.querySelector(".is-on");
    if (activo && activo.scrollIntoView)
        activo.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
}

function irImagenCliente(i) {
    if (!cliAdjItems.length) return;
    cliAdjIndex = (i + cliAdjItems.length) % cliAdjItems.length;
    pintarImagenCliente();
}

function mostrarNavImagenes(visible) {
    ["cliAdjPrev", "cliAdjNext"].forEach(function (id) {
        var btn = document.getElementById(id);
        if (btn) btn.hidden = !visible;
    });
    var strip = document.getElementById("cliAdjStrip");
    if (strip) strip.hidden = !visible;
}

function mostrarModalImagenes() {
    var modalEl = document.getElementById("cliAdjModal");
    if (modalEl && window.bootstrap && bootstrap.Modal)
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function cerrarModalImagenes() {
    var modalEl = document.getElementById("cliAdjModal");
    if (modalEl && window.bootstrap && bootstrap.Modal) {
        var inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
    }
}

document.addEventListener("click", function (e) {
    var prev = e.target.closest && e.target.closest("#cliAdjPrev");
    var next = e.target.closest && e.target.closest("#cliAdjNext");
    if (prev) irImagenCliente(cliAdjIndex - 1);
    if (next) irImagenCliente(cliAdjIndex + 1);
});

document.addEventListener("keydown", function (e) {
    var modalEl = document.getElementById("cliAdjModal");
    if (!modalEl || !modalEl.classList.contains("show") || cliAdjItems.length < 2) return;
    if (e.key === "ArrowLeft") irImagenCliente(cliAdjIndex - 1);
    if (e.key === "ArrowRight") irImagenCliente(cliAdjIndex + 1);
});

document.addEventListener("DOMContentLoaded", function () {
    var stage = document.getElementById("cliAdjStage");
    if (!stage) return;
    stage.addEventListener("touchstart", function (e) {
        if (!e.changedTouches || !e.changedTouches.length) return;
        cliAdjTouchX = e.changedTouches[0].clientX;
    }, { passive: true });
    stage.addEventListener("touchend", function (e) {
        if (cliAdjTouchX == null || !e.changedTouches || !e.changedTouches.length || cliAdjItems.length < 2) return;
        var dx = e.changedTouches[0].clientX - cliAdjTouchX;
        cliAdjTouchX = null;
        if (Math.abs(dx) < 40) return;
        irImagenCliente(cliAdjIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
});
