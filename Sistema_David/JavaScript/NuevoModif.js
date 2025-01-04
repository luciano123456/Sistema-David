async function agregarUsuario() {

    try {

        var url = "Usuarios/Nuevo";
        
        let value = JSON.stringify({
            Usuario: document.getElementById("Usuario").value,
            Contrasena: "asd",
            Nombre: document.getElementById("Nombre").value,
            Apellido: document.getElementById("Apellido").value,
            Dni: document.getElementById("Dni").value,
            Telefono: document.getElementById("Telefono").value,
            Direccion: document.getElementById("Direccion").value,
            Rol:document.getElementById("Rol").value
            
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
            alert('Usuario agregado correctamente.');
            $('.datos-error').removeClass('d-none');
            document.location.href = "../Index/";
        } else {
            $('.datos-error').text('Ha ocurrido un error en los datos.')
            $('.datos-error').removeClass('d-none')
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}


async function modificarUsuario() {

    try {

        var url = "Usuarios/Modificar";

        let value = JSON.stringify({
            Id: document.getElementById("IdUser").value,
            Usuario: document.getElementById("Usuario").value,
            Nombre: document.getElementById("Nombre").value,
            Apellido: document.getElementById("Apellido").value,
            Dni: document.getElementById("Dni").value,
            Telefono: document.getElementById("Telefono").value,
            Direccion: document.getElementById("Direccion").value,
            Rol: document.getElementById("Rol").value
        });

        let options = {
            type: "POST",
            url: url,
            async: true,
            data: value,
            contentType: "application/json",
            dataType: "json"
        };

        var result = await MakeAjax(options);

        if (result.Status) {
            $('.datos-error').text('Usuario modificado correctamente.')

            let ele = document.getElementById('datos');
            ele.setAttribute('style', 'color: #0B8B1D !important;');

       
            $('.datos-error').removeClass('d-none')
        } else {
            $('.datos-error').text('Ha ocurrido un error en los datos.')
            
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

