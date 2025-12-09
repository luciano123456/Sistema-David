let userSession;
let gridVentas = null
let gridProductos;

$(document).ready(function () {
    configurarDataTable();
    $("#btnProductos").css("background", "#2E4053")
    userSession = JSON.parse(localStorage.getItem('usuario'));

    if (userSession.IdRol == 1) {
        document.getElementById("btnImportarDatos").removeAttribute("hidden");
        document.getElementById("divStock").removeAttribute("hidden");
        document.getElementById("btnNuevo").removeAttribute("hidden");
    }
});

async function configurarDataTable() {
    gridProductos = $('#grdProductos').DataTable({
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
        scrollX: true,
        "columns": [
            {
                "data": "Id",
                "render": function (data) {
                    var imgUrl = '/Productos/ObtenerImagen/' + data + '?v=' + new Date().getTime();

                    return '<img src="' + imgUrl + '" height="45px" width="45px" class="img-thumbnail" style="background-color: transparent; cursor: pointer;" onclick="openModal(\'' + imgUrl + '\')" />';
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
                    var estadoInverso = full.Activo ? 0 : 1;

                    var iconEditar = userSession.IdRol == 1 ?
                        "<button class='btn btn-sm btneditar btnacciones ms-2' type='button' onclick='editarProducto(" + data + ")' title='Editar'><i class='fa fa-pencil-square-o fa-lg text-white'></i></button>" : "";

                    var iconStock = userSession.IdRol == 1 ?
                        "<button class='btn btn-sm btneditar btnacciones ms-2' type='button' onclick='editarStock(" + data + ")' title='Editar Stock'><i class='fa fa-arrows-v fa-lg text-white'></i></button>" : "";

                    var iconEliminar = userSession.IdRol == 1 ?
                        "<button class='btn btn-sm btn-danger btnacciones ms-2' type='button' onclick='eliminarProducto(" + data + ")' title='Eliminar'><i class='fa fa-trash fa-lg text-white'></i></button>" : "";

                    return "<button class='btn btn-sm btn-" + color + " btnacciones' type='button' onclick='cambiarEstadoProducto(" + data + ", " + estadoInverso + ")' title='" + titulo + "'><i class='fa fa-power-off fa-lg text-white'></i></button>"
                        + iconStock + iconEditar + iconEliminar;
                },
                "orderable": true,
                "searchable": true
            }
        ],

        "columnDefs": [
            {
                "render": function (data, type, row) {
                    return formatNumber(data); // Formatear números
                },
                "targets": [5,6,7] // Índices de las columnas de números
            },
        ],

        "initComplete": async function (settings, json) {

            if (userSession.IdRol == 4) {
                gridProductos.column(5).visible(false);
                gridProductos.column(6).visible(false);
                gridProductos.column(8).visible(false);
            }

            await configurarOpcionesColumnas();

          
        }
    });

    $('#grdProductos').DataTable().on("draw", function () {
        actualizarTotalStock();
    });

    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
    $('#grdProductos tbody').on('click', 'tr', function () {
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
        if (confirm("¿Seguro desea eliminar este producto?")) {
            const url = "/Productos/Eliminar";
            const value = JSON.stringify({ Id: id });

            const options = {
                type: "POST",
                url: url,
                async: true,
                data: value,
                contentType: "application/json",
                dataType: "json"
            };

            const result = await MakeAjax(options);

            if (result.TieneStock) {
                const mensaje = result.Mensaje + "\n\n" + result.Detalle.join("\n");
                errorModal(mensaje);
                return;
            }

            if (result.Status) {
                exitoModal('Producto eliminado correctamente.');
                const table = $('#grdProductos').DataTable();
                table.ajax.reload();
            } else {
                $('.datos-error').text('Ha ocurrido un error en los datos.').removeClass('d-none');
            }
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.').removeClass('d-none');
    }
};




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
            $('.datos-error').text('')

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

            if (result.Producto.Imagen != null && result.Producto.Imagen !== "") {
                // Si hay imagen, mostrarla
                $("#imgProducto").removeAttr("hidden");
                $("#imgProducto").attr("src", "data:image/png;base64," + result.Producto.Imagen);
            } else {
                // Si NO hay imagen, ocultar el <img>
                $("#imgProducto").attr("src", "");
                $("#imgProducto").attr("hidden", "hidden");
            }

        } else {
            errorModal("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        errorModal("Ha ocurrido un error en los datos");
    }
}




async function AccionBtn() {
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        errorModal("No tienes permisos para realizar esta accion.")
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
            $("#productoModal").modal("hide");
            exitoModal('Producto agregado correctamente.');
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
            $("#productoModal").modal("hide");
            exitoModal('Producto modificado correctamente.');
            $('.datos-error').removeClass('d-none');
            const table = $('#grdProductos').DataTable();
            table.ajax.reload(null, false);
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

    $("#productoModal").modal('show');
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

const fileInput = document.getElementById("Imagen");


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
        errorModal("No tienes permisos para realizar esta accion.")
        return false;
    }
    $("#modalImportacionMasiva").modal("show");
}

async function enviarImportacionMasiva() {
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        errorModal("No tienes permisos para realizar esta accion.")
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
                    exitoModal("Los productos han sido registrados con exito.")
                    const table = $('#grdProductos').DataTable();
                    table.ajax.reload();
                } else {

                    $("#modalImportacionMasiva").modal("hide");
                    errorModal("Ha ocurrido un error con los datos.")
                }

            },
            error: function (data, textStatus) {
                errorModal("Ha ocurrido un error, consulte a un Administrador.")
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

function openModal(imageSrc) {
    // Cambia el src de la imagen del modal
    document.getElementById('modalImage').src = imageSrc;
    // Muestra el modal
    $('#imageModal').modal('show');
}



// Función para cargar la imagen del producto de manera asíncrona
function cargarImagenProducto(idProducto) {
    $.ajax({
        url: '/Productos/ObtenerImagen/' + idProducto,
        type: 'GET',
        success: function (response) {
            if (response.imagen) {
                $('#img_' + idProducto).attr('src', 'data:image/png;base64,' + response.imagen);
            }
        },
        error: function () {
            console.log('Error al cargar la imagen del producto ' + idProducto);
        }
    });
}


function abrirstockGeneral() {
    document.location.href = "../../Stock/General/";
}

function configurarOpcionesColumnas() {
    const grid = $('#grdProductos').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Productos_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {

       

        if (col.data && col.data !== "Id" && col.data != "Activo") { // Solo agregar columnas que no sean "Id"

            if (userSession.IdRol == 4) {
                if (index == 5 || index == 6 || index == 8) {
                    return;
                }
            }

            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = index == 0 ? "Imagen" : col.data;

            // Ahora agregamos el checkbox, asegurándonos de que se marque solo si 'isChecked' es 'true'
            container.append(`
                <li>
                    <label class="dropdown-item">
                        <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? 'checked' : ''}>
                        ${columnName}
                    </label>
                </li>
            `);
        }
    });

    // Asocia el evento para ocultar/mostrar columnas
    $('.toggle-column').on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');
        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));
        grid.column(columnIdx).visible(isChecked);
    });
}

const editarStock = async id => {

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

            // Ocultar los campos y botones adicionales (Cantidad Nueva, Quitar, Agregar)
            $("#CantidadNuevaStock").show();
            $("#btnQuitar").show();
            $("#btnAgregar").show();
            $("#lblAgregarQuitar").show();
            $("#CantidadStock").prop('disabled', true);

            document.getElementById("nuevoStockModalLabel").textContent = "Editar Stock"

           
            $("#nuevoStockModal").modal("show");
            $("#btnRegistrarModificar").text("Editar");


            $("#ProductoStock").val(result.Producto.Nombre);
            $("#IdProductoStock").val(id);



            $("#CantidadStock").val(result.Producto.Stock);


            

        } else {
            errorModal("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        errorModal("Ha ocurrido un error en los datos");
    }
}

async function agregarStockCantidad() {
    try {
        var url = "/Productos/AgregarStockCantidad";

        let value = JSON.stringify({
            Cantidad: document.getElementById("CantidadNuevaStock").value,
            Id: document.getElementById("IdProductoStock").value
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
            $("#nuevoStockModal").modal("hide");
            exitoModal('Stock agregado correctamente.');
            $('.datos-error').removeClass('d-none');
            const table = $('#grdProductos').DataTable();
            table.ajax.reload();
        } else {
            errorModal("Ha ocurrido un error al restar el stock.")
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

async function restarStockCantidad() {
    try {
        var url = "/Productos/RestarStockCantidad";

        let value = JSON.stringify({
            Cantidad: document.getElementById("CantidadNuevaStock").value,
            Id: document.getElementById("IdProductoStock").value
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
            $("#nuevoStockModal").modal("hide");
            exitoModal('Stock restado correctamente.');
            $('.datos-error').removeClass('d-none');
             const table = $('#grdProductos').DataTable();
                table.ajax.reload();
        } else {
            errorModal("Ha ocurrido un error al agregar el stock.")
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


function actualizarTotalStock() {

    let total = 0;
    var table = $('#grdProductos').DataTable();
    table.rows().eq(0).each(function (index) {
        var row = table.row(index);


        let producto = row.data();

        total += producto.Total

    });

    $("#precioventa").text(formatNumber(total));


}


function borrarImagen() {
    const input = document.getElementById("Imagen");
    const img = document.getElementById("imgProducto");
    const p = document.getElementById("imgProd");

    input.value = "";
    p.value = "";
    img.src = "";
    img.style.display = "none";
    p.innerText = "";
}
