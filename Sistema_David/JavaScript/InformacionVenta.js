let gridInfoVenta;
let userSession;

$(document).ready(function () {



    $("#IdInformacionVenta").text(localStorage.getItem("informacionVenta"));
    userSession = JSON.parse(localStorage.getItem('usuario'));
    configurarDataTable();

    $("#btnVentas").css("background", "#2E4053");



});

async function configurarDataTable() {
    gridInfoVenta = $('#grdInformacionVenta').DataTable({
        "ajax": {
            "url": "/Ventas/ListarInformacionVenta/" + localStorage.getItem("informacionVenta"),
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        scrollX: true,
        "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
        "columns": [
            { "data": "Fecha" },
            { "data": "Descripcion" },
            { "data": "Cobrador" },
            { "data": "Entrega" },
            { "data": "ValorCuota" },
            { "data": "Restante" },
            {
                "data": "Observacion", // Cambia esto a la dirección completa en tus datos
                "render": function (value) {
                    // Si tiene más de 20 caracteres, devolver los 10 primeros + '...'
                    if (value != null && value.length > 25) {
                        return '<span class="direccion-tooltip" data-toggle="tooltip" data-placement="bottom" data-trigger="hover touch" title="' + value + '">' +
                            '<a href="javascript:void(0);" onclick="mostrarObservacionCompleta(\'' + value + '\')" class="direccion-link">' + value.substr(0, 25) + '...</a></span>';
                    }
                    return value;
                },
                width: "200px",
            },
            {
                "data": "Id",
                "render": function (data, type, row) {
                    // Verifica si la descripción contiene la palabra "Venta"
                    if (row.Descripcion && row.Descripcion.includes("Venta")) {
                        // No muestra el botón si la descripción contiene la palabra "Venta"
                        return '';
                    } else {
                        // Define el color del ícono y el estado del botón basado en el rol del usuario
                        var iconColor = userSession.IdRol == 2 ? "red" : "white"; // Color del icono basado en el rol
                        var disabled = userSession.IdRol == 2 ? "disabled" : ""; // Desactivar el botón basado en el rol

                        // Devuelve el HTML del botón de eliminar si la descripción no contiene "Venta"
                        return "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarInformacion(" + data + ")' title='Eliminar' style='color: " + iconColor + ";' " + disabled + "><i class='fa fa-trash-o fa-lg' aria-hidden='true'></i></button>";
                    }
                }
            },
        ],
        "columnDefs": [

            {
                targets: [0], type: "ddMmYyyy",
                render: function (data) {
                    return moment(data).format('DD/MM/YYYY');
                }
            },



            {
                targets: [3, 4, 5],
                render: function (data) {
                    return formatNumber(data);
                }
            },


        ],


        "order": [[0, 'desc']],

        "fnRowCallback": function (nRow, data, row) {
            // Clear any previous styles on the third cell
            $('td:eq(0)', nRow).css('background-color', '');

            if (data.Descripcion != null) {
                if (data.Descripcion.includes("Venta")) {
                    $('td:eq(0)', nRow).css('background-color', '#819FF7');
                } else if (data.Descripcion.includes("Interes")) {
                    $('td:eq(0)', nRow).css('background-color', '#F5A9A9');
                }
            }
        }


    });


    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
    $('#grdInformacionVenta tbody').on('click', 'tr', function () {
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



    if (userSession.IdRol != 1) { //vendedor
        gridInfoVenta.column(-1).visible(false); // Ocultar la última columna si el usuario tiene el rol vendedor
    }

}

$.fn.dataTable.ext.type.order['ddMmYyyy-pre'] = function (d) {
    // Convertir la fecha desde el formato 'DD/MM/YYYY' a un timestamp para la comparación
    if (moment(d, 'DD/MM/YYYY', true).isValid()) {
        return moment(d, 'DD/MM/YYYY').toDate().getTime();
    } else {
        return 0; // En caso de una fecha inválida, devuelve 0
    }
};

function nuevaInformacion(id) {
    $("#informacionModal").modal("show");
}

function mostrarObservacionCompleta(observacion) {
    alert(observacion);
}



async function agregarInformacion() {


    try {

        if (document.getElementById("Descripcion").value == "") {
            alert("Debes escribir una descripcion.")
            return false;
        }
        var url = "/Ventas/AgregarInformacionVenta";



        let value = JSON.stringify({
            IdVenta: document.getElementById("IdInformacionVenta").innerText,
            Descripcion: document.getElementById("Descripcion").value,

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

            alert('Informacion realizada correctamente.');
            document.location.href = "../Informacion/";
        } else {
            alert('Los datos que has ingresado son incorrectos.');
        }

    } catch (error) {
        alert('Ha ocurrido un error en los datos. Vuelva a intentarlo');
    }
}

const eliminarInformacion = async id => {

    if (userSession.IdRol != 1) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }

    try {
        if (confirm("¿Está seguro que desea eliminar esta informacion?")) {
            var url = "/Ventas/EliminarInformacionVenta";

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

            if (result.data) {
                alert('Informacion eliminada correctamente.');
                $('.datos-error').removeClass('d-none');
                gridInfoVenta.ajax.reload();
            } else {
                //$('.datos-error').text('Ha ocurrido un error en los datos.')
                //$('.datos-error').removeClass('d-none')
            }
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}
