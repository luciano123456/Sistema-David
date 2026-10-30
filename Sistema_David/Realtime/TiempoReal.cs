using Microsoft.AspNet.SignalR;
using Sistema_David.Hubs;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Sistema_David.Realtime
{
    /// <summary>
    /// Avisos en tiempo real reutilizables (campanita, alarmas y módulos futuros).
    /// Misma idea que Punto Impulso: un hub, grupos por usuario, push puntual.
    /// </summary>
    public static class TiempoReal
    {
        public static IHubContext Hub
        {
            get { return GlobalHost.ConnectionManager.GetHubContext<NotificacionesHub>(); }
        }

        public static void AUsuario(int idUsuario, string evento, object dato)
        {
            if (idUsuario <= 0 || string.IsNullOrWhiteSpace(evento))
                return;

            Hub.Clients.Group(NotificacionesHub.GrupoUsuario(idUsuario)).evento(evento, dato);
        }

        public static void AUsuarios(IEnumerable<int> ids, string evento, object dato)
        {
            if (ids == null)
                return;

            foreach (var id in ids.Where(x => x > 0).Distinct())
                AUsuario(id, evento, dato);
        }

        public static void AAdmins(string evento, object dato)
        {
            Hub.Clients.Group(NotificacionesHub.GrupoAdmins).evento(evento, dato);
        }

        public static void AModulo(string modulo, string evento, object dato)
        {
            if (string.IsNullOrWhiteSpace(modulo))
                return;

            Hub.Clients.Group(NotificacionesHub.GrupoModulo(modulo)).evento(evento, dato);
        }

        public static void PendienteContador(int idUsuario, int cantidad)
        {
            AUsuario(idUsuario, "PendienteContador", new { cantidad = Math.Max(0, cantidad) });
        }

        public static void PendienteCambio(IEnumerable<int> ids, object dato)
        {
            AUsuarios(ids, "PendienteCambio", dato);
        }

        public static void AlarmaDue(int idUsuario, object alarma)
        {
            AUsuario(idUsuario, "AlarmaDue", alarma);
        }

        public static void AlarmaProgramada(int idUsuario, object alarma)
        {
            AUsuario(idUsuario, "AlarmaProgramada", alarma);
        }

        public static void AlarmaCancelada(int idUsuario, int idDestinatario)
        {
            AUsuario(idUsuario, "AlarmaCancelada", new { idDestinatario });
        }
    }
}
