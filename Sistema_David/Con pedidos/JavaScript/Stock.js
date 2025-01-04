const precioVenta = [];
const productos = [];
let userSession;
let idUserStock = 0;
let productoNombres = {};

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
                "visible": (userSession.IdRol == 1) // Ocultar si el rol no es 1
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

            await cargarProductosAll();

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

function obtenerIdListSeleccionado() {
    // Obtén el valor seleccionado en el input
    const selectedValue = Productos.value;

    // Encuentra la opción correspondiente en el datalist
    let selectedOption = null;
    for (let i = 0; i < dataList.options.length; i++) {
        if (dataList.options[i].value === selectedValue) {
            selectedOption = dataList.options[i];
            break;
        }
    }

    // Si se encuentra una opción correspondiente en el datalist
    if (selectedOption) {
        // Puedes acceder al valor asociado con la opción seleccionada
        const optionDataValue = selectedOption.getAttribute('data-value');

        return optionDataValue
    }
}

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
        var url = "/StockPendiente/Agregar";

        let value = JSON.stringify({
            //IdProducto: obtenerIdListSeleccionado(),
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
            alert('Se le ha agregado en sus stocks pendientes al usuario correctamente.');
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




const loadDatalist = (control, data, fieldValue, fieldText, showDescription = false) => {
    // Limpia las opciones del control
    while (control.options.length > 0) {
        control.options[0].remove();
    }

    if (data && data.length > 0) {
        data.forEach(element => {
            // Crea una nueva opción
            const option = document.createElement('option');

            // Asigna el valor del atributo value
            option.value = element[fieldText]; // `fieldText` define el texto visible en la opción

            // Configura el atributo data-value con el valor de `fieldValue`
            option.setAttribute('data-value', element[fieldValue]);

            // Si `showDescription` es verdadero, muestra el texto visible como texto de la opción
            if (showDescription) {
                option.textContent = element[fieldText];
            }

            // Añade la opción al datalist
            control.appendChild(option);
        });
    }

    // Controla la disponibilidad del input asociado
    const input = document.querySelector(`input[list="${control.id}"]`);
    if (control.options.length > 0) {
        input.removeAttribute('disabled');
    } else {
        input.setAttribute('disabled', true);
        input.value = '';
    }
};