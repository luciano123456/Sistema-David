(function (window, $) {
    var audioCtx = null;
    var sonidoListo = false;
    var beepTimer = null;
    var alarmaActual = null;
    var timeouts = {};
    var mostradas = {};
    var tabId = (window.TiempoReal && window.TiempoReal.tabId) || Math.random().toString(36).slice(2);

    function usuarioSesion() {
        try { return JSON.parse(localStorage.getItem("usuario") || "null"); }
        catch (e) { return null; }
    }

    function puedeModulo() {
        var u = usuarioSesion();
        return !!(u && (Number(u.IdRol) === 1 || Number(u.IdRol) === 4));
    }

    function pintarContador(n) {
        var el = document.getElementById("notificationPendientes");
        if (!el) return;
        n = Number(n) || 0;
        if (!isFinite(n) || n < 0) n = 0;
        var hay = n > 0;
        el.textContent = hay ? String(n) : "";
        el.classList.toggle("is-zero", !hay);
        el.classList.toggle("is-hot", hay);
        if (hay) el.removeAttribute("hidden");
        else el.setAttribute("hidden", "true");
    }

    function prepararAudio() {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        if (!audioCtx) audioCtx = new Ctx();
        if (audioCtx.state === "suspended") audioCtx.resume();
        sonidoListo = audioCtx.state === "running";
        ocultarBannerAudio();
        return audioCtx;
    }

    function mostrarBannerAudio() {
        var b = document.getElementById("pdAudioBanner");
        if (b) b.removeAttribute("hidden");
    }

    function ocultarBannerAudio() {
        var b = document.getElementById("pdAudioBanner");
        if (b) b.setAttribute("hidden", "true");
    }

    function stopBeep() {
        if (beepTimer) {
            clearInterval(beepTimer);
            beepTimer = null;
        }
    }

    function startBeep() {
        stopBeep();
        var ctx = prepararAudio();
        if (!ctx || !sonidoListo) {
            mostrarBannerAudio();
            return;
        }
        function pulso() {
            try {
                var ahora = ctx.currentTime;
                var osc = ctx.createOscillator();
                var ganancia = ctx.createGain();
                osc.type = "square";
                osc.frequency.setValueAtTime(880, ahora);
                ganancia.gain.setValueAtTime(0.0001, ahora);
                ganancia.gain.exponentialRampToValueAtTime(0.08, ahora + 0.02);
                ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.22);
                osc.connect(ganancia);
                ganancia.connect(ctx.destination);
                osc.start(ahora);
                osc.stop(ahora + 0.24);
            } catch (e) { }
        }
        pulso();
        beepTimer = setInterval(pulso, 700);
    }

    function idAlarma(a) {
        return Number(a && (a.IdDestinatario || a.idDestinatario) || 0);
    }

    function parseFecha(val) {
        if (!val) return null;
        if (val instanceof Date && !isNaN(val.getTime())) return val;
        if (typeof val === "string") {
            var m = /\/Date\((-?\d+)\)\//.exec(val);
            if (m) return new Date(Number(m[1]));
            var d = new Date(val);
            if (!isNaN(d.getTime())) return d;
        }
        return null;
    }

    function reclamar(id) {
        var now = Date.now();
        try {
            var raw = localStorage.getItem("dgPendientesAlarmaLock");
            var lock = raw ? JSON.parse(raw) : null;
            if (lock && Number(lock.id) === id && lock.tabId !== tabId && (now - lock.ts) < 8000)
                return false;
            localStorage.setItem("dgPendientesAlarmaLock", JSON.stringify({ tabId: tabId, id: id, ts: now }));
        } catch (e) { }
        if (window.TiempoReal && window.TiempoReal.canal) {
            try { window.TiempoReal.canal.postMessage({ tipo: "playing", tabId: tabId, id: id }); } catch (e) { }
        }
        return true;
    }

    function liberar(id) {
        try {
            var raw = localStorage.getItem("dgPendientesAlarmaLock");
            var lock = raw ? JSON.parse(raw) : null;
            if (lock && Number(lock.id) === id && lock.tabId === tabId)
                localStorage.removeItem("dgPendientesAlarmaLock");
        } catch (e) { }
        if (window.TiempoReal && window.TiempoReal.canal) {
            try { window.TiempoReal.canal.postMessage({ tipo: "done", id: id }); } catch (e) { }
        }
    }

    function cancelarLocal(idDest) {
        if (timeouts[idDest]) {
            clearTimeout(timeouts[idDest]);
            delete timeouts[idDest];
        }
        delete mostradas[idDest];
        if (alarmaActual && idAlarma(alarmaActual) === idDest)
            cerrarModal(false);
    }

    function programar(alarma) {
        if (!alarma) return;
        var id = idAlarma(alarma);
        if (!id) return;
        var fecha = parseFecha(alarma.FechaAlarma || alarma.fechaAlarma);
        if (!fecha) return;
        if (timeouts[id]) clearTimeout(timeouts[id]);
        var ms = fecha.getTime() - Date.now();
        if (ms <= 0) {
            mostrarAlarma(alarma);
            return;
        }
        if (ms > 2147483647) return;
        timeouts[id] = setTimeout(function () { mostrarAlarma(alarma); }, ms);
    }

    function mostrarAlarma(alarma) {
        var id = idAlarma(alarma);
        if (!id || mostradas[id]) return;
        if (!reclamar(id)) return;
        mostradas[id] = true;
        alarmaActual = alarma;
        var modalEl = document.getElementById("modalAlarmaPendiente");
        if (!modalEl || typeof bootstrap === "undefined") return;
        document.getElementById("pdAlarmaTitulo").textContent = alarma.Titulo || alarma.titulo || "Alarma";
        document.getElementById("pdAlarmaMeta").textContent = [
            alarma.Tipo || alarma.tipo || "",
            alarma.Nombre || alarma.nombre || "",
            alarma.Prioridad || alarma.prioridad || ""
        ].filter(Boolean).join(" · ");
        document.getElementById("pdAlarmaCustom").setAttribute("hidden", "true");
        modalEl.classList.add("is-ring");
        var modal = bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: "static", keyboard: false });
        modal.show();
        startBeep();
    }

    function limpiarBackdropsSiLibre() {
        var abiertos = document.querySelectorAll(".modal.show");
        if (abiertos.length) return;
        document.querySelectorAll(".modal-backdrop").forEach(function (b) { b.remove(); });
        document.body.classList.remove("modal-open");
        document.body.style.removeProperty("overflow");
        document.body.style.removeProperty("padding-right");
    }

    function cerrarModal(liberarLock) {
        stopBeep();
        var modalEl = document.getElementById("modalAlarmaPendiente");
        if (modalEl) {
            modalEl.classList.remove("is-ring");
            var modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            else limpiarBackdropsSiLibre();
        }
        if (liberarLock && alarmaActual)
            liberar(idAlarma(alarmaActual));
        alarmaActual = null;
        setTimeout(limpiarBackdropsSiLibre, 380);
    }

    function aplicarSnapshot(snap) {
        if (!snap) return;
        pintarContador(snap.Contador != null ? snap.Contador : snap.contador);
        var due = snap.Due || snap.due || [];
        var prox = snap.Proximas || snap.proximas || [];
        due.forEach(mostrarAlarma);
        prox.forEach(programar);
    }

    function sincronizar() {
        if (!window.TiempoReal) return;
        window.TiempoReal.invoke("sincronizarPendientes").done(aplicarSnapshot).fail(function () {
            $.getJSON("/Pendientes/Contador").done(function (r) { pintarContador(r && r.cantidad); });
        });
    }

    function detener() {
        if (!alarmaActual) return;
        var id = idAlarma(alarmaActual);
        var fin = function () {
            cancelarLocal(id);
            cerrarModal(true);
        };
        if (window.TiempoReal) {
            window.TiempoReal.invoke("detenerAlarma", id).always(fin);
        } else {
            $.post("/Pendientes/DetenerAlarma", { idDestinatario: id }).always(fin);
        }
    }

    function posponer(minutos) {
        if (!alarmaActual) return;
        var id = idAlarma(alarmaActual);
        var fin = function (alarma) {
            cancelarLocal(id);
            cerrarModal(true);
            if (alarma) programar(alarma);
        };
        if (window.TiempoReal) {
            window.TiempoReal.invoke("posponerAlarma", id, minutos).done(fin).fail(function () { fin(null); });
        } else {
            $.post("/Pendientes/PosponerAlarma", { idDestinatario: id, minutos: minutos }).done(function (r) {
                fin(r && r.data);
            });
        }
    }

    function posponerHasta() {
        var input = document.getElementById("pdAlarmaHasta");
        if (!input || !input.value || !alarmaActual) return;
        var id = idAlarma(alarmaActual);
        var hasta = input.value;
        window.TiempoReal.invoke("posponerAlarmaHasta", id, hasta).done(function (alarma) {
            cancelarLocal(id);
            cerrarModal(true);
            if (alarma) programar(alarma);
        }).fail(function (err) {
            if (typeof errorModal === "function") errorModal("No se pudo posponer.");
        });
    }

    function initUi() {
        var detenerBtn = document.getElementById("pdAlarmaDetener");
        var customBtn = document.getElementById("pdAlarmaCustomBtn");
        var okCustom = document.getElementById("pdAlarmaCustomOk");
        var modalAlarma = document.getElementById("modalAlarmaPendiente");
        if (modalAlarma) {
            modalAlarma.addEventListener("hidden.bs.modal", function () {
                setTimeout(limpiarBackdropsSiLibre, 0);
            });
        }
        if (detenerBtn) detenerBtn.addEventListener("click", detener);
        document.querySelectorAll("[data-pd-snooze]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                posponer(Number(btn.getAttribute("data-pd-snooze")));
            });
        });
        if (customBtn) customBtn.addEventListener("click", function () {
            document.getElementById("pdAlarmaCustom").removeAttribute("hidden");
        });
        if (okCustom) okCustom.addEventListener("click", posponerHasta);
        var banner = document.getElementById("pdAudioBanner");
        if (banner) banner.addEventListener("click", prepararAudio);
        var ver = document.getElementById("pdAlarmaVer");
        if (ver) ver.addEventListener("click", function () {
            if (alarmaActual) {
                var url = alarmaActual.Url || alarmaActual.url || ("/Pendientes/Index?id=" + (alarmaActual.IdActividad || alarmaActual.idActividad || ""));
                window.location.href = url;
            }
        });
    }

    function enganchar() {
        if (!window.TiempoReal) return;
        window.TiempoReal.on("PendienteContador", function (d) {
            pintarContador(d && (d.cantidad != null ? d.cantidad : d.Cantidad));
            window.dispatchEvent(new CustomEvent("dg-alertas-refresh", { detail: { tipo: "pendientes" } }));
        });
        window.TiempoReal.on("PendienteCambio", function () {
            window.dispatchEvent(new CustomEvent("dg-alertas-refresh", { detail: { tipo: "pendientes" } }));
        });
        window.TiempoReal.on("AlarmaDue", mostrarAlarma);
        window.TiempoReal.on("AlarmaProgramada", programar);
        window.TiempoReal.on("AlarmaCancelada", function (d) {
            cancelarLocal(Number(d && (d.idDestinatario || d.IdDestinatario) || 0));
        });
        window.TiempoReal.on("AlarmaActividadCerrada", function (d) {
            var idAct = Number(d && (d.idActividad || d.IdActividad) || 0);
            Object.keys(timeouts).forEach(function (k) { cancelarLocal(Number(k)); });
            if (alarmaActual && Number(alarmaActual.IdActividad || alarmaActual.idActividad) === idAct)
                cerrarModal(true);
            sincronizar();
        });
        window.TiempoReal.on("HubListo", sincronizar);
        if (window.TiempoReal.canal) {
            window.TiempoReal.canal.onmessage = function (ev) {
                var msg = ev && ev.data;
                if (!msg) return;
                if (msg.tipo === "playing" && msg.tabId !== tabId)
                    mostradas[msg.id] = true;
                if (msg.tipo === "done")
                    cancelarLocal(msg.id);
            };
        }
    }

    document.addEventListener("pointerdown", prepararAudio, { once: true });
    document.addEventListener("keydown", prepararAudio, { once: true });

    document.addEventListener("DOMContentLoaded", function () {
        if (!puedeModulo()) return;
        var campana = document.getElementById("divNotificacionPendientes");
        if (campana) campana.removeAttribute("hidden");
        var seccion = document.getElementById("seccionPendientes");
        if (seccion) seccion.removeAttribute("hidden");
        initUi();
        enganchar();
        document.addEventListener("dg-hub-listo", sincronizar);
        if (window.TiempoReal && typeof window.TiempoReal.listo === "function" && window.TiempoReal.listo())
            sincronizar();
    });
})(window, window.jQuery);
