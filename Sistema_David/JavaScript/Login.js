///*var url =  "//Login/Login_User";*/

async function Loguear() {
    const $botonLogin = $('.boton-login'); // Selecciona el botón por clase

    // Mostrar la barra de carga
    $botonLogin.css('opacity', '1');

    // Cambiar el texto del botón a "Cargando..."
    $botonLogin.text('Cargando...');

    $('.datos-error').text('');
    $('.datos-error').addClass('d-none');

    try {
        let value = JSON.stringify({
            Usuario: document.getElementById("Usuario").value,
            Contrasena: document.getElementById("Contrasena").value
        });

        let options = {
            type: "POST",
            url: '/Login/Login_User',
            async: true,
            data: value,
            contentType: "application/json",
            dataType: "json"
        };

        let result = await MakeAjax(options);

        if (result.Status) {
            $('.datos-error').text('');
            $('.datos-error').addClass('d-none');
            sessionStorage.setItem("usuario", JSON.stringify(result.Data));
            document.location.href = "../Ventas/Index";
        } else {
            $('.datos-error').text(result.Mensaje);
            $('.datos-error').removeClass('d-none');

            setTimeout(() => {
                $('.datos-error').text('');
                $('.datos-error').addClass('d-none');
            }, 2000);
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.');
        $('.datos-error').removeClass('d-none');
    } finally {
        // Restaurar el texto del botón a "Conectarse"
        $botonLogin.text('Conectarse');
    }
}


//ACCIONES AL APRETAR ENTER
document.getElementById('Usuario').addEventListener('keydown', inputUsuario);
function inputUsuario(event) {
    if (event.keyCode == 13) {
        document.getElementById('Contrasena').focus();
    }
}

document.getElementById('Contrasena').addEventListener('keydown', inputContrasena);
function inputContrasena(event) {
    if (event.keyCode == 13) {
        Loguear();
    }
}

function togglePassword() {
    var passwordField = document.getElementById("Contrasena");
    var passwordIcon = document.querySelector(".show-password");

    if (passwordField.type === "password") {
        passwordField.type = "text";
        passwordIcon.textContent = "👁️";
    } else {
        passwordField.type = "password";
        passwordIcon.textContent = "👁️";
    }
}