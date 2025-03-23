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
        document.getElementById("btnCuentaBancaria").style.display = "block";
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
        document.getElementById("btnCuentaBancaria").style.display = "block";
    }

    document.getElementById("FechaCobroDesde").value = fechaCobroDesde;
    document.getElementById("FechaCobroHasta").value = fechaCobroHasta;
    document.getElementById("Dni").value = Dni;


    $("#btnCobranzas").css("background", "#2E4053");

    await buscarRecorridos()

    configurarDataTable(-1, -1, fechaCobroDesde, fechaCobroHasta, document.getElementById("Dni").value, -1, "Todos", -1);


}).on('init.dt', function () {
    //if (data.Restante <= 0) {
    //    var cobranzaId = "Cobranza(" + data.Id + ")"
    //}
    //// Acciones a realizar una vez que los campos se hayan cargado

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

async function cobranzaVenta(id) {

    var table = $("#grdCobranzas").DataTable()
    await cargarCuentas();


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
                    IdCuenta: document.getElementById("CuentaPago").value,
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
            return;
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
    const interes = document.querySelector("#ValorInteres").value;


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
    } else if (importeCobranza <= 0 && interes == "") {
        alert("Debes poner un Interes");
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

function habilitarCuentas() {
    var formaPagoSelect = document.getElementById("MetodoPago");
    var cuenta = document.getElementById("CuentaPago");
    var cuentaLbl = document.getElementById("lblCuentaPago");

    if (formaPagoSelect.value.toUpperCase() === "TRANSFERENCIA PROPIA" || formaPagoSelect.value.toUpperCase() === "TRANSFERENCIA A TERCEROS") {
        cuenta.hidden = false;
        cuentaLbl.hidden = false;

    } else {
        cuenta.hidden = true;
        cuentaLbl.hidden = true;
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

            configurarOpcionesColumnas();

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

    // Factura sin imagen
    doc.setFontSize(32);
    doc.setTextColor(115, 195, 178); // Texto en verde (RGB)
    doc.text('Comprobante', 80, 20, 'right');

    doc.setTextColor(0);
    // Fecha
    doc.setFontSize(12);
    doc.text('Documento no válido como factura', 80, 28, 'right');

    let fecha = moment().format('DD/MM/YYYY');
    doc.text(`Fecha: ${fecha}`, 80, 35, 'right');

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

    let y = 90;

    // Encabezados de las columnas
    doc.setFillColor(backgroundColor[0], backgroundColor[1], backgroundColor[2]); // Fondo verde

    doc.rect(10, y, 190, 10, 'F');
    doc.text('ARTICULO', 12, 98);
    doc.text('CANT', 102, 98);
    doc.text('PRECIO', 142, 98);
    doc.text('Total', 182, 98);

    y = 108;

    let color = true;
    let total = 0;

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



        total += item.PrecioTotal * item.Cantidad;

        doc.setFontSize(12);
        doc.text(item.Producto, 12, y);
        doc.text(item.Cantidad.toString(), 107, y);
        doc.text(formatNumber(item.PrecioTotal), 147, y);
        doc.text(formatNumber(item.PrecioTotal * item.Cantidad), 180, y);



        // Dibujar línea separadora
        doc.setLineWidth(0.5);
        doc.line(10, y + 3, 200, y + 3);



        y += 10;



    });

    // Total
    doc.setFontSize(14);
    doc.text(`SUBTOTAL: ${formatNumber(total)}`, 150, y);
    doc.text(`ENTREGA: ${formatNumber(factura.Venta.Entrega)}`, 150, y + 10);
    doc.text(`RESTANTE: ${formatNumber(total - factura.Venta.Entrega)}`, 150, y + 20);

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


async function cargarCuentas() {
    try {
        var url = "/Cobranzas/ListaCuentasBancarias";

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
            select = document.getElementById("CuentaPago");

            $('#CuentaPago option').remove();

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

function configurarOpcionesColumnas() {
    const grid = $('#grdCobranzas').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas

    const storageKey = `Cobranzas_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = index != 2 ? col.data : "Direccion";

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


let accounts = [];


let selectedAccount = null;

// Renderizar la lista de cuentas
function renderAccounts() {
    const accountList = document.getElementById("accountList");
    accountList.innerHTML = ""; // Limpiar lista

    accounts.forEach(account => {
        const li = document.createElement("li");
        li.classList.add("list-group-item");
        li.classList.add("d-flex");
        li.classList.add("justify-content-between");
        li.classList.add("align-items-center");
        li.setAttribute("data-id", account.Id);

        // Agregar nombre y CBU a la cuenta
        li.innerHTML = `
            <span class="account-name">${account.Nombre}</span>
            <div>
                <button class="btn btn-warning btn-sm edit-btn" onclick="editAccount(${account.Id})">
                    <i class="fa fa-pencil"></i>
                </button>
                <button class="btn btn-danger btn-sm delete-btn" onclick="deleteAccount(${account.Id})">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        `;

        // Añadir evento para seleccionar la cuenta
        li.addEventListener("click", () => selectAccount(account, li));

        accountList.appendChild(li);
    });
}

// Función para seleccionar una cuenta y mostrar sus datos en los inputs
function selectAccount(account, item) {

    // Remover la clase 'active' de cualquier otra cuenta seleccionada
    const allAccounts = document.querySelectorAll("#accountList .list-group-item");
    allAccounts.forEach(item => item.classList.remove("active"));

    // Añadir la clase 'active' al item seleccionado

   
    item.classList.add("active");

    selectedAccount = account;
    
    document.getElementById("accountName").value = account.Nombre;
    document.getElementById("accountCBU").value = account.CBU;
}

// Función para editar una cuenta
function editAccount(id) {
    const account = accounts.find(a => a.Id === id);
    if (account) {
        // Pre-cargar los valores de la cuenta en los campos de texto
        document.getElementById("accountName").value = account.Nombre;
        document.getElementById("accountCBU").value = account.CBU;
        document.getElementById("accountName").removeAttribute("disabled");
        document.getElementById("accountCBU").removeAttribute("disabled");
        document.getElementById("editarCuenta").removeAttribute("hidden");
        document.getElementById("anadirCuenta").setAttribute("hidden", "hidden");
        document.getElementById("addAccount").setAttribute("hidden", "hidden");
        document.getElementById("canceladdAccount").removeAttribute("hidden");
        selectedAccount = account;
    }
}
// Función para editar una cuenta
function editarCuenta() {
    if (selectedAccount != null) {
        const updatedAccount = {
            Id: selectedAccount.Id,  // Suponiendo que el objeto 'selectedAccount' tiene un Id
            Nombre: document.getElementById("accountName").value.trim(),
            CBU: document.getElementById("accountCBU").value.trim()
        };

        fetch('/Cobranzas/EditarCuentaBancaria', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedAccount)  // Enviamos el objeto actualizado
        })
            .then(response => response.json())
            .then(result => {
                if (result) {
                    alert("Cuenta modificada con éxito");
                    cancelarNuevaCuenta();
                    loadCuentasBancarias();
                } else {
                    alert("Error al modificar la cuenta.");
                }
            })
            .catch(error => console.error('Error updating account:', error));
    }
}



// Función para eliminar una cuenta
function deleteAccount(id) {
    if (confirm("¿Estás seguro de que quieres eliminar esta cuenta?")) {
        fetch('/Cobranzas/EliminarCuentaBancaria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        })
            .then(response => response.json())
            .then(result => {
                if (result) {
                    loadCuentasBancarias();
                    selectedAccount = null;
                    document.getElementById("accountName").value = "";
                    document.getElementById("accountCBU").value = "";
                } else {
                    alert("Error al eliminar la cuenta.");
                }
            })
            .catch(error => console.error('Error deleting account:', error));
    }
}

function anadirCuenta() {
    selectedAccount = null;
    document.getElementById("accountName").value = "";
    document.getElementById("accountCBU").value = "";
    document.getElementById("accountName").removeAttribute("disabled");
    document.getElementById("accountCBU").removeAttribute("disabled");
    document.getElementById("anadirCuenta").setAttribute("hidden", "hidden");
    document.getElementById("addAccount").removeAttribute("hidden");
    document.getElementById("canceladdAccount").removeAttribute("hidden");

}

// Añadir nueva cuenta
document.getElementById("addAccount").addEventListener("click", () => {
    const Nombre = document.getElementById("accountName").value.trim();
    const cbu = document.getElementById("accountCBU").value.trim();
    if (!Nombre || !cbu) {
        alert("Debes completar ambos campos.");
        return;
    }

    const newAccount = { Nombre, cbu };

    fetch('/Cobranzas/NuevaCuentaBancaria', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAccount)
    })
        .then(response => response.json())
        .then(result => {
            if (result == 0) {
                alert("Cuenta añadida con éxito");
                document.getElementById("accountName").value = "";
                document.getElementById("accountCBU").value = "";
                loadCuentasBancarias();
            } else {
                alert("Error al añadir la cuenta.");
            }
        })
        .catch(error => console.error('Error adding account:', error));
});

async function cancelarNuevaCuenta() {
    document.getElementById("accountName").value = "";
    document.getElementById("accountCBU").value = "";
    document.getElementById("accountName").setAttribute("disabled", "disabled");
    document.getElementById("accountCBU").setAttribute("disabled", "disabled");
    document.getElementById("canceladdAccount").setAttribute("hidden", "hidden");
    document.getElementById("anadirCuenta").removeAttribute("hidden");
    document.getElementById("addAccount").setAttribute("hidden", "hidden");
    document.getElementById("editarCuenta").setAttribute("hidden", "hidden");
}

// Cargar cuentas bancarias desde el servidor
async function loadCuentasBancarias() {
    var url = "/Cobranzas/ListaCuentasBancarias";
    let value = JSON.stringify({});
    let options = {
        type: "POST",
        url: url,
        async: true,
        data: value,
        contentType: "application/json",
        dataType: "json"
    };

    let result = await MakeAjax(options);
    accounts = result;
    renderAccounts();
}

// Abrir el modal de cuentas bancarias
async function abrirModalCuentasBancarias() {
    await loadCuentasBancarias();
    $("#bankAccountsModal").modal('show');
}
