let gridInfoCliente;
let userSession;

$(document).ready(function () {



    $("#IdInformacionCliente").text(localStorage.getItem("informacionClienteCero"));
    userSession = JSON.parse(sessionStorage.getItem('usuario'));
    configurarDataTable();

    $("#btnClientes").css("background", "#2E4053");
 
    

});

async function configurarDataTable() {

    let idCliente = parseInt(localStorage.getItem("informacionClienteCero"))

    gridInfoCliente = $('#grdInformacionCliente').DataTable({
        "ajax": {
            "url": `/ClientesCero/ListarInformacion?idCliente=${idCliente}`,
            "type": "GET",
            "dataType": "json"
        },
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
        },
        scrollX: true,
        "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
        "columns": [
            { "data": "Fecha" },
            { "data": "Cliente" },
            { "data": "Vendedor" },
            {"data": "Observacion" },
        ],
        "columnDefs": [

            {
                targets: [0],
                render: function (data) {
                    return moment(data).format('DD/MM/YYYY');
                }
            },
        ],
    });



    //if (userSession.IdRol != 1) { //vendedor
    //    gridInfoCliente.column(-1).visible(false); // Ocultar la última columna si el usuario tiene el rol vendedor
    //}
  
}
function nuevaInformacion() {
    $("#informacionModal").modal("show");
}

function mostrarObservacionCompleta(observacion) {
    alert(observacion);
}



async function agregarInformacion() {


    try {

        if (document.getElementById("Descripcion").value == "") {
            alert("Debes escribir una descripcion.")
            return false;
        }
        var url = "/ClientesCero/AgregarInformacion";



            let value = JSON.stringify({
                IdCliente: document.getElementById("IdInformacionCliente").innerText,
                Observacion: document.getElementById("Descripcion").value,

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

                alert('Informacion realizada correctamente.');
                document.location.href = "../ClientesCero/Informacion/";
            } else {
                alert('Los datos que has ingresado son incorrectos.');
            }

    } catch (error) {
        alert('Ha ocurrido un error en los datos. Vuelva a intentarlo');
    }
}
