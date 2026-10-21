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
        const togglePassword = document.getElementById("togglePassword");
        if (togglePassword) {
            togglePassword.addEventListener("click", function () {
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
        }

        const tipo = (localStorage.getItem("tipoSistemaVentas") || "").toLowerCase();

        if (tipo === "electro") {
            document.body.classList.add("tema-electro");
        } else {
            document.body.classList.remove("tema-electro");
        }

        // Una sola marca en pantalla (.login-mark). El img queda oculto por compat.
        const logo = document.getElementById("loginLogo");
        if (logo) logo.src = "/Imagenes/LogoDG.svg";

        if (localStorage.getItem("rememberMe") === "true") {
            usernameInput.value = localStorage.getItem("username") || "";
            passwordInput.value = localStorage.getItem("password") || "";
            rememberMe.checked = true;
            if (checkIcon) checkIcon.style.display = "inline";
        }

        rememberMe.addEventListener("change", function () {
            if (this.checked) {
                localStorage.setItem("username", usernameInput.value);
                localStorage.setItem("password", passwordInput.value);
                localStorage.setItem("rememberMe", true);
                if (checkIcon) checkIcon.style.display = "inline";
            } else {
                localStorage.removeItem("username");
                localStorage.removeItem("password");
                localStorage.removeItem("rememberMe");
                if (checkIcon) checkIcon.style.display = "none";
            }
        });

        usernameInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                passwordInput.focus();
            }
        });

        passwordInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                if (typeof form.requestSubmit === "function") form.requestSubmit();
                else form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
            }
        });

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
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ Usuario: username, Contrasena: password })
                }, 10000);

                if (!response.ok) throw new Error("Error servidor");

                const data = await response.json();

                if (data.Status) {
                    if (rememberMe.checked) {
                        localStorage.setItem("username", username);
                        localStorage.setItem("password", password);
                        localStorage.setItem("rememberMe", true);
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

        function activarLoading(estado) {
            if (!btnLogin) return;
            if (estado) {
                btnLogin.disabled = true;
                btnLogin.innerHTML = '<span class="login-btn__label"><i class="fa fa-circle-o-notch fa-spin"></i> Ingresando...</span>';
            } else {
                btnLogin.disabled = false;
                btnLogin.innerHTML = '<span class="login-btn__label">Ingresar</span>';
            }
        }

        function mostrarError(msg) {
            if (!errorDiv || !errorMsg) return;
            errorMsg.textContent = msg;
            errorDiv.style.display = "flex";
            setTimeout(function () { errorDiv.style.display = "none"; }, 3200);
        }

        function fetchConTimeout(url, options, timeout) {
            timeout = timeout || 10000;
            return Promise.race([
                fetch(url, options),
                new Promise(function (_, reject) {
                    setTimeout(function () { reject(new Error("Timeout")); }, timeout);
                })
            ]);
        }

    });
})();
