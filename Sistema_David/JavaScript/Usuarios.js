let userSession;
let gridUsuarios = null;

const USUARIOS_COL_FILTER_KEY = "usuarios_col_filters_v1";
const USUARIOS_COL_FILTER_UI = { skin: "cobros", placeholder: "Filtrar…", inputType: "search" };
const columnConfigUsuarios = [
    { index: 0, filterType: "text" },
    { index: 1, filterType: "text" },
    { index: 2, filterType: "text" },
    { index: 3, filterType: "text" },
    { index: 4, filterType: "text" },
    { index: 5, filterType: "select" },
    { index: 6, filterType: "select" },
    { index: 7, filterType: "select" }
];

function escapeHtmlUsuarios(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderUsuarioConCarrito(data, full) {
    let html = '<span class="usr-nombre-cell">';
    html += '<span class="usr-nombre-text">' + escapeHtmlUsuarios(data) + '</span>';

    if (full.StockPendienteAceptar && full.StockPendienteAceptar > 0) {
        const tooltip = full.StockPendienteAceptar === 1
            ? 'Tiene stock por aceptar'
            : 'Tiene ' + full.StockPendienteAceptar + ' stocks por aceptar';

        html += '<button type="button" class="usr-stock-pendiente-cart" ' +
            'data-tooltip="' + escapeHtmlUsuarios(tooltip) + '" ' +
            'aria-label="' + escapeHtmlUsuarios(tooltip) + '" ' +
            'onclick="event.stopPropagation(); abrirstockPendienteUsuario(' + full.Id + ')">' +
            '<i class="fa fa-shopping-cart" aria-hidden="true"></i>';

        if (full.StockPendienteAceptar > 1) {
            html += '<span class="usr-stock-pendiente-count">' + full.StockPendienteAceptar + '</span>';
        }

        html += '</button>';
    }

    html += '</span>';
    return html;
}

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
    userSession = JSON.parse(localStorage.getItem('usuario'));
    configurarDataTable();
    initUsuariosDropdownColumnas();
    $("#btnUsuarios").css("background", "#2E4053");
});

function initUsuariosDropdownColumnas() {
    const btn = document.getElementById('dropdownColumnas');
    const menu = document.getElementById('configColumnasMenu');
    if (!btn || !menu || btn.dataset.usuariosDropdownInit) return;
    btn.dataset.usuariosDropdownInit = '1';

    btn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        const isOpen = menu.classList.contains('show');
        document.querySelectorAll('.dropdown-menu.show').forEach(function (el) {
            el.classList.remove('show');
        });
        document.querySelectorAll('.usuarios-columns-toggle[aria-expanded="true"]').forEach(function (el) {
            el.setAttribute('aria-expanded', 'false');
        });

        if (!isOpen) {
            menu.classList.add('show');
            btn.setAttribute('aria-expanded', 'true');
        }
    });

    menu.addEventListener('click', function (event) {
        event.stopPropagation();
    });

    document.addEventListener('click', function (event) {
        if (btn.contains(event.target) || menu.contains(event.target)) return;
        menu.classList.remove('show');
        btn.setAttribute('aria-expanded', 'false');
    });
}

async function configurarDataTable() {
    $('#grdUsuarios thead tr.filters').remove();
    inicializarEncabezadoColumnas("#grdUsuarios");

    gridUsuarios = $('#grdUsuarios').DataTable({
        ajax: {
            url: "/Usuarios/Listar",
            type: "GET",
            dataType: "json"
        },
        processing: true,
        deferRender: true,
        language: {
            url: "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        scrollX: true,
        scrollCollapse: true,
        autoWidth: false,
        orderCellsTop: true,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
        order: [[7, 'asc']],
        columns: [
            {
                data: "Usuario",
                className: 'text-center',
                render: function (data, type, full) {
                    if (type === 'sort' || type === 'filter' || type === 'type') {
                        return data || '';
                    }
                    return renderUsuarioConCarrito(data, full);
                }
            },
            { data: "Nombre", className: 'text-center' },
            { data: "Apellido", className: 'text-center' },
            { data: "Telefono", className: 'text-center' },
            {
                data: "Direccion",
                className: 'text-center',
                render: function (value, type) {
                    if (type === 'sort' || type === 'filter' || type === 'type') {
                        return value || '';
                    }
                    if (value != null && value.length > 25) {
                        return '<span class="direccion-tooltip" title="' + escapeHtmlUsuarios(value) + '">' +
                            '<a href="javascript:void(0);" onclick="mostrarDireccionCompleta(\'' + value.replace(/'/g, "\\'") + '\')" class="direccion-link">' +
                            escapeHtmlUsuarios(value.substr(0, 25)) + '...</a></span>';
                    }
                    return escapeHtmlUsuarios(value);
                },
                width: "200px"
            },
            { data: "TipoNegocio", className: 'text-center' },
            { data: "Rol", className: 'text-center' },
            { data: "Estado", className: 'text-center' },
            {
                data: "Id",
                className: 'text-center',
                orderable: false,
                searchable: false,
                render: function (data, type, full) {
                    if (type === 'sort' || type === 'filter' || type === 'type') {
                        return '';
                    }
                    var activo = full.BloqueoSistema === 1;
                    var color = activo ? "success" : "danger";
                    var titulo = activo ? "Desbloquear" : "Bloquear";
                    var estadoInverso = full.BloqueoSistema ? 0 : 1;

                    var iconoVista = full.VistaStock == 0 ? 'fa-eye-slash' : 'fa-eye';
                    var nuevoVista = full.VistaStock == 1 ? 0 : 1;

                    let botones = '<div class="usr-actions-cell">';

                    botones += "<button class='btn btn-sm btnacciones usr-btn-vista' type='button' onclick='event.stopPropagation(); toggleVistaStock(" + data + ", " + nuevoVista + ")' title='Mostrar/Ocultar stock'><i class='fa " + iconoVista + " fa-lg text-info' aria-hidden='true'></i></button>";

                    botones += "<button class='btn btn-sm btn-" + color + " btnacciones usr-btn-bloqueo' type='button' onclick='event.stopPropagation(); bloqueoSistema(" + data + ", " + estadoInverso + ")' title='" + titulo + "'><i class='fa fa-power-off fa-lg text-white' aria-hidden='true'></i></button>";

                    botones += "<button class='btn btn-sm btnacciones usr-btn-editar' type='button' onclick='event.stopPropagation(); editarUsuario(" + data + ")' title='Editar'><i class='fa fa-pencil-square-o fa-lg' aria-hidden='true'></i></button>";

                    botones += "<button class='btn btn-sm btnacciones usr-btn-stock' type='button' onclick='event.stopPropagation(); stockUsuario(" + data + ")' title='Ver stock'><i class='fa fa-shopping-basket fa-lg' aria-hidden='true'></i></button>";

                    botones += "<button class='btn btn-sm btnacciones usr-btn-eliminar' type='button' onclick='event.stopPropagation(); eliminarUsuario(" + data + ")' title='Eliminar'><i class='fa fa-trash-o fa-lg' aria-hidden='true'></i></button>";

                    botones += '</div>';
                    return botones;
                }
            }
        ],
        fnRowCallback: function (nRow, data) {
            $(nRow).removeClass('fila-usuario-bloqueado fila-usuario-inactivo');
            if (data.Estado == "Bloqueado") {
                $(nRow).addClass('fila-usuario-bloqueado');
            } else if (data.Estado == "Inactivo") {
                $(nRow).addClass('fila-usuario-inactivo');
            }
        },
        initComplete: function () {
            configurarOpcionesColumnas();
            configurarFiltrosPorColumnaUsuarios();
            this.api().columns.adjust();
        },
        drawCallback: function () {
            if (typeof syncColumnFilterMarkers === 'function') {
                syncColumnFilterMarkers(this.api(), columnConfigUsuarios);
            }
        }
    });

    $(window).on('resize.usuariosDt orientationchange.usuariosDt', function () {
        if ($.fn.DataTable.isDataTable('#grdUsuarios')) {
            $('#grdUsuarios').DataTable().columns.adjust();
        }
    });

    let filaSeleccionada = null;
    const $tbl = $('#grdUsuarios');
    $tbl.off('click.usuarioRow').on('click.usuarioRow', 'tbody tr', function (e) {
        const $tr = $(this);
        if ($(e.target).closest('a, button, .btnacciones, .usr-stock-pendiente-cart, .direccion-link').length) return;

        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass('usuario-row-selected');
        }
        filaSeleccionada = $tr[0];
        $tr.addClass('usuario-row-selected');
    });
}

function limpiarFiltrosColumnasUsuarios() {
    if (!gridUsuarios) return;
    limpiarFiltrosColumnas(gridUsuarios, columnConfigUsuarios, USUARIOS_COL_FILTER_KEY);
}

function configurarFiltrosPorColumnaUsuarios() {
    if (!gridUsuarios) return;
    inicializarFiltrosColumnas(
        gridUsuarios,
        columnConfigUsuarios,
        USUARIOS_COL_FILTER_KEY,
        true,
        USUARIOS_COL_FILTER_UI
    );
    getDataTableWrapper(gridUsuarios).find("thead tr.filters th").eq(8).html("");
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

    var IdTipoNegocio = document.getElementById("TipoNegocio").value;


    if (userSession.IdRol == 2) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }

    if (IdTipoNegocio == -1) {
        alert("El tipo de negocio es erroneo.")
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
            IdTipoNegocio: IdTipoNegocio
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
    var passwordIcon = document.querySelector(".usuarios-show-password i");

    if (passwordField.type === "password") {
        passwordField.type = "text";
        if (passwordIcon) passwordIcon.className = "fa fa-eye-slash";
    } else {
        passwordField.type = "password";
        if (passwordIcon) passwordIcon.className = "fa fa-eye";
    }
}

function abrirstockPendiente() {
    document.location.href = "../../StockPendiente/Index/";
}

function abrirstockPendienteUsuario(id) {
    localStorage.setItem("idUserStock", id);
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


function configurarOpcionesColumnas() {
    const grid = $('#grdUsuarios').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas

    const storageKey = `Usuarios_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = index != 6 ? col.data : "Direccion";

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
        grid.columns.adjust();
    });
}

async function toggleVistaStock(idUsuario, nuevoValor) {
    const url = "/Usuarios/setVistaStock";

    let value = JSON.stringify({
        id: idUsuario,
        stock: nuevoValor
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

    if (result && result.Status) {
        const table = $('#grdUsuarios').DataTable();
        table.ajax.reload();
    } else {
        alert("Error al cambiar la vista de stock.");
    }
}
