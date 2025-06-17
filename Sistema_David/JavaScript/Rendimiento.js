let userSession;
let gridRendimiento = null;


$(document).ready(async function () {


    moment.locale('es');

    userSession = JSON.parse(localStorage.getItem('usuario'));

    if (userSession.IdRol == 1) { //ROL ADMINISTRADOR
        $("#exportacionExcel").removeAttr("hidden");
        $("#divComprobantesEnviados").attr("style", "display: none !important;");

        $("#Filtros").removeAttr("hidden");
    } else if (userSession.IdRol == 4) { //ROL COMPROBANTES
        $("#divCliente").attr("hidden", "hidden");
        $("#divComprobantesEnviados").attr("style", "display: flex !important;");

        $("#btnRendMensual").attr("hidden", "hidden");
        $("#Filtros").removeAttr("hidden");
    }

    await cargarCuentas();
    await cargarTiposDeNegocio();
    configurarDataDiario();



    $("#btnRendimiento").css("background", "#2E4053");

});


function fechaHoy() {

    document.getElementById("FechaDesde").value = moment().format('YYYY-MM-DD');
    document.getElementById("FechaHasta").value = moment().format('YYYY-MM-DD');
}

function fechaMensual() {

    document.getElementById("FechaDesde").value = moment().startOf('month').format('YYYY-MM-DD');
    document.getElementById("FechaHasta").value = moment().format('YYYY-MM-DD');
}

async function configurarDataDiario() {
    var FechaDesde, FechaHasta;

    var listaUsuarios = document.getElementById("listaUsuarios");


    if (listaUsuarios) {
        var cabeceraVC = listaUsuarios.querySelector(".list-group-item.d-flex.justify-content-end.align-items-center");

        // Identificar la posición de la cabecera "V C" en la lista
        var posicionCabeceraVC = Array.prototype.indexOf.call(listaUsuarios.children, cabeceraVC);

        // Limpiar la lista, excluyendo la cabecera "V C"
        while (listaUsuarios.children.length > posicionCabeceraVC + 1) {
            listaUsuarios.removeChild(listaUsuarios.children[posicionCabeceraVC + 1]);
        }
    }


    if (localStorage.getItem("FechaDesdeRendimiento") == null) {
        FechaDesde = moment().add(-30, 'days').format('YYYY-MM-DD');
    } else {
        FechaDesde = localStorage.getItem("FechaDesdeRendimiento");
    }

    if (localStorage.getItem("FechaHastaRendimiento") == null) {
        FechaHasta = moment().format('YYYY-MM-DD');
    } else {
        FechaHasta = localStorage.getItem("FechaHastaRendimiento");
    }



    document.getElementById("FechaDesde").value = FechaDesde;
    document.getElementById("FechaHasta").value = FechaHasta;

    var tiponegocio = document.getElementById("TipoNegocio").value;
    var idcuenta = document.getElementById("CuentaPago").value;
    var metodoPago = document.getElementById("MetodoPago").options[document.getElementById("MetodoPago").selectedIndex].text;
    var comprobantesEnviados = document.getElementById("ComprobantesEnviados").checked || userSession.IdRol == 1 ? 1 : 0;



    const fechaActual = new Date();


    if (userSession.IdRol == 4) {
        const cuatroDiasAntes = moment().subtract(4, 'days'); // Calcula 4 días antes de la fecha actual

        if (moment(FechaDesde).isBefore(cuatroDiasAntes)) {
            document.getElementById("FechaDesde").value = cuatroDiasAntes.format('YYYY-MM-DD');
        }
    }

    await cargarUsuarios()
    configurarDataTable(-1, userSession.IdRol == 1 ? 1 : 0, 1, FechaDesde, FechaHasta, tiponegocio, metodoPago, idcuenta, comprobantesEnviados);
    configurarDataTableClientesAusentes(FechaDesde, FechaHasta);
    cargarVentas(-1);



    $("#btnRendMensual").css("background", "#1B2631");
    $("#btnRendDiario").css("background", "#2E4053");
}

function configurarDataMensual() {
    var FechaDesde, FechaHasta;

    if (localStorage.getItem("FechaDesdeRendimiento") == null) {
        FechaDesde = moment().add(-30, 'days').format('YYYY-MM-DD');
    } else {
        FechaDesde = localStorage.getItem("FechaDesdeRendimiento");
    }

    if (localStorage.getItem("FechaHastaRendimiento") == null) {
        FechaHasta = moment().format('YYYY-MM-DD');
    } else {
        FechaHasta = localStorage.getItem("FechaHastaRendimiento");
    }



    document.getElementById("FechaDesde").value = FechaDesde;
    document.getElementById("FechaHasta").value = FechaHasta;


    obtenerDatosRendimiento(FechaDesde, FechaHasta)

    $("#btnRendMensual").css("background", "#1B2631");
    $("#btnRendDiario").css("background", "#2E4053");
}




function getRol(idRol) {
    switch (idRol) {
        case 1: return "A";
        case 2: return "V";
        case 3: return "C";
        default: return "";
    }
}


async function cargarUsuarios() {
    try {
        const url = "/Usuarios/ListarActivos";
        const value = JSON.stringify({
            tipoNegocio: document.getElementById("TipoNegocio").value
        });

        const options = {
            type: "POST",
            url: url,
            async: true,
            data: value,
            contentType: "application/json",
            dataType: "json"
        };

        const result = await MakeAjax(options);

        if (result && result.data) {
            listaUsuarios = document.getElementById("listaUsuarios");
            [...listaUsuarios.querySelectorAll("li:not(:first-child)")].forEach(item => item.remove());

            result.data.forEach(usuario => {
                const rol = getRol(usuario.IdRol);
                const listItem = document.createElement("li");
                listItem.className = "list-group-item d-flex justify-content-between align-items-center";
                listItem.setAttribute("data-id", usuario.Id);

                // Nombre del usuario
                const nombreUsuario = createUsuarioNombre(usuario, rol);
                listItem.appendChild(nombreUsuario);

                // Div de acciones
                const accionesDiv = document.createElement("div");

                if (usuario.IdRol != 1) {
                    accionesDiv.appendChild(createBloqueoButton(usuario));
                }

                if (userSession.IdRol == 1) {
                    accionesDiv.appendChild(createIconoVentas(usuario));
                    document.getElementById("divVentas").removeAttribute("hidden", "hidden");
                } else {
                    document.getElementById("divVentas").setAttribute("hidden", "hidden");

                }


                accionesDiv.appendChild(createIconoCobranzas(usuario));

                listItem.appendChild(accionesDiv);
                listaUsuarios.appendChild(listItem);
            });

            // Crear y agregar el item "GENERAL"
            const generalUsuario = {
                Id: -1,  // ID especial para "GENERAL"
                Nombre: "GENERAL",
                IdRol: ""  // Puedes dejarlo vacío o asignarle un valor especial si lo necesitas
            };


            // Usamos createUsuarioNombre con el objeto "generalUsuario"
            const generalItem = document.createElement("li");
            generalItem.className = "list-group-item d-flex justify-content-between align-items-center selected-user";
            generalItem.setAttribute("data-id", generalUsuario.Id);

            usuarioSeleccionadoId = generalUsuario.Id;

            // Nombre del usuario "GENERAL"
            const nombreGeneral = createUsuarioNombre(generalUsuario, "");

            // Div de acciones para el ítem "GENERAL"
            const accionesDivGeneral = document.createElement("div");
            if (userSession.IdRol == 1) {
                accionesDivGeneral.appendChild(createIconoVentasGeneral());
            }
            accionesDivGeneral.appendChild(createIconoCobranzasGeneral());

            generalItem.appendChild(nombreGeneral);
            generalItem.appendChild(accionesDivGeneral);

            // Añadir a la lista
            listaUsuarios.appendChild(generalItem);
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.');
        $('.datos-error').removeClass('d-none');
    }
}

// Función para crear el ícono de ventas para el usuario "GENERAL"
function createIconoVentasGeneral() {
    const iconVentas = document.createElement("i");
    iconVentas.className = "fa fa-check text-success mx-2";  // Color verde por defecto
    iconVentas.setAttribute("title", "Ventas");
    iconVentas.style.cursor = "pointer";
    iconVentas.addEventListener("click", function () {
        alternarColorIcono(iconVentas);  // Se agrega la funcionalidad de alternar color
    });
    return iconVentas;
}

// Función para crear el ícono de cobranzas para el usuario "GENERAL"
function createIconoCobranzasGeneral() {
    const iconCobranzas = document.createElement("i");
    iconCobranzas.className = "fa fa-check text-success";  // Color verde por defecto
    iconCobranzas.setAttribute("title", "Cobranzas");
    iconCobranzas.style.cursor = "pointer";
    iconCobranzas.addEventListener("click", function () {
        alternarColorIcono(iconCobranzas);  // Se agrega la funcionalidad de alternar color
    });
    return iconCobranzas;
}



function createUsuarioNombre(usuario, rol) {
    const nombreUsuario = document.createElement("span");
    nombreUsuario.textContent = usuario.Nombre + (rol ? ` (${rol})` : "");
    nombreUsuario.style.cursor = "pointer";
    nombreUsuario.addEventListener("click", function () {
        seleccionarRendimiento(this.parentElement, usuario.Id);
    });
    return nombreUsuario;
}

function createBloqueoButton(usuario) {
    
    const color = usuario.BloqueoSistema ? "danger" : "success";
    const titulo = usuario.BloqueoSistema ? "Desbloquear" : "Bloquear";
    const estadoInverso = usuario.BloqueoSistema ? 0 : 1;

    const botonBloqueo = document.createElement("button");
    botonBloqueo.className = `btn btn-sm btn-${color} btnacciones`;
    botonBloqueo.setAttribute("type", "button");
    botonBloqueo.setAttribute("title", titulo);
    botonBloqueo.innerHTML = `<i class="fa fa-power-off fa-lg text-white" aria-hidden="true"></i>`;
    botonBloqueo.addEventListener("click", function (e) {
        e.stopPropagation(); // Detener propagación para que no afecte el listItem
        bloqueoSistema(usuario.Id, estadoInverso);
    });

        return botonBloqueo;
   
}

function createIconoVentas(usuario) {
    const iconVentas = document.createElement("i");
    iconVentas.className = "fa fa-check text-danger ventas-icon mx-2";
    iconVentas.setAttribute("title", "Ventas");
    iconVentas.style.cursor = "pointer";
    iconVentas.addEventListener("click", function (e) {
        e.stopPropagation(); // Detener propagación para que no afecte el listItem
        alternarColorIcono(iconVentas);
    });
    return iconVentas;
}

function createIconoCobranzas(usuario) {
    const iconCobranzas = document.createElement("i");
    iconCobranzas.className = "fa fa-check text-danger cobranzas-icon";
    iconCobranzas.setAttribute("title", "Cobranzas");
    iconCobranzas.style.cursor = "pointer";
    iconCobranzas.addEventListener("click", function (e) {
        e.stopPropagation(); // Detener propagación para que no afecte el listItem
        alternarColorIcono(iconCobranzas);
    });
    return iconCobranzas;
}











function alternarColorIcono(icono) {
    const listItem = icono.closest("li");
    let dataId = listItem.getAttribute("data-id");

    if (dataId != usuarioSeleccionadoId) {
        return false;
    }

    // Cambiar solo el color del ícono seleccionado (Ventas o Cobranzas) sin afectar al otro
    if (icono.classList.contains("text-success")) {
        icono.classList.remove("text-success");
        icono.classList.add("text-danger");
    } else {
        icono.classList.remove("text-danger");
        icono.classList.add("text-success");
    }

    // Actualizar el estado de los íconos de Ventas y Cobranzas
    const iconoVentas = listItem.querySelector(".fa-check[title='Ventas']");
    const iconoCobranzas = listItem.querySelector(".fa-check[title='Cobranzas']");

    const estadoVentas = iconoVentas && iconoVentas.classList.contains("text-success") ? 1 : 0;
    const estadoCobranzas = iconoCobranzas && iconoCobranzas.classList.contains("text-success") ? 1 : 0;
    var idcuenta = document.getElementById("CuentaPago").value;
    var comprobantesEnviados = document.getElementById("ComprobantesEnviados").checked || userSession.IdRol == 1 ? 1 : 0;

    const metodoPago = document.getElementById("MetodoPago").options[document.getElementById("MetodoPago").selectedIndex].text;
    // Llamar a la función para actualizar la DataTable con los nuevos estados
    configurarDataTable(
        dataId,
        estadoVentas,
        estadoCobranzas,
        document.getElementById("FechaDesde").value,
        document.getElementById("FechaHasta").value,
        document.getElementById("TipoNegocio").value,
        metodoPago,
        idcuenta,
        comprobantesEnviados
    );
}

let usuarioSeleccionadoId = null; // Variable para realizar un seguimiento del usuario seleccionado

function seleccionarRendimiento(elemento, idVendedor) {
    const usuarios = document.getElementsByClassName("list-group-item");

    // Limpiar selección previa
    Array.from(usuarios).forEach(usuario => {
        usuario.classList.remove("selected-user");
        const iconoVentas = usuario.querySelector(".fa-check[title='Ventas']");
        const iconoCobranzas = usuario.querySelector(".fa-check[title='Cobranzas']");

        // Restablecer íconos a rojo por defecto
        if (iconoVentas) {
            iconoVentas.classList.remove("text-success");
            iconoVentas.classList.add("text-danger");
        }
        if (iconoCobranzas) {
            iconoCobranzas.classList.remove("text-success");
            iconoCobranzas.classList.add("text-danger");
        }
    });

    // Agregar la clase 'selected-user' al elemento seleccionado
    elemento.classList.add("selected-user");

    // Marcar los íconos de "Ventas" y "Cobranzas" en verde por defecto
    const iconoVentas = elemento.querySelector(".fa-check[title='Ventas']");
    const iconoCobranzas = elemento.querySelector(".fa-check[title='Cobranzas']");

    if (iconoVentas) {
        iconoVentas.classList.remove("text-danger");
        iconoVentas.classList.add("text-success");
    }
    if (iconoCobranzas) {
        iconoCobranzas.classList.remove("text-danger");
        iconoCobranzas.classList.add("text-success");
    }

    // Reconfigurar los eventos de clic para los íconos después de cambiar el color
    if (iconoVentas) {
        iconoVentas.removeEventListener("click", alternarColorIcono);  // Eliminar el evento anterior
        iconoVentas.addEventListener("click", function () {
            alternarColorIcono(iconoVentas);
        });
    }

    if (iconoCobranzas) {
        iconoCobranzas.removeEventListener("click", alternarColorIcono);  // Eliminar el evento anterior
        iconoCobranzas.addEventListener("click", function () {
            alternarColorIcono(iconoCobranzas);
        });
    }

    if (userSession.idRol == 1) {
    // Alternar los íconos cuando se haga clic
    iconoVentas.addEventListener("click", function () {
        alternarColorIcono(iconoVentas);
    });
    }

    iconoCobranzas.addEventListener("click", function () {
        alternarColorIcono(iconoCobranzas);
    });

    // Obtener el estado actual de los íconos de "Ventas" y "Cobranzas"
    const estadoVentas = iconoVentas && iconoVentas.classList.contains("text-success") ? 1 : 0;
    const estadoCobranzas = iconoCobranzas && iconoCobranzas.classList.contains("text-success") ? 1 : 0;
    const metodoPago = document.getElementById("MetodoPago").options[document.getElementById("MetodoPago").selectedIndex].text;
    var idcuenta = document.getElementById("CuentaPago").value;
    var comprobantesEnviados = document.getElementById("ComprobantesEnviados").checked || userSession.IdRol == 1 ? 1 : 0;

    // Limpiar y reconfigurar la DataTable
    $('#grdRendimiento').DataTable().clear().draw();

    configurarDataTable(
        idVendedor,
        estadoVentas,
        estadoCobranzas,
        document.getElementById("FechaDesde").value,
        document.getElementById("FechaHasta").value,
        document.getElementById("TipoNegocio").value,
        metodoPago,
        idcuenta,
        comprobantesEnviados
    );

    obtenerDatosRendimiento(
        document.getElementById("FechaDesde").value,
        document.getElementById("FechaHasta").value
    );


    usuarioSeleccionadoId = idVendedor;

    cargarVentas(idVendedor);
}

async function cargarVentas(idvendedor) {
    try {
        var url = "/Rendimiento/ListarVentas";

        let value = JSON.stringify({
            idVendedor: idvendedor,
            tiponegocio: document.getElementById("TipoNegocio").value
        });

        let options = {
            type: "POST",
            url: url,
            async: true,
            data: value,
            contentType: "application/json",
            dataType: "json",
            timeout: 120000 // 2 minutos
        };

        let result = await MakeAjax(options);

        if (result != null && result.data) {
            let totRestante = result.data.reduce((sum, venta) => sum + venta.Restante, 0);
            document.getElementById("totRestante").textContent = formatNumber(totRestante);

            // Calcular la suma de Restante solo para clientes con EstadoCliente "Inhabilitado"
            let totDeudaInhabilitados = result.data
                .filter(venta => venta.EstadoCliente === "Inhabilitado")
                .reduce((sum, venta) => sum + venta.Restante, 0);

            document.getElementById("totDeuda").textContent = formatNumber(totDeudaInhabilitados);

        } else {
            console.error('La respuesta del servidor es incorrecta:', result); // Agrega un mensaje de error en caso de una respuesta incorrecta
        }
    } catch (error) {
        console.error('Error en la solicitud AJAX:', error);
        $('.datos-error').text('Ha ocurrido un error.');
        $('.datos-error').removeClass('d-none');
    }
}

function aplicarFiltros() {

    const fechaDesde = document.getElementById("FechaDesde").value;
    const fechaHasta = document.getElementById("FechaHasta").value;
    const tipoNegocio = document.getElementById("TipoNegocio").value;
    const metodoPago = document.getElementById("MetodoPago").options[document.getElementById("MetodoPago").selectedIndex].text;
    var idcuenta = document.getElementById("CuentaPago").value;
    var comprobantesEnviados = document.getElementById("ComprobantesEnviados").checked || userSession.IdRol == 1 ? 1 : 0;


    // Convertir las fechas a objetos Date
    const fechaDesdeDate = new Date(fechaDesde);
    const fechaHastaDate = new Date(fechaHasta);

    // Obtener la fecha actual
    const fechaActual = new Date();

    fechaActual.setUTCHours(fechaActual.getUTCHours() - 3);

    // Convertir las fechas a cadenas en el formato 'YYYY-MM-DD'
    const fechaHastaString = fechaHastaDate.toISOString().split('T')[0];
    const fechaActualString = fechaActual.toISOString().split('T')[0];

    if (userSession.IdRol == 4) {
        const cuatroDiasAntes = new Date(fechaActual);
        cuatroDiasAntes.setDate(cuatroDiasAntes.getDate() - 4);

        if (fechaDesdeDate < cuatroDiasAntes) {
            alert("No puedes filtrar datos de más de cuatro días atrás de la fecha actual.");
            return;
        }
    }

    if (fechaHastaString > fechaActualString) {
        // Fecha hasta es mayor que la fecha actual
        alert("La fecha hasta no puede ser mayor que la fecha actual.");
        return;
    }
    const usuarioSeleccionado = document.querySelector(".selected-user");
    if (usuarioSeleccionado) {
        const idVendedor = usuarioSeleccionado.getAttribute("data-id");

        let estadoVentas = 0;

        if (userSession.IdRol == 1) {
            estadoVentas = usuarioSeleccionado.querySelector(".fa-check[title='Ventas']").classList.contains("text-success") ? 1 : 0;
        } else {
            estadoVentas = 0
        }


        const estadoCobranzas = usuarioSeleccionado.querySelector(".fa-check[title='Cobranzas']").classList.contains("text-success") ? 1 : 0;
        

        localStorage.setItem("FechaDesdeRendimiento", document.getElementById("FechaDesde").value);
        localStorage.setItem("FechaHastaRendimiento", document.getElementById("FechaHasta").value);

        $('#grdRendimiento').DataTable().clear().draw();
        configurarDataTable(idVendedor, estadoVentas, estadoCobranzas, fechaDesde, fechaHasta, tipoNegocio, metodoPago, idcuenta, comprobantesEnviados);

    } else {
        configurarDataTable(-1, 1, 1, fechaDesde, fechaHasta, -1, "Todos", -1, comprobantesEnviados);
    }

    //$('#grdRendimientoGeneral').DataTable().clear().draw();
    //$('#grdRendimientoCobrado').DataTable().clear().draw();
    cargarVentas(-1);
    obtenerDatosRendimiento(fechaDesde, fechaHasta);
    cargarUsuarios();
}



const configurarDataTable = async (idVendedor, estadoVentas, estadoCobranzas, fechadesde, fechahasta, tipoNegocio, metodoPago, idcuenta, comprobantesEnviados) => {

    let totVenta = 0;
    let totCobro = 0;
    let totInteres = 0;
    let totEfectivo = 0;
    let totTransferencia = 0;
    let totRestante = 0;

    const tableExists = $.fn.DataTable.isDataTable('#grdRendimiento');

    if (!tableExists) {
        // Si la tabla no existe, crearla
        gridRendimiento = $('#grdRendimiento').DataTable({
            "ajax": {
                "url": `/Rendimiento/MostrarRendimiento?id=${idVendedor}&ventas=${estadoVentas}&cobranzas=${estadoCobranzas}&fechadesde=${fechadesde}&fechahasta=${fechahasta}&tiponegocio=${tipoNegocio}&metodoPago=${metodoPago}&IdCuentaBancaria=${idcuenta}&ComprobantesEnviados=${comprobantesEnviados}`,
                "type": "GET",
                "dataType": "json"
            },
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            },

            scrollX: true,

            "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
            "pageLength": 10,
            lengthChange: true,
            "columns": [
                {
                    "data": "Fecha",
                    "render": function (data) {
                        return moment(data).format("DD/MM/YYYY");
                    }
                },
                {
                    "data": "MetodoPago",
                    "render": function (data, type, row) {
                        let metodoPago = data || ''; // Mostrar el texto del método de pago si existe
                        let icon = '';

                        if (row.Imagen !== null && row.Imagen != "" && row.MetodoPago.toUpperCase() != "EFECTIVO") {
                            icon = `<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='verComprobante(${row.Id})' title='Ver Comprobante'>
                        <i class='fa fa-eye fa-lg text-primary' aria-hidden='true'></i>
                    </button>`;
                        }

                        return metodoPago + ' ' + icon; // Retorna el método de pago seguido del ícono si existe la imagen
                    }
                },
                
                
                { "data": "CuentaBancaria" },
                { "data": "Cliente" },
                { "data": "CapitalInicial" },
                { "data": "Venta" },
                { "data": "Cobro" },
                { "data": "Interes" },
                { "data": "CapitalFinal" },
                
                {
                    "data": "ProximoCobro",
                    "render": function (data) {
                        return moment(data).format("DD/MM/YYYY");
                    }
                },
                {
                    "data": "FechaLimite",
                    "render": function (data) {
                        return moment(data).format("DD/MM/YYYY");
                    }
                },
                { "data": "TipoNegocio" },
                { "data": "Descripcion" },
                {
                    "data": "Id",
                    "render": function (data, type, row) {
                        let iconColorClass = row.whatssap === 1 ? 'text-success' : 'text-danger';
                        var iconColor = userSession.IdRol == 2 ? "red" : "white"; // Color del icono basado en el rol
                        var disabled = userSession.IdRol == 2 ? "disabled" : ""; // Desactivar el botón basado en el rol
                        var iconWhatssap = "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='enviarWhatssap(" + data + ")' title='Enviar Whatssap'><i class='fa fa-whatsapp fa-lg " + iconColorClass + "' aria-hidden='true'></i></button>" 
                        var iconEliminar = row.Descripcion && userSession.IdRol == 1 && !row.Descripcion.includes("Venta") ? "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarInformacion(" + data + ")' title='Eliminar' style='color: " + iconColor + ";' " + disabled + "><i class='fa fa-trash-o fa-lg' aria-hidden='true'></i></button>" : '';
                        return iconWhatssap + iconEliminar;
                            
                    },
                }


            ],
            "columnDefs": [
                {
                    targets: [0], type: "ddMmYyyy"
                },
                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear número en la columna
                    },
                    "targets": [4, 5, 6, 7, 8] // Columnas Venta, Cobro, Capital Final
                }
            ],

            "order": [[0, "ddMmYyyy-desc"], [1, "asc"]],



            "initComplete": async function (settings, json) {
                // Calcular los totales de Venta y Cobro
               

                gridRendimiento.data().each(function (rowData) {
                    if (rowData.Descripcion.includes("Cobranza")) {
                        totCobro += rowData.Cobro;

                        if (rowData.MetodoPago != null && rowData.MetodoPago == "EFECTIVO") {
                            totEfectivo += rowData.Cobro;
                        }
                        if (rowData.MetodoPago != null && (rowData.MetodoPago.toUpperCase() == "TRANSFERENCIA PROPIA" || rowData.MetodoPago.toUpperCase() == "TRANSFERENCIA A TERCEROS")) {
                            totTransferencia += rowData.Cobro;
                        }

                    }
                    if (rowData.Descripcion.includes("Venta")) {
                        totVenta += rowData.Venta;
                    }
                    if (rowData.Descripcion.includes("Interes")) {
                        totInteres += rowData.Interes;
                    }


                });

                // Mostrar los totales en donde desees (por ejemplo, en algún elemento del DOM)
                document.getElementById("totventa").textContent = formatNumber(totVenta);
                document.getElementById("totcobro").textContent = formatNumber(totCobro);
                document.getElementById("totinteres").textContent = formatNumber(totInteres);
                document.getElementById("totefectivo").textContent = formatNumber(totEfectivo);
                document.getElementById("tottransferencia").textContent = formatNumber(totTransferencia);
                document.getElementById("totRestante").textContent = formatNumber(totRestante);

                await configurarOpcionesColumnas();
                if (userSession.IdRol == 4) {
                    gridRendimiento.column(3).visible(false);
                    gridRendimiento.column(4).visible(false);
                    gridRendimiento.column(5).visible(false);
                    gridRendimiento.column(6).visible(false);
                    gridRendimiento.column(7).visible(false);
                }


            }
        });

    } else {
        // Si la tabla ya existe, simplemente actualizar los datos
        const table = $('#grdRendimiento').DataTable();

       

        table.ajax.url(`/Rendimiento/MostrarRendimiento?id=${idVendedor}&ventas=${estadoVentas}&cobranzas=${estadoCobranzas}&fechadesde=${fechadesde}&fechahasta=${fechahasta}&tiponegocio=${tipoNegocio}&metodoPago=${metodoPago}&IdCuentaBancaria=${idcuenta}&ComprobantesEnviados=${comprobantesEnviados}`).load(function () {
            // Recorrer los datos de la tabla después de que se hayan cargado
            table.data().each(async function (rowData) {


                if (rowData.Descripcion.includes("Cobranza")) {
                    totCobro += rowData.Cobro;

                    if (rowData.MetodoPago != null && rowData.MetodoPago == "EFECTIVO") {
                        totEfectivo += rowData.Cobro;
                    }
                    if (rowData.MetodoPago != null && (rowData.MetodoPago == "TRANSFERENCIA PROPIA" || rowData.MetodoPago == "TRANSFERENCIA A TERCEROS")) {
                        totTransferencia += rowData.Cobro;
                    }
                }
                if (rowData.Descripcion.includes("Venta")) {
                    totVenta += rowData.Venta;
                }
                if (rowData.Descripcion.includes("Interes")) {
                    totInteres += rowData.Interes;
                }
            });
            document.getElementById("totventa").textContent = formatNumber(totVenta);
            document.getElementById("totcobro").textContent = formatNumber(totCobro);
            document.getElementById("totinteres").textContent = formatNumber(totInteres);
            document.getElementById("totefectivo").textContent = formatNumber(totEfectivo);
            document.getElementById("tottransferencia").textContent = formatNumber(totTransferencia);
        });



    }


    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
    $('#grdRendimiento tbody').on('click', 'tr', function () {
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

const configurarDataTableClientesAusentes = async (fechadesde, fechahasta, data = null) => {
    const tableExists = $.fn.DataTable.isDataTable('#grdClientesAusentes');

    if (!tableExists) {
        // Si la tabla no existe, crearla
        const table = $('#grdClientesAusentes').DataTable({
            "ajax": {
                "url": `/Rendimiento/MostrarClientesAusentes?fechadesde=${fechadesde}&fechahasta=${fechahasta}`,
                "type": "GET",
                "dataType": "json"
            },
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            },

            scrollX: true,

            "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
            "pageLength": 10,
            lengthChange: true,
            "columns": [
                {
                    "data": "Fecha",
                    "render": function (data) {
                        return moment(data).format("DD/MM/YYYY");
                    }
                },
                { "data": "Cliente" },
                { "data": "Cobrador" },
                { "data": "Observacion" },
                {
                    "data": "Id",
                    "render": function (data, type, row) {
                        let iconColorClass = row.whatssap === 1 ? 'text-success' : 'text-danger';
                        return "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='enviarWhatssap(" + data + ")' title='Enviar Whatssap'><i class='fa fa-whatsapp fa-lg " + iconColorClass + "' aria-hidden='true'></i></button>";
                    },
                }


            ],
            "columnDefs": [
                {
                    targets: [0], type: "ddMmYyyy"
                },
            ],

            "order": [[0, "ddMmYyyy-desc"], [1, "asc"]],




        });

    } else {
        // Si la tabla ya existe y data no es null, simplemente actualizar con la nueva data
        const table = $('#grdClientesAusentes').DataTable();

        if (data !== null) {
            // Limpiar la tabla y agregar los nuevos datos
            table.clear().rows.add(data).draw();
        }



    }


    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
    $('#grdClientesAusentes tbody').on('click', 'tr', function () {
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

jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    "ddMmYyyy-pre": function (a) {
        var dateParts = a.split('/');
        if (dateParts.length !== 3) return 0;
        return new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
    },
    "ddMmYyyy-asc": function (a, b) {
        return a - b;
    },
    "ddMmYyyy-desc": function (a, b) {
        return b - a;
    }
});


// Función para obtener los datos de la API
const obtenerDatosRendimiento = async (fechadesde, fechahasta) => {


    const url = `/Rendimiento/MostrarRendimientoGeneral?fechadesde=${fechadesde}&fechahasta=${fechahasta}`;
    const response = await fetch(url);
    const data = await response.json();



    configurarDataTableCobrado('#grdRendimientoCobrado', FechaDesde, FechaHasta, data.Cobrado);
    configurarDataTableGeneral('#grdRendimientoGeneral', FechaDesde, FechaHasta, data.Rendimiento);
    configurarDataTableClientesAusentes(FechaDesde, FechaHasta, data.ClientesAusentes);


}



// Función para configurar un DataTable con los datos recibidos
const configurarDataTableGeneral = async (selectorTabla, fechadesde, fechahasta, result) => {
    const datos = result;
    const tableExists = $.fn.DataTable.isDataTable(selectorTabla);

    if (!tableExists) {
        // Si la tabla no existe, crearla y agregar los datos
        const table = $(selectorTabla).DataTable({
            "data": datos,
            "columns": [
                {
                    "data": "Fecha",
                    "render": function (data) {
                        return moment(data, 'DD/MM/YYYY').format('D [de] MMMM');
                    },
                    "type": "date",
                },
                { "data": "CapitalInicial" },
                { "data": "Ventas" },
                { "data": "Cobranza" },
                { "data": "CapitalFinal" },
            ],
            "columnDefs": [
                {
                    "render": function (data, type, row) {
                        return formatNumber(data);
                    },
                    "targets": [1, 2, 3, 4]
                },
            ],

            scrollX: true,
            "order": [[0, "asc"]],
            "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            }
        });
    } else {
        // Si la tabla ya existe, agregar los nuevos datos

        $('#grdRendimientoGeneral').DataTable().clear().draw();

        const table = $(selectorTabla).DataTable();
        table.rows.add(datos).draw();
    }


    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
    $('#grdRendimientoGeneral tbody').on('click', 'tr', function () {
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



const configurarDataTableCobrado = async (selectorTabla, fechadesde, fechahasta, result) => {
    const datos = result;

    const tableExists = $.fn.DataTable.isDataTable(selectorTabla);

    if (!tableExists) {
        // Si la tabla no existe, crearla y agregar los datos
        const table = $(selectorTabla).DataTable({
            "data": datos,
            "columns": [
                { "data": "Vendedor" },
                { "data": "TotalCobrado" },
            ],
            "columnDefs": [
                {
                    "render": function (data, type, row) {
                        return formatNumber(data);
                    },
                    "targets": [1]
                },
            ],
            "order": [[1, "asc"]],
            "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            }
        });
    } else {
        // Si la tabla ya existe, agregar los nuevos datos

        $('#grdRendimientoCobrado').DataTable().clear().draw();

        const table = $(selectorTabla).DataTable();
        table.rows.add(datos).draw();
    }


    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
    $('#grdRendimientoCobrado tbody').on('click', 'tr', function () {
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




function ocultarFiltros() {
    alert("Hola");
    var filtros = document.getElementById("Filtros");

    // Verificar si está oculto
    if (filtros.style.display === "none") {
        // Mostrar los filtros
        filtros.style.display = "block";
        /*$("#ocultarFiltros").text("-");*/
    } else {
        // Ocultar los filtros
        /* $("#ocultarFiltros").text("+");*/
        filtros.style.display = "none";
    }
}

async function enviarWhatssap(id) {

    try {
        var url = "/Ventas/EnvWhatssapInformacionVenta";

        let value = JSON.stringify({
            id: id,
            mensaje: ""
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


            var fecha = moment(result.InformacionVenta.Fecha).format('DD/MM/YYYY');
            var fechaHora = moment(result.InformacionVenta.Fecha).format('HH:mm');
            var fechaCobro = moment(result.Venta.FechaCobro).format('DD/MM/YYYY');

            const horaActual = new Date().getHours();

            let saludo;

            // Determinamos el saludo segun la hora




            if (horaActual > 5 && horaActual < 12) {
                saludo = "Buenos días";
            } else if (horaActual > 5 && horaActual < 20) {
                saludo = "Buenas tardes";
            } else {
                saludo = "Buenas noches";
            }



            if (result.InformacionVenta.Descripcion != null) {

                const table = $('#grdRendimiento').DataTable();
                table.ajax.reload();

                if (result.InformacionVenta.Descripcion.includes("Venta")) {
                    var totalVenta = result.InformacionVenta.Entrega + result.InformacionVenta.Restante;
                    mensaje = `Hola ${result.Cliente.Nombre} ${result.Cliente.Apellido}, ${saludo}. Le informamos que el día ${fecha} hemos registrado una venta por $${totalVenta} pesos. Con una cantidad de ${result.ProductosVenta.length} productos:`;


                    for (var i = 0; i < result.ProductosVenta.length; i++) {
                        mensaje += ` ${result.ProductosVenta[i].Cantidad} ${result.ProductosVenta[i].Producto}`;
                    }

                    mensaje += `. Entrega de $${result.InformacionVenta.Entrega} pesos. El monto restante de la venta es de $${result.InformacionVenta.Restante} pesos, su primer fecha de cobro es ${fechaCobro}.`;

                } else {
                    mensaje = `Hola ${result.Cliente.Nombre} ${result.Cliente.Apellido}, ${saludo}. Le informamos que el día ${fecha} hemos registrado un cobro por ${formatNumber(result.InformacionVenta.Entrega)} pesos.`;


                    if (result.InformacionVenta.Interes > 0) {
                        mensaje += ` Se ha agregado un interes de ${formatNumber(result.InformacionVenta.Interes)} pesos. `
                    }

                    if (result.InformacionVenta.Restante > 0) {
                        mensaje += ` El monto restante de la venta es de ${formatNumber(result.InformacionVenta.Restante)} pesos, su nueva fecha de cobro es ${fechaCobro}.`
                    }

                    var saldo = 0;

                    if (result.InformacionVenta.Deuda > 0) {
                        saldo = result.InformacionVenta.Deuda;
                    } else {
                        saldo = result.Cliente.Saldo;
                    }

                    if (result.Cliente.Saldo > 0) {
                        mensaje += ` Saldo total de todas sus ventas es de ${formatNumber(saldo)} pesos.`
                    } else {
                        mensaje += ` No le queda saldo pendiente de sus ventas. `
                    }

                    mensaje += " Muchas gracias por confiar en Indumentaria DG"

                }
            }

            if (result.InformacionVenta.ClienteAusente == 1) {
                const table = $('#grdClientesAusentes').DataTable();
                table.ajax.reload();

                mensaje = `Hola ${result.Cliente.Nombre} ${result.Cliente.Apellido}, ${saludo}. Le informamos que el día ${fecha} a las ${fechaHora} hemos visitado su casa para realizar un cobro y el cobrador no pudo encontrarlo en el domicilio. ¿Desea reprogramar la visita?`;
                if (userSession.IdRol != 2) {
                    CantidadClientesAusentes();
                }


            }

            if (result.InformacionVenta.ClienteAusente == 1 && result.InformacionVenta.Descripcion != null && result.InformacionVenta.Descripcion.includes("Cobranza")) {
                mensaje = `Hola ${result.Cliente.Nombre} ${result.Cliente.Apellido}, ${saludo}. Le informamos que el día ${fecha} hemos visitado su casa para realizar un cobro y el cobrador no pudo encontrarlo en su domicilio. Su nueva fecha de cobro es ${fechaCobro}`;
            }
            if (result.InformacionVenta.ClienteAusente == 0 && result.InformacionVenta.Entrega == 0 && result.InformacionVenta.Descripcion != null && result.InformacionVenta.Descripcion.includes("Cobranza")) {
                mensaje = `Hola ${result.Cliente.Nombre} ${result.Cliente.Apellido}, ${saludo}. Le informamos que el día ${fecha} hemos hecho un cambio de fecha de cobro en su venta. Su nueva fecha de cobro es ${fechaCobro}`;
            }

            if (result.InformacionVenta.TipoInteres === "VISITA CON CAMBIO") {
                mensaje = `${saludo}, ${result.Cliente.Nombre} ${result.Cliente.Apellido}. El día ${fecha} el cobrador pasó por su domicilio. Al reprogramarse el pago, se aplicó un recargo de ${formatNumber(result.InformacionVenta.Interes)} por la visita realizada. Su nueva fecha de cobro es ${fechaCobro}. El saldo pendiente de esta venta es ${formatNumber(result.InformacionVenta.Restante)}. El saldo total de todas sus ventas es ${formatNumber(result.Cliente.Saldo)}. Le recordamos que en caso de avisar previamente por WhatsApp, no se aplica el recargo. Muchas gracias.`;
            }

            else if (result.InformacionVenta.TipoInteres === "INTERES DE 30 DIAS") {
                mensaje = `${saludo}, ${result.Cliente.Nombre}. Le informamos que el día ${fecha} se cumplieron 30 días desde la venta realizada, y aún no se cubrió el 50% de arreglo acordado. Por este motivo, se aplicó un pequeño recargo de ${formatNumber(result.InformacionVenta.Interes)}.\n\n` +
                    `• *Saldo pendiente de esta venta:* ${formatNumber(result.InformacionVenta.Restante)}\n` +
                    `• *Próxima visita de cobro:* ${fechaCobro}\n` +
                    `• *Total acumulado de todas sus ventas:* ${formatNumber(result.Cliente.Saldo)}\n\n` +
                    `Ante cualquier consulta, no dude en comunicarse con nosotros.`;

            }


            else if(result.InformacionVenta.TipoInteres === "INTERES DE 60 DIAS") {
                mensaje = `${saludo}, ${result.Cliente.Nombre}. Le informamos que el día ${fecha} su cuenta superó los 60 días de plazo máximo para abonar. Por este motivo, se han generado los siguientes cargos:\n\n` +
                    `*Interés aplicado:* ${formatNumber(result.InformacionVenta.Interes)}\n\n` +
                    `*Saldo pendiente de esta venta:* ${formatNumber(result.InformacionVenta.Restante)}\n\n` +
                    `*Saldo total de todas sus ventas:* ${formatNumber(result.Cliente.Saldo)}\n\n` +
                    `⚠️ *Próxima visita de cobro:* ${fechaCobro}\n\n` +
                    `Muchas gracias por confiar en INDUMENTARIADG.`;
            }


            else if(result.InformacionVenta.TipoInteres === "PROMESA DE PAGO") {
                mensaje = `${saludo}, ${result.Cliente.Nombre}. Le informamos que el día ${fecha} estuvimos esperando su promesa de pago mediante transferencia. ` +
                    `Al no haber recibido el comprobante y estando próximos al cierre de jornada, se ha agregado un interés de ${formatNumber(result.InformacionVenta.Interes)}.\n\n` +

                    `🗒️ *Saldo pendiente de esta venta:* ${formatNumber(result.InformacionVenta.Restante)}\n` +
                    `📄 *Saldo total de todas sus ventas:* ${formatNumber(result.Cliente.Saldo)}\n\n` +

                    `📅 *El pago ha sido reprogramado para el día siguiente:* ${fechaCobro}\n\n` +

                    `Muchas gracias.`;
            }



            const mensajeCodificado = encodeURIComponent(mensaje);
            const urlwsp = `https://api.whatsapp.com/send?phone=+549${result.Cliente.Telefono}&text=${mensajeCodificado}`;
            //const urlwsp = `https://api.whatsapp.com/send?phone=++54 9 3777 53-5622&text=${mensajeCodificado}`;

            window.open(urlwsp, '_blank');
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



async function mostrarRendimiento(rendimiento) {




    if (rendimiento == 'Mensual' && !$('#grdRendimientoGeneral').is(':visible')) {


        await configurarDataMensual();

        document.getElementById("divCliente").setAttribute("hidden", "hidden")
        document.getElementById("RendimientoDiario").setAttribute("hidden", "hidden")
        document.getElementById("RendimientoClientesAusentes").setAttribute("hidden", "hidden")
        document.getElementById("divUsuarios").setAttribute("hidden", "hidden")


        document.getElementById("RendimientoMensual").removeAttribute("hidden")
        document.getElementById("RendimientoCobrado").removeAttribute("hidden")

        //document.getElementById("lblrxdia").removeAttribute("hidden", "hidden")
        //document.getElementById("lblrcobrador").removeAttribute("hidden", "hidden")
        $("#btnRendDiario").css("background", "#1B2631");
        $("#btnRendMensual").css("background", "#2E4053");


    }

    if (rendimiento == 'Diario' && !$('#grdRendimiento').is(':visible')) {

        $('#grdRendimiento').DataTable().clear().draw();
        await configurarDataDiario();

        document.getElementById("RendimientoMensual").setAttribute("hidden", "hidden")

        document.getElementById("RendimientoCobrado").setAttribute("hidden", "hidden")
        //document.getElementById("lblrxdia").setAttribute("hidden", "hidden")
        //document.getElementById("lblrcobrador").setAttribute("hidden", "hidden")

        document.getElementById("divCliente").removeAttribute("hidden")

        document.getElementById("RendimientoDiario").removeAttribute("hidden")
        document.getElementById("RendimientoClientesAusentes").removeAttribute("hidden")

        document.getElementById("divUsuarios").removeAttribute("hidden")
        $("#btnRendMensual").css("background", "#1B2631");
        $("#btnRendDiario").css("background", "#2E4053");

    }






}


async function CantidadClientesAusentes() {

    var url = "/Rendimiento/MostrarCantidadClientesAusentes";

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
        document.getElementById("notificationHome").style.display = "inline";
        document.getElementById("notificationHome").textContent = ` (${result.cantidad})`;
    } else {
        document.getElementById("notificationIcon").style.display = "block";
    }

}

async function ObtenerImagen(idVenta) {
    let url = `/Rendimiento/ObtenerImagen?idVenta=${idVenta}`;

    let options = {
        type: "GET",
        url: url,
        async: true,
        contentType: "application/json",
        dataType: "json"
    };

    let result = await $.ajax(options);

    if (result != null) {
        return result.data;
    } else {
        return null;
    }
}

async function verComprobante(id) {
    // Establece la imagen base64 en el src del img del modal
    var image = await ObtenerImagen(id)
    document.getElementById("imagenComprobante").src = "data:image/png;base64," + image; // Puedes ajustar el formato si es JPG, etc.

    // Abre el modal
    $('#modalComprobante').modal('show');
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

            if (userSession.IdRol == 1 || userSession.IdRol == 4) { //ROL ADMINISTRADOR Y COMPROBANTES
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

            cargarUsuarios();
        } else {
            $('.datos-error').text('Ha ocurrido un error en los datos.')
            $('.datos-error').removeClass('d-none')
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

function sumarFecha(){;
    var FechaDesde = document.getElementById("FechaDesde").value;
    var FechaHasta = document.getElementById("FechaHasta").value;

    let FechaDesdeNew = moment(FechaDesde).add(1, 'days').format('YYYY-MM-DD');
    let FechaHastaNew = moment(FechaHasta).add(1, 'days').format('YYYY-MM-DD');

    document.getElementById("FechaDesde").value = FechaDesdeNew;
    document.getElementById("FechaHasta").value = FechaHastaNew
}

function restarFecha() {
    var FechaDesde = document.getElementById("FechaDesde").value;
    var FechaHasta = document.getElementById("FechaHasta").value;

    let FechaDesdeNew = moment(FechaDesde).add(-1, 'days').format('YYYY-MM-DD');
    let FechaHastaNew = moment(FechaHasta).add(-1, 'days').format('YYYY-MM-DD');

    document.getElementById("FechaDesde").value = FechaDesdeNew;
    document.getElementById("FechaHasta").value = FechaHastaNew
}

function configurarOpcionesColumnas() {
    const grid = $('#grdRendimiento').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Rendimientos_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {



        if (col.data && col.data !== "Id" && col.data != "Activo" && col.data != "Imagen") { // Solo agregar columnas que no sean "Id"

            if (userSession.IdRol == 4) {
                if (index == 3 || index == 4 || index == 5 || index == 6 || index == 7) {
                    return;
                }
            }

            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName =  col.data;

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


async function cargarCuentas() {
    try {
        var url = "/Cobranzas/ListaCuentasBancarias";

        let value = JSON.stringify({
            metodopago: document.getElementById("MetodoPago").options[document.getElementById("MetodoPago").selectedIndex].text
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
            select = document.getElementById("CuentaPago");

            $('#CuentaPago option').remove();

            option = document.createElement("option");
            option.value = -1;
            option.text = "Todos";
            select.appendChild(option);

            for (i = 0; i < result.length; i++) {
                option = document.createElement("option");
                option.value = result[i].Id;
                option.text = result[i].Nombre;
                select.appendChild(option);
            }


        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


async function habilitarCuentas() {
    var formaPagoSelect = document.getElementById("MetodoPago");
    var cuenta = document.getElementById("CuentaPago");
    var cuentaLbl = document.getElementById("lblCuentaPago");

    await cargarCuentas();

    if (formaPagoSelect.value.toUpperCase() === "TRANSFERENCIA PROPIA" || formaPagoSelect.value.toUpperCase() === "TRANSFERENCIA A TERCEROS") {
        cuenta.hidden = false;
        cuentaLbl.hidden = false;
    } else {
        cuenta.value = -1;
        cuenta.hidden = true;
        cuentaLbl.hidden = true;
    }
}


const eliminarInformacion = async id => {

    if (userSession.IdRol != 1) { //ROL VENDEDOR
        alert("No tienes permisos para realizar esta accion.")
        return false;
    }

    try {
        if (confirm("¿Está seguro que desea eliminar esta informacion?")) {
            var url = "/Ventas/EliminarInformacionVenta";

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

            if (result.data) {
                alert('Informacion eliminada correctamente.');
                $('.datos-error').removeClass('d-none');
                gridRendimiento.ajax.reload();
            } else {
                //$('.datos-error').text('Ha ocurrido un error en los datos.')
                //$('.datos-error').removeClass('d-none')
            }
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}
