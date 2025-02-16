let userSession;

const eliminarUsuario = async id => {
     if (userSession.IdRol == 2) { //ROL VENDEDOR
         alert("No tienes permisos para realizar esta accion.")
         return false;
     }
    try {
        if (confirm("¿Está seguro que desea eliminar este registro?")) {
        var url = "/Usuarios/Eliminar";

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

            if (result.Status == "Usuario eliminado con exito") {
            
            $('.datos-error').removeClass('d-none');
            document.location.href = "../Index/";
        } 
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

$(document).ready(function () {
    userSession = JSON.parse(sessionStorage.getItem('usuario'));
    configurarDataTable();
    $("#btnUsuarios").css("background", "#2E4053");
   
});

async function configurarDataTable() {
    $('#grdUsuarios').DataTable({
        "ajax": {
            "url": "/Usuarios/Listar",
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },

        scrollX: true,

        "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],

        "order": [[8, 'asc']],

        "columns": [
            { "data": "Usuario" },
            { "data": "Nombre" },
            { "data": "Apellido" },
            { "data": "Telefono" },
            {
                "data": "Direccion", // Cambia esto a la dirección completa en tus datos
                "render": function (value) {
                    // Si tiene más de 20 caracteres, devolver los 10 primeros + '...'
                    if (value != null && value.length > 25) {
                        return '<span class="direccion-tooltip" data-toggle="tooltip" data-placement="bottom" data-trigger="hover touch" title="' + value + '">' +
                            '<a href="javascript:void(0);" onclick="mostrarDireccionCompleta(\'' + value + '\')" class="direccion-link">' + value.substr(0, 25) + '...</a></span>';
                    }
                    return value;
                },
                width: "200px",
            },
            { "data": "TipoNegocio" },
            { "data": "Rol" },
            { "data": "CantVentas" },
            { "data": "Estado" },
            {
                "data": "Id", "render": function (data, type, full) {

                    var activo = full.BloqueoSistema === 1;
                    var color = activo ? "success" : "danger";
                    var titulo = activo ? "Desbloquear" : "Bloquear";

                    // Invertir el estado del producto para enviarlo a la función cambiarEstadoProducto
                    var estadoInverso = full.BloqueoSistema ? 0 : 1;

                    return "<button class='btn btn-sm btn-" + color + " btnacciones' type='button' onclick='bloqueoSistema(" + data + ", " + estadoInverso + ")' title='" + titulo + "'><i class='fa fa-power-off fa-lg text-white' aria-hidden='true'></i></button>" + "<button class='ms-1 btn btn-sm btneditar btnacciones' type='button' onclick='editarUsuario(" + data + ")'title='Editar'><i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i></button>" +
                    "<button class='btn btn-sm btnacciones' type='button' onclick='stockUsuario(" + data + ")'title='Stock'><i class='fa fa-shopping-basket fa-lg text-white' aria-hidden='true'></i></button>" +
                    "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarUsuario(" + data + ")'title='Eliminar'><i class='fa fa-trash-o fa-lg text-white' aria-hidden='true'></i></button>" 
                },

                "orderable": true,
                "searchable": true,
            }
        ],

        "fnRowCallback": function (nRow, data, row) {
            if (data.Estado == "Bloqueado") {
                $('td', nRow).css('background-color', ' #890E07');
            } else if (data.Estado == "Inactivo") {
                $('td', nRow).css('background-color', ' #DED803');
            }
        }

    });


    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
    $('#grdUsuarios tbody').on('click', 'tr', function () {
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

async function AccionBtn() {
    if (userSession.IdRol == 2) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }
    if (document.getElementById("btnRegistrarModificar").textContent == "Registrar") {
        await registrarusuario();
    } else {
        await modificarusuario();
    }
}

const stockUsuario = async id =>
{
    localStorage .setItem("idUserStock", id);
    document.location.href = "../../Stock/Index"
  
}


const editarUsuario = async id => {
    if (userSession.IdRol == 2) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }
    try {
        var url = "/Usuarios/EditarInfo";

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

            $("#usuarioModal").modal("show");

            document.getElementById("IdUsuario").value = id;
            document.getElementById("Usuario").value = result.Usuario.Usuario;
            document.getElementById("Nombre").value = result.Usuario.Nombre;
            document.getElementById("Apellido").value = result.Usuario.Apellido;
            document.getElementById("Dni").value = result.Usuario.Dni;
            document.getElementById("Telefono").value = result.Usuario.Telefono;
            document.getElementById("Direccion").value = result.Usuario.Direccion;
            
            document.getElementById("Contrasena").value = result.Usuario.Contrasena;
            document.getElementById("btnRegistrarModificar").textContent = "Modificar";
            document.getElementById("usuarioModalLabel").textContent = "Modificar " + document.getElementById("Nombre").value;

            document.getElementById("Estado").removeAttribute("hidden");
            document.getElementById("lblEstados").removeAttribute("hidden");

            selectTipoNegocio = document.getElementById("TipoNegocio");

            $('#TipoNegocio option').remove();
            for (i = 0; i < result.TiposNegocios.length; i++) {
                option = document.createElement("option");
                option.value = result.TiposNegocios[i].Id;
                option.text = result.TiposNegocios[i].Nombre;
                selectTipoNegocio.appendChild(option);
            }

            document.getElementById("TipoNegocio").value = result.Usuario.IdTipoNegocio;

            selectRol = document.getElementById("Rol");

            $('#Rol option').remove();
            for (i = 0; i < result.Roles.length; i++) {
                option = document.createElement("option");
                option.value = result.Roles[i].Id;
                option.text = result.Roles[i].Nombre;
                selectRol.appendChild(option);
            }



            document.getElementById("Rol").value = result.Usuario.IdRol;

            selectEstado = document.getElementById("Estado");

            $('#Estado option').remove();
            for (i = 0; i < result.Estados.length; i++) {
                option = document.createElement("option");
                option.value = result.Estados[i].Id;
                option.text = result.Estados[i].Nombre;
                selectEstado.appendChild(option);
            }

            document.getElementById("Estado").value = result.Usuario.IdEstado;
            

        } else {
            alert("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        alert("Ha ocurrido un error en los datos");
    }
}

async function registrarusuario() {
    if (userSession.IdRol == 2) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }
    try {
        var url = "/usuarios/Nuevo";

        let value = JSON.stringify({
            Usuario: document.getElementById("Usuario").value,
            Nombre: document.getElementById("Nombre").value,
            Apellido: document.getElementById("Apellido").value,
            Dni: document.getElementById("Dni").value,
            Telefono: document.getElementById("Telefono").value,
            Direccion: document.getElementById("Direccion").value,
            IdRol: document.getElementById("Rol").value,
            Contrasena: document.getElementById("Contrasena").value,
            IdTipoNegocio: document.getElementById("TipoNegocio").value
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
            alert('Usuario agregado correctamente.');
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

async function modificarusuario() {
    if (userSession.IdRol == 2) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }
    try {
        var url = "/usuarios/Modificar";

        let value = JSON.stringify({
            Id: document.getElementById("IdUsuario").value,
            Usuario: document.getElementById("Usuario").value,
            Nombre: document.getElementById("Nombre").value,
            Apellido: document.getElementById("Apellido").value,
            Dni: document.getElementById("Dni").value,
            Telefono: document.getElementById("Telefono").value,
            Direccion: document.getElementById("Direccion").value,
            IdRol: document.getElementById("Rol").value,
            IdEstado: document.getElementById("Estado").value,
            Contrasena: document.getElementById("Contrasena").value,
            IdTipoNegocio: document.getElementById("TipoNegocio").value
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
            alert('Usuario modificado correctamente.');
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

   
    $("#usuarioModal").modal("show");
    document.getElementById("IdUsuario").value = ""
    document.getElementById("Usuario").value = ""
    document.getElementById("Nombre").value = ""
    document.getElementById("Apellido").value = ""
    document.getElementById("Telefono").value = ""
    document.getElementById("Dni").value = ""
    document.getElementById("Direccion").value = ""
    document.getElementById("Contrasena").value = ""
    document.getElementById("btnRegistrarModificar").textContent = "Registrar";
    document.getElementById("usuarioModalLabel").textContent = "Registrar nuevo usuario";
    document.getElementById("Estado").setAttribute("hidden", "hidden");
    document.getElementById("lblEstados").setAttribute("hidden", "hidden");
    cargarRoles();
    cargarTiposDeNegocio();
    
};

async function cargarRoles() {
    try {
        var url = "/usuarios/ListarRoles";

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
            selectRol = document.getElementById("Rol");

            $('#Rol option').remove();
            for (i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre;
                selectRol.appendChild(option);
            }

            document.getElementById("Rol").value = "2"
     
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}



//ACCIONES AL APRETAR ENTER
document.getElementById('Usuario').addEventListener('keydown', inputUsuario);
function inputUsuario(event) {
    if (event.keyCode == 13) {
        document.getElementById('Nombre').focus();
    }
}

document.getElementById('Nombre').addEventListener('keydown', inputNombre);
function inputNombre(event) {
    if (event.keyCode == 13) {
        document.getElementById('Apellido').focus();
    }
}

document.getElementById('Apellido').addEventListener('keydown', inputApellido);
function inputApellido(event) {
    if (event.keyCode == 13) {
        document.getElementById('Dni').focus();
    }
}

document.getElementById('Dni').addEventListener('keydown', inputDni);
function inputDni(event) {
    if (event.keyCode == 13) {
        document.getElementById('Telefono').focus();
    }
}

document.getElementById('Telefono').addEventListener('keydown', inputTelefono);
function inputTelefono(event) {
    if (event.keyCode == 13) {
        document.getElementById('Direccion').focus();
    }
}

document.getElementById('Direccion').addEventListener('keydown', inputDireccion);
function inputDireccion(event) {
    if (event.keyCode == 13) {
        document.getElementById('Rol').focus();
    }
}

document.getElementById('Rol').addEventListener('keydown', inputRol);
function inputRol(event) {
    if (event.keyCode == 13) {
        document.getElementById('Contrasena').focus();
    }
}

    
function mostrarDireccionCompleta(direccion) {
    alert("Dirección completa: " + direccion);
}

function togglePassword() {
    var passwordField = document.getElementById("Contrasena");
    var passwordIcon = document.querySelector(".show-password");

    if (passwordField.type === "password") {
        passwordField.type = "text";
        passwordIcon.textContent = "👁️";
    } else {
        passwordField.type = "password";
        passwordIcon.textContent = "👁️";
    }
}

function abrirstockPendiente() {
    document.location.href = "../../StockPendiente/Index/";
}

function abrirstockGeneral() {
    document.location.href = "../../Stock/General/";
}

const bloqueoSistema = async (id, estado) => {

    try {
        var url = "/Usuarios/BloqueoSistema";

        let value = JSON.stringify({
            id: id,
            bloqueo: estado
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
            const table = $('#grdUsuarios').DataTable();
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

async function cargarTiposDeNegocio() {
    try {
        var url = "/Usuarios/ListarTipoNegocio";

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
            selectUsuarios = document.getElementById("TipoNegocio");




            $('#TipoNegocio option').remove();

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
