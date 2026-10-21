
function setBotonGuardarTexto(texto) {
    var icono = '<i class="fa fa-check me-1"></i> ';
    var btn = document.getElementById("btnRegistrarModificar");
    var btnMob = document.getElementById("btnRegistrarModificarMobile");
    if (btn) btn.innerHTML = icono + texto;
    if (btnMob) btnMob.innerHTML = icono + texto;
    actualizarCamposObligatoriosAlta();
}

function esAltaCliente() {
    var idLs = (localStorage.getItem("EdicionCliente") || "").toString().trim();
    if (idLs && idLs !== "0") return false;
    var idEl = document.getElementById("IdCliente");
    var idVal = idEl ? String(idEl.value || idEl.textContent || "").trim() : "";
    if (idVal && idVal !== "0") return false;
    var btn = document.getElementById("btnRegistrarModificar");
    var txt = btn ? (btn.textContent || "") : "";
    if (txt.indexOf("Modificar") >= 0) return false;
    return true;
}

function actualizarCamposObligatoriosAlta() {
    var alta = esAltaCliente();
    var req = document.getElementById("reqTelefono2");
    var input = document.getElementById("Telefono2");
    if (req) req.hidden = !alta;
    if (input) {
        if (alta) input.setAttribute("aria-required", "true");
        else input.removeAttribute("aria-required");
    }
}

function telefonoArValido(valor) {
    var texto = (valor || "").toString().trim();
    if (!texto) return false;
    if (typeof normalizarTelefonoAR === "function")
        return !!normalizarTelefonoAR(texto);
    var d = texto.replace(/\D/g, "");
    return d.length >= 8 && d.length <= 15;
}

function setEncabezadoCliente(titulo, subtitulo) {
    var titleEl = document.getElementById("cePageTitle");
    var subEl = document.getElementById("cePageSubtitle");
    if (titleEl && titulo) titleEl.textContent = titulo;
    if (subEl && subtitulo) subEl.textContent = subtitulo;
}

function obtenerCoordenadaTexto(id) {
    var el = document.getElementById(id);
    if (!el) return "";
    return (el.textContent || el.value || "").toString().trim();
}

function volverListadoClientes() {
    if (localStorage.getItem("EdicionCobranza") == 1) {
        AccionBtnCancelar();
        return;
    }
    document.location.href = "../Index/";
}

$(document).ready(function () {

    userSession = JSON.parse(localStorage.getItem('usuario'));

    if (localStorage.getItem("EdicionCobranza") == 1) {
        $("#btnCobranzas").css("background", "#2E4053")
    } else {
        $("#btnClientes").css("background", "#2E4053")
    }

    if (userSession.IdRol == 1) { //ROL ADMIN
        $("#exportacionExcel").removeAttr("hidden");
        $("#importacionExcel").removeAttr("hidden");
    } else {
            $("#Nombre").prop("disabled", true);
            $("#Usuarios").prop("disabled", true);
            $("#Estados").prop("disabled", true);
    }

    if (localStorage.getItem("RegistrarClienteVenta") == 1) {
        $("#Nombre").prop("disabled", false);
        document.getElementById("Dni").value = localStorage.getItem("DNIClienteVenta");
        
    }


    if (userSession.IdRol == 2 || userSession.IdRol == 3) {
        document.getElementById("LimiteVentas").setAttribute("disabled", true);
    } else {
        document.getElementById("LimiteVentas").removeAttribute("disabled");
    }

    if (typeof iniciarAdjuntosCliente === "function")
        iniciarAdjuntosCliente();

    iniciarValidacionVisualCliente();
    actualizarCamposObligatoriosAlta();
});

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

async function cargarDatosUsuario() {
    try {
        var url = "/Clientes/EditarInfo";

        let value = JSON.stringify({
            Id: parseInt(localStorage.getItem("EdicionCliente"))
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

            if (userSession.IdRol == 1 || userSession.IdRol == 4) {
                document.getElementById("Direccion").removeAttribute("disabled");
            } else {
                document.getElementById("Direccion").setAttribute("disabled", true);
            }

            selectUsuarios = document.getElementById("Usuarios");

            $('#Usuarios option').remove();
            for (i = 0; i < result.Usuarios.length; i++) {
                option = document.createElement("option");
                option.value = result.Usuarios[i].Id;
                option.text = result.Usuarios[i].Nombre;
                selectUsuarios.appendChild(option);
            }

            selectZonas = document.getElementById("Zonas");

            $('#Zonas option').remove();
            for (i = 0; i < result.Zonas.length; i++) {
                option = document.createElement("option");
                option.value = result.Zonas[i].Id;
                option.text = result.Zonas[i].Nombre;
                selectZonas.appendChild(option);
            }

            selectEstados = document.getElementById("Estados");

            $('#Estados option').remove();
            for (i = 0; i < result.Estados.length; i++) {
                option = document.createElement("option");
                option.value = result.Estados[i].Id;
                option.text = result.Estados[i].Nombre;
                selectEstados.appendChild(option);
            }

            document.getElementById("IdCliente").value = result.Usuario.Id;
            var btnHistorial = document.getElementById("btnHistorialDireccionEdicion");
            if (btnHistorial) {
                if (result.Usuario.Id) {
                    btnHistorial.removeAttribute("hidden");
                } else {
                    btnHistorial.setAttribute("hidden", "hidden");
                }
            }
            document.getElementById("Nombre").value = result.Usuario.Nombre;
            document.getElementById("Apellido").value = result.Usuario.Apellido;
            document.getElementById("Dni").value = result.Usuario.Dni;
            document.getElementById("Direccion").value = result.Usuario.Direccion;
            document.getElementById("Telefono").value = result.Usuario.Telefono || "";
            var tel2 = document.getElementById("Telefono2");
            if (tel2) tel2.value = result.Usuario.Telefono2 || "";
            document.getElementById("lbllongitud").textContent = result.Usuario.Longitud || "\u2014";
            document.getElementById("lbllatitud").textContent = result.Usuario.Latitud || "\u2014";
            document.getElementById("lbldireccion").textContent = result.Usuario.Direccion || "";
            document.getElementById("LimiteVentas").value = formatearMiles(result.Usuario.LimiteVentas);



            document.getElementById("Estados").value = result.Usuario.IdEstado;
            document.getElementById("Zonas").value = result.Usuario.IdZona;
            document.getElementById("Estados").removeAttribute("hidden");
            /*document.getElementById("lblEstados").removeAttribute("hidden");*/
            document.getElementById("Usuarios").value = result.Usuario.IdVendedor;
            setBotonGuardarTexto("Modificar");
            setEncabezadoCliente(
                "Editar cliente",
                (result.Usuario.Nombre || "") + " " + (result.Usuario.Apellido || "") + " \u00b7 DNI " + (result.Usuario.Dni || "")
            );

            

        } else {
            alert("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        alert("Ha ocurrido un error en los datos");
    }
}

async function AccionBtn() {
    var btn = document.getElementById("btnRegistrarModificar");
    var esRegistro = !btn || btn.textContent.indexOf("Registrar") >= 0;
    if (esRegistro) {
        await registrarCliente();
    } else {
        await modificarCliente();
    }
}

function ceCampoWrap(id) {
    var input = document.getElementById(id);
    if (!input) return null;
    return input.closest(".ce-field");
}

function valorCampoCliente(id) {
    var el = document.getElementById(id);
    return el ? (el.value || "").toString().trim() : "";
}

function mostrarAlertaFormCliente(texto) {
    var box = document.getElementById("ceFormAlert");
    var msg = document.getElementById("ceFormAlertText");
    if (msg) msg.textContent = texto || "Revisá los campos marcados en rojo.";
    if (box) box.hidden = false;
}

function ocultarAlertaFormCliente() {
    var box = document.getElementById("ceFormAlert");
    if (box) box.hidden = true;
}

function marcarErrorCampoCliente(id, mensaje) {
    var input = document.getElementById(id);
    var field = ceCampoWrap(id);
    var msg = field ? field.querySelector(".ce-field-msg") : null;
    if (field) {
        field.classList.add("is-error");
        field.classList.remove("is-ok");
    }
    if (input) {
        input.classList.add("is-invalid");
        input.setAttribute("aria-invalid", "true");
    }
    if (msg) {
        msg.hidden = false;
        msg.textContent = mensaje || "Este campo es obligatorio.";
    }
}

function limpiarErrorCampoCliente(id, marcarOk) {
    var input = document.getElementById(id);
    var field = ceCampoWrap(id);
    var msg = field ? field.querySelector(".ce-field-msg") : null;
    var teniaError = field && field.classList.contains("is-error");
    if (field) field.classList.remove("is-error");
    if (input) {
        input.classList.remove("is-invalid");
        input.removeAttribute("aria-invalid");
    }
    if (msg) {
        msg.hidden = true;
        msg.textContent = "";
    }
    if (field) {
        if (marcarOk && teniaError && valorCampoCliente(id)) field.classList.add("is-ok");
        else field.classList.remove("is-ok");
    }
}

function limpiarErroresFormCliente() {
    ocultarAlertaFormCliente();
    document.querySelectorAll(".clientes-editar-root .ce-field.is-error, .clientes-editar-root .ce-field.is-ok").forEach(function (field) {
        var input = field.querySelector("input, select, textarea");
        if (input && input.id) limpiarErrorCampoCliente(input.id, false);
        else {
            field.classList.remove("is-error");
            field.classList.remove("is-ok");
        }
    });
}

function irAlPrimerErrorCliente() {
    var field = document.querySelector(".clientes-editar-root .ce-field.is-error");
    if (!field) {
        var alertBox = document.getElementById("ceFormAlert");
        if (alertBox && !alertBox.hidden) {
            alertBox.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
    }
    var input = field.querySelector("input, select, textarea");
    var nav = document.querySelector(".dg-navbar");
    var navH = nav ? nav.offsetHeight : 56;
    var top = field.getBoundingClientRect().top + window.pageYOffset - navH - 14;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    if (input && !input.disabled) {
        setTimeout(function () {
            try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
        }, 280);
    }
}

function iniciarValidacionVisualCliente() {
    var ids = ["Nombre", "Apellido", "Dni", "Telefono", "Telefono2", "Direccion", "Usuarios", "Zonas", "Estados", "LimiteVentas"];
    ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el || el.getAttribute("data-ce-val") === "1") return;
        el.setAttribute("data-ce-val", "1");
        var evento = el.tagName === "SELECT" ? "change" : "input";
        el.addEventListener(evento, function () {
            var field = ceCampoWrap(id);
            if (!field || (!field.classList.contains("is-error") && !field.classList.contains("is-ok"))) return;
            if (valorCampoCliente(id)) limpiarErrorCampoCliente(id, true);
            else limpiarErrorCampoCliente(id, false);
            if (!document.querySelector(".clientes-editar-root .ce-field.is-error"))
                ocultarAlertaFormCliente();
        });
    });
}

function verificarDatosCliente() {
    limpiarErroresFormCliente();
    var faltantes = [];
    var formato = [];
    var alta = esAltaCliente();
    var tel = valorCampoCliente("Telefono");
    var tel2 = valorCampoCliente("Telefono2");

    if (!valorCampoCliente("Nombre")) {
        marcarErrorCampoCliente("Nombre", "Completá el nombre.");
        faltantes.push("Nombre");
    }
    if (!valorCampoCliente("Apellido")) {
        marcarErrorCampoCliente("Apellido", "Completá el apellido.");
        faltantes.push("Apellido");
    }

    if (!tel) {
        marcarErrorCampoCliente("Telefono", "Completá el teléfono.");
        faltantes.push("Teléfono");
    } else if (!telefonoArValido(tel)) {
        marcarErrorCampoCliente("Telefono", "Ingresá un teléfono válido (ej: 3794 123456).");
        formato.push("Teléfono");
    }

    if (alta && !tel2) {
        marcarErrorCampoCliente("Telefono2", "Completá el segundo celular.");
        faltantes.push("Segundo celular");
    } else if (tel2 && !telefonoArValido(tel2)) {
        marcarErrorCampoCliente("Telefono2", "Ingresá un celular válido (ej: 3794 123456).");
        formato.push("Segundo celular");
    }

    if (faltantes.length || formato.length) {
        var partes = [];
        if (faltantes.length) {
            var lista = faltantes.length === 1
                ? faltantes[0]
                : faltantes.slice(0, -1).join(", ") + " y " + faltantes[faltantes.length - 1];
            partes.push("Faltan campos obligatorios: " + lista + ".");
        }
        if (formato.length)
            partes.push("Revisá el formato de: " + formato.join(" y ") + ".");
        mostrarAlertaFormCliente(partes.join(" "));
        irAlPrimerErrorCliente();
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
                Telefono2: valorCampoCliente("Telefono2"),
                IdVendedor: document.getElementById("Usuarios").value,
                IdEstado: document.getElementById("Estados").value,
                IdZona: document.getElementById("Zonas").value,
                LimiteVentas: formatearSinMiles(document.getElementById("LimiteVentas").value),
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


            if (result.Status == 1) {
                mostrarAlertaFormCliente("No se pudo registrar el cliente. Consultá con un administrador.");
                irAlPrimerErrorCliente();
                return;
            } else if (result.Status == 2) {
                marcarErrorCampoCliente("Dni", "Ya hay un cliente con este DNI.");
                mostrarAlertaFormCliente("Ya existe un cliente con ese DNI.");
                irAlPrimerErrorCliente();
                return;
            } else if (result.Status == 3) {
                marcarErrorCampoCliente("Telefono", "Completá el teléfono.");
                mostrarAlertaFormCliente("El teléfono es obligatorio.");
                irAlPrimerErrorCliente();
                return;
            } else if (result.Status == 4) {
                marcarErrorCampoCliente("Telefono2", "Completá el segundo celular.");
                mostrarAlertaFormCliente("El segundo celular es obligatorio al registrar un cliente nuevo.");
                irAlPrimerErrorCliente();
                return;
            } else {
                var idNuevo = result.Id || 0;
                if (typeof subirAdjuntosPendientes === "function" && adjuntosPendientes.length > 0) {
                    if (!idNuevo) {
                        alert("El cliente se registró, pero no se pudieron adjuntar las imágenes.");
                    } else {
                        var subida = await subirAdjuntosPendientes(idNuevo);
                        if (!subida || !subida.ok) {
                            alert("El cliente quedó registrado, pero las imágenes no se subieron.\n" + ((subida && subida.mensaje) ? subida.mensaje : "Volvé a adjuntarlas desde la ficha."));
                            localStorage.setItem("EdicionCliente", idNuevo);
                            adjuntosClienteId = idNuevo;
                            setBotonGuardarTexto("Modificar");
                            setEncabezadoCliente("Editar cliente", document.getElementById("Nombre").value + " " + document.getElementById("Apellido").value);
                            var idSpan = document.getElementById("IdCliente");
                            if (idSpan) idSpan.value = idNuevo;
                            await cargarAdjuntosCliente();
                            return;
                        }
                    }
                }

                alert('Cliente agregado correctamente.');
                $('.datos-error').removeClass('d-none');

                if (localStorage.getItem('RegistrarClienteVenta') == 1) {
                    localStorage.setItem("DNIClienteVenta", document.getElementById("Dni").value);


                    window.location.href = RetornarVentaNuevoModif();

                } else {
                    document.location.href = "../Index/";
                }
            }
        } catch (error) {
            mostrarAlertaFormCliente("Ha ocurrido un error al registrar. Intentá de nuevo.");
        }
    }
}

async function modificarCliente() {
    if (!verificarDatosCliente()) return;
    try {
        var url = "/Clientes/EditarCliente";

        let value = JSON.stringify({
            Id: document.getElementById("IdCliente").value,
            Nombre: document.getElementById("Nombre").value,
            Apellido: document.getElementById("Apellido").value,
            Dni: document.getElementById("Dni").value,
            Direccion: document.getElementById("Direccion").value,
            Telefono: document.getElementById("Telefono").value,
            Telefono2: valorCampoCliente("Telefono2"),
            IdVendedor: document.getElementById("Usuarios").value,
            IdEstado: document.getElementById("Estados").value,
            LimiteVentas: formatearSinMiles(document.getElementById("LimiteVentas").value),
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
            alert("Cliente modificado correctamente.");

            localStorage.removeItem("EdicionCliente");

            if (localStorage.getItem("EdicionCobranza") == 1) {

                const tipo = (localStorage.getItem("tipoSistemaVentas") || "").toLowerCase();

                if (tipo === "electro") {
                    document.location.href = "../../Ventas_Electrodomesticos/Cobros/";
                } else {
                    document.location.href = "../../Cobranzas/Index/";
                }

                localStorage.removeItem("EdicionCobranza");
            } else {
                document.location.href = "../Index/";
            }
        } else {
            if (result.Mensaje && (result.Mensaje || "").toLowerCase().indexOf("tel") >= 0) {
                marcarErrorCampoCliente("Telefono", "Completá el teléfono.");
            }
            mostrarAlertaFormCliente(result.Mensaje || "No se pudo guardar. Revisá los datos e intentá de nuevo.");
            irAlPrimerErrorCliente();
        }
    } catch (error) {
        mostrarAlertaFormCliente("Ha ocurrido un error al guardar. Intentá de nuevo.");
    }
}

function tienePermisosEditarMapa() {
    const rol = userSession.IdRol;
    const editando = !!localStorage.getItem("EdicionCliente");

    // Si NO está editando, todos pueden
    if (!editando) return true;

    // Si está editando y rol 4, NO puede
    if (rol === 4) return false;

    // Si está editando y cualquier otro rol, puede
    return true;
}



async function initMap() {
    var lat, lng;

    idCliente = localStorage.getItem("EdicionCliente")
    if (idCliente != null) {
        await cargarDatosUsuario()
    } else {
        await cargarUsuariosyEstados();
        document.getElementById("LimiteVentas").value = formatearMiles(130000);
        setBotonGuardarTexto("Registrar");
        setEncabezadoCliente("Nuevo cliente", "Complet\u00e1 los datos y ubic\u00e1 al cliente en el mapa");
    }

    var latTxt = obtenerCoordenadaTexto("lbllatitud");
    var lngTxt = obtenerCoordenadaTexto("lbllongitud");

    if (latTxt && lngTxt && latTxt !== "\u2014" && lngTxt !== "\u2014") {
        lat = parseFloat(latTxt);
        lng = parseFloat(lngTxt);
        initializeMap({ lat: lat, lng: lng });
    } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                lat = position.coords.latitude;
                lng = position.coords.longitude;
                console.log("Using current location: ", lat, lng);
                initializeMap({ lat: lat, lng: lng });
            },
            function (error) {
                console.error("Geolocation error: ", error);
                // En caso de error o si el usuario niega la geolocalización, usar ubicación por defecto
                lat = -29.171581;
                lng = -59.26997;
                console.log("Using default location: ", lat, lng);
                initializeMap({ lat: lat, lng: lng });
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    } else {
        // Geolocalización no está soportada por el navegador
        lat = -29.171581;
        lng = -59.26997;
        console.log("Geolocation not supported, using default location: ", lat, lng);
        initializeMap({ lat: lat, lng: lng });
    }
}

function initializeMap(location) {
    var defaultLocation = { lat: location.lat, lng: location.lng };

    const permisos = tienePermisosEditarMapa();

    let mapOptions = {
        center: defaultLocation,
        zoom: 15,
        gestureHandling: permisos ? "auto" : "none",
        draggable: permisos
    };

    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    marker = new google.maps.Marker({
        map: map,
        draggable: permisos,
        position: defaultLocation
    });

    if (permisos) {
        google.maps.event.addListener(map, 'click', function (event) {
            marker.setPosition(event.latLng);
            updateCoordinates(event.latLng.lat(), event.latLng.lng());
        });

        google.maps.event.addListener(marker, 'dragend', function (event) {
            updateCoordinates(event.latLng.lat(), event.latLng.lng());
        });
    }

    var input = document.getElementById('pac-input');
    var searchWrap = document.getElementById('ceMapSearch');

    if (permisos && input) {
        searchBox = new google.maps.places.SearchBox(input);

        map.addListener('bounds_changed', function () {
            searchBox.setBounds(map.getBounds());
        });

        searchBox.addListener('places_changed', function () {
            var places = searchBox.getPlaces();
            if (places.length == 0) return;

            var bounds = new google.maps.LatLngBounds();
            places.forEach(function (place) {
                if (!place.geometry) return;
                if (place.geometry.viewport) {
                    bounds.union(place.geometry.viewport);
                } else {
                    bounds.extend(place.geometry.location);
                }
            });
            map.fitBounds(bounds);
            marker.setPosition(bounds.getCenter());
            updateCoordinates(bounds.getCenter().lat(), bounds.getCenter().lng());
        });
    } else if (searchWrap) {
        searchWrap.hidden = true;
    } else if (input) {
        input.style.display = "none";
    }

    updateCoordinates(defaultLocation.lat, defaultLocation.lng);
}

// Función para actualizar las coordenadas mostradas en los labels
function updateCoordinates(lat, lng) {
    document.getElementById('lbllatitud').textContent = lat.toFixed(6);
    document.getElementById('lbllongitud').textContent = lng.toFixed(6);
    document.getElementById('lbllatitud').value = lat.toFixed(6);
    document.getElementById('lbllongitud').value = lng.toFixed(6);

    // Crear una instancia del geocodificador inverso
    const geocoder = new google.maps.Geocoder();

    // Crear un objeto LatLng
    const latLng = new google.maps.LatLng(lat, lng);

    // Realizar la solicitud de geocodificación inversa
    geocoder.geocode({ 'location': latLng }, (results, status) => {
        if (status === 'OK') {
            if (results[0]) {
                let direccion = obtenerCoordenadaTexto('lbldireccion');
                if (!direccion) document.getElementById('Direccion').value = results[0].formatted_address;
            } else {
                alert('No se encontraron resultados para estas coordenadas.');
            }
        } else {
            console.error("Geocode error: ", status);
        }
    });
}


//ACCIONES AL APRETAR ENTER
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

document.getElementById('Direccion').addEventListener('keydown', inputDireccion);
function inputDireccion(event) {
    if (event.keyCode == 13) {
        document.getElementById('Telefono').focus();
    }
}

document.getElementById('Telefono').addEventListener('keydown', inputTelefono);
function inputTelefono(event) {
    if (event.keyCode == 13) {
        var tel2 = document.getElementById('Telefono2');
        if (tel2) tel2.focus();
        else document.getElementById('Usuarios').focus();
    }
}

var inputTel2 = document.getElementById('Telefono2');
if (inputTel2) {
    inputTel2.addEventListener('keydown', function (event) {
        if (event.keyCode == 13) {
            document.getElementById('Usuarios').focus();
        }
    });
}

function AccionBtnCancelar() {

    if (localStorage.getItem("EdicionCobranza") == 1) {

        const tipo = (localStorage.getItem("tipoSistemaVentas") || "").toLowerCase();

        if (tipo === "electro") {
            document.location.href = "../../Ventas_Electrodomesticos/Cobros/";
        } else {
            document.location.href = "../../Cobranzas/Index/";
        }

        localStorage.removeItem("EdicionCobranza");
    } else {
        document.location.href = "../Index/";
    }
}

function quitarAcentos(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

document.getElementById("Nombre").addEventListener("input", function () {
    this.value = quitarAcentos(this.value);
});

document.getElementById("Apellido").addEventListener("input", function () {
    this.value = quitarAcentos(this.value);
});


const input = document.getElementById("LimiteVentas");

input.addEventListener("input", function () {
    const cursorPos = input.selectionStart;
    const originalLength = input.value.length;

    const formateado = formatearMiles(input.value);

    input.value = formateado;

    const newLength = formateado.length;
    input.setSelectionRange(
        cursorPos + (newLength - originalLength),
        cursorPos + (newLength - originalLength)
    );
});

