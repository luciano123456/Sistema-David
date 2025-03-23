
let gridVentas
let userSession;
let facturaCliente;



$(document).ready(function () {





    userSession = JSON.parse(localStorage.getItem('usuario'));

    if (userSession.IdRol == 1) { //ROL ADMINISTRADOR
        $("#Filtros").removeAttr("hidden");
    }


    cargarUsuarios();
    cargarEstados();


    var FechaEntrega, FechaHasta, VentaFinalizada;


    if (userSession.IdRol == 1) { //ROL ADMIN
        if (localStorage.getItem("FechaEntrega") == null) {
            FechaEntrega = moment().format('YYYY-MM-DD');
        } else {
            FechaEntrega = localStorage.getItem("FechaEntrega");
        }

        
    } else {
        FechaEntrega = moment().format('YYYY-MM-DD');
    
    }


    document.getElementById("FechaEntrega").value = FechaEntrega;

    configurarDataTable(-1, FechaEntrega);

    $("#btnVentas").css("background", "#2E4053");


}).on('init.dt', function () {

});

function aplicarFiltros() {
    var idVendedor = document.getElementById("Vendedores").value;

    if (gridVentas) {
        gridVentas.destroy();
    }

    configurarDataTable(idVendedor, document.getElementById("FechaEntrega").value);

    localStorage.setItem("FechaEntrega", document.getElementById("FechaEntrega").value);

}

const configurarDataTable = async (idVendedor, FechaEntrega) => {
    gridVentas = $('#grdVentas').DataTable({
        "ajax": {
            "url": `/Pedidos/Listar?idVendedor=${idVendedor}&FechaEntrega=${FechaEntrega}`,
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },

        rowReorder: true,
        "colReorder": true, // Habilita la extensión ColReorder
        "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
        "columns": [

            { "data": "Fecha" },
            { "data": "Fecha_Entrega" },

            {
                "data": "Vendedor",
                "render": function (data, type, row) {
                    var primeraLetra = data != "" ? data.substring(0, 3) + "..." : "";
                    return primeraLetra;
                },
                width: "00px",
            },

            { "data": "Estado" },
            { "data": "NombreCliente" },
            { "data": "Dni" },

            {
                "data": "Direccion", // Cambia esto a la dirección completa en tus datos
                "render": function (value) {
                    // Si tiene más de 20 caracteres, devolver los 10 primeros + '...'
                    if (value != null && value.length > 25) {
                        return '<span class="direccion-tooltip" data-toggle="tooltip" data-placement="bottom" data-trigger="hover touch" title="' + value + '">' +
                            '<a href="javascript:void(0);" onclick="mostrarDireccionCompleta(\'' + value + '\')" class="direccion-link">' + value.substr(0, 25) + '...</a></span>';
                    }
                    return value;
                },
                width: "200px",
            },
            { "data": "Telefono" },

            { "data": "Entrega" },

            { "data": "Total" },
            { "data": "Restante" },
   
            {
                "data": "Observaciones",
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
                "render": function (data) {
                    var deleteButton = userSession.IdRol === 1 ? "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarVenta(" + data + ")' title='Eliminar'><i class='fa fa-trash-o fa-lg text-white'></i></button>" : "";
                    return "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarVenta(" + data + ")' title='Editar'><i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i></button>" +
                        "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='modalWhatssap(" + data + ")' title='Enviar Whatssap'><i class='fa fa-whatsapp fa-lg text-white' aria-hidden='true'></i></button>" +
                        "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='imprimirComprobante(" + data + ")' title='Imprimir Comprobante'><i class='fa fa-print fa-lg text-white' aria-hidden='true'></i></button>" +
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
                "targets": [4, 5, 6] // Columnas Venta, Cobro, Capital Final
            },
            {
                targets: [3, 7, 8],
                render: function (data) {
                    return moment(data).format('DD/MM/YYYY');
                }
            }
        ],
    });


    //$('#grdVentas tbody').on('dblclick', 'tr', function () {
    //    var rowData = gridVentas.row(this).data(); // Obtén los datos de la fila clicada
    //    if (rowData) {
    //        // Mostrar un mensaje con los datos de la fila
    //        editarVenta(rowData.Id);
    //    }
    //});

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

function nuevoPedido() {
    document.location.href = "../../../Pedidos/Nuevo/";
}

const editarVenta = async id => {
    localStorage.setItem("idEditarVenta", id);
    document.location.href = "../../../Ventas/Editar/";
}

const informacionVenta = async id => {
    localStorage.setItem("informacionVenta", id);
    document.location.href = "../../../Ventas/Informacion/";
}






const eliminarVenta = async id => {

    try {
        if (confirm("¿Está seguro que desea eliminar este pedido?")) {
            var url = "/Pedidos/Eliminar";

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
                alert('Pedido eliminado correctamente.');
                $('.datos-error').removeClass('d-none');
                document.location.href = "../Index/";
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

function modalExportacion() {
    $("#exportacionModal").modal("show");
}

const modalWhatssap = async id => {
    $("#modalWhatssap").modal('show');
    $("#mensajewsp").val("");
    $("#idClienteWhatssap").val(id);
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

async function cargarEstados() {
    try {
        var url = "/Pedidos/ListarEstados";

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
            selectUsuarios = document.getElementById("Estados");




            $('#Estados option').remove();

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
function mostrarDireccionCompleta(direccion) {
    alert("Dirección completa: " + direccion);
}
