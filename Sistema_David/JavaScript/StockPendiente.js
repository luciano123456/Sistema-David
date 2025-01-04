const precioVenta = [];
const productos = [];
let userSession;
let idUserStock = 0;
let cardsSeleccionadas = [];

$(document).ready(async function () {
    userSession = JSON.parse(sessionStorage.getItem('usuario'));



    if (userSession.IdRol == 1) {
        idUserStock = localStorage.getItem("idUserStock");
        $("#Filtros").removeAttr("hidden");
    } else {
        idUserStock = userSession.Id;
    }


    document.getElementById("Fecha").value = moment().format('YYYY-MM-DD');;


    cargarEstados();
    cargarUsuarios();


    



    if (userSession.IdRol == 1) { //Administrador
        await cargarStock(-1, "Pendiente", document.getElementById("Fecha").value);
        $("#btnUsuarios").css("background", "#2E4053");
        document.getElementById("divStock").removeAttribute("hidden");
        document.getElementById("btnAgregar").removeAttribute("hidden");
    } else {
        cargarStock(userSession.Id, "Pendiente", document.getElementById("Fecha").value);
        $("#btnStock").css("background", "#2E4053");
    }



});


function aplicarFiltros() {

    document.querySelector('.cards-container').innerHTML = '';

    var idVendedor = document.getElementById("Vendedores").value;
    var estado = document.getElementById("Estados").options[document.getElementById("Estados").selectedIndex].text;;

    cargarStock(idVendedor, estado, document.getElementById("Fecha").value);

}

async function cargarEstados() {
    try {

        selectEstados = document.getElementById("Estados");

        $('#Estados option').remove();

        option = document.createElement("option");
        option.value = -1;
        option.text = "Todos";
        selectEstados.appendChild(option);

        option = document.createElement("option");
        option.value = 1;
        option.text = "Aceptado";
        selectEstados.appendChild(option);

        option = document.createElement("option");
        option.value = 2;
        option.text = "Rechazado";
        selectEstados.appendChild(option);

        option = document.createElement("option");
        option.value = 3;
        option.text = "Pendiente";
        selectEstados.appendChild(option);

        selectEstados.value = 3;


    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}

async function cargarUsuarios() {
    try {
        var url = "/usuarios/ListarUserActivos";

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

            if (userSession.IdRol == 1) { //ROL ADMINISTRADOR
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

async function cargarStock(idUsuario, Estado, Fecha) {
    try {
        var url = "/StockPendiente/ListarStockPendiente";

        let value = JSON.stringify({
            Id: idUsuario,
            Estado: Estado,
            Fecha: Fecha,
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
            for (let i = 0; i < result.data.length; i++) {
                var cardsContainer = document.querySelector('.cards-container');
                var newCard = document.createElement('div');
                var cardId = result.data[i].Id;
                newCard.id = cardId;
                newCard.classList.add('card', 'mb-3', 'position-relative');

                // Mostrar la parte azul y la parte blanca común a ambos tipos de asignación
                newCard.innerHTML = `
            <div class="half-blue">
                <span class="texto-titulo text-white">${result.data[i].Usuario}</span>
                <div class="round-image"></div>
                ${userSession.IdRol === 1 && result.data[i].Estado === "Pendiente" && result.data[i].Asignacion == "USUARIO" ?
                        `<input type="checkbox" class="form-check-input checkbox position-absolute top-0 end-0 me-2 mt-2" id="checkbox-${cardId}" onclick="toggleCheckbox(${cardId})">
                     <label for="checkbox-${cardId}" class="form-check-label position-absolute top-0 end-0"></label>
                     <div class="icons-container position-absolute top-30 end-0 translate-middle-y me-2">
                         <i class="fa fa-pencil-square-o text-yellow edit-icon" aria-hidden="true" onclick="editarStock(${cardId})" style="font-size: 1.2em; color: yellow; cursor: pointer;"></i>
                     </div>
                     <div class="icons-containereliminar position-absolute top-45 end-0 translate-middle-y me-2">
                         <i class="fa fa-times text-red delete-icon" aria-hidden="true" onclick="eliminarStock(${cardId})" style="font-size: 1.2em; color: red; cursor: pointer;"></i>
                     </div>`
                        : ''}
            </div>
            <div class="half-white">
                <div class="mt-2 text-center">
                    <i class="fa fa-info-circle me-1 mb-1" title="Nombre del producto"></i>
                    <span class="texto-titulo" style="font-weight: bold; color: blue;">${result.data[i].Cantidad} ${result.data[i].Producto}</span>
                </div>
                <div class="text-center">
                    <i class="fa fa-user me-1 mb-3" title="Usuario que te asigno el stock"></i>
                    <span class="texto-titulo">${result.data[i].UsuarioAsignado}</span>
                </div>
                <div class="botones mt-2">
                    ${result.data[i].Estado === 'Aceptado' ?
                        `<button class="btn btn-success full-width mt-4"><i class="fa fa-check"></i> Aceptado</button>` :
                        result.data[i].Estado === 'Rechazado' ?
                        `<button class="btn btn-danger full-width mt-4"><i class="fa fa-times"></i> Rechazado</button>` :



                        userSession.Id === result.data[i].IdUsuario && result.data[i].Estado === 'Pendiente' && result.data[i].Asignacion == "ADMINISTRADOR" && userSession.IdRol != 1 ?
                            `<div class="divBotones botones-row mt-4 row justify-content-center">
                             <button class="btn btn-success col-md-5 mb-2" onclick="aceptarStock(${cardId})"><i class="fa fa-check"></i> Aceptar</button>
                             <button class="btn btn-danger col-md-5 ms-2 mb-2" onclick="rechazarStock(${cardId})"><i class="fa fa-times"></i> Rechazar</button>` :



                        userSession.Id == result.data[i].IdUsuario && result.data[i].Estado === 'Pendiente' && result.data[i].Asignacion == "USUARIO" && userSession.IdRol != 1 ?
                            `<button class="btn btn-warning full-width mt-4"><i class="fa fa-clock-o"></i> Pendiente</button>` :

                           

                            userSession.Id === result.data[i].IdUsuario && result.data[i].Estado === 'Pendiente' && result.data[i].Asignacion == "USUARIO" && userSession.IdRol == 1 ?
                                `<div class="divBotones botones-row mt-4 row justify-content-center">
                             <button class="btn btn-success col-md-5 mb-2" onclick="aceptarStock(${cardId})"><i class="fa fa-check"></i> Aceptar</button>
                             <button class="btn btn-danger col-md-5 ms-2 mb-2" onclick="rechazarStock(${cardId})"><i class="fa fa-times"></i> Rechazar</button>` :
                            userSession.Id !== result.data[i].IdUsuario && result.data[i].Estado === 'Pendiente' && result.data[i].Asignacion == "USUARIO" ?
                                `<div class="divBotones botones-row mt-4 row justify-content-center">
                             <button class="btn btn-success col-md-5 mb-2" onclick="aceptarStock(${cardId})"><i class="fa fa-check"></i> Aceptar</button>
                             <button class="btn btn-danger col-md-5 ms-2 mb-2" onclick="rechazarStock(${cardId})"><i class="fa fa-times"></i> Rechazar</button>

                         </div>` :
                                userSession.Id !== result.data[i].IdUsuario && result.data[i].Estado === 'Pendiente' ?
                                    `<button class="btn btn-warning full-width mt-4"><i class="fa fa-clock-o"></i> Pendiente</button>` :
                                    ''
                    }
                </div>
            </div>`;

                var roundImage = newCard.querySelector('.round-image');
                var imageUrl = result.data[i].ImagenProducto == null ? "/Imagenes/productodefault.png" : 'data:image/png;base64,' + result.data[i].ImagenProducto;
                roundImage.style.backgroundImage = `url(${imageUrl})`;

                cardsContainer.appendChild(newCard);
            }

            let nombrecompleto = result.Nombre + " " + result.Apellido;
            $("#lblnombreusuario").text(nombrecompleto);

        } else {
            alert("Ha ocurrido un error en los datos");
        }

    } catch (error) {
        alert("Ha ocurrido un error en los datos");
    }
}



async function modificarStock() {

    try {
        var url = "/StockPendiente/ModificarStock";

        let value = JSON.stringify({
            id: document.querySelector("#idStock").value,
            cantidad: document.querySelector("#Cantidad").value
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

            $("#modalEdit").modal("hide");

            alert("Stock modificado correctamente");
            document.querySelector('.cards-container').innerHTML = '';
            cargarStock(-1, "Pendiente", document.getElementById("Fecha").value);

        } else {
            alert("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        alert("Ha ocurrido un error en los datos");
    }
}



const editarStock = async id => {

    try {
        var url = "/StockPendiente/EditarInfo";

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

            $("#modalEdit").modal("show");

            document.getElementById("idStock").value = result.data.Id;
            document.getElementById("Cantidad").value = result.data.Cantidad;

        } else {
            alert("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        alert("Ha ocurrido un error en los datos");
    }
}


async function aceptarStock(id) {
    try {
        var url = "/StockPendiente/AceptarStock";

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
            alert("El producto ha sido agregado a tu stock.");
            aplicarFiltros();
            desmarcarCheckBoxes();
        } else {
            alert("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        alert("Ha ocurrido un error en los datos");
    }
}


async function rechazarStock(id) {
    try {
        var url = "/StockPendiente/RechazarStock";

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
            alert("Has rechazado el producto.");
            aplicarFiltros();
            desmarcarCheckBoxes();
        } else {
            alert("Ha ocurrido un error en los datos");
        }
    } catch (error) {
        alert("Ha ocurrido un error en los datos");
    }
}







function toggleCheckbox(cardId) {
    const checkbox = document.getElementById(`checkbox-${cardId}`);
    if (checkbox.checked) {
        checkbox.nextElementSibling.style.backgroundColor = 'green'; // Cambia el color de fondo a verde cuando se marca
        cardsSeleccionadas.push(cardId); // Agrega la ID de la card al array de cards seleccionadas
    } else {
        checkbox.nextElementSibling.style.backgroundColor = ''; // Elimina el color de fondo cuando se desmarca
        const index = cardsSeleccionadas.indexOf(cardId);
        if (index > -1) {
            cardsSeleccionadas.splice(index, 1); // Elimina la ID de la card del array de cards seleccionadas
        }
    }

    if (cardsSeleccionadas.length > 0) {
        document.getElementById("btnAceptarTodas").style.display = "block";
        document.getElementById("btnRechazarTodas").style.display = "block";
    } else {
        document.getElementById("btnAceptarTodas").style.display = "none";
        document.getElementById("btnRechazarTodas").style.display = "none";
    }
}



function desmarcarCheckBoxes() {
    cardsSeleccionadas = []; // Vacía el array de cartas seleccionadas
    const checkboxes = document.querySelectorAll('[id^="checkbox-"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false; // Desmarca todas las casillas
        checkbox.nextElementSibling.style.backgroundColor = ''; // Restaura el color de fondo
    });
    document.getElementById("btnAceptarTodas").style.display = "none"; // Oculta el botón Aceptar Todas
    document.getElementById("btnRechazarTodas").style.display = "none"; // Oculta el botón Rechazar Todas
}

const eliminarStock = async id => {

    try {
        if (confirm("¿Está seguro que desea eliminar este stock?")) {
            var url = "/StockPendiente/EliminarStock";

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

            if (result.data) {
                alert('Stock eliminado correctamente.');
                $('.datos-error').removeClass('d-none');
                aplicarFiltros();
                desmarcarCheckBoxes();
            } else {
                $('.datos-error').text('Ha ocurrido un error en los datos.')
                $('.datos-error').removeClass('d-none')
            }
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}



async function aceptarStocks() {

    try {
        var url = "/StockPendiente/ModificarEstadoStockList";

        let value = JSON.stringify({
            stocks: JSON.stringify(cardsSeleccionadas),
            estado: "Aceptado",
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
            $("#modalEdit").modal("hide");
            document.getElementById("btnAceptarTodas").style.display = "none";
            document.getElementById("btnRechazarTodas").style.display = "none";
            alert("Stocks aceptados exitosamente.")
            aplicarFiltros();
            desmarcarCheckBoxes();
        } else {
            alert("No se han podido cambiar los estado correctamente.")
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}





async function rechazarStocks() {

    try {
        var url = "/StockPendiente/ModificarEstadoStockList";

        let value = JSON.stringify({
            stocks: JSON.stringify(cardsSeleccionadas),
            estado: "Rechazado",
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
            $("#modalEdit").modal("hide");
            document.getElementById("btnAceptarTodas").style.display = "none";
            document.getElementById("btnRechazarTodas").style.display = "none";
            alert("Stocks rechazados exitosamente.")
            aplicarFiltros();
            desmarcarCheckBoxes();
        } else {
            alert("No se han podido cambiar los estado correctamente.")
        }
    } catch (error) {
        $('.datos-error').text('Ha ocurrido un error.')
        $('.datos-error').removeClass('d-none')
    }
}



function abrirstockPendiente() {
    document.location.href = "../../StockPendiente/Index/";
}