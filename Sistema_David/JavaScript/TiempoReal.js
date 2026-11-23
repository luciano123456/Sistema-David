(function (window, $) {
    if (window.TiempoReal) return;

    var handlers = {};
    var hub = null;
    var arrancando = false;
    var reconectarTimer = null;
    var intento = 0;
    var cola = [];
    var tabId = Math.random().toString(36).slice(2);
    var canal = null;
    var hubListo = false;

    try {
        if ("BroadcastChannel" in window) {
            canal = new BroadcastChannel("dg-tiempo-real");
        }
    } catch (e) { }

    function estadoConexion() {
        if (!$ || !$.connection || !$.connection.hub)
            return null;
        return $.connection.hub.state;
    }

    function estadoConnected() {
        return $ && $.signalR && $.signalR.connectionState
            ? $.signalR.connectionState.connected
            : 1;
    }

    function estaConectado() {
        return estadoConexion() === estadoConnected();
    }

    function estaOcupado() {
        if (arrancando) return true;
        if (!$ || !$.signalR || !$.signalR.connectionState) return false;
        var s = estadoConexion();
        return s === $.signalR.connectionState.connecting
            || s === $.signalR.connectionState.reconnecting;
    }

    function usuarioSesion() {
        try {
            return JSON.parse(localStorage.getItem("usuario") || "null");
        } catch (e) {
            return null;
        }
    }

    function puedeConectar() {
        var u = usuarioSesion();
        return !!(u && u.Id && window.jQuery && $.connection && $.connection.hub);
    }

    function emit(nombre, dato) {
        var lista = handlers[nombre] || [];
        for (var i = 0; i < lista.length; i++) {
            try { lista[i](dato); } catch (e) { }
        }
        document.dispatchEvent(new CustomEvent("dg-tiempo-real", { detail: { nombre: nombre, dato: dato } }));
    }

    function on(nombre, fn) {
        if (!handlers[nombre]) handlers[nombre] = [];
        handlers[nombre].push(fn);
    }

    function rechazarCola() {
        var pendientes = cola.splice(0, cola.length);
        for (var i = 0; i < pendientes.length; i++) {
            try { pendientes[i].dfd.reject(); } catch (e) { }
        }
    }

    function enviar(metodo, args, dfd) {
        dfd = dfd || $.Deferred();
        try {
            if (!estaConectado() || !hub || !hub.server || typeof hub.server[metodo] !== "function") {
                dfd.reject();
                return dfd.promise();
            }
            var result = hub.server[metodo].apply(hub.server, args || []);
            if (result && typeof result.done === "function") {
                result.done(function () { dfd.resolve.apply(dfd, arguments); })
                    .fail(function () { dfd.reject.apply(dfd, arguments); });
            } else {
                dfd.resolve(result);
            }
        } catch (e) {
            dfd.reject(e);
        }
        return dfd.promise();
    }

    function drenarCola() {
        var pendientes = cola.splice(0, cola.length);
        for (var i = 0; i < pendientes.length; i++) {
            enviar(pendientes[i].metodo, pendientes[i].args, pendientes[i].dfd);
        }
    }

    function invoke(metodo) {
        var dfd = $.Deferred();
        var args = Array.prototype.slice.call(arguments, 1);
        if (!metodo) {
            dfd.reject();
            return dfd.promise();
        }
        if (estaConectado())
            return enviar(metodo, args, dfd);

        cola.push({ metodo: metodo, args: args, dfd: dfd });
        conectar();
        return dfd.promise();
    }

    function marcarListo(reconectado) {
        hubListo = true;
        emit("HubListo", { tabId: tabId, reconectado: !!reconectado });
        document.dispatchEvent(new CustomEvent("dg-hub-listo"));
    }

    function alConectar() {
        arrancando = false;
        intento = 0;
        drenarCola();
        enviar("verificarAcceso", []);
        marcarListo(false);
    }

    function programarReconexion() {
        if (reconectarTimer) return;
        intento += 1;
        var ms = Math.min(30000, 1000 * Math.pow(2, Math.min(intento, 5)));
        reconectarTimer = setTimeout(function () {
            reconectarTimer = null;
            conectar();
        }, ms);
    }

    function conectar() {
        if (!puedeConectar()) return;
        if (estaConectado()) {
            drenarCola();
            return;
        }
        if (estaOcupado()) return;

        var proxy = $.connection.notificacionesHub;
        if (!proxy) return;

        hub = proxy;
        if (!hub.client.evento) {
            hub.client.evento = function (nombre, dato) {
                emit(nombre, dato);
            };
        }

        arrancando = true;
        try {
            $.connection.hub.qs = { v: "1" };
            $.connection.hub.start()
                .done(function () {
                    alConectar();
                })
                .fail(function () {
                    arrancando = false;
                    rechazarCola();
                    programarReconexion();
                });
        } catch (e) {
            arrancando = false;
            rechazarCola();
            programarReconexion();
        }
    }

    function init() {
        if (!puedeConectar()) return;
        $.connection.hub.disconnected(function () {
            hubListo = false;
            arrancando = false;
            programarReconexion();
        });
        $.connection.hub.reconnected(function () {
            intento = 0;
            drenarCola();
            enviar("verificarAcceso", []);
            marcarListo(true);
        });
        conectar();
    }

    window.TiempoReal = {
        on: on,
        invoke: invoke,
        estaConectado: estaConectado,
        tabId: tabId,
        canal: canal,
        conectar: conectar,
        emitLocal: emit,
        listo: function () { return hubListo && estaConectado(); }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})(window, window.jQuery);
