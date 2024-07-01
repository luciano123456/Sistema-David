const precioVenta = [];
const productos = [];
let userSession;
let idUserStock = 0;

$(document).ready(function () {
    userSession = JSON.parse(sessionStorage.getItem('usuario'));


    
    if (userSession.IdRol == 1) {
        idUserStock = localStorage.getItem("idUserStock");
    } else {
        idUserStock = userSession.Id;
    }



    configurarDataTable();

    cargarNombre();



    if (userSession.IdRol == 1) { //Administrador
        $("#btnUsuarios").css("background", "#2E4053");
        document.getElementById("divStock").removeAttribute("hidden");
        document.getElementById("btnAgregar").removeAttribute("hidden");
    } else {
        $("#btnStock").css("background", "#2E4053");
    }



});

function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) {
        return "$0"; // Devuelve un valor predeterminado si 'number' no es válido
    }

    const parts = number.toFixed(0).toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return "$" + parts.join(",");
}

async function configurarDataTable() {

    const dataTableOptions = {
        "ajax": {
            "url": "/Stock/BuscarStock/" + idUserStock,
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },

        "columns": [
            { "data": "Producto" },
            { "data": "Cantidad" },
            { "data": "PrecioVenta" },
            { "data": "Total" },
            {
                "data": "Id", "render": function (data) {
                    return "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarStock(" + data + ")' title='Editar'><i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i></button>" +
                        "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarStock(" + data + ")' title='Eliminar'><i class='fa fa-trash-o fa-lg text-white' aria-hidden='true'></i></button>"
                },
                "orderable": true,
                "searchable": true,
                "width": "100px"
            }
        ],

        "columnDefs": [
            {
                "render": function (data, type, row) {
                    return formatNumber(data); // Formatear número en la columna
                },
                "targets": [2, 3] // Columnas PrecioVenta y Total
            },
            {
                "targets": [3, 4], // Columnas de acciones
                "visible": (userSession.IdRol !== 2) // Ocultar si el rol no es 2
            }
        ],
    };

    $('#grdStock').DataTable(dataTableOptions);

    $('#grdStock').DataTable().on("draw", function () {
        actualizarPrecio();
    });
}



const editarStock = async id => {

    try {
        var url = "/Stock/EditarInfo";

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

            await cargarProductos();

            $("#nuevoProductoModal").modal("show");
            $("#btnRegistrarModificar").text("Editar");


            $("#IdStock").text(id);
            $("#IdStock").value = id;



            $("#Cantidad").val(result.data.Cantidad);

            $("#Productos").val(result.data.IdProducto);

            $("#Productos").prop('disabled', true);

            $("#precioTotal").text(formatNumber(result.data.Total));

        } else {
            alert("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        alert("Ha ocurrido un error en los datos");
    }
}

function abrirmodal() {
    $("#nuevoProductoModal").modal("show");
    $("#btnRegistrarModificar").text("Añadir");
    $("#Productos").prop('disabled', false);
    $("#Cantidad").val("1");
    $("#IdStock").text("0");
    $("#IdStock").value = 0;
    cargarProductos();
}

async function cargarProductos() {
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
                precioVenta[i] = result.data[i].PrecioVenta;
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


const Productos = document.querySelector("#Productos");
Productos.addEventListener("change", (e) => {
    var x = document.getElementById("Productos").selectedIndex;
    var y = document.getElementById("Productos").options;
    $("#precioTotal").text(formatNumber(precioVenta[y[x].index] * cantidad.value));

});


const cantidad = document.querySelector("#Cantidad");

cantidad.addEventListener("keyup", (e) => {
    var x = document.getElementById("Productos").selectedIndex;
    var y = document.getElementById("Productos").options;
    $("#precioTotal").text(formatNumber(precioVenta[y[x].index] * cantidad.value));

});


async function agregarStock() {
    if ($("#IdStock").text() > 0) {
        modificarStockuser();
    } else {
        agregarStockUser();
    }

}

async function modificarStockuser() {
    try {
        var url = "/Stock/Editar";

        let value = JSON.stringify({
            Cantidad: document.getElementById("Cantidad").value,
            Id: document.getElementById("IdStock").innerText
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
            alert('Stock modificado correctamente.');
            $('.datos-error').removeClass('d-none');
            document.location.href = "../../Stock/Index/";
        } else {
            $('.datos-error').text('Ha ocurrido un error en los datos.')
            $('.datos-error').removeClass('d-none')
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


async function agregarStockUser() {

    try {
        var url = "/Stock/Agregar";

        let value = JSON.stringify({
            IdProducto: $("#Productos").find("option:selected").val(),
            Cantidad: Number($("#Cantidad").val()),
            IdUsuario: localStorage.getItem("idUserStock"),

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

        if (result.Status == 1) {
            alert('Stock agregado correctamente.');
            $('.datos-error').removeClass('d-none');
            document.location.href = "../../Stock/Index/";

        } else if (result.Status == 2) {

            $('.datos-error').text('El usuario ya tiene ese producto.')
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

const eliminarStock = async id => {

    try {
        if (confirm("¿Está seguro que desea eliminar este registro?")) {
            var url = "/Stock/Eliminar";

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
                alert('Stock eliminado correctamente.');
                $('.datos-error').removeClass('d-none');
                document.location.href = "../../Stock/Index/";
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

const modalWhatssap = async id => {
    $("#modalWhatssap").modal('show');
    $("#mensajewsp").val("");
    $("#idClienteWhatssap").val(id);
}


function actualizarPrecio() {

    let total = 0;
    var table = $('#grdStock').DataTable();
    table.rows().eq(0).each(function (index) {
        var row = table.row(index);


        let producto = row.data();

        total += producto.Total

    });

    $("#precioventa").text(formatNumber(total));


}


async function cargarNombre() {
    try {
        var url = "/Usuarios/BuscarUsuario";

        let value = JSON.stringify({
            Id: idUserStock
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

            let nombrecompleto = result.Nombre + " " + result.Apellido;
            $("#lblnombreusuario").text(nombrecompleto);

        } else {
            alert("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        alert("Ha ocurrido un error en los datos");
    }
}



