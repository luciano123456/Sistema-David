const PrecioVenta = [];
const stockTotal = [];
const productos = [];
let lastActionTime = 0;

$(document).ready(function () {

    $('.datos-error').text('')


    configurarDataTable();
    $("#btnPedidos").css("background", "#2E4053");


    var fechaEntrega = moment().format('YYYY-MM-DD');
    document.getElementById("FechaEntrega").value = fechaEntrega;
});



async function configurarDataTable() {
    $('#grdProductosPedido').DataTable({

        "ajax": {
            "url": "/Pedidos/ListarProductosPedido/0",
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        "columns": [



            { "data": "Producto" },
            { "data": "Talle" },
            { "data": "Color" },
            { "data": "Cantidad" },
            { "data": "PrecioTotal" },
            {
                "data": "IdProducto", "render": function (data) {

                    return "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarProducto(" + data + ")' title='Eliminar'><i class='fa fa-trash-o fa-lg text-white'></i></button>" +
                        "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarProducto(" + data + ")' title='Editar'><i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i></button>"
                },


                "orderable": true,
                "searchable": true,

                "width": "150px",


            }
        ],
    });
};

async function cargarCliente() {
    try {



        var url = "/Clientes/GetCliente";

        let value = JSON.stringify({
            Dni: document.getElementById("Dni").value
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

            if (result.data != null) {
                    if (confirm("Se ha encontrado un cliente con esos datos, ¿ Desea autocompletar?")) {
                        $("#estadocliente").css("color", "white");
                        $("#estadocliente").text("");
                        $("#nombrecliente").text("");
                        $("#direccioncliente").text("");
                        $("#telefonocliente").text("");
                        $("#idcliente").text("");

                        $("#idcliente").val(result.data.Id)
                        $("#NombreCliente").val(result.data.Nombre)
                        $("#Dni").val(result.data.Dni)
                        $("#Direccion").val(result.data.Direccion)
                        $("#Telefono").val(result.data.Telefono)
                    }
            }

  
    } catch (error) {
        //$('.datos-error').text('Ha ocurrido un error.')
        //$('.datos-error').removeClass('d-none')
    }
}


$("#Dni").blur(function () {
    if (document.getElementById("Dni").value != "") {
        cargarCliente();
    } else {
        $("#estadocliente").css("color", "white");
        $("#estadocliente").text("");
        $("#nombrecliente").text("");
        $("#direccioncliente").text("");
        $("#telefonocliente").text("");
        $("#idcliente").text("");
        $("#Dni").val("");
    }
});


function abrirmodal() {
    $("#lblpreciototal").show(500);
    $("#precioTotal").show(600);
    $("#lblstockTotal").show(700);
    $("#stockTotal").show(800);
    $("#d-stock").hide(900);

    $("#nuevoProductoModal").modal("show");
    $("#btnRegistrarModificar").text("Añadir");
    $("#Productos").prop('disabled', false);
    cargarProductos();


}

async function cargarProductos() {
    try {
        var url = "/Productos/ListarActivos";
        var data = JSON.parse(sessionStorage.getItem('usuario'));

        let value = JSON.stringify({
            Id: data.Id
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
                PrecioVenta[i] = result.data[i].PrecioVenta;
                selectProductos.appendChild(option);
            }

            selectProductosPrecio = document.getElementById("ProductosPrecio");

            $("#precioTotal").text(PrecioVenta[0]);

        }



    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

function nuevoModifProducto() {
    if ($("#btnRegistrarModificar").text() == "Añadir") {
        añadirProducto();
    } else {
        modificarProducto()
    }
}


function modificarProducto() {

    var table = $('#grdProductosPedido').DataTable();

    var persons = [
        {
            IdProducto: $("#Productos").find("option:selected").val(),
            Producto: $("#Productos").find("option:selected").text(),
            Talle: $("#Talle").val(),
            Color: $("#Color").val(),
            Cantidad: Number($("#Cantidad").val()),
            PrecioTotal: Number($("#precioTotal").text()),
        }
    ];

    table.rows().eq(0).each(function (index) {
        var row = table.row(index);

        let producto = row.data();

        if (producto.IdProducto == $("#Productos").find("option:selected").val()) {



            producto.Cantidad = persons[0].Cantidad
            producto.Talle = persons[0].Talle
            producto.Color = persons[0].Color
            producto.PrecioTotal = persons[0].PrecioTotal
            $('#grdProductosPedido').dataTable().fnUpdate(producto, index, undefined, false);

            actualizarPrecio();
        }
    });


}

function añadirProducto() {



    let actualizo = false;
    let stock = true;
    var table = $('#grdProductosPedido').DataTable();

    var persons = [
        {
            IdProducto: $("#Productos").find("option:selected").val(),
            Producto: $("#Productos").find("option:selected").text(),
            Talle: $("#Talle").val(),
            Color: $("#Color").val(),
            Cantidad: Number($("#Cantidad").val()),
            /*PrecioUnitario: Number($("#precioTotal").text()) / Number($("#Cantidad").val()),*/
            PrecioTotal: Number($("#precioTotal").text()),

        }
    ];

    table.rows().eq(0).each(function (index) {
        var row = table.row(index);


        let producto = row.data();


        if (producto.IdProducto == $("#Productos").find("option:selected").val()) {


            
            producto.Cantidad += persons[0].Cantidad
            producto.PrecioUnitario += persons[0].PrecioUnitario
            producto.PrecioTotal += persons[0].PrecioTotal
            producto.Talle += persons[0].Talle
            producto.Color += persons[0].Color

            alert("Producto agregado con exito.");


            $('#grdProductosPedido').dataTable().fnUpdate(producto, index, undefined, false);
            actualizo = true;

        }
    });

    if (!actualizo && stock == true) {


        table.rows.add(persons).draw();
        alert("Producto agregado con exito.");
    }



    actualizarPrecio();

}


const editarProducto = async id => {

    let actualizo = false;
    let stock = true;
    var table = $('#grdProductosPedido').DataTable();

    table.rows().eq(0).each(async function (index) {
        var row = table.row(index);


        let producto = row.data();

        if (producto.IdProducto == id) {


            $("#nuevoProductoModal").modal("show");

            var data = JSON.parse(sessionStorage.getItem('usuario'));

            let value = JSON.stringify({
                idUsuario: data.Id,
                idProducto: producto.IdProducto
            });

            var url = "/Productos/ListarActivos";

            let options = {
                type: "POST",
                url: url,
                async: true,
                data: value,
                contentType: "application/json",
                dataType: "json"
            };

            let result = await MakeAjax(options);
            $("#IdProducto").value = producto.IdProducto;


            $("#Productos").value = producto.Producto;
            $("#Productos").val(producto.IdProducto);


            $("#precioTotal").text(producto.PrecioTotal);

            $("#Cantidad").val(producto.Cantidad);

            $("#btnRegistrarModificar").text("Modificar");

            $("#Productos").prop('disabled', true);

            $("#lblpreciototal").show(500);
            $("#precioTotal").show(600);



        }
    });

}

const eliminarProducto = async id => {

    let actualizo = false;
    let stock = true;
    var table = $('#grdProductosPedido').DataTable();

    table.rows().eq(0).each(function (index) {
        var row = table.row(index);


        let producto = row.data();

        if (producto.IdProducto == id) {

            table.rows(index).remove().draw();

            actualizarPrecio();


        }

    });

}

function actualizarPrecio() {

    let total = 0;
    var table = $('#grdProductosPedido').DataTable();
    table.rows().eq(0).each(function (index) {
        var row = table.row(index);


        let producto = row.data();

        total += producto.PrecioTotal

    });

    $("#Total").text(formatNumber(total));

    total -= retornarEntero(document.querySelector("#Entrega").value);

    if (total < 0) {
        $("#montorestante").css("color", "red");
    } else {
        $("#montorestante").css("color", "white");
    }

    $("#montorestante").text(formatNumber(total));

}
const cantidad = document.querySelector("#Cantidad");

cantidad.addEventListener("keyup", (e) => {
    comprobarCantidad();

});

function comprobarCantidad() {
    var x = document.getElementById("Productos").selectedIndex;
    var y = document.getElementById("Productos").options;
    $("#precioTotal").text(PrecioVenta[y[x].index] * cantidad.value);
}






Productos.addEventListener("change", (e) => {
    var x = document.getElementById("Productos").selectedIndex;
    var y = document.getElementById("Productos").options;
    $("#precioTotal").text(PrecioVenta[y[x].index] * cantidad.value);
    $("#Cantidad").val("1");
    comprobarCantidad();
});


async function registrarPedido() {

    let now = new Date().getTime();

    if (now - localStorage.getItem("lastSaleTime") >= 10000) {

        let numeroTelefono = $("#telefonocliente").text();

        numeroTelefono = numeroTelefono.replace("Tel: ", "");

        if (await validarPedido()) {

            var table = $("#grdProductosPedido").DataTable()
            table.rows().eq(0).each(function (index) {
                var row = table.row(index);

                let producto = row.data();

                productos.push(producto);
            });

            if (productos.length == 0) {
                alert("Debes agregar por lo menos un producto.");
                return false;
            }

                registrarPedidoAjax();

            // Update the last action time

            localStorage.setItem("lastSaleTime", now);

        }
    } else {
        alert("Tienes que esperar al menos un minuto antes de volver a realizar esta acción.");
    }

}

async function validarPedido() {

    if ($('#NombreCliente').val() == "") {
        alert("Debes elegir un cliente.");
        return false;
    }
   
    return true;
}

async function registrarPedidoAjax() {
    try {
        var url = "/Pedidos/NuevoPedido";

        var data = JSON.parse(sessionStorage.getItem('usuario'));

        actualizarPrecio(); //ACTUALIZAMOS LOS PRECIOS POR UN TEMA DE SEGURIDAD

        let value = JSON.stringify({
            idVendedor: data.Id,
            idCliente: 0,
            idEstado: 1,
            NombreCliente: document.getElementById("NombreCliente").value,
            Dni: document.getElementById("Dni").value,
            Telefono: document.getElementById("Telefono").value,
            Observaciones: document.getElementById("Observacion").value,
            Entrega: retornarEntero(document.getElementById("Entrega").value),
            Total: retornarEntero(document.getElementById("Total").innerText),
            Restante: retornarEntero($("#montorestante").text()),
            Fecha_Entrega: moment(document.getElementById("FechaEntrega").value).format('DD/MM/YYYY'),
            ProductosPedidos: productos
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

        if (result.Status == 0) {

            alert('Pedido agregado correctamente.');
            document.location.href = "../Index/";
        } else {
            alert('Ha ocurrido un error en el Pedido. Consulte con un Administrador');
        }

    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

function retornarEntero(number) {

    // Elimina los decimales y la coma
    const valorSinDecimales = number.replace(/,00/g, '');

    // Elimina el punto y el signo de dólar
    const valorLimpio = valorSinDecimales.replace(/[.$]/g, '');

    // Convierte la cadena en un número entero
    const valorEntero = parseInt(valorLimpio, 10);
    return valorEntero;
}




const entrega = document.querySelector("#Entrega");
entrega.addEventListener("change", (e) => {

    if (retornarEntero($("#Total").text()) > 0)
        actualizarPrecio();

    const valorEntrega = retornarEntero(entrega.value);
    if (!isNaN(valorEntrega)) {
        entrega.value = formatNumber(valorEntrega);
    } else {
        entrega.value = formatNumber(0);
    }

    $("#lblentrega").text(formatNumber(retornarEntero(entrega.value)));

});
