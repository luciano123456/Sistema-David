let map;
let poly;
let path;
let geocoder;
let locations = [];
let currentLocationIndex = 0;
let markers = []; // Array para almacenar los marcadores
let orderedMarkers = []; // Array para almacenar los marcadores ordenados
let directionsService;
let directionsRenderer;
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

        // Inicializa el servicio de geocodificación
        geocoder = new google.maps.Geocoder();

        // Inicializa la polilínea para dibujar el recorrido
        poly = new google.maps.Polyline({
            strokeColor: '#000000',
            strokeOpacity: 1.0,
            strokeWeight: 3
        });
        poly.setMap(map);

        path = poly.getPath();

        // Listener para el evento 'click' en el mapa
        map.addListener('click', (event) => {
            const point = event.latLng;
            path.push(point);

            const marker = new google.maps.Marker({
                position: point,
                map: map,
                draggable: true // Permite arrastrar el marcador
            });

            marker.addListener('dblclick', () => {
                addMarkerToOrderedList(marker);
            });

            marker.addListener('dragend', () => {
                updateMarkerLocation(marker);
            });

            markers.push(marker); // Almacena el marcador en el array

            // Obtiene la dirección para las coordenadas clickeadas y actualiza la lista
            geocodeLatLng(point);
        });

        // Configura el buscador de lugares
        const input = document.getElementById('pac-input');
        const searchBox = new google.maps.places.SearchBox(input);
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

        // Sesgo de los resultados de la búsqueda hacia el área del mapa actual
        map.addListener('bounds_changed', () => {
            searchBox.setBounds(map.getBounds());
        });

        // Listener para los cambios en el buscador de lugares
        searchBox.addListener('places_changed', () => {
            const places = searchBox.getPlaces();

            if (places.length == 0) {
                return;
            }

            // Ajusta los límites del mapa a los lugares encontrados
            const bounds = new google.maps.LatLngBounds();
            places.forEach((place) => {
                if (!place.geometry || !place.geometry.location) {
                    console.log("Returned place contains no geometry");
                    return;
                }

                const marker = new google.maps.Marker({
                    map: map,
                    title: place.name,
                    position: place.geometry.location,
                    draggable: true // Permite arrastrar el marcador
                });

                marker.addListener('dblclick', () => {
                    addMarkerToOrderedList(marker);
                });

                marker.addListener('dragend', () => {
                    updateMarkerLocation(marker);
                });

                markers.push(marker); // Almacena el marcador en el array

                if (place.geometry.viewport) {
                    // Solo geocodificaciones tienen vista
                    bounds.union(place.geometry.viewport);
                } else {
                    bounds.extend(place.geometry.location);
                }
            });
            map.fitBounds(bounds);
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
                },
                () => {
                    // Si no se puede obtener la ubicación actual, usa la ubicación por defecto
                    map.setCenter(defaultLocation);
                    //addMarker(defaultLocation); // Añade un marcador en la ubicación por defecto
                }
            );
        } else {
            // Si el navegador no soporta geolocalización, usa la ubicación por defecto
            map.setCenter(defaultLocation);
            //addMarker(defaultLocation); // Añade un marcador en la ubicación por defecto
        }
    };


function geocodeLatLng(latlng) {
    geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === "OK") {
            if (results[0]) {
                const address = results[0].formatted_address;
                locations.push({ latlng: latlng, address: address, status: 'pending', number: null });
                updateLocationList();
            } else {
                alert("No se encontraron resultados.");
            }
        } else {
            alert("Geocoder falló debido a: " + status);
        }
    });
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
        li.textContent = `${locations[markers.indexOf(marker)].number}. ${locations[markers.indexOf(marker)].address}`;

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
    if (orderedMarkers.length > 0) {
        document.getElementById('ir').disabled = false;
        document.getElementById('siguiente').disabled = false;
        currentLocationIndex = 0;
        locations[markers.indexOf(orderedMarkers[currentLocationIndex])].status = 'pending';
        updateLocationList();
        startWatchingLocation(); // Inicia el seguimiento de ubicación
    } else {
        alert('No hay ubicaciones seleccionadas.');
    }
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
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const origin = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                directionsService.route(
                    {
                        origin: origin,
                        destination: destination,
                        travelMode: google.maps.TravelMode.DRIVING
                    },
                    (response, status) => {
                        if (status === google.maps.DirectionsStatus.OK) {
                            directionsRenderer.setDirections(response);
                        } else {
                            window.alert('Directions request failed due to ' + status);
                        }
                    }
                );
            },
            () => {
                window.alert('Geolocation failed.');
            }
        );
    } else {
        window.alert('Browser doesn\'t support Geolocation');
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
}



function cargarCobros() {
    try {
        var idVendedor = localStorage.getItem("R_IdVendedor");
        var idCobrador = localStorage.getItem("R_IdCobrador");
        var fechaCobroDesde = localStorage.getItem("R_FechaCobroDesde");
        var fechaCobroHasta = localStorage.getItem("R_FechaCobroDesde");
        var DNI = localStorage.getItem("r_Dni");
        var idZona = localStorage.getItem("r_idZona");
        var url = `/Cobranzas/Listar?idVendedor=${idVendedor}&IdCobrador=${idCobrador}&FechaCobroDesde=${fechaCobroDesde}&FechaCobroHasta=${fechaCobroHasta}&Dni=${DNI}&idZona=${idZona}`;

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

        }

        initMap();
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.');
        $('.datos-error').removeClass('d-none');
    }
}
