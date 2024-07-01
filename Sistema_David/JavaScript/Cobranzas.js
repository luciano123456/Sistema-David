const importacionMasiva = "";
const fileInput = document.getElementById("fileImportacionMasiva");
var filaSeleccionada = null;
let gridClientes;
let userSession;
var selectedCheckboxes = [];

$(document).ready(function () {

    document.getElementById("btnAsignarCobrador").style.display = "none";

    userSession = JSON.parse(sessionStorage.getItem('usuario'));

    cargarUsuarios();
    cargarZonas();
    cargarCobradoresFiltro();

    var fechaCobroDesde;
    var fechaCobroHasta;
    var dni

    if (localStorage.getItem("FechaCobroDesde") == null) {
        fechaCobroDesde = moment().add(-210, 'days').format('YYYY-MM-DD');
    } else {
        fechaCobroDesde = localStorage.getItem("FechaCobroDesde");
    }

    if (localStorage.getItem("FechaCobroHasta") == null) {
        fechaCobroHasta = moment().format('YYYY-MM-DD');
    } else {
        fechaCobroHasta = localStorage.getItem("FechaCobroHasta");
    }

    if (localStorage.getItem("Dni") == null) {
        Dni = "";
    } else {
        Dni = localStorage.getItem("Dni");
    }




   

    //localStorage.removeItem("FechaCobroDesde");
    //localStorage.removeItem("FechaCobroHasta");
    localStorage.removeItem("Dni");

    if (userSession.IdRol == 1) { //ROL ADMINISTRADOR
        $("#FechaCobroDesde").removeAttr("hidden");
        $("#FechaCobroHasta").removeAttr("hidden");
        $("#lblfechacobrodesde").removeAttr("hidden");
        $("#lblfechacobrohasta").removeAttr("hidden");
    }


    if (userSession.IdRol == 3) { //ROL ADMINISTRADOR
        document.getElementById("lblvendedor").style.display = "none";
        document.getElementById("Vendedores").style.display = "none";
        document.getElementById("lblcobrador").style.display = "none";
        document.getElementById("CobradorFiltro").style.display = "none";
        document.getElementById("lbldninombre").style.display = "none";
        document.getElementById("Dni").style.display = "none";
        fechaCobroDesde = moment().format('YYYY-MM-DD');
        fechaCobroHasta = moment().format('YYYY-MM-DD');

    }

    document.getElementById("FechaCobroDesde").value = fechaCobroDesde;
    document.getElementById("FechaCobroHasta").value = fechaCobroHasta;
    document.getElementById("Dni").value = Dni;

    configurarDataTable(-1, -1, fechaCobroDesde, fechaCobroHasta, "", -1);



    $("#btnCobranzas").css("background", "#2E4053");


}).on('init.dt', function () {
    if (data.Restante <= 0) {
        var cobranzaId = "Cobranza(" + data.Id + ")"
    }
    // Acciones a realizar una vez que los campos se hayan cargado

    verificarCobranzas();


});

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
            selectZonas = document.getElementById("Zonas");

            $('#Zonas option').remove();

            if (userSession.IdRol == 1 || userSession.IdRol == 3) { //ROL ADMINISTRADOR y Cobrador
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
            selectUsuarios = document.getElementById("Vendedores");




            $('#Vendedores option').remove();

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


function aplicarFiltros() {
    var idVendedor = document.getElementById("Vendedores").value;
    var idCobrador = document.getElementById("CobradorFiltro").value;
    var idZona = document.getElementById("Zonas").value;

    desmarcarCheckboxes();


    if (gridCobranzas) {
        gridCobranzas.destroy();
    }


    document.getElementById("btnAsignarCobrador").style.display = "none";

    configurarDataTable(idVendedor, idCobrador, document.getElementById("FechaCobroDesde").value, document.getElementById("FechaCobroHasta").value, document.getElementById("Dni").value, idZona);



    localStorage.setItem("FechaCobroDesde", document.getElementById("FechaCobroDesde").value);
    localStorage.setItem("FechaCobroHasta", document.getElementById("FechaCobroHasta").value);
    localStorage.setItem("Dni", document.getElementById("Dni").value);
}

function cobranzaVenta(id) {

    var table = $("#grdCobranzas").DataTable()



    document.getElementById("lblFechaCobro").removeAttribute("hidden");
    document.getElementById("FechaCobro").removeAttribute("hidden");
    document.getElementById("lblValorCuota").removeAttribute("hidden");
    document.getElementById("ValorCuota").removeAttribute("hidden");

    document.getElementById("Entrega").value = 0;
    document.getElementById("Observacion").value = "";

    const importeCobranza = parseInt(document.querySelector("#Entrega").value);

    document.getElementById("ValorInteres").value = 0;
    document.getElementById("lblValorInteres").removeAttribute("hidden", "hidden");
    document.getElementById("ValorInteres").removeAttribute("hidden", "hidden");



    table.rows().eq(0).each(function (index) {
        var row = table.row(index);

        let venta = row.data();

        if (venta.Id == id && venta.Restante > 0) {

            document.getElementById("IdVenta").innerText = id;
            document.getElementById("saldoRestante").innerText = venta.Restante
            document.getElementById("ValordelaCuota").innerText = "¡El valor de la cuota es de " + venta.ValorCuota + " pesos !";

            document.getElementById("ValorCuota").value = venta.ValorCuota;
            document.getElementById("FechaCobro").value = moment(venta.FechaCobro).add(7, 'days').format('YYYY-MM-DD');

            $("#cobranzaModal").modal("show");
        }

    });


}


const importeCobranza = document.querySelector("#Entrega");

importeCobranza.addEventListener("keyup", (e) => {
    const saldoRestante = parseInt(document.getElementById("saldoRestante").innerText);
    const importeCobranza = parseInt(document.querySelector("#Entrega").value);

    if (importeCobranza == 0 || document.querySelector("#Entrega").value == "") {
        document.getElementById("lblValorInteres").removeAttribute("hidden", "hidden");
        document.getElementById("ValorInteres").removeAttribute("hidden", "hidden");
    } else {
        document.getElementById("ValorInteres").value = 0;
        document.getElementById("lblValorInteres").setAttribute("hidden", "hidden");
        document.getElementById("ValorInteres").setAttribute("hidden", "hidden");
    }

    if (importeCobranza > saldoRestante) {
        document.getElementById("errorImporteCobranza").removeAttribute("hidden")
        document.getElementById("errorImporteCobranza").innerText = `El valor supera el restante de la venta (${formatNumber(saldoRestante)}) `
    } else if (importeCobranza == saldoRestante) {
        document.getElementById("lblFechaCobro").setAttribute("hidden", "hidden");
        document.getElementById("FechaCobro").setAttribute("hidden", "hidden");
        document.getElementById("lblValorCuota").setAttribute("hidden", "hidden");
        document.getElementById("ValorCuota").setAttribute("hidden", "hidden");
        document.getElementById("ValorCuota").value = 0
        document.getElementById("errorValorCuotaCobranza").setAttribute("hidden", "hidden");
    } else {
        document.getElementById("errorImporteCobranza").setAttribute("hidden", "hidden");
        document.getElementById("lblFechaCobro").removeAttribute("hidden", "hidden");
        document.getElementById("FechaCobro").removeAttribute("hidden", "hidden");
        document.getElementById("lblValorCuota").removeAttribute("hidden", "hidden");
        document.getElementById("ValorCuota").removeAttribute("hidden", "hidden");
    }

});

const importeValorCuotaCobranza = document.querySelector("#ValorCuota");

importeValorCuotaCobranza.addEventListener("keyup", (e) => {
    const saldoRestante = parseInt(document.getElementById("saldoRestante").innerText);
    const importeCobranza = parseInt(document.querySelector("#ValorCuota").value);

    if (importeCobranza > saldoRestante) {
        document.getElementById("errorValorCuotaCobranza").removeAttribute("hidden")
        document.getElementById("errorValorCuotaCobranza").innerText = "El valor supera el restante de la venta."
    } else {
        document.getElementById("errorValorCuotaCobranza").setAttribute("hidden", "hidden");
    }

});

async function hacerCobranza() {
    try {
        var url = "/Cobranzas/Cobranza";


        if (validarCobranza()) {
            let value = JSON.stringify({
                Id: document.getElementById("IdVenta").innerText,
                Entrega: document.getElementById("Entrega").value,
                FechaCobro: moment(document.getElementById("FechaCobro").value).format('DD/MM/YYYY'),
                Observacion: document.getElementById("Observacion").value,
                ValorCuota: document.getElementById("ValorCuota").value,
                Interes: document.getElementById("ValorInteres").value,
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

                const confirmacion = confirm('Cobranza realizada con éxito. ¿Deseas enviar el comprobante al cliente vía WhatsApp?');

                if (confirmacion) {
                    // El usuario ha confirmado, llamar a enviarWhatssap
                    enviarWhatssapId(document.getElementById("IdVenta").innerText, document.getElementById("ValorInteres").value);
                }

                $("#cobranzaModal").modal("hide");
                gridCobranzas.ajax.reload();

                //document.location.href = "../Index/";
            } else {
                alert('Los datos que has ingresado son incorrectos.');
            }
        }

    } catch (error) {
        alert('Ha ocurrido un error en los datos. Vuelva a intentarlo');
    }
}


function validarCobranza() {
    const saldoRestante = parseInt(document.getElementById("saldoRestante").innerText);
    const importeCobranza = document.querySelector("#Entrega").value;
    const importeValorCuotaCobranza = document.querySelector("#ValorCuota").value;

    var nuevaFecha = document.getElementById("FechaCobro").value;
    var fechaHoy = moment();

    if (importeCobranza > saldoRestante) {
        alert("El valor supera el restante de la venta");
        return false;
    } else if (importeValorCuotaCobranza > saldoRestante) {
        alert("El valor cuota supera el restante de la venta");
        return false;
    } else if (importeCobranza < saldoRestante && importeValorCuotaCobranza == "") {
        alert("Debes poner un valor cuota");
        return false;
    } else if (importeCobranza == "") {
        alert("Debes poner un importe");
        return false;
    }
    if (fechaHoy.isSameOrAfter(nuevaFecha, 'day') && fechaHoy.isSameOrAfter(nuevaFecha, 'month') && fechaHoy.isSameOrAfter(nuevaFecha, 'year')) {
        alert("La fecha de cobro debe ser superior al dia de la fecha.");
        return false;
    } else {
        return true;
    }
}

async function enviarWhatssapId(id, interes) {

    try {
        var url = "/Ventas/EnvWhatssapCobranza";

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

            $("#cobranzaModal").modal("hide");

            var fecha = moment(result.InformacionVenta.Fecha).format('DD/MM/YYYY');
            var fechaCobro = moment(result.Venta.FechaCobro).format('DD/MM/YYYY');

            const horaActual = new Date().getHours();

            let saludo;

            // Determinamos el saludo segun la hora



            const table = $('#grdCobranzas').DataTable();
            table.ajax.reload();



            if (horaActual > 5 && horaActual < 12) {
                saludo = "Buenos días";
            } else if (horaActual > 5 && horaActual < 20) {
                saludo = "Buenas tardes";
            } else {
                saludo = "Buenas noches";
            }






            mensaje = `Hola ${result.Cliente.Nombre} ${result.Cliente.Apellido}, ${saludo}. Le informamos que el día ${fecha} hemos registrado un cobro por ${formatNumber(result.InformacionVenta.Entrega)} pesos.`;

            if (parseInt(interes) > 0) {
                mensaje += ` Se ha agregado a la venta un interes de ${formatNumber(parseInt(interes))} pesos.`
            }


            if (result.InformacionVenta.Restante > 0) {
                mensaje += ` El monto restante de la venta es de ${formatNumber(result.InformacionVenta.Restante)} pesos, su nueva fecha de cobro es ${fechaCobro}.`
            }

            if (result.Cliente.Saldo > 0) {
                mensaje += ` Saldo total de todas sus ventas es de ${formatNumber(result.Cliente.Saldo)} pesos.`
            }

            mensaje += " Muchas gracias por confiar en Indumentaria DG"


            const urlwsp = `https://api.whatsapp.com/send?phone=+54 9${result.Cliente.Telefono}&text=${mensaje}`;
            window.open(urlwsp, '_blank');

        }
    } catch (error) {

    }
}


const configurarDataTable = async (idVendedor, idCobrador, fechaCobroDesde, fechaCobroHasta, DNI, idZona) => {
    gridCobranzas = $('#grdCobranzas').DataTable({
        "ajax": {
            "url": `/Cobranzas/Listar?idVendedor=${idVendedor}&IdCobrador=${idCobrador}&FechaCobroDesde=${fechaCobroDesde}&FechaCobroHasta=${fechaCobroHasta}&Dni=${DNI}&idZona=${idZona}`,
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },

        rowReorder: true,
        "colReorder": true, // Habilita la extensión ColReorder
        "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
        "columns": [

            {
                "data": "Orden",
                "render": function (data, type, row) {
                    var ventaId = row.Id; // Obtener el ID de la venta de la fila
                    var importante = row.Orden;

                    if (type === "display") {
                        if (data === 999) {
                            // Si el orden es 999, mostrar "-" y permitir la edición al hacer clic
                            return '<span style="margin-left: 5px; margin-right: 5px; cursor: pointer;" ' +
                                'onclick="makeEditable(' + ventaId + ')">' +
                                '<label id="ordenLabel_' + ventaId + '" style="cursor: pointer;">-</label>' +
                                '</span>';
                        } else {
                            // Mostrar el número y permitir la edición al hacer clic en el ordenLabel
                            return '<span style="margin-left: 5px; margin-right: 5px; cursor: pointer;">' +
                                '<i class="fa fa-arrow-up" style="font-size: 14px; color: green; cursor: pointer;" onclick="columnUp(' + ventaId + ')"></i> ' +
                                '<label id="ordenLabel_' + ventaId + '" style="margin-left: 5px; margin-right: 5px; cursor: pointer;" ' +
                                'onclick="makeEditable(' + ventaId + ')">' +
                                '<span>' + data + '</span>' +
                                '</label>' +
                                '<i class="fa fa-arrow-down" style="font-size: 14px; color: red; cursor: pointer;" onclick="columnDown(' + ventaId + ')"></i>' +
                                '</span>';
                        }
                    } else {
                        return data;
                    }
                },
            },



            {
                "data": "Cliente",
                "render": function (data, type, row) {
                    return '<span class="cliente-tooltip" data-toggle="tooltip" data-placement="bottom" data-trigger="hover touch" title="' + data + '">' +
                        '<a href="javascript:void(0);" class="cliente-link-no-style">' + data + '</a></span>';
                    return data;
                }
            },

            { "data": "Zona" },
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
            { "data": "ValorCuota" },
            { "data": "Entrega" },

            { "data": "Restante" },
            { "data": "FechaCobro" },




            {
                "data": "Vendedor",
                "render": function (data, type, row) {
                    var primeraLetra = data.charAt(0);
                    return primeraLetra;
                },
                width: "00px",
            },





            {
                "data": "Id",
                "render": function (data, type, full) {

                    const isChecked = false;


                    const checkboxClass = isChecked ? 'fa-check-square-o' : 'fa-square-o';
                    const checkboxColor = isChecked ? 'green' : 'red';


                    const telefono = `+54 9${full.TelefonoCliente}`;
                    iconoCobrador = `<button class='btn btn-sm btnacciones' type='button' id='Cobranza(${data})' onclick='cobranzaVenta(${data})' title='Cobranza'><i class='fa fa-money fa-lg text-white'></i></button>`
                    iconosAdmin = `<button class='btn btn-sm btnacciones' type = 'button' id = 'infoVenta(${data})' onclick = 'informacionVenta(${data})' title = 'Informacion de la Venta' > <i class='fa fa-info-circle fa-lg text-white'></i></button >
                            <button class='btn btn-sm ms-1 btnacciones' type='button' onclick='modalWhatssap(${data})' title='Enviar Whatssap'><i class='fa fa-whatsapp fa-lg text-white' aria-hidden='true'></i></button>
                            <a class='btn btn-sm btnacciones' href='tel:${telefono}' title='Llamar ${telefono}'><i class='fa fa-phone text-white'></i></a>
                            <span class="custom-checkbox" data-id="${data}">
                            <i class="fa ${checkboxClass} checkbox"></i>
                            </span>`


                    if (userSession.IdRol == 1) {
                        return iconoCobrador + iconosAdmin
                    } else if (userSession.IdRol == 3) {
                        return iconoCobrador
                    }

                },
                width: "200px",
                "orderable": true,
                "searchable": true,
            },
        ],

        "rowReorder": {
            "selector": 'td:not(:first-child)', // Permite arrastrar filas excepto la primera columna
            "snapX": true, // Hace que las filas se ajusten a la posición del mouse horizontalmente
            "update": true, // Actualiza automáticamente el orden en los datos del DataTable
            "dataSrc": '' // Utiliza el índice de la fila como valor de datos para actualizar
        },
        "fnRowCallback": function (nRow, data, row) {
            var fechaHoy = moment();
            var fechaCobro = moment(data.FechaCobro).format('DD/MM/YYYY');
            var fechaLimite = moment(data.FechaLimite).format('DD/MM/YYYY');


            if (data.EstadoCliente == "Inhabilitado") {
                $('td', nRow).css('color', '#871D11'); // Cambiar color de la celda del cliente en rojo
                $('td:eq(3) a', nRow).css('color', '#871D11'); // Cambiar color de la celda del cliente en rojo
            } else if (data.EstadoCliente == "Regular") {
                $('td', nRow).css('color', '#EC9B1F'); // Cambiar color de la celda del cliente en verde
                $('td:eq(3) a', nRow).css('color', '#EC9B1F');
            }

            if (data.Restante <= 0) {
                var cobranzaId = "Cobranza(" + data.Id + ")";
                // Puedes ocultar el botón de la siguiente manera:
                // document.getElementById(cobranzaId).style.display = "none";
            }


        },


        "columnDefs": [
            {
                "render": function (data, type, row) {
                    return formatNumber(data); // Formatear número en la columna
                },
                "targets": [4, 5, 6] // Columnas Venta, Cobro, Capital Final
            },
            {
                "targets": [0, 9], // Índice de la primera columna a ocultar
                "visible": userSession.IdRol == 1 || userSession.IdRol == 3 ? 1 : 0, // Ocultar la columna
            },
            {
                targets: [7],
                render: function (data) {
                    return moment(data).format('DD/MM/YYYY');
                }
            }
        ],
    });


    $('#grdCobranzas').on('draw.dt', function () {
        $(document).off('click', '.custom-checkbox'); // Desvincular el evento para evitar duplicaciones
        $(document).on('click', '.custom-checkbox', handleCheckboxClick);
    });
    $('#grdCobranzas tbody').on('click', 'span.cliente-tooltip', function () {
        // Remover la clase que indica el color verde de todos los clientes
        $('.cliente-link-no-style').removeClass('nombre-cliente-verde');

        var row = $(this).closest('tr');

        // Remover la clase que indica el color de fondo verde de la fila seleccionada anterior
        if (filaSeleccionada) {

            $('td', filaSeleccionada).removeClass('nombre-cliente-verde');
            $('td:eq(3) a', filaSeleccionada).removeClass('nombre-cliente-verde');
        }

        // Obtener la fila actual
        filaSeleccionada = $(this).closest('tr');

        // Agregar la clase "nombre-cliente-verde" a la fila actual
        $('td', row).addClass('nombre-cliente-verde');
        $('td:eq(3) a', row).addClass('nombre-cliente-verde');

        var rowData = gridCobranzas.row(filaSeleccionada).data();
        var saldoCliente = rowData.SaldoCliente;
        var nombreClienteElement = $(this).find('a.cliente-link-no-style'); // Elemento del nombre del cliente

        // Agregar la clase que indica el color verde al nuevo cliente
        nombreClienteElement.addClass('nombre-cliente-verde');

        var nombreCliente = rowData.Cliente;
        var saldoLabel = document.getElementById("totsaldo");

        saldoLabel.textContent = `Saldo de ${nombreCliente} : ${formatNumber(saldoCliente)}`;
        var divSaldo = document.getElementById("divSaldo");
        divSaldo.removeAttribute("hidden");
    });






    $(document).on('click', '.custom-checkbox', function (event) {
        handleCheckboxClick();
    });

    // Inicializar los tooltips
    if ('ontouchstart' in window) {
        // Dispositivo táctil (móvil)
        $('.direccion-tooltip').tooltip({
            container: 'body',
            placement: 'bottom',
            trigger: 'hover',
        });
    } else {
        // Otros dispositivos (desktop)
        $('.direccion-tooltip').tooltip({
            container: 'body',
            placement: 'bottom',
            trigger: 'hover',
        });
    }
}

// Define la función handleCheckboxClick
function handleCheckboxClick() {
    var icon = $(this).find('.fa');
    icon.toggleClass('checked');

    var checkboxIndex = $('.custom-checkbox').index($(this));
    var ventaId = $(this).data('id');

    if (icon.hasClass('checked')) {
        icon.removeClass('fa-square-o');
        icon.addClass('fa-check-square');
        selectedCheckboxes.push(ventaId);
    } else {
        icon.removeClass('fa-check-square');
        icon.addClass('fa-square-o');
        var indexToRemove = selectedCheckboxes.indexOf(ventaId);
        if (indexToRemove !== -1) {
            selectedCheckboxes.splice(indexToRemove, 1);
        }
    }

    if (selectedCheckboxes.length > 0) {
        document.getElementById("btnAsignarCobrador").style.display = "block";
    } else {
        document.getElementById("btnAsignarCobrador").style.display = "none";
    }

    console.log(selectedCheckboxes);
}


function desmarcarCheckboxes() {
    // Obtener todos los elementos con la clase 'custom-checkbox' dentro de la tabla
    var checkboxes = gridCobranzas.cells('.custom-checkbox').nodes(); // Utiliza 'cells' para obtener las celdas en lugar de 'column'

    // Iterar sobre cada checkbox y desmarcarlo
    for (var i = 0; i < checkboxes.length; i++) {
        var icon = $(checkboxes[i]).find('.fa');

        // Desmarcar el checkbox
        icon.removeClass('fa-check-square');
        icon.addClass('fa-square-o');

        // Asegurarse de que la clase 'checked' esté eliminada
        icon.removeClass('checked');
    }

    // Limpiar el array de IDs seleccionados
    selectedCheckboxes = [];

    // Ocultar el botón
    document.getElementById("btnAsignarCobrador").style.display = "none";
}

function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) {
        return "$0"; // Devuelve un valor predeterminado si 'number' no es válido
    }

    const parts = number.toFixed(0).toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return "$" + parts.join(",");
}
function makeEditable(ventaId) {
    var label = document.getElementById('ordenLabel_' + ventaId);
    var valorActual = label.innerText;

    if (valorActual === "-") {
        valorActual = 999; // Si el valor es "-", establecerlo como 999 al editar
    }

    var input = document.createElement('input');
    input.type = 'number';
    input.value = valorActual;
    input.style.width = '50px';
    input.style.border = 'none';
    input.style.borderBottom = '2px solid red'; // Borde rojo en la parte inferior

    label.parentElement.replaceChild(input, label);

    // Agregar un evento para guardar los cambios cuando se presione Enter
    input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            var nuevoValor = input.value;

            // Realizar aquí la lógica para guardar el nuevo valor en la base de datos
            // y actualizar la vista si es necesario
            if (nuevoValor === 999) {
                // Si el nuevo valor es 999, establecer "-" nuevamente
                nuevoValor = "-";
            }

            // Luego, cambiar de nuevo a un label
            var nuevoLabel = document.createElement('label');
            nuevoLabel.id = 'ordenLabel_' + ventaId;
            nuevoLabel.style.marginRight = '5px';
            nuevoLabel.style.cursor = 'pointer';
            nuevoLabel.innerText = nuevoValor;

            input.parentElement.replaceChild(nuevoLabel, input);
        } else if (event.key === 'Escape') {
            // Si se presiona Escape, cancelar la edición y volver al valor original
            input.parentElement.replaceChild(label, input);
        }
    });

    // Agregar un evento para llamar a columnDown cuando se pierde el foco
    input.addEventListener('blur', function () {
        var orden = input.value;

        // Llamar a columnDown con el ID de la venta cuando se suelta el input
        if (orden === 999) {
            // Si el valor al salir es 999, establecerlo como "-"
            orden = "-";
        }
        columnSet(ventaId, orden);
    });

    // Enfocar el input para que el usuario pueda editar de inmediato
    input.focus();
}


const informacionVenta = async id => {
    localStorage.setItem("informacionVenta", id);
    document.location.href = "../../Ventas/Informacion";
}


function verificarCobranzas() {
    var table = $("#grdCobranzas").DataTable()

    table.rows().eq(0).each(function (index) {
        var row = table.row(index);

        let venta = row.data();

        if (venta.Restante <= 0) {
            var cobranzaId = "Cobranza(" + venta.Id + ")"
            var element = document.getElementById(cobranzaId);
            if (element) {
                element.style.background = "red";
            }
        }

    });
}


function mostrarDireccionCompleta(direccion) {
    alert("Dirección completa: " + direccion);
}


async function columnSet(id, orden) {
    try {
        var url = "/Cobranzas/ColumnSet";

        let value = JSON.stringify({
            id: id,
            orden: orden
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
            gridCobranzas.ajax.reload();

        }
    } catch (error) {
        console.error("Error en la función columnDown:", error);
    }
}

async function columnUp(id) {
    try {
        var url = "/Cobranzas/ColumnUp";

        let value = JSON.stringify({
            id: id,
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
            gridCobranzas.ajax.reload();

        }
    } catch (error) {
        console.error("Error en la función columnDown:", error);
    }
}

async function columnDown(id) {
    try {
        var url = "/Cobranzas/ColumnDown";

        let value = JSON.stringify({
            id: id,
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
            gridCobranzas.ajax.reload();
        }
    } catch (error) {
        console.error("Error en la función columnDown:", error);
    }
}

async function cobranzaImportante(id, importante) {

    let ordencolumn;

    if (importante == 1) {
        importante = 0;
        ordencolumn = 99999

    } else {
        importante = 1;
        ordencolumn = 1
    }

    try {
        if (importante == 1) {
            document.getElementById("IdVentaImportante").innerText = id;
            $("#importanteModal").modal("show");

        } else {
            var url = "/Cobranzas/ColumnImportante";

            let value = JSON.stringify({
                id: id,
                orden: ordencolumn,
                importante: importante
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
                gridCobranzas.ajax.reload();
            }
        }
    } catch (error) {
        console.error("Error en la función columnDown:", error);
    }
}

async function cobranzaImportanteModal() {

    try {
        var url = "/Cobranzas/ColumnImportante";

        if (document.getElementById("OrdenCobranza").value <= 0) {
            alert("Solo puedes poner un orden mayor a 0.");
            return
        }

        let value = JSON.stringify({
            id: document.getElementById("IdVentaImportante").innerText,
            orden: document.getElementById("OrdenCobranza").value,
            importante: 1
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
            gridCobranzas.ajax.reload();
            $("#importanteModal").modal("hide");
        }


    } catch (error) {
        console.error("Error en la función columnDown:", error);
    }
}

const modalWhatssap = async id => {
    $("#modalWhatssap").modal('show');
    $("#mensajewsp").val("");
    $("#idClienteWhatssap").val(id);
}

function abrirmodalCobrador() {
    cargarCobradores();
    $("#modalCobradores").modal("show");
}

async function cargarCobradores() {
    try {
        var url = "/usuarios/ListarCobradores";

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
            selectRol = document.getElementById("Cobrador");

            $('#Cobrador option').remove();
            for (i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre;
                selectRol.appendChild(option);
            }

        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

async function cargarCobradoresFiltro() {
    try {
        var url = "/usuarios/ListarCobradores";

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
            $('#CobradorFiltro option').remove();

            selectCobrador = document.getElementById("CobradorFiltro");

            if (userSession.IdRol == 1) {
                option = document.createElement("option");
                option.value = -1;
                option.text = "Todos";
                selectCobrador.appendChild(option);
            }


            for (i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre;
                selectCobrador.appendChild(option);
            }

        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

async function asignarCobrador() {

    try {
        var url = "/Cobranzas/AsignarCobrador";

        let value = JSON.stringify({
            cobranzas: JSON.stringify(selectedCheckboxes),
            idCobrador: document.getElementById("Cobrador").value
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


        if (result) {
            $("#modalCobradores").modal("hide");
            document.getElementById("btnAsignarCobrador").style.display = "none";
            alert("Cobranzas asignadas exitosamente.")
            const table = $('#grdCobranzas').DataTable();
            table.ajax.reload();
        } else {
            alert("No se han podido asignar las cobranzas correctamente.")
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

async function enviarWhatssap() {

    try {
        var url = "/Ventas/EnvWhatssap";

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