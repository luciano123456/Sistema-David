let userSession;
$(document).ready(function () {
    configurarDataTable();
    $("#btnProductos").css("background", "#2E4053")
    userSession = JSON.parse(sessionStorage.getItem('usuario'));
});

async function configurarDataTable() {
    $('#grdProductos').DataTable({

        "ajax": {
            "url": "/Productos/Listar",
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
        "order": [[9, 'desc']],
        
        "columns": [
            {
                "data": "Imagen", "render": function (data) {
                    if (!data) {
                        return 'N/A';
                    }
                    else {
                        var img = 'data:image/png;base64,' + data;
                        return '<img src="' + img + '" height="45px" width="45px" />';
                    }
                }
            },




            { "data": "Codigo" },
            
            { "data": "Nombre" },

            { "data": "Categoria" },
            { "data": "Stock" },
            { "data": "PrecioCompra" },

            { "data": "Total" },
            { "data": "PrecioVenta" },
            { "data": "PorcVenta" },

            { "data": "Activo", "visible": false },

            {
                "data": "Id",
                "render": function (data, type, full) {
                    var activo = full.Activo === 1;
                    var color = activo ? "success" : "danger";
                    var titulo = activo ? "Desactivar" : "Activar";

                    // Invertir el estado del producto para enviarlo a la función cambiarEstadoProducto
                    var estadoInverso = full.Activo ? 0 : 1;

                    return "<button class='btn btn-sm btn-" + color + " btnacciones' type='button' onclick='cambiarEstadoProducto(" + data + ", " + estadoInverso + ")' title='" + titulo + "'><i class='fa fa-power-off fa-lg text-white' aria-hidden='true'></i></button>" +
                        "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarProducto(" + data + ")' title='Editar'><i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i></button>";
                },
                "orderable": true,
                "searchable": true
            }


        ],

        "columnDefs": [
            {
                "render": function (data, type, row) {
                    return formatNumber(data); // Formatear número en la columna
                },
                "targets": [5, 6,7,8] // Columnas Venta, Cobro, Capital Final
            }
        ],
    });
}

const fileInput = document.getElementById("Imagen");


const cambiarEstadoProducto = async (id, estado) => {

    try {
            var url = "/Productos/EditarActivo";

            let value = JSON.stringify({
                id: id,
                activo: estado
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
                $('.datos-error').removeClass('d-none');
                const table = $('#grdProductos').DataTable();
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

const eliminarProducto = async id => {

    try {
        if (confirm("¿Seguro desea eliminar de este producto?")) {
            var url = "/Productos/Eliminar";

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
                alert('Producto eliminado correctamente.');
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




const editarProducto = async id => {

    try {
        var url = "/Productos/EditarInfo";

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

            $("#productoModal").modal("show");

            document.getElementById("IdProducto").value = result.Producto.Id;
            document.getElementById("Codigo").value = result.Producto.Codigo;
            document.getElementById("Nombre").value = result.Producto.Nombre;
            document.getElementById("imgProd").value = result.Producto.Imagen;
            document.getElementById("Categorias").value = result.Producto.idCategoria;
            document.getElementById("Stock").value = result.Producto.Stock;
            document.getElementById("PrecioCompra").value = result.Producto.PrecioCompra;
            document.getElementById("PrecioVenta").value = result.Producto.PrecioVenta;
            document.getElementById("PorcVenta").value = result.Producto.PorcVenta;
            document.getElementById("btnRegistrarModificar").textContent = "Modificar"; 
            document.getElementById("productoModalLabel").textContent = "Modificar " + document.getElementById("Nombre").value;

            selectCategorias = document.getElementById("Categorias");

            $('#Categorias option').remove();
            for (i = 0; i < result.Categorias.length; i++) {
                option = document.createElement("option");
                option.value = result.Categorias[i].Id;
                option.text = result.Categorias[i].Nombre;
                selectCategorias.appendChild(option);
            }

            if (result.Producto.Imagen != null) {
                $("#imgProducto").removeAttr('hidden');
                $("#imgProducto").attr("src", "data:image/png;base64," + result.Producto.Imagen);
            }
        } else {
            alert("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        alert("Ha ocurrido un error en los datos");
    }
}




async function AccionBtn() {
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }
    if (document.getElementById("btnRegistrarModificar").textContent == "Registrar") {
        await registrarProducto();
    } else {
        await modificarProducto();
    }
}

async function registrarProducto() {
    try {
        var url = "/Productos/Nuevo";

        let value = JSON.stringify({
            Codigo: document.getElementById("Codigo").value,
            Nombre: document.getElementById("Nombre").value,
            Imagen: document.getElementById("imgProd").value,
            idCategoria: document.getElementById("Categorias").value,
            Stock: document.getElementById("Stock").value,
            PrecioCompra: document.getElementById("PrecioCompra").value,
            PrecioVenta: document.getElementById("PrecioVenta").value,
            PorcVenta: document.getElementById("PorcVenta").value
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
            alert('Producto agregado correctamente.');
            $('.datos-error').removeClass('d-none');
            document.location.href = "../Index/";
        } else {
            $('.datos-error').text('Ha ocurrido un error en los datos.')
            $('.datos-error').removeClass('d-none')
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

async function modificarProducto() {
    try {
        var url = "/Productos/Editar";

        let value = JSON.stringify({
            Id: document.getElementById("IdProducto").value,
            Codigo: document.getElementById("Codigo").value,
            Nombre: document.getElementById("Nombre").value,
            Imagen: document.getElementById("imgProd").value,
            idCategoria: document.getElementById("Categorias").value,
            Stock: document.getElementById("Stock").value,
            PrecioCompra: document.getElementById("PrecioCompra").value,
            PrecioVenta: document.getElementById("PrecioVenta").value,
            PorcVenta: document.getElementById("PorcVenta").value
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
            alert('Producto modificado correctamente.');
            $('.datos-error').removeClass('d-none');
            document.location.href = "../Index/";
        } else {
            $('.datos-error').text('Ha ocurrido un error en los datos.')
            $('.datos-error').removeClass('d-none')
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

function abrirmodal() {

    $("#productoModal").modal("show");
    document.getElementById("IdProducto").value = ""
    document.getElementById("Codigo").value = ""
    document.getElementById("Nombre").value = ""
    document.getElementById("imgProd").value = ""
    document.getElementById("Categorias").value = ""
    document.getElementById("Stock").value = ""
    document.getElementById("PrecioCompra").value = ""
    document.getElementById("PrecioVenta").value = ""
    document.getElementById("PorcVenta").value = ""
    cargarCategorias();
    document.getElementById("btnRegistrarModificar").textContent = "Registrar";
    document.getElementById("productoModalLabel").textContent = "Registrar nuevo producto";
    $("#imgProducto").attr("src", "");
    $("#imgProducto").attr("hidden", "hidden");

};




// get a reference to the file input



// listen for the change event so we can capture the file
fileInput.addEventListener("change", (e) => {
    var files = e.target.files
    let base64String = "";
    let baseTotal = "";

    // get a reference to the file
    const file = e.target.files[0];

  

    // encode the file using the FileReader API
    const reader = new FileReader();
    reader.onloadend = () => {
        // use a regex to remove data url part

        base64String = reader.result
            .replace("data:", "")
            .replace(/^.+,/, "");

       
        var inputImg = document.getElementById("imgProd");
        inputImg.value = base64String;

        $("#imgProducto").removeAttr('hidden');
        $("#imgProducto").attr("src", "data:image/png;base64," + base64String);

    };

    reader.readAsDataURL(file);

}
);

async function cargarCategorias() {
    try {
        var url = "/Productos/ListarCategorias";

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
            selectCategorias = document.getElementById("Categorias");

            $('#Categorias option').remove();
            for (i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre;
                selectCategorias.appendChild(option);
            }
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

function abrirmodalimportacionmasiva() {
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }
    $("#modalImportacionMasiva").modal("show");
}

async function enviarImportacionMasiva() {
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }
    try {
        var url = "/Productos/GuardarDatos";
        var model = new FormData();
        model.append("File", $('#fileImportacionMasiva')[0].files[0]);
        model.append("Name", "Name");
        $.ajax({
            type: "post",
            url: url,
            data: model,
            processData: false,
            contentType: false,
            success: function (data, textStatus) {
                if (data == "True") {
                    $("#modalImportacionMasiva").modal("hide");
                    alert("Los productos han sido registrados con exito.")
                    document.location.href = "../Index/";
                } else {

                    $("#modalImportacionMasiva").modal("hide");
                    alert("Ha ocurrido un error con los datos.")
                }

            },
            error: function (data, textStatus) {
                alert("Ha ocurrido un error, consulte a un Administrador.")
            }
        });


    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

//ACCIONES AL APRETAR ENTER
document.getElementById('Codigo').addEventListener('keydown', inputCodigo);
function inputCodigo(event) {
    if (event.keyCode == 13) {
        document.getElementById('Nombre').focus();
    }
}

document.getElementById('Nombre').addEventListener('keydown', inputNombre);
function inputNombre(event) {
    if (event.keyCode == 13) {
        document.getElementById('Categorias').focus();
    }
}

document.getElementById('Categorias').addEventListener('keydown', inputCategoria);
function inputCategoria(event) {
    if (event.keyCode == 13) {
        document.getElementById('Stock').focus();
    }
}

document.getElementById('Stock').addEventListener('keydown', inputStock);
function inputStock(event) {
    if (event.keyCode == 13) {
        document.getElementById('PrecioCompra').focus();
    }
}

document.getElementById('PrecioCompra').addEventListener('keydown', inputPrecioCompra);
function inputPrecioCompra(event) {
    if (event.keyCode == 13) {
        document.getElementById('PrecioVenta').focus();
    }
}

document.getElementById('PrecioVenta').addEventListener('keydown', inputPrecioVenta);
function inputPrecioVenta(event) {
    if (event.keyCode == 13) {
        document.getElementById('PorcVenta').focus();
    }
}