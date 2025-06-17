const precioVenta = [];
const stock = [];
const productos = [];
let userSession;
let idUserStock = 0;
let productoNombres = {};
let nombreUser;


$(document).ready(function () {
    userSession = JSON.parse(localStorage.getItem('usuario'));



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
        document.getElementById("btnExportarPdf").removeAttribute("hidden");
    } else {
        $("#btnStock").css("background", "#2E4053");
    }



});



async function configurarDataTable() {
    const response = await $.ajax({
        url: "/Stock/BuscarStock/" + idUserStock,
        type: "GET",
        dataType: "json"
    });

    const datos = response.data;
    mostrarCantidad = response.vistaStock;

    const dataTableOptions = {
        data: datos,
        language: {
            url: "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        scrollX: true,
        columns: [
            {
                data: "Imagen",
                render: function (data, type, row) {
                    var imgUrl = '/Productos/ObtenerImagen/' + row.IdProducto;
                    return '<img src="' + imgUrl + '" height="45px" width="45px" class="img-thumbnail" style="background-color: transparent; cursor: pointer;" onclick="openModal(\'' + imgUrl + '\')" />';
                }
            },
            { data: "Producto" },
            {
                data: "Cantidad",
                render: function (data, type, row) {
                    return mostrarCantidad ? data : "-";
                }
            },
            { data: "PrecioVenta" },
            { data: "Total" },
            {
                data: "Id",
                render: function (data, type, row) {
                    let botones = "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='transferirStock(" + data + ", " + row.IdProducto + ")' title='Transferir'><i class='fa fa-exchange fa-lg text-success' aria-hidden='true'></i></button>";

                    botones += "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarStock(" + data + ")' title='Editar'><i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i></button>" +
                        "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarStock(" + data + ")' title='Eliminar'><i class='fa fa-trash-o fa-lg text-white' aria-hidden='true'></i></button>";

                    return botones;
                },
                orderable: true,
                searchable: true,
                width: "100px"
            }
        ],
        columnDefs: [
            {
                render: function (data, type, row) {
                    return formatNumber(data);
                },
                targets: [3, 4]
            },
            {
                targets: [4],
                visible: (userSession.IdRol == 1)
            }
        ],
        initComplete: async function () {
            await configurarOpcionesColumnas();
        }
    };

    $('#grdStock').DataTable(dataTableOptions);

    $('#grdStock').DataTable().on("draw", function () {
        actualizarPrecio();
    });

    let filaSeleccionada = null;
    $('#grdStock tbody').on('click', 'tr', function () {
        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass('seleccionada');
            $('td', filaSeleccionada).removeClass('seleccionada');
        }

        filaSeleccionada = $(this);
        $(filaSeleccionada).addClass('seleccionada');
        $('td', filaSeleccionada).addClass('seleccionada');
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

            // Ocultar los campos y botones adicionales (Cantidad Nueva, Quitar, Agregar)
            $("#CantidadNueva").show();
            $("#btnQuitar").show();
            $("#btnAgregar").show();
            $("#lblAgregarQuitar").show();
            $("#btnRegistrarModificar").hide();
            $("#Cantidad").prop('disabled', true);

            document.getElementById("nuevoProductoModalLabel").textContent = "Editar Stock"

            await cargarProductosAll();

            $("#nuevoProductoModal").modal("show");
            $("#btnRegistrarModificar").text("Editar");


            $("#IdStock").text(id);
            $("#IdStock").value = id;



            $("#Cantidad").val(result.data.Cantidad);

            $("#Productos").val(result.data.IdProducto).trigger('change');


            $("#Productos").prop('disabled', true);



            $("#precioTotal").text(formatNumber(result.data.Total));

        } else {
            alert("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        alert("Ha ocurrido un error en los datos");
    }
}

async function transferirStock(id) {
    await cargarUsuarios();
    $("#CantidadTransferencia").val("1");
    $("#IdStockTransferencia").val(id);
    $("#transferenciaModal").modal("show");
}

async function sumarStock(id, idproducto) {
    $("#CantidadAgregarStock").val("1");
    $("#IdStockAgregar").val(id);
    $("#IdProductoAgregar").val(idproducto);
    $("#agregarStockModal").modal("show");
}

async function restarStock(id, idproducto) {
    $("#CantidadRestarStock").val("1");
    $("#IdStockRestar").val(id);
    $("#IdProductoRestar").val(idproducto);
    $("#restarStockModal").modal("show");
}

async function transferenciaStock() {
    var cantidad = parseInt(document.getElementById("CantidadTransferencia").value);
    var idStock = parseInt(document.getElementById("IdStockTransferencia").value);
    var idUser = parseInt(document.getElementById("Usuarios").value);

    var url = "/Stock/Transferir";

    let value = JSON.stringify({
        IdStock: idStock,
        Cantidad: cantidad,
        IdUser: idUser,
        idUserAsignado: idUserStock
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
        if (result.data == "-1") {
            alert("No tienes esa cantidad para transferir.");
            return false;
        }
        alert("Stock transferido correctamente")
        document.location.href = "../../Stock/Index/";
    }



}

async function abrirmodal() {
    // Mostrar el modal para añadir
    $("#nuevoProductoModal").modal("show");


    // Cambiar texto del botón a "Añadir"
    $("#btnRegistrarModificar").text("Añadir");

    // Habilitar campo de Producto y Cantidad
    $("#Productos").prop('disabled', false);
    $("#Cantidad").prop('disabled', false); // Habilitar cantidad para edición

    // Limpiar valores del modal
    $("#IdStock").val(0); // Establecer el ID en 0
    $("#Cantidad").val(1); // Establecer valor predeterminado de cantidad
    $("#precioTotal").text("0"); // Precio inicial
    document.getElementById("nuevoProductoModalLabel").textContent = "Añadir Producto"

    // Ocultar los campos y botones adicionales (Cantidad Nueva, Quitar, Agregar)
    $("#CantidadNueva").hide();
    $("#btnQuitar").hide();
    $("#btnAgregar").hide();
    $("#lblAgregarQuitar").hide();
    $("#btnRegistrarModificar").show();

    // Cargar productos si es necesario
    await cargarProductos();

    $("#Productos").select2({
        dropdownParent: $("#nuevoProductoModal"),
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
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
                stock[i] = result.data[i].Stock;

                productoNombres[result.data[i].Id] = result.data[i].Nombre;

                selectProductos.appendChild(option);

            }

            selectProductosPrecio = document.getElementById("ProductosPrecio");

            $("#precioTotal").text(formatNumber(precioVenta[0]));
            $("#stock").text(stock[0]);

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
                stock[i] = result.data[i].Stock;

                productoNombres[result.data[i].Id] = result.data[i].Nombre;

                selectProductos.appendChild(option);

            }

            selectProductosPrecio = document.getElementById("ProductosPrecio");

            $("#precioTotal").text(formatNumber(precioVenta[0]));
            $("#stock").text(stock[0]);

        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}



$("#Productos").on("change", function () {
    let selectedValue = $(this).prop('selectedIndex'); // Obtiene el valor seleccionado
    let cantidadInput = document.getElementById("Cantidad"); // Busca el input de cantidad

    if (!cantidadInput) {
        console.error("El campo cantidad no se encontró en el DOM.");
        return; // Salimos de la función si no existe
    }

    let cantidad = cantidadInput.value || 1; // Asignar un valor por defecto si está vacío
    let precio = precioVenta[selectedValue] || 0; // Obtener el precio según el producto seleccionado
    let stockX = stock[selectedValue] || 0; // Obtener el precio según el producto seleccionado

    $("#precioTotal").text(formatNumber(precio * cantidad)); // Actualizar el precio total
    $("#stock").text(stockX);
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


async function agregarStockCantidad() {
    try {
        var url = "/Stock/AgregarStockCantidad";

        let value = JSON.stringify({
            Cantidad: document.getElementById("CantidadNueva").value,
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
            alert('Stock pendiente agregado correctamente.');
            $('.datos-error').removeClass('d-none');
            document.location.href = "../../Stock/Index/";
        } else {
            alert("El usuario ya tiene un stock pendiente de este producto, antes de eliminar, debe aceptar o rechazar el que tiene en curso.")
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

async function restarStockCantidad() {
    try {
        var url = "/Stock/RestarStockCantidad";

        let value = JSON.stringify({
            Cantidad: document.getElementById("CantidadNueva").value,
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
            alert('Stock pendiente agregado correctamente.');
            $('.datos-error').removeClass('d-none');
            document.location.href = "../../Stock/Index/";
        } else {
            alert("El usuario ya tiene un stock pendiente de este producto, antes de eliminar, debe aceptar o rechazar el que tiene en curso.")
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
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
            alert("El usuario ya tiene un stock pendiente de este producto, antes de eliminar, debe aceptar o rechazar el que tiene en curso.")
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
            IdUsuario: idUserStock,
            Tipo: 'SUMAR'
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

            $('.datos-error').text('Stock insuficiente.')
            $('.datos-error').removeClass('d-none');

        } else if (result.Status == 3) {

                $('.datos-error').text('La suma de cantidad de este producto, excede el stock.')
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



async function sumaStock() {

    try {
        var url = "/StockPendiente/Agregar";

        let value = JSON.stringify({
            //IdProducto: obtenerIdListSeleccionado(),
            IdProducto: $("#IdProductoAgregar").val(),
            Cantidad: Number($("#Cantidad").val()),
            IdUsuario: idUserStock,
            Tipo: 'SUMAR'
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
            alert('Se ha agregado el producto a stock pendiente.');
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
                alert('El stock eliminado ha sido agregado a stocks pendientes del usuario correctamente.');
                $('.datos-error').removeClass('d-none');
                document.location.href = "../../Stock/Index/";
            } else {
                alert("El usuario ya tiene un stock pendiente de este producto, antes de eliminar, debe aceptar o rechazar el que tiene en curso.")
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
            $("#lbltelefono").text(result.Telefono);

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

function abrirstockPendiente() {
    document.location.href = "../../StockPendiente/Index/";
}

function openModal(imageSrc) {
    // Cambia el src de la imagen del modal
    document.getElementById('modalImage').src = imageSrc;
    // Muestra el modal
    $('#imageModal').modal('show');
}


async function enviarWhatssap() {

    var telefono = document.getElementById("lbltelefono").innerText;

    const urlwsp = `https://api.whatsapp.com/send?phone=+54 9${telefono}&text=''`;
    window.open(urlwsp, '_blank');
}


async function exportarPdf() { 

    try {

        var url = "/Stock/BuscarStock";

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
            nombreUser = document.getElementById("lblnombreusuario").innerText;
            const facturaPDF = generarFacturaPDF(result);
            descargarFacturaPDF(facturaPDF);


        } else {
            alert('Ha ocurrido un error en los datos.')
        }
    } catch (error) {
        alert('Ha ocurrido un error en los datos.')
    }
}

function generarFacturaPDF(factura) {
    const doc = new jsPDF();
    let fecha = moment().format('DD/MM/YYYY');
    const pageHeight = doc.internal.pageSize.height; // Altura máxima de la página

    let y = 20; // Posición inicial de la primera página
    let primeraPagina = true; // Controla si es la primera página

    // Función para agregar encabezado en la primera página
    function agregarEncabezadoPrimeraPagina() {
        doc.setFontSize(32);
        doc.setTextColor(115, 195, 178);
        doc.text(`Indumentaria DG`, 10, y);
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.text(`Fecha: ${fecha}`, 10, y + 10);
        doc.text(`Stock de ${nombreUser}`, 10, y + 18);
        y += 28; // Mover el cursor hacia abajo después del encabezado
    }

    // Función para agregar encabezado de la tabla en cada página
    function agregarEncabezadoTabla() {
        doc.setFontSize(12);
        doc.setFillColor(115, 195, 178);
        doc.rect(10, y, 190, 10, 'F');
        doc.setTextColor(0);
        doc.text('PRODUCTO', 12, y + 8);
        doc.text('CANTIDAD', 102, y + 8);
        doc.text('PRECIO UNITARIO', 142, y + 8);
        y += 18; // Espacio debajo del encabezado de tabla
    }

    // Agregar encabezado de la primera página
    agregarEncabezadoPrimeraPagina();
    agregarEncabezadoTabla();

    let color = true;

    factura.data.forEach(item => {
        // Si el contenido excede el límite de la página, crear una nueva página
        if (y > pageHeight - 20) {
            doc.addPage();
            y = 20; // Reiniciar la posición vertical en la nueva página
            agregarEncabezadoTabla(); // Agregar el encabezado de tabla en la nueva página
        }

        // Alternar color de fondo para filas
        if (!color) {
            doc.setFillColor(232, 238, 237);
            doc.rect(10, y - 7, 190, 10, 'F');
        }
        color = !color;

        // Agregar datos del producto
        doc.setFontSize(12);
        doc.text(item.Producto, 12, y);
        doc.text(item.Cantidad.toString(), 107, y);
        doc.text(formatNumber(item.PrecioVenta), 147, y);

        // Dibujar línea separadora
        doc.setLineWidth(0.5);
        doc.line(10, y + 3, 200, y + 3);

        y += 10; // Incrementar la posición vertical
    });

    return doc;
}


function descargarFacturaPDF(facturaPDF) {
    let fecha = moment().format('DD/MM/YYYY');
    facturaPDF.save(`stock_${nombreUser} - ${fecha} .pdf`);
}


function configurarOpcionesColumnas() {
    const grid = $('#grdStock').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Stocks_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {



        if (col.data && col.data !== "Id" && col.data != "Activo") { // Solo agregar columnas que no sean "Id"

            if (userSession.IdRol != 4) {
                if (index == 4) {
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