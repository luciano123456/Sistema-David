let listaVacia = false;


document.addEventListener("DOMContentLoaded", async function () {



    var userSession = JSON.parse(localStorage.getItem('usuario'));

    if (userSession != null) {
        $('#nombre').text(userSession.Nombre);
        if (userSession.IdRol != 2) {
            document.getElementById("divNotificacionComprobante").removeAttribute("hidden");
            document.getElementById("divNotificacionHome").removeAttribute("hidden") ;
            CantidadClientesAusentes();
            CantidadComprobantes();
            CantidadStocksPendientes();
        }
    }

   

    if (userSession) {
        // Si el usuario está en el localStorage, actualizar el texto del enlace
        var userFullName = userSession.Nombre + ' ' + userSession.Apellido;
        $("#userName").html('<i class="fa fa-user"></i> ' + userFullName); // Cambiar el contenido del enlace

    }

    await verificarRoles(userSession.IdRol);
    // Busca todos los elementos con la clase "dropdown-toggle"
    var dropdownToggleList = document.querySelectorAll('.dropdown-toggle');

    // Itera sobre cada elemento y agrega un evento de clic
    dropdownToggleList.forEach(function (dropdownToggle) {
        dropdownToggle.addEventListener('click', function (event) {
            event.preventDefault(); // Evita la acción predeterminada del enlace

            // Obtiene el menú desplegable correspondiente
            var dropdownMenu = dropdownToggle.nextElementSibling;

            // Cambia el atributo "aria-expanded" para alternar la visibilidad del menú desplegable
            var isExpanded = dropdownToggle.getAttribute('aria-expanded') === 'true';
            dropdownToggle.setAttribute('aria-expanded', !isExpanded);
            dropdownMenu.classList.toggle('show'); // Agrega o quita la clase "show" para mostrar u ocultar el menú desplegable
        });
    });

    // Agrega un manejador de eventos de clic al documento para ocultar el menú desplegable cuando se hace clic en cualquier lugar que no sea el menú desplegable
    document.addEventListener('click', function (event) {
        var isDropdownToggle = event.target.closest('.dropdown-toggle'); // Verifica si el elemento clicado es un elemento con la clase "dropdown-toggle"
        var isDropdownMenu = event.target.closest('.dropdown-menu'); // Verifica si el elemento clicado es un menú desplegable

        // Si el elemento clicado no es un menú desplegable ni un elemento con la clase "dropdown-toggle", oculta todos los menús desplegables
        if (!isDropdownToggle && !isDropdownMenu) {
            var dropdownMenus = document.querySelectorAll('.dropdown-menu.show');
            dropdownMenus.forEach(function (dropdownMenu) {
                dropdownMenu.classList.remove('show');
                var dropdownToggle = dropdownMenu.previousElementSibling;
                dropdownToggle.setAttribute('aria-expanded', 'false');
            });
        }
    });
});



document.querySelectorAll('.nav-item.dropdown').forEach(dropdown => {
    dropdown.addEventListener('mouseenter', function () {
        const dropdownMenu = this.querySelector('.dropdown-menu');
        dropdownMenu.classList.add('show'); // Mostrar el dropdown
    });

    dropdown.addEventListener('mouseleave', function () {
        const dropdownMenu = this.querySelector('.dropdown-menu');
        dropdownMenu.classList.remove('show'); // Ocultar el dropdown
    });
});


async function CantidadComprobantes() {

    var url = "/Rendimiento/MostrarCantidadComprobantes";

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
        document.getElementById("notificacionComprobante").textContent = ` (${result.cantidad})`;
    } else {
        document.getElementById("notificacionComprobante").textContent = ` (${0})`;
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
        document.getElementById("notificationHome").textContent = ` (${result.cantidad})`;
    } else {
        document.getElementById("notificationHome").textContent = ` (${0})`;
    }


}

async function CantidadStocksPendientes() {

    var url = "/StockPendiente/MostrarCantidadStocksPendientes";

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

    if (result > 0) {

        document.getElementById("notificationStock").style.display = "inline";
        document.getElementById("notificationStock").textContent = ` (${result})`;
    } else {
        document.getElementById("notificationStock").style.display = "inline";
        document.getElementById("notificationStock").textContent = ` (${result})`;
    }

}

async function cerrarSession() {
    try {
        if (confirm("¿Está seguro que desea salir?")) {
            var url = "/Login/CerrarSesion";

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

            if (result.Status) {
                document.location.href = "/Rendimiento/Index";
            }

        }
    } catch (error) {
        alert(error);
    }
}

function verificarRoles(idRol) {

    if (idRol == 1) { //ADMINISTRADOR
        document.getElementById("seccionUsuarios").removeAttribute("hidden");
        document.getElementById("seccionProductos").removeAttribute("hidden");
        document.getElementById("seccionClientes").removeAttribute("hidden");
        document.getElementById("seccionCobranzas").removeAttribute("hidden");
        document.getElementById("seccionRendimiento").removeAttribute("hidden");
        //document.getElementById("seccionPedidos").removeAttribute("hidden");
    } else if (idRol == 3) { //COBRADOR
        document.getElementById("seccionCobranzas").removeAttribute("hidden");
        document.getElementById("seccionClientesCero").removeAttribute("hidden");
        document.getElementById("seccionStock").removeAttribute("hidden");
    } else if (idRol == 4) { //COMPROBANTES
        document.getElementById("seccionRendimiento").removeAttribute("hidden");
        document.getElementById("seccionClientesCero").removeAttribute("hidden");
        document.getElementById("seccionProductos").removeAttribute("hidden");
        document.getElementById("seccionCobranzas").removeAttribute("hidden");
    } else {
        document.getElementById("seccionStock").removeAttribute("hidden");
        document.getElementById("seccionClientesCero").removeAttribute("hidden");
    }

}