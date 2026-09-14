(function () {
    var pendCache = [];
    var histCache = [];
    var histProductoFiltro = 0;
    var pendSelectedIds = {};
    var pendLastSelId = null;

    function fmtFecha(v) {
        if (!v) return "—";
        var d;
        if (typeof v === "string" && v.indexOf("/Date(") === 0) {
            d = new Date(parseInt(v.replace(/\D/g, ""), 10));
        } else {
            d = new Date(v);
        }
        if (isNaN(d.getTime())) {
            var s = String(v);
            return s.replace("T", " ").substring(0, 16);
        }
        var p = function (n) { return n < 10 ? "0" + n : "" + n; };
        return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
    }

    function nombrePersona(v) {
        if (v == null) return "";
        var s = String(v).replace(/\s+/g, " ").trim();
        s = s.replace(/\s+\d+$/, "").trim();
        return s;
    }

    function etiquetaResolucion(estado) {
        var e = String(estado || "").toLowerCase();
        if (e.indexOf("rechaz") >= 0) return "Rechazó";
        return "Aceptó";
    }

    function tipoLabel(t) {
        var map = {
            Nuevo: "Alta",
            Editar: "Edición",
            Eliminar: "Baja",
            Stock: "Stock",
            Activo: "Estado"
        };
        return map[t] || t || "Cambio";
    }

    function tipoClass(t) {
        var map = { Nuevo: "ok", Editar: "info", Eliminar: "danger", Stock: "warn", Activo: "info" };
        return map[t] || "info";
    }

    function citarNombre(nombre) {
        var n = String(nombre == null ? "" : nombre).trim();
        return n ? "«" + n + "»" : "la solicitud";
    }

    function nombresDeIds(ids) {
        return (ids || []).map(function (id) {
            var s = pendCache.filter(function (x) { return Number(x.Id) === Number(id); })[0];
            return s && s.NombreProducto ? s.NombreProducto : "";
        }).filter(Boolean);
    }

    function listarNombres(nombres, cant) {
        if (nombres && nombres.length) {
            return nombres.map(function (n) { return "«" + n + "»"; }).join(", ");
        }
        var n = Number(cant) || 0;
        return n === 1 ? "1 solicitud" : n + " solicitudes";
    }

    function nombreRevision() {
        var t = String($("#revSubtitulo").text() || "");
        var parts = t.split("·");
        return parts.length > 1 ? parts.slice(1).join("·").trim() : "";
    }

    function tipoRevision() {
        var t = String($("#revSubtitulo").text() || "");
        var raw = (t.split("·")[0] || "").trim();
        var map = {
            Alta: "el alta",
            "Edición": "la edición",
            Baja: "la baja",
            Stock: "el stock",
            Estado: "el cambio de estado"
        };
        return map[raw] || (raw ? raw.toLowerCase() : "el cambio");
    }

    function estadoClass(e) {
        var map = { Pendiente: "warn", Aceptado: "ok", Rechazado: "danger", Aplicado: "ok", Reemplazada: "muted" };
        return map[e] || "muted";
    }

    window.prodRefreshPendientes = function () {
        cargarPendientes();
        actualizarBadge();
        if ($("#prodSecHistorial").is(":visible") || !$("#prodSecHistorial").hasClass("d-none")) {
            // no-op unless historial tab open
        }
    };

    window.prodAbrirHistorialProducto = function (idProducto) {
        if (typeof prodEsAdmin === "function" && !prodEsAdmin()) return;
        histProductoFiltro = idProducto || 0;
        mostrarSeccion("historial");
        cargarHistorial();
    };

    function actualizarBadge() {
        if (typeof prodEsAdmin === "function" && !prodEsAdmin()) return;
        $.getJSON("/Productos/ContarPendientes", function (r) {
            var n = (r && r.Count) || 0;
            var $b = $("#prodPendCount");
            if (n > 0) $b.text(n).removeAttr("hidden").removeClass("d-none");
            else $b.attr("hidden", "hidden").text("0");
            var $nav = $("#badgeProdPendientes");
            if ($nav.length) {
                if (n > 0) $nav.text(n).removeAttr("hidden");
                else $nav.attr("hidden", "hidden");
            }
        });
    }

    function mostrarSeccion(sec) {
        $("#prodSecTabs .prod-sec-tab").removeClass("is-on");
        $('#prodSecTabs .prod-sec-tab[data-sec="' + sec + '"]').addClass("is-on");
        $("#prodSecCatalogo, #prodSecPendientes, #prodSecHistorial").addClass("d-none");
        if (sec === "pendientes") $("#prodSecPendientes").removeClass("d-none");
        else if (sec === "historial") $("#prodSecHistorial").removeClass("d-none");
        else {
            $("#prodSecCatalogo").removeClass("d-none");
            if (typeof prodAplicarVista === "function") prodAplicarVista(prodLeerVista(), false);
        }
        document.body.classList.toggle("prod-sec-pendientes", sec === "pendientes");
        document.body.classList.toggle("prod-sec-historial", sec === "historial");
    }

    function cargarPendientes() {
        if (typeof mostrarCargaTablas === "function") {
            window._prodPendCarga = mostrarCargaTablas("Cargando tablas...", {});
        }
        $.getJSON("/Productos/ListarPendientes", function (json) {
            if (typeof ocultarCargaTablas === "function") ocultarCargaTablas(window._prodPendCarga);
            pendCache = (json && json.data) || [];
            renderPendientes();
        }).fail(function () {
            if (typeof ocultarCargaTablas === "function") ocultarCargaTablas(window._prodPendCarga);
            mostrarToast("No se pudieron cargar los pendientes. Intentá de nuevo.", "error");
        });
    }

    function renderPendientes() {
        var q = String($("#prodPendQ").val() || "").toLowerCase().trim();
        var rows = pendCache.filter(function (s) {
            if (!q) return true;
            var blob = ((s.NombreProducto || "") + " " + (s.UsuarioSolicita || "") + " " + (s.Tipo || "")).toLowerCase();
            return blob.indexOf(q) >= 0;
        });

        var $empty = $("#prodPendEmpty");
        var $grid = $("#prodPendGrid");
        if (!rows.length) {
            $empty.removeClass("d-none");
            $grid.empty();
            syncPendSelUi();
            return;
        }
        $empty.addClass("d-none");
        $grid.html(rows.map(function (s) {
            var cambios = s.Cambios || [];
            var chips = cambios.slice(0, 5).map(function (c) {
                return '<span class="prod-diff-chip">' + prodEscaparHtml(c.Etiqueta) + '</span>';
            }).join("");
            if (cambios.length > 5) chips += '<span class="prod-diff-chip">+' + (cambios.length - 5) + '</span>';
            return (
                '<article class="prod-pend-card" data-id="' + s.Id + '">' +
                '<input type="checkbox" class="prod-pend-check" title="Seleccionar" aria-label="Seleccionar" />' +
                '<div class="prod-pend-glow"></div>' +
                '<div class="prod-pend-card-top">' +
                '<span class="prod-tag ' + tipoClass(s.Tipo) + '">' + prodEscaparHtml(tipoLabel(s.Tipo)) + '</span>' +
                '<span class="prod-tag warn">En revisión</span>' +
                '</div>' +
                '<div class="prod-pend-who">' +
                '<span class="prod-pend-avatar">' + prodEscaparHtml((s.UsuarioSolicita || "?").charAt(0).toUpperCase()) + '</span>' +
                '<div><b>' + prodEscaparHtml(s.NombreProducto || "Producto") + '</b>' +
                '<small>' + prodEscaparHtml(s.UsuarioSolicita || "—") + ' · ' + fmtFecha(s.FechaSolicitud) + '</small></div>' +
                '</div>' +
                '<div class="prod-pend-count">' + (s.CantidadCampos || cambios.length || 0) + ' campos para revisar</div>' +
                '<div class="prod-diff-chips">' + chips + '</div>' +
                '<button type="button" class="btn prod-pend-cta" data-rev="' + s.Id + '"><i class="fa fa-exchange me-1"></i> Ver cambios</button>' +
                '</article>'
            );
        }).join(""));
        syncPendSelUi();
    }

    function pendSelCount() {
        return Object.keys(pendSelectedIds).length;
    }

    function pendSelSet(id, on) {
        var key = String(id);
        if (on) pendSelectedIds[key] = true;
        else delete pendSelectedIds[key];
    }

    function pendSelClear() {
        pendSelectedIds = {};
        pendLastSelId = null;
    }

    function pendCardsVisibles() {
        return Array.prototype.slice.call(document.querySelectorAll("#prodPendGrid .prod-pend-card"));
    }

    function syncPendSelUi() {
        var n = pendSelCount();
        document.querySelectorAll("#prodPendGrid .prod-pend-card").forEach(function (el) {
            var id = el.getAttribute("data-id");
            var on = !!pendSelectedIds[id];
            el.classList.toggle("is-selected", on);
            var chk = el.querySelector(".prod-pend-check");
            if (chk) chk.checked = on;
        });
        var countEl = document.getElementById("prodPendSelCount");
        var clearBtn = document.getElementById("prodPendSelClear");
        var actions = document.getElementById("prodPendSelActions");
        if (countEl) {
            countEl.textContent = n === 1 ? "1 seleccionada" : n + " seleccionadas";
            countEl.classList.toggle("is-empty", n === 0);
        }
        if (clearBtn) clearBtn.hidden = n === 0;
        if (actions) actions.hidden = n === 0;
    }

    function pendSelClickCard(card, e) {
        var id = card.getAttribute("data-id");
        if (!id) return;
        var visibles = pendCardsVisibles();
        var multi = e.ctrlKey || e.metaKey;
        var range = e.shiftKey;

        if (range && pendLastSelId) {
            var from = -1, to = -1, i;
            for (i = 0; i < visibles.length; i++) {
                var vid = visibles[i].getAttribute("data-id");
                if (vid === pendLastSelId) from = i;
                if (vid === id) to = i;
            }
            if (from >= 0 && to >= 0) {
                if (!multi) pendSelClear();
                var a = Math.min(from, to), b = Math.max(from, to);
                for (i = a; i <= b; i++) pendSelSet(visibles[i].getAttribute("data-id"), true);
                pendLastSelId = id;
                syncPendSelUi();
                return;
            }
        }

        if (multi) {
            pendSelSet(id, !pendSelectedIds[id]);
        } else {
            var onlyThis = pendSelCount() === 1 && pendSelectedIds[id];
            pendSelClear();
            if (!onlyThis) pendSelSet(id, true);
        }
        pendLastSelId = id;
        syncPendSelUi();
    }

    function pendIdsSeleccionados() {
        return Object.keys(pendSelectedIds).map(function (k) { return parseInt(k, 10); }).filter(function (n) { return n > 0; });
    }

    async function resolverMasivo(aceptar) {
        var ids = pendIdsSeleccionados();
        if (!ids.length) {
            mostrarToast("Seleccioná al menos una solicitud.", "warning");
            return;
        }
        var verbo = aceptar ? "aceptar y aplicar" : "rechazar";
        var okMasivo = await confirmarModal("¿Confirmás " + verbo + " <b>" + ids.length + "</b> solicitud(es)?", {
            textoAceptar: "Aceptar",
            textoCancelar: "Cancelar",
            claseAceptar: aceptar ? "btn-success" : "btn-danger"
        });
        if (!okMasivo) return;

        try {
            var result = await MakeAjax({
                type: "POST",
                url: aceptar ? "/Productos/AceptarPendientes" : "/Productos/RechazarPendientes",
                async: true,
                data: JSON.stringify({ Ids: ids, Comentario: "" }),
                contentType: "application/json",
                dataType: "json"
            });
            if (result && result.Status) {
                pendSelClear();
                var lista = listarNombres(nombresDeIds(ids), ids.length);
                var verboOk = aceptar
                    ? (ids.length === 1 ? "Se aceptó " : "Se aceptaron ")
                    : (ids.length === 1 ? "Se rechazó " : "Se rechazaron ");
                mostrarToast(verboOk + lista + ".", "success");
                cargarPendientes();
                actualizarBadge();
                if (typeof gridProductos !== "undefined" && gridProductos) gridProductos.ajax.reload(null, false);
                cargarHistorial();
            } else {
                mostrarToast((result && result.Mensaje) || ("No se pudieron " + (aceptar ? "aceptar" : "rechazar") + " " + listarNombres(nombresDeIds(ids), ids.length) + "."), "error");
            }
        } catch (e) {
            mostrarToast("No se pudieron resolver las solicitudes seleccionadas.", "error");
        }
    }

    function abrirRevision(id) {
        $.getJSON("/Productos/DetallePendiente", { id: id }, function (r) {
            if (!r || !r.Status || !r.Solicitud) {
                mostrarToast((r && r.Mensaje) || "No se pudo cargar la solicitud.", "error");
                return;
            }
            pintarRevision(r.Solicitud, "pendiente");
        });
    }

    function abrirHistorialDetalle(id) {
        $.getJSON("/Productos/DetalleHistorial", { id: id }, function (r) {
            if (!r || !r.Status || !r.Historial) {
                mostrarToast("No se pudo cargar el histórico.", "error");
                return;
            }
            var h = r.Historial;
            var fake = {
                Id: h.IdSolicitud || 0,
                Tipo: h.Tipo,
                NombreProducto: h.NombreProducto,
                Estado: h.EstadoResultado,
                UsuarioSolicita: nombrePersona(h.UsuarioSolicitud),
                UsuarioResuelve: nombrePersona(h.UsuarioResolucion),
                FechaSolicitud: h.Fecha,
                Comentario: h.Comentario,
                Cambios: h.Cambios || [],
                Resumen: h.Resumen,
                Origen: h.Origen
            };
            pintarRevision(fake, "historial");
        });
    }

    function prodDiffChipHtml(c) {
        var oldV = (c.ValorAnterior == null || String(c.ValorAnterior).trim() === "") ? "—" : String(c.ValorAnterior);
        var newV = (c.ValorNuevo == null || String(c.ValorNuevo).trim() === "") ? "—" : String(c.ValorNuevo);
        var isLong = oldV.length > 70 || newV.length > 70 || oldV.indexOf("\n") >= 0 || newV.indexOf("\n") >= 0;
        var onlyNew = (oldV === "—" || oldV === "(sin imagen)") && newV !== "—";
        var onlyOld = (newV === "—" || newV === "(sin imagen)") && oldV !== "—";

        if (onlyNew) {
            return '<span class="prod-diff-chip prod-diff-chip--add' + (isLong ? " is-long" : "") + '">' +
                '<span class="prod-diff-field">' + prodEscaparHtml(c.Etiqueta) + '</span>' +
                '<span class="prod-diff-new" title="Después">' + prodEscaparHtml(newV) + '</span>' +
                "</span>";
        }
        if (onlyOld) {
            return '<span class="prod-diff-chip prod-diff-chip--del' + (isLong ? " is-long" : "") + '">' +
                '<span class="prod-diff-field">' + prodEscaparHtml(c.Etiqueta) + '</span>' +
                '<span class="prod-diff-old" title="Antes">' + prodEscaparHtml(oldV) + '</span>' +
                "</span>";
        }

        return '<span class="prod-diff-chip prod-diff-chip--diff' + (isLong ? " is-long" : "") + '">' +
            '<span class="prod-diff-field">' + prodEscaparHtml(c.Etiqueta) + '</span>' +
            '<span class="prod-diff-old" title="Antes">' + prodEscaparHtml(oldV) + '</span>' +
            '<span class="prod-diff-arrow" aria-hidden="true">→</span>' +
            '<span class="prod-diff-new" title="Después">' + prodEscaparHtml(newV) + '</span>' +
            "</span>";
    }

    function pintarRevision(s, modo) {
        $("#revIdSolicitud").val(s.Id || 0);
        $("#revModo").val(modo);
        $("#revTitulo").text(modo === "historial" ? "Detalle del histórico" : "Revisión de cambios");
        $("#revSubtitulo").text(tipoLabel(s.Tipo) + " · " + (s.NombreProducto || ""));
        $("#revComentario").val("");

        var esAdmin = typeof prodEsAdmin === "function" && prodEsAdmin();
        var mostrarAcciones = modo === "pendiente" && esAdmin;
        $(".prod-rev-admin-only").toggle(mostrarAcciones);
        $("#revComentarioWrap").toggle(mostrarAcciones);

        var meta = [];
        meta.push('<div class="prod-rev-pill"><span>Tipo</span><b>' + prodEscaparHtml(tipoLabel(s.Tipo)) + '</b></div>');
        meta.push('<div class="prod-rev-pill"><span>Estado</span><b>' + prodEscaparHtml(s.Estado || "Pendiente") + '</b></div>');
        var solicito = nombrePersona(s.UsuarioSolicita);
        if (solicito) meta.push('<div class="prod-rev-pill"><span>Solicitó</span><b>' + prodEscaparHtml(solicito) + '</b></div>');
        meta.push('<div class="prod-rev-pill"><span>Fecha</span><b>' + fmtFecha(s.FechaSolicitud) + '</b></div>');
        var resolvio = nombrePersona(s.UsuarioResuelve);
        if (resolvio) meta.push('<div class="prod-rev-pill"><span>' + etiquetaResolucion(s.Estado) + '</span><b>' + prodEscaparHtml(resolvio) + '</b></div>');
        if (s.Origen) meta.push('<div class="prod-rev-pill"><span>Origen</span><b>' + prodEscaparHtml(s.Origen) + '</b></div>');
        if (s.Resumen) meta.push('<div class="prod-rev-pill prod-rev-pill-wide"><span>Resumen</span><b>' + prodEscaparHtml(s.Resumen) + '</b></div>');
        if (s.Comentario && modo === "historial") meta.push('<div class="prod-rev-pill prod-rev-pill-wide"><span>Comentario</span><b>' + prodEscaparHtml(s.Comentario) + '</b></div>');
        $("#revMeta").html(meta.join(""));

        var fotos = "";
        var sid = s.Id || 0;
        var hayFoto = (s.Cambios || []).some(function (c) { return c.TipoValor === "imagen" || c.TipoValor === "imagenes" || c.Campo === "Imagen"; });
        if (modo === "pendiente" && sid && hayFoto) {
            fotos += '<div class="prod-rev-foto-col"><span>Antes</span><img src="/Productos/ImagenSolicitud?id=' + sid + '&lado=antes&t=' + Date.now() + '" alt="" onclick="openModal(this.src)" /></div>';
            fotos += '<div class="prod-rev-foto-col"><span>Después</span><img src="/Productos/ImagenSolicitud?id=' + sid + '&lado=despues&t=' + Date.now() + '" alt="" onclick="openModal(this.src)" /></div>';
        }
        $("#revFotos").html(fotos).toggle(!!fotos);

        var cambios = s.Cambios || [];
        var grupos = {};
        cambios.forEach(function (c) {
            var g = c.Grupo || "General";
            if (!grupos[g]) grupos[g] = [];
            grupos[g].push(c);
        });

        var html = "";
        Object.keys(grupos).forEach(function (g) {
            html += '<div class="prod-rev-group"><h6>' + prodEscaparHtml(g) + '</h6><div class="prod-diff-chips">';
            grupos[g].forEach(function (c) {
                html += prodDiffChipHtml(c);
            });
            html += "</div></div>";
        });
        if (!cambios.length) html = '<p class="prod-hint">No hay detalle de campos para este movimiento.</p>';
        $("#revCambios").html(html);
        $("#modalRevisionProducto").modal("show");
    }

    async function resolver(aceptar) {
        var id = parseInt($("#revIdSolicitud").val(), 10) || 0;
        if (!id) return;
        var comentario = $("#revComentario").val() || "";
        var url = aceptar ? "/Productos/AceptarPendiente" : "/Productos/RechazarPendiente";
        var verbo = aceptar ? "aceptar y aplicar" : "rechazar";
        var okSimple = await confirmarModal("¿Confirmás " + verbo + " esta solicitud?", {
            textoAceptar: "Aceptar",
            textoCancelar: "Cancelar",
            claseAceptar: aceptar ? "btn-success" : "btn-danger"
        });
        if (!okSimple) return;

        try {
            var result = await MakeAjax({
                type: "POST",
                url: url,
                async: true,
                data: { Id: id, Comentario: comentario },
                dataType: "json"
            });
            if (result && result.Status) {
                $("#modalRevisionProducto").modal("hide");
                var nomRev = citarNombre(nombreRevision());
                var tipoRev = tipoRevision();
                mostrarToast(aceptar
                    ? ("Se aplicó " + tipoRev + " de " + nomRev + ".")
                    : ("Se rechazó " + tipoRev + " de " + nomRev + "."), "success");
                cargarPendientes();
                actualizarBadge();
                if (typeof gridProductos !== "undefined" && gridProductos) gridProductos.ajax.reload(null, false);
                cargarHistorial();
            } else {
                mostrarToast((result && result.Mensaje) || ("No se pudo " + (aceptar ? "aplicar" : "rechazar") + " " + tipoRevision() + " de " + citarNombre(nombreRevision()) + "."), "error");
            }
        } catch (e) {
            mostrarToast("No se pudo resolver " + tipoRevision() + " de " + citarNombre(nombreRevision()) + ".", "error");
        }
    }

    function cargarHistorial() {
        if (typeof mostrarCargaTablas === "function") {
            window._prodHistCarga = mostrarCargaTablas("Cargando tablas...", {});
        }
        var desde = $("#prodHistDesde").val() || "";
        var hasta = $("#prodHistHasta").val() || "";
        var qs = "/Productos/ListarHistorial?desde=" + encodeURIComponent(desde) + "&hasta=" + encodeURIComponent(hasta);
        if (histProductoFiltro) qs += "&idProducto=" + histProductoFiltro;
        $.getJSON(qs, function (json) {
            if (typeof ocultarCargaTablas === "function") ocultarCargaTablas(window._prodHistCarga);
            histCache = (json && json.data) || [];
            renderHistorial();
        }).fail(function () {
            if (typeof ocultarCargaTablas === "function") ocultarCargaTablas(window._prodHistCarga);
            mostrarToast("No se pudo cargar el historial. Intentá de nuevo.", "error");
        });
    }

    function renderHistorial() {
        var q = String($("#prodHistQ").val() || "").toLowerCase().trim();
        var rows = histCache.filter(function (h) {
            if (!q) return true;
            var blob = ((h.NombreProducto || "") + " " + (h.UsuarioSolicitud || "") + " " + (h.UsuarioResolucion || "") + " " + (h.UsuarioNombre || "") + " " + (h.Tipo || "") + " " + (h.Resumen || "")).toLowerCase();
            return blob.indexOf(q) >= 0;
        });
        var $tl = $("#prodHistTimeline");
        if (!rows.length) {
            $tl.html('<div class="prod-empty-hero"><div class="prod-empty-orb"><i class="fa fa-clock-o"></i></div><h4>Sin movimientos</h4><p>No hay histórico para el filtro elegido.</p></div>');
            return;
        }
        $tl.html(rows.map(function (h) {
            var cambios = h.Cambios || [];
            var quien = nombrePersona(h.UsuarioSolicitud);
            var resolvio = nombrePersona(h.UsuarioResolucion);
            var pieUsuarios = "";
            if (quien) pieUsuarios += '<span><i class="fa fa-user"></i> Solicitó ' + prodEscaparHtml(quien) + '</span>';
            if (resolvio) pieUsuarios += '<span><i class="fa fa-check"></i> ' + etiquetaResolucion(h.EstadoResultado) + ' ' + prodEscaparHtml(resolvio) + '</span>';
            if (!pieUsuarios) pieUsuarios = '<span><i class="fa fa-user"></i> ' + prodEscaparHtml(nombrePersona(h.UsuarioNombre) || "—") + '</span>';
            return (
                '<article class="prod-hist-item" data-hist="' + h.Id + '">' +
                '<div class="prod-hist-dot ' + estadoClass(h.EstadoResultado) + '"></div>' +
                '<div class="prod-hist-card">' +
                '<div class="prod-hist-head">' +
                '<span class="prod-tag ' + tipoClass(h.Tipo) + '">' + prodEscaparHtml(tipoLabel(h.Tipo)) + '</span>' +
                '<span class="prod-tag ' + estadoClass(h.EstadoResultado) + '">' + prodEscaparHtml(h.EstadoResultado || "") + '</span>' +
                '<span class="prod-hist-date"><i class="fa fa-calendar me-1"></i>' + fmtFecha(h.Fecha) + '</span>' +
                '</div>' +
                '<h3>' + prodEscaparHtml(h.NombreProducto || "Producto") + '</h3>' +
                '<p class="prod-hist-resumen">' + prodEscaparHtml(h.Resumen || "") + '</p>' +
                '<div class="prod-hist-foot">' +
                pieUsuarios +
                (h.Origen ? '<span>' + prodEscaparHtml(h.Origen) + '</span>' : "") +
                (cambios.length ? '<span>' + cambios.length + ' campos</span>' : "") +
                '<span class="prod-hist-open">Ver detalle <i class="fa fa-angle-right"></i></span>' +
                '</div></div></article>'
            );
        }).join(""));
    }

    $(document).ready(function () {
        if (!window.userSession) {
            try { userSession = JSON.parse(localStorage.getItem("usuario")); } catch (e) { }
        }
        if (typeof prodEsAdmin === "function" && !prodEsAdmin()) return;

        $("#prodSecTabs").on("click", ".prod-sec-tab", function () {
            var sec = this.getAttribute("data-sec");
            if (sec === "historial") histProductoFiltro = 0;
            mostrarSeccion(sec);
            if (sec === "pendientes") cargarPendientes();
            if (sec === "historial") cargarHistorial();
        });

        $("#prodPendQ").on("input", renderPendientes);
        $("#prodPendGrid").on("click", "[data-rev]", function (e) {
            e.stopPropagation();
            abrirRevision(parseInt(this.getAttribute("data-rev"), 10));
        });
        $("#prodPendGrid").on("click", ".prod-pend-card", function (e) {
            if ($(e.target).closest(".prod-pend-cta, .prod-pend-check").length) return;
            pendSelClickCard(this, e);
        });
        $("#prodPendGrid").on("change", ".prod-pend-check", function (e) {
            e.stopPropagation();
            var card = this.closest(".prod-pend-card");
            if (!card) return;
            pendSelSet(card.getAttribute("data-id"), this.checked);
            pendLastSelId = card.getAttribute("data-id");
            syncPendSelUi();
        });
        $("#prodPendSelAll").on("click", function () {
            pendCardsVisibles().forEach(function (el) { pendSelSet(el.getAttribute("data-id"), true); });
            syncPendSelUi();
        });
        $("#prodPendSelClear").on("click", function () {
            pendSelClear();
            syncPendSelUi();
        });
        $("#prodPendAceptarSel").on("click", function () { resolverMasivo(true); });
        $("#prodPendRechazarSel").on("click", function () { resolverMasivo(false); });
        $("#btnRevAceptar").on("click", function () { resolver(true); });
        $("#btnRevRechazar").on("click", function () { resolver(false); });
        $("#btnProdHistBuscar").on("click", function () {
            histProductoFiltro = 0;
            cargarHistorial();
        });
        $("#prodHistQ").on("input", renderHistorial);
        $("#prodHistTimeline").on("click", ".prod-hist-item", function () {
            abrirHistorialDetalle(parseInt(this.getAttribute("data-hist"), 10));
        });

        actualizarBadge();
    });
})();
