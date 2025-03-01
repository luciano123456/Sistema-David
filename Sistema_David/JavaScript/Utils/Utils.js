async function MakeAjax(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: options.dataType,
        contentType: options.contentType
    });
}


function MakeAjaxSync(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: options.dataType,
        contentType: options.contentType
    });
}


async function MakeAjaxFormData(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: false,
        contentType: false,
        isFormData: true,
        processData: false
    });
}




function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) {
        return "$0.00"; // Devuelve un valor predeterminado si 'number' no es válido
    }

    // Asegúrate de que el número tenga dos decimales
    const parts = number.toFixed(2).split(".");

    // Formatea la parte entera con puntos como separadores de miles
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // Combina la parte entera y la parte decimal
    return "$" + parts.join(",");
}
