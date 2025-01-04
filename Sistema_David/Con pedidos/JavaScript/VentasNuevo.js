const precioVenta = [];
const stockTotal = [];
const productos = [];
let lastActionTime = 0;

$(document).ready(function () {

    $('.datos-error').text('')


    configurarDataTable();
    $("#btnVentas").css("background", "#2E4053");


    var fechaCobro = moment().add(7, 'days').format('YYYY-MM-DD');
    var fechaLimite = moment().add(45, 'days').format('YYYY-MM-DD');

    document.getElementById("FechaCobro").value = fechaCobro;
    document.getElementById("FechaLimite").value = fechaLimite;

     

});


async function buscarLimiteVenta(nombre) {
    try {
        var url = "/Limite/BuscarValorLimite";
        let value = JSON.stringify({ Nombre: nombre });
        let options = {
            type: "POST",
            url: url,
            async: true,
            data: value,
            contentType: "application/json",
            dataType: "json"
        };

        let result = await MakeAjax(options);

        if (result != null && result.data.Valor != null) {
            
            return result.data.Valor;
        }

        return 0;
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
        throw error; // Lanzar el error para que pueda ser capturado externamente
    }
}

async function configurarDataTable() {
    $('#grdProductosVenta').DataTable({

        "ajax": {
            "url": "/Ventas/ListarProductosVenta/0",
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        "columns": [



            { "data": "Producto" },
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



            $("#estadocliente").css("color", "white");
            $("#estadocliente").text("");
            $("#nombrecliente").text("");
            $("#direccioncliente").text("");
            $("#telefonocliente").text("");
            $("#idcliente").text("");


            const userSession = JSON.parse(sessionStorage.getItem('usuario'));

            if (JSON.parse(sessionStorage.getItem('usuario')).Id != result.data.IdVendedor && userSession.IdRol != 1) {
                alert("El cliente pertenece a otro vendedor")
            } else if (result.data.Estado == "Inhabilitado") {
                $("#estadocliente").css("color", "red");
                alert("El cliente esta inhabilitado");
            } else if (result.data.Estado == "Regular") {
                $("#estadocliente").css("color", "yellow");
                if (confirm("¿El cliente esta en estado Regular, desea continuar igual?")) {
                    $("#idcliente").text(result.data.Id)
                    $("#nombrecliente").text("Nombre: " + result.data.Nombre)
                    $("#estadocliente").text("Estado: " + result.data.Estado)
                    $("#direccioncliente").text("Direccion: " + result.data.Direccion)
                    $("#telefonocliente").text("Tel: " + result.data.Telefono)
                }
            } else {

                $("#idcliente").text(result.data.Id)
                $("#nombrecliente").text("Nombre: " + result.data.Nombre)
                $("#estadocliente").text("Estado: " + result.data.Estado)
                $("#direccioncliente").text("Direccion: " + result.data.Direccion)
                $("#telefonocliente").text("Tel: " + result.data.Telefono)
            }

        } else {
            if (confirm("No se ha encontrado ningun cliente tuyo con ese Dni, ¿deseas ir a agregar uno?")) {


                abrirmodalclientes();
            } else {
                $("#estadocliente").css("color", "white");
                $("#estadocliente").text("");
                $("#nombrecliente").text("");
                $("#direccioncliente").text("");
                $("#telefonocliente").text("");
                $("#idcliente").text("");

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
        var url = "/Stock/BuscarStock";
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

        if (result.data.length == 0) {
            $("#lblProducto").attr("hidden", "hidden");
            $("#Productos").attr("hidden", "hidden");
            $("#lblProductoCantidad").attr("hidden", "hidden");
            $("#Cantidad").attr("hidden", "hidden");
            $("#lblpreciototal").attr("hidden", "hidden");
            $("#precioTotal").attr("hidden", "hidden");
            $("#lblstockTotal").attr("hidden", "hidden");
            $("#stockTotal").attr("hidden", "hidden");
            $("#btnRegistrarModificar").attr("hidden", "hidden");
            $("#d-productos").show(500);
        } else {
            $("#lblProducto").removeAttr('hidden');
            $("#Productos").removeAttr('hidden');
            $("#lblProductoCantidad").removeAttr('hidden');
            $("#Cantidad").removeAttr('hidden');
            $("#lblpreciototal").removeAttr('hidden');
            $("#precioTotal").removeAttr('hidden');
            $("#lblstockTotal").removeAttr('hidden');
            $("#stockTotal").removeAttr('hidden');
            $("#btnRegistrarModificar").removeAttr('hidden');
            $("#d-productos").hide(999);
        }

        if (result != null) {

            selectProductos = document.getElementById("Productos");

            $('#Productos option').remove();
            for (var i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].IdProducto;
                option.text = result.data[i].Producto;
                precioVenta[i] = result.data[i].PrecioVenta;
                stockTotal[i] = result.data[i].Cantidad;
                selectProductos.appendChild(option);
            }

            selectProductosPrecio = document.getElementById("ProductosPrecio");

            $("#precioTotal").text(precioVenta[0]);
            $("#stockTotal").text(stockTotal[0]);

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

    var table = $('#grdProductosVenta').DataTable();

    var persons = [
        {
            IdProducto: $("#Productos").find("option:selected").val(),
            Producto: $("#Productos").find("option:selected").text(),
            Cantidad: Number($("#Cantidad").val()),
            PrecioTotal: Number($("#precioTotal").text()),
        }
    ];

    table.rows().eq(0).each(function (index) {
        var row = table.row(index);

        let producto = row.data();

        if (producto.IdProducto == $("#Productos").find("option:selected").val()) {


            let sumatotal = 0;


            if (persons[0].Cantidad > $("#stockTotal").text()) {

                stock = false;
                return false;
            }

            producto.Cantidad = persons[0].Cantidad
            producto.PrecioTotal = persons[0].PrecioTotal
            $('#grdProductosVenta').dataTable().fnUpdate(producto, index, undefined, false);

            actualizarPrecio();
        }
    });


}

function añadirProducto() {



    let actualizo = false;
    let stock = true;
    var table = $('#grdProductosVenta').DataTable();

    var persons = [
        {
            IdProducto: $("#Productos").find("option:selected").val(),
            Producto: $("#Productos").find("option:selected").text(),
            Cantidad: Number($("#Cantidad").val()),
            /*PrecioUnitario: Number($("#precioTotal").text()) / Number($("#Cantidad").val()),*/
            PrecioTotal: Number($("#precioTotal").text()),

        }
    ];

    table.rows().eq(0).each(function (index) {
        var row = table.row(index);


        let producto = row.data();


        if (producto.IdProducto == $("#Productos").find("option:selected").val()) {


            let sumatotal = 0;

            sumatotal = producto.Cantidad + persons[0].Cantidad;

            if (sumatotal > $("#stockTotal").text()) {
                $("#d-stock").show(500);
                $("#lblpreciototal").hide(600);
                $("#precioTotal").hide(700);
                $("#lblstockTotal").hide(800);
                $("#stockTotal").hide(900);
                $("#d-stock").text("Stock insuficiente");
                stock = false;
                return false;
            } else {
                $("#lblpreciototal").show(500);
                $("#precioTotal").show(600);
                $("#lblstockTotal").show(700);
                $("#stockTotal").show(800);
                $("#d-stock").hide(900);
            }

            producto.Cantidad += persons[0].Cantidad
            producto.PrecioUnitario += persons[0].PrecioUnitario
            producto.PrecioTotal += persons[0].PrecioTotal
            
            alert("Producto agregado con exito.");


            $('#grdProductosVenta').dataTable().fnUpdate(producto, index, undefined, false);
            actualizo = true;

        }
    });

    if (!actualizo && stock == true) {

        if (persons[0].Cantidad > $("#stockTotal").text()) {

            stock = false;
            return false;
        }

        table.rows.add(persons).draw();
        alert("Producto agregado con exito.");
    }



    actualizarPrecio();

}


const editarProducto = async id => {

    let actualizo = false;
    let stock = true;
    var table = $('#grdProductosVenta').DataTable();

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

            var url = "/Stock/BuscarStockUser";

            let options = {
                type: "POST",
                url: url,
                async: true,
                data: value,
                contentType: "application/json",
                dataType: "json"
            };

            let result = await MakeAjax(options);

            $("#stockTotal").text(result.data.Cantidad);


            $("#IdProducto").value = producto.IdProducto;



            $("#Productos").value = producto.Producto;
            $("#Productos").val(producto.IdProducto);


            $("#precioTotal").text(producto.PrecioTotal);

            $("#Cantidad").val(producto.Cantidad);

            $("#btnRegistrarModificar").text("Modificar");

            $("#Productos").prop('disabled', true);

            $("#lblpreciototal").show(500);
            $("#precioTotal").show(600);
            $("#lblstockTotal").show(700);
            $("#stockTotal").show(800);
            $("#d-stock").hide(900);



        }
    });

}

const eliminarProducto = async id => {

    let actualizo = false;
    let stock = true;
    var table = $('#grdProductosVenta').DataTable();

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
    var table = $('#grdProductosVenta').DataTable();
    table.rows().eq(0).each(function (index) {
        var row = table.row(index);


        let producto = row.data();

        total += producto.PrecioTotal

    });

    $("#precioventa").text(formatNumber(total));

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

    if (stockTotal[x] < cantidad.value || Number(cantidad.value) > Number($("#stockTotal").text())) {
        $("#d-stock").show(500);
        $("#lblpreciototal").hide(600);
        $("#precioTotal").hide(700);
        $("#lblstockTotal").hide(800);
        $("#stockTotal").hide(900);
        $("#d-stock").text("Stock insuficiente");

    } else {
        $("#lblpreciototal").show(500);
        $("#precioTotal").show(600);
        $("#lblstockTotal").show(700);
        $("#stockTotal").show(800);
        $("#d-stock").hide(900);
    }

    $("#precioTotal").text(precioVenta[y[x].index] * cantidad.value);
}






Productos.addEventListener("change", (e) => {
    var x = document.getElementById("Productos").selectedIndex;
    var y = document.getElementById("Productos").options;
    $("#precioTotal").text(precioVenta[y[x].index] * cantidad.value);
    $("#stockTotal").text(stockTotal[x]);
    $("#Cantidad").val("1");
    comprobarCantidad();
});


async function registrarVenta() {

    let now = new Date().getTime();

    if (now - localStorage.getItem("lastSaleTime") >= 60000) { 
         
        let numeroTelefono = $("#telefonocliente").text();
         
        numeroTelefono = numeroTelefono.replace("Tel: ", "");

        if (await validarVenta()) {

            var table = $("#grdProductosVenta").DataTable()
            table.rows().eq(0).each(function (index) {
                var row = table.row(index);

                let producto = row.data();

                productos.push(producto);
            });

            if (productos.length == 0) {
                alert("Debes agregar por lo menos un producto.");
                return false;
            }

            if (confirm(`El numero de telefono es ${numeroTelefono}, ¿desea modificarlo?`)) {
                abrirmodalTelefono();
            } else {
                registrarVentaAjax();
            }

            // Update the last action time
   
            localStorage.setItem("lastSaleTime", now);

        }
    } else {
        alert("Tienes que esperar al menos un minuto antes de volver a realizar esta acción.");
    }

}

async function validarVenta() {

    if ($('#nombrecliente').text() == "") {
        alert("Debes elegir un cliente.");
        return false;
    }
    if ($('#ValorCuota').val() == "") {
        alert("Debes elegir un valor cuota.");
        return false;
    }

    if ($('#estadocliente').text() == "Estado: Regular") {
       
 
        var result = await buscarLimiteVenta("ClientesRegulares_Venta");


        var precioVenta = retornarEntero($('#precioventa').text());

        if (precioVenta > result) {
            alert("El limite maximo de venta para un cliente regular es de $" + result + " pesos.");
            return false;
        }
       

    }
    return true;
}

async function registrarVentaAjax() {
    try {
        var url = "/Ventas/NuevaVenta";

        var data = JSON.parse(sessionStorage.getItem('usuario'));






        actualizarPrecio(); //ACTUALIZAMOS LOS PRECIOS POR UN TEMA DE SEGURIDAD

        let value = JSON.stringify({
            idVendedor: data.Id,
            idCliente: document.getElementById("idcliente").innerText,
            Fecha: moment().format('DD/MM/YYYY'),
            Entrega: retornarEntero(document.getElementById("Entrega").value),
            Restante: retornarEntero($("#montorestante").text()),
            FechaCobro: moment(document.getElementById("FechaCobro").value).format('DD/MM/YYYY'),
            FechaLimite: moment(document.getElementById("FechaLimite").value).format('DD/MM/YYYY'),
            Observacion: document.getElementById("Observacion").value,
            ValorCuota: retornarEntero(document.getElementById("ValorCuota").value),
            ProductosVenta: productos
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

            alert('Venta agregada correctamente.');
            document.location.href = "../Index/";
        } else if (result.Status == 1) {

            alert('Uno de tus productos no tiene el stock suficiente.');

        } else {
            alert('Ha ocurrido un error en la venta. Consulte con un Administrador');
        }

    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


async function AccionBtnTelefono() {
    try {
        var url = "/Clientes/EditarTelefono";

        let value = JSON.stringify({
            Id: document.getElementById("mIdCliente").value,
            Telefono: document.getElementById("mTelefono").value,
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

            $("#telefonoModal").modal("hide");
            registrarVentaAjax();

        } else {
            $('.datos-error').text('Ha ocurrido un error en los datos.')
            $('.datos-error').removeClass('d-none')
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

async function AccionBtnCliente() {
    await registrarCliente();
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

                document.getElementById("Dni").value = document.getElementById("DniCliente").value;
                $("#clienteModal").modal("hide");
                cargarCliente()

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

function abrirmodalTelefono() {
    $("#telefonoModal").modal("show");

    document.getElementById("mIdCliente").value = document.getElementById("idcliente").innerText;

    let numeroTelefono = $("#telefonocliente").text();

    numeroTelefono = numeroTelefono.replace("Tel: ", "");

    document.getElementById("mTelefono").value = numeroTelefono;
    document.getElementById("btnRegistrarModificar").textContent = "Modificar";
    document.getElementById("clienteModalLabel").textContent = "Modificar nuevo cliente";

};


function abrirmodalclientes() {
    $("#clienteModal").modal("show");

    cargarUsuariosyEstados();
    document.getElementById("IdCliente").value = ""
    document.getElementById("Nombre").value = ""
    document.getElementById("Apellido").value = ""
    document.getElementById("DniCliente").value = document.getElementById("Dni").value
    document.getElementById("Direccion").value = ""
    document.getElementById("Telefono").value = ""
    document.getElementById("Usuarios").value = ""
    document.getElementById("Estados").value = ""
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

function retornarEntero(number) {

    // Elimina los decimales y la coma
    const valorSinDecimales = number.replace(/,00/g, '');

    // Elimina el punto y el signo de dólar
    const valorLimpio = valorSinDecimales.replace(/[.$]/g, '');

    // Convierte la cadena en un número entero
    const valorEntero = parseInt(valorLimpio, 10);
    return valorEntero;
}




const valorCuota = document.querySelector("#ValorCuota");

valorCuota.addEventListener("input", (e) => {

    const nuevovalorEntrega = retornarEntero(valorCuota.value);
    if (!isNaN(nuevovalorEntrega)) {
        valorCuota.value = formatNumber(nuevovalorEntrega);
    } else {
        valorCuota.value = formatNumber(0);
    }
});


const entrega = document.querySelector("#Entrega");
entrega.addEventListener("change", (e) => {

    if (retornarEntero($("#precioventa").text()) > 0)
        actualizarPrecio();

    const valorEntrega = retornarEntero(entrega.value);
    if (!isNaN(valorEntrega)) {
        entrega.value = formatNumber(valorEntrega);
    } else {
        entrega.value = formatNumber(0);
    }

    $("#lblentrega").text(formatNumber(retornarEntero(entrega.value)));

});
