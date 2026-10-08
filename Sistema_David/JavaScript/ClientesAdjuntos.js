var adjuntosPendientes = [];
var adjuntosGuardados = [];
var adjuntosClienteId = 0;
var adjuntosSubiendo = false;
var adjuntosCola = [];

function iniciarAdjuntosCliente() {
    var zona = document.getElementById("ceAdjDrop");
    var input = document.getElementById("ceAdjInput");
    if (!zona || !input || zona.getAttribute("data-listo") === "1")
        return;

    zona.setAttribute("data-listo", "1");

    var idGuardado = parseInt(localStorage.getItem("EdicionCliente") || "0", 10);
    adjuntosClienteId = isNaN(idGuardado) ? 0 : idGuardado;

    input.addEventListener("click", function (e) {
        e.stopPropagation();
    });

    zona.addEventListener("click", function () {
        input.click();
    });

    zona.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.click();
        }
    });

    input.addEventListener("change", function () {
        tomarArchivosAdjuntos(input.files);
        input.value = "";
    });

    ["dragenter", "dragover"].forEach(function (evt) {
        zona.addEventListener(evt, function (e) {
            e.preventDefault();
            e.stopPropagation();
            zona.classList.add("is-over");
        });
    });

    ["dragleave", "drop"].forEach(function (evt) {
        zona.addEventListener(evt, function (e) {
            e.preventDefault();
            e.stopPropagation();
            zona.classList.remove("is-over");
        });
    });

    zona.addEventListener("drop", function (e) {
        tomarArchivosAdjuntos(e.dataTransfer ? e.dataTransfer.files : null);
    });

    var cerrar = document.getElementById("ceAdjLightboxClose");
    var lightbox = document.getElementById("ceAdjLightbox");
    if (cerrar && lightbox) {
        cerrar.addEventListener("click", cerrarLightboxAdjunto);
        lightbox.addEventListener("click", function (e) {
            if (e.target === lightbox)
                cerrarLightboxAdjunto();
        });
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape")
            cerrarLightboxAdjunto();
    });

    if (adjuntosClienteId > 0)
        cargarAdjuntosCliente();
    else
        pintarAdjuntosCliente();
}

function tomarArchivosAdjuntos(fileList) {
    if (!fileList || !fileList.length)
        return;

    var nuevos = [];
    for (var i = 0; i < fileList.length; i++) {
        var file = fileList[i];
        if (!file)
            continue;
        if (!archivoAdjuntoPermitido(file)) {
            alert(file.name + " no es una imagen ni un PDF.");
            continue;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert(file.name + " supera los 20 MB.");
            continue;
        }
        nuevos.push(file);
    }

    if (!nuevos.length)
        return;

    if (adjuntosClienteId > 0) {
        subirArchivosAdjuntos(adjuntosClienteId, nuevos);
        return;
    }

    nuevos.forEach(function (file) {
        adjuntosPendientes.push({
            localId: "p" + Date.now() + Math.random().toString(16).slice(2),
            file: file,
            url: URL.createObjectURL(file),
            nombre: file.name,
            tamano: file.size,
            esImagen: (file.type || "").indexOf("image/") === 0 || !/\.pdf$/i.test(file.name)
        });
    });
    pintarAdjuntosCliente();
    setEstadoAdjuntos("Se guardan cuando registres el cliente.");
}

function archivoAdjuntoPermitido(file) {
    var tipo = (file.type || "").toLowerCase();
    var nombre = (file.name || "").toLowerCase();
    if (tipo.indexOf("image/") === 0 || tipo === "application/pdf")
        return true;
    return /\.(jpg|jpeg|png|gif|bmp|webp|heic|heif|pdf)$/i.test(nombre);
}

async function cargarAdjuntosCliente() {
    if (!adjuntosClienteId)
        return;

    try {
        var result = await MakeAjax({
            type: "GET",
            url: "/Clientes/ListarAdjuntos",
            data: { idCliente: adjuntosClienteId },
            dataType: "json"
        });
        adjuntosGuardados = (result && result.data) ? result.data : [];
        pintarAdjuntosCliente();
    } catch (e) {
        setEstadoAdjuntos("No se pudieron cargar las imágenes.");
    }
}

async function subirArchivosAdjuntos(idCliente, files) {
    if (!idCliente || !files || !files.length)
        return { ok: false, mensaje: "No hay imágenes para subir." };

    if (adjuntosSubiendo) {
        for (var c = 0; c < files.length; c++)
            adjuntosCola.push(files[c]);
        return { ok: true, mensaje: "" };
    }

    adjuntosSubiendo = true;
    setEstadoAdjuntos("Subiendo " + files.length + " archivo(s)…");

    try {
        var fd = new FormData();
        fd.append("idCliente", idCliente);
        for (var i = 0; i < files.length; i++)
            fd.append("archivos", files[i], files[i].name);

        var result = await $.ajax({
            url: "/Clientes/SubirAdjuntos",
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            dataType: "json"
        });

        if (!result || !result.ok) {
            adjuntosSubiendo = false;
            adjuntosCola = [];
            setEstadoAdjuntos((result && result.mensaje) ? result.mensaje : "No se pudieron guardar las imágenes.");
            return { ok: false, mensaje: result ? result.mensaje : "" };
        }

        setEstadoAdjuntos(result.mensaje || "Imágenes guardadas.");
        if (parseInt(adjuntosClienteId, 10) === parseInt(idCliente, 10))
            await cargarAdjuntosCliente();

        var cola = adjuntosCola.slice();
        adjuntosCola = [];
        if (cola.length) {
            adjuntosSubiendo = false;
            return subirArchivosAdjuntos(idCliente, cola);
        }

        adjuntosSubiendo = false;
        return { ok: true, mensaje: result.mensaje || "" };
    } catch (e) {
        adjuntosSubiendo = false;
        adjuntosCola = [];
        var msg = (e && e.responseJSON && e.responseJSON.mensaje) ? e.responseJSON.mensaje : "";
        if (!msg && e && (e.status === 404 || e.status === 413))
            msg = "El servidor rechazó el archivo. Si pesa mucho, probá con una imagen más chica.";
        if (!msg)
            msg = "No se pudieron guardar las imágenes.";
        setEstadoAdjuntos(msg);
        return { ok: false, mensaje: msg };
    }
}

async function subirAdjuntosPendientes(idCliente) {
    if (!adjuntosPendientes.length)
        return { ok: true, mensaje: "" };

    var files = adjuntosPendientes.map(function (item) { return item.file; });
    var result = await subirArchivosAdjuntos(idCliente, files);
    if (result.ok) {
        adjuntosPendientes.forEach(function (item) {
            if (item.url)
                URL.revokeObjectURL(item.url);
        });
        adjuntosPendientes = [];
        pintarAdjuntosCliente();
    }
    return result;
}

async function quitarAdjuntoGuardado(id) {
    if (!id)
        return;
    if (!(await confirmarModal("¿Sacar esta imagen de la ficha del cliente?")))
        return;

    try {
        var result = await MakeAjax({
            type: "POST",
            url: "/Clientes/EliminarAdjunto",
            data: { id: id },
            dataType: "json"
        });
        if (result && result.ok) {
            adjuntosGuardados = adjuntosGuardados.filter(function (x) { return x.Id !== id; });
            pintarAdjuntosCliente();
            setEstadoAdjuntos("Imagen eliminada.");
        } else {
            alert("No se pudo eliminar la imagen.");
        }
    } catch (e) {
        alert("No se pudo eliminar la imagen.");
    }
}

function quitarAdjuntoPendiente(localId) {
    var item = adjuntosPendientes.filter(function (x) { return x.localId === localId; })[0];
    if (item && item.url)
        URL.revokeObjectURL(item.url);
    adjuntosPendientes = adjuntosPendientes.filter(function (x) { return x.localId !== localId; });
    pintarAdjuntosCliente();
}

function pintarAdjuntosCliente() {
    var grid = document.getElementById("ceAdjGrid");
    var count = document.getElementById("ceAdjCount");
    if (!grid)
        return;

    var total = adjuntosGuardados.length + adjuntosPendientes.length;
    if (count)
        count.textContent = String(total);

    var html = "";

    adjuntosGuardados.forEach(function (item) {
        html += tarjetaAdjunto({
            nombre: item.Nombre,
            tamano: item.TamanoBytes,
            url: item.Url,
            esImagen: item.EsImagen,
            pendiente: false,
            accion: "quitarAdjuntoGuardado(" + item.Id + ")"
        });
    });

    adjuntosPendientes.forEach(function (item) {
        html += tarjetaAdjunto({
            nombre: item.nombre,
            tamano: item.tamano,
            url: item.url,
            esImagen: item.esImagen && !/\.pdf$/i.test(item.nombre),
            pendiente: true,
            accion: "quitarAdjuntoPendiente('" + item.localId + "')"
        });
    });

    grid.innerHTML = html;
}

function tarjetaAdjunto(item) {
    var preview;
    var nombre = escaparHtmlAdjunto(item.nombre || "archivo");
    if (item.esImagen) {
        preview = '<img class="ce-adj-thumb" src="' + escaparAttrAdjunto(item.url) + '" alt="' + nombre + '" onclick="abrirLightboxAdjunto(this.src, this.alt)" />';
    } else {
        var ext = ((item.nombre || "archivo").split(".").pop() || "FILE").toUpperCase();
        var icono = ext === "PDF" ? "fa-file-pdf-o" : "fa-file-image-o";
        preview = '<a class="ce-adj-pdf" href="' + escaparAttrAdjunto(item.url) + '" target="_blank" rel="noopener"><i class="fa ' + icono + '"></i><span>' + escaparHtmlAdjunto(ext) + '</span></a>';
    }

    return ''
        + '<article class="ce-adj-card">'
        + (item.pendiente ? '<span class="ce-adj-badge">Nuevo</span>' : '')
        + '<button type="button" class="ce-adj-remove" title="Quitar" onclick="' + item.accion + '"><i class="fa fa-times"></i></button>'
        + preview
        + '<div class="ce-adj-meta"><div class="ce-adj-name" title="' + nombre + '">' + nombre + '</div>'
        + '<div class="ce-adj-size">' + formatearPesoAdjunto(item.tamano) + '</div></div>'
        + '</article>';
}

function abrirLightboxAdjunto(src, titulo) {
    var box = document.getElementById("ceAdjLightbox");
    var img = document.getElementById("ceAdjLightboxImg");
    var cap = document.getElementById("ceAdjLightboxCaption");
    if (!box || !img)
        return;
    img.src = src;
    if (cap)
        cap.textContent = titulo || "";
    box.hidden = false;
}

function cerrarLightboxAdjunto() {
    var box = document.getElementById("ceAdjLightbox");
    var img = document.getElementById("ceAdjLightboxImg");
    if (!box)
        return;
    box.hidden = true;
    if (img)
        img.src = "";
}

function setEstadoAdjuntos(texto) {
    var el = document.getElementById("ceAdjEstado");
    if (!el)
        return;
    if (!texto) {
        el.hidden = true;
        el.textContent = "";
        return;
    }
    el.hidden = false;
    el.textContent = texto;
}

function formatearPesoAdjunto(bytes) {
    var n = Number(bytes) || 0;
    if (n < 1024)
        return n + " B";
    if (n < 1024 * 1024)
        return (n / 1024).toFixed(0) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
}

function escaparHtmlAdjunto(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escaparAttrAdjunto(texto) {
    return escaparHtmlAdjunto(texto).replace(/'/g, "&#39;");
}
