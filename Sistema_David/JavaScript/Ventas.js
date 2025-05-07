
let gridVentas = null
let gridVentasPendientes = null
let userSession;
let facturaCliente;



$(document).ready(async function () {





    userSession = JSON.parse(localStorage.getItem('usuario'));

    if (userSession.IdRol == 1) { //ROL ADMINISTRADOR
        $("#exportacionExcel").removeAttr("hidden");
        $("#Filtros").removeAttr("hidden");
        $("#btnLimite").removeAttr("hidden");
    } else if (userSession.IdRol == 4) { //ROL COMPROBANTES
        $("#Filtros").removeAttr("hidden");
    }

    await cargarTiposDeNegocio();
    await cargarUsuarios();


    var FechaDesde, FechaHasta, VentaFinalizada;


    if (userSession.IdRol == 1) { //ROL ADMIN
        if (localStorage.getItem("FechaDesdeVenta") == null) {
            FechaDesde = moment().format('YYYY-MM-DD');
        } else {
            FechaDesde = localStorage.getItem("FechaDesdeVenta");
        }

        if (localStorage.getItem("FechaHastaVenta") == null) {
            FechaHasta = moment().format('YYYY-MM-DD');
        } else {
            FechaHasta = localStorage.getItem("FechaHastaVenta");
        }


        if (localStorage.getItem("VentaFinalizada") == null) {
            VentaFinalizada = 1;
        } else {
            VentaFinalizada = localStorage.getItem("VentaFinalizada");
        }
    } else {
        FechaDesde = moment().format('YYYY-MM-DD');
        FechaHasta = moment().format('YYYY-MM-DD');
        VentaFinalizada = 0;
    }


    document.getElementById("FechaDesde").value = FechaDesde;
    document.getElementById("FechaHasta").value = FechaHasta;


    configurarDataTable(-1, FechaDesde, FechaHasta, VentaFinalizada, -1);

    if (userSession.IdRol == 1 || userSession.IdRol == 4) listarVentasPendientes();

    $("#btnVentas").css("background", "#2E4053");


}).on('init.dt', function () {
    verificarCobranzas();



});

function aplicarFiltros() {
    var idVendedor = document.getElementById("Vendedores").value;
    var tipoNegocio = document.getElementById("TipoNegocio").value;



    const fechaDesde = document.getElementById("FechaDesde").value;
    const fechaHasta = document.getElementById("FechaHasta").value;

    // Convertir las fechas a objetos Date
    const fechaDesdeDate = new Date(fechaDesde);
    const fechaHastaDate = new Date(fechaHasta);

    // Obtener la fecha actual
    const fechaActual = new Date();

    fechaActual.setUTCHours(fechaActual.getUTCHours() - 3);

    // Convertir las fechas a cadenas en el formato 'YYYY-MM-DD'
    const fechaHastaString = fechaHastaDate.toISOString().split('T')[0];
    const fechaActualString = fechaActual.toISOString().split('T')[0];




    if (userSession.IdRol == 4) {
        const cuatroDiasAntes = new Date(fechaActual);
        cuatroDiasAntes.setDate(cuatroDiasAntes.getDate() - 7);

        if (fechaDesdeDate < cuatroDiasAntes) {
            alert("No puedes filtrar datos de más de siete días atrás de la fecha actual.");
            return;
        }
    }

    if (gridVentas) {
        gridVentas.destroy();
    }

    configurarDataTable(idVendedor, document.getElementById("FechaDesde").value, document.getElementById("FechaHasta").value, document.getElementById("VentaFinalizada").checked ? 1 : 0, tipoNegocio);

    localStorage.setItem("FechaDesdeVenta", document.getElementById("FechaDesde").value);
    localStorage.setItem("FechaHastaVenta", document.getElementById("FechaHasta").value);
    localStorage.setItem("VentaFinalizada", document.getElementById("VentaFinalizada").checked ? 1 : 0);

}

const configurarDataTable = async (idVendedor, fechaDesde, fechaHasta, Finalizadas, tipoNegocio) => {
    gridVentas = $('#grdVentas').DataTable({
        "ajax": {
            "url": `/Ventas/Listar?idVendedor=${idVendedor}&FechaDesde=${fechaDesde}&FechaHasta=${fechaHasta}&Finalizadas=${Finalizadas}&tipoNegocio=${tipoNegocio}`,
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },

        scrollX: true,

        rowReorder: true,
        "colReorder": true, // Habilita la extensión ColReorder
        "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
        "columns": [

            { "data": "TipoNegocio" },
            { "data": "Cliente" },
            { "data": "DniCliente" },

            {
                data: function (row) {

                    var direccionCorta = row.Direccion != null && row.Direccion.length > 20 ? row.Direccion.substring(0, 20) + '...' : row.Direccion;
                    if (row.Direccion && row.Direccion.trim() !== "" && row.Latitud && row.Longitud) {
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
                    return '<a href="javascript:void(0);" onclick="mostrarDireccionCompleta(\'' + row.Direccion + '\', 0, 0)" class="direccion-link">' + direccionCorta + '</a>';
                }
            },

            { "data": "Fecha" },

            { "data": "ValorCuota" },

            { "data": "Entrega" },
            { "data": "Restante" },
            { "data": "FechaCobro" },
            { "data": "FechaLimite" },
            { "data": "Turno" },
            { "data": "FranjaHoraria" },
            {
                "data": "Vendedor",
                "render": function (data, type, row) {
                    var primeraLetra = data != "" ? data.substring(0, 3) + "..." : "";
                    return primeraLetra;
                },
                width: "00px",
            },
            {
                "data": "Observacion",
                "render": function (value) {
                    // Si tiene más de 20 caracteres, devolver los 10 primeros + '...'
                    if (value != null && value.length > 18) {
                        return '<span class="Observacion-tooltip" data-toggle="tooltip" data-placement="bottom" data-trigger="hover touch" title="' + value + '">' + value.substr(0, 18) + '...</span>';
                    }
                    return value;
                },
                width: "250px",
            },

            {
                "data": "Id",
                "render": function (data, type, row) {
                    var deleteButton = userSession.IdRol === 1 ? "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarVenta(" + data + ")' title='Eliminar'><i class='fa fa-trash-o fa-lg text-white'></i></button>" : "";
                    var visualizarVenta = "<button class='btn btn-sm btneditar btnacciones' type = 'button' onclick = 'editarVenta(" + data + ")' title = 'Visualizar Venta' > <i class='fa fa-eye fa-lg text-warning' aria-hidden='true'></i></button>";
                    var comprobanteIconColor = row.Comprobante === 1 ? "green" : "red";
                    return visualizarVenta +
                        "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='modalWhatssap(" + data + ")' title='Enviar Whatssap'><i class='fa fa-whatsapp fa-lg text-white' aria-hidden='true'></i></button>" +
                        "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='imprimirComprobante(" + data + ")' title='Imprimir Comprobante' ><i class='fa fa-print fa-lg' style='color: " + comprobanteIconColor + ";' aria-hidden='true'></i></button>" +
                        deleteButton;
                },
                width: "200px",
                "orderable": true,
                "searchable": true,
            }
        ],

        "rowReorder": {
            "selector": 'td:not(:first-child)', // Permite arrastrar filas excepto la primera columna
            "snapX": true, // Hace que las filas se ajusten a la posición del mouse horizontalmente
            "update": true, // Actualiza automáticamente el orden en los datos del DataTable
            "dataSrc": '' // Utiliza el índice de la fila como valor de datos para actualizar
        },
        "fnRowCallback": function (nRow, data, row) {
            var fechaHoy = moment().format('DD/MM/YYYY');
            var fechaCobro = moment(data.FechaCobro).format('DD/MM/YYYY');
            var fechaLimite = moment(data.FechaLimite).format('DD/MM/YYYY');
            var fechaCliente = moment(data.FechaCliente).format('DD/MM/YYYY');

            if (fechaHoy == fechaCliente) {
                $('td', nRow).css('color', '#6DC316'); // Cambiar color de la celda del cliente en verde
                $('td:eq(3) a', nRow).css('color', '#6DC316');
            }

            if (data.Estado == "Aprobar") {
                $('td', nRow).css('background-color', '#DED803');
            }

            //} else if (fechaHoy.isSameOrAfter(fechaCobro, 'day') && fechaHoy.isSameOrAfter(fechaCobro, 'month') && fechaHoy.isSameOrAfter(fechaCobro, 'year')) {
            //    $('td', nRow).css('background-color', '#DED803');
            //}

            if (data.Restante <= 0) {
                var cobranzaId = "Cobranza(" + data.Id + ")";
                // Puedes ocultar el botón de la siguiente manera:
                // document.getElementById(cobranzaId).style.display = "none";
            }
        },
        "columnDefs": [
            {
                "render": function (data, type, row) {
                    return formatNumber(data); // Formatear número en la columna
                },
                "targets": [5,6, 7] // Columnas Venta, Cobro, Capital Final
            },
            {
                targets: [4, 8, 9],
                render: function (data) {
                    return moment(data).format('DD/MM/YYYY');
                }
            }
        ],
        "initComplete": async function (settings, json) {

            await configurarOpcionesColumnas()

            if (userSession.IdRol == 4) {
                gridVentas.column(5).visible(false);
                gridVentas.column(6).visible(false);
                gridVentas.column(7).visible(false);
                gridVentas.column(8).visible(false);
                gridVentas.column(9).visible(false);
            }
        }
    });



    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
    $('#grdVentas tbody').on('click', 'tr', function () {
        // Remover la clase de la fila anteriormente seleccionada
        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass('seleccionada');
            $('td', filaSeleccionada).removeClass('seleccionada');

        }

        // Obtener la fila actual
        filaSeleccionada = $(this);

        // Agregar la clase a la fila actual
        $(filaSeleccionada).addClass('seleccionada');
        $('td', filaSeleccionada).addClass('seleccionada');

    });

    // Inicializar los tooltips
    if ('ontouchstart' in window) {
        // Dispositivo táctil (móvil)
        $('.direccion-tooltip').tooltip({
            container: 'body',
            placement: 'bottom',
            trigger: 'hover',
        });
    } else {
        // Otros dispositivos (desktop)
        $('.direccion-tooltip').tooltip({
            container: 'body',
            placement: 'bottom',
            trigger: 'hover',
        });
    }
}



async function configurarDataTablePendientes(data) {
    if (gridVentasPendientes === null) {
        gridVentasPendientes = $('#grdVentasPendientes').DataTable({
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            },
            "info": true,
            data: data, // Asigna directamente los datos recibidos por parámetro
            rowReorder: true,
            colReorder: true,
            scrollX: true,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
            columns: [
                { "data": "TipoNegocio" },
                { "data": "Cliente" },
                { "data": "DniCliente" },
                {
                    "data": "Direccion",
                    "render": function (value) {
                        if (value != null && value.length > 25) {
                            return '<span class="direccion-tooltip" data-toggle="tooltip" data-placement="bottom" data-trigger="hover touch" title="' + value + '">' +
                                '<a href="javascript:void(0);" onclick="mostrarDireccionCompleta(\'' + value + '\')" class="direccion-link">' + value.substr(0, 25) + '...</a></span>';
                        }
                        return value;
                    },
                    width: "200px",
                },
                { "data": "Fecha" },
                { "data": "ValorCuota" },
                { "data": "Entrega" },
                { "data": "Restante" },
                { "data": "FechaCobro" },
                { "data": "FechaLimite" },
                { "data": "Turno" },
                { "data": "FranjaHoraria" },
                {
                    "data": "Vendedor",
                    "render": function (data, type, row) {

                        var primeraLetra = data != "" ? data.substring(0, 3) + "..." : "";
                        return primeraLetra;
                    },
                    width: "100px",
                },
                {
                    "data": "Observacion",
                    "render": function (value) {
                        if (value != null && value.length > 18) {
                            return '<span class="Observacion-tooltip" data-toggle="tooltip" data-placement="bottom" data-trigger="hover touch" title="' + value + '">' + value.substr(0, 18) + '...</span>';
                        }
                        return value;
                    },
                    width: "250px",
                },
                {
                    "data": "Id",
                    "render": function (data, type, row) {
                        var visualizarVenta = "<button class='btn btn-sm btneditar btnacciones' type = 'button' onclick = 'editarVenta(" + data + ")' title = 'Visualizar Venta' > <i class='fa fa-eye fa-lg text-warning' aria-hidden='true'></i></button>";
                        var comprobanteIconColor = row.Comprobante === 1 ? "green" : "red";
                        var rechazarVenta = row.IdRol == 1 ? "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='eliminarVenta(" + data + ")' title='Rechazar Venta'><i class='fa fa-ban fa-lg text-danger' aria-hidden='true'></i></button>" : "";
                        return "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='aceptarVenta(" + data + ")' title='Aceptar Venta'><i class='fa fa-check fa-lg text-green' aria-hidden='true'></i></button>" +
                            rechazarVenta +
                            visualizarVenta +
                            "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='modalWhatssap(" + data + ")' title='Enviar Whatssap'><i class='fa fa-whatsapp fa-lg text-white' aria-hidden='true'></i></button>" +
                            "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='imprimirComprobante(" + data + ")' title='Imprimir Comprobante' ><i class='fa fa-print fa-lg' style='color: " + comprobanteIconColor + ";' aria-hidden='true'></i></button>";
                    },
                    width: "200px",
                    "orderable": true,
                    "searchable": true,
                }
            ],
            rowReorder: {
                selector: 'td:not(:first-child)',
                snapX: true,
                update: true,
                dataSrc: ''
            },

            "columnDefs": [
                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear número en la columna
                    },
                    "targets": [5, 6, 7] // Columnas Venta, Cobro, Capital Final
                },
                {
                    targets: [4, 8, 9],
                    render: function (data) {
                        return moment(data).format('DD/MM/YYYY');
                    }
                }
            ],
            "initComplete": function (settings, json) {
                if (userSession.IdRol == 4) {
                    gridVentasPendientes.column(5).visible(false);
                    gridVentasPendientes.column(6).visible(false);
                    gridVentasPendientes.column(7).visible(false);
                    gridVentasPendientes.column(8).visible(false);
                    gridVentasPendientes.column(9).visible(false);
                }
            }
        });
    } else {
        gridVentasPendientes.clear().rows.add(data).draw();
    }


    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
    $('#grdVentasPendientes tbody').on('click', 'tr', function () {
        // Remover la clase de la fila anteriormente seleccionada
        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass('seleccionada');
            $('td', filaSeleccionada).removeClass('seleccionada');

        }

        // Obtener la fila actual
        filaSeleccionada = $(this);

        // Agregar la clase a la fila actual
        $(filaSeleccionada).addClass('seleccionada');
        $('td', filaSeleccionada).addClass('seleccionada');

    });
}

function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) {
        return "$0"; // Devuelve un valor predeterminado si 'number' no es válido
    }

    const parts = number.toFixed(0).toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return "$" + parts.join(",");
}

function verificarCobranzas() {
    var table = $("#grdVentas").DataTable()

    table.rows().eq(0).each(function (index) {
        var row = table.row(index);

        let venta = row.data();

        //if (venta.Restante <= 0) {
        //    var cobranzaId = "Cobranza(" + venta.Id + ")"
        //    document.getElementById(cobranzaId).setAttribute("hidden", "hidden");
        //}

    });
}

function nuevaVenta() {
    document.location.href = "../../../Ventas/Nuevo/";
}



const informacionVenta = async id => {
    localStorage.setItem("informacionVenta", id);
    document.location.href = "../../../Ventas/Informacion/";
}



const editarVenta = async id => {
    localStorage.setItem("idEditarVenta", id);
    localStorage.setItem("volverCobranzas", 0);
    document.location.href = "../../../Ventas/Editar/";
}



const eliminarVenta = async id => {
    var devolverStock = 0;
    try {
        if (confirm("¿Está seguro que desea eliminar esta venta?")) {
            if (confirm("¿Devolver stock?")) {
                devolverStock = 1;
            } else {
                devolverStock = 0;
            }
            var url = "/Ventas/Eliminar";

            let value = JSON.stringify({
                Id: id,
                DevolverStock: devolverStock
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
                alert('Venta eliminada correctamente.');
                $('.datos-error').removeClass('d-none');
                document.location.href = "../../../Ventas/Index/";
            } else {
                $('.datos-error').text('Ha ocurrido un error en los datos.')
                $('.datos-error').removeClass('d-none')
            }
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

const aceptarVenta = async id => {

    try {
        var url = "/Ventas/Aceptar";

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

        if (result.Status) {
            alert('Venta aceptada correctamente.');
            $('.datos-error').removeClass('d-none');
            document.location.href = "../../../Ventas/Index/";
        } else {
            $('.datos-error').text('Ha ocurrido un error en los datos.')
            $('.datos-error').removeClass('d-none')
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

const enviarComprobante = async id => {

    try {
        var url = "/Ventas/EnviarComprobante";

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

        if (result.Status) {
            const table = $('#grdVentas').DataTable();
            table.ajax.reload();

            listarVentasPendientes()
        } else {
            $('.datos-error').text('Ha ocurrido un error en los datos.')
            $('.datos-error').removeClass('d-none')
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


function cobranzaVenta(id) {
    document.getElementById("IdVenta").innerText = id;
    document.getElementById("FechaCobro").value = moment().add(7, 'days').format('YYYY-MM-DD');

    $("#cobranzaModal").modal("show");
}

function modalExportacion() {
    $("#exportacionModal").modal("show");
}

async function hacerCobranza() {
    try {
        var url = "/Ventas/Cobranza";


        if (validarCobranza()) {
            let value = JSON.stringify({
                Id: document.getElementById("IdVenta").innerText,
                Entrega: document.getElementById("Entrega").value,
                FechaCobro: moment(document.getElementById("FechaCobro").value).format('DD/MM/YYYY'),
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

                alert('Cobranza realizada correctamente.');
                document.location.href = "../Index/";
            } else {
                alert('Los datos que has ingresado son incorrectos.');
            }
        }

    } catch (error) {
        alert('Ha ocurrido un error en los datos. Vuelva a intentarlo');
    }
}

function validarCobranza() {
    var nuevaFecha = document.getElementById("FechaCobro").value;
    var fechaHoy = moment();

    if (fechaHoy.isSameOrAfter(nuevaFecha, 'day') && fechaHoy.isSameOrAfter(nuevaFecha, 'month') && fechaHoy.isSameOrAfter(nuevaFecha, 'year')) {
        alert("La fecha de cobro debe ser superior al dia de la fecha.");
        return false;
    } else {
        return true;
    }
}

async function exportarExcel() {


    exportarDataTableAExcel(gridVentas, "Ventas")
};



function exportarDataTableAExcel(dataTable, fileName) {

    if (userSession.IdRol != 1) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }

    var data = [];
    var cabeceras = dataTable.columns().header().toArray();
    var headers = [];
    for (var i = 0; i < dataTable.columns().count() - 1; i++) {
        var cabeceraTexto = dataTable.column(i).header().textContent;
        headers.push(cabeceraTexto);
    }
    data.push(headers);

    for (var j = 0; j < dataTable.rows().count(); j++) {
        var row = [];
        for (var k = 0; k < dataTable.columns().count(); k++) {
            if (k == dataTable.columns().count() - 1) continue; //LA ULTIMA FILA NO LA PONEMOS
            var cellValue = dataTable.cell(j, k).data();

            // Si es la columna de Dirección, extraer solo el texto
            if (k == 2) {
                var tempDiv = document.createElement("div");
                tempDiv.innerHTML = cellValue;
                cellValue = tempDiv.textContent || tempDiv.innerText || "";
            }

            if (k == 3 || k == 7 || k == 8) {
                cellValue = moment(cellValue).format('DD/MM/YYYY');
            }
            row.push(cellValue);
        }
        data.push(row);
    }

    var workbook = XLSX.utils.book_new();
    var worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    var wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    var blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    if (typeof navigator.msSaveBlob !== "undefined") {
        navigator.msSaveBlob(blob, fileName);
    } else {
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



const modalWhatssap = async id => {
    $("#modalWhatssap").modal('show');
    $("#mensajewsp").val("");
    $("#idClienteWhatssap").val(id);
}


async function enviarWhatssap() {

    try {
        var url = "/Ventas/EnvWhatssap";

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
            const urlwsp = `https://api.whatsapp.com/send?phone=+54 9${result.data.Telefono}&text=${document.getElementById("mensajewsp").value}`;
            window.open(urlwsp, '_blank');
            $('.datos-error').removeClass('d-none');
        } else {
            $('.datos-error').text('Ha ocurrido un error en los datos.')
            $('.datos-error').removeClass('d-none')
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}
//async function enviarWhatssap() {

//    try {
//        var url = "/Ventas/EnvWhatssap";

//        let value = JSON.stringify({
//            id: document.getElementById("idClienteWhatssap").value,
//            mensaje: document.getElementById("mensajewsp").value
//        });

//        let options = {
//            type: "POST",
//            url: url,
//            async: true,
//            data: value,
//            contentType: "application/json",
//            dataType: "json"
//        };

//        let result = await MakeAjax(options);

//        if (result.Status) {
//            $('.datos-error').removeClass('d-none');
//        } else {
//            $('.datos-error').text('Ha ocurrido un error en los datos.')
//            $('.datos-error').removeClass('d-none')
//        }
//    } catch (error) {
//        $('.datos-error').text('Ha ocurrido un error.')
//        $('.datos-error').removeClass('d-none')
//    }
//}


async function listarVentasPendientes() {
    var url = "/Ventas/ListarVentasPendientes";

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

    try {
        let response = await MakeAjax(options);

        if (response != null && response.data != null && response.data.length > 0) {
            $("#grdVentasPendientesDiv").removeAttr("hidden");
            await configurarDataTablePendientes(response.data);
        } else {
            console.error("Error: No se recibieron datos válidos desde el servidor.");
        }
    } catch (error) {
        console.error("Error al obtener datos desde el servidor:", error);
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
            selectUsuarios = document.getElementById("Vendedores");




            $('#Vendedores option').remove();

            if (userSession.IdRol == 1 || userSession.IdRol == 4) { //ROL ADMINISTRADOR, COMPROBANTES
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


        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


const imprimirComprobante = async id => {

    try {

        var url = "/Ventas/InformacionVentayProductos";

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
            facturaCliente = result.Venta.Cliente;
            const facturaPDF = generarFacturaPDF(result);
            descargarFacturaPDF(facturaPDF);

            enviarComprobante(id);


        } else {
            alert('Ha ocurrido un error en los datos.')
        }
    } catch (error) {
        alert('Ha ocurrido un error en los datos.')
    }
}



function ocultarFiltros() {
    alert("Hola");
    var filtros = document.getElementById("Filtros");

    // Verificar si está oculto
    if (filtros.style.display === "none") {
        // Mostrar los filtros
        filtros.style.display = "block";
        /*$("#ocultarFiltros").text("-");*/
    } else {
        // Ocultar los filtros
        /* $("#ocultarFiltros").text("+");*/
        filtros.style.display = "none";
    }
}

// Generar la factura en PDF
// Generar la factura en PDF
function generarFacturaPDF(factura) {

    const doc = new jsPDF();

    // Factura sin imagen
    doc.setFontSize(32);
    doc.setTextColor(115, 195, 178); // Texto en verde (RGB)
    doc.text('Comprobante', 80, 20, 'right');

    doc.setTextColor(0);
    // Fecha
    doc.setFontSize(12);
    doc.text('Documento no válido como factura', 80, 28, 'right');

    let fecha = moment().format('DD/MM/YYYY');
    doc.text(`Fecha: ${fecha}`, 80, 35, 'right');

    // Información de la factura

    doc.setFontSize(32);
    doc.setTextColor(115, 195, 178); // Texto en verde (RGB)
    doc.text(`David Godoy`, 10, 60);
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`Indumentaria Dg`, 10, 70);
    doc.text(`Vendedor: ${factura.Venta.Vendedor}`, 10, 78);
    doc.text(`Primer Fecha de Cobro: ${moment(factura.Venta.P_FechaCobro).format('DD/MM/YYYY')}`, 10, 86);
    doc.text(`Primer Valor cuota: ${formatNumber(factura.Venta.P_ValorCuota)}`, 90, 86);

    // Detalles de los productos
    doc.setFontSize(12);
    const backgroundColor = [115, 195, 178]; // Color verde (RGB)

    let y = 90;

    // Encabezados de las columnas
    doc.setFillColor(backgroundColor[0], backgroundColor[1], backgroundColor[2]); // Fondo verde

    doc.rect(10, y, 190, 10, 'F');
    doc.text('ARTICULO', 12, 98);
    doc.text('CANT', 102, 98);
    doc.text('PRECIO', 142, 98);
    doc.text('Total', 182, 98);

    y = 108;

    let color = true;
    let total = 0;

    factura.Productos.forEach(item => {



        if (color == true) {
            color = false;
        } else {
            const backgroundColor = [232, 238, 237]; // Color verde (RGB)
            // Encabezados de las columnas
            doc.setFillColor(backgroundColor[0], backgroundColor[1], backgroundColor[2]); // Fondo verde
            doc.rect(10, y - 7, 190, 10, 'F');
            ;
            color = true;
        }



        total += item.PrecioTotal * item.Cantidad;

        doc.setFontSize(12);
        doc.text(item.Producto, 12, y);
        doc.text(item.Cantidad.toString(), 107, y);
        doc.text(formatNumber(item.PrecioTotal), 147, y);
        doc.text(formatNumber(item.PrecioTotal * item.Cantidad), 180, y);



        // Dibujar línea separadora
        doc.setLineWidth(0.5);
        doc.line(10, y + 3, 200, y + 3);



        y += 10;



    });

    // Total
    doc.setFontSize(14);
    doc.text(`SUBTOTAL: ${formatNumber(total)}`, 150, y);
    doc.text(`ENTREGA: ${formatNumber(factura.Venta.Entrega)}`, 150, y + 10);
    doc.text(`RESTANTE: ${formatNumber(total - factura.Venta.Entrega)}`, 150, y + 20);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`¿Alguna Pregunta?`, 10, y + 40);
    doc.text(`Envianos un Whatssap al (54 9)  3777 71-0884`, 10, y + 45);



    doc.setFontSize(32);
    doc.setTextColor(115, 195, 178); // Texto en verde (RGB)
    doc.text(`¡Gracias!`, 150, y + 40);
    doc.setTextColor(0);



    return doc;
}

function descargarFacturaPDF(facturaPDF) {
    facturaPDF.save(`factura_${facturaCliente}.pdf`);
}

function mostrarDireccionCompleta(direccion) {
    alert("Dirección completa: " + direccion);
}


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

function modalLimite() {
    cargarTiposDeNegocio();
    $("#modalLimite").modal('show');
}


document.getElementById("TipoNegocio").addEventListener("change", async function () {
    var url = "/Usuarios/BuscarTipoNegocio";

    let value = JSON.stringify({
        id: document.getElementById("TipoNegocio").value
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
       
        document.getElementById("DiasLimite").value = result.data.DiasVencimiento;
    }
});



async function modificarLimiteVencimiento() {

    try {

        var url = "/Usuarios/CambiarDiasVencimientoNegocio";

        let value = JSON.stringify({
            Id: document.getElementById("TipoNegocio").value,
            Valor: document.getElementById("DiasLimite").value
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
            alert("Limite modificado correctamente");
        }


    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}



async function cargarTiposDeNegocio() {
    try {
        var url = "/Usuarios/ListarTipoNegocio";

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
            selectUsuarios = document.getElementById("TipoNegocio");




            $('#TipoNegocio option').remove();

            if (userSession.IdRol == 1 || userSession.IdRol == 4) { //ROL ADMINISTRADOR
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


        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

function configurarOpcionesColumnas() {
    const grid = $('#grdVentas').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Ventas_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {



        if (col.data && col.data !== "Id" && col.data != "Activo") { // Solo agregar columnas que no sean "Id"

            if (userSession.IdRol == 4) {
                if (index == 5 || index == 6 || index == 7 || index == 8 || index == 9) {
                    return;
                }
            }

            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = index == 3 ? "Direccion" : col.data;

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