const importacionMasiva = "";
const fileInput = document.getElementById("fileImportacionMasiva");
var filaSeleccionada = null;
let gridClientes;
let userSession;
var selectedCheckboxes = [];
let lastCobranzaTime = 0;
let activoCuentasBancarias = 1
let gridCobranzas, gridCobranzasPendientes;

$(document).ready(async function () {


    userSession = JSON.parse(localStorage.getItem('usuario'));


    document.getElementById("btnAsignarCobrador").style.display = "none";
    document.getElementById("btnAsignarTurno").style.display = "none";

    $(".bloqueado").hide();


    cargarUsuarios();
    cargarZonas();
    cargarTurnosFiltro();
    cargarCobradoresFiltro();
    cargarTiposDeNegocio();

    var fechaCobroDesde;
    var fechaCobroHasta;
    var dni;

    if (userSession.IdRol == 1 || userSession.IdRol == 4) {
        document.getElementById("grdCobranzasPendientesDiv").removeAttribute("hidden")
    }

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

    await configurarDataTable(-1, -1, fechaCobroDesde, fechaCobroHasta, document.getElementById("Dni").value, -1, "Todos", -1, 0);
    await configurarDataTableCobrosPendientes();


}).on('init.dt', function () {
    verificarCobranzas();


});


// Mapeo de campos a los mensajes de error que deben limpiar
const mapaValidaciones = [
    {
        id: "Entrega",
        tipo: "input",
        mensaje: "Debes poner un importe"
    },
    {
        id: "TurnoCobro",
        tipo: "change",
        mensaje: "Debes seleccionar un Turno"
    },
    {
        id: "FranjaHorariaCobro",
        tipo: "change",
        mensaje: "Debes seleccionar una Franja Horaria"
    },
    {
        id: "estadoCobro",
        tipo: "change",
        mensaje: "Debes seleccionar un Estado de Cobro"
    },
    {
        id: "MetodoPago",
        tipo: "change",
        mensaje: "Debes poner un Método de Pago"
    },
    {
        id: "ValorInteres",
        tipo: "input",
        mensaje: "Debes poner un Interés"
    },
    {
        id: "ValorCuota",
        tipo: "input",
        mensaje: "Debes poner un valor cuota"
    }
];

const eventos = ["input", "change"];

mapaValidaciones.forEach(({ id, mensaje }) => {
    const campo = document.getElementById(id);
    if (!campo) return;

    eventos.forEach(tipo => {
        campo.addEventListener(tipo, () => {
            const valor = campo.value.trim();
            if (valor !== "" && valor !== "Seleccionar") {
                limpiarAlerta(mensaje);
            } else {
                agregarAlerta(mensaje);
            }
        });
    });
});



function calcularRestanteCuota() {

    var chkCuota = document.getElementById("checkValorCuota");
    const saldoRestante = parseInt(document.getElementById("saldoRestante").innerText);
    const Importe = document.getElementById("Entrega").value != "" ? document.getElementById("Entrega").value : 0;
    const valorCuota = document.getElementById("ValorCuotahidden").value;

    if (chkCuota.checked) {
        document.getElementById("ValorCuota").value = formatearMiles(saldoRestante - formatearSinMiles(Importe));
    } else {
        document.getElementById("ValorCuota").value = formatearMiles(valorCuota);
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

    configurarDataTable(idVendedor, idCobrador, document.getElementById("FechaCobroDesde").value, document.getElementById("FechaCobroHasta").value, document.getElementById("Dni").value, idZona, Turno, tipoNegocio, 0);



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

async function cobranzaVenta(id, tabla) {

    var table = $(`#${tabla}`).DataTable()
    


    document.getElementById("divNuevaFechaCobro").removeAttribute("hidden");
    document.getElementById("divNuevoValorCuota").removeAttribute("hidden");
    document.getElementById("divCheckValorCuota").removeAttribute("hidden");
    document.getElementById("divProximoTurno").removeAttribute("hidden");
    document.getElementById("divFranjaHoraria").removeAttribute("hidden");
    document.getElementById("divCuentaPago").setAttribute("hidden", "hidden");

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

    document.querySelector('#chkCobroPendiente').checked = false;

    document.getElementById("ValorInteres").value = 0;
    document.getElementById("divIntereses").removeAttribute("hidden", "hidden");

    $("#imgProducto").attr("src", "");
    $("#imgProducto").attr("hidden", "hidden");

    document.getElementById("imgProd").value = ""

    var divImagen = document.getElementById("divImagen");
    divImagen.hidden = true;

    limpiarAlertas();


    table.rows().eq(0).each(function (index) {
        var row = table.row(index);

        let venta = row.data();

        if (venta.Id == id && venta.Restante > 0) {

            document.getElementById("IdVenta").innerText = id;
            document.getElementById("saldoRestante").innerText = venta.Restante
            document.getElementById("ValordelaCuota").innerText = "¡El valor de la cuota es de " + formatNumber(venta.ValorCuota) + " pesos !";

            document.getElementById("ValorCuota").value = formatearMiles(venta.ValorCuota);
            document.getElementById("ValorCuotahidden").value = venta.ValorCuota;
            document.getElementById("FechaCobro").value = moment(venta.FechaCobro).add(7, 'days').format('YYYY-MM-DD');
            document.getElementById("estadoCobro").value = "";

            document.getElementById("divTipoInteres").setAttribute("hidden", "hidden");
            document.getElementById("TipoInteres").value = "";
            document.getElementById("latitudCliente").value = venta.Latitud;
            document.getElementById("longitudCliente").value = venta.Longitud;
             
            document.getElementById("checkValorCuota").checked = false;
            document.getElementById("progressBarContainerCobro").setAttribute("hidden", "hidden");

            localStorage.setItem("CobranzaCliente", venta.idCliente);

            //if (userSession.IdRol == 4) {
            //    const metodoPagoSelect = document.getElementById("MetodoPago");
            //    const opciones = metodoPagoSelect.options;

            //    for (let i = opciones.length - 1; i >= 0; i--) {
            //        if (opciones[i].value === "Efectivo") {
            //            metodoPagoSelect.remove(i);
            //        }
            //    }
            //}


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
    const saldoRestante = parseFloat(formatearSinMiles(document.getElementById("saldoRestante").innerText));
    const importeCobranza = parseFloat(formatearSinMiles(document.querySelector("#Entrega").value));
    const iconoCasa = document.getElementById('iconoCasa');

    if (importeCobranza == 0 || isNaN(importeCobranza)) {
        document.getElementById("divIntereses").removeAttribute("hidden");
        document.getElementById('TipoInteres').value = "";
        iconoCasa.classList.remove('d-none');
        agregarAlerta("Debes poner un Interés");

    } else {
        document.getElementById("ValorInteres").value = 0;
        document.getElementById("divIntereses").setAttribute("hidden", "hidden");
        document.getElementById("divTipoInteres").setAttribute("hidden", "hidden");

        document.getElementById('estadoCobro').value = "0";
        document.getElementById('TipoInteres').value = "";
        iconoCasa.classList.add('d-none');
        limpiarAlerta("Debes seleccionar un Estado de Cobro");
        limpiarAlerta("Debes poner un Interés");
    }

    if (importeCobranza > saldoRestante) {
        agregarAlerta(`El valor supera el restante de la venta (${formatNumber(saldoRestante)})`);
    } else {
        limpiarAlerta(`El valor supera el restante de la venta (${formatNumber(saldoRestante)})`);
    }

    if (importeCobranza === saldoRestante) {
        document.getElementById("divNuevaFechaCobro").setAttribute("hidden", "hidden");
        document.getElementById("divNuevoValorCuota").setAttribute("hidden", "hidden");
        document.getElementById("divCheckValorCuota").setAttribute("hidden", "hidden");
        document.getElementById("divProximoTurno").setAttribute("hidden", "hidden");
        document.getElementById("divFranjaHoraria").setAttribute("hidden", "hidden");
        document.getElementById("ValorCuota").value = 0;
        limpiarAlerta("Debes poner un valor cuota");
    } else {
        document.getElementById("divNuevaFechaCobro").removeAttribute("hidden");
        document.getElementById("divNuevoValorCuota").removeAttribute("hidden");
        document.getElementById("divCheckValorCuota").removeAttribute("hidden");
        document.getElementById("divProximoTurno").removeAttribute("hidden");
        document.getElementById("divFranjaHoraria").removeAttribute("hidden");
    }

    calcularRestanteCuota();
});

const importeValorCuotaCobranza = document.querySelector("#ValorCuota");

importeValorCuotaCobranza.addEventListener("keyup", (e) => {
    const saldoRestante = parseInt(document.getElementById("saldoRestante").innerText);
    const importeCobranza = parseInt(document.querySelector("#ValorCuota").value);

    if (importeCobranza > saldoRestante) {
        //document.getElementById("errorValorCuotaCobranza").removeAttribute("hidden")
        agregarAlerta("El nuevo valor supera el restante de la venta.")
    } else {
        limpiarAlerta("El nuevo valor supera el restante de la venta.")
        //document.getElementById("errorValorCuotaCobranza").setAttribute("hidden", "hidden");
    }

});

async function hacerCobranza() {
    try {

        let metodopago = document.getElementById("MetodoPago").value;


        let latActual, lngActual;
        let clienteLat, clienteLng;

        let now = new Date().getTime();

        if (now - localStorage.getItem("lastCobranzaTime") >= 6000 ) {
            var url = "/Cobranzas/Cobranza";

            if (metodopago.toUpperCase() === "EFECTIVO" && userSession.IdRol != 4 && userSession.IdRol != 1) {
            if (!navigator.geolocation) {
                errorModal("Tu navegador no soporta geolocalización.");
                return;
            }

            try {
                const posicion = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    });
                });

                latActual = posicion.coords.latitude;
                lngActual = posicion.coords.longitude;

                // seguir tu flujo...

            } catch (geoError) {
                if (geoError.code === 1) {
                    // PERMISSION_DENIED
                    await advertenciaModal("La ubicación es requerida para hacer el cobro. Debes habilitarla y otorgar permisos de acceso al navegador. Si estás en un teléfono, revisa la configuración de permisos de la app o navegador.");
                    return;
                } else if (geoError.code === 2) {
                    await advertenciaModal("No se pudo determinar tu ubicación actual. Intenta nuevamente en un lugar con mejor señal GPS.");
                    return;
                } else if (geoError.code === 3) {
                    await advertenciaModal("La solicitud de ubicación ha tardado demasiado. Intenta nuevamente.");
                    return;
                } else {
                    await advertenciaModal("Error desconocido al obtener la ubicación.");
                    return;
                }
                }
            }

            // 2️⃣ Traer ubicación anterior del cliente
            const idCliente = localStorage.getItem("CobranzaCliente");
            clienteLat = document.getElementById("latitudCliente").value;
            clienteLng = document.getElementById("longitudCliente").value;

            let seActualizoUbicacion = false;

          

            if (validarCobranza()) {

                // 3️⃣ Si tiene ubicación anterior, calcular distancia
                if (metodopago.toUpperCase() === "EFECTIVO" && userSession.IdRol != 4 && userSession.IdRol != 1) {
                    if (clienteLat && clienteLng) {
                        const distancia = calcularDistanciaMetros(clienteLat, clienteLng, latActual, lngActual);

                        if (distancia > 100) {
                            // Actualizar ubicación
                            const confirmacion1 = await confirmarModal("Estás a más de 100 metros de distancia del cliente. ¿Deseas actualizar la ubicación?");
                            if (!confirmacion1) {
                                await advertenciaModal("El cobro ha sido cancelado, ya que debes actualizar la ubicación.");
                                return false;
                            }

                            const confirmacion2 = await confirmarModal("Este cambio de ubicación será informado a un Administrador. ¿Desea continuar?");
                            if (!confirmacion2) {
                                await advertenciaModal("El cobro ha sido cancelado, ya que se debe informar a un Administrador.");
                                return false;
                            }

                            await enviarUbicacionAlServidor(idCliente, latActual, lngActual);
                            seActualizoUbicacion = true;
                        }
                    }
                }


                let value = JSON.stringify({
                    Id: document.getElementById("IdVenta").innerText,
                    Entrega: formatearSinMiles(document.getElementById("Entrega").value),
                    FechaCobro: moment(document.getElementById("FechaCobro").value).format('DD/MM/YYYY'),
                    Observacion: document.getElementById("Observacion").value,
                    ValorCuota: formatearSinMiles(document.getElementById("ValorCuota").value),
                    Interes: formatearSinMiles(document.getElementById("ValorInteres").value),
                    MetodoPago: metodopago,
                    FranjaHoraria: document.getElementById("FranjaHorariaCobro").value,
                    Turno: document.querySelector('#TurnoCobro option:checked').textContent,
                    TipoInteres: document.querySelector('#TipoInteres option:checked').textContent,
                    EstadoCobro: document.getElementById("estadoCobro").value,
                    IdCuenta: document.getElementById("CuentaPago").value,
                    Imagen: document.getElementById("imgProd").value,
                    CobroPendiente: document.querySelector('#chkCobroPendiente').checked,
                    ActualizoUbicacion: seActualizoUbicacion ? 1 : 0,
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
                        errorModal("No puedes hacerle una cobranza a ese cliente, ya que aun no es su turno en el recorrido")
                        return
                    };
                    if (result.Status == 3) {
                        errorModal("Ha ocurrido un error al hacer la cobranza")
                        return
                    };

                    if (result.Status == 1) {

                        if (userSession.IdRol == 1 || userSession.IdRol == 4) {
                            const confirmacion = await confirmarModal('Cobranza realizada con éxito. ¿Deseas enviar el comprobante al cliente vía WhatsApp?');

                            if (confirmacion) {
                                // El usuario ha confirmado, llamar a enviarWhatssap
                                enviarWhatssapId(document.getElementById("IdVenta").innerText, document.getElementById("ValorInteres").value);
                            }
                        } else {
                            exitoModal("Cobranza realizada con éxito.")
                        }

                        if (seActualizoUbicacion) {
                            advertenciaModal("Ubicacion del cliente actualizada correctamente.");
                        }


                        buscarRecorridos();
                        localStorage.removeItem("CobranzaCliente");
                        $("#cobranzaModal").modal("hide");
                        gridCobranzas.ajax.reload();
                        gridCobranzasPendientes.ajax.reload();

                        localStorage.setItem("lastCobranzaTime", now);

                        desmarcarCheckboxes();
                    }
                    //document.location.href = "../Index/";
                } else {
                    errorModal('Los datos que has ingresado son incorrectos.');
                }
            }

        } else {
            errorModal("Tienes que esperar al menos 6 segundos antes de volver a realizar esta acción.");
            return;
        }


    } catch (error) {
        alert('Ha ocurrido un error en los datos. Vuelva a intentarlo');
    }
}



function agregarAlerta(mensaje) {
    const contenedor = document.getElementById("alertasErrores");
    contenedor.classList.remove("d-none");

    // Normaliza el texto para evitar duplicados (trim, lowercase)
    const existe = [...contenedor.children].some(div =>
        div.innerText.trim().toLowerCase() === mensaje.trim().toLowerCase()
    );

    if (existe) return;

    const div = document.createElement("div");
    div.className = "d-flex align-items-center";
    div.innerHTML = `<i class="fa fa-exclamation-triangle text-warning alert-icon me-2"></i><span>${mensaje}</span>`;
    contenedor.appendChild(div);
}

function limpiarAlerta(mensaje) {
    const contenedor = document.getElementById("alertasErrores");

    [...contenedor.children].forEach(div => {
        const texto = div.innerText.trim().toLowerCase();
        if (texto === mensaje.trim().toLowerCase()) {
            div.remove();
        }
    });

    if (contenedor.children.length === 0) {
        contenedor.classList.add("d-none");
    }
}



function validarCobranza() {
    limpiarAlertas();
    let valido = true;

    const saldoRestante = parseFloat(formatearSinMiles(document.getElementById("saldoRestante").innerText)) || 0;
    const importe = formatearSinMiles(document.getElementById("Entrega").value);
    const cuota = formatearSinMiles(document.getElementById("ValorCuota").value) || 0;
    const metodo = document.getElementById("MetodoPago").value.trim();
    const franja = document.getElementById("FranjaHorariaCobro").value.trim();
    const turno = document.getElementById("TurnoCobro").value.trim();
    const estado = document.getElementById("estadoCobro").value.trim();
    const interes = document.getElementById("ValorInteres").value.trim();
    const cuenta = document.getElementById("CuentaPago").value.trim();
    const tipoInteres = document.getElementById("TipoInteres").value.trim();
    const img = document.getElementById("imgProd").value.trim();


    if ((metodo.toUpperCase() === "TRANSFERENCIA PROPIA" || metodo.toUpperCase() === "TRANSFERENCIA A TERCEROS") && img === "") {
        agregarAlerta("Debes poner una imagen de comprobante");
        valido = false;
    }

    if (importe == "" && importe != 0)  {
        agregarAlerta("Debes poner un importe");
        valido = false;
    }

    if (interes == "") {
        agregarAlerta("Debes poner un interes");
        valido = false;
    }

    if (importe > saldoRestante) {
        agregarAlerta("El valor supera el restante de la venta");
        valido = false;
    }

    if (cuota > saldoRestante) {
        agregarAlerta("El valor cuota supera el restante de la venta");
        valido = false;
    }

    if (importe > 0 && metodo === "") {
        agregarAlerta("Debes poner un Método de Pago");
        valido = false;
    }

    if ((metodo.toUpperCase().includes("TRANSFERENCIA")) && cuenta === "") {
        agregarAlerta("Debes seleccionar una cuenta");
        valido = false;
    }

    if (importe < saldoRestante && turno === "") {
        agregarAlerta("Debes seleccionar un Turno");
        valido = false;
    }

    if (importe < saldoRestante && franja === "") {
        agregarAlerta("Debes seleccionar una Franja Horaria");
        valido = false;
    }

    if (importe < saldoRestante && cuota === 0) {
        agregarAlerta("Debes poner un valor de cuota");
        valido = false;
    }

    if (importe <= 0 && estado === "" && tipoInteres === "") {
        agregarAlerta("Debes seleccionar un Estado de Cobro");
        valido = false;
    }

    if (importe <= 0 && interes === "") {
        agregarAlerta("Debes poner un Interés");
        valido = false;
    }

    const fecha = moment(document.getElementById("FechaCobro").value, "YYYY-MM-DD");
    const hoy = moment();
    const limite = moment().add(30, "days");

    if (importe < saldoRestante && cuota < saldoRestante && fecha.isSameOrBefore(hoy, 'day')) {
        agregarAlerta("La fecha de cobro debe ser superior al día de la fecha.");
        valido = false;
    }

    if (userSession.IdRol !== 1 && fecha.isAfter(limite, 'day')) {
        agregarAlerta("La fecha de cobro no debe superar los 30 días desde hoy.");
        valido = false;
    }

    return valido;
}

function limpiarAlertas() {
    const contenedor = document.getElementById("alertasErrores");
    contenedor.innerHTML = '';
    contenedor.classList.add("d-none");
}

async function habilitarCuentas() {
    var formaPagoSelect = document.getElementById("MetodoPago");
    var cuenta = document.getElementById("CuentaPago");
    var cuentaDiv = document.getElementById("divCuentaPago");
    var progressBarContainer = document.getElementById("progressBarContainerCobro");
    var divImagen = document.getElementById("divImagen");

    // Esperamos a cargar las cuentas
    await cargarCuentas();

    if (formaPagoSelect.value.toUpperCase() === "TRANSFERENCIA PROPIA" ||
        formaPagoSelect.value.toUpperCase() === "TRANSFERENCIA A TERCEROS") {
        cuentaDiv.hidden = false;
        progressBarContainer.hidden = false;
        divImagen.hidden = false;
        divImagen.classList.add("d-flex", "justify-content-center", "align-items-center");


        // Si el rol no es vendedor, mostramos los labels "Restante" y "Monto a entregar"
        if (userSession.IdRol == 1 || userSession.IdRol == 4) {
            document.getElementById("restante-labelCobro").hidden = false;
            document.getElementById("total-labelCobro").hidden = false;
            document.getElementById("entregas-labelCobro").hidden = false;
        } else {
            document.getElementById("restante-labelCobro").hidden = true;
            document.getElementById("total-labelCobro").hidden = true;
            document.getElementById("entregas-labelCobro").hidden = true;
        }

        // Seleccionar la primera cuenta automáticamente
        if (cuenta.options.length > 0) {
            cuenta.selectedIndex = 0;  // Selecciona la primera opción (ignora la opción vacía)
            var selectedAccountId = cuenta.value;
            var accountData = cuentasData.find(account => account.Id === parseInt(selectedAccountId));
            if (accountData) {
                // Actualizamos la barra de progreso para la cuenta seleccionada
                actualizarBarraProgresoCobro(accountData);
            }
        }
    } else {
        cuentaDiv.hidden = true;
        divImagen.hidden = true;
        divImagen.classList.remove("d-flex", "justify-content-center", "align-items-center");

        progressBarContainer.hidden = true;
    }

    // Cargar la barra de progreso cuando se selecciona una cuenta
    cuenta.addEventListener("change", function () {
        var selectedAccountId = cuenta.value;
        var accountData = cuentasData.find(account => account.Id === parseInt(selectedAccountId));
        if (accountData) {
            actualizarBarraProgresoCobro(accountData);
        }
    });
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

            localStorage.removeItem("CobranzaCliente");
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


            else if (result.InformacionVenta.TipoInteres === "INTERES DE 60 DIAS") {
                mensaje = `${saludo}, ${result.Cliente.Nombre}. Le informamos que el día ${fecha} su cuenta superó los 60 días de plazo máximo para abonar. Por este motivo, se han generado los siguientes cargos:\n\n` +
                    `*Interés aplicado:* ${formatNumber(result.InformacionVenta.Interes)}\n\n` +
                    `*Saldo pendiente de esta venta:* ${formatNumber(result.InformacionVenta.Restante)}\n\n` +
                    `*Saldo total de todas sus ventas:* ${formatNumber(result.Cliente.Saldo)}\n\n` +
                    `⚠️ *Próxima visita de cobro:* ${fechaCobro}\n\n` +
                    `Muchas gracias por confiar en INDUMENTARIADG.`;
            }


            else if (result.InformacionVenta.TipoInteres === "PROMESA DE PAGO") {
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
        }
    } catch (error) {

    }
}

const configurarDataTableCobrosPendientes = async () => {
    gridCobranzasPendientes = $('#grdCobranzasPendientes').DataTable({
        "ajax": {
            "url": `/Cobranzas/ListarPendientes`,
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
                            if (row.OrdenRecorrido == row.OrdenRecorridoCobro) {
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
                    var primeraLetra = data != "" ? data.substring(0, 3) + "..." : "";
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
                    var modifiedButton = userSession.IdRol === 1 || userSession.IdRol === 4 || userSession.IdRol === 3 ? "<button class='btn btn-sm btneditar btnacciones' type = 'button' onclick = 'editarVenta(" + data + ")' title = 'Visualizar Venta' > <i class='fa fa-eye fa-lg text-warning' aria-hidden='true'></i></button>" : "";
                    var estadoCobroIconColor = row.EstadoCobro === "1" ? "red" : "white";


                    const telefono = `+54 9${row.TelefonoCliente}`;
                    iconoCobrador = "<button class='btn btn-sm ms-1 btnacciones' type='button' onclick='modalHome(" + data + ")' title='Estado de Cobro' ><i class='fa fa-home fa-lg' style='color: " + estadoCobroIconColor + ";' aria-hidden='true'></i></button>" +
                        modifiedButton +
                        `<button class='btn btn-sm btnacciones' type='button' id='Cobranza(${data})' onclick='cobranzaVenta(${data}, "grdCobranzasPendientes")' title='Cobranza'><i class='fa fa-money fa-lg text-white'></i></button>`
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
                gridCobranzasPendientes.columns([0, 14]).visible(false);
            } else {
                gridCobranzasPendientes.columns([0, 14]).visible(true);
            }

            gridCobranzasPendientes.columns(10).visible(false);
        }
    });



    $('#grdCobranzasPendientes').on('draw.dt', function () {
        $(document).off('click', '.custom-checkbox'); // Desvincular el evento para evitar duplicaciones
        $(document).on('click', '.custom-checkbox', handleCheckboxClick);
    });





    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada

    $('#grdCobranzasPendientes tbody').on('click', 'tr', function () {
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

        var rowData = gridCobranzasPendientes.row(filaSeleccionada).data();
        var saldoCliente = rowData.SaldoCliente;
        var limiteCliente = rowData.LimiteVentas;
        var nombreClienteElement = $(this).find('a.cliente-link-no-style'); // Elemento del nombre del cliente

        var nombreCliente = rowData.Cliente;
        var saldoLabel = document.getElementById("totsaldo");

        saldoLabel.textContent = `Saldo de ${nombreCliente} : ${formatNumber(saldoCliente)}`;
        var divSaldo = document.getElementById("divSaldo");
        divSaldo.removeAttribute("hidden");

        var saldoLabel = document.getElementById("totLimite");

        saldoLabel.textContent = `Limite de ventas : ${formatNumber(limiteCliente)}`;
        var divLimite = document.getElementById("divLimite");
        divLimite.removeAttribute("hidden");

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


const configurarDataTable = async (idVendedor, idCobrador, fechaCobroDesde, fechaCobroHasta, DNI, idZona, Turno, tipoNegocio, cobrosPendientes) => {
    gridCobranzas = $('#grdCobranzas').DataTable({
        "ajax": {
            "url": `/Cobranzas/Listar?idVendedor=${idVendedor}&IdCobrador=${idCobrador}&FechaCobroDesde=${fechaCobroDesde}&FechaCobroHasta=${fechaCobroHasta}&Dni=${DNI}&idZona=${idZona}&Turno=${Turno}&TipoNegocio=${tipoNegocio}&CobrosPendientes=${cobrosPendientes}`,
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
                        `<button class='btn btn-sm btnacciones' type='button' id='Cobranza(${data})' onclick='cobranzaVenta(${data}, "grdCobranzas")' title='Cobranza'><i class='fa fa-money fa-lg text-white'></i></button>`
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
        var limiteCliente = rowData.LimiteVentas;
        var saldoLabel = document.getElementById("totsaldo");

        saldoLabel.textContent = `Saldo de ${nombreCliente} : ${formatNumber(saldoCliente)}`;
        var divSaldo = document.getElementById("divSaldo");
        divSaldo.removeAttribute("hidden");

        var saldoLabel = document.getElementById("totLimite");

        saldoLabel.textContent = `Limite de ventas : ${formatNumber(limiteCliente)}`;
        var divLimite = document.getElementById("divLimite");
        divLimite.removeAttribute("hidden");

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


let _ventaSeleccionada = null;
let _clienteSeleccionado = null;

function informacionVenta(idVenta) {
    // Buscar la fila en el DataTable de Cobranzas
    const row = gridCobranzas
        .row((idx, data) => parseInt(data.Id, 10) === parseInt(idVenta, 10))
        .data();

    if (!row) return;

    const ventaId = parseInt(idVenta, 10);
    const clienteId = parseInt(row.idCliente, 10);

    // Si no hay clienteId disponible, vamos directo a "solo esta venta"
    const canVerTodas = Number.isInteger(clienteId) && clienteId > 0;

    // Si tenés un modal para preguntar (opcional)
    const modalEl = document.getElementById('modalInfoSelector');

    if (!modalEl || !canVerTodas) {
        // Fallback: ver solo ESA venta (no hace falta una acción aparte)
        const urlUna = `/Ventas/Informacion?modo=una&ventaId=${encodeURIComponent(ventaId)}&from=cobranzas`;
        window.location.href = urlUna;
        return;
    }

    const $modal = new bootstrap.Modal(modalEl);
    $modal.show();

    // Ver solo ESA venta (la vista Informacion lee "modo=una" y carga por AJAX con /Ventas/EditarVenta)
    $('#btnSoloEsta').off('click').on('click', () => {
        $modal.hide();
        const url = `/Ventas/Informacion?modo=una&ventaId=${encodeURIComponent(ventaId)}&from=cobranzas`;
        window.location.href = url;
    });

    // Ver TODAS las ventas del cliente (la vista Informacion lee "modo=todas" y usa /Ventas/RestanteVentasCliente)
    $('#btnTodasCliente').off('click').on('click', () => {
        $modal.hide();
        const url = `/Ventas/Informacion?modo=todas&clienteId=${encodeURIComponent(clienteId)}&ventaId=${encodeURIComponent(ventaId)}&from=cobranzas`;
        window.location.href = url;
    });
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


let cuentasData = []; // Array global para guardar la información de las cuentas

async function cargarCuentas() {
    try {
        var url = "/Cobranzas/ListaCuentasBancariasTotales";

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

            cuentasData = result.map(account => ({
                Id: account.Id,
                Nombre: account.Nombre,
                MontoPagar: account.MontoPagar, // Asumiendo que tienes MontoPagar en la cuenta
                Entrega: account.Entrega // Asumiendo que tienes Entrega en la cuenta
            }));

            for (let i = 0; i < result.length; i++) {
                let option = document.createElement("option");
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


function habilitarCasaInteres() {
    const InteresSelect = document.getElementById('TipoInteres');
    const iconoCasa = document.getElementById('iconoCasa');

    if (InteresSelect.value === "" || InteresSelect.value === "0") {
        iconoCasa.classList.remove('d-none');

    } else {
        iconoCasa.classList.add('d-none');
    }
       
}

const InteresSelect = document.getElementById('ValorInteres');

InteresSelect.addEventListener('keyup', function () {
    if (this.value === "" || this.value === "0") {
        document.getElementById("divTipoInteres").setAttribute("hidden", "hidden");

        document.getElementById("divMetodoPago").removeAttribute("hidden");
        const iconoCasa = document.getElementById('iconoCasa');
        iconoCasa.classList.remove('d-none');
        iconoCasa.classList.add('d-none');
        agregarAlerta("Debes poner un importe");

    } else {


        limpiarAlerta("Debes poner un importe");
        document.getElementById("divTipoInteres").removeAttribute("hidden");
        document.getElementById("divMetodoPago").setAttribute("hidden", "hidden");
    }
});

document.querySelectorAll("#ValorInteres, #Entrega, #ValorCuota").forEach(input => {
    input.addEventListener("input", function () {
        const cursorPos = this.selectionStart;
        const originalLength = this.value.length;

        const formateado = formatearMiles(this.value);
        this.value = formateado;

        const newLength = formateado.length;
        this.setSelectionRange(
            cursorPos + (newLength - originalLength),
            cursorPos + (newLength - originalLength)
        );
    });
});



const tipoInteresSelect = document.getElementById('TipoInteres');


tipoInteresSelect.addEventListener('change', function () {
    if (this.value === "" || this.value === "0") {
        agregarAlerta("Debes seleccionar un Estado de Cobro");
    } else {
        limpiarAlerta("Debes seleccionar un Estado de Cobro");
    }
});



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
        agregarAlerta("Debes seleccionar un Estado de Cobro");
    } else {
        // Ocultar íconos alternativos y cambiar ícono principal a negro
        iconosAlternativos.classList.add('d-none');
        iconoPrincipal.className = 'fa fa-home fa-3x text-dark cursor-pointer';
        limpiarAlerta("Debes seleccionar un Estado de Cobro");
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
    limpiarAlerta("Debes seleccionar un Estado de Cobro");
}

// get a reference to the file input

const fileInputImg = document.getElementById("Imagen");


fileInputImg.addEventListener("change", (e) => {
    var files = e.target.files;
    let base64String = "";

    // obtener la referencia del archivo
    const file = files[0];

    // validar que no sea PDF
    if (file.type === "application/pdf") {
        alert("No se permite subir archivos PDF. Solo se permiten imágenes.");
        fileInputImg.value = ""; // resetea el input
        return;
    }

    // validar que sea una imagen
    if (!file.type.startsWith("image/")) {
        alert("El archivo seleccionado no es una imagen válida.");
        fileInputImg.value = ""; // resetea el input
        return;
    }

    // leer el archivo como base64
    const reader = new FileReader();
    reader.onloadend = () => {
        base64String = reader.result
            .replace("data:", "")
            .replace(/^.+,/, "");

        var inputImg = document.getElementById("imgProd");
        inputImg.value = base64String;

        $("#imgProducto").removeAttr('hidden');
        $("#imgProducto").attr("src", "data:image/png;base64," + base64String);
    };

    reader.readAsDataURL(file);
});



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

function renderAccounts() {
    const accountList = document.getElementById("accountList");
    accountList.innerHTML = "";

    if (accounts.length === 0) return;

    accounts.forEach(account => {
        const li = document.createElement("li");
        li.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center");

        if (account.Activo == 0) {
            li.style.backgroundColor = "rgba(194,14,2,0.7)";
            li.classList.add("text-white");
        }

        li.setAttribute("data-id", account.Id);

        const contentContainer = document.createElement("div");
        contentContainer.classList.add("d-flex", "align-items-center", "gap-2");

        const accountName = document.createElement("div");
        accountName.classList.add("account-name-scroll");

        const spanScroll = document.createElement("span");
        spanScroll.classList.add("scroll-inner");
        spanScroll.textContent = account.Nombre;

        accountName.appendChild(spanScroll);
        contentContainer.appendChild(accountName);

        // Activar scroll con click (toggle)
        accountName.addEventListener("click", (e) => {
            e.stopPropagation(); // evitar que dispare el click de selección
            spanScroll.classList.toggle("scrolling");
        });

        if (account.MontoPagar > 0) {
            const porcentaje = (account.Entrega / account.MontoPagar) * 100;

            const progressWrapper = document.createElement("div");
            progressWrapper.classList.add("position-relative");
            progressWrapper.style.width = "80px";
            progressWrapper.style.height = "10px";

            const progressBarContainer = document.createElement("div");
            progressBarContainer.classList.add("progress");
            progressBarContainer.style.width = "100%";
            progressBarContainer.style.height = "100%";

            const progressBar = document.createElement("div");
            progressBar.classList.add("progress-bar");
            progressBar.style.width = `${porcentaje}%`;
            progressBar.style.transition = "width 0.5s";

            progressBar.classList.remove("low", "medium", "high", "full");
            if (porcentaje < 10) {
                progressBar.classList.add("low");
            } else if (porcentaje < 60) {
                progressBar.classList.add("medium");
            } else if (porcentaje < 90) {
                progressBar.classList.add("high");
            } else {
                progressBar.classList.add("full");
            }

            const percentageText = document.createElement("span");
            percentageText.id = "progress-percentage-textCobro";
            percentageText.textContent = porcentaje >= 100 ? "Completado" : `${Math.round(porcentaje)}%`;
            percentageText.style.position = "absolute";
            percentageText.style.left = "50%";
            percentageText.style.top = "50%";
            percentageText.style.transform = "translate(-50%, -50%)";
            percentageText.style.color = "#fff";
            percentageText.style.fontSize = "10px";
            percentageText.style.fontWeight = "700";
            percentageText.style.textShadow = "0 0 2px #000";

            progressBarContainer.appendChild(progressBar);
            progressWrapper.appendChild(progressBarContainer);
            progressWrapper.appendChild(percentageText);
            contentContainer.appendChild(progressWrapper);
        }

        li.appendChild(contentContainer);

        const buttonContainer = document.createElement("div");
        buttonContainer.innerHTML = `
         <button class="btn btn-secondary btn-sm delete-btn" onclick="anadirComprobantes(${account.Id})" title="Adjuntar Imagenes">
                <i class="fa fa-file-image-o"></i>
            </button>
            <button class="btn btn-warning btn-sm edit-btn" onclick="editAccount(${account.Id})" title="Editar">
                <i class="fa fa-pencil"></i>
            </button>
            <button class="btn btn-danger btn-sm delete-btn" onclick="deleteAccount(${account.Id})" title="Eliminar">
                <i class="fa fa-trash"></i>
            </button>
        `;
        li.appendChild(buttonContainer);

        li.addEventListener("click", () => selectAccount(account, li));

        accountList.appendChild(li);
    });

    if (accounts.length > 0) {
        selectAccount(accounts[0], accountList.firstChild);
    }
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
    document.getElementById("accountMonto").value = account.MontoPagar;
    document.getElementById("CuentaPropia").checked = account.CuentaPropia;
    document.getElementById("Activo").checked = account.Activo;
    actualizarBarraProgreso(account.MontoPagar,account.Entrega);
}

// Función para editar una cuenta
function editAccount(id) {
    const account = accounts.find(a => a.Id === id);
    if (account) {
        // Pre-cargar los valores de la cuenta en los campos de texto
        document.getElementById("accountName").value = account.Nombre;
        document.getElementById("accountMonto").value = account.MontoPagar;
        document.getElementById("accountCBU").value = account.CBU;
        document.getElementById("CuentaPropia").checked = account.CuentaPropia;
        document.getElementById("Activo").checked = account.Activo;
        document.getElementById("accountName").removeAttribute("disabled");
        document.getElementById("accountCBU").removeAttribute("disabled");
        document.getElementById("accountMonto").removeAttribute("disabled");
        document.getElementById("CuentaPropia").removeAttribute("disabled");
        document.getElementById("Activo").removeAttribute("disabled");
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
            CBU: document.getElementById("accountCBU").value.trim(),
            CuentaPropia: document.getElementById("CuentaPropia").checked,
            Activo: document.getElementById("Activo").checked,
            MontoPagar: document.getElementById("accountMonto").value
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
                    loadCuentasBancarias(activoCuentasBancarias);
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
                    loadCuentasBancarias(activoCuentasBancarias);
                    selectedAccount = null;
                    document.getElementById("accountName").value = "";
                    document.getElementById("accountCBU").value = "";
                    document.getElementById("accountMonto").value = "";
                    document.getElementById("CuentaPropia").checked = false;
                    document.getElementById("Activo").checked = true;
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
    document.getElementById("accountMonto").value = "";
    document.getElementById("CuentaPropia").checked = false;
    document.getElementById("Activo").checked = true;
    document.getElementById("accountName").removeAttribute("disabled");
    document.getElementById("accountCBU").removeAttribute("disabled");
    document.getElementById("accountMonto").removeAttribute("disabled");
    document.getElementById("CuentaPropia").removeAttribute("disabled");
    document.getElementById("Activo").removeAttribute("disabled");
    document.getElementById("anadirCuenta").setAttribute("hidden", "hidden");
    document.getElementById("addAccount").removeAttribute("hidden");
    document.getElementById("canceladdAccount").removeAttribute("hidden");

}

document.getElementById("addAccount").addEventListener("click", async () => {
    const Nombre = document.getElementById("accountName").value.trim();
    const cbu = document.getElementById("accountCBU").value.trim();
    const CuentaPropia = document.getElementById("CuentaPropia").checked;
    const Activo = document.getElementById("Activo").checked;
    const MontoPagar = document.getElementById("accountMonto").value;

    if (!Nombre || !cbu) {
        alert("Debes completar ambos campos.");
        return;
    }

    const newAccount = { Nombre, cbu, CuentaPropia, Activo, MontoPagar };

    try {
        const response = await fetch('/Cobranzas/NuevaCuentaBancaria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAccount)
        });

        const result = await response.json();

        if (result?.Status === 0 && result.Id) {
            alert("Cuenta añadida con éxito.");

            // Restaurar inputs
            document.getElementById("accountName").value = "";
            document.getElementById("accountCBU").value = "";
            document.getElementById("accountMonto").value = "";
            document.getElementById("CuentaPropia").checked = false;
            document.getElementById("Activo").checked = true;

            // Mostrar botones originales
            document.getElementById("anadirCuenta").hidden = false;
            document.getElementById("btnStockPendiente").hidden = false;

            // Ocultar registrar/cancelar
            document.getElementById("addAccount").hidden = true;
            document.getElementById("canceladdAccount").hidden = true;

            // Recargar lista
            await loadCuentasBancarias(activoCuentasBancarias);

            // Seleccionar nueva cuenta
            seleccionarCuenta(result.Id);
        } else {
            alert("Error al añadir la cuenta.");
        }

    } catch (error) {
        console.error("Error adding account:", error);
        alert("Ocurrió un error al registrar la cuenta.");
    }
});

function seleccionarCuenta(id) {
    const item = document.querySelector(`#accountList [data-id='${id}']`);
    if (item) {
        item.click(); // Simula la selección
        item.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

async function cancelarNuevaCuenta() {
    document.getElementById("accountName").value = "";
    document.getElementById("accountCBU").value = "";
    document.getElementById("accountMonto").value = "";
    document.getElementById("CuentaPropia").checked = false;
    document.getElementById("Activo").checked = true;
    document.getElementById("accountName").setAttribute("disabled", "disabled");
    document.getElementById("accountCBU").setAttribute("disabled", "disabled");
    document.getElementById("accountMonto").setAttribute("disabled", "disabled");
    document.getElementById("CuentaPropia").setAttribute("disabled", "disabled");
    document.getElementById("Activo").setAttribute("disabled", "disabled");
    document.getElementById("canceladdAccount").setAttribute("hidden", "hidden");
    document.getElementById("anadirCuenta").removeAttribute("hidden");
    document.getElementById("addAccount").setAttribute("hidden", "hidden");
    document.getElementById("editarCuenta").setAttribute("hidden", "hidden");
}

// Cargar cuentas bancarias desde el servidor
async function loadCuentasBancarias(activo) {
    var url = "/Cobranzas/ListaCuentasBancariasTotalesConInformacion";
    let value = JSON.stringify({ Activo: activo });
    let options = {
        type: "POST",
        url: url,
        async: true,
        data: value,
        contentType: "application/json",
        dataType: "json"
    };

    // Hacer la solicitud AJAX para obtener las cuentas bancarias
    let result = await MakeAjax(options);

    // Filtrar las cuentas que ya fueron obtenidas
    accounts = result; // Suponiendo que 'CuentasBancarias' es la propiedad del resultado
    renderAccounts(); // Llamar a la función que renderiza las cuentas
}



// Abrir el modal de cuentas bancarias
async function abrirModalCuentasBancarias() {
    let toggleButton = $("#toggleBloqueadas");

    // Resetear el botón al estado inicial
    toggleButton.html('<i class="fa fa-eye text-danger"></i> Ver cuentas inactivas');
    toggleButton.find("i").removeClass("text-success").addClass("text-danger");

    // Ocultar cuentas bloqueadas por defecto
    $(".bloqueado").hide();
    cancelarNuevaCuenta()
    await loadCuentasBancarias(1);
    $("#bankAccountsModal").modal('show');
}


$("#toggleBloqueadas").click(async function () {
    let icon = $(this).find("i");

    if (icon.hasClass("text-danger")) {
        icon.removeClass("text-danger").addClass("text-success");
        $(this).html('<i class="fa fa-eye text-success"></i> Ocultar cuentas inactivas');
        await loadCuentasBancarias(-1);
        activoCuentasBancarias = -1
        $(".bloqueado").show();
    } else {
        icon.removeClass("text-success").addClass("text-danger");
        $(this).html('<i class="fa fa-eye text-danger"></i> Ver cuentas inactivas');
        activoCuentasBancarias = 1
        await loadCuentasBancarias(1);
        $(".bloqueado").hide();
    }
});

function actualizarBarraProgresoCobro(accountData) {
    const progressBar = document.getElementById("progressBarCobro");
    const progressPercentage = document.getElementById("progressPercentageCobro");
    const totalLabel = document.getElementById("total-labelCobro");
    const restanteLabel = document.getElementById("restante-labelCobro");
    const progressBarContainer = document.getElementById("progressBarContainerCobro"); // El contenedor de la barra

    // Obtener los valores de la cuenta seleccionada
    const montoPagar = accountData.MontoPagar;
    const entrega = accountData.Entrega;

    // Mostrar u ocultar la barra de progreso según el monto a pagar
    if (montoPagar > 0) {
        progressBarContainer.hidden = false; // Mostrar la barra
    } else {
        progressBarContainer.hidden = true; // Ocultar la barra
        return; // Si no hay monto a pagar, salimos de la función
    }

    // Calcular el porcentaje
    const porcentaje = montoPagar === 0 ? 0 : (entrega / montoPagar) * 100;

    // Actualizamos la barra de progreso y el texto del porcentaje
    progressBar.style.width = `${porcentaje}%`;

    // Limpiar el texto de porcentaje anterior
    progressPercentage.textContent = '';

    const entregaLabel = document.getElementById("entregas-labelCobro");


    const restante = montoPagar - entrega;

    // Actualizamos los valores de Total y Restante
    totalLabel.textContent = `Total: $${montoPagar.toLocaleString()}`;
    restanteLabel.textContent = `Restante: $${(montoPagar - entrega).toLocaleString()}`;
    
    entregaLabel.textContent = `Entregas: $${entrega.toLocaleString()}`;
    // Limpiar clases anteriores de color
    progressBar.classList.remove("low", "medium", "high", "full");

    // Cambiar clases para el color de la barra de progreso según el porcentaje
    if (porcentaje < 10) {
        progressBar.classList.add("low");
    } else if (porcentaje < 60) {
        progressBar.classList.add("medium");
    } else if (porcentaje < 90) {
        progressBar.classList.add("high");
    } else {
        progressBar.classList.add("full");
    }

    // Eliminar el texto de porcentaje anterior sobre la barra si existe
    const textoPrevio = document.getElementById("progress-percentage-textCobro");
    if (textoPrevio) textoPrevio.remove();

    // Crear el texto centrado sobre la barra de progreso
    const percentageText = document.createElement("span");
    percentageText.id = "progress-percentage-textCobro";
    if (porcentaje >= 100) {
        percentageText.textContent = "✔ Completado"; // Mostrar "✔ Completado" cuando se llega al 100%
    } else {
        percentageText.textContent = `${Math.round(porcentaje)}%`; // Mostrar el porcentaje normal
    }

    percentageText.style.position = "absolute";
    percentageText.style.left = "50%";
    percentageText.style.top = "50%";
    percentageText.style.transform = "translate(-50%, -50%)";
    percentageText.style.color = "#fff";
    percentageText.style.fontSize = "14px"; // Ajusté el tamaño para que se vea bien
    percentageText.style.fontWeight = "700";
    percentageText.style.textShadow = "0 0 2px #000";

    // Asegurar que el contenedor de la barra tenga posición relativa para posicionar el texto correctamente
    const progressWrapper = progressBar.parentElement; // El contenedor de la barra de progreso
    if (progressWrapper) {
        progressWrapper.style.position = "relative"; // Aseguramos que sea relativo para que el texto esté centrado
        progressWrapper.appendChild(percentageText); // Añadir el texto centrado sobre la barra
    }
}

function actualizarBarraProgreso(montoTotal, montoPagado) {
    montoTotal = parseFloat(montoTotal) || 0;
    montoPagado = parseFloat(montoPagado) || 0;

    const divBarra = document.getElementById("divProgressBarBanco");

    if (montoTotal === 0) {
        divBarra.style.display = "none";
        return;
    } else {
        divBarra.style.display = "block";
    }

    const barra = document.getElementById("progress-bar");
    barra.style.display = "block";

    const restante = montoTotal - montoPagado;
    const porcentaje = Math.min((montoPagado / montoTotal) * 100, 100);

    
    const restanteLabel = document.getElementById("restante-label");
    const totalLabel = document.getElementById("total-label");

    const entregaLabel = document.getElementById("entregas-label");

    entregaLabel.textContent = `Entregas: $${montoPagado.toLocaleString()}`;


    barra.style.width = `${porcentaje}%`;

    
    restanteLabel.textContent = `Restante: $${restante.toLocaleString()}`;
    totalLabel.textContent = `Total: $${montoTotal.toLocaleString()}`;

    // Limpiar clases anteriores
    barra.classList.remove("low", "medium", "high", "full");

    if (porcentaje < 10) {
        barra.classList.add("low");
    } else if (porcentaje < 60) {
        barra.classList.add("medium");
    } else if (porcentaje < 90) {
        barra.classList.add("high");
    } else {
        barra.classList.add("full");
    }

    // Eliminar texto anterior si existe
    const textoPrevio = document.getElementById("progress-percentage-text");
    if (textoPrevio) textoPrevio.remove();

    // Crear el texto centrado sobre la barra completa
    const percentageText = document.createElement("span");
    percentageText.id = "progress-percentage-text";
    percentageText.textContent = porcentaje >= 100 ? "✔ Completado" : `${Math.round(porcentaje)}%`;
    percentageText.style.position = "absolute";
    percentageText.style.left = "50%";
    percentageText.style.top = "50%";
    percentageText.style.transform = "translate(-50%, -50%)";
    percentageText.style.color = "#fff";
    percentageText.style.fontSize = "12px";
    percentageText.style.fontWeight = "700";
    percentageText.style.textShadow = "0 0 2px #000";

    // Asegurar que el contenedor de la barra tenga posición relativa
    const progressWrapper = divBarra.querySelector(".progress");
    if (progressWrapper) {
        progressWrapper.style.position = "relative";
        progressWrapper.appendChild(percentageText);
    }
}

function convertirImagenACanvas(imageData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            // Convertimos a JPEG para evitar problemas de transparencia o formato
            const jpgData = canvas.toDataURL("image/jpeg", 0.92); // calidad 92%
            resolve(jpgData);
        };
        img.onerror = reject;
        img.src = imageData;
    });
}


function getImageDimensions(imageData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = imageData;
    });
}


async function exportarPdf() {
    if (!selectedAccount) {
        alert("Por favor, seleccioná una cuenta primero.");
        return;
    }

    await generarPdfFinal(); // lógica que ya tenías, movida a una función aparte
}


async function anadirComprobantes(id) {
    const modal = new bootstrap.Modal(document.getElementById("modalComprobantes"));
   

    // Limpiar todos los slots
    const previews = document.querySelectorAll(".vista-previa");
    const inputs = document.querySelectorAll(".extra-comprobante");
    const btns = document.querySelectorAll(".btn-cancelar-imagen");

    previews.forEach(img => {
        img.style.display = "none";
        img.src = "";
    });

    inputs.forEach(input => {
        input.value = "";
    });

    btns.forEach(btn => btn.style.display = "none");

    document.getElementById("idaccount").value = id;

    // Cargar imágenes desde backend
    const response = await fetch(`/Cobranzas/ObtenerComprobantes?idCuenta=${id}`);
    const data = await response.json();

    for (let i = 0; i < data.length && i < previews.length; i++) {
        const img = previews[i];
        img.src = `data:image/png;base64,${data[i].Imagen}`;
        img.style.display = "block";

        btns[i].style.display = "inline-block";
    }

    modal.show();
}


async function guardarComprobantes() {
    const idCuenta = parseInt(document.getElementById("idaccount").value);
    const fileInputs = document.querySelectorAll(".extra-comprobante");
    const imgPreviews = document.querySelectorAll(".vista-previa");

    let comprobantes = [];

    for (let i = 0; i < 12; i++) {
        const input = fileInputs[i];
        const img = imgPreviews[i];

        let base64 = null;

        if (!img || img.style.display === "none") {
            base64 = null;
        } else if (input?.files?.[0]) {
            base64 = (await toBase64(input.files[0])).split(',')[1];
        } else if (img.src?.startsWith("data:image")) {
            base64 = img.src.split(',')[1];
        }

        comprobantes.push({
            IdCuenta: idCuenta,
            Fecha: new Date().toISOString(),
            Imagen: base64 // puede ser null
        });
    }

    const response = await fetch('/Cobranzas/GuardarComprobantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comprobantes)
    });

    const result = await response.json();

    if (result.success) {
        alert("Comprobantes guardados correctamente");

        document.querySelectorAll(".vista-previa").forEach(img => {
            img.src = "";
            img.style.display = "none";
        });

        fileInputs.forEach(input => input.value = "");

        document.querySelectorAll(".btn-cancelar-imagen").forEach(btn => {
            btn.style.display = "none";
        });

        const modal = bootstrap.Modal.getInstance(document.getElementById("modalComprobantes"));
        if (modal) modal.hide();
    } else {
        alert("Error al guardar: " + (result.error || "desconocido"));
    }
}

function getImageBase64FromURL(url) {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            })
            .catch(reject);
    });
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


async function generarPdfFinal() {
    let clientesExportados = [];
    let posicion = { x: 15, y: 10 };

    const doc = new jsPDF();
    const fechaActual = new Date().toLocaleDateString();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Header
    const colorStart = [30, 87, 153];
    const colorEnd = [125, 185, 232];
    const headerX = 10, headerY = 10, headerWidth = 190, headerHeight = 12;
    drawGradientHeader(doc, headerX, headerY, headerWidth, headerHeight, colorStart, colorEnd);

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titulo = `Cuenta Bancaria: ${selectedAccount.Nombre}`;
    const centerX = (pageWidth - doc.getTextWidth(titulo)) / 2;
    doc.text(titulo, centerX, headerY + 9);

    doc.setTextColor(0, 0, 0);
    posicion.y += 20;
    doc.setFontSize(12);
    doc.text(`Fecha: ${fechaActual}`, 10, posicion.y);
    if (selectedAccount.MontoPagar > 0) {
        posicion.y += 10;
        doc.text(`Monto a Cobrar: $${selectedAccount.MontoPagar.toFixed(2)}`, 10, posicion.y);
    }
    posicion.y += 10;
    doc.text(`Entregado: $${selectedAccount.Entrega.toFixed(2)}`, 10, posicion.y);
    if (parseInt(selectedAccount.MontoPagar) > 0) {
        posicion.y += 10;
        doc.text(`Restante: $${(selectedAccount.MontoPagar - selectedAccount.Entrega).toFixed(2)}`, 10, posicion.y);
        posicion.y += 10;
        drawProgressBar(doc, 10, posicion.y, 180, 10, (selectedAccount.Entrega / selectedAccount.MontoPagar) * 100);
    }

    posicion.y += 20;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Comprobantes:", 10, posicion.y);
    posicion.y += 10;

    // 1. Comprobantes existentes de ventas
    for (const venta of selectedAccount.InformacionVentas) {
        const image = await ObtenerImagen(venta.Id);
        if (!image) continue;

        try {
            const idCliente = venta.idCliente;
            if (clientesExportados.includes(idCliente)) continue;

            await agregarImagenADoc(doc, image, posicion, pageHeight, clientesExportados, idCliente);
        } catch (err) {
            console.warn("No se pudo cargar imagen de venta:", err);
        }
    }

    // 2. Comprobantes guardados en la base para la cuenta
    try {
        const resp = await fetch(`/Cobranzas/ObtenerComprobantes?idCuenta=${selectedAccount.Id}`);
        const comprobantesBase = await resp.json();

        for (const comprobante of comprobantesBase) {
            if (comprobante.Imagen) {
                await agregarImagenADoc(doc, comprobante.Imagen, posicion, pageHeight);
            }
        }
    } catch (err) {
        console.warn("Error cargando comprobantes desde base:", err);
    }

    // 3. Comprobantes nuevos del modal (input.files)
    const inputs = Array.from(document.querySelectorAll(".extra-comprobante"))
        .filter(input => input && input.files && input.files.length > 0);

    for (const input of inputs) {
        const file = input.files[0];
        const base64 = await leerArchivoComoBase64(file);
        await agregarImagenADoc(doc, base64.split(',')[1], posicion, pageHeight);
    }

    limpiarComprobantes();
    doc.save(`Cuenta_${selectedAccount.Nombre}.pdf`);
}

async function agregarImagenADoc(doc, image, posicion, pageHeight, clientesExportados, idCliente = null) {
    const format = getImageFormat(image);
    const rawData = `data:image/${format.toLowerCase()};base64,${image}`;
    const imageData = await convertirImagenACanvas(rawData);

    // Tamaño fijo
    const imageWidth = 85;
    const imageHeight = 110;
    const margin = 15;
    const spacing = 10;
    const pageWidth = doc.internal.pageSize.width;

    // Si no entra horizontalmente, saltar a nueva fila
    if (posicion.x + imageWidth > pageWidth - margin) {
        posicion.x = margin;
        posicion.y += imageHeight + spacing;
    }

    // Si no entra verticalmente, agregar nueva página
    if (posicion.y + imageHeight > pageHeight - margin) {
        doc.addPage();
        posicion.x = margin;
        posicion.y = 20;
    }

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(posicion.x - 2, posicion.y - 2, imageWidth + 4, imageHeight + 4);
    doc.addImage(imageData, "JPEG", posicion.x, posicion.y, imageWidth, imageHeight);

    if (idCliente !== null) clientesExportados.push(idCliente);

    // Actualizar X para la siguiente imagen
    posicion.x += imageWidth + spacing;
}

function leerArchivoComoBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsDataURL(file);
    });
}

document.querySelectorAll('.vista-previa').forEach(img => {
    img.addEventListener('click', function () {
        const modal = document.getElementById("modalImagenAmpliada");
        const modalImg = modal.querySelector("img");
        modalImg.src = this.src;
        modal.style.display = "flex"; // ahora usa flexbox
    });
});

document.getElementById("modalImagenAmpliada").addEventListener("click", function () {
    this.style.display = "none";
});


function limpiarComprobantes() {
    document.querySelectorAll('.extra-comprobante').forEach(input => {
        input.value = '';
    });

    document.querySelectorAll('.vista-previa').forEach(img => {
        img.src = '';
        img.style.display = 'none';
    });

    document.querySelectorAll('.btn-cancelar-imagen').forEach(btn => {
        btn.style.display = 'none';
    });
}


document.querySelectorAll('.extra-comprobante').forEach(input => {
    input.addEventListener('change', function () {
        const file = this.files[0];
        const container = this.closest('.comprobante-card, .border');
        const vistaPreviaContainer = container.querySelector('.vista-previa-container');
        const img = container.querySelector('.vista-previa');
        const btnCancelar = container.querySelector('.btn-cancelar-imagen');

        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                img.src = e.target.result;
                img.style.display = 'block'; // mostrar imagen
                btnCancelar.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            img.src = '';
            img.style.display = 'none'; // ocultar si no hay imagen válida
            btnCancelar.style.display = 'none';
        }
    });
});

document.querySelectorAll('.btn-cancelar-imagen').forEach(btn => {
    btn.addEventListener('click', function () {
        const container = this.closest('.comprobante-card, .border');
        const input = container.querySelector('.extra-comprobante');
        const img = container.querySelector('.vista-previa');

        input.value = '';
        input.setAttribute("data-vacio", "1");

        img.removeAttribute("src"); // 🔁 ESTO ES LO QUE TE FALTABA
        img.style.display = 'none';

        this.style.display = 'none';
    });
});


function drawGradientHeader(doc, x, y, width, height, colorStart, colorEnd) {
    const steps = width;
    for (let i = 0; i < steps; i++) {
        const alpha = i / steps;
        const r = Math.floor(colorStart[0] * (1 - alpha) + colorEnd[0] * alpha);
        const g = Math.floor(colorStart[1] * (1 - alpha) + colorEnd[1] * alpha);
        const b = Math.floor(colorStart[2] * (1 - alpha) + colorEnd[2] * alpha);
        doc.setFillColor(r, g, b);
        doc.rect(x + i, y, 1, height, 'F');
    }
}


function drawProgressBar(doc, x, y, width, height, porcentaje) {
    // 1. Contenedor rojo (siempre el mismo)

    var r, g, b, barColor;


    if (porcentaje < 10) {
        r = 255;
        g = 0;
        b = 0;
    } else if (porcentaje < 60) {
        r = 255;
        g = 165;
        b = 0;
    } else if (porcentaje < 90) {
        r = 26;
        g = 247;
        b = 140;
    } else {
        r = 0;
        g = 128;
        b = 0;
    }

    barColor = [r, g, b];

    
    doc.setDrawColor(r, g, b); // borde
    doc.setFillColor(194, 14, 2); // rojo oscuro
    doc.rect(x, y, width, height, 'FD');



    // 3. Rellenar barra (opcional: simular gradiente con líneas verticales)
    const barWidth = (porcentaje / 100) * width;
    const step = 1; // resolución del gradiente simulado

    for (let i = 0; i < barWidth; i += step) {
        const alpha = i / barWidth; // transparencia simulada
        const r = barColor[0];
        const g = barColor[1];
        const b = barColor[2];
        doc.setFillColor(
            Math.floor(r * (0.7 + 0.3 * alpha)),
            Math.floor(g * (0.7 + 0.3 * alpha)),
            Math.floor(b * (0.7 + 0.3 * alpha))
        );
        doc.rect(x + i, y, step, height, 'F');
    }

    // 4. Texto centrado (porcentaje)
    const text = porcentaje >= 100 ? "Completado" : `${Math.round(porcentaje)}%`;


    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255); // blanco
    const textWidth = doc.getTextWidth(text);
    const textX = x + (width - textWidth) / 2;
    const textY = y + height / 2 + 3; // vertical centering
    doc.text(text, textX, textY - 2);
}


// Función para cargar la imagen asincrónicamente
function loadImage(imageData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageData;
    });
}


function getImageFormat(base64) {
    if (base64.startsWith('/9j/')) return 'JPEG'; // JPEG suele empezar con /9j/
    if (base64.startsWith('iVBOR')) return 'PNG'; // PNG suele empezar con iVBOR
    return null;
}



document.getElementById("Imagen").addEventListener("change", function (event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    if (file) {
        reader.onload = function (e) {
            document.getElementById("imgProducto").src = e.target.result;
            document.getElementById("imgProducto").style.display = "block";
            document.getElementById("imgProd").innerText = file.name;
        };
        reader.readAsDataURL(file);
    }
});

function borrarImagen() {
    const input = document.getElementById("Imagen");
    const img = document.getElementById("imgProducto");
    const p = document.getElementById("imgProd");

    input.value = "";
    img.src = "";
    img.style.display = "none";
    p.innerText = "";
}



function openModal(imageSrc) {
    // Cambia el src de la imagen del modal
    document.getElementById('modalImage').src = imageSrc;
    // Muestra el modal
    $('#imageModal').modal('show');
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


async function actualizarUbicacionCliente() {
    if (!navigator.geolocation) {
        errorModal("Tu navegador no soporta geolocalización.");
        return;
    }

    const opciones = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    let seActualizo = false;

    const idWatch = navigator.geolocation.watchPosition(
        async function (position) {
            if (seActualizo) return;

            seActualizo = true;
            navigator.geolocation.clearWatch(idWatch); // detener seguimiento

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const idCliente = localStorage.getItem("CobranzaCliente"); // o como obtengas el ID
            const precision = position.coords.accuracy;

            console.log("Lat:", lat, "Lng:", lng, "Precisión:", precision);

            await enviarUbicacionAlServidor(idCliente, lat, lng);
        },
        async function (error) {
            console.warn("Error con watchPosition. Intentando getCurrentPosition...");

            navigator.geolocation.getCurrentPosition(
                async function (position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const precision = position.coords.accuracy;

                    await enviarUbicacionAlServidor(idCliente, lat, lng);
                },
                function (error) {
                    errorModal("No se pudo obtener la ubicación.");
                },
                opciones
            );
        },
        opciones
    );
}



async function enviarUbicacionAlServidor(idCliente, latitud, longitud) {
    try {
        const res = await fetch('/Clientes/NuevaDireccion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                idCliente: idCliente,
                Latitud: latitud,
                Longitud: longitud
            })
        });

        const data = await res.json();

    } catch (err) {
        console.error(err);
        alert("Error al conectar con el servidor.");
    }
}

function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}