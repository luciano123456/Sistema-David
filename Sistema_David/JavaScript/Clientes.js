let importacionMasiva = null;
const fileInput = document.getElementById("fileImportacionMasiva");
let gridClientes;
let userSession;

$(document).ready(function () {

    $('.datos-error').text('')

    $("#btnClientes").css("background", "#2E4053")

    userSession = JSON.parse(sessionStorage.getItem('usuario'));

    if (userSession.IdRol == 1) { //ROL ADMIN
        $("#exportacionExcel").removeAttr("hidden");
        $("#importacionExcel").removeAttr("hidden");
        $("#btnNuevo").removeAttr("hidden");
        $("#btnLimite").removeAttr("hidden");
        $("#Filtros").removeAttr("hidden");
    }

    cargarUsuarios();
    cargarZonas();

    var NombreFiltro, ApellidoFiltro, DniFiltro;


    if (localStorage.getItem("NombreFiltro") != null) {
        NombreFiltro = localStorage.getItem("NombreFiltro");
        document.getElementById("NombreFiltro").value = localStorage.getItem("NombreFiltro");
    } else {
        NombreFiltro = ""
    }

    if (localStorage.getItem("ApellidoFiltro") != null) {
        ApellidoFiltro = localStorage.getItem("ApellidoFiltro");
        document.getElementById("ApellidoFiltro").value = localStorage.getItem("ApellidoFiltro");
    } else {
        ApellidoFiltro = ""
    }

    if (localStorage.getItem("DniFiltro") != null) {
        DniFiltro = localStorage.getItem("DniFiltro");
        document.getElementById("DniFiltro").value = localStorage.getItem("DniFiltro");
    } else {
        DniFiltro = ""
    }

    if (userSession.IdRol != 1) {
        configurarDataTable(userSession.Id, "", "", "", -1);
    } else {
        configurarDataTable(-1, NombreFiltro, ApellidoFiltro, DniFiltro, -1);
    }


    localStorage.removeItem("NombreFiltro");
    localStorage.removeItem("ApellidoFiltro");
    localStorage.removeItem("DniFiltro");



});

function aplicarFiltros() {
    var idVendedor = document.getElementById("VendedoresFiltro").value;
    var idZona = document.getElementById("ZonasFiltro").value;

    if (gridClientes) {
        gridClientes.destroy();
    }

    configurarDataTable(idVendedor, document.getElementById("NombreFiltro").value, document.getElementById("ApellidoFiltro").value, document.getElementById("DniFiltro").value, idZona);

    localStorage.setItem("NombreFiltro", document.getElementById("NombreFiltro").value);
    localStorage.setItem("ApellidoFiltro", document.getElementById("ApellidoFiltro").value);
    localStorage.setItem("DniFiltro", document.getElementById("DniFiltro").value);

}





const configurarDataTable = async (idVendedor, Nombre, Apellido, Dni, idZona) => {
    gridClientes = $('#grdClientes').DataTable({
        "ajax": {
            "url": `/Clientes/Listar?idVendedor=${idVendedor}&Nombre=${Nombre}&Apellido=${Apellido}&Dni=${Dni}&idZona=${idZona}`,
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },

        scrollX: true,

        "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],


        "columns": [
            {
                "data": "Nombre",
                "render": function (data, type, row) {
                    // Crear el HTML para el cliente con el ícono de edición y el checkbox

                    return `<span class="cliente-tooltip" data-toggle="tooltip" data-placement="bottom" data-trigger="hover touch" title="${data}">
            <span class="cliente-nombre">${data}</span> 
            <i class="fa fa-pencil fa-1x text-primary" title="Editar cliente" 
            style="cursor: pointer;" 
            onclick="editarCliente(${row.Id})"></i>
            </span>`;
                }
            },

            { "data": "Apellido" },
            { "data": "Dni" },

            {
                data: function (row) {
                    if (row.Direccion && row.Direccion.trim() !== "" && row.Latitud && row.Longitud) {
                        var direccionCorta = row.Direccion.length > 25 ? row.Direccion.substring(0, 25) + '...' : row.Direccion;
                        var direccionCompleta = row.Direccion;
                        var latDestino = row.Latitud;
                        var lonDestino = row.Longitud;
                        var mapaUrl = 'https://www.google.com/maps/search/?api=1&query=' + latDestino + ',' + lonDestino + '&zoom=20&basemap=satellite';

                        return '<div class="location-cell">' +
                            '<i title="Ir a Google Maps" class="fa fa-map-marker fa-2x text-warning location-icon" onclick="obtenerUbicacionYMostrarRecorrido(\'' + direccionCompleta + '\', ' + latDestino + ', ' + lonDestino + ')"></i> ' +
                            '<a href="javascript:void(0);" onclick="mostrarDireccionCompleta(\'' + direccionCompleta + '\', ' + latDestino + ', ' + lonDestino + ')" class="direccion-link">' + direccionCorta + '</a>' +
                            '</div>';
                    }

                    // Si no hay coordenadas, solo muestra la dirección
                    return '<a href="javascript:void(0);" onclick="mostrarDireccionCompleta(\'' + row.Direccion + '\', 0, 0)" class="direccion-link">' + row.Direccion + '</a>';
                }
            }

            ,


            { "data": "Telefono" },
            { "data": "Vendedor" },
            { "data": "Zona" },
            { "data": "Estado" },
            { "data": "Saldo" },
            {
                "data": "Id",
                "render": function (data, type, full) {
                    const telefono = `+54 9${full.Telefono}`;


                    const iconoTelefono = `<a class="btn btn-sm btnacciones" href="tel:${telefono}" title="Llamar"><i class="fa fa-phone text-white"></i></a>`;
                  
                    const iconoWhatsapp = `<button class="btn btn-sm btnacciones" type="button" onclick='modalWhatssap(${data})' title="Enviar WhatsApp"><i class="fa fa-whatsapp fa-lg text-white" aria-hidden="true"></i></button>`;
                    const iconoEliminar = `<button class="btn btn-sm btnacciones" type="button" onclick='eliminarCliente(${data})' title="Eliminar"><i class="fa fa-trash-o fa-lg text-white" aria-hidden="true"></i></button>`;

                    iconos = userSession.IdRol == 1 ? `${iconoTelefono}${iconoWhatsapp}${iconoEliminar}` : ``
                    return iconos;
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
                "targets": [8] // Columna de Saldo
            }
        ],

        "fnRowCallback": function (nRow, data, row) {
            if (data.Estado == "Inhabilitado") {
                $('td', nRow).css('background-color', ' #890E07');
            } else if (data.Estado == "Regular") {
                $('td', nRow).css('background-color', ' #DED803');
            }



        },

        "initComplete": function (settings, json) {

            if (userSession.IdRol != 1) {
                gridClientes.column(8).visible(false);

            }
        }
    });


    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
    $('#grdClientes tbody').on('click', 'tr', function () {
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




const eliminarCliente = async id => {

    try {
        if (confirm("¿Está seguro que desea eliminar este registro?")) {
            var url = "/Clientes/Eliminar";

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

            alert(result.Status);

            if (result.Status == "Cliente eliminado con exito") {

                $('.datos-error').removeClass('d-none');
                document.location.href = "../Index/";
            }
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


const buscarLimite = async nombre => {

    try {

        var url = "/Limite/BuscarValorLimite";

        let value = JSON.stringify({
            Nombre: nombre
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

        var valorFormateado = (result.data.Valor).toLocaleString('es-CL', {
            style: 'currency',
            currency: 'CLP'
        });

        if (result != null) {
            document.getElementById("valorLimite").value = valorFormateado;
        }


    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

function formatoMoneda(event) {
    // Obtener el valor ingresado por el usuario
    var valorIngresado = event.target.value;

    // Quitar todos los caracteres que no sean dígitos
    var valorNumerico = parseFloat(valorIngresado.replace(/[^\d]/g, ''));

    // Formatear el valor con separadores de miles y el símbolo de moneda
    var valorFormateado = valorNumerico.toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP'
    });

    // Actualizar el valor del campo de entrada con el valor formateado
    event.target.value = valorFormateado;
}

async function modificarLimiteVenta() {

    try {

        var url = "/Limite/Editar";

        let value = JSON.stringify({
            Nombre: "ClientesRegulares_Venta",
            Valor: parseFloat(document.getElementById("valorLimite").value.replace(/[^\d]/g, ''))
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
            alert("Limite modificado correctamente");
        }


    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


function modalLimite() {
    buscarLimite("ClientesRegulares_Venta")
    $("#modalLimite").modal('show');
}

const modalWhatssap = async id => {
    $("#modalWhatssap").modal('show');
    $("#mensajewsp").val("");
    $("#idClienteWhatssap").val(id);
}

async function enviarWhatssap() {

    try {
        var url = "/Clientes/EnvWhatssap";

        let value = JSON.stringify({
            id: document.getElementById("idClienteWhatssap").value,
            mensaje: document.getElementById("mensajewsp").value
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
            const urlwsp = `https://api.whatsapp.com/send?phone=+54 9${result.data.Telefono}&text=${document.getElementById("mensajewsp").value}`;
            window.open(urlwsp, '_blank');

            $('.datos-error').removeClass('d-none');
        } else {
            //$('.datos-error').text('Ha ocurrido un error en los datos.')
            //$('.datos-error').removeClass('d-none')
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


function nuevoCliente() {
    localStorage.removeItem("EdicionCliente");
    document.location.href = "../../Clientes/Editar/";
}

const editarCliente = async id => {
    localStorage.setItem("EdicionCliente", id);
    document.location.href = "../../Clientes/Editar/";


    //try {
    //    var url = "/Clientes/EditarInfo";

    //    let value = JSON.stringify({
    //        Id: id
    //    });

    //    let options = {
    //        type: "POST",
    //        url: url,
    //        async: true,
    //        data: value,
    //        contentType: "application/json",
    //        dataType: "json"
    //    };

    //    let result = await MakeAjax(options);



    //    if (result != null) {

    //        $("#clienteModal").modal("show");

    //        selectUsuarios = document.getElementById("Usuarios");

    //        $('#Usuarios option').remove();
    //        for (i = 0; i < result.Usuarios.length; i++) {
    //            option = document.createElement("option");
    //            option.value = result.Usuarios[i].Id;
    //            option.text = result.Usuarios[i].Nombre;
    //            selectUsuarios.appendChild(option);
    //        }

    //        selectZonas = document.getElementById("Zonas");

    //        $('#Zonas option').remove();
    //        for (i = 0; i < result.Zonas.length; i++) {
    //            option = document.createElement("option");
    //            option.value = result.Zonas[i].Id;
    //            option.text = result.Zonas[i].Nombre;
    //            selectZonas.appendChild(option);
    //        }

    //        selectEstados = document.getElementById("Estados");

    //        $('#Estados option').remove();
    //        for (i = 0; i < result.Estados.length; i++) {
    //            option = document.createElement("option");
    //            option.value = result.Estados[i].Id;
    //            option.text = result.Estados[i].Nombre;
    //            selectEstados.appendChild(option);
    //        }

    //        document.getElementById("IdCliente").value = result.Usuario.Id;
    //        document.getElementById("Nombre").value = result.Usuario.Nombre;
    //        document.getElementById("Apellido").value = result.Usuario.Apellido;
    //        document.getElementById("Dni").value = result.Usuario.Dni;
    //        document.getElementById("Direccion").value = result.Usuario.Direccion;
    //        document.getElementById("Telefono").value = result.Usuario.Telefono;
    //        document.getElementById("lbllongitud").value = result.Usuario.Longitud;
    //        document.getElementById("lbllatitud").value = result.Usuario.Latitud;


    //        document.getElementById("Estados").value = result.Usuario.IdEstado;
    //        document.getElementById("Zonas").value = result.Usuario.IdZona;
    //        document.getElementById("Estados").removeAttribute("hidden");
    //        document.getElementById("lblEstados").removeAttribute("hidden");
    //        document.getElementById("Usuarios").value = result.Usuario.IdVendedor;
    //        document.getElementById("btnRegistrarModificar").textContent = "Modificar";
    //        document.getElementById("clienteModalLabel").textContent = "Modificar cliente " + document.getElementById("Nombre").value;

    //        initMap();

    //    } else {
    //        alert("Ha ocurrido un error en los datos");
    //    }
    //} catch (error) {
    //    alert("Ha ocurrido un error en los datos");
    //}
}

async function AccionBtn() {
    if (document.getElementById("btnRegistrarModificar").textContent == "Registrar") {
        await registrarCliente();
    } else {
        await modificarCliente();
    }
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

                if (localStorage.getItem('modalClientesRegistrar') == 1) {
                    localStorage.setItem("dniCliente", document.getElementById("Dni").value);
                    localStorage.removeItem('modalClientesRegistrar');
                    document.location.href = "../../../Ventas/Nuevo/";

                } else {
                    document.location.href = "../Index/";
                }


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

async function modificarCliente() {
    try {
        var url = "/Clientes/Editar";

        let value = JSON.stringify({
            Id: document.getElementById("IdCliente").value,
            Nombre: document.getElementById("Nombre").value,
            Apellido: document.getElementById("Apellido").value,
            Dni: document.getElementById("Dni").value,
            Direccion: document.getElementById("Direccion").value,
            Telefono: document.getElementById("Telefono").value,
            IdVendedor: document.getElementById("Usuarios").value,
            IdEstado: document.getElementById("Estados").value,
            IdZona: document.getElementById("Zonas").value,
            Latitud: document.getElementById("lbllatitud").innerText,
            Longitud: document.getElementById("lbllongitud").innerText
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
            alert('Cliente modificado correctamente.');
            $('.datos-error').removeClass('d-none');
            localStorage.setItem("NombreFiltro", document.getElementById("NombreFiltro").value);
            localStorage.setItem("ApellidoFiltro", document.getElementById("ApellidoFiltro").value);
            localStorage.setItem("DniFiltro", document.getElementById("DniFiltro").value);
            localStorage.removeItem("EdicionCliente");
            document.location.href = "../Index/";
        } else {
            //$('.datos-error').text('Ha ocurrido un error en los datos.')
            //$('.datos-error').removeClass('d-none')
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



function abrirmodal() {
    $("#clienteModal").modal("show");

    cargarUsuariosyEstados();
    document.getElementById("IdCliente").value = ""
    document.getElementById("IdZona").value = ""
    document.getElementById("Nombre").value = ""
    document.getElementById("Apellido").value = ""
    document.getElementById("Dni").value = ""
    document.getElementById("Direccion").value = ""
    document.getElementById("Telefono").value = ""
    document.getElementById("Usuarios").value = ""
    document.getElementById("Estados").value = ""
    document.getElementById("Zonas").value = ""
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


async function enviarImportacionMasiva() {
    debugger
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }
    try {
        var url = "/Clientes/GuardarDatos";
        var model = new FormData();
        model.append("File", importacionMasiva);
        model.append("Name", "Name");

        let options = {
            type: "POST",
            url: url,
            async: true,
            data: model,
        };


        debugger

        let result = await MakeAjaxFormData(options);


        if (result != null) {
            $("#modalImportacionMasiva").modal("hide");
            alert("Los clientes han sido registrados con exito.")
            document.location.href = "../Index/";
        } else {

            $("#modalImportacionMasiva").modal("hide");
            alert("Ha ocurrido un error con los datos.")
        }

    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


fileInput.addEventListener("change", (e) => {
    importacionMasiva = e.target.files[0]; // Obtén el archivo seleccionado

    if (importacionMasiva) {
        // Si se seleccionó un archivo, puedes trabajar con él aquí
        console.log("Nombre del archivo:", importacionMasiva.name);
        console.log("Tipo del archivo:", importacionMasiva.type);
        console.log("Tamaño del archivo:", importacionMasiva.size);

        // También puedes usar el objeto FileReader si es necesario, pero en este caso, no parece ser necesario.
    } else {
        // Si no se seleccionó ningún archivo, puedes asignar null o realizar otra acción según sea necesario.
        importacionMasiva = null;
    }
});


async function exportarExcel() {
    exportarDataTableAExcel(gridClientes, "Clientes")
};



function exportarDataTableAExcel(dataTable, fileName) {
    if (userSession.IdRol != 1) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }

    // Crear una matriz de datos en formato SheetJS
    var data = [];

    var cabeceras = dataTable.columns().header().toArray();

    var headers = [];
    for (var i = 0; i < dataTable.columns().count() - 1; i++) {
        var cabeceraTexto = dataTable.column(i).header().textContent;
        headers.push(cabeceraTexto);
    }
    data.push(headers);

    // Agregar los datos de las filas al arreglo de datos
    for (var j = 0; j < dataTable.rows().count(); j++) {
        var row = [];
        for (var k = 0; k < dataTable.columns().count(); k++) {
            if (k == dataTable.columns().count() - 1) continue; //LA ULTIMA FILA NO LA PONEMOS
            var cellValue = dataTable.cell(j, k).data();
            row.push(cellValue);
        }
        data.push(row);
    }

    // Crear el libro de trabajo de Excel
    var workbook = XLSX.utils.book_new();

    // Crear la hoja de trabajo y asignar los datos
    var worksheet = XLSX.utils.aoa_to_sheet(data);



    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    // Generar el archivo Excel
    var wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    // Convertir el archivo Excel a un objeto Blob
    var blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    // Descargar el archivo Excel en el cliente
    if (typeof navigator.msSaveBlob !== "undefined") {
        // Para Internet Explorer
        navigator.msSaveBlob(blob, fileName);
    } else {
        // Para otros navegadores
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    alert("Exportacion creada con exito.")
}

async function cargarZonas() {
    try {
        var url = "/Clientes/ListarZonas";

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
            selectZonas = document.getElementById("ZonasFiltro");




            $('#ZonasFiltro option').remove();

            if (userSession.IdRol == 1) { //ROL ADMINISTRADOR
                option = document.createElement("option");
                option.value = -1;
                option.text = "Todas";
                selectZonas.appendChild(option);
            }

            for (i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre;
                selectZonas.appendChild(option);
            }


        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

async function cargarUsuarios() {
    try {
        var url = "/Ventas/ListarVendedores";

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
            selectUsuarios = document.getElementById("VendedoresFiltro");




            $('#VendedoresFiltro option').remove();

            if (userSession.IdRol == 1) { //ROL ADMINISTRADOR
                option = document.createElement("option");
                option.value = -1;
                option.text = "Todos";
                selectUsuarios.appendChild(option);
            }

            for (i = 0; i < result.data.length; i++) {
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

function mostrarDireccionCompleta(direccion) {
    alert("Dirección completa: " + direccion);
}

var map;
var marker;

// Función para actualizar las coordenadas mostradas en los labels
function updateCoordinates(lat, lng) {
    document.getElementById('lbllatitud').textContent = lat.toFixed(6);
    document.getElementById('lbllongitud').textContent = lng.toFixed(6);

    // Crear una instancia del geocodificador inverso
    const geocoder = new google.maps.Geocoder();

    // Crear un objeto LatLng
    const latLng = new google.maps.LatLng(lat, lng);

    // Realizar la solicitud de geocodificación inversa
    geocoder.geocode({ 'location': latLng }, (results, status) => {
        if (status === 'OK') {
            if (results[0]) {
                document.getElementById('Direccion').value = results[0].formatted_address
                var modal = document.getElementById('mapModal');
                modal.style.display = 'none';
            } else {
                alert('No se encontraron resultados para estas coordenadas.');
            }
        }
    });
}
// Función para abrir el modal y cargar el mapa al hacer clic en el ícono de ubicación

// Función para cerrar el modal al hacer clic en la "X"
var closeModal = document.getElementsByClassName('close')[0];
closeModal.onclick = function () {
    var modal = document.getElementById('mapModal');
    modal.style.display = 'none';
};


document.addEventListener('DOMContentLoaded', function () {

});

function obtenerUbicacionYMostrarRecorrido(direccion, latDestino, lonDestino) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (posicion) {
            // Si se obtiene la ubicación actual, mostrar el recorrido
            var latOrigen = posicion.coords.latitude;
            var lonOrigen = posicion.coords.longitude;
            var mapaUrl = 'https://www.google.com/maps/dir/?api=1&origin=' + latOrigen + ',' + lonOrigen + '&destination=' + latDestino + ',' + lonDestino + '&travelmode=driving&basemap=satellite';
            window.open(mapaUrl, '_blank');
        }, function (error) {
            // Redirigir directamente al destino si la ubicación no está disponible
            var mapaUrl = 'https://www.google.com/maps/search/?api=1&query=' + latDestino + ',' + lonDestino + '&zoom=20&basemap=satellite';
            window.open(mapaUrl, '_blank');
        });
    } else {
        alert('La geolocalización no es compatible con este navegador.');

        // Redirigir directamente al destino si la geolocalización no está disponible
        var mapaUrl = 'https://www.google.com/maps/search/?api=1&query=' + latDestino + ',' + lonDestino + '&zoom=20&basemap=satellite';
        window.open(mapaUrl, '_blank');
    }
}

function abrirClientesCero() {
    document.location.href = "../../ClientesCero/Index/";
}