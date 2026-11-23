using Sistema_David.Models;
using System;
using System.Collections.Concurrent;
using System.Threading;

namespace Sistema_David.Realtime
{
    /// <summary>
    /// Dispara alarmas vencidas por SignalR. No hace polling agresivo:
    /// espera hasta la próxima fecha (tope 5 minutos por si hubo un alta concurrente).
    /// El cliente también agenda un timeout local para el segundo exacto.
    /// </summary>
    public static class PendientesAlarmaScheduler
    {
        private static readonly object Sync = new object();
        private static readonly ConcurrentDictionary<int, long> Enviadas = new ConcurrentDictionary<int, long>();
        private static Timer _timer;
        private static int _corriendo;

        public static void Start()
        {
            lock (Sync)
            {
                if (_timer != null)
                    return;

                _timer = new Timer(Tick, null, TimeSpan.FromSeconds(3), Timeout.InfiniteTimeSpan);
            }
        }

        public static void Reprogramar()
        {
            var timer = _timer;
            if (timer == null)
                return;

            timer.Change(TimeSpan.FromMilliseconds(400), Timeout.InfiniteTimeSpan);
        }

        private static void Tick(object state)
        {
            if (Interlocked.Exchange(ref _corriendo, 1) == 1)
            {
                var t = _timer;
                if (t != null)
                    t.Change(TimeSpan.FromSeconds(2), Timeout.InfiniteTimeSpan);
                return;
            }

            try
            {
                var vencidas = PendientesModel.AlarmasVencidas();
                foreach (var alarma in vencidas)
                {
                    var marca = alarma.FechaAlarma.Ticks;
                    long previa;
                    if (Enviadas.TryGetValue(alarma.IdDestinatario, out previa) && previa == marca)
                        continue;
                    Enviadas[alarma.IdDestinatario] = marca;
                    TiempoReal.AlarmaDue(alarma.IdUsuario, alarma);
                }

                var proximo = PendientesModel.ProximaAlarmaGlobal();
                var espera = TimeSpan.FromMinutes(5);
                if (proximo.HasValue)
                {
                    var delta = proximo.Value - DateTime.Now;
                    if (delta < TimeSpan.FromSeconds(1))
                        espera = TimeSpan.FromSeconds(1);
                    else if (delta < espera)
                        espera = delta;
                }

                var timer = _timer;
                if (timer != null)
                    timer.Change(espera, Timeout.InfiniteTimeSpan);
            }
            catch
            {
                var timer = _timer;
                if (timer != null)
                    timer.Change(TimeSpan.FromSeconds(30), Timeout.InfiniteTimeSpan);
            }
            finally
            {
                Interlocked.Exchange(ref _corriendo, 0);
            }
        }
    }
}
