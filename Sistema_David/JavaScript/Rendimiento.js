let userSession;



$(document).ready(function () {
   
    moment.locale('es');

    userSession = JSON.parse(sessionStorage.getItem('usuario'));

    if (userSession.IdRol == 1) { //ROL ADMINISTRADOR
        $("#exportacionExcel").removeAttr("hidden");
        $("#Filtros").removeAttr("hidden");
    }


    configurarDataDiario()
    

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

function configurarDataDiario() {
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

    cargarUsuarios()
    configurarDataTable(-99, 1, 1, FechaDesde, FechaHasta);
    cargarVentas(-1, FechaDesde, FechaHasta);


 
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

async function cargarUsuarios() {
    try {
        var url = "/Usuarios/ListarActivos";

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
            listaUsuarios = document.getElementById("listaUsuarios");

            result.data.forEach(usuario => {
                const listItem = document.createElement("li");
                listItem.className = "list-group-item d-flex justify-content-between align-items-center"; // Usar las clases de Bootstrap
                listItem.textContent = usuario.Nombre;
                listItem.setAttribute("data-id", usuario.Id);
                listItem.setAttribute("onclick", `seleccionarRendimiento(this,${usuario.Id})`);

                // Crear un div para los botones de acción
                const accionesDiv = document.createElement("div");

                // Crear el icono de "Ventas" con tooltip, tildes verdes y cursor de botón
                const iconVentas = document.createElement("i");
                iconVentas.className = "fa fa-check text-danger mx-2";
                iconVentas.setAttribute("title", "Ventas"); // Agregar el tooltip
                iconVentas.style.cursor = "pointer"; // Agregar cursor de puntero
                iconVentas.addEventListener("click", function () {
                    alternarColorIcono(iconVentas);
                });
                accionesDiv.appendChild(iconVentas);

                // Crear el icono de "Cobranzas" con tooltip, tildes verdes y cursor de botón
                const iconCobranzas = document.createElement("i");
                iconCobranzas.className = "fa fa-check text-danger";
                iconCobranzas.setAttribute("title", "Cobranzas"); // Agregar el tooltip
                iconCobranzas.style.cursor = "pointer"; // Agregar cursor de puntero
                iconCobranzas.addEventListener("click", function () {
                    alternarColorIcono(iconCobranzas);
                });
                accionesDiv.appendChild(iconCobranzas);

                // Agregar el div de acciones al listItem
                listItem.appendChild(accionesDiv);

                listaUsuarios.appendChild(listItem);
            });

            // Agregar el elemento "GENERAL" con iconos y onclick
            const listItem = document.createElement("li");
            listItem.className = "list-group-item d-flex justify-content-between align-items-center selected-user";
            listItem.textContent = "GENERAL";
            listItem.setAttribute("data-id", -99);
            listItem.setAttribute("onclick", "seleccionarRendimiento(this,-99)");

            // Crear un div para los botones de acción de "GENERAL"
            const accionesDiv = document.createElement("div");

            // Crear el icono de "Ventas" con tooltip, tildes verdes y cursor de botón
            const iconVentas = document.createElement("i");
            iconVentas.className = "fa fa-check text-success mx-2";
            iconVentas.setAttribute("title", "Ventas"); // Agregar el tooltip
            iconVentas.style.cursor = "pointer"; // Agregar cursor de puntero
            iconVentas.addEventListener("click", function () {
                alternarColorIcono(iconVentas);
            });
            accionesDiv.appendChild(iconVentas);

            // Crear el icono de "Cobranzas" con tooltip, tildes verdes y cursor de botón
            const iconCobranzas = document.createElement("i");
            iconCobranzas.className = "fa fa-check text-success";
            iconCobranzas.setAttribute("title", "Cobranzas"); // Agregar el tooltip
            iconCobranzas.style.cursor = "pointer"; // Agregar cursor de puntero
            iconCobranzas.addEventListener("click", function () {
                alternarColorIcono(iconCobranzas);
            });
            accionesDiv.appendChild(iconCobranzas);

            // Agregar el div de acciones al listItem "GENERAL"
            listItem.appendChild(accionesDiv);

            listaUsuarios.appendChild(listItem);
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.');
        $('.datos-error').removeClass('d-none');
    }
}

async function cargarVentas(idvendedor, fechadesde, fechahasta) {
    try {
        var url = "/Rendimiento/ListarVentas";

        let value = JSON.stringify({
            idVendedor: idvendedor,
            FechaDesde: fechadesde,
            FechaHasta: fechahasta,
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
            let totRestante = result.data.reduce((sum, venta) => sum + venta.Restante, 0);;
            document.getElementById("totRestante").textContent = formatNumber(totRestante);

            // Calcular la suma de Restante solo para clientes con EstadoCliente "Inhabilitado"
            let totDeudaInhabilitados = result.data
                .filter(venta => venta.EstadoCliente === "Inhabilitado")
                .reduce((sum, venta) => sum + venta.Restante, 0);

            document.getElementById("totDeuda").textContent = formatNumber(totDeudaInhabilitados);

        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.');
        $('.datos-error').removeClass('d-none');
    }
}



function alternarColorIcono(icono) {
    const listItem = icono.closest("li");
    let dataId = listItem.getAttribute("data-id");

    const usuarios = document.getElementsByClassName("list-group-item");

    Array.from(usuarios).forEach(usuario => {
        usuario.classList.remove("selected-user");

        if (dataId != usuarioSeleccionadoId) {

            const iconoVentas = usuario.querySelector(".fa-check[title='Ventas']");
            if (iconoVentas) {
                iconoVentas.classList.remove("text-success");
                iconoVentas.classList.add("text-danger");
            }

            const iconoCobranzas = usuario.querySelector(".fa-check[title='Cobranzas']");
            if (iconoCobranzas) {
                iconoCobranzas.classList.remove("text-success");
                iconoCobranzas.classList.add("text-danger");
            }
        }

    });

    usuarioSeleccionadoId = dataId;

    if (icono.classList.contains("text-success")) {
        icono.classList.remove("text-success");
        icono.classList.add("text-danger");
    } else {
        icono.classList.remove("text-danger");
        icono.classList.add("text-success");
    }


}


let usuarioSeleccionadoId = null; // Variable para realizar un seguimiento del usuario seleccionado

function seleccionarRendimiento(elemento, idVendedor) {
    const usuarios = document.getElementsByClassName("list-group-item");

    

    Array.from(usuarios).forEach(usuario => {
        usuario.classList.remove("selected-user");
    });


    // Agregar la clase 'selected-user' al elemento seleccionado
    elemento.classList.add("selected-user");

    // Verificar si el icono de Ventas está en verde (1) o rojo (0)
    const iconoVentas = elemento.querySelector(".fa-check[title='Ventas']");
    const estadoVentas = iconoVentas.classList.contains("text-success") ? 1 : 0;

    // Verificar si el icono de Cobranzas está en verde (1) o rojo (0)
    const iconoCobranzas = elemento.querySelector(".fa-check[title='Cobranzas']");
    const estadoCobranzas = iconoCobranzas.classList.contains("text-success") ? 1 : 0;



    $('#grdRendimiento').DataTable().clear().draw();
    //$('#grdRendimientoGeneral').DataTable().clear().draw();
    //$('#grdRendimientoCobrado').DataTable().clear().draw();

    configurarDataTable(idVendedor, estadoVentas, estadoCobranzas, document.getElementById("FechaDesde").value, document.getElementById("FechaHasta").value);
    obtenerDatosRendimiento(document.getElementById("FechaDesde").value, document.getElementById("FechaHasta").value);

    if(idVendedor == -99) idVendedor = -1
    cargarVentas(idVendedor);
}



function aplicarFiltros() {

    const fechaDesde = document.getElementById("FechaDesde").value;
    const fechaHasta = document.getElementById("FechaHasta").value;

    // Convertir las fechas a objetos Date
    const fechaDesdeDate = new Date(fechaDesde);
    const fechaHastaDate = new Date(fechaHasta);

    // Obtener la fecha actual
    const fechaActual = new Date();

    fechaActual.setUTCHours(fechaActual.getUTCHours() - 3);

    // Convertir las fechas a cadenas en el formato 'YYYY-MM-DD'
    const fechaHastaString = fechaHastaDate.toISOString().split('T')[0];
    const fechaActualString = fechaActual.toISOString().split('T')[0];

     if (fechaHastaString > fechaActualString) {
        // Fecha hasta es mayor que la fecha actual
        alert("La fecha hasta no puede ser mayor que la fecha actual.");
        return;
    }
    const usuarioSeleccionado = document.querySelector(".selected-user");
    if (usuarioSeleccionado) {
        const idVendedor = usuarioSeleccionado.getAttribute("data-id");
        const estadoVentas = usuarioSeleccionado.querySelector(".fa-check[title='Ventas']").classList.contains("text-success") ? 1 : 0;
        const estadoCobranzas = usuarioSeleccionado.querySelector(".fa-check[title='Cobranzas']").classList.contains("text-success") ? 1 : 0;
       

        localStorage.setItem("FechaDesdeRendimiento", document.getElementById("FechaDesde").value);
        localStorage.setItem("FechaHastaRendimiento", document.getElementById("FechaHasta").value);

        $('#grdRendimiento').DataTable().clear().draw();
        configurarDataTable(idVendedor, estadoVentas, estadoCobranzas, fechaDesde, fechaHasta);
        
    } else {
        configurarDataTable(-99, 1, 1, fechaDesde, fechaHasta);
    }

    //$('#grdRendimientoGeneral').DataTable().clear().draw();
    //$('#grdRendimientoCobrado').DataTable().clear().draw();
    obtenerDatosRendimiento(fechaDesde, fechaHasta);
}



const configurarDataTable = async (idVendedor, estadoVentas, estadoCobranzas, fechadesde, fechahasta) => {
    const tableExists = $.fn.DataTable.isDataTable('#grdRendimiento');

    if (!tableExists) {
        // Si la tabla no existe, crearla
        const table = $('#grdRendimiento').DataTable({
            "ajax": {
                "url": `/Rendimiento/MostrarRendimiento?id=${idVendedor}&ventas=${estadoVentas}&cobranzas=${estadoCobranzas}&fechadesde=${fechadesde}&fechahasta=${fechahasta}`,
                "type": "GET",
                "dataType": "json"
            },
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
            },

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
                { "data": "CapitalInicial" },
                { "data": "Venta" },
                { "data": "Cobro" },
                { "data": "Interes" },
                { "data": "CapitalFinal" },
                { "data": "Descripcion" },
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
                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear número en la columna
                    },
                    "targets": [2, 3, 4, 5, 6] // Columnas Venta, Cobro, Capital Final
                }
            ],
            "order": [[0, "ddMmYyyy-desc"]],
            "fnRowCallback": function (nRow, data, row) {
                if (data.Estado == "Bloqueado") {
                    $('td', nRow).css('background-color', ' #890E07');
                } else if (data.Estado == "Inactivo") {
                    $('td', nRow).css('background-color', ' #DED803');
                }
            },
            "initComplete": function (settings, json) {
                // Calcular los totales de Venta y Cobro
                let totVenta = 0;
                let totCobro = 0;
                let totInteres = 0;
                let totEfectivo = 0;
                let totTransferencia = 0;

                table.data().each(function (rowData) {
                    if (rowData.Descripcion.includes("Cobranza")) {
                        totCobro += rowData.Cobro;

                        if (rowData.MetodoPago != null && rowData.MetodoPago == "EFECTIVO") {
                            totEfectivo += rowData.Cobro;
                        }
                        if (rowData.MetodoPago != null && rowData.MetodoPago == "TRANSFERENCIA") {
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
            }
        });

    } else {
        // Si la tabla ya existe, simplemente actualizar los datos
        const table = $('#grdRendimiento').DataTable();

        totVenta = 0;
        totCobro = 0;
        totInteres = 0;
        totEfectivo = 0;
        totTransferencia = 0;

        table.ajax.url(`/Rendimiento/MostrarRendimiento?id=${idVendedor}&ventas=${estadoVentas}&cobranzas=${estadoCobranzas}&fechadesde=${fechadesde}&fechahasta=${fechahasta}`).load(function () {
            // Recorrer los datos de la tabla después de que se hayan cargado
            table.data().each(function (rowData) {
                if (rowData.Descripcion.includes("Cobranza")) {
                    totCobro += rowData.Cobro;

                    if (rowData.MetodoPago != null && rowData.MetodoPago == "EFECTIVO") {
                        totEfectivo += rowData.Cobro;
                    }
                    if (rowData.MetodoPago != null && rowData.MetodoPago == "TRANSFERENCIA") {
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
    configurarDataTableGeneral('#grdRendimientoGeneral',FechaDesde, FechaHasta, data.Rendimiento);
    

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

}

const configurarDataTableCobrado = async (selectorTabla, fechadesde, fechahasta, result) => {
    const datos = result;
    console.log(datos); // Agregar este console.log para verificar los datos recibidos
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
            var fechaCobro = moment(result.Venta.FechaCobro).format('DD/MM/YYYY');

            const horaActual = new Date().getHours();

            let saludo; 

            // Determinamos el saludo segun la hora


            const table = $('#grdRendimiento').DataTable();
            table.ajax.reload();

            if (horaActual > 5 && horaActual < 12) {
                saludo = "Buenos días";
            } else if (horaActual > 5 && horaActual < 20) {
                saludo = "Buenas tardes";
            } else {
                saludo = "Buenas noches";
            }

            if (result.InformacionVenta.Descripcion.includes("Venta")) {
                var totalVenta = result.InformacionVenta.Entrega + result.InformacionVenta.Restante;
                mensaje = `Hola ${result.Cliente.Nombre} ${result.Cliente.Apellido}, ${saludo}. Le informamos que el día ${fecha} hemos registrado una venta por $${totalVenta} pesos. Con una cantidad de ${result.ProductosVenta.length} productos:`;


                for (var i = 0; i < result.ProductosVenta.length; i++) {
                    mensaje += ` ${result.ProductosVenta[i].Cantidad} ${result.ProductosVenta[i].Producto}`;
                }

                mensaje += `. Entrega de $${result.InformacionVenta.Entrega} pesos. El monto restante de la venta es de $${result.InformacionVenta.Restante} pesos, su primer fecha de cobro es ${fechaCobro}.`;
            
            } else {
                mensaje = `Hola ${result.Cliente.Nombre} ${result.Cliente.Apellido}, ${saludo}. Le informamos que el día ${fecha} hemos registrado un cobro por ${formatNumber(result.InformacionVenta.Entrega)} pesos.`;

              


                if (result.InformacionVenta.Restante > 0) {
                    mensaje += ` El monto restante de la venta es de ${formatNumber(result.InformacionVenta.Restante)} pesos, su nueva fecha de cobro es ${fechaCobro}.`
                }

                if (result.Cliente.Saldo > 0) {
                    mensaje += ` Saldo total de todas sus ventas es de ${formatNumber(result.Cliente.Saldo)} pesos.`
                }  else {
                    mensaje += ` No le queda saldo pendiente de sus ventas. `
                }

                mensaje += " Muchas gracias por confiar en Indumentaria DG"

            }



            const urlwsp = `https://api.whatsapp.com/send?phone=+54 9${result.Cliente.Telefono}&text=${mensaje}`;
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
        document.getElementById("divUsuarios").setAttribute("hidden", "hidden")
        
        
        document.getElementById("RendimientoMensual").removeAttribute("hidden")
        document.getElementById("RendimientoCobrado").removeAttribute("hidden")
        document.getElementById("lblrxdia").removeAttribute("hidden", "hidden")
        document.getElementById("lblrcobrador").removeAttribute("hidden", "hidden")
        $("#btnRendDiario").css("background", "#1B2631");
        $("#btnRendMensual").css("background", "#2E4053");


    }

    if (rendimiento == 'Diario' && !$('#grdRendimiento').is(':visible')) {

            $('#grdRendimiento').DataTable().clear().draw();
            await configurarDataDiario();

            document.getElementById("RendimientoMensual").setAttribute("hidden", "hidden")
            document.getElementById("RendimientoCobrado").setAttribute("hidden", "hidden")
            document.getElementById("lblrxdia").setAttribute("hidden", "hidden")
            document.getElementById("lblrcobrador").setAttribute("hidden", "hidden")

            document.getElementById("divCliente").removeAttribute("hidden")

            document.getElementById("RendimientoDiario").removeAttribute("hidden")

            document.getElementById("divUsuarios").removeAttribute("hidden")
            $("#btnRendMensual").css("background", "#1B2631");
            $("#btnRendDiario").css("background", "#2E4053");

    }


 

   

}