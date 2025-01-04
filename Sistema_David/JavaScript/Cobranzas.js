const importacionMasiva = "";
const fileInput = document.getElementById("fileImportacionMasiva");
var filaSeleccionada = null;
let gridClientes;
let userSession;
var selectedCheckboxes = [];
let lastCobranzaTime = 0;

$(document).ready(async function () {


    userSession = JSON.parse(sessionStorage.getItem('usuario'));


    document.getElementById("btnAsignarCobrador").style.display = "none";
    document.getElementById("btnAsignarTurno").style.display = "none";

    cargarUsuarios();
    cargarZonas();
    cargarTurnosFiltro();
    cargarCobradoresFiltro();
    cargarTiposDeNegocio();

    var fechaCobroDesde;
    var fechaCobroHasta;
    var dni;

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

    if (userSession.IdRol == 3) { //ROL COBRADOR
        document.getElementById("lblvendedor").style.display = "none";
        document.getElementById("Vendedores").style.display = "none";
        document.getElementById("lblcobrador").style.display = "none";
        document.getElementById("CobradorFiltro").style.display = "none";
        document.getElementById("lbldninombre").style.display = "none";
        document.getElementById("Dni").style.display = "none";
        fechaCobroDesde = moment().format('YYYY-MM-DD');
        fechaCobroHasta = moment().format('YYYY-MM-DD');

    }

    if (userSession.IdRol == 4) {
        fechaCobroDesde = moment().format('YYYY-MM-DD');
        fechaCobroHasta = moment().format('YYYY-MM-DD');
    }

    document.getElementById("FechaCobroDesde").value = fechaCobroDesde;
    document.getElementById("FechaCobroHasta").value = fechaCobroHasta;
    document.getElementById("Dni").value = Dni;


    $("#btnCobranzas").css("background", "#2E4053");

    await buscarRecorridos()

    configurarDataTable(-1, -1, fechaCobroDesde, fechaCobroHasta, document.getElementById("Dni").value, -1, "Todos", -1);
    aplicarFiltros()


}).on('init.dt', function () {
    if (data.Restante <= 0) {
        var cobranzaId = "Cobranza(" + data.Id + ")"
    }
    // Acciones a realizar una vez que los campos se hayan cargado

    verificarCobranzas();


});


function calcularRestanteCuota() {

    var chkCuota = document.getElementById("checkValorCuota");
    const saldoRestante = parseInt(document.getElementById("saldoRestante").innerText);
    const Importe = document.getElementById("Entrega").value != "" ? document.getElementById("Entrega").value : 0;
    const valorCuota = document.getElementById("ValorCuotahidden").value;

    if (chkCuota.checked) {
        document.getElementById("ValorCuota").value = saldoRestante - Importe;
    } else {
        document.getElementById("ValorCuota").value = valorCuota;
    }

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
            selectZonas = document.getElementById("Zonas");

            $('#Zonas option').remove();

            if (userSession.IdRol == 1 || userSession.IdRol == 3 || userSession.IdRol == 4) { //ROL ADMINISTRADOR, Cobrador y Comprobantes
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
            selectUsuarios = document.getElementById("Vendedores");




            $('#Vendedores option').remove();

            if (userSession.IdRol == 1 || userSession.IdRol == 4) { //ROL ADMINISTRADOR y Comprobantes
                option = document.createElement("option");
                option.value = -1;
                option.text = "Todos";
                selectUsuarios.appendChild(option);
            }

            for (i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre
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
    var tipoNegocio = document.getElementById("TipoNegocio").value;
    var Turno = document.querySelector('#TurnoFiltro option:checked').textContent;

    desmarcarCheckboxes();


    if (gridCobranzas) {
        gridCobranzas.destroy();
    }


    document.getElementById("btnAsignarCobrador").style.display = "none";
    document.getElementById("btnAsignarTurno").style.display = "none";
    document.getElementById("selectAllCheckbox").checked = false;

    configurarDataTable(idVendedor, idCobrador, document.getElementById("FechaCobroDesde").value, document.getElementById("FechaCobroHasta").value, document.getElementById("Dni").value, idZona, Turno, tipoNegocio);



    localStorage.setItem("FechaCobroDesde", document.getElementById("FechaCobroDesde").value);
    localStorage.setItem("FechaCobroHasta", document.getElementById("FechaCobroHasta").value);
    localStorage.setItem("Dni", document.getElementById("Dni").value);
}

const estadoHome = async () => {

    try {

        var url = "/Cobranzas/AgregarInformacionCobranza";

        let value = JSON.stringify({
            IdVenta: document.getElementById("idVentaHome").value,
            Observacion: document.getElementById("mensajeobs").value
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



        if (result.data == true) {
            const table = $('#grdCobranzas').DataTable();
            table.ajax.reload();
            $("#modalHomeCobranza").modal("hide");
            alert("Observacion agregada correctamente.")

        } else {
            alert('Ha ocurrido un error en los datos.')
        }
    } catch (error) {
        alert('Ha ocurrido un error en los datos.')
    }
}

function cobranzaVenta(id) {

    var table = $("#grdCobranzas").DataTable()



    document.getElementById("lblFechaCobro").removeAttribute("hidden");
    document.getElementById("FechaCobro").removeAttribute("hidden");
    document.getElementById("lblValorCuota").removeAttribute("hidden");
    document.getElementById("ValorCuota").removeAttribute("hidden");
    document.getElementById("TurnoCobro").removeAttribute("hidden", "hidden");
    document.getElementById("lblProximoTurno").removeAttribute("hidden", "hidden");
    document.getElementById("lblFranjaHoraria").removeAttribute("hidden", "hidden");
    document.getElementById("FranjaHorariaCobro").removeAttribute("hidden", "hidden");

    document.getElementById("Entrega").value = 0;
    document.getElementById("Observacion").value = "";
    document.getElementById("MetodoPago").value = "";
    document.getElementById("TurnoCobro").value = "";
    document.getElementById("FranjaHorariaCobro").value = "";
    document.getElementById("estadoCobro").value = "";

    const iconoPrincipal = document.getElementById('iconoPrincipal');
    const iconosAlternativos = document.getElementById('iconosAlternativos');

    iconoPrincipal.className = 'fa fa-home fa-3x text-dark cursor-pointer';

    const importeCobranza = parseInt(document.querySelector("#Entrega").value);

    document.getElementById("ValorInteres").value = 0;
    document.getElementById("lblValorInteres").removeAttribute("hidden", "hidden");
    document.getElementById("ValorInteres").removeAttribute("hidden", "hidden");

    $("#imgProducto").attr("src", "");
    $("#imgProducto").attr("hidden", "hidden");

    document.getElementById("imgProd").value = ""


    table.rows().eq(0).each(function (index) {
        var row = table.row(index);

        let venta = row.data();

        if (venta.Id == id && venta.Restante > 0) {

            document.getElementById("IdVenta").innerText = id;
            document.getElementById("saldoRestante").innerText = venta.Restante
            document.getElementById("ValordelaCuota").innerText = "¡El valor de la cuota es de " + venta.ValorCuota + " pesos !";

            document.getElementById("ValorCuota").value = venta.ValorCuota;
            document.getElementById("ValorCuotahidden").value = venta.ValorCuota;
            document.getElementById("FechaCobro").value = moment(venta.FechaCobro).add(7, 'days').format('YYYY-MM-DD');
            document.getElementById("estadoCobro").value = "";
             
            document.getElementById("checkValorCuota").checked = false;

            $("#cobranzaModal").modal("show");

            validarBotonesCobro();



        }

    });


}

validarBotonesCobro();

var timer = setInterval(validarBotonesCobro, 3000);


function validarBotonesCobro() {
    let now = new Date().getTime();

    if (now - localStorage.getItem("lastCobranzaTime") >= 6000) {
        $("#btnCobrar").removeClass('btn-danger');
        $("#btnCobrar").addClass('btn-primary');
    } else {
        $("#btnCobrar").removeClass('btn-primary');
        $("#btnCobrar").addClass('btn-danger');
    }
}


const importeCobranza = document.querySelector("#Entrega");

importeCobranza.addEventListener("keyup", (e) => {
    const saldoRestante = parseInt(document.getElementById("saldoRestante").innerText);
    const importeCobranza = parseInt(document.querySelector("#Entrega").value);
    // Obtener el elemento por ID
    const iconoCasa = document.getElementById('iconoCasa');


    

    if (importeCobranza == 0 || document.querySelector("#Entrega").value == "") {
        document.getElementById("lblValorInteres").removeAttribute("hidden", "hidden");
        document.getElementById("ValorInteres").removeAttribute("hidden", "hidden");

        iconoCasa.classList.remove('d-none');
    } else {
        document.getElementById("ValorInteres").value = 0;
        document.getElementById("lblValorInteres").setAttribute("hidden", "hidden");
        document.getElementById("ValorInteres").setAttribute("hidden", "hidden");
        document.getElementById('estadoCobro').value = "0"
        iconoCasa.classList.add('d-none');
    }

    if (importeCobranza > saldoRestante) {
        document.getElementById("errorImporteCobranza").removeAttribute("hidden")
        document.getElementById("errorImporteCobranza").innerText = `El valor supera el restante de la venta (${formatNumber(saldoRestante)}) `
    } else if (importeCobranza == saldoRestante) {
        document.getElementById("lblFechaCobro").setAttribute("hidden", "hidden");
        document.getElementById("FechaCobro").setAttribute("hidden", "hidden");
        document.getElementById("lblValorCuota").setAttribute("hidden", "hidden");
        document.getElementById("ValorCuota").setAttribute("hidden", "hidden");
        document.getElementById("checkValorCuota").setAttribute("hidden", "hidden");
        document.getElementById("TurnoCobro").setAttribute("hidden", "hidden");
        document.getElementById("lblProximoTurno").setAttribute("hidden", "hidden");
        document.getElementById("lblFranjaHoraria").setAttribute("hidden", "hidden");
        document.getElementById("FranjaHorariaCobro").setAttribute("hidden", "hidden");
        document.getElementById("ValorCuota").value = 0
        document.getElementById("errorValorCuotaCobranza").setAttribute("hidden", "hidden");

    } else {
        document.getElementById("errorImporteCobranza").setAttribute("hidden", "hidden");
        document.getElementById("lblFechaCobro").removeAttribute("hidden", "hidden");
        document.getElementById("FechaCobro").removeAttribute("hidden", "hidden");
        document.getElementById("lblValorCuota").removeAttribute("hidden", "hidden");
        document.getElementById("ValorCuota").removeAttribute("hidden", "hidden");
        document.getElementById("checkValorCuota").removeAttribute("hidden", "hidden");
        document.getElementById("TurnoCobro").removeAttribute("hidden", "hidden");
        document.getElementById("lblProximoTurno").removeAttribute("hidden", "hidden");
        document.getElementById("lblFranjaHoraria").removeAttribute("hidden", "hidden");
        document.getElementById("FranjaHorariaCobro").removeAttribute("hidden", "hidden");
    }

    calcularRestanteCuota();

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

        let now = new Date().getTime();

        if (now - localStorage.getItem("lastCobranzaTime") >= 6000) {
            var url = "/Cobranzas/Cobranza";


            if (validarCobranza()) {
                let value = JSON.stringify({
                    Id: document.getElementById("IdVenta").innerText,
                    Entrega: document.getElementById("Entrega").value,
                    FechaCobro: moment(document.getElementById("FechaCobro").value).format('DD/MM/YYYY'),
                    Observacion: document.getElementById("Observacion").value,
                    ValorCuota: document.getElementById("ValorCuota").value,
                    Interes: document.getElementById("ValorInteres").value,
                    MetodoPago: document.getElementById("MetodoPago").value,
                    FranjaHoraria: document.getElementById("FranjaHorariaCobro").value,
                    Turno: document.querySelector('#TurnoCobro option:checked').textContent,
                    EstadoCobro: document.getElementById("estadoCobro").value,
                    Imagen: document.getElementById("imgProd").value,
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

                    if (result.Status == 2) {
                        alert("No puedes hacerle una cobranza a ese cliente, ya que aun no es su turno en el recorrido")
                        return
                    };
                    if (result.Status == 3) {
                        alert("Ha ocurrido un error al hacer la cobranza")
                        return
                    };

                    if (result.Status == 1) {
                        const confirmacion = confirm('Cobranza realizada con éxito. ¿Deseas enviar el comprobante al cliente vía WhatsApp?');

                        if (confirmacion) {
                            // El usuario ha confirmado, llamar a enviarWhatssap
                            enviarWhatssapId(document.getElementById("IdVenta").innerText, document.getElementById("ValorInteres").value);
                        }

                        buscarRecorridos();
                        $("#cobranzaModal").modal("hide");
                        gridCobranzas.ajax.reload();

                        localStorage.setItem("lastCobranzaTime", now);

                        desmarcarCheckboxes();
                    }
                    //document.location.href = "../Index/";
                } else {
                    alert('Los datos que has ingresado son incorrectos.');
                }
            }

        } else {
            alert("Tienes que esperar al menos 6 segundos antes de volver a realizar esta acción.");
        }


    } catch (error) {
        alert('Ha ocurrido un error en los datos. Vuelva a intentarlo');
    }
}


function validarCobranza() {
    const saldoRestante = parseInt(document.getElementById("saldoRestante").innerText);
    const importeCobranza = document.querySelector("#Entrega").value;
    const importeValorCuotaCobranza = document.querySelector("#ValorCuota").value;
    const MetodoPago = document.querySelector("#MetodoPago").value;
    const FranjaHoraria = document.querySelector("#FranjaHorariaCobro").value;
    const Turno = document.querySelector("#TurnoCobro").value;
    const EstadoCobro = document.querySelector("#estadoCobro").value;


    var nuevaFecha = moment(document.getElementById("FechaCobro").value, "YYYY-MM-DD");
    var fechaHoy = moment();
    var fechaLimite = moment().add(30, 'days');


    if (importeCobranza > saldoRestante) {
        alert("El valor supera el restante de la venta");
        return false;
    } else if (importeValorCuotaCobranza > saldoRestante) {
        alert("El valor cuota supera el restante de la venta");
        return false;
    } else if (importeCobranza > 0 && MetodoPago == "") {
        alert("Debes poner un Metodo de Pago");
        return false;
    } else if (importeCobranza < saldoRestante && Turno == "") {
        alert("Debes poner un Turno");
        return false;
    } else if (importeCobranza < saldoRestante && FranjaHoraria == "") {
        alert("Debes poner una Franja Horaria");
        return false;
    } else if (importeCobranza < saldoRestante && importeValorCuotaCobranza == "") {
        alert("Debes poner un valor cuota");
        return false;
    } else if (importeCobranza == "") {
        alert("Debes poner un importe");
        return false;
    } else if (importeCobranza <= 0 && EstadoCobro == "") {
        alert("Debes poner un Estado de Cobro");
        return false;
    }
    if (importeCobranza < saldoRestante && importeValorCuotaCobranza < saldoRestante && fechaHoy.isSameOrAfter(nuevaFecha, 'day') && fechaHoy.isSameOrAfter(nuevaFecha, 'month') && fechaHoy.isSameOrAfter(nuevaFecha, 'year')) {
        alert("La fecha de cobro debe ser superior al dia de la fecha.");
        return false;
    } else if (userSession.IdRol != 1 && nuevaFecha.isAfter(fechaLimite, 'day')) {
        alert("La fecha de cobro no debe superar los 30 días a partir de hoy.");
        return false;
    } else {
        return true;
    }
}

function habilitarCBU() {
    var formaPagoSelect = document.getElementById("MetodoPago");
    var cbuInput = document.getElementById("CBU");
    var cbuLbl = document.getElementById("lblCBU");

    if (formaPagoSelect.value.toUpperCase() === "TRANSFERENCIA PROPIA" || formaPagoSelect.value.toUpperCase() === "TRANSFERENCIA A TERCEROS") {
        cbuInput.hidden = false;
        cbuLbl.hidden = false;
    } else {
        cbuInput.hidden = true;
        cbuLbl.hidden = true;
        // También puedes limpiar el valor del input si está deshabilitado
        cbuInput.value = "";
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


            desmarcarCheckboxes();


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


const configurarDataTable = async (idVendedor, idCobrador, fechaCobroDesde, fechaCobroHasta, DNI, idZona, Turno, tipoNegocio) => {
    gridCobranzas = $('#grdCobranzas').DataTable({
        "ajax": {
            "url": `/Cobranzas/Listar?idVendedor=${idVendedor}&IdCobrador=${idCobrador}&FechaCobroDesde=${fechaCobroDesde}&FechaCobroHasta=${fechaCobroHasta}&Dni=${DNI}&idZona=${idZona}&Turno=${Turno}&TipoNegocio=${tipoNegocio}`,
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },

        scrollX: true,

        rowReorder: true,
        "colReorder": true, // Habilita la extensión ColReorder
        "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
        "columns": [

            {
                "data": "Orden",
                "render": function (data, type, row) {
                    var ventaId = row.Id; // Obtener el ID de la venta de la fila
                    var recorridoId = row.IdRecorrido; // Obtener el ID de la venta de la fila
                    var enRecorrido = row.EnRecorrido && userSession.Id == row.IdUsuarioRecorrido;
                    var idCliente = row.idCliente;

                    // Usar el orden del recorrido si está en recorrido, de lo contrario usar el orden de la cobranza
                    var ordenMostrar = enRecorrido ? row.OrdenRecorridoCobro : data;

                    if (type === "display") {
                        if (enRecorrido) {
                            // Mostrar solo el orden sin acciones si está en recorrido
                            if (row.OrdenRecorrido == row.OrdenRecorridoCobro ) {
                                return '<span style="margin-left: 5px; margin-right: 5px; cursor: pointer;">' +
                                    '<i class="fa fa-arrow-up" style="font-size: 14px; color: green; cursor: pointer;" onclick="columnUpRecorrido(' + recorridoId + ')"></i> ' +
                                    '<label id="ordenLabel_' + ventaId + '" style="margin-left: 5px; margin-right: 5px; cursor: pointer;">' +
                                    '<span>' + ordenMostrar + '</span>' +
                                    '</label>' +
                                    '<i class="fa fa-arrow-down" style="font-size: 14px; color: red; cursor: pointer;" onclick="columnDownRecorrido(' + recorridoId + ', ' + row.Id + ')"></i>' +
                                    '<i class="fa fa-trash" title="Eliminar" style="font-size: 16px; color: red; cursor: pointer; margin-left: 5px;" onclick="deleteRecorrido(' + recorridoId + ', ' + idCliente + ')"></i>'

                            } else {
                                return '<span style="margin-left: 5px; margin-right: 5px;">' + ordenMostrar + '</span>' +
                                    '<i class="fa fa-trash" title="Eliminar" style="font-size: 16px; color: red; cursor: pointer; margin-left: 5px;" onclick="deleteRecorrido(' + recorridoId + ', ' + idCliente + ')"></i>';


                            }
                        } else {
                            if (ordenMostrar === 999) {
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
                                    '<span>' + ordenMostrar + '</span>' +
                                    '</label>' +
                                    '<i class="fa fa-arrow-down" style="font-size: 14px; color: red; cursor: pointer;" onclick="columnDown(' + ventaId + ')"></i>' +
                                    '</span>';
                            }
                        }
                    } else {
                        return ordenMostrar;
                    }
                },
            },




            {
                "data": "Cliente",
                "render": function (data, type, row) {
                    // Crear el HTML para el cliente con el ícono de edición y el checkbox
                    const isChecked = false;
                    const checkboxClass = isChecked ? 'fa-check-square-o' : 'fa-square-o';
                    const checkbox = `<span class="custom-checkbox" data-id="${row.Id}">
                        <i class="fa ${checkboxClass} checkbox"></i>
                        </span>`;

                    return `${checkbox} <span class="cliente-tooltip" data-toggle="tooltip" data-placement="bottom" data-trigger="hover touch" title="${data}">
                        <a href="javascript:void(0);" class="cliente-link-no-style">${data}</a> 
                        <i class="fa fa-pencil fa-1x text-primary" title="Editar cliente" 
                        style="cursor: pointer;" 
                        onclick="editarCliente(${row.idCliente})"></i>
                        </span>`;
                }
            },


            {
                data: function (row) {

                    var direccionCorta = row.Direccion != null && row.Direccion.length > 20 ? row.Direccion.substring(0, 20) + '...' : row.Direccion;
                    if (row.Direccion && row.Direccion.trim() !== "" && row.Latitud && row.Longitud) {
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
                    return '<a href="javascript:void(0);" onclick="mostrarDireccionCompleta(\'' + row.Direccion + '\', 0, 0)" class="direccion-link">' + direccionCorta + '</a>';
                }
            },

            { "data": "ValorCuota" },
            { "data": "Entrega" },

            { "data": "Restante" },
            { "data": "FechaCobro" },
            { "data": "FechaLimite" },




            {
                "data": "Vendedor",

                "render": function (data, type, row) {
                    var primeraLetra = data != "" ?data.substring(0,3) + "..." : "";
                    return primeraLetra;
                },
                
            },




            {
                "data": "Cobrador",

                "render": function (data, type, row) {
                    var primeraLetra = data != "" ? data.substring(0, 3) + "..." : "";
                    return primeraLetra;
                },
               
            },

            {
                "data": "EnRecorrido",
                "visible": false // Esta columna será oculta
            },

            {
                "data": "Turno",

                "render": function (data, type, row) {
                    var primeraLetra = data.charAt(0)
                    return primeraLetra;
                },
            },


            {
                "data": "FranjaHoraria",
                "render": function (data, type) {
                    if (type === 'sort') {
                        // Extraer la hora de inicio para la ordenación
                        let startHour = data.split('-')[0];
                        // Asegurarse de que el formato es adecuado para ordenar
                        let hour = parseInt(startHour.split(':')[0], 10);
                        return hour;
                    }
                    // Formato de visualización (ajusta esto según tus necesidades)
                    return data;
                }
            },

            { "data": "Zona" },

            {
                "data": "Id",
                "render": function (data, type, row) {

                    const isChecked = false;


                    const checkboxClass = isChecked ? 'fa-check-square-o' : 'fa-square-o';
                    const checkboxColor = isChecked ? 'green' : 'red';
                    var comprobanteIconColor = row.Comprobante === 1 ? "green" : "red";
                    var modifiedButton = userSession.IdRol === 1 || userSession.IdRol === 4 || userSession.IdRol === 3? "<button class='btn btn-sm btneditar btnacciones' type = 'button' onclick = 'editarVenta(" + data + ")' title = 'Visualizar Venta' > <i class='fa fa-eye fa-lg text-warning' aria-hidden='true'></i></button>" : "";
                    var estadoCobroIconColor = row.EstadoCobro === "1" ? "red" : "white";
                    

                    const telefono = `+54 9${row.TelefonoCliente}`;
                    iconoCobrador = "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='modalHome(" + data + ")' title='Estado de Cobro' ><i class='fa fa-home fa-lg' style='color: " + estadoCobroIconColor + ";' aria-hidden='true'></i></button>" + 
                        modifiedButton +
                        `<button class='btn btn-sm btnacciones' type='button' id='Cobranza(${data})' onclick='cobranzaVenta(${data})' title='Cobranza'><i class='fa fa-money fa-lg text-white'></i></button>`
                    iconosAdmin = `<button class='btn btn-sm btnacciones' type = 'button' id = 'infoVenta(${data})' onclick = 'informacionVenta(${data})' title = 'Informacion de la Venta' > <i class='fa fa-info-circle fa-lg text-white'></i></button >` +
                        "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='imprimirComprobante(" + data + ")' title='Imprimir Comprobante' ><i class='fa fa-print fa-lg' style='color: " + comprobanteIconColor + ";' aria-hidden='true'></i></button>" +
                        `<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='modalWhatssap(${data})' title='Enviar Whatssap'><i class='fa fa-whatsapp fa-lg text-white' aria-hidden='true'></i></button>
                            <a class='btn btn-sm btnacciones' href='tel:${telefono}' title='Llamar ${telefono}'><i class='fa fa-phone text-white'></i></a>`



                    if (userSession.IdRol == 1 || userSession.IdRol == 4) {
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

        "order": [
            
           
            [11, 'asc'],
            [12, 'desc'],
            [0, 'asc']
        ],

        "fnRowCallback": function (nRow, data, row) {
            var fechaHoy = moment().startOf('day'); // Obtener la fecha de hoy sin la hora
            var fechaCobro = moment(data.FechaCobro).startOf('day'); // Obtener la fecha de cobro sin la hora
            var fechaLimite = moment(data.FechaLimite).startOf('day'); // Obtener la fecha límite sin la hora

            if (fechaHoy.isSame(fechaLimite)) {
                if (userSession.IdRol == 1)
                    $('td:eq(7)', nRow).css('background-color', '#871D11'); // Cambiar color de la celda del cliente en rojo
                else {
                    $('td:eq(6)', nRow).css('background-color', '#871D11'); // Cambiar color de la celda del cliente en rojo
                }
            }
            if (data.EstadoCliente == "Inhabilitado") {
                $('td', nRow).css('color', '#871D11'); // Cambiar color de la celda del cliente en rojo
                $('td:eq(3) a', nRow).css('color', '#871D11'); // Cambiar color de la celda del cliente en rojo
            } else if (data.EstadoCliente == "Regular") {
                $('td', nRow).css('color', '#EC9B1F'); // Cambiar color de la celda del cliente en verde
                $('td:eq(3) a', nRow).css('color', '#EC9B1F');
            }

            if (data.EnRecorrido == true && userSession.Id == data.IdUsuarioRecorrido) {
                //if (data.OrdenRecorridoCobro < data.OrdenRecorrido) {
                //    $('td', nRow).css('background-color', ' #2B25E9');
                if (data.OrdenRecorridoCobro == data.OrdenRecorrido) {
                    $('td', nRow).css('background-color', '#A2A183');
                } else if (data.OrdenRecorridoCobro > data.OrdenRecorrido) {
                    $('td', nRow).css('background-color', '#037068');
                }
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
                "targets": [3, 4, 5] // Columnas Venta, Cobro, Capital Final
            },
           
            {
                "targets": [6, 7],
                "render": function (data) {
                    return moment(data).format('DD/MM/YYYY'); // Formato de fecha
                }
            },
            {
                // Asumiendo que las franjas horarias están en estas columnas
                "targets": [12],
                "render": function (data) {
                    let startHour = data.split('-')[0];
                    let hour = parseInt(startHour.split(':')[0], 10);
                    return hour; // Convertir a número entero para ordenar
                }
            }
        ],

        "initComplete": function (settings, json) {
            if (![1, 3, 4].includes(userSession.IdRol)) {
                gridCobranzas.columns([0, 14]).visible(false);
            } else {
                gridCobranzas.columns([0, 14]).visible(true);
            }

            gridCobranzas.columns(10).visible(false);
        }
    });



    $('#grdCobranzas').on('draw.dt', function () {
        $(document).off('click', '.custom-checkbox'); // Desvincular el evento para evitar duplicaciones
        $(document).on('click', '.custom-checkbox', handleCheckboxClick);
    });
   




    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada

    $('#grdCobranzas tbody').on('click', 'tr', function () {
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

        var rowData = gridCobranzas.row(filaSeleccionada).data();
        var saldoCliente = rowData.SaldoCliente;
        var nombreClienteElement = $(this).find('a.cliente-link-no-style'); // Elemento del nombre del cliente

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
        if (userSession.IdRol == 1 || userSession.IdRol == 4) document.getElementById("btnAsignarCobrador").style.display = "block";
        document.getElementById("btnAsignarTurno").style.display = "block";
    } else {
        document.getElementById("btnAsignarCobrador").style.display = "none";
        document.getElementById("btnAsignarTurno").style.display = "none";
    }

    console.log(selectedCheckboxes);
}


const editarVenta = async id => {
    localStorage.setItem("idEditarVenta", id);
    localStorage.setItem("volverCobranzas", 1);
    document.location.href = "../../../Ventas/Editar/";
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
    document.getElementById("btnAsignarTurno").style.display = "none";
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

const imprimirComprobante = async id => {

    try {

        var url = "/Ventas/InformacionVentayProductos";

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
            facturaCliente = result.Venta.Cliente;
            const facturaPDF = generarFacturaPDF(result);
            descargarFacturaPDF(facturaPDF);

            enviarComprobante(id);

        } else {
            alert('Ha ocurrido un error en los datos.')
        }
    } catch (error) {
        alert('Ha ocurrido un error en los datos.')
    }
}

const enviarComprobante = async id => {

    try {
        var url = "/Ventas/EnviarComprobante";

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
            const table = $('#grdCobranzas').DataTable();
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



function generarFacturaPDF(factura) {

    const doc = new jsPDF();

    // ... Código anterior de generación de la factura ...



    // Insertar imagen en Base64
    const imagenBase64 = 'data:image/jpeg;base64,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';
    const options = {
        width: 50, // Ancho de la imagen en el PDF
        height: 50 // Alto de la imagen en el PDF
    };
    doc.addImage(imagenBase64, 'JPEG', 10, 0, options.width, options.height);


    // Factura
    doc.setFontSize(32);
    doc.setTextColor(115, 195, 178); // Texto en verde (RGB)
    doc.text('Comprobante', 200, 20, 'right');



    doc.setTextColor(0);
    // Fecha
    doc.setFontSize(12);
    doc.text('Documento no válido como factura', 200, 28, 'right');

    let fecha = moment().format('DD/MM/YYYY');
    doc.text(`Fecha: ${fecha}`, 200, 35, 'right');

    // Información de la factura

    doc.setFontSize(32);
    doc.setTextColor(115, 195, 178); // Texto en verde (RGB)
    doc.text(`David Godoy`, 10, 60);
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`Indumentaria Dg`, 10, 70);
    doc.text(`Vendedor: ${factura.Venta.Vendedor}`, 10, 78);

    // Detalles de los productos
    doc.setFontSize(12);
    const backgroundColor = [115, 195, 178]; // Color verde (RGB)

    let y = 83;

    // Encabezados de las columnas
    doc.setFillColor(backgroundColor[0], backgroundColor[1], backgroundColor[2]); // Fondo verde

    doc.rect(10, y, 190, 10, 'F');
    doc.text('ARTICULO', 12, 90);
    doc.text('CANT', 102, 90);
    doc.text('PRECIO', 142, 90);
    doc.text('Total', 182, 90);

    y = 100;

    let color = true;
    let total = 0;

    if (factura.Productos.length > 0) {
        factura.Productos.forEach(item => {



            if (color == true) {
                color = false;
            } else {
                const backgroundColor = [232, 238, 237]; // Color verde (RGB)
                // Encabezados de las columnas
                doc.setFillColor(backgroundColor[0], backgroundColor[1], backgroundColor[2]); // Fondo verde
                doc.rect(10, y - 7, 190, 10, 'F');
                ;
                color = true;
            }

            let preciounitario = item.PrecioTotal.toString() / item.Cantidad.toString();

            total += item.PrecioTotal;

            doc.setFontSize(12);
            doc.text(item.Producto, 12, y);
            doc.text(item.Cantidad.toString(), 107, y);
            doc.text(preciounitario.toString(), 147, y);
            doc.text(item.PrecioTotal.toString(), 180, y);



            // Dibujar línea separadora
            doc.setLineWidth(0.5);
            doc.line(10, y + 3, 200, y + 3);



            y += 10;



        });
    }

    // Total
    doc.setFontSize(14);
    doc.text(`SUBTOTAL: ${total}`, 150, y);
    doc.text(`ENTREGA: ${factura.Venta.Entrega}`, 150, y + 10);
    doc.text(`RESTANTE: ${factura.Venta.Restante.toString()}`, 150, y + 20);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`¿Alguna Pregunta?`, 10, y + 40);
    doc.text(`Envianos un Whatssap al (54 9)  3777 71-0884`, 10, y + 45);



    doc.setFontSize(32);
    doc.setTextColor(115, 195, 178); // Texto en verde (RGB)
    doc.text(`¡Gracias!`, 150, y + 40);
    doc.setTextColor(0);



    return doc;
}

function descargarFacturaPDF(facturaPDF) {
    facturaPDF.save(`factura_${facturaCliente}.pdf`);
}

function mostrarDireccionCompleta(direccion) {
    alert("Dirección completa: " + direccion);
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
            desmarcarCheckboxes();

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
            desmarcarCheckboxes();

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
            desmarcarCheckboxes();
        }
    } catch (error) {
        console.error("Error en la función columnDown:", error);
    }
}

async function columnUpRecorrido(id) {
    try {
        var url = "/Recorrido/ColumnUp";

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
            desmarcarCheckboxes();

        }
    } catch (error) {
        console.error("Error en la función columnDown:", error);
    }
}

async function columnDownRecorrido(id, idVenta) {
    try {
        var url = "/Recorrido/ColumnDown";

        let value = JSON.stringify({
            id: id,
            idVenta: idVenta,
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
            if (result == 1) {
                alert("Recorrido finalizado");
                buscarRecorridos();
            }
            gridCobranzas.ajax.reload();
            desmarcarCheckboxes();
        }
    } catch (error) {
        console.error("Error en la función columnDown:", error);
    }
}

async function cobranzaImportante(id, importante) {

    let ordencolumn;

    if (importante == 1) {
        importante = 0;
        ordencolumn = 999

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
                desmarcarCheckboxes();
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
            desmarcarCheckboxes();
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

function abrirmodalTurno() {
    cargarTurnos();
    $("#modalTurnos").modal("show");
}


async function cargarTurnos() {
    var selectTurno = document.getElementById("Turno");
    $('#Turno option').remove();

    option = document.createElement("option");
    option.value = 0;
    option.text = "Mañana";

    selectTurno.appendChild(option);

    option = document.createElement("option");
    option.value = 1;
    option.text = "Tarde";

    selectTurno.appendChild(option);

}

async function cargarTurnosFiltro() {
    var selectTurno = document.getElementById("TurnoFiltro");
    $('#TurnoFiltro option').remove();


    option = document.createElement("option");
    option.value = 0;
    option.text = "Todos";

    selectTurno.appendChild(option);

    option = document.createElement("option");
    option.value = 1;
    option.text = "Mañana";

    selectTurno.appendChild(option);

    option = document.createElement("option");
    option.value = 2;
    option.text = "Tarde";

    selectTurno.appendChild(option);

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


            option = document.createElement("option");
            option.value = 0;
            option.text = "Sin Asignar";

            selectRol.appendChild(option);
            for (i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre + " (" + result.data[i].TotalCobranzas + ")";
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

            if (userSession.IdRol == 1 || userSession.IdRol == 4) {
                option = document.createElement("option");
                option.value = -1;
                option.text = "Todos";
                selectCobrador.appendChild(option);
            }


            for (i = 0; i < result.data.length; i++) {
                option = document.createElement("option");
                option.value = result.data[i].Id;
                option.text = result.data[i].Nombre + " (" + result.data[i].TotalCobranzas + ")";
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
            document.getElementById("btnAsignarTurno").style.display = "none";
            alert("Cobranzas asignadas exitosamente.")
            const table = $('#grdCobranzas').DataTable();
            table.ajax.reload();
            desmarcarCheckboxes();
        } else {
            alert("No se han podido asignar las cobranzas correctamente.")
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

async function asignarTurno() {

    try {
        var url = "/Cobranzas/AsignarTurno";

        let value = JSON.stringify({
            cobranzas: JSON.stringify(selectedCheckboxes),
            Turno: document.querySelector('#Turno option:checked').textContent
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
            $("#modalTurnos").modal("hide");
            document.getElementById("btnAsignarCobrador").style.display = "none";
            document.getElementById("btnAsignarTurno").style.display = "none";
            alert("Turnos asignados exitosamente.")
            const table = $('#grdCobranzas').DataTable();
            table.ajax.reload();
            desmarcarCheckboxes();
        } else {
            alert("No se han podido asignar las cobranzas correctamente.")
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


    const modalHome = async id => {
        $("#modalHomeCobranza").modal('show');
        $("#mensajeobs").val("");
        $("#idVentaHome").val(id);
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

function armarRecorrido() {

    var idVendedor = document.getElementById("Vendedores").value;
    var idCobrador = document.getElementById("CobradorFiltro").value;
    var idZona = document.getElementById("Zonas").value;
    var Turno = document.querySelector('#TurnoFiltro option:checked').textContent;
    var TipoNegocio = document.getElementById("TipoNegocio").value;

    localStorage.setItem("R_IdVendedor", idVendedor);
    localStorage.setItem("R_IdCobrador", idCobrador);
    localStorage.setItem("R_FechaCobroDesde", document.getElementById("FechaCobroDesde").value);
    localStorage.setItem("R_FechaCobroHasta", document.getElementById("FechaCobroHasta").value);
    localStorage.setItem("R_Dni", document.getElementById("Dni").value);
    localStorage.setItem("R_Zona", idZona);
    localStorage.setItem("R_Turno", Turno);
    localStorage.setItem("R_TipoNegocio", TipoNegocio);

    document.location.href = "../../../Recorrido/Index/";
}

async function borrarRecorrido() {

    var id = userSession.Id;
    var url = "/Recorrido/BorrarRecorridoUser";

    let value = JSON.stringify({
        id: id
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
        buscarRecorridos();
    }
}


async function buscarRecorridos() {
    var id = userSession.Id;
    var url = `/Recorrido/BuscarRecorridoUser?id=${id}`;

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

    let recorrido = await MakeAjax(options);

    if (recorrido.data != null) {
        document.getElementById("btnFinalizarRecorrido").style.display = "block";
        document.getElementById("btnArmarRecorrido").style.display = "none";
    } else {
        document.getElementById("btnFinalizarRecorrido").style.display = "none";
        document.getElementById("btnArmarRecorrido").style.display = "block";
    }
}

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

const editarCliente = async id => {
    localStorage.setItem("EdicionCliente", id);
    localStorage.setItem("EdicionCobranza", 1);
    document.location.href = "../../Clientes/Editar/";
}

async function deleteRecorrido(idRecorrido, idCliente) {
    var id = userSession.Id;
    var url = `/Recorrido/BorrarRecorridoCliente?idRecorrido=${idRecorrido}&idCliente=${idCliente}`;

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

    if (result == true) {
        gridCobranzas.ajax.reload();
        buscarRecorridos();
    }

}

const turnoCobroSelect = document.getElementById('TurnoCobro');
const franjaHorariaSelect = document.getElementById('FranjaHorariaCobro');

turnoCobroSelect.addEventListener('change', function () {
    let franjas;
    if (this.value === 'mañana') {
        franjas = generarFranjasHorarias(8, 15); // De 8:00 a 15:00
    } else if (this.value === 'tarde') {
        franjas = generarFranjasHorarias(15, 21); // De 15:00 a 21:00
    } else {
        franjas = []; // Si no se selecciona turno, no hay franjas
    }
    llenarFranjasHorarias(franjas);
});

// Función para generar franjas horarias
function generarFranjasHorarias(startHour, endHour) {
    const franjas = [];
    for (let i = startHour; i < endHour; i++) {
        let start = i;
        let end = i + 1;
        if (start < 10) start = '0' + start;
        if (end < 10) end = '0' + end;
        franjas.push(`${start}-${end}`);
    }
    return franjas;
}

// Función para llenar el select de franjas horarias
function llenarFranjasHorarias(franjas) {
    franjaHorariaSelect.innerHTML = ''; // Limpiar las opciones anteriores

    const option = document.createElement('option');
    option.value = "";
    option.textContent = "Seleccionar";
    franjaHorariaSelect.appendChild(option);

    franjas.forEach(franja => {
        const option = document.createElement('option');
        option.value = franja;
        option.textContent = franja;
        franjaHorariaSelect.appendChild(option);
    });
}
function toggleIcon() {
    const iconoPrincipal = document.getElementById('iconoPrincipal');
    const iconosAlternativos = document.getElementById('iconosAlternativos');

    if (iconosAlternativos.classList.contains('d-none')) {
        // Mostrar íconos alternativos y cambiar ícono principal a negro
        iconosAlternativos.classList.remove('d-none');
        iconoPrincipal.className = 'fa fa-home fa-3x text-dark cursor-pointer';
    } else {
        // Ocultar íconos alternativos y cambiar ícono principal a negro
        iconosAlternativos.classList.add('d-none');
        iconoPrincipal.className = 'fa fa-home fa-3x text-dark cursor-pointer';
    }
}

function cambiarColor(color) {
    const iconoPrincipal = document.getElementById('iconoPrincipal');
    const iconosAlternativos = document.getElementById('iconosAlternativos');

    if (color == 'text-danger') {
        document.getElementById('estadoCobro').value = "1"
    } else {
        document.getElementById('estadoCobro').value = "0"
    }

    // Cambiar el color del ícono principal
    iconoPrincipal.className = `fa fa-home fa-3x ${color} cursor-pointer`;

    // Ocultar íconos alternativos
    iconosAlternativos.classList.add('d-none');
}

// get a reference to the file input

const fileInputImg = document.getElementById("Imagen");


// listen for the change event so we can capture the file
fileInputImg.addEventListener("change", (e) => {
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


$('#selectAllCheckbox').on('click', function () {
    var isChecked = $(this).is(':checked'); // Verifica si está seleccionado
    var visibleRows = $('#grdCobranzas').DataTable().rows({ 'search': 'applied' }).nodes(); // Obtener todas las filas visibles

    // Recorrer cada fila visible y manejar la selección
    $(visibleRows).each(function () {
        var checkbox = $(this).find('.custom-checkbox .fa'); // Encuentra el ícono de checkbox en la fila
        var ventaId = $(this).find('.custom-checkbox').data('id'); // Obtén el id asociado a la fila

        // Si "Seleccionar Todos" está marcado, selecciona todas las filas visibles
        if (isChecked) {
            if (!checkbox.hasClass('checked')) {
                checkbox.addClass('checked fa-check-square').removeClass('fa-square-o'); // Marcar el ícono
                if (!selectedCheckboxes.includes(ventaId)) {
                    selectedCheckboxes.push(ventaId); // Agregar al array de seleccionados si no está ya
                }
            }
        } else {
            // Si no está marcado, deselecciona todas las filas visibles
            if (checkbox.hasClass('checked')) {
                checkbox.removeClass('checked fa-check-square').addClass('fa-square-o'); // Desmarcar el ícono
                var indexToRemove = selectedCheckboxes.indexOf(ventaId);
                if (indexToRemove !== -1) {
                    selectedCheckboxes.splice(indexToRemove, 1); // Quitar del array de seleccionados
                }
            }
        }
    });

    // Mostrar u ocultar botones basados en el estado de selectedCheckboxes
    toggleActionButtons();
});

// Función para mostrar/ocultar botones según el número de checkboxes seleccionados
function toggleActionButtons() {
    if (selectedCheckboxes.length > 0) {
        if (userSession.IdRol == 1 || userSession.IdRol == 4) document.getElementById("btnAsignarCobrador").style.display = "block";
        document.getElementById("btnAsignarTurno").style.display = "block";
    } else {
        document.getElementById("btnAsignarCobrador").style.display = "none";
        document.getElementById("btnAsignarTurno").style.display = "none";
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

            if (userSession.IdRol == 1 || userSession.IdRol == 4) { //ROL ADMINISTRADOR Y comprobantes
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