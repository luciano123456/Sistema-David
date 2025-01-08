
let gridVentas = null
let gridVentasPendientes = null
let userSession;
let facturaCliente;



$(document).ready(async function () {





    userSession = JSON.parse(sessionStorage.getItem('usuario'));

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

    if (userSession.IdRol == 1) listarVentasPendientes();

    $("#btnVentas").css("background", "#2E4053");


}).on('init.dt', function () {
    if (data.Restante <= 0) {
        var cobranzaId = "Cobranza(" + data.Id + ")"
    }
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
        "initComplete": function (settings, json) {

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
                    "render": function (data) {
                        return "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='aceptarVenta(" + data + ")' title='Aceptar Venta'><i class='fa fa-check fa-lg text-green' aria-hidden='true'></i></button>" +
                            "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='eliminarVenta(" + data + ")' title='Rechazar Venta'><i class='fa fa-ban fa-lg text-danger' aria-hidden='true'></i></button>";
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

    // ... Código anterior de generación de la factura ...



    // Insertar imagen en Base64
    //const imagenBase64 = 'data:image/jpeg;base64,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';
    //const options = {
    //    width: 50, // Ancho de la imagen en el PDF
    //    height: 50 // Alto de la imagen en el PDF
    //};
    //doc.addImage(imagenBase64, 'JPEG', 10, 0, options.width, options.height);


    //// Factura con imagen
    //doc.setFontSize(32);
    //doc.setTextColor(115, 195, 178); // Texto en verde (RGB)
    //doc.text('Comprobante', 200, 20, 'right');

    //doc.setTextColor(0);
    //// Fecha
    //doc.setFontSize(12);
    //doc.text('Documento no válido como factura', 200, 28, 'right');

    //let fecha = moment().format('DD/MM/YYYY');
    //doc.text(`Fecha: ${fecha}`, 200, 35, 'right');

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


        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}