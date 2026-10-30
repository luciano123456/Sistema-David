let gridPendientes = null;
let pestana = "pendientes";
let usuariosModulo = [];
let vendedoresLista = [];
let destManual = false;
let select2Listos = false;
let pdAdjuntosNuevos = [];
let pdAdjuntosGuardados = [];
const esAdminPd = document.querySelector(".pd-root")?.getAttribute("data-es-admin") === "1";
const idAbrirPd = Number(document.querySelector(".pd-root")?.getAttribute("data-abrir") || 0);
const userSessionPd = JSON.parse(localStorage.getItem("usuario") || "null");

function escapePd(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function tieneSelect2() {
    return !!(window.jQuery && jQuery.fn && jQuery.fn.select2);
}

function chipPrioridad(v) {
    const cls = v === "Alta" ? "is-alta" : v === "Baja" ? "is-baja" : "is-media";
    return '<span class="pd-chip ' + cls + '">' + escapePd(v || "") + "</span>";
}

function chipEstado(v) {
    const cls = v === "Solucionado" ? "is-ok" : v === "En proceso" ? "is-proc" : "is-pend";
    return '<span class="pd-chip ' + cls + '">' + escapePd(v || "") + "</span>";
}

function chipTipo(v) {
    const cls = v === "Cliente" ? "is-cli" : v === "Vendedor" ? "is-ven" : "is-int";
    return '<span class="pd-chip ' + cls + '">' + escapePd(v || "") + "</span>";
}

function modalPendienteEl() {
    return document.getElementById("modalPendiente");
}

function limpiarBackdrops() {
    const abiertos = document.querySelectorAll(".modal.show");
    const backs = document.querySelectorAll("body > .modal-backdrop, .modal-backdrop");
    if (!abiertos.length) {
        backs.forEach(function (b) { b.remove(); });
        document.body.classList.remove("modal-open");
        document.body.style.removeProperty("overflow");
        document.body.style.removeProperty("padding-right");
        document.documentElement.style.removeProperty("overflow");
        return;
    }
    const extras = Array.from(backs);
    extras.slice(0, Math.max(0, extras.length - 1)).forEach(function (b) { b.remove(); });
    document.body.classList.add("modal-open");
}

function instanciaModalPendiente() {
    const el = modalPendienteEl();
    if (!el || typeof bootstrap === "undefined") return null;
    return bootstrap.Modal.getOrCreateInstance(el, { backdrop: true, keyboard: true, focus: false });
}

function mostrarModalPendiente() {
    const el = modalPendienteEl();
    if (!el) return;
    const abrir = function () {
        if (el.classList.contains("show")) {
            limpiarBackdrops();
            return;
        }
        const inst = instanciaModalPendiente();
        if (inst) inst.show();
    };
    const alarma = document.getElementById("modalAlarmaPendiente");
    if (alarma && alarma.classList.contains("show") && typeof bootstrap !== "undefined") {
        const instAlarma = bootstrap.Modal.getInstance(alarma);
        alarma.addEventListener("hidden.bs.modal", function onHid() {
            alarma.removeEventListener("hidden.bs.modal", onHid);
            abrir();
        }, { once: true });
        if (instAlarma) instAlarma.hide();
        else abrir();
        return;
    }
    abrir();
}

function ocultarModalPendiente() {
    const el = modalPendienteEl();
    if (!el) {
        limpiarBackdrops();
        return;
    }
    const inst = typeof bootstrap !== "undefined" ? bootstrap.Modal.getInstance(el) : null;
    if (inst) inst.hide();
    setTimeout(limpiarBackdrops, 380);
}

function engancharLimpiezaModales() {
    document.addEventListener("hidden.bs.modal", function (ev) {
        if (!ev.target || !ev.target.classList.contains("modal")) return;
        setTimeout(limpiarBackdrops, 0);
        setTimeout(limpiarBackdrops, 400);
    });
    document.addEventListener("hide.bs.modal", function (ev) {
        if (ev.target && ev.target.id === "modalPendiente") {
            setTimeout(function () {
                const el = modalPendienteEl();
                const otros = document.querySelectorAll(".modal.show");
                if (!el?.classList.contains("show") && !otros.length)
                    limpiarBackdrops();
            }, 420);
        }
    });
}

function pdSelect2ParentModal() {
    const $m = $("#modalPendiente");
    return $m.length ? $m : $(document.body);
}

function pdSelect2Base(extra) {
    return Object.assign({
        width: "100%",
        dropdownParent: pdSelect2ParentModal(),
        dropdownCssClass: "pd-s2-dropdown",
        language: {
            noResults: function () { return "Sin resultados"; },
            searching: function () { return "Buscando…"; },
            inputTooShort: function () { return "Escribí al menos 2 letras"; },
            removeAllItems: function () { return "Quitar todos"; }
        }
    }, extra || {});
}

function engancharSelect2FocoModal() {
    $(document).off("focusin.pdS2").on("focusin.pdS2", function (e) {
        if ($(e.target).closest(".select2-container, .select2-dropdown, .select2-search, .pd-s2-dropdown").length)
            e.stopImmediatePropagation();
    });
    $(document).off("select2:open.pdS2").on("select2:open.pdS2", function () {
        setTimeout(function () {
            const field = document.querySelector(".select2-container--open .select2-search__field");
            if (field) {
                field.setAttribute("inputmode", "search");
                field.style.fontSize = "16px";
                field.focus();
            }
        }, 0);
    });
}

function pdInitSelect2($el, opts) {
    if (!tieneSelect2() || !$el.length) return;
    if ($el.hasClass("select2-hidden-accessible")) {
        try { $el.select2("destroy"); } catch (e) { }
    }
    $el.select2(pdSelect2Base(opts));
}

function initSelect2Filtros() {
    if (!tieneSelect2()) return;
    ["#pdFiltroTipo", "#pdFiltroResponsable", "#pdFiltroPrioridad", "#pdFiltroEstado"].forEach(function (sel) {
        const $el = $(sel);
        if (!$el.length) return;
        if ($el.hasClass("select2-hidden-accessible")) {
            try { $el.select2("destroy"); } catch (e) { }
        }
        $el.select2({
            width: "100%",
            minimumResultsForSearch: 8,
            dropdownCssClass: "pd-s2-dropdown",
            dropdownParent: $(".pd-filters").length ? $(".pd-filters") : $(document.body)
        });
    });
}

function initSelect2Modal() {
    if (!tieneSelect2() || select2Listos) return;
    pdInitSelect2($("#pdPrioridad"), { minimumResultsForSearch: Infinity });
    pdInitSelect2($("#pdEstado"), { minimumResultsForSearch: Infinity });
    pdInitSelect2($("#pdIdResponsable"), { placeholder: "Responsable", allowClear: false, minimumResultsForSearch: 0 });
    pdInitSelect2($("#pdDestinatarios"), {
        placeholder: "Elegí quién recibe la alarma",
        allowClear: true,
        closeOnSelect: false,
        minimumResultsForSearch: 0
    });
    pdInitSelect2($("#pdIdCliente"), {
        placeholder: "Buscá por nombre o DNI",
        allowClear: true,
        minimumInputLength: 2,
        ajax: {
            url: "/Pendientes/BuscarClientes",
            dataType: "json",
            delay: 280,
            data: function (params) { return { q: params.term || "" }; },
            processResults: function (r) {
                const data = (r && r.data) || [];
                return {
                    results: data.map(function (c) {
                        const id = c.Id != null ? c.Id : c.id;
                        const nombre = c.NombreCompleto || c.nombreCompleto ||
                            ((c.Nombre || c.nombre || "") + " " + (c.Apellido || c.apellido || "")).trim();
                        const dni = c.Dni || c.dni || "";
                        return {
                            id: id,
                            text: nombre + (dni ? " · " + dni : ""),
                            cliente: c
                        };
                    })
                };
            }
        }
    });
    $("#pdIdCliente").on("select2:select", function (e) {
        aplicarCliente(e.params && e.params.data && e.params.data.cliente);
    });
    $("#pdIdCliente").on("select2:clear", function () {
        aplicarCliente(null);
    });
    select2Listos = true;
}

function setSelectVal(selector, value) {
    const $el = $(selector);
    if (!$el.length) return;
    if (value === null || value === undefined) $el.val(null);
    else $el.val(String(value));
    if ($el.hasClass("select2-hidden-accessible")) $el.trigger("change.select2");
    else $el.trigger("change");
}

function aplicarCliente(c) {
    if (!c) {
        $("#pdClienteNombre, #pdClienteDni, #pdClienteDireccion, #pdClienteTelefono").val("");
        return;
    }
    const nombre = c.NombreCompleto || c.nombreCompleto ||
        ((c.Nombre || c.nombre || "") + " " + (c.Apellido || c.apellido || "")).trim();
    $("#pdClienteNombre").val(nombre);
    $("#pdClienteDni").val(c.Dni || c.dni || "");
    $("#pdClienteDireccion").val(c.Direccion || c.direccion || "");
    $("#pdClienteTelefono").val(c.Telefono || c.telefono || "");
}

function setClienteSeleccionado(id, texto, datos) {
    const $s = $("#pdIdCliente");
    $s.find("option").remove();
    if (id) {
        const opt = new Option(texto || "Cliente", String(id), true, true);
        $s.append(opt);
    }
    if ($s.hasClass("select2-hidden-accessible")) $s.trigger("change.select2");
    else $s.trigger("change");
    aplicarCliente(datos || null);
}

function pdUserId(x) {
    return x && (x.Id != null ? x.Id : x.id);
}

function pdUserNombre(x) {
    return (x && (x.Nombre || x.nombre)) || "";
}

function pdUserRol(x) {
    return (x && (x.Rol || x.rol)) || "";
}

function pdUserLogin(x) {
    return (x && (x.Usuario || x.usuario)) || "";
}

function pdTextoVendedor(x) {
    const nom = pdUserNombre(x);
    const login = pdUserLogin(x);
    const rol = pdUserRol(x);
    let t = nom;
    if (login) t += " · " + login;
    if (rol) t += " (" + rol + ")";
    return t;
}

function pdBusquedaVendedor(x) {
    return [pdUserNombre(x), pdUserLogin(x), pdUserRol(x)].join(" ").toLowerCase();
}

function pdMatcherVendedor(params, data) {
    if ($.trim(params.term) === "") return data;
    if (typeof data.text === "undefined") return null;
    const extra = ((data.element && data.element.getAttribute("data-busqueda")) || "") + " " + (data.text || "");
    if (extra.toLowerCase().indexOf(params.term.toLowerCase()) > -1)
        return data;
    return null;
}

function llenarSelectVendedor(valor) {
    const $vend = $("#pdIdVendedor");
    if (!$vend.length) return;
    const keep = valor != null && valor !== "" ? String(valor) : ($vend.val() || "");
    if ($vend.hasClass("select2-hidden-accessible")) {
        try { $vend.select2("destroy"); } catch (e) { }
    }
    $vend.empty().append('<option value=""></option>');
    vendedoresLista.forEach(function (x) {
        const id = pdUserId(x);
        const nom = pdUserNombre(x);
        if (!id || !nom) return;
        const opt = new Option(pdTextoVendedor(x), String(id), false, false);
        opt.setAttribute("data-busqueda", pdBusquedaVendedor(x));
        $vend.append(opt);
    });
    pdInitSelect2($vend, {
        placeholder: "Buscá por nombre o usuario",
        allowClear: false,
        minimumResultsForSearch: 0,
        matcher: pdMatcherVendedor
    });
    if (keep && $vend.find('option[value="' + keep + '"]').length)
        $vend.val(keep).trigger("change.select2");
}

async function cargarCombos() {
    const u = await $.getJSON("/Pendientes/UsuariosModulo");
    usuariosModulo = (u && u.data) || [];
    const v = await $.getJSON("/Pendientes/Vendedores");
    vendedoresLista = (v && v.data) || [];

    const $respFiltro = $("#pdFiltroResponsable");
    const $resp = $("#pdIdResponsable");
    const $dest = $("#pdDestinatarios");
    usuariosModulo.forEach(function (x) {
        const id = pdUserId(x);
        const nom = pdUserNombre(x);
        const rol = pdUserRol(x);
        if (!id || !nom) return;
        $respFiltro.append('<option value="' + id + '">' + escapePd(nom) + "</option>");
        $resp.append('<option value="' + id + '">' + escapePd(nom) + " (" + escapePd(rol) + ")</option>");
        $dest.append('<option value="' + id + '">' + escapePd(nom) + " (" + escapePd(rol) + ")</option>");
    });
    initSelect2Filtros();
    initSelect2Modal();
    llenarSelectVendedor("");
    setDestinatarios(userSessionPd && userSessionPd.Id ? [userSessionPd.Id] : []);
    if (userSessionPd && userSessionPd.Id)
        setSelectVal("#pdIdResponsable", userSessionPd.Id);
}

function setDestinatarios(ids) {
    const vals = (ids || []).filter(Boolean).map(String);
    const $d = $("#pdDestinatarios");
    $d.val(vals);
    if ($d.hasClass("select2-hidden-accessible")) $d.trigger("change.select2");
}

function destinatariosSeleccionados() {
    const $d = $("#pdDestinatarios");
    const val = $d.val();
    if (!val) return [];
    return (Array.isArray(val) ? val : [val]).map(Number).filter(Boolean);
}

function tipoActual() {
    return document.getElementById("pdTipo")?.value || "Cliente";
}

function setTipoUi(tipo) {
    tipo = tipo || "Cliente";
    const hid = document.getElementById("pdTipo");
    if (hid) hid.value = tipo;
    document.querySelectorAll(".pd-tipo-card").forEach(function (btn) {
        const on = btn.getAttribute("data-tipo") === tipo;
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll(".pd-box-cliente").forEach(function (el) {
        el.hidden = tipo !== "Cliente";
    });
    document.querySelectorAll(".pd-box-vendedor").forEach(function (el) {
        el.hidden = tipo !== "Vendedor";
    });
    const sub = document.getElementById("pdModalSub");
    if (sub) {
        sub.textContent = tipo === "Cliente"
            ? "Buscá el cliente y contá qué pasó"
            : tipo === "Vendedor"
                ? "Elegí el vendedor y contá qué pasó"
                : "Pendiente interno, sin cliente ni vendedor";
    }
    if (tieneSelect2()) {
        setTimeout(function () {
            if (tipo === "Vendedor")
                llenarSelectVendedor($("#pdIdVendedor").val());
            $("#pdIdCliente").each(function () {
                if ($(this).hasClass("select2-hidden-accessible"))
                    $(this).next(".select2-container").css("width", "100%");
            });
        }, 0);
    }
}

function aplicarTipoUi() {
    setTipoUi(tipoActual());
}

async function listarPendientes() {
    const filtro = {
        Pestana: pestana,
        Tipo: $("#pdFiltroTipo").val() || "",
        IdResponsable: Number($("#pdFiltroResponsable").val() || 0),
        Prioridad: $("#pdFiltroPrioridad").val() || "",
        Estado: pestana === "pendientes" ? ($("#pdFiltroEstado").val() || "") : "",
        Busqueda: $("#pdFiltroBusqueda").val() || ""
    };

    const result = await MakeAjax({
        type: "POST",
        url: "/Pendientes/Listar",
        async: true,
        data: JSON.stringify(filtro),
        contentType: "application/json",
        dataType: "json"
    });

    const data = (result && result.data) || [];
    if (gridPendientes) {
        gridPendientes.clear();
        gridPendientes.rows.add(data);
        gridPendientes.draw();
        return;
    }

    gridPendientes = $("#grdPendientes").DataTable({
        data: data,
        deferRender: true,
        destroy: true,
        language: { url: "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json" },
        scrollX: true,
        scrollCollapse: true,
        autoWidth: false,
        order: [[8, "asc"], [0, "desc"]],
        columns: [
            { data: "FechaTexto", className: "text-center" },
            { data: "Tipo", className: "text-center", render: chipTipo },
            { data: "Nombre", className: "text-center" },
            { data: "Dni", className: "text-center" },
            { data: "Direccion" },
            { data: "Telefono", className: "text-center" },
            { data: "Titulo" },
            { data: "Responsable", className: "text-center" },
            { data: "Prioridad", className: "text-center", render: chipPrioridad },
            { data: "Estado", className: "text-center", render: chipEstado },
            { data: "UsuarioCarga", className: "text-center" },
            { data: "FechaCargaTexto", className: "text-center" },
            { data: "FechaAlarmaTexto", className: "text-center" },
            { data: "FechaResolucionTexto", className: "text-center" }
        ]
    });

    $("#grdPendientes tbody").on("click", "tr", function () {
        const row = gridPendientes.row(this).data();
        if (row && row.Id) abrirDetalle(row.Id);
    });
}

function toLocalParts(val) {
    if (!val) return { dia: "", hora: "" };
    let d = val;
    if (typeof val === "string") {
        const m = /\/Date\((-?\d+)\)\//.exec(val);
        d = m ? new Date(Number(m[1])) : new Date(val);
    }
    if (!(d instanceof Date) || isNaN(d.getTime())) return { dia: "", hora: "" };
    const pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return {
        dia: d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()),
        hora: pad(d.getHours()) + ":" + pad(d.getMinutes())
    };
}

function fechaAlarmaPayload() {
    const dia = $("#pdFechaAlarmaDia").val();
    const hora = $("#pdHoraAlarma").val();
    if (!dia) return null;
    return dia + "T" + (hora || "09:00");
}

function resetFormulario() {
    destManual = false;
    $("#pdId").val("0");
    $("#pdTitulo, #pdDescripcion, #pdObsInicial, #pdObsNueva, #pdSolucion, #pdClienteNombre, #pdClienteDni, #pdClienteDireccion, #pdClienteTelefono").val("");
    $("#pdFechaAlarmaDia, #pdHoraAlarma").val("");
    $("#pdFiles").val("");
    limpiarAdjuntosNuevos();
    pdAdjuntosGuardados = [];
    $("#pdAdjuntosLista, #pdObsLista, #pdMeta").html("");
    $("#pdSeguimientoWrap, #pdCierreWrap, #pdMetaWrap").attr("hidden", true);
    $("#pdBtnSolucionar, #pdBtnReabrir").attr("hidden", true);
    $("#pdBtnGuardar").removeAttr("hidden");
    $("#pdSolucion").prop("readonly", false);
    $("#pdBtnObs").prop("disabled", false);
    setClienteSeleccionado(null, "", null);
    llenarSelectVendedor("");
    setSelectVal("#pdPrioridad", "Media");
    setSelectVal("#pdEstado", "Pendiente");
    setTipoUi("Cliente");
    const ids = userSessionPd && userSessionPd.Id ? [userSessionPd.Id] : [];
    setDestinatarios(ids);
    if (userSessionPd && userSessionPd.Id)
        setSelectVal("#pdIdResponsable", userSessionPd.Id);
    $(".pd-obs-nueva").show();
    $("#pdModalTitulo").text("Nueva actividad");
    const sub = document.getElementById("pdModalSub");
    if (sub) sub.textContent = "Elegí el tipo y completá lo que pasó";
    destManual = false;
}

function abrirNuevo() {
    resetFormulario();
    mostrarModalPendiente();
}

function cargarEnFormulario(d) {
    destManual = true;
    $("#pdId").val(d.Id);
    $("#pdModalTitulo").text("Actividad #" + d.Id);
    const tipo = d.Tipo || "Interno";
    setTipoUi(tipo);
    $("#pdTitulo").val(d.Titulo || "");
    $("#pdDescripcion").val(d.Descripcion || "");
    setSelectVal("#pdPrioridad", d.Prioridad || "Media");
    setSelectVal("#pdEstado", d.Estado === "Solucionado" ? "En proceso" : (d.Estado || "Pendiente"));
    setSelectVal("#pdIdResponsable", d.IdResponsable || 0);
    const alarma = toLocalParts(d.FechaAlarma);
    $("#pdFechaAlarmaDia").val(alarma.dia);
    $("#pdHoraAlarma").val(alarma.hora);
    setDestinatarios(d.Destinatarios || []);
    if (tipo === "Cliente") {
        const nombre = d.Nombre || "";
        const dni = d.Dni === "—" ? "" : (d.Dni || "");
        setClienteSeleccionado(d.IdCliente || 0, (nombre + (dni ? " · " + dni : "")).trim(), {
            NombreCompleto: nombre,
            Dni: dni,
            Direccion: d.Direccion === "—" ? "" : (d.Direccion || ""),
            Telefono: d.Telefono === "—" ? "" : (d.Telefono || "")
        });
    } else {
        setClienteSeleccionado(null, "", null);
    }
    if (tipo === "Vendedor")
        llenarSelectVendedor(d.IdVendedor || "");
    else
        llenarSelectVendedor("");

    $(".pd-obs-nueva").hide();
    $("#pdSeguimientoWrap, #pdCierreWrap, #pdMetaWrap").removeAttr("hidden");
    $("#pdMeta").html(
        "Cargó <b>" + escapePd(d.UsuarioCarga) + "</b> el " + escapePd(d.FechaCargaTexto) +
        (d.UsuarioResolvio ? ". Resolvió <b>" + escapePd(d.UsuarioResolvio) + "</b> el " + escapePd(d.FechaResolucionTexto) : "")
    );
    pintarObs(d.Observaciones || []);
    pintarAdjuntos(d.Adjuntos || []);

    const solucionado = d.Estado === "Solucionado";
    if (solucionado) {
        $("#pdBtnGuardar, #pdBtnSolucionar").attr("hidden", true);
        $("#pdSolucion").val(d.Solucion || "").prop("readonly", true);
        if (esAdminPd) $("#pdBtnReabrir").removeAttr("hidden");
        else $("#pdBtnReabrir").attr("hidden", true);
        $("#pdBtnObs").prop("disabled", true);
    } else {
        $("#pdBtnGuardar").removeAttr("hidden");
        $("#pdBtnSolucionar").removeAttr("hidden");
        $("#pdBtnReabrir").attr("hidden", true);
        $("#pdSolucion").val(d.Solucion || "").prop("readonly", false);
        $("#pdBtnObs").prop("disabled", false);
    }
}

async function abrirDetalle(id, opts) {
    const r = await $.getJSON("/Pendientes/Detalle", { id: id });
    if (!r || !r.ok || !r.data) {
        errorModal("No se pudo abrir la actividad.");
        return;
    }
    resetFormulario();
    cargarEnFormulario(r.data);
    if (!(opts && opts.sinAbrir))
        mostrarModalPendiente();
}

function pintarObs(items) {
    const list = items || [];
    if (!list.length) {
        $("#pdObsLista").html('<div class="pd-hint">Sin observaciones todavía.</div>');
        return;
    }
    $("#pdObsLista").html(list.map(function (o) {
        const del = esAdminPd
            ? '<button type="button" class="pd-obs-del" data-del-obs="' + o.Id + '" aria-label="Eliminar comentario"><i class="fa fa-trash"></i></button>'
            : "";
        return '<div class="pd-obs-item" data-obs-id="' + o.Id + '">' +
            '<div class="pd-obs-top">' +
            '<div class="pd-hint">' + escapePd(o.Usuario) + " · " + escapePd(o.FechaTexto) + "</div>" +
            del +
            "</div><div>" + escapePd(o.Texto) + "</div></div>";
    }).join(""));
}

async function eliminarObs(id) {
    if (!esAdminPd || !id) return;
    const okConfirm = await confirmarModal("¿Eliminar este comentario del seguimiento?");
    if (!okConfirm) return;
    const r = await $.post("/Pendientes/EliminarObservacion", { id: id });
    if (!r || !r.ok) {
        errorModal((r && r.mensaje) || "No se pudo eliminar.");
        return;
    }
    const item = document.querySelector('.pd-obs-item[data-obs-id="' + id + '"]');
    if (item) item.remove();
    if (!$("#pdObsLista .pd-obs-item").length)
        $("#pdObsLista").html('<div class="pd-hint">Sin observaciones todavía.</div>');
    exitoModal(r.mensaje || "Comentario eliminado.");
}

function limpiarAdjuntosNuevos() {
    pdAdjuntosNuevos.forEach(function (x) {
        if (x.url) try { URL.revokeObjectURL(x.url); } catch (e) { }
    });
    pdAdjuntosNuevos = [];
}

function esArchivoAdjuntoOk(f) {
    if (!f) return false;
    const t = String(f.type || "").toLowerCase();
    const n = String(f.name || "").toLowerCase();
    return t.indexOf("image/") === 0 || t === "application/pdf" || n.endsWith(".pdf");
}

function agregarArchivosPendiente(fileList) {
    Array.from(fileList || []).forEach(function (f) {
        if (!esArchivoAdjuntoOk(f)) return;
        const img = String(f.type || "").indexOf("image/") === 0;
        pdAdjuntosNuevos.push({
            idLocal: "n" + Date.now() + "-" + Math.random().toString(36).slice(2),
            file: f,
            url: img ? URL.createObjectURL(f) : null
        });
    });
    pintarAdjuntos();
}

function initDropzonePendiente() {
    const drop = document.getElementById("pdDrop");
    const input = document.getElementById("pdFiles");
    if (!drop || !input) return;
    const abrir = function () { input.click(); };
    drop.addEventListener("click", abrir);
    drop.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            abrir();
        }
    });
    ["dragenter", "dragover"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
            e.preventDefault();
            drop.classList.add("is-over");
        });
    });
    ["dragleave", "drop"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
            e.preventDefault();
            drop.classList.remove("is-over");
        });
    });
    drop.addEventListener("drop", function (e) {
        if (e.dataTransfer && e.dataTransfer.files)
            agregarArchivosPendiente(e.dataTransfer.files);
    });
    input.addEventListener("change", function () {
        agregarArchivosPendiente(input.files);
        input.value = "";
    });
}

function pintarAdjuntos(items) {
    if (items)
        pdAdjuntosGuardados = items || [];
    const cards = [];
    pdAdjuntosGuardados.forEach(function (a) {
        const cuerpo = a.EsImagen
            ? '<a href="' + escapePd(a.Url) + '" target="_blank"><img class="pd-adj-thumb" src="' + escapePd(a.Url) + '" alt=""></a>'
            : '<a class="pd-adj-pdf" href="' + escapePd(a.Url) + '" target="_blank"><i class="fa fa-file-pdf-o"></i><span>PDF</span></a>';
        cards.push('<div class="pd-adj-card">' + cuerpo +
            '<span class="pd-adj-name">' + escapePd(a.Nombre || "") + "</span>" +
            '<button type="button" class="pd-adj-x" data-del-adj="' + a.Id + '" aria-label="Quitar"><i class="fa fa-times"></i></button></div>');
    });
    pdAdjuntosNuevos.forEach(function (x) {
        const cuerpo = x.url
            ? '<img class="pd-adj-thumb" src="' + escapePd(x.url) + '" alt="">'
            : '<div class="pd-adj-pdf"><i class="fa fa-file-pdf-o"></i><span>PDF</span></div>';
        cards.push('<div class="pd-adj-card">' + cuerpo +
            '<span class="pd-adj-name">' + escapePd(x.file && x.file.name ? x.file.name : "Archivo") + "</span>" +
            '<button type="button" class="pd-adj-x" data-del-nuevo="' + escapePd(x.idLocal) + '" aria-label="Quitar"><i class="fa fa-times"></i></button></div>');
    });
    $("#pdAdjuntosLista").html(cards.join(""));
}

async function guardarActividad() {
    const id = Number($("#pdId").val() || 0);
    const tipo = tipoActual();
    const model = {
        Id: id,
        Tipo: tipo,
        IdCliente: tipo === "Cliente" ? Number($("#pdIdCliente").val() || 0) : null,
        IdVendedor: tipo === "Vendedor" ? Number($("#pdIdVendedor").val() || 0) : null,
        Titulo: $("#pdTitulo").val(),
        Descripcion: $("#pdDescripcion").val(),
        ObservacionInicial: id ? "" : $("#pdObsInicial").val(),
        IdResponsable: Number($("#pdIdResponsable").val() || 0),
        Prioridad: $("#pdPrioridad").val(),
        Estado: $("#pdEstado").val(),
        FechaAlarma: fechaAlarmaPayload(),
        Destinatarios: destinatariosSeleccionados()
    };

    const result = await MakeAjax({
        type: "POST",
        url: "/Pendientes/Guardar",
        async: true,
        data: JSON.stringify(model),
        contentType: "application/json",
        dataType: "json"
    });

    if (!result || !result.ok) {
        errorModal((result && result.mensaje) || "No se pudo guardar.");
        return;
    }

    if (pdAdjuntosNuevos.length) {
        const fd = new FormData();
        pdAdjuntosNuevos.forEach(function (x) {
            if (x.file) fd.append("file", x.file);
        });
        await MakeAjaxFormData({
            type: "POST",
            url: "/Pendientes/SubirAdjuntos?id=" + result.id,
            async: true,
            data: fd
        });
        limpiarAdjuntosNuevos();
    }

    exitoModal(result.mensaje || "Guardado.");
    ocultarModalPendiente();
    await listarPendientes();
}

async function agregarObs() {
    const id = Number($("#pdId").val() || 0);
    const texto = $("#pdObsNueva").val();
    const r = await MakeAjax({
        type: "POST",
        url: "/Pendientes/AgregarObservacion",
        async: true,
        data: JSON.stringify({ Id: id, Texto: texto }),
        contentType: "application/json",
        dataType: "json"
    });
    if (!r || !r.ok) {
        errorModal((r && r.mensaje) || "No se pudo agregar.");
        return;
    }
    $("#pdObsNueva").val("");
    await abrirDetalle(id, { sinAbrir: true });
}

async function solucionar() {
    const id = Number($("#pdId").val() || 0);
    const solucion = $("#pdSolucion").val();
    if (!String(solucion || "").trim()) {
        errorModal("Escribí cómo se resolvió el problema.");
        return;
    }
    const r = await MakeAjax({
        type: "POST",
        url: "/Pendientes/Solucionar",
        async: true,
        data: JSON.stringify({ Id: id, Solucion: solucion }),
        contentType: "application/json",
        dataType: "json"
    });
    if (!r || !r.ok) {
        errorModal((r && r.mensaje) || "No se pudo solucionar.");
        return;
    }
    exitoModal(r.mensaje);
    ocultarModalPendiente();
    pestana = "solucionados";
    document.querySelectorAll(".pd-tab").forEach(function (t) {
        t.classList.toggle("is-on", t.getAttribute("data-pestana") === "solucionados");
    });
    $("#pdFiltroEstadoWrap").attr("hidden", true);
    await listarPendientes();
}

async function reabrir() {
    const id = Number($("#pdId").val() || 0);
    const r = await MakeAjax({
        type: "POST",
        url: "/Pendientes/Reabrir",
        async: true,
        data: JSON.stringify({ id: id }),
        contentType: "application/json",
        dataType: "json"
    });
    if (!r || !r.ok) {
        errorModal((r && r.mensaje) || "No se pudo reabrir.");
        return;
    }
    exitoModal(r.mensaje);
    pestana = "pendientes";
    document.querySelectorAll(".pd-tab").forEach(function (t) {
        t.classList.toggle("is-on", t.getAttribute("data-pestana") === "pendientes");
    });
    $("#pdFiltroEstadoWrap").removeAttr("hidden");
    await abrirDetalle(id, { sinAbrir: true });
    await listarPendientes();
}

document.addEventListener("DOMContentLoaded", async function () {
    if (!document.getElementById("grdPendientes")) return;
    engancharLimpiezaModales();
    engancharSelect2FocoModal();
    initDropzonePendiente();
    await cargarCombos();
    await listarPendientes();

    document.getElementById("btnNuevaActividad").addEventListener("click", abrirNuevo);
    document.getElementById("pdBtnFiltrar").addEventListener("click", listarPendientes);
    document.getElementById("pdFiltroBusqueda").addEventListener("keydown", function (e) {
        if (e.key === "Enter") listarPendientes();
    });
    document.querySelectorAll(".pd-tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
            pestana = tab.getAttribute("data-pestana");
            document.querySelectorAll(".pd-tab").forEach(function (t) { t.classList.toggle("is-on", t === tab); });
            if (pestana === "solucionados") $("#pdFiltroEstadoWrap").attr("hidden", true);
            else $("#pdFiltroEstadoWrap").removeAttr("hidden");
            listarPendientes();
        });
    });
    document.querySelectorAll(".pd-tipo-card").forEach(function (btn) {
        btn.addEventListener("click", function () {
            setTipoUi(btn.getAttribute("data-tipo"));
        });
    });
    document.getElementById("pdIdResponsable").addEventListener("change", function () {
        if (destManual) return;
        setDestinatarios([Number(this.value || 0)]);
    });
    $("#pdDestinatarios").on("select2:select select2:unselect", function () {
        destManual = true;
    });
    document.getElementById("pdBtnGuardar").addEventListener("click", guardarActividad);
    document.getElementById("pdBtnObs").addEventListener("click", agregarObs);
    document.getElementById("pdObsLista").addEventListener("click", function (e) {
        const btn = e.target.closest("[data-del-obs]");
        if (!btn) return;
        eliminarObs(Number(btn.getAttribute("data-del-obs")));
    });
    document.getElementById("pdBtnSolucionar").addEventListener("click", solucionar);
    document.getElementById("pdBtnReabrir").addEventListener("click", reabrir);
    document.getElementById("pdAdjuntosLista").addEventListener("click", async function (e) {
        const nuevo = e.target.closest("[data-del-nuevo]");
        if (nuevo) {
            const idLocal = nuevo.getAttribute("data-del-nuevo");
            const item = pdAdjuntosNuevos.filter(function (x) { return x.idLocal === idLocal; })[0];
            if (item && item.url) try { URL.revokeObjectURL(item.url); } catch (err) { }
            pdAdjuntosNuevos = pdAdjuntosNuevos.filter(function (x) { return x.idLocal !== idLocal; });
            pintarAdjuntos();
            return;
        }
        const btn = e.target.closest("[data-del-adj]");
        if (!btn) return;
        await $.post("/Pendientes/EliminarAdjunto", { id: Number(btn.getAttribute("data-del-adj")) });
        const id = Number($("#pdId").val() || 0);
        if (id) abrirDetalle(id, { sinAbrir: true });
    });

    if (window.TiempoReal) {
        window.TiempoReal.on("PendienteCambio", function () { listarPendientes(); });
    }

    if (idAbrirPd > 0) abrirDetalle(idAbrirPd);
});
