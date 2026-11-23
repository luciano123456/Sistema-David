let map;
let poly;
let path;
let locations = [];
let currentLocationIndex = 0;
let markers = []; // Array para almacenar los marcadores
let orderedMarkers = []; // Array para almacenar los marcadores ordenados
let watchId;


function initMap() {
    // Ubicación por defecto si no se puede obtener la ubicación actual del usuario
    const defaultLocation = { lat: -29.1717043, lng: -59.2725034 };

    // Opciones iniciales del mapa
    const mapOptions = {
        zoom: 15,
        center: defaultLocation,
        mapTypeId: google.maps.MapTypeId.MAP,
        streetViewControl: false // Deshabilita el control de Street View si no es necesario
    };

    // Inicializa el mapa
    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    // Inicializa la polilínea para dibujar el recorrido
    poly = new google.maps.Polyline({
        strokeColor: '#000000',
        strokeOpacity: 1.0,
        strokeWeight: 3
    });
    poly.setMap(map);

    path = poly.getPath();

    // Autocompletado: solo nombre y coordenadas. SearchBox pedía teléfono,
    // reseñas y valoración en cada búsqueda y eso es lo que facturaba Google.
    const input = document.getElementById('pac-input');
    const autocomplete = new google.maps.places.Autocomplete(input, {
        fields: ['geometry', 'name', 'formatted_address'],
        componentRestrictions: { country: 'ar' }
    });
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
            return;
        }

        const marker = new google.maps.Marker({
            map: map,
            title: place.name || place.formatted_address || '',
            position: place.geometry.location,
            draggable: false
        });

        marker.addListener('click', () => {
            addMarkerToOrderedList(marker);
        });

        markers.push(marker);
        locations.push({
            latlng: place.geometry.location,
            address: place.formatted_address || place.name || '',
            status: 'pending',
            number: null
        });

        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(16);
        }
    });

    // Intenta obtener la ubicación actual del usuario
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(userLocation);
                //addMarker(userLocation); // Añade un marcador en la ubicación actual
                cargarCobros(); // Llama a cargarCobros después de obtener la ubicación
            },
            () => {
                // Si no se puede obtener la ubicación actual, usa la ubicación por defecto
                map.setCenter(defaultLocation);
                //addMarker(defaultLocation); // Añade un marcador en la ubicación por defecto
                cargarCobros(); // Llama a cargarCobros si no se pudo obtener la ubicación actual
            }
        );
    } else {
        // Si el navegador no soporta geolocalización, usa la ubicación por defecto
        map.setCenter(defaultLocation);
        //addMarker(defaultLocation); // Añade un marcador en la ubicación por defecto
        cargarCobros(); // Llama a cargarCobros si no se soporta geolocalización
    }
}
function updateMarkerLocation(marker) {
    const index = markers.indexOf(marker);
    const newPosition = marker.getPosition();

    // Actualiza la posición del marcador en la polilínea
    path.setAt(index, newPosition);

    // Actualiza la posición en 'locations' si es necesario
    if (index >= 0 && index < locations.length) {
        locations[index].latlng = newPosition;

        // Actualiza el listado de ubicaciones
        updateLocationList();
    } else {
        console.error('Índice de marcador fuera de rango');
    }
}
function addMarkerToOrderedList(marker) {
    const index = markers.indexOf(marker);
    let number = locations[index].number;

    if (number !== null) {
        // Si el marcador ya tiene un número asignado, elimínalo (doble clic)
        number = null;
        locations[index].number = number;
        marker.setLabel(null); // Elimina la etiqueta del marcador

        // Elimina el marcador del array orderedMarkers
        const markerIndex = orderedMarkers.indexOf(marker);
        if (markerIndex !== -1) {
            orderedMarkers.splice(markerIndex, 1);
        }

        // Actualiza los números de los marcadores restantes en orderedMarkers
        orderedMarkers.forEach((m, idx) => {
            const locIndex = markers.indexOf(m);
            locations[locIndex].number = idx + 1;
            const label = {
                text: (idx + 1).toString(),
                color: "white",
                fontSize: "12px",
                fontWeight: "bold"
            };
            m.setLabel(label);
        });

        // Actualiza la lista de ubicaciones
        updateLocationList();
    } else {
        // Si el marcador no tiene número asignado, asigna uno nuevo único
        number = orderedMarkers.length + 1;
        locations[index].number = number;

        const label = {
            text: number.toString(),
            color: "white",
            fontSize: "12px",
            fontWeight: "bold"
        };
        marker.setLabel(label);

        orderedMarkers.push(marker); // Agrega el marcador al array de marcadores ordenados

        // Actualiza la lista de ubicaciones
        updateLocationList();
    }
}

function updateMarkerLocation(marker) {
    const index = markers.indexOf(marker);
    const newPosition = marker.getPosition();

    // Actualiza la posición del marcador en la polilínea
    path.setAt(index, newPosition);

    // Actualiza la posición en 'locations' si es necesario
    if (index >= 0 && index < locations.length) {
        locations[index].latlng = newPosition;

        // Actualiza el listado de ubicaciones
        updateLocationList();
    } else {
        console.error('Índice de marcador fuera de rango');
    }
}
function updateLocationList() {
    const locationList = document.getElementById('location-list');
    locationList.innerHTML = '';
    orderedMarkers.forEach((marker, index) => {
        const li = document.createElement('li');
        li.textContent = `(${marker.cliente}) ${locations[markers.indexOf(marker)].number}. ${locations[markers.indexOf(marker)].address}`;

        // Agregar icono de eliminar usando Font Awesome
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fa fa-trash-o delete-icon';
        deleteIcon.setAttribute('aria-hidden', 'true');

        // Establecer color del ícono
        if (index === currentLocationIndex && locations[markers.indexOf(marker)].status === 'pending') {
            deleteIcon.style.color = 'green'; // Verde si es la ubicación actual pendiente
        } else {
            deleteIcon.style.color = 'red'; // Rojo en otros casos
        }

        deleteIcon.classList.add("ml-5", "me-2", "ms-2");
        deleteIcon.addEventListener('click', () => {
            deleteLocation(marker);
        });
        li.appendChild(deleteIcon);

        if (index === currentLocationIndex && locations[markers.indexOf(marker)].status === 'pending') {
            li.classList.add('yellow'); // Marca la ubicación actual en amarillo
        } else if (locations[markers.indexOf(marker)].status === 'visited') {
            li.classList.add('green'); // Marca la ubicación visitada en verde claro
        }

        locationList.appendChild(li);
    });

    // Scroll hacia abajo del listado
    locationList.scrollTop = locationList.scrollHeight;
}

function deleteLocation(marker) {
    const index = markers.indexOf(marker);
    if (index !== -1) {
        // Eliminar el marcador del mapa
        marker.setMap(null);
        markers.splice(index, 1);
        orderedMarkers.splice(orderedMarkers.indexOf(marker), 1);
        locations.splice(index, 1);

        // Reindexar los números de ubicación
        reindexLocations();

        // Limpiar y volver a dibujar la polilínea
        path.clear();
        markers.forEach((marker) => {
            path.push(marker.getPosition());
        });

        // Actualizar la lista de ubicaciones
        updateLocationList();
    }
}
function reindexLocations() {
    // Reindexar los números de ubicación después de eliminar una ubicación
    orderedMarkers.forEach((marker, index) => {
        locations[markers.indexOf(marker)].number = index + 1;
        const label = {
            text: (index + 1).toString(),
            color: "white",
            fontSize: "12px",
            fontWeight: "bold"
        };
        marker.setLabel(label);
    });
}

function armarRecorrido() {
    // Eliminar todos los marcadores y líneas trazadas del mapa que no están en la lista ordenada
    clearUnorderedMarkersAndLines();

    if (orderedMarkers.length > 0) {
        document.getElementById('ir').disabled = false;
        document.getElementById('siguiente').disabled = false;
        currentLocationIndex = 0;
        locations[markers.indexOf(orderedMarkers[currentLocationIndex])].status = 'pending';
        updateLocationList();
        startWatchingLocation(); // Inicia el seguimiento de ubicación
        armarRecorridoCobranzas();
    } else {
        alert('No hay ubicaciones seleccionadas.');
    }
}

async function armarRecorridoCobranzas() {
    var idVendedor = localStorage.getItem("R_IdVendedor");
    var idCobrador = localStorage.getItem("R_IdCobrador");
    var fechaCobroDesde = localStorage.getItem("R_FechaCobroDesde");
    var fechaCobroHasta = localStorage.getItem("R_FechaCobroHasta");
    var DNI = localStorage.getItem("R_Dni") != null ? localStorage.getItem("R_Dni") : "";
    var idZona = localStorage.getItem("R_Zona");


    let arrClientes = [];

    // Assuming `cliente` is an object containing client details
    orderedMarkers.forEach(marker => {
        arrClientes.push(marker.id);
    });

    var clientesStr = arrClientes.join(',');

    var url = `/Recorrido/ArmarRecorrido?idVendedor=${idVendedor}&IdCobrador=${idCobrador}&FechaCobroDesde=${fechaCobroDesde}&FechaCobroHasta=${fechaCobroHasta}&Dni=${DNI}&idZona=${idZona}&Clientes=${clientesStr}`;

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
        document.location.href = "../../../Cobranzas/Index/";
    }
}

function clearUnorderedMarkersAndLines() {
    // Obtener los marcadores que deben eliminarse
    const unorderedMarkers = markers.filter(marker => !orderedMarkers.includes(marker));

    // Eliminar los marcadores del mapa y limpiar los arrays
    unorderedMarkers.forEach(marker => {
        marker.setMap(null); // Elimina el marcador del mapa
        const index = markers.indexOf(marker);
        markers.splice(index, 1);
        locations.splice(index, 1);
    });

    // Limpiar la polilínea de los puntos de los marcadores no ordenados
    path.clear();
    markers.forEach(marker => {
        path.push(marker.getPosition()); // Vuelve a agregar los puntos de los marcadores restantes a la polilínea
    });

    // Actualizar la lista de ubicaciones
    updateLocationList();
}

function irAUbicacion() {
    if (currentLocationIndex < orderedMarkers.length) {
        const location = locations[markers.indexOf(orderedMarkers[currentLocationIndex])];
        calculateAndDisplayRoute(location.latlng); // Calcula y muestra la ruta
    } else {
        alert('No hay más ubicaciones.');
    }
}
function siguienteUbicacion() {
    if (currentLocationIndex < orderedMarkers.length - 1) {
        currentLocationIndex++;
        locations[markers.indexOf(orderedMarkers[currentLocationIndex])].status = 'pending';
        locations[markers.indexOf(orderedMarkers[currentLocationIndex - 1])].status = 'visited';
        updateLocationList();
        const nextLocation = locations[markers.indexOf(orderedMarkers[currentLocationIndex])];
        calculateAndDisplayRoute(nextLocation.latlng); // Calcula y muestra la ruta a la siguiente ubicación
    } else {
        alert('Has llegado al final del recorrido.');
        finalizarRecorrido();
        
    }
}
function calculateAndDisplayRoute(destination) {
    var destLat = typeof destination.lat === 'function' ? destination.lat() : destination.lat;
    var destLng = typeof destination.lng === 'function' ? destination.lng() : destination.lng;
    var destino = destLat + ',' + destLng;
    var abrir = function (origen) {
        var url = origen
            ? 'https://www.google.com/maps/dir/?api=1&origin=' + origen + '&destination=' + destino + '&travelmode=driving'
            : 'https://www.google.com/maps/search/?api=1&query=' + destino;
        window.open(url, '_blank');
    };
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => abrir(position.coords.latitude + ',' + position.coords.longitude),
            () => abrir(null)
        );
    } else {
        abrir(null);
    }
}
function startWatchingLocation() {
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const currentPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                // Verifica la distancia a la ubicación actual pendiente
                const targetLocation = locations[markers.indexOf(orderedMarkers[currentLocationIndex])].latlng;
                const distance = google.maps.geometry.spherical.computeDistanceBetween(
                    new google.maps.LatLng(currentPos),
                    new google.maps.LatLng(targetLocation)
                );

                if (distance < 50) { // Si la distancia es menor a 50 metros, marca como visitada y avanza
                    locations[markers.indexOf(orderedMarkers[currentLocationIndex])].status = 'visited';
                    siguienteUbicacion();
                }
            },
            (error) => {
                console.error('Error al obtener la ubicación: ' + error.message);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );
    } else {
        window.alert('Browser doesn\'t support Geolocation');
    }
}
function finalizarRecorrido() {
    // Elimina todos los marcadores del mapa y limpia los arrays
    markers.forEach(marker => {
        marker.setMap(null);
    });
    markers = [];
    orderedMarkers = [];
    locations = [];
    currentLocationIndex = 0;

    // Limpia la polilínea
    poly.setMap(null);
    path = new google.maps.MVCArray();
    poly = new google.maps.Polyline({
        strokeColor: '#000000',
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: map
    });

    // Actualiza la lista de ubicaciones
    updateLocationList();

    // Deshabilita los botones
    document.getElementById('ir').disabled = true;
    document.getElementById('siguiente').disabled = true;

    // Centra el mapa en una posición inicial y restaura el nivel de zoom
    map.setCenter({ lat: -29.171581, lng: -59.26997 });
    map.setZoom(15);

    // Detiene el seguimiento de la ubicación
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }

    document.location.href = "../../../Cobranzas/Index/";
}

async function cargarCobros() {
    try {
        var idVendedor = localStorage.getItem("R_IdVendedor");
        var idCobrador = localStorage.getItem("R_IdCobrador");
        var fechaCobroDesde = localStorage.getItem("R_FechaCobroDesde");
        var fechaCobroHasta = localStorage.getItem("R_FechaCobroHasta");
        var DNI = localStorage.getItem("R_Dni") != null ? localStorage.getItem("R_Dni") : "" ;
        var idZona = localStorage.getItem("R_Zona");
        var Turno = localStorage.getItem("R_Turno");
        var TipoNegocio = localStorage.getItem("R_TipoNegocio");
        var url = `/Cobranzas/Listar?idVendedor=${idVendedor}&IdCobrador=${idCobrador}&FechaCobroDesde=${fechaCobroDesde}&FechaCobroHasta=${fechaCobroHasta}&Dni=${DNI}&idZona=${idZona}&Turno=${Turno}&TipoNegocio=${TipoNegocio}&CobrosPendientes=${-1}`;

        let value = JSON.stringify({

        });

        let options = {
            type: "GET",
            url: url,
            async: true,
            data: value,
            contentType: "application/json",
            dataType: "json"
        };

        let result = await MakeAjax(options);

        if (result != null) {
            createMarkers(result.data);
        }

    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.');
        $('.datos-error').removeClass('d-none');
    }
}

function createMarkers(clientData) {
    // Itera sobre los datos del cliente para crear los marcadores
    clientData.forEach(client => {
        const lat = client.Latitud;
        const lng = client.Longitud;
        const clientName = client.Cliente; // Suponiendo que 'Cliente' es el campo que contiene el nombre del cliente

        // Valida si latitud y longitud son válidas
        if (lat && lng) {
            // Crea un objeto LatLng para la posición del marcador
            const clientLatLng = new google.maps.LatLng(lat, lng);

            // Añade el punto a la polilínea
            path.push(clientLatLng);

            // Crea el marcador en la posición especificada
            const marker = new google.maps.Marker({
                position: clientLatLng,
                map: map,
                draggable: false, // Cambia a `true` si quieres que el marcador sea arrastrable
                title: clientName, // Título del marcador con el nombre del cliente
                cliente: client.Cliente,
                id: client.idCliente
                //label: {
                //    text: clientName, // Nombre del cliente
                //    color: 'red', // Color del texto en rojo
                //    fontWeight: 'bold', // Opcional: negrita para el texto
                //    fontSize: '14px', // Opcional: tamaño de fuente personalizado
                //    fontFamily: 'Arial', // Opcional: tipo de fuente personalizado
                //    labelOrigin: new google.maps.Point(0, -30) // Ajusta el origen de la etiqueta para posicionarla debajo del marcador
                //}
            });

            // Añade listeners al marcador
            marker.addListener('click', () => {
                addMarkerToOrderedList(marker);
            });

            marker.addListener('dragend', () => {
                updateMarkerLocation(marker);
            });

            // Almacena el marcador en el array de marcadores
            markers.push(marker);

            // La dirección ya viene en la cobranza. No pedirla de nuevo a Google.
            locations.push({
                latlng: clientLatLng,
                address: client.Direccion || client.DireccionCliente || '',
                status: 'pending',
                number: null
            });
        }
    });
}
