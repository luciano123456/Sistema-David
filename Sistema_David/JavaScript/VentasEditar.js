let userSession;
$(document).ready(function () {
    InformacionVenta();
    configurarDataTable();
    $("#btnVentas").css("background", "#2E4053")

    userSession = JSON.parse(sessionStorage.getItem('usuario'));

    if (userSession.IdRol == 1) { //ROL ADMINISTRADOR
        $("#lblfechacobro").removeAttr("hidden");
        $("#FechaCobro").removeAttr("hidden");
    }

})


async function InformacionVenta() {
    try {
        var url = "/Ventas/EditarVenta";

        var data = JSON.parse(sessionStorage.getItem('usuario'));

   
        let value =  JSON.stringify({
            Id: localStorage.getItem("idEditarVenta")
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

        document.getElementById("idcliente").innerText = result.data.idCliente
        document.getElementById("idvendedor").innerText = result.data.idVendedor
        document.getElementById("Interes").innerText = formatNumber(result.data.Interes)
        document.getElementById("montorestanteinicial").innerText = result.data.Restante
        $("#Dni").val(result.data.DniCliente)
        $("#nombrecliente").text("Nombre: " + result.data.Cliente)
        $("#estadocliente").text("Estado: " + result.data.EstadoCliente)
        $("#direccioncliente").text("Direccion: " + result.data.DireccionCliente)
        $("#telefonocliente").text("Tel: " + result.data.TelefonoCliente)

        document.getElementById("Entrega").value = formatNumber(result.data.Entrega)
        document.getElementById("ValorCuota").value = formatNumber(result.data.ValorCuota)
        Number($("#montorestante").text(formatNumber(result.data.Restante)))
        document.getElementById("FechaCobro").value = moment(result.data.FechaCobro).format('yyyy-MM-DD')
        document.getElementById("FechaLimite").value = moment(result.data.FechaLimite).format('yyyy-MM-DD')
        document.getElementById("Observacion").value = result.data.Observacion



        

    } catch (error) {
        alert("Ha ocurrido un error en la venta")
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
            if (confirm("No se ha encontrado ningun cliente con ese Dni, ¿deseas ir a agregar uno?")) {
                document.location.href = "../../Clientes/Index/";
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
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

function cancelar() {
    document.location.href = "../Index/";
}


async function configurarDataTable() {
    const table = $('#grdProductosVenta').DataTable({
        "ajax": {
            "url": "/Ventas/ListarProductosVenta/" + localStorage.getItem("idEditarVenta"),
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        "columns": [
            { "data": "Producto" },
            { "data": "Cantidad" },
            { "data": "PrecioTotal" }
        ],
        "columnDefs": [
            {
                "render": function (data, type, row) {
                    return formatNumber(data); // Formatear número en la columna
                },
                "targets": [2] // Columnas Venta, Cobro, Capital Final
            },
            
        ],
    });
    


    table.on('draw.dt', function () {
       
        let total = 0;
        var table = $('#grdProductosVenta').DataTable();
        table.rows().eq(0).each(function (index) {
            var row = table.row(index);


            let producto = row.data();

            total += producto.PrecioTotal

        });

        $("#precioventa").text(formatNumber(total));
    });
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

async function modificarVenta() {
    try {
        var url = "/Ventas/EditarInfoVenta";

        //actualizarPrecio();

    
       
        if (validarVenta()) {
            let value = JSON.stringify({
                Id: localStorage .getItem("idEditarVenta"),
                idVendedor: document.getElementById("idvendedor").innerText,
                idCliente: document.getElementById("idcliente").innerText,
                Fecha: moment().format('DD/MM/YYYY'),
                Entrega: retornarEntero(document.getElementById("Entrega").value),
                Restante: retornarEntero($("#montorestante").text()),
                FechaCobro: moment(document.getElementById("FechaCobro").value).format('DD/MM/YYYY'),
                FechaLimite: moment(document.getElementById("FechaLimite").value).format('DD/MM/YYYY'),
                ValorCuota: retornarEntero(document.getElementById("ValorCuota").value),
                Observacion: document.getElementById("Observacion").value

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

            alert('Venta modificada correctamente.');
            document.location.href = "../Index/";
        } else {
            alert('Ha ocurrido un error en la venta. Consulte con un Administrador');
            }
        }

    } catch (error) {
        alert('Ha ocurrido un error en los datos. Vuelva a intentarlo');
    }
}

function validarVenta() {
    if ($('#nombrecliente').text() == "") {
        alert("Debes elegir un cliente.");
        return false;
    }
    if ($('#ValorCuota').val() == "") {
        alert("Debes elegir un valor cuota.");
        return false;
    }

    return true;
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

    total -= retornarEntero(document.querySelector("#montorestante").innerText);

    if (total < 0) {
        $("#montorestante").css("color", "red");
    } else {
        $("#montorestante").css("color", "white");
    }

    $("#montorestante").text(formatNumber(total));

}

const entrega = document.querySelector("#Entrega");
const precioVenta = document.querySelector("#precioventa");

entrega.addEventListener("input", (e) => {
    if (retornarEntero(precioVenta.textContent) > 0) {
        actualizarPrecio();
    }

    const valorEntrega = retornarEntero(entrega.value);
    if (!isNaN(valorEntrega)) {
        entrega.value = formatNumber(valorEntrega);
    } else {
        entrega.value = formatNumber(0);
    }
});


const valorCuota = document.querySelector("#ValorCuota");

valorCuota.addEventListener("input", (e) => {

    const nuevovalorEntrega = retornarEntero(valorCuota.value);
    if (!isNaN(nuevovalorEntrega)) {
        valorCuota.value = formatNumber(nuevovalorEntrega);
    } else {
        valorCuota.value = formatNumber(0);
    }
});

