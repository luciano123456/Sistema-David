const precioVenta = [];
const productos = [];
let userSession;
let idUserStock = 0;
let productoNombres = {};
let nombreUser;
let gridStock;


$(document).ready(function () {
    userSession = JSON.parse(sessionStorage.getItem('usuario'));


    aplicarFiltros();
    
});




function aplicarFiltros() {
    var producto = document.getElementById("ProductoFiltro").value;
   
    if (gridStock) {
        gridStock.destroy();
    }

    configurarDataTable(producto);

}


async function configurarDataTable(producto) {
    gridStock = $('#grdStock').DataTable({
        "ajax": {
            "url": `/Stock/BuscarStockProducto?producto=${producto}`,
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        scrollX: true,
        "columns": [
            {
                "data": "Imagen",
                "render": function (data, type, row) {
                    let imgUrl = `/Productos/ObtenerImagen/${row.IdProducto}`;
                    return `<img src="${imgUrl}" height="45px" width="45px" class="img-thumbnail" 
                            style="background-color: transparent; cursor: pointer;" 
                            onclick="openModal('${imgUrl}')" />`;
                }
            },
            { "data": "Usuario" },
            { "data": "TipoNegocio" },
            { "data": "Producto" },
            { "data": "Cantidad" },
            { "data": "PrecioVenta" },
            { "data": "Total" }
        ],
        "columnDefs": [
            {
                "targets": [5, 6], // PrecioVenta y Total
                "render": function (data, type, row) {
                    return type === 'display' && !isNaN(parseFloat(data)) ? formatNumber(data) : data;
                }
            }
        ]
    });

    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
    $('#grdStock tbody').on('click', 'tr', function () {
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

async function cargarProductos() {
    try {
        var url = "/Productos/ListarActivos";

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

            selectProductos = document.getElementById("Productos");

            $('#Productos option').remove();
            for (var i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre;
                /*precioVenta[result.data[i].Id] = result.data[i].PrecioVenta;*/
                precioVenta[i] = result.data[i].PrecioVenta;

                productoNombres[result.data[i].Id] = result.data[i].Nombre;

                selectProductos.appendChild(option);

            }

            selectProductosPrecio = document.getElementById("ProductosPrecio");

            $("#precioTotal").text(formatNumber(precioVenta[0]));

        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


async function cargarUsuarios() {
    try {
        var url = "/Usuarios/ListarUserActivos";

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
            for (var i = 0; i < result.data.length; i++) {
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

async function cargarProductosAll() {
    try {
        var url = "/Productos/Listar";

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

            selectProductos = document.getElementById("Productos");

            $('#Productos option').remove();
            for (var i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre;
                /*precioVenta[result.data[i].Id] = result.data[i].PrecioVenta;*/
                precioVenta[i] = result.data[i].PrecioVenta;

                productoNombres[result.data[i].Id] = result.data[i].Nombre;

                selectProductos.appendChild(option);

            }

            selectProductosPrecio = document.getElementById("ProductosPrecio");

            $("#precioTotal").text(formatNumber(precioVenta[0]));

        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}








function openModal(imageSrc) {
    // Cambia el src de la imagen del modal
    document.getElementById('modalImage').src = imageSrc;
    // Muestra el modal
    $('#imageModal').modal('show');
}



