using Microsoft.AspNet.SignalR;
using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.DB;
using Sistema_David.Realtime;
using System;
using System.Threading.Tasks;

namespace Sistema_David.Hubs
{
    public class NotificacionesHub : Hub
    {
        public const string GrupoAdmins = "admins";

        public static string GrupoUsuario(int idUsuario)
        {
            return "usuario-" + idUsuario;
        }

        public static string GrupoModulo(string modulo)
        {
            return "mod-" + (modulo ?? "").Trim().ToLowerInvariant();
        }

        public override Task OnConnected()
        {
            return Unirse();
        }

        public override Task OnReconnected()
        {
            return Unirse();
        }

        public Task VerificarAcceso()
        {
            return Unirse();
        }

        public object SincronizarPendientes()
        {
            var usuario = UsuarioActual();
            if (usuario == null || usuario.Id <= 0)
                return null;

            return PendientesModel.SnapshotRealtime(usuario.Id, usuario.IdRol == 1);
        }

        public object DetenerAlarma(int idDestinatario)
        {
            var usuario = UsuarioActual();
            if (usuario == null || usuario.Id <= 0)
                return new { ok = false };

            var ok = PendientesModel.DetenerAlarma(idDestinatario, usuario.Id);
            if (ok)
            {
                TiempoReal.AlarmaCancelada(usuario.Id, idDestinatario);
                PendientesAlarmaScheduler.Reprogramar();
            }

            return new { ok = ok };
        }

        public object PosponerAlarma(int idDestinatario, int minutos)
        {
            var usuario = UsuarioActual();
            if (usuario == null || usuario.Id <= 0)
                return null;

            var alarma = PendientesModel.Posponer(idDestinatario, usuario.Id, minutos);
            if (alarma != null)
            {
                TiempoReal.AlarmaCancelada(usuario.Id, idDestinatario);
                TiempoReal.AlarmaProgramada(usuario.Id, alarma);
                PendientesAlarmaScheduler.Reprogramar();
            }

            return alarma;
        }

        public object PosponerAlarmaHasta(int idDestinatario, DateTime hasta)
        {
            var usuario = UsuarioActual();
            if (usuario == null || usuario.Id <= 0)
                return null;

            var alarma = PendientesModel.PosponerHasta(idDestinatario, usuario.Id, hasta);
            if (alarma != null)
            {
                TiempoReal.AlarmaCancelada(usuario.Id, idDestinatario);
                TiempoReal.AlarmaProgramada(usuario.Id, alarma);
                PendientesAlarmaScheduler.Reprogramar();
            }

            return alarma;
        }

        private async Task Unirse()
        {
            var usuario = UsuarioActual();
            if (usuario == null || usuario.Id <= 0)
            {
                await Clients.Caller.evento("CerrarSesion", null);
                return;
            }

            await Groups.Add(Context.ConnectionId, GrupoUsuario(usuario.Id));

            if (usuario.IdRol == 1)
                await Groups.Add(Context.ConnectionId, GrupoAdmins);

            await Groups.Add(Context.ConnectionId, GrupoModulo("pendientes"));
        }

        private static Usuarios UsuarioActual()
        {
            return SessionHelper.GetUsuarioSesion();
        }
    }
}
