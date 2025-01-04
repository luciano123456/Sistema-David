const precioVenta = [];
const stockTotal = [];
const productos = [];
let lastActionTime = 0;

$(document).ready(async function () {

    userSession = JSON.parse(sessionStorage.getItem('usuario'));

    $('.datos-error').text('')


    configurarDataTable();
    $("#btnVentas").css("background", "#2E4053");

    var diasVencimiento = await buscarDiasLimite();

    var fechaCobro = moment().add(7, 'days').format('YYYY-MM-DD');
    var fechaLimite = moment().add(diasVencimiento, 'days').format('YYYY-MM-DD');



 
    document.getElementById("FechaCobro").value = fechaCobro;
    document.getElementById("FechaLimite").value = fechaLimite;

   

    if (userSession.IdRol == 1) {
        document.getElementById("FechaLimite").removeAttribute("disabled");
    }


    if (localStorage.getItem('RegistrarClienteVenta') == 1) {
        document.getElementById("Dni").value = localStorage.getItem('DNIClienteVenta')
        localStorage.removeItem('RegistrarClienteVenta');
        localStorage.removeItem('DNIClienteVenta');
        cargarCliente();
    }

     

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


            {
                title: "Imagen",
                data: "Imagen",
                render: function (data) {
                    // La imagen ahora tiene un evento onclick que abre el modal
                    return '<img src="' + data + '" style="width: 50px; height: 50px; object-fit: cover; cursor: pointer;" onclick="openModal(\'' + data + '\')" />';
                }
            },

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
            Dni: document.getElementById("Dni").value.trim()
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
                alert("El cliente pertenece a otro vendedor, la venta se pondra en estado de aprobacion")
            }

            if (result.data.Estado == "Inhabilitado") {
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


                abrirNuevoCliente();
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

                if (i == 0) {
                    await cargarImagenProducto(result.data[i].IdProducto);
                }
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

async function añadirProducto() {
    let actualizo = false;
    let stock = true;
    var table = $('#grdProductosVenta').DataTable();

    var persons = [
        {
            IdProducto: $("#Productos").find("option:selected").val(),
            Producto: $("#Productos").find("option:selected").text(),
            Cantidad: Number($("#Cantidad").val()),
            PrecioTotal: Number($("#precioTotal").text()),
            Imagen: $("#productoImagen").attr("src") // Guardamos la URL de la imagen
        }
    ];

    table.rows().eq(0).each(function (index) {
        var row = table.row(index);
        let producto = row.data();

        if (producto.IdProducto == $("#Productos").find("option:selected").val()) {
            let sumatotal = producto.Cantidad + persons[0].Cantidad;

            if (sumatotal > $("#stockTotal").text()) {
                $("#d-stock").show(500).text("Stock insuficiente");
                $("#lblpreciototal, #precioTotal, #lblstockTotal, #stockTotal").hide(600);
                stock = false;
                return false;
            } else {
                $("#lblpreciototal, #precioTotal, #lblstockTotal, #stockTotal").show(500);
                $("#d-stock").hide(500);
            }

            producto.Cantidad += persons[0].Cantidad;
            producto.PrecioTotal += persons[0].PrecioTotal;

            alert("Producto agregado con éxito.");

            // Actualiza la fila
            $('#grdProductosVenta').dataTable().fnUpdate(producto, index, undefined, false);
            actualizo = true;
        }
    });

    if (!actualizo && stock) {
        if (persons[0].Cantidad > $("#stockTotal").text()) {
            stock = false;
            return false;
        }

        // Añade la nueva fila con el producto y su imagen
        table.rows.add(persons).draw();
        alert("Producto agregado con éxito.");
    }

    await actualizarPrecio();
   
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

    var entrega = document.querySelector("#Entrega");

  
    total -= retornarEntero(entrega.value);

    if (total <= 0) {
        $("#montorestante").text(formatNumber(0));
    } else {
        $("#montorestante").text(formatNumber(total));
    }

    
    verificarRestante();

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






document.getElementById("Productos").addEventListener("change", async (e) => {
    var x = document.getElementById("Productos").selectedIndex; // Obtiene el índice del producto seleccionado
    var y = document.getElementById("Productos").options; // Obtiene todas las opciones del dropdown

    // Asegúrate de que el índice sea válido y que haya productos seleccionados
    if (x >= 0 && y[x]) {
        // Calcula el precio total basado en el precio de venta y la cantidad
        var precioVentaSeleccionado = precioVenta[y[x].index];
        var cantidadSeleccionada = document.getElementById("Cantidad").value; // Obtén la cantidad del input

        $("#precioTotal").text(precioVentaSeleccionado * cantidadSeleccionada); // Actualiza el precio total
        $("#stockTotal").text(stockTotal[x]); // Actualiza el stock disponible

        // Reinicia la cantidad a 1 cada vez que se cambia el producto
        $("#Cantidad").val("1");

        // Llama a la función para comprobar la cantidad
        comprobarCantidad();

        // Ahora llamamos a la función asíncrona para cargar la imagen del producto seleccionado
        await cargarImagenProducto(y[x].value); // Pasa el valor del producto seleccionado a la función asíncrona
    }
});



async function registrarVenta() {

    let now = new Date().getTime();


    if (now - localStorage.getItem("lastSaleTime") >= 6) { 
         
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

    const Turno = document.querySelector("#TurnoCobro").value;
    const FranjaHoraria = document.querySelector("#FranjaHorariaCobro").value;
    const restante = document.querySelector("#montorestante").innerText;
    const fechaCobro = document.getElementById("FechaCobro").value; // Obtiene la fecha de cobro

    if ($('#nombrecliente').text() == "") {
        alert("Debes elegir un cliente.");
        return false;
    }

    if (retornarEntero(restante) > 0) {
        if (moment(fechaCobro).isBefore(moment(), 'day')) {
            alert("La fecha de cobro no puede ser menor a la fecha actual.");
            return false;
        }
        if ($('#ValorCuota').val() == "") {
            alert("Debes elegir un valor cuota.");
            return false;
        }

        if (Turno == "") {
            alert("Debes poner un Turno");
            return false;
        }

        if (FranjaHoraria == "") {
            alert("Debes poner una Franja Horaria");
            return false;
        }
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

        let restante = retornarEntero($("#montorestante").text());

        let value = JSON.stringify({
            idVendedor: data.Id,
            idCliente: document.getElementById("idcliente").innerText,
            Fecha: moment().format('DD/MM/YYYY'),
            Entrega: retornarEntero(document.getElementById("Entrega").value),
            Restante: restante,
            FechaCobro: moment(document.getElementById("FechaCobro").value).format('DD/MM/YYYY'),
            FechaLimite: moment(document.getElementById("FechaLimite").value).format('DD/MM/YYYY'),
            Observacion: document.getElementById("Observacion").value,
            ValorCuota: restante <= 0 ? 0 : retornarEntero(document.getElementById("ValorCuota").value),
            FranjaHoraria: restante <= 0 ? null : document.getElementById("FranjaHorariaCobro").value,
            Turno: restante <= 0 ? null : document.querySelector('#TurnoCobro option:checked').textContent,
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


function abrirNuevoCliente() {

    localStorage.removeItem("EdicionCliente");
    localStorage.setItem("RegistrarClienteVenta", 1);
    localStorage.setItem("DNIClienteVenta", document.getElementById("Dni").value);
    document.location.href = "../../Clientes/Editar/";

};

function nuevoCliente() {
    
}

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

    const restante = document.querySelector("#montorestante");
    const total = document.querySelector("#precioventa");

    if (retornarEntero(entrega.value) > retornarEntero(total.innerText)) {
        entrega.value = formatNumber(retornarEntero(total.innerText));
    }

    if (retornarEntero($("#precioventa").text()) > 0)
        actualizarPrecio();

    const valorEntrega = retornarEntero(entrega.value);
    if (!isNaN(valorEntrega)) {
        entrega.value = formatNumber(valorEntrega);
    } else {
        entrega.value = formatNumber(0);
    }

    

    verificarRestante();

    $("#lblentrega").text(formatNumber(retornarEntero(entrega.value)));

});

async function verificarRestante() {
    const restante = document.querySelector("#montorestante");
    let entrega = document.querySelector("#Entrega");
    let lblentrega = document.querySelector("#lblentrega");
    const total = document.querySelector("#precioventa");   

    if (retornarEntero(entrega.value) >= retornarEntero(total.innerText)) {
        entrega.value = formatNumber(retornarEntero(total.innerText));
        lblentrega.innerText = formatNumber(retornarEntero(total.innerText));
    }

    if (retornarEntero(restante.innerText) == 0 && retornarEntero(total.innerText) > 0) {
        $("#lblfechacobro").attr("hidden", "hidden")
        $("#FechaCobro").attr("hidden", "hidden")
        $("#lblfechalimite").attr("hidden", "hidden")
        $("#FechaLimite").attr("hidden", "hidden")
        $("#lblvalorcuota").attr("hidden", "hidden")
        $("#ValorCuota").attr("hidden", "hidden")
        $("#lblturno").attr("hidden", "hidden")
        $("#TurnoCobro").attr("hidden", "hidden")
        $("#lblfranjahoraria").attr("hidden", "hidden")
        $("#FranjaHorariaCobro").attr("hidden", "hidden")
    } else {
        $("#lblfechacobro").removeAttr("hidden", "hidden")
        $("#FechaCobro").removeAttr("hidden", "hidden")
        $("#lblfechalimite").removeAttr("hidden", "hidden")
        $("#FechaLimite").removeAttr("hidden", "hidden")
        $("#lblvalorcuota").removeAttr("hidden", "hidden")
        $("#ValorCuota").removeAttr("hidden", "hidden")
        $("#lblturno").removeAttr("hidden", "hidden")
        $("#TurnoCobro").removeAttr("hidden", "hidden")
        $("#lblfranjahoraria").removeAttr("hidden", "hidden")
        $("#FranjaHorariaCobro").removeAttr("hidden", "hidden")
    }
}

const turnoCobroSelect = document.getElementById('TurnoCobro');
const franjaHorariaSelect = document.getElementById('FranjaHorariaCobro');

turnoCobroSelect.addEventListener('change', function () {
    let franjas;
    if (this.value === 'mañana') {
        franjas = generarFranjasHorarias(8, 15); // De 8:00 a 15:00
    } else if (this.value === 'tarde') {
        franjas = generarFranjasHorarias(15, 21); // De 15:00 a 21:00
    } else {
        franjas = []; // Si no se selecciona turno, no hay franjas
    }
    llenarFranjasHorarias(franjas);
});

// Función para generar franjas horarias
function generarFranjasHorarias(startHour, endHour) {
    const franjas = [];
    for (let i = startHour; i < endHour; i++) {
        let start = i;
        let end = i + 1;
        if (start < 10) start = '0' + start;
        if (end < 10) end = '0' + end;
        franjas.push(`${start}-${end}`);
    }
    return franjas;
}

// Función para llenar el select de franjas horarias
function llenarFranjasHorarias(franjas) {
    franjaHorariaSelect.innerHTML = ''; // Limpiar las opciones anteriores

    const option = document.createElement('option');
    option.value = "";
    option.textContent = "Seleccionar";
    franjaHorariaSelect.appendChild(option);

    franjas.forEach(franja => {
        const option = document.createElement('option');
        option.value = franja;
        option.textContent = franja;
        franjaHorariaSelect.appendChild(option);
    });
}

async function buscarDiasLimite() {
    var url = "/Usuarios/BuscarTipoNegocio";

    let value = JSON.stringify({
        id: userSession.IdTipoNegocio
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

        return result.data.DiasVencimiento;
    }
}

async function cargarImagenProducto(idProducto) {
    $.ajax({
        url: '/Productos/ObtenerImagen/' + idProducto, // El endpoint del servidor para obtener la imagen
        type: 'GET',
        success: function (response, status, xhr) {
            // Verificar si la respuesta es un archivo de imagen
            var contentType = xhr.getResponseHeader("Content-Type");

            if (contentType && contentType.includes("image")) {
                // Si es una imagen, establecer el src con la imagen recibida
                var imageUrl = window.URL.createObjectURL(response);
                $('#productoImagen').attr('src', imageUrl);

                // Hacer clic en la imagen para abrir el modal
             
            } else {
                // Si no es una imagen (en caso de error o respuesta no válida), mostrar la imagen predeterminada
                $('#productoImagen').attr('src', '/Imagenes/productosdefault.png');

                // Hacer clic en la imagen para abrir el modal, aunque sea la imagen predeterminada
              
            }
        },
        error: function () {
            console.log('Error al cargar la imagen del producto ' + idProducto);
            // Si ocurre un error, mostrar la imagen por defecto
            $('#productoImagen').attr('src', '/Imagenes/productosdefault.png');

            // Hacer clic en la imagen para abrir el modal
         
        },
        xhr: function () {
            var xhr = new XMLHttpRequest();
            // El siguiente paso es importante para manejar las respuestas binarios (archivos de imagen)
            xhr.responseType = 'blob';
            return xhr;
        }
    });
}


document.getElementById('productoImagen').addEventListener('click', function () {
    // Añade la clase 'expanded' a la imagen
    this.classList.add('expanded');

    // Después de la animación (3 segundos), eliminamos la clase 'expanded'
    setTimeout(() => {
        this.classList.remove('expanded');
    }, 5000); // 3 segundos
});



function openModal(imageSrc) {
    // Cambia el src de la imagen del modal
    document.getElementById('modalImage').src = imageSrc;
    // Muestra el modal
    $('#imageModal').modal('show');
}