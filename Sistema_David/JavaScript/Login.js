(function () {
    "use strict";

    let loginEnProceso = false;

    document.addEventListener("DOMContentLoaded", function () {

        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");
        const btnLogin = document.querySelector(".login-btn");
        const form = document.getElementById("loginForm");

        const errorDiv = document.getElementById("diverrorMessage");
        const errorMsg = document.getElementById("errorMessage");

        const checkIcon = document.getElementById("checkIcon");
        const rememberMe = document.getElementById("rememberMe");

        /* =========================================================
           👁️ TOGGLE PASSWORD
        ========================================================= */
        document.getElementById("togglePassword").addEventListener("click", function () {
            const icon = this.querySelector("i");

            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            } else {
                passwordInput.type = "password";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        });

        /* =========================================================
           🎨 TEMA LOGIN
        ========================================================= */
        const tipo = (localStorage.getItem("tipoSistemaVentas") || "").toLowerCase();
        const logo = document.getElementById("loginLogo");

        if (tipo === "electro") {
            document.body.classList.add("tema-electro");
            if (logo) logo.src = "/Imagenes/LoginElectrodomesticos.png";
        } else {
            document.body.classList.remove("tema-electro");
            if (logo) logo.src = "/Imagenes/Login.png";
        }

        /* =========================================================
           💾 RECORDAR CREDENCIALES
        ========================================================= */
        if (localStorage.getItem('rememberMe') === 'true') {
            usernameInput.value = localStorage.getItem('username') || "";
            passwordInput.value = localStorage.getItem('password') || "";
            rememberMe.checked = true;
            checkIcon.style.display = "inline";
        }

        rememberMe.addEventListener("change", function () {
            if (this.checked) {
                localStorage.setItem('username', usernameInput.value);
                localStorage.setItem('password', passwordInput.value);
                localStorage.setItem('rememberMe', true);
                checkIcon.style.display = "inline";
            } else {
                localStorage.removeItem('username');
                localStorage.removeItem('password');
                localStorage.removeItem('rememberMe');
                checkIcon.style.display = "none";
            }
        });

        /* =========================================================
           ⌨️ ENTER (PC + MOBILE)
        ========================================================= */
        usernameInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                passwordInput.focus();
            }
        });

        passwordInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                form.requestSubmit();
            }
        });

        /* =========================================================
           🚀 SUBMIT LOGIN
        ========================================================= */
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            if (loginEnProceso) return;

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !password) {
                mostrarError("Completá usuario y contraseña.");
                return;
            }

            loginEnProceso = true;
            activarLoading(true);

            try {

                const response = await fetchConTimeout(loginUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Usuario: username,
                        Contrasena: password
                    })
                }, 10000);

                if (!response.ok) throw new Error("Error servidor");

                const data = await response.json();

                if (data.Status) {

                    if (rememberMe.checked) {
                        localStorage.setItem('username', username);
                        localStorage.setItem('password', password);
                        localStorage.setItem('rememberMe', true);
                    }

                    localStorage.setItem("usuario", JSON.stringify(data.Data));

                    window.location.href =
                        tipo === "electro"
                            ? "/Ventas_Electrodomesticos/Historial/"
                            : "/Ventas/Index/";

                } else {
                    mostrarError(data.Mensaje || "Usuario o contraseña incorrectos.");
                }

            } catch (error) {
                console.error(error);
                mostrarError("Error de conexión. Intentá nuevamente.");
            } finally {
                loginEnProceso = false;
                activarLoading(false);
            }
        });

        /* =========================================================
           🔧 FUNCIONES AUXILIARES
        ========================================================= */

        function activarLoading(estado) {
            if (estado) {
                btnLogin.disabled = true;
                btnLogin.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    Ingresando...
                `;
            } else {
                btnLogin.disabled = false;
                btnLogin.innerHTML = "Ingresar";
            }
        }

        function mostrarError(msg) {
            errorMsg.textContent = msg;
            errorDiv.style.display = "block";

            setTimeout(() => {
                errorDiv.style.display = "none";
            }, 3000);
        }

        function fetchConTimeout(url, options, timeout = 10000) {
            return Promise.race([
                fetch(url, options),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout")), timeout)
                )
            ]);
        }

    });

})();