
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
            document.getElementById("Nombre").value = result.Usuario.Nombre;
            document.getElementById("Apellido").value = result.Usuario.Apellido;
            document.getElementById("Dni").value = result.Usuario.Dni;
            document.getElementById("Direccion").value = result.Usuario.Direccion;
            document.getElementById("Telefono").value = result.Usuario.Telefono;
            document.getElementById("lbllongitud").value = result.Usuario.Longitud;
            document.getElementById("lbllatitud").value = result.Usuario.Latitud;
            document.getElementById("lbldireccion").value = result.Usuario.Direccion;
            document.getElementById("LimiteVentas").value = formatearMiles(result.Usuario.LimiteVentas);



            document.getElementById("Estados").value = result.Usuario.IdEstado;
            document.getElementById("Zonas").value = result.Usuario.IdZona;
            document.getElementById("Estados").removeAttribute("hidden");
            /*document.getElementById("lblEstados").removeAttribute("hidden");*/
            document.getElementById("Usuarios").value = result.Usuario.IdVendedor;
            document.getElementById("btnRegistrarModificar").textContent = "Modificar";

            

        } else {
            alert("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        alert("Ha ocurrido un error en los datos");
    }
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
                alert("Ha ocurrido un error al registrar el cliente. Consulte con un Administador");
                return;
            } else if (result.Status == 2) {
                alert("Ya existe un cliente con ese DNI registrado");
                return
            } else {
                alert('Cliente agregado correctamente.');
                $('.datos-error').removeClass('d-none');

                if (localStorage.getItem('RegistrarClienteVenta') == 1) {
                    localStorage.setItem("DNIClienteVenta", document.getElementById("Dni").value);

                    document.location.href = "../../../Ventas/Nuevo/";

                } else {
                    document.location.href = "../Index/";
                }
            }
        } catch (error) {
            $('.datos-error').text('Ha ocurrido un error.')
            $('.datos-error').removeClass('d-none')
        }
    }
}

async function modificarCliente() {
    try {
        var url = "/Clientes/EditarCliente";

        let value = JSON.stringify({
            Id: document.getElementById("IdCliente").value,
            Nombre: document.getElementById("Nombre").value,
            Apellido: document.getElementById("Apellido").value,
            Dni: document.getElementById("Dni").value,
            Direccion: document.getElementById("Direccion").value,
            Telefono: document.getElementById("Telefono").value,
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
            alert('Cliente modificado correctamente.');
            
            localStorage.removeItem("EdicionCliente");
           
            if (localStorage.getItem("EdicionCobranza") == 1) {

                const tipo = (localStorage.getItem("tipoSistemaVentas") || "").toLowerCase();

                if (tipo === "electro") {
                    document.location.href = "../../Ventas_Electrodomesticos/Cobros/";
                } else {
                    document.location.href = "../../Cobranzas/Index/";
                }

                localStorage.removeItem("EdicionCobranza");
            }
        } else {
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
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

    }

    if (document.getElementById("lbllatitud").value && document.getElementById("lbllongitud").value) {
        lat = parseFloat(document.getElementById("lbllatitud").value);
        lng = parseFloat(document.getElementById("lbllongitud").value);
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

    if (permisos) {
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

        searchBox = new google.maps.places.SearchBox(input);

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
    } else {
        // Si no tiene permisos, ocultar input
        input.style.display = "none";
    }

    updateCoordinates(defaultLocation.lat, defaultLocation.lng);
}

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
                let direccion = document.getElementById('lbldireccion').value;
                if (direccion == undefined) document.getElementById('Direccion').value = results[0].formatted_address;
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
        document.getElementById('Direccion').focus();
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
        document.getElementById('Usuarios').focus();
    }
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

