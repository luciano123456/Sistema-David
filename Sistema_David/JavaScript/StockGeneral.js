let userSession;
let gridStock = null;
let catalogoVendedores = [];
let catalogoDeposito = [];

const SG_COL_FILTER_KEY = "stock_general_col_filters_v1";
const SG_COL_FILTER_UI = { skin: "cobros", placeholder: "Filtrar…", inputType: "search" };
const columnConfigStockGeneral = [
    { index: 1, filterType: "text" },
    { index: 2, filterType: "select" },
    { index: 3, filterType: "text" },
    { index: 4, filterType: "text" },
    { index: 5, filterType: "text" },
    { index: 6, filterType: "text" },
    { index: 7, filterType: "text" }
];

function idsToCsv(arr) {
    if (!arr || !arr.length) return "";
    return arr.map(function (x) { return String(x); }).join(",");
}

function getFiltrosGenerales() {
    const idsVendedores = idsToCsv($("#ProductosEnVendedoresFiltro").val());
    const idsDeposito = idsToCsv($("#ProductosEnDepositoFiltro").val());
    const idUsuario = parseInt($("#VendedorFiltro").val(), 10);
    const idTipoNegocio = parseInt($("#TipoNegocioFiltro").val(), 10);

    return {
        idsVendedores: idsVendedores,
        idsDeposito: idsDeposito,
        idUsuario: isNaN(idUsuario) ? -1 : idUsuario,
        idTipoNegocio: isNaN(idTipoNegocio) ? -1 : idTipoNegocio,
        soloEnVendedores: $("#SoloEnVendedoresCheck").is(":checked")
    };
}

function buildStockGeneralUrl(filtros) {
    filtros = filtros || getFiltrosGenerales();
    const params = [
        "idsVendedores=" + encodeURIComponent(filtros.idsVendedores || ""),
        "idsDeposito=" + encodeURIComponent(filtros.idsDeposito || ""),
        "idUsuario=" + filtros.idUsuario,
        "idTipoNegocio=" + filtros.idTipoNegocio,
        "soloEnVendedores=" + (filtros.soloEnVendedores ? "true" : "false")
    ];
    return "/Stock/ListarStockGeneral?" + params.join("&");
}

function poblarSelectProductos($sel, items, tipo) {
    const prev = ($sel.val() || []).map(String);
    $sel.empty();

    (items || []).forEach(function (p) {
        let texto = p.Nombre;
        if (tipo === "vendedores") {
            texto += " · " + (p.VendedoresConStock || 0) + " vendedor(es) · " + (p.CantidadEnVendedores || 0) + " uds";
            if ((p.StockDeposito || 0) > 0) {
                texto += " · Dep.: " + p.StockDeposito;
            }
        } else {
            texto += " · Dep.: " + (p.StockDeposito || 0);
        }
        $sel.append($("<option></option>").val(p.Id).text(texto));
    });

    const valid = prev.filter(function (id) {
        return items.some(function (p) { return String(p.Id) === id; });
    });
    $sel.val(valid.length ? valid : null).trigger("change");
}

function initSelect2ProductoMulti($sel, placeholder, tipo) {
    if (!$sel.length || !window.jQuery || !jQuery.fn.select2) return;

    if ($sel.hasClass("select2-hidden-accessible")) {
        $sel.select2("destroy");
    }

    $sel.select2({
        width: "100%",
        allowClear: true,
        closeOnSelect: false,
        placeholder: placeholder,
        dropdownParent: $("#Filtros"),
        templateResult: function (data) {
            if (!data.id) return data.text;
            const list = tipo === "vendedores" ? catalogoVendedores : catalogoDeposito;
            const prod = list.find(function (p) { return String(p.Id) === String(data.id); });
            if (!prod) return data.text;

            if (tipo === "vendedores") {
                const $el = $('<span><strong>' + prod.Nombre + '</strong> · ' +
                    prod.VendedoresConStock + ' vendedor(es) · ' + prod.CantidadEnVendedores + ' uds</span>');
                if ((prod.StockDeposito || 0) > 0) {
                    $el.append(' · Dep.: ' + prod.StockDeposito);
                }
                return $el;
            }

            return $('<span><strong>' + prod.Nombre + '</strong> · Dep.: ' + (prod.StockDeposito || 0) + '</span>');
        }
    });
}

function initSelect2FiltrosGenerales() {
    if (!window.jQuery || !jQuery.fn.select2) return;

    initSelect2ProductoMulti(
        $("#ProductosEnVendedoresFiltro"),
        "Elegí uno o más productos con stock en vendedores",
        "vendedores"
    );
    initSelect2ProductoMulti(
        $("#ProductosEnDepositoFiltro"),
        "Elegí uno o más productos con stock en depósito",
        "deposito"
    );

    ["#VendedorFiltro", "#TipoNegocioFiltro"].forEach(function (sel) {
        const $el = $(sel);
        if ($el.length && !$el.hasClass("select2-hidden-accessible")) {
            $el.select2({
                width: "100%",
                minimumResultsForSearch: 8,
                placeholder: "Todos",
                dropdownParent: $("#Filtros")
            });
        }
    });
}

async function cargarCatalogoFiltrosStockGeneral() {
    const soloEnVendedores = $("#SoloEnVendedoresCheck").is(":checked");

    const result = await $.getJSON(
        "/Stock/CatalogoFiltrosStockGeneral?soloEnVendedores=" + soloEnVendedores
    );

    catalogoVendedores = (result && result.productosVendedores) ? result.productosVendedores : [];
    catalogoDeposito = (result && result.productosDeposito) ? result.productosDeposito : [];

    poblarSelectProductos($("#ProductosEnVendedoresFiltro"), catalogoVendedores, "vendedores");
    poblarSelectProductos($("#ProductosEnDepositoFiltro"), catalogoDeposito, "deposito");
}

async function cargarVendedoresFiltro() {
    const result = await MakeAjax({
        type: "POST",
        url: "/Usuarios/ListarUserActivos",
        async: true,
        data: JSON.stringify({}),
        contentType: "application/json",
        dataType: "json"
    });

    const $sel = $("#VendedorFiltro");
    $sel.find("option:not(:first)").remove();

    if (result && result.data) {
        result.data.forEach(function (u) {
            $sel.append($("<option></option>").val(u.Id).text(u.Nombre));
        });
    }
}

async function cargarTiposNegocioFiltro() {
    const result = await $.getJSON("/Usuarios/ListarTipoNegocio");
    const $sel = $("#TipoNegocioFiltro");
    $sel.find("option:not(:first)").remove();

    if (result && result.data) {
        result.data.forEach(function (t) {
            $sel.append($("<option></option>").val(t.Id).text(t.Nombre));
        });
    }
}

function actualizarModoFiltrosUI() {
    const idsDep = $("#ProductosEnDepositoFiltro").val() || [];
    const idsVen = $("#ProductosEnVendedoresFiltro").val() || [];
    const soloDep = idsDep.length > 0 && idsVen.length === 0;

    if (soloDep) {
        $("#sgFiltrosVendedor").addClass("d-none");
        $("#sgTableTitle").html('<i class="fa fa-archive me-2"></i> Detalle en dep&oacute;sito');
    } else if (idsVen.length > 0 && idsDep.length === 0) {
        $("#sgFiltrosVendedor").removeClass("d-none");
        $("#sgTableTitle").html('<i class="fa fa-users me-2"></i> Detalle por vendedor');
    } else if (idsVen.length > 0 && idsDep.length > 0) {
        $("#sgFiltrosVendedor").removeClass("d-none");
        $("#sgTableTitle").html('<i class="fa fa-table me-2"></i> Stock vendedores y dep&oacute;sito');
    } else {
        $("#sgFiltrosVendedor").removeClass("d-none");
        $("#sgTableTitle").html('<i class="fa fa-table me-2"></i> Detalle por vendedor');
    }
}

function actualizarStatsStockGeneral(api) {
    if (!api) return;

    let registros = 0;
    let unidadesVendedores = 0;
    let unidadesDeposito = 0;
    let valor = 0;

    api.rows({ filter: "applied" }).every(function () {
        const row = this.data();
        registros++;

        if (row.Estado === "Deposito") {
            unidadesDeposito += Number(row.Cantidad) || 0;
            valor += Number(row.Total) || 0;
            return;
        }

        unidadesVendedores += Number(row.Cantidad) || 0;
        valor += Number(row.Total) || 0;
    });

    $("#sgStatRegistros").text(registros.toLocaleString("es-AR"));
    $("#sgStatUnidades").text(unidadesVendedores.toLocaleString("es-AR"));
    $("#sgStatUnidadesDeposito").text(unidadesDeposito.toLocaleString("es-AR"));
    $("#sgStatValor").text(formatNumber(valor));
}

function configurarFiltrosPorColumnaStockGeneral() {
    if (!gridStock) return;
    inicializarFiltrosColumnas(
        gridStock,
        columnConfigStockGeneral,
        SG_COL_FILTER_KEY,
        true,
        SG_COL_FILTER_UI
    );
}

function limpiarFiltrosColumnasStockGeneral() {
    if (!gridStock) return;
    limpiarFiltrosColumnas(gridStock, columnConfigStockGeneral, SG_COL_FILTER_KEY);
    actualizarStatsStockGeneral(gridStock);
}

async function limpiarFiltrosGenerales() {
    $("#ProductosEnVendedoresFiltro").val(null).trigger("change");
    $("#ProductosEnDepositoFiltro").val(null).trigger("change");
    $("#SoloEnVendedoresCheck").prop("checked", false);
    $("#VendedorFiltro").val("-1").trigger("change");
    $("#TipoNegocioFiltro").val("-1").trigger("change");
    await cargarCatalogoFiltrosStockGeneral();
    actualizarModoFiltrosUI();
    limpiarFiltrosColumnasStockGeneral();
    aplicarFiltros();
}

function aplicarFiltros() {
    actualizarModoFiltrosUI();

    if (gridStock) {
        gridStock.ajax.url(buildStockGeneralUrl()).load(function () {
            actualizarStatsStockGeneral(gridStock);
        });
        return;
    }
    configurarDataTable();
}

async function onSoloCheckChange() {
    await cargarCatalogoFiltrosStockGeneral();
    actualizarModoFiltrosUI();
}

async function configurarDataTable() {
    if ($.fn.DataTable.isDataTable("#grdStock")) {
        $("#grdStock").DataTable().destroy();
        $("#grdStock tbody").empty();
    }

    $("#grdStock thead tr.filters").remove();
    inicializarEncabezadoColumnas("#grdStock");

    gridStock = $("#grdStock").DataTable({
        ajax: {
            url: buildStockGeneralUrl(),
            type: "GET",
            dataType: "json",
            dataSrc: "data"
        },
        processing: true,
        deferRender: true,
        language: {
            url: "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        scrollX: true,
        scrollCollapse: true,
        autoWidth: false,
        orderCellsTop: true,
        order: [[3, "asc"]],
        columns: [
            {
                data: "IdProducto",
                className: "text-center sg-col-img",
                orderable: false,
                render: function (data, type) {
                    if (type === "sort" || type === "filter" || type === "type") return "";
                    const imgUrl = "/Productos/ObtenerImagen/" + data;
                    return '<img src="' + imgUrl + '" height="45" width="45" class="img-thumbnail sg-thumb" alt="" onclick="openModal(\'' + imgUrl + '\')" />';
                }
            },
            { data: "Usuario", className: "text-center" },
            { data: "TipoNegocio", className: "text-center", defaultContent: "" },
            { data: "Producto", className: "text-center sg-col-producto" },
            {
                data: "Cantidad",
                className: "text-center",
                render: function (data, type, row) {
                    if (type === "sort" || type === "filter" || type === "type") {
                        return row.Estado === "Deposito" ? (row.StockDeposito ?? "") : (data ?? "");
                    }
                    if (row.Estado === "Deposito") {
                        return '<span class="sg-cantidad-deposito-val">' + (row.StockDeposito ?? 0) + '</span>';
                    }
                    return data;
                }
            },
            {
                data: "StockDeposito",
                className: "text-center",
                render: function (data, type) {
                    if (type === "sort" || type === "filter" || type === "type") {
                        return data != null ? data : "";
                    }
                    const n = data != null ? data : 0;
                    const cls = n > 0 ? "sg-dep-badge sg-dep-badge--ok" : "sg-dep-badge sg-dep-badge--empty";
                    return '<span class="' + cls + '">' + n + '</span>';
                }
            },
            {
                data: "PrecioVenta",
                className: "text-end",
                render: function (data, type) {
                    if (type === "sort" || type === "filter" || type === "type") return data ?? "";
                    return formatNumber(data);
                }
            },
            {
                data: "Total",
                className: "text-end",
                render: function (data, type) {
                    if (type === "sort" || type === "filter" || type === "type") return data ?? "";
                    return formatNumber(data);
                }
            }
        ],
        initComplete: function () {
            configurarFiltrosPorColumnaStockGeneral();
            actualizarStatsStockGeneral(this.api());
            this.api().columns.adjust();
        },
        drawCallback: function () {
            const api = this.api();
            api.rows().every(function () {
                const row = this.data();
                if (row.Estado === "Deposito") {
                    $(this.node()).addClass("sg-row-deposito");
                }
            });
            actualizarStatsStockGeneral(api);
            if (typeof syncColumnFilterMarkers === "function") {
                syncColumnFilterMarkers(this.api(), columnConfigStockGeneral);
            }
        }
    });

    let filaSeleccionada = null;
    $("#grdStock").off("click.sgRow").on("click.sgRow", "tbody tr", function (e) {
        if ($(e.target).closest("img, .sg-thumb").length) return;
        const $tr = $(this);
        if (filaSeleccionada) $(filaSeleccionada).removeClass("sg-row-selected");
        filaSeleccionada = $tr[0];
        $tr.addClass("sg-row-selected");
    });

    $(window).on("resize.sgDt orientationchange.sgDt", function () {
        if (gridStock) gridStock.columns.adjust();
    });
}

function openModal(imageSrc) {
    document.getElementById("modalImage").src = imageSrc;
    $("#imageModal").modal("show");
}

function volverUsuarios() {
    document.location.href = "../../Usuarios/Index/";
}

$(document).ready(async function () {
    userSession = JSON.parse(localStorage.getItem("usuario"));

    // Select2 antes de cargar opciones: evita el listbox nativo con cientos de ítems
    initSelect2FiltrosGenerales();

    await Promise.all([
        cargarCatalogoFiltrosStockGeneral(),
        cargarVendedoresFiltro(),
        cargarTiposNegocioFiltro()
    ]);

    $("#Filtros").addClass("sg-filters-ready");
    actualizarModoFiltrosUI();
    await configurarDataTable();

    $("#SoloEnVendedoresCheck").on("change", onSoloCheckChange);
    $("#ProductosEnVendedoresFiltro, #ProductosEnDepositoFiltro").on("change", actualizarModoFiltrosUI);

    if (userSession && userSession.IdRol == 1) {
        $("#btnUsuarios").css("background", "#2E4053");
    }
});
