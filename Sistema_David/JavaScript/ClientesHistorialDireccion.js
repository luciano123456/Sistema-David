var _historialDireccionClienteId = 0;

function escHtmlHistorialDireccion(texto) {
    if (texto == null || texto === undefined) return "";
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function normHistorialDireccion(valor) {
    return (valor || "").toString().trim();
}

function fmtHistorialDireccionValor(valor, vacioLabel) {
    var v = normHistorialDireccion(valor);
    return v === "" ? (vacioLabel || "Sin dato") : escHtmlHistorialDireccion(v);
}

function campoHistorialCambio(ant, nue) {
    return normHistorialDireccion(ant) !== normHistorialDireccion(nue);
}

function parseHistorialDireccionFecha(fechaValor) {
    if (!fechaValor) return null;

    if (fechaValor instanceof Date && !isNaN(fechaValor.getTime())) {
        return fechaValor;
    }

    if (typeof fechaValor === "number" && !isNaN(fechaValor)) {
        var dNum = new Date(fechaValor);
        return isNaN(dNum.getTime()) ? null : dNum;
    }

    if (typeof fechaValor === "string") {
        var matchAsp = fechaValor.match(/\/Date\((-?\d+)\)\//);
        if (matchAsp && matchAsp[1]) {
            var dAsp = new Date(parseInt(matchAsp[1], 10));
            if (!isNaN(dAsp.getTime())) return dAsp;
        }

        var dIso = new Date(fechaValor);
        if (!isNaN(dIso.getTime())) return dIso;
    }

    return null;
}

function fmtHistorialDireccionFecha(fechaValor) {
    var d = parseHistorialDireccionFecha(fechaValor);
    if (!d) return { fecha: "-", hora: "" };

    var dia = String(d.getDate()).padStart(2, "0");
    var mes = String(d.getMonth() + 1).padStart(2, "0");
    var anio = d.getFullYear();
    var hora = String(d.getHours()).padStart(2, "0");
    var min = String(d.getMinutes()).padStart(2, "0");

    return {
        fecha: dia + "/" + mes + "/" + anio,
        hora: hora + ":" + min
    };
}

function toggleHistorialDireccionCard(btn) {
    var card = btn.closest(".hd-card");
    if (!card) return;

    var panel = card.querySelector(".hd-changes");
    var toggle = card.querySelector(".hd-card__toggle");
    if (!panel || !toggle) return;

    var colapsado = panel.classList.toggle("hd-changes--collapsed");
    card.classList.toggle("hd-card--collapsed", colapsado);
    toggle.classList.toggle("hd-card__toggle--collapsed", colapsado);
    toggle.setAttribute("aria-expanded", colapsado ? "false" : "true");
}

function badgeOrigenHistorial(origen) {
    var txt = normHistorialDireccion(origen) || "Sistema";
    var clase = "hd-origen--default";
    var icono = "fa-pencil";

    if (txt.toLowerCase() === "edicion") {
        clase = "hd-origen--edicion";
        icono = "fa-pencil-square-o";
    } else if (txt.toLowerCase() === "cobranza") {
        clase = "hd-origen--cobranza";
        icono = "fa-money";
    }

    return '<span class="hd-origen-badge ' + clase + '"><i class="fa ' + icono + '"></i> ' + escHtmlHistorialDireccion(txt) + '</span>';
}

function bloqueCambioHistorial(icono, etiqueta, ant, nue) {
    if (!campoHistorialCambio(ant, nue)) return "";

    return '<div class="hd-change-row">' +
        '<div class="hd-change-label"><i class="fa ' + icono + '"></i><span>' + etiqueta + '</span></div>' +
        '<div class="hd-change-values">' +
        '<span class="hd-val hd-val--old" title="Valor anterior">' + fmtHistorialDireccionValor(ant) + '</span>' +
        '<span class="hd-arrow" aria-hidden="true"><i class="fa fa-long-arrow-right"></i></span>' +
        '<span class="hd-val hd-val--new" title="Valor nuevo">' + fmtHistorialDireccionValor(nue) + '</span>' +
        '</div>' +
        '</div>';
}

function renderHistorialDireccionEstado(tipo, titulo, detalle) {
    var lista = document.getElementById("hdListaCambios");
    var contador = document.getElementById("hdContadorCambios");
    if (!lista) return;

    if (contador) {
        contador.textContent = tipo === "ok" ? "0 cambios" : "-";
        contador.classList.remove("hd-badge-count--active");
    }

    var icono = "fa-info-circle";
    if (tipo === "empty") icono = "fa-map-o";
    if (tipo === "error") icono = "fa-exclamation-triangle";

    lista.innerHTML =
        '<div class="hd-state hd-state--' + tipo + '">' +
        '<div class="hd-state-icon"><i class="fa ' + icono + '"></i></div>' +
        '<p class="hd-state-title">' + escHtmlHistorialDireccion(titulo) + '</p>' +
        (detalle ? '<p class="hd-state-detail">' + escHtmlHistorialDireccion(detalle) + '</p>' : '') +
        '</div>';
}

function renderHistorialDireccionTabla(rows, esAdmin) {
    var lista = document.getElementById("hdListaCambios");
    var contador = document.getElementById("hdContadorCambios");
    if (!lista) return;

    if (!rows || rows.length === 0) {
        renderHistorialDireccionEstado(
            "empty",
            "Sin cambios registrados",
            "Cuando se modifique la direcci\u00f3n o las coordenadas del cliente, vas a ver el detalle ac\u00e1."
        );
        return;
    }

    if (contador) {
        contador.textContent = rows.length === 1 ? "1 cambio" : rows.length + " cambios";
        contador.classList.add("hd-badge-count--active");
    }

    var html = "";
    rows.forEach(function (row, index) {
        var fh = fmtHistorialDireccionFecha(row.FechaCambio);
        var usuario = fmtHistorialDireccionValor(row.UsuarioNombre, "Usuario desconocido");
        var cambios =
            bloqueCambioHistorial("fa-home", "Direcci\u00f3n", row.DireccionAnterior, row.DireccionNueva) +
            bloqueCambioHistorial("fa-crosshairs", "Latitud", row.LatitudAnterior, row.LatitudNueva) +
            bloqueCambioHistorial("fa-crosshairs", "Longitud", row.LongitudAnterior, row.LongitudNueva);

        if (!cambios) {
            cambios = '<div class="hd-change-row hd-change-row--muted"><span>Sin detalle de campos modificados</span></div>';
        }

        var btnEliminar = "";
        if (esAdmin) {
            btnEliminar = '<button type="button" class="hd-btn-delete" title="Eliminar registro" onclick="event.stopPropagation(); eliminarHistorialDireccion(' + row.Id + ')">' +
                '<i class="fa fa-trash-o"></i><span class="hd-btn-delete-text">Eliminar</span></button>';
        }

        var colapsado = index > 0;
        var claseCard = colapsado ? " hd-card--collapsed" : "";
        var clasePanel = colapsado ? " hd-changes--collapsed" : "";
        var claseToggle = colapsado ? " hd-card__toggle--collapsed" : "";
        var ariaExpanded = colapsado ? "false" : "true";

        html += '<article class="hd-card' + claseCard + '" role="listitem" style="--hd-delay:' + (index * 45) + 'ms">' +
            '<div class="hd-card__rail" aria-hidden="true"><span class="hd-card__dot"></span></div>' +
            '<div class="hd-card__body">' +
            '<header class="hd-card__head">' +
            '<button type="button" class="hd-card__toggle' + claseToggle + '" aria-expanded="' + ariaExpanded + '" title="Plegar / desplegar detalle" onclick="toggleHistorialDireccionCard(this)">' +
            '<i class="fa fa-chevron-down"></i></button>' +
            '<div class="hd-card__head-main">' +
            '<div class="hd-card__meta">' +
            '<div class="hd-card__datetime">' +
            '<time class="hd-card__date">' + fh.fecha + '</time>' +
            (fh.hora ? '<span class="hd-card__time"><i class="fa fa-clock-o"></i> ' + fh.hora + ' hs</span>' : '') +
            '</div>' +
            badgeOrigenHistorial(row.Origen) +
            '</div>' +
            '<div class="hd-card__actions">' +
            '<div class="hd-card__user" title="Usuario que realiz\u00f3 el cambio"><i class="fa fa-user-circle"></i><span>' + usuario + '</span></div>' +
            btnEliminar +
            '</div>' +
            '</div>' +
            '</header>' +
            '<div class="hd-changes' + clasePanel + '">' + cambios + '</div>' +
            '</div>' +
            '</article>';
    });

    lista.innerHTML = html;
}

function mostrarHistorialDireccionCargando() {
    var lista = document.getElementById("hdListaCambios");
    var contador = document.getElementById("hdContadorCambios");
    if (contador) {
        contador.textContent = "Cargando...";
        contador.classList.remove("hd-badge-count--active");
    }
    if (lista) {
        lista.innerHTML =
            '<div class="hd-state hd-state--loading">' +
            '<div class="hd-skeleton-card"></div>' +
            '<div class="hd-skeleton-card"></div>' +
            '<div class="hd-skeleton-card hd-skeleton-card--short"></div>' +
            '</div>';
    }
}

async function cargarHistorialDireccion(idCliente) {
    _historialDireccionClienteId = idCliente;
    mostrarHistorialDireccionCargando();

    try {
        var options = {
            type: "GET",
            url: "/Clientes/ListarHistorialDireccion?idCliente=" + encodeURIComponent(idCliente),
            async: true,
            dataType: "json"
        };

        var result = await MakeAjax(options);
        if (!result || !result.Status) {
            renderHistorialDireccionEstado("error", "No se pudo cargar el historial", "Intent\u00e1 de nuevo en unos segundos.");
            return;
        }

        renderHistorialDireccionTabla(result.Data, result.EsAdmin === true);
    } catch (e) {
        renderHistorialDireccionEstado("error", "Error al cargar el historial", "Revis\u00e1 tu conexi\u00f3n e intent\u00e1 otra vez.");
    }
}

function abrirHistorialDireccionCliente(idCliente) {
    if (!idCliente) return;
    cargarHistorialDireccion(idCliente);
    jQuery("#modalHistorialDireccion").modal("show");
}

function abrirHistorialDireccionClienteDesdeEdicion() {
    var el = document.getElementById("IdCliente");
    if (!el) return;
    var idCliente = (el.value || el.textContent || "").toString().trim();
    if (!idCliente) return;
    abrirHistorialDireccionCliente(parseInt(idCliente, 10));
}

async function eliminarHistorialDireccion(id) {
    if (!confirm("\u00bfEliminar este registro del historial de direcci\u00f3n?")) return;

    try {
        var options = {
            type: "POST",
            url: "/Clientes/EliminarHistorialDireccion",
            async: true,
            data: JSON.stringify({ Id: id }),
            contentType: "application/json",
            dataType: "json"
        };

        var result = await MakeAjax(options);
        if (result && result.Status) {
            if (_historialDireccionClienteId > 0) {
                await cargarHistorialDireccion(_historialDireccionClienteId);
            }
        } else {
            alert((result && result.Message) ? result.Message : "No se pudo eliminar el registro.");
        }
    } catch (e) {
        alert("Error al eliminar el registro.");
    }
}

function iconoHistorialDireccionHtml(idCliente) {
    return '<button type="button" class="hd-trigger-eye" title="Ver historial de direcci\u00f3n" onclick="abrirHistorialDireccionCliente(' + idCliente + ')">' +
        '<i class="fa fa-eye"></i></button>';
}
