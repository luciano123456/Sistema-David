let importacionMasiva = null;
const fileInput = document.getElementById("fileImportacionMasiva");
let gridClientes;
let userSession;

/** Lee números del JSON aunque vengan en PascalCase / camelCase o como string. */
function pickNumCliente(row, ...keys) {
    if (!row) return 0;
    for (let i = 0; i < keys.length; i++) {
        const v = row[keys[i]];
        if (v === undefined || v === null || v === "") continue;
        if (typeof v === "number" && !isNaN(v)) return v;
        const t = String(v).trim();
        let n = Number(t.replace(",", "."));
        if (!isNaN(n)) return n;
        n = parseFloat(t.replace(/\./g, "").replace(",", "."));
        if (!isNaN(n)) return n;
    }
    return 0;
}

function pickNumDesdeObj(obj, ...keys) {
    if (!obj) return 0;
    for (let i = 0; i < keys.length; i++) {
        const v = obj[keys[i]];
        if (v === undefined || v === null || v === "") continue;
        const n = typeof v === "number" ? v : Number(String(v).trim().replace(",", "."));
        if (!isNaN(n)) return n;
    }
    return 0;
}

function clientesAjaxDataSrc(json) {
    if (!json) return [];
    if (json.data != null && Array.isArray(json.data)) return json.data;
    if (json.Data != null && Array.isArray(json.Data)) return json.Data;
    if (Array.isArray(json)) return json;
    console.warn("Clientes Listar: formato de respuesta inesperado", json);
    return [];
}

function showGlobalLoadingClientes(text) {
    const loading = document.getElementById("globalLoading");
    if (!loading) return;
    loading.classList.remove("hidden");
    const lt = loading.querySelector(".loading-text");
    if (lt) lt.textContent = text || "Cargando tablas...";
    document.body.classList.add("loading");
}

function hideGlobalLoadingClientes() {
    const loading = document.getElementById("globalLoading");
    if (!loading) return;
    loading.classList.add("hidden");
    document.body.classList.remove("loading");
}

$(document).ready(function () {
    $('.datos-error').text('');
    $("#btnClientes").css("background", "#2E4053");
    userSession = JSON.parse(localStorage.getItem('usuario'));

    if (userSession.IdRol == 1) { //ROL ADMIN
        $("#exportacionExcel").removeAttr("hidden");
        $("#importacionExcel").removeAttr("hidden");
        $("#btnNuevo").removeAttr("hidden");
        $("#btnLimite").removeAttr("hidden");
    }

    if (userSession.IdRol != 1) {
        $("#resumenSaldosClientes").hide();
    }

    const nombreFiltro = localStorage.getItem("NombreFiltro") || "";
    const apellidoFiltro = localStorage.getItem("ApellidoFiltro") || "";
    const dniFiltro = localStorage.getItem("DniFiltro") || "";
    const estadoFiltro = localStorage.getItem("EstadoFiltroClientes") || "";
    const vendedorFiltro = localStorage.getItem("IdVendedorFiltroClientes") || (userSession.IdRol == 1 ? "-1" : "");
    const zonaFiltro = localStorage.getItem("IdZonaFiltroClientes") || (userSession.IdRol == 1 ? "-1" : "");

    document.getElementById("NombreFiltro").value = nombreFiltro;
    document.getElementById("ApellidoFiltro").value = apellidoFiltro;
    document.getElementById("DniFiltro").value = dniFiltro;
    document.getElementById("EstadoFiltro").value = estadoFiltro;
    document.getElementById("VendedoresFiltro").value = vendedorFiltro;
    document.getElementById("ZonasFiltro").value = zonaFiltro;

    const resumen = document.getElementById("resumenSaldosClientes");
    const filtros = document.getElementById("Filtros");
    if (resumen && filtros && filtros.parentNode) {
        filtros.parentNode.insertBefore(resumen, filtros);
    }

    $("#btnToggleFiltrosClientes").off("click").on("click", function () {
        const panel = document.getElementById("Filtros");
        const icon = document.getElementById("iconFiltrosClientes");
        panel.classList.toggle("d-none");
        if (panel.classList.contains("d-none")) {
            icon.classList.remove("fa-chevron-up");
            icon.classList.add("fa-chevron-down");
        } else {
            icon.classList.remove("fa-chevron-down");
            icon.classList.add("fa-chevron-up");
        }
    });

    // En Clientes lo dejamos visible por defecto para que siempre se vea el diseño/filtros.
    $("#Filtros").removeClass("d-none");
    $("#iconFiltrosClientes").removeClass("fa-chevron-down").addClass("fa-chevron-up");

    $("#btnLimpiarFiltrosClientes").off("click").on("click", function () {
        $("#NombreFiltro, #ApellidoFiltro, #DniFiltro").val("");
        if ($("#VendedoresFiltro option[value='-1']").length) {
            $("#VendedoresFiltro").val("-1");
        } else if ($("#VendedoresFiltro option").length) {
            $("#VendedoresFiltro").val($("#VendedoresFiltro option:first").val());
        }
        if ($("#ZonasFiltro option[value='-1']").length) {
            $("#ZonasFiltro").val("-1");
        } else if ($("#ZonasFiltro option").length) {
            $("#ZonasFiltro").val($("#ZonasFiltro option:first").val());
        }
        $("#EstadoFiltro").val("");
        if ($.fn.select2) {
            $("#VendedoresFiltro, #ZonasFiltro, #EstadoFiltro").trigger("change");
        }
        localStorage.removeItem("NombreFiltro");
        localStorage.removeItem("ApellidoFiltro");
        localStorage.removeItem("DniFiltro");
        localStorage.removeItem("EstadoFiltroClientes");
        localStorage.removeItem("IdVendedorFiltroClientes");
        localStorage.removeItem("IdZonaFiltroClientes");
    });

    Promise.all([cargarUsuarios(), cargarZonas()]).then(function () {
        if (userSession && userSession.IdRol == 1) {
            cargarTotalesSaldosKpi();
        }
        inicializarSelect2Filtros();
        if (userSession.IdRol != 1 && userSession.IdRol != 4) {
            configurarDataTable(userSession.Id, nombreFiltro, apellidoFiltro, dniFiltro, zonaFiltro, estadoFiltro);
        } else {
            configurarDataTable(vendedorFiltro, nombreFiltro, apellidoFiltro, dniFiltro, zonaFiltro, estadoFiltro);
        }
    });
});

function aplicarFiltros() {
    const idVendedor = document.getElementById("VendedoresFiltro").value || -1;
    const idZona = document.getElementById("ZonasFiltro").value || -1;
    const estado = document.getElementById("EstadoFiltro").value || "";
    const nombre = document.getElementById("NombreFiltro").value || "";
    const apellido = document.getElementById("ApellidoFiltro").value || "";
    const dni = document.getElementById("DniFiltro").value || "";

    if ($.fn.DataTable && $.fn.DataTable.isDataTable("#grdClientes")) {
        $("#grdClientes").DataTable().destroy();
    }
    gridClientes = null;
    $("#grdClientes thead tr.filters").remove();

    let idVendedorArg = idVendedor;
    if (userSession && userSession.IdRol != 1 && userSession.IdRol != 4) {
        idVendedorArg = userSession.Id;
    }
    configurarDataTable(idVendedorArg, nombre, apellido, dni, idZona, estado);

    localStorage.setItem("NombreFiltro", nombre);
    localStorage.setItem("ApellidoFiltro", apellido);
    localStorage.setItem("DniFiltro", dni);
    localStorage.setItem("EstadoFiltroClientes", estado);
    localStorage.setItem("IdVendedorFiltroClientes", String(idVendedor));
    localStorage.setItem("IdZonaFiltroClientes", String(idZona));
}

/** Totales del encabezado: cartera completa (servidor), no cambian con filtros de la grilla. Solo admin. */
function cargarTotalesSaldosKpi() {
    if (!userSession || userSession.IdRol != 1) return;
    $.ajax({
        url: "/Clientes/TotalesSaldosCartera",
        type: "GET",
        dataType: "json"
    }).done(function (data) {
        if (!data) return;
        const ind = pickNumDesdeObj(data, "TotalIndumentaria", "totalIndumentaria");
        const electro = pickNumDesdeObj(data, "TotalElectrodomestico", "totalElectrodomestico");
        const gen = pickNumDesdeObj(data, "TotalGeneral", "totalGeneral");
        $("#totSaldoIndumentaria").text(formatNumber(ind));
        $("#totSaldoElectro").text(formatNumber(electro));
        $("#totSaldoGeneral").text(formatNumber(gen));
    });
}

function configurarFiltrosPorColumna() {
    if (!gridClientes) return;
    const api = gridClientes;

    const columnConfigClientes = [
        { index: 0, filterType: 'text' },
        { index: 1, filterType: 'text' },
        { index: 2, filterType: 'text' },
        { index: 3, filterType: 'text' },
        { index: 4, filterType: 'text' },
        { index: 5, filterType: 'text' },
        { index: 6, filterType: 'text' },
        { index: 7, filterType: 'text' },
        { index: 8, filterType: 'text' },
        { index: 9, filterType: 'text' },
        { index: 10, filterType: 'text' }
    ];

    inicializarFiltrosColumnas(api, columnConfigClientes, "clientes_col_filters_v1");
}

function inicializarSelect2Filtros() {
    if (!window.jQuery || !jQuery.fn || !jQuery.fn.select2) return;

    const initOne = (selector, placeholder) => {
        const $el = $(selector);
        if (!$el.length) return;
        if ($el.hasClass("select2-hidden-accessible")) {
            $el.select2("destroy");
        }
        $el.select2({
            width: "100%",
            allowClear: true,
            placeholder: placeholder,
            dropdownParent: $("#Filtros")
        });
    };

    // Misma idea que Ventas_Electrodomesticos_Cobros.js (select2 tras jQuery del layout)
    initOne("#VendedoresFiltro", "Todos");
    initOne("#ZonasFiltro", "Todas");
    initOne("#EstadoFiltro", "Todos");
}

const configurarDataTable = async (idVendedor, Nombre, Apellido, Dni, idZona, estado) => {
    // Igual que electro: se clona encabezado antes de inicializar DataTable
    $('#grdClientes thead tr.filters').remove();
    inicializarEncabezadoColumnas("#grdClientes");

    showGlobalLoadingClientes("Cargando tablas...");

    gridClientes = $('#grdClientes').DataTable({
        "ajax": {
            "url": `/Clientes/Listar?idVendedor=${idVendedor}&Nombre=${Nombre}&Apellido=${Apellido}&Dni=${Dni}&idZona=${idZona}`,
            "type": "GET",
            "dataType": "json",
            "dataSrc": clientesAjaxDataSrc,
            "error": function () {
                hideGlobalLoadingClientes();
            }
        },
        "processing": true,
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },

        scrollX: true,
        orderCellsTop: true,

        "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],


        "columns": [
            {
                "data": function (row) {
                    return [row.Nombre, row.Apellido]
                        .map((x) => (x || "").trim())
                        .filter(Boolean)
                        .join(" ");
                },
                "render": function (data, type, row) {
                    const full = data || "";
                    if (type === "sort" || type === "filter" || type === "type") {
                        return full;
                    }
                    const title = full
                        .replace(/&/g, "&amp;")
                        .replace(/"/g, "&quot;")
                        .replace(/</g, "&lt;");
                    return `<span class="cliente-tooltip" data-toggle="tooltip" data-placement="bottom" data-trigger="hover touch" title="${title}">
            <span class="cliente-nombre">${full}</span> 
            <i class="fa fa-pencil fa-1x text-primary" title="Editar cliente" 
            style="cursor: pointer;" 
            onclick="editarCliente(${row.Id})"></i>
            </span>`;
                }
            },

            { "data": "Dni" },

            {
                data: function (row) {
                    if (row.Direccion && row.Direccion.trim() !== "" && row.Latitud && row.Longitud) {
                        var direccionCorta = row.Direccion.length > 25 ? row.Direccion.substring(0, 25) + '...' : row.Direccion;
                        var direccionCompleta = row.Direccion;
                        var latDestino = row.Latitud;
                        var lonDestino = row.Longitud;
                        var mapaUrl = 'https://www.google.com/maps/search/?api=1&query=' + latDestino + ',' + lonDestino + '&zoom=20&basemap=satellite';

                        return '<div class="location-cell">' +
                            '<i title="Ir a Google Maps" class="fa fa-map-marker fa-2x text-warning location-icon" onclick="obtenerUbicacionYMostrarRecorrido(\'' + direccionCompleta + '\', ' + latDestino + ', ' + lonDestino + ')"></i> ' +
                            '<a href="javascript:void(0);" onclick="mostrarDireccionCompleta(\'' + direccionCompleta + '\', ' + latDestino + ', ' + lonDestino + ')" class="direccion-link">' + direccionCorta + '</a>' +
                            '</div>';
                    }

                    // Si no hay coordenadas, solo muestra la dirección
                    return '<a href="javascript:void(0);" onclick="mostrarDireccionCompleta(\'' + row.Direccion + '\', 0, 0)" class="direccion-link">' + row.Direccion + '</a>';
                }
            }

            ,


            { "data": "Telefono" },
            { "data": "Vendedor" },
            { "data": "Zona" },
            { "data": "Estado" },
            {
                "data": function (row) {
                    return pickNumCliente(row, "SaldoIndumentaria", "saldoIndumentaria");
                },
                "render": function (data, type) {
                    const n = typeof data === "number" && !isNaN(data) ? data : 0;
                    if (type === "sort" || type === "filter" || type === "type") return n;
                    return formatNumber(n);
                }
            },
            {
                "data": function (row) {
                    return pickNumCliente(row, "SaldoElectrodomestico", "saldoElectrodomestico");
                },
                "render": function (data, type) {
                    const n = typeof data === "number" && !isNaN(data) ? data : 0;
                    if (type === "sort" || type === "filter" || type === "type") return n;
                    return formatNumber(n);
                }
            },
            {
                "data": function (row) {
                    return pickNumCliente(row, "SaldoTotal", "saldoTotal", "Saldo", "saldo");
                },
                "render": function (data, type) {
                    const n = typeof data === "number" && !isNaN(data) ? data : 0;
                    if (type === "sort" || type === "filter" || type === "type") return n;
                    return formatNumber(n);
                }
            },
            {
                "data": function (row) {
                    return pickNumCliente(row, "LimiteVentas", "limiteVentas");
                },
                "render": function (data, type) {
                    const n = typeof data === "number" && !isNaN(data) ? data : 0;
                    if (type === "sort" || type === "filter" || type === "type") return n;
                    return formatNumber(n);
                }
            },
            {
                "data": "Id",
                "render": function (data, type, full) {
                    const telefono = `+54 9${full.Telefono}`;

                    const botonInfoVenta = `
                                            <button class='btn btn-sm btnacciones' 
                                                type='button'
                                                onclick="informacionVentasCliente(${full.Id})"
                                                title='Ver ventas del cliente'>
                                                <i class='fa fa-info-circle fa-lg text-white'></i>
                                            </button>`;

                    const iconoTelefono = `<a class="btn btn-sm btnacciones" href="tel:${telefono}" title="Llamar"><i class="fa fa-phone text-white"></i></a>`;

                    const iconoWhatsapp = `<button class="btn btn-sm btnacciones" type="button" onclick='modalWhatssap(${data})' title="Enviar WhatsApp"><i class="fa fa-whatsapp fa-lg text-white" aria-hidden="true"></i></button>`;
                    const iconoEliminar = `<button class="btn btn-sm btnacciones" type="button" onclick='eliminarCliente(${data})' title="Eliminar"><i class="fa fa-trash-o fa-lg text-white" aria-hidden="true"></i></button>`;

                    let iconos = "";

                    if (userSession.IdRol == 1) {
                        iconos = `${botonInfoVenta}${iconoTelefono}${iconoWhatsapp}${iconoEliminar}`;
                    }
                    else if (userSession.IdRol == 4) {
                        iconos = `${botonInfoVenta}`;
                    }
                    return iconos;
                },
                "orderable": true,
                "searchable": true
            }



        ],

        "fnRowCallback": function (nRow, data, row) {
            $(nRow).removeClass("fila-cliente-regular fila-cliente-inhabilitado");
            if (data.Estado == "Inhabilitado") {
                $(nRow).addClass("fila-cliente-inhabilitado");
            } else if (data.Estado == "Regular") {
                $(nRow).addClass("fila-cliente-regular");
            }
        },

        "initComplete": function (settings, json) {

            hideGlobalLoadingClientes();

            configurarOpcionesColumnas();
            configurarFiltrosPorColumna();
            if (estado) {
                gridClientes.column(6).search('^' + estado + '$', true, false).draw();
            }

            const esAdmin = userSession.IdRol == 1;
            const esComprobantes = userSession.IdRol == 4;

            // Acciones
            gridClientes.column(11).visible(esAdmin || esComprobantes);
            // Saldos y limite: solo admin
            gridClientes.column(7).visible(esAdmin);
            gridClientes.column(8).visible(esAdmin);
            gridClientes.column(9).visible(esAdmin);
            gridClientes.column(10).visible(esAdmin);
        }
    });


    let filaSeleccionada = null;
    const $tbl = $("#grdClientes");
    $tbl.off("click.clienteRow").on("click.clienteRow", "tbody tr", function (e) {
        const $tr = $(this);
        if ($tr.hasClass("child") || $tr.closest("tr.child").length) return;
        if ($(e.target).closest("a, button, .btnacciones, .location-icon, .cliente-tooltip, i.fa-pencil").length) return;

        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass("cliente-row-selected");
        }
        filaSeleccionada = $tr[0];
        $tr.addClass("cliente-row-selected");
    });
}




const eliminarCliente = async id => {

    try {
        if (confirm("¿Está seguro que desea eliminar este registro?")) {
            var url = "/Clientes/Eliminar";

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

            alert(result.Status);

            if (result.Status == "Cliente eliminado con exito") {

                $('.datos-error').removeClass('d-none');
                document.location.href = "../Index/";
            }
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


const buscarLimite = async nombre => {

    try {

        var url = "/Limite/BuscarValorLimite";

        let value = JSON.stringify({
            Nombre: nombre
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

        const payload = result && (result.data != null ? result.data : result.Data);
        if (!payload || (payload.Valor == null && payload.valor == null)) {
            $("#limiteModalMsg").text("No se encontró el valor de límite.").removeClass("d-none");
            return;
        }
        const v = payload.Valor != null ? payload.Valor : payload.valor;
        const valorFormateado = Number(v).toLocaleString("es-CL", {
            style: "currency",
            currency: "CLP"
        });

        document.getElementById("valorLimite").value = valorFormateado;
        $("#limiteModalMsg").addClass("d-none").text("");
    } catch (error) {
        $("#limiteModalMsg").text("No se pudo cargar el límite.").removeClass("d-none");
    }
}

function formatoMoneda(event) {
    var valorIngresado = event.target.value;
    var digits = String(valorIngresado).replace(/[^\d]/g, "");
    if (!digits.length) {
        event.target.value = "";
        return;
    }
    var valorNumerico = parseInt(digits, 10) || 0;
    event.target.value = valorNumerico.toLocaleString("es-CL", {
        style: "currency",
        currency: "CLP"
    });
}

async function modificarLimiteVenta() {

    try {

        var url = "/Limite/Editar";

        let value = JSON.stringify({
            Nombre: "ClientesRegulares_Venta",
            Valor: parseFloat(document.getElementById("valorLimite").value.replace(/[^\d]/g, ''))
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
            $("#limiteModalMsg").addClass("d-none").text("");
            alert("Limite modificado correctamente");
            $("#modalLimite").modal("hide");
        }
    } catch (error) {
        $("#limiteModalMsg").text("No se pudo guardar el límite.").removeClass("d-none");
    }
}


function modalLimite() {
    $("#limiteModalMsg").addClass("d-none").text("");
    buscarLimite("ClientesRegulares_Venta");
    $("#modalLimite").modal("show");
}

const modalWhatssap = async id => {
    $("#wspModalMsg").addClass("d-none").text("");
    $("#modalWhatssap").modal("show");
    $("#mensajewsp").val("");
    $("#idClienteWhatssap").val(id);
}

async function enviarWhatssap() {

    try {
        var url = "/Clientes/EnvWhatssap";

        let value = JSON.stringify({
            id: document.getElementById("idClienteWhatssap").value,
            mensaje: document.getElementById("mensajewsp").value
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
            const msg = encodeURIComponent(document.getElementById("mensajewsp").value || "");
            const urlwsp = `https://api.whatsapp.com/send?phone=+54 9${result.data.Telefono}&text=${msg}`;
            window.open(urlwsp, "_blank");
            $("#wspModalMsg").addClass("d-none").text("");
            $("#modalWhatssap").modal("hide");
        } else {
            $("#wspModalMsg").text("No se pudo obtener el teléfono del cliente.").removeClass("d-none");
        }
    } catch (error) {
        $("#wspModalMsg").text("Ha ocurrido un error al preparar el envío.").removeClass("d-none");
    }
}


function nuevoCliente() {
    localStorage.removeItem("EdicionCliente");
    document.location.href = "../../Clientes/Editar/";
}

const editarCliente = async id => {
    localStorage.setItem("EdicionCliente", id);
    document.location.href = "../../Clientes/Editar/";


    //try {
    //    var url = "/Clientes/EditarInfo";

    //    let value = JSON.stringify({
    //        Id: id
    //    });

    //    let options = {
    //        type: "POST",
    //        url: url,
    //        async: true,
    //        data: value,
    //        contentType: "application/json",
    //        dataType: "json"
    //    };

    //    let result = await MakeAjax(options);



    //    if (result != null) {

    //        $("#clienteModal").modal("show");

    //        selectUsuarios = document.getElementById("Usuarios");

    //        $('#Usuarios option').remove();
    //        for (i = 0; i < result.Usuarios.length; i++) {
    //            option = document.createElement("option");
    //            option.value = result.Usuarios[i].Id;
    //            option.text = result.Usuarios[i].Nombre;
    //            selectUsuarios.appendChild(option);
    //        }

    //        selectZonas = document.getElementById("Zonas");

    //        $('#Zonas option').remove();
    //        for (i = 0; i < result.Zonas.length; i++) {
    //            option = document.createElement("option");
    //            option.value = result.Zonas[i].Id;
    //            option.text = result.Zonas[i].Nombre;
    //            selectZonas.appendChild(option);
    //        }

    //        selectEstados = document.getElementById("Estados");

    //        $('#Estados option').remove();
    //        for (i = 0; i < result.Estados.length; i++) {
    //            option = document.createElement("option");
    //            option.value = result.Estados[i].Id;
    //            option.text = result.Estados[i].Nombre;
    //            selectEstados.appendChild(option);
    //        }

    //        document.getElementById("IdCliente").value = result.Usuario.Id;
    //        document.getElementById("Nombre").value = result.Usuario.Nombre;
    //        document.getElementById("Apellido").value = result.Usuario.Apellido;
    //        document.getElementById("Dni").value = result.Usuario.Dni;
    //        document.getElementById("Direccion").value = result.Usuario.Direccion;
    //        document.getElementById("Telefono").value = result.Usuario.Telefono;
    //        document.getElementById("lbllongitud").value = result.Usuario.Longitud;
    //        document.getElementById("lbllatitud").value = result.Usuario.Latitud;


    //        document.getElementById("Estados").value = result.Usuario.IdEstado;
    //        document.getElementById("Zonas").value = result.Usuario.IdZona;
    //        document.getElementById("Estados").removeAttribute("hidden");
    //        document.getElementById("lblEstados").removeAttribute("hidden");
    //        document.getElementById("Usuarios").value = result.Usuario.IdVendedor;
    //        document.getElementById("btnRegistrarModificar").textContent = "Modificar";
    //        document.getElementById("clienteModalLabel").textContent = "Modificar cliente " + document.getElementById("Nombre").value;

    //        initMap();

    //    } else {
    //        alert("Ha ocurrido un error en los datos");
    //    }
    //} catch (error) {
    //    alert("Ha ocurrido un error en los datos");
    //}
}

async function AccionBtn() {
    if (document.getElementById("btnRegistrarModificar").textContent == "Registrar") {
        await registrarCliente();
    } else {
        await modificarCliente();
    }
}



function verificarDatosCliente() {


    if (document.getElementById("Nombre").value === "") {
        alert("Debes completar el Nombre.")
        return false;
    }

    if (document.getElementById("Apellido").value === "") {
        alert("Debes completar el Apellido.")
        return false;
    }

    return true;

}
async function registrarCliente() {

    if (verificarDatosCliente()) {
        try {
            var url = "/Clientes/Nuevo";

            let value = JSON.stringify({
                Nombre: document.getElementById("Nombre").value,
                Apellido: document.getElementById("Apellido").value,
                Dni: document.getElementById("Dni").value,
                Direccion: document.getElementById("Direccion").value,
                Telefono: document.getElementById("Telefono").value,
                IdVendedor: document.getElementById("Usuarios").value,
                IdEstado: document.getElementById("Estados").value,
                IdZona: document.getElementById("Zonas").value
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
                alert('Cliente agregado correctamente.');
                $('.datos-error').removeClass('d-none');

                if (localStorage.getItem('modalClientesRegistrar') == 1) {
                    localStorage.setItem("dniCliente", document.getElementById("Dni").value);
                    localStorage.removeItem('modalClientesRegistrar');
                    document.location.href = "../../../Ventas/Nuevo/";

                } else {
                    document.location.href = "../Index/";
                }


            } else {
                //$('.datos-error').text('Ha ocurrido un error en los datos.')
                //$('.datos-error').removeClass('d-none')
            }
        } catch (error) {
            $('.datos-error').text('Ha ocurrido un error.')
            $('.datos-error').removeClass('d-none')
        }
    }
}

async function modificarCliente() {
    try {
        var url = "/Clientes/Editar";

        let value = JSON.stringify({
            Id: document.getElementById("IdCliente").value,
            Nombre: document.getElementById("Nombre").value,
            Apellido: document.getElementById("Apellido").value,
            Dni: document.getElementById("Dni").value,
            Direccion: document.getElementById("Direccion").value,
            Telefono: document.getElementById("Telefono").value,
            IdVendedor: document.getElementById("Usuarios").value,
            IdEstado: document.getElementById("Estados").value,
            IdZona: document.getElementById("Zonas").value,
            Latitud: document.getElementById("lbllatitud").innerText,
            Longitud: document.getElementById("lbllongitud").innerText
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
            alert('Cliente modificado correctamente.');
            $('.datos-error').removeClass('d-none');
            localStorage.setItem("NombreFiltro", document.getElementById("NombreFiltro").value);
            localStorage.setItem("ApellidoFiltro", document.getElementById("ApellidoFiltro").value);
            localStorage.setItem("DniFiltro", document.getElementById("DniFiltro").value);
            localStorage.removeItem("EdicionCliente");
            document.location.href = "../Index/";
        } else {
            //$('.datos-error').text('Ha ocurrido un error en los datos.')
            //$('.datos-error').removeClass('d-none')
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

function abrirmodalimportacionmasiva() {
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }
    $("#modalImportacionMasiva").modal("show");
}



function abrirmodal() {
    $("#clienteModal").modal("show");

    cargarUsuariosyEstados();
    document.getElementById("IdCliente").value = ""
    document.getElementById("IdZona").value = ""
    document.getElementById("Nombre").value = ""
    document.getElementById("Apellido").value = ""
    document.getElementById("Dni").value = ""
    document.getElementById("Direccion").value = ""
    document.getElementById("Telefono").value = ""
    document.getElementById("Usuarios").value = ""
    document.getElementById("Estados").value = ""
    document.getElementById("Zonas").value = ""
    document.getElementById("Estados").setAttribute("hidden", "hidden");
    document.getElementById("lblEstados").setAttribute("hidden", "hidden");
    document.getElementById("btnRegistrarModificar").textContent = "Registrar";
    document.getElementById("clienteModalLabel").textContent = "Registrar nuevo cliente";

};

async function cargarUsuariosyEstados() {
    try {
        var url = "/Clientes/ListaEstadosyVendedores";

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
            selectUsuarios = document.getElementById("Usuarios");

            $('#Usuarios option').remove();
            for (i = 0; i < result.Usuarios.length; i++) {
                option = document.createElement("option");
                option.value = result.Usuarios[i].Id;
                option.text = result.Usuarios[i].Nombre;
                selectUsuarios.appendChild(option);
            }

            selectEstados = document.getElementById("Estados");

            $('#Estados option').remove();
            for (i = 0; i < result.Estados.length; i++) {
                option = document.createElement("option");
                option.value = result.Estados[i].Id;
                option.text = result.Estados[i].Nombre;
                selectEstados.appendChild(option);
            }

            selectZonas = document.getElementById("Zonas");

            $('#Zonas option').remove();
            for (i = 0; i < result.Zonas.length; i++) {
                option = document.createElement("option");
                option.value = result.Zonas[i].Id;
                option.text = result.Zonas[i].Nombre;
                selectZonas.appendChild(option);
            }



        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


async function enviarImportacionMasiva() {
    debugger
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }
    try {
        var url = "/Clientes/GuardarDatos";
        var model = new FormData();
        model.append("File", importacionMasiva);
        model.append("Name", "Name");

        let options = {
            type: "POST",
            url: url,
            async: true,
            data: model,
        };


        debugger

        let result = await MakeAjaxFormData(options);


        if (result != null) {
            $("#modalImportacionMasiva").modal("hide");
            alert("Los clientes han sido registrados con exito.")
            document.location.href = "../Index/";
        } else {

            $("#modalImportacionMasiva").modal("hide");
            alert("Ha ocurrido un error con los datos.")
        }

    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


fileInput.addEventListener("change", (e) => {
    importacionMasiva = e.target.files[0]; // Obtén el archivo seleccionado

    if (importacionMasiva) {
        // Si se seleccionó un archivo, puedes trabajar con él aquí
        console.log("Nombre del archivo:", importacionMasiva.name);
        console.log("Tipo del archivo:", importacionMasiva.type);
        console.log("Tamaño del archivo:", importacionMasiva.size);

        // También puedes usar el objeto FileReader si es necesario, pero en este caso, no parece ser necesario.
    } else {
        // Si no se seleccionó ningún archivo, puedes asignar null o realizar otra acción según sea necesario.
        importacionMasiva = null;
    }
});


async function exportarExcel() {
    exportarDataTableAExcel(gridClientes, "Clientes")
};



function exportarDataTableAExcel(dataTable, fileName) {
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }

    // Crear una matriz de datos en formato SheetJS
    var data = [];

    var cabeceras = dataTable.columns().header().toArray();

    var headers = [];
    for (var i = 0; i < dataTable.columns().count() - 1; i++) {
        var cabeceraTexto = dataTable.column(i).header().textContent;
        headers.push(cabeceraTexto);
    }
    data.push(headers);

    // Agregar los datos de las filas al arreglo de datos
    for (var j = 0; j < dataTable.rows().count(); j++) {
        var row = [];
        for (var k = 0; k < dataTable.columns().count(); k++) {
            if (k == dataTable.columns().count() - 1) continue; //LA ULTIMA FILA NO LA PONEMOS
            var cellValue = dataTable.cell(j, k).data();
            row.push(cellValue);
        }
        data.push(row);
    }

    // Crear el libro de trabajo de Excel
    var workbook = XLSX.utils.book_new();

    // Crear la hoja de trabajo y asignar los datos
    var worksheet = XLSX.utils.aoa_to_sheet(data);



    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    // Generar el archivo Excel
    var wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    // Convertir el archivo Excel a un objeto Blob
    var blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    // Descargar el archivo Excel en el cliente
    if (typeof navigator.msSaveBlob !== "undefined") {
        // Para Internet Explorer
        navigator.msSaveBlob(blob, fileName);
    } else {
        // Para otros navegadores
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    alert("Exportacion creada con exito.")
}

async function cargarZonas() {
    try {
        var url = "/Clientes/ListarZonas";

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
            selectZonas = document.getElementById("ZonasFiltro");




            $('#ZonasFiltro option').remove();

            if (userSession.IdRol == 1) { //ROL ADMINISTRADOR
                option = document.createElement("option");
                option.value = -1;
                option.text = "Todas";
                selectZonas.appendChild(option);
            }

            for (i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre;
                selectZonas.appendChild(option);
            }
            const idZonaGuardado = localStorage.getItem("IdZonaFiltroClientes");
            if (idZonaGuardado !== null) $("#ZonasFiltro").val(idZonaGuardado);

        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

async function cargarUsuarios() {
    try {
        var url = "/Ventas/ListarVendedores";

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
            selectUsuarios = document.getElementById("VendedoresFiltro");




            $('#VendedoresFiltro option').remove();

            if (userSession.IdRol == 1) { //ROL ADMINISTRADOR
                option = document.createElement("option");
                option.value = -1;
                option.text = "Todos";
                selectUsuarios.appendChild(option);
            }

            for (i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre;
                selectUsuarios.appendChild(option);
            }
            const idVendGuardado = localStorage.getItem("IdVendedorFiltroClientes");
            if (idVendGuardado !== null) $("#VendedoresFiltro").val(idVendGuardado);

        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

function mostrarDireccionCompleta(direccion) {
    alert("Dirección completa: " + direccion);
}

var map;
var marker;

// Función para actualizar las coordenadas mostradas en los labels
function updateCoordinates(lat, lng) {
    document.getElementById('lbllatitud').textContent = lat.toFixed(6);
    document.getElementById('lbllongitud').textContent = lng.toFixed(6);

    // Crear una instancia del geocodificador inverso
    const geocoder = new google.maps.Geocoder();

    // Crear un objeto LatLng
    const latLng = new google.maps.LatLng(lat, lng);

    // Realizar la solicitud de geocodificación inversa
    geocoder.geocode({ 'location': latLng }, (results, status) => {
        if (status === 'OK') {
            if (results[0]) {
                document.getElementById('Direccion').value = results[0].formatted_address
                var modal = document.getElementById('mapModal');
                modal.style.display = 'none';
            } else {
                alert('No se encontraron resultados para estas coordenadas.');
            }
        }
    });
}
// Función para abrir el modal y cargar el mapa al hacer clic en el ícono de ubicación

// Función para cerrar el modal al hacer clic en la "X"
var closeModal = document.getElementsByClassName('close')[0];
closeModal.onclick = function () {
    var modal = document.getElementById('mapModal');
    modal.style.display = 'none';
};


document.addEventListener('DOMContentLoaded', function () {

});

function obtenerUbicacionYMostrarRecorrido(direccion, latDestino, lonDestino) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (posicion) {
            // Si se obtiene la ubicación actual, mostrar el recorrido
            var latOrigen = posicion.coords.latitude;
            var lonOrigen = posicion.coords.longitude;
            var mapaUrl = 'https://www.google.com/maps/dir/?api=1&origin=' + latOrigen + ',' + lonOrigen + '&destination=' + latDestino + ',' + lonDestino + '&travelmode=driving&basemap=satellite';
            window.open(mapaUrl, '_blank');
        }, function (error) {
            // Redirigir directamente al destino si la ubicación no está disponible
            var mapaUrl = 'https://www.google.com/maps/search/?api=1&query=' + latDestino + ',' + lonDestino + '&zoom=20&basemap=satellite';
            window.open(mapaUrl, '_blank');
        });
    } else {
        alert('La geolocalización no es compatible con este navegador.');

        // Redirigir directamente al destino si la geolocalización no está disponible
        var mapaUrl = 'https://www.google.com/maps/search/?api=1&query=' + latDestino + ',' + lonDestino + '&zoom=20&basemap=satellite';
        window.open(mapaUrl, '_blank');
    }
}

function abrirClientesCero() {
    document.location.href = "../../ClientesCero/Index/";
}
function configurarOpcionesColumnas() {
    const grid = $('#grdClientes').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas

    const storageKey = `Clientes_Columnas_v2`; // v2: nombre+apellido en una sola columna

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    const nombres = [
        "Nombre",
        "DNI",
        "Direccion",
        "Telefono",
        "Vendedor",
        "Zona",
        "Estado",
        "Saldo Indumentaria",
        "Saldo Electrodomestico",
        "Saldo Total",
        "Limite",
        "Acciones"
    ];

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = nombres[index] || col.data;

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


function informacionVentasCliente(idCliente) {
    if (!idCliente) return;

    const url = `/Ventas/Informacion?modo=todas&clienteId=${encodeURIComponent(idCliente)}&from=clientes`;

    window.location.href = url;
}
