using Sistema_David.Helpers;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Diagnostics;
using System.Linq;

namespace Sistema_David.Models
{
    public static class PayrollModel
    {
        private static void Log(Exception ex, string where)
        {
            try { Trace.TraceError($"[PayrollModel::{where}] {ex}"); } catch { /* no-op */ }
        }

        private static Dictionary<int, List<VMSueldoDetalle>> _ultimoDetalleCobros
    = new Dictionary<int, List<VMSueldoDetalle>>();

        /* ============================ HISTORIAL ============================ */
        public static List<VMSueldoHistRow> Historial(
            int? idVendedor, DateTime? desde, DateTime? hasta, byte? estado)
        {
            const string tag = "Historial";
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var q = db.Sueldos.AsQueryable();

                    if (idVendedor.HasValue && idVendedor.Value > 0)
                        q = q.Where(c => c.IdUsuario == idVendedor.Value);


                    if (estado.HasValue)
                        q = q.Where(c => c.Estado == estado.Value);

                    if (desde.HasValue || hasta.HasValue)
                    {
                        var p0 = desde?.Date.AddDays(-1);
                        var p1 = hasta?.Date.AddDays(1);
                        q = q.Where(c =>
                            !db.Sueldos_Pagos.Any(p => p.IdSueldo == c.Id)
                            ||
                            db.Sueldos_Pagos.Any(p => p.IdSueldo == c.Id
                                && (!p0.HasValue || p.FechaAlta >= p0.Value)
                                && (!p1.HasValue || p.FechaAlta < p1.Value))
                        );
                    }

                    return q
                        .OrderByDescending(c => c.FechaAlta)
                        .Select(c => new VMSueldoHistRow
                        {
                            Id = c.Id,
                            Vendedor = c.Usuarios.Nombre,
                            FechaDesde = c.FechaDesde,
                            FechaHasta = c.FechaHasta,
                            Concepto = c.Concepto,
                            ImporteTotal = c.ImporteTotal,
                            Abonado = c.Abonado,
                            Saldo = c.ImporteTotal - c.Abonado,
                            Estado = c.Estado,
                            FechaAlta = c.FechaAlta
                        })
                        .ToList();
                }
            }
            catch (Exception ex) { Log(ex, tag); throw; }
        }

        public static bool EliminarSueldo(int id)
        {
            const string tag = "EliminarSueldo";
            try
            {
                using (var db = new Sistema_DavidEntities())
                using (var tx = db.Database.BeginTransaction())
                {
                    var cab = db.Sueldos.FirstOrDefault(s => s.Id == id);
                    if (cab == null) return false;

                    // 1) Desasociar pagos parciales (no se borran: vuelven a quedar disponibles)
                    var parciales = db.Sueldos_PagosParciales.Where(p => p.IdSueldo == id).ToList();
                    foreach (var p in parciales)
                    {
                        p.IdSueldo = null;
                        db.Entry(p).State = EntityState.Modified;
                    }

                    // 2) Borrar pagos del sueldo
                    var pagos = db.Sueldos_Pagos.Where(p => p.IdSueldo == id).ToList();
                    if (pagos.Any()) db.Sueldos_Pagos.RemoveRange(pagos);

                    // 3) Borrar detalle
                    var det = db.Sueldos_Detalle.Where(d => d.IdSueldo == id).ToList();
                    if (det.Any()) db.Sueldos_Detalle.RemoveRange(det);

                    // 4) Borrar cabecera
                    db.Sueldos.Remove(cab);

                    db.SaveChanges();
                    tx.Commit();
                    return true;
                }
            }
            catch (Exception ex)
            {
                Log(ex, tag);
                throw;
            }
        }


        /* ============================ REGLAS ============================ */
        private static List<Sueldos_Reglas> GetReglas(byte tipo, int? idTipoNegocio)
        {
            const string tag = "GetReglas";
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var baseQ = db.Sueldos_Reglas.Where(r => r.IdTipoRegla == tipo && r.Activo == true);

                    List<Sueldos_Reglas> espec = new List<Sueldos_Reglas>();
                    if (idTipoNegocio.HasValue) espec = baseQ.Where(r => r.IdTipoNegocio == idTipoNegocio.Value).ToList();

                    var elegidas = espec.Any() ? espec : baseQ.Where(r => r.IdTipoNegocio == null).ToList();

                    return elegidas
                        .OrderBy(r => r.MontoDesde)
                        .ThenBy(r => r.MontoHasta ?? decimal.MaxValue)
                        .ToList();
                }
            }
            catch (Exception ex) { Log(ex, tag); throw; }
        }

        // TRAMOS (Marginal vs NoMarginal/Banda)
        private static (decimal total, List<VMSueldoDetalle> det)
            AplicarTramos(decimal monto, byte tipo, int? idTipoNegocio, string obsBase = "", bool marginal = false)
        {
            // --- Fast-path para COBROS (tipo = 2) usando detalle precalculado ---
            if (tipo == 2)
            {
                var keyTN = idTipoNegocio ?? 0;
                if (_ultimoDetalleCobros != null && _ultimoDetalleCobros.TryGetValue(keyTN, out var detPre) && detPre != null && detPre.Count > 0)
                {
                    // Clonamos para no mutar el cache y anteponemos obsBase si vino algo
                    var detClonado = detPre.Select(d => new VMSueldoDetalle
                    {
                        TipoOrigen = d.TipoOrigen,
                        IdTipoNegocio = d.IdTipoNegocio,
                        BaseMonto = d.BaseMonto,
                        Porcentaje = d.Porcentaje,
                        ImporteCalc = d.ImporteCalc,
                        Observacion = string.IsNullOrWhiteSpace(obsBase) ? d.Observacion : $"{obsBase} {d.Observacion}"
                    }).ToList();

                    var totalPre = detClonado.Sum(x => x.ImporteCalc);
                    return (totalPre, detClonado);
                }
            }
            // --- Fin fast-path ---

            // Si no hubo detalle precalculado (o no es cobros), seguimos con la lógica tradicional
            var reglas = GetReglas(tipo, idTipoNegocio);
            if (reglas == null || reglas.Count == 0)
                throw new InvalidOperationException("SIN_REGLAS: No hay reglas de comisión activas para este cálculo.");

            // Aseguramos orden por monto
            reglas = reglas
                .OrderBy(r => r.MontoDesde)
                .ThenBy(r => r.MontoHasta ?? decimal.MaxValue)
                .ToList();

            var det = new List<VMSueldoDetalle>();
            decimal total = 0m;

            if (!marginal)
            {
                // ======= MODO NO MARGINAL (BANDA) =======
                // Tomar la banda donde cae el monto y aplicar ese % a TODO el monto
                var banda = reglas.FirstOrDefault(r =>
                    monto >= r.MontoDesde &&
                    monto <= (r.MontoHasta ?? decimal.MaxValue));

                // Si no hubo match (p.ej. monto < primera banda), usamos la más baja o la última abierta
                if (banda == null)
                    banda = reglas.LastOrDefault(r => monto >= r.MontoDesde) ?? reglas.First();

                var importe = Math.Round(monto * (banda.Porcentaje / 100m), 2, MidpointRounding.AwayFromZero);
                total += importe;

                det.Add(new VMSueldoDetalle
                {
                    TipoOrigen = tipo,
                    IdTipoNegocio = idTipoNegocio,
                    BaseMonto = monto, // base completa
                    Porcentaje = banda.Porcentaje,
                    ImporteCalc = importe,
                    Observacion = string.IsNullOrWhiteSpace(obsBase)
                                        ? $"Banda {banda.MontoDesde:n0}-{(banda.MontoHasta.HasValue ? banda.MontoHasta.Value.ToString("n0") : "∞")} ({banda.Porcentaje:n2}%)"
                                        : $"{obsBase} Banda {banda.MontoDesde:n0}-{(banda.MontoHasta.HasValue ? banda.MontoHasta.Value.ToString("n0") : "∞")} ({banda.Porcentaje:n2}%)"
                });
            }
            else
            {
                // ======= MODO MARGINAL (EXCEDENTE POR TRAMO) =======
                foreach (var r in reglas)
                {
                    var desde = r.MontoDesde;
                    var hasta = r.MontoHasta ?? decimal.MaxValue;
                    if (monto <= desde) continue;

                    var tramoBase = Math.Min(monto, hasta) - desde;
                    if (tramoBase <= 0) continue;

                    var importe = Math.Round(tramoBase * (r.Porcentaje / 100m), 2, MidpointRounding.AwayFromZero);
                    total += importe;

                    det.Add(new VMSueldoDetalle
                    {
                        TipoOrigen = tipo,
                        IdTipoNegocio = idTipoNegocio,
                        BaseMonto = tramoBase, // solo el excedente del tramo
                        Porcentaje = r.Porcentaje,
                        ImporteCalc = importe,
                        Observacion = string.IsNullOrWhiteSpace(obsBase)
                                            ? $"Tramo {desde:n0}-{(r.MontoHasta.HasValue ? r.MontoHasta.Value.ToString("n0") : "∞")} ({r.Porcentaje:n2}%)"
                                            : $"{obsBase} Tramo {desde:n0}-{(r.MontoHasta.HasValue ? r.MontoHasta.Value.ToString("n0") : "∞")} ({r.Porcentaje:n2}%)"
                    });

                    if (monto <= hasta) break;
                }
            }

            return (total, det);
        }


        // ACUMULATIVO (Ventas): aplica % del tramo alcanzado sobre TODO el total
        private static (decimal total, List<VMSueldoDetalle> det) AplicarAcumulativoVentas(decimal monto, int? idTipoNegocio, string obsBase = "")
        {
            var reglas = GetReglas(1, idTipoNegocio);
            if (reglas == null || reglas.Count == 0)
                throw new InvalidOperationException("SIN_REGLAS: No hay reglas de comisión activas para este cálculo.");

            var regla = reglas
                .Where(r => monto >= r.MontoDesde && (r.MontoHasta == null || monto <= r.MontoHasta.Value))
                .OrderByDescending(r => r.MontoDesde)
                .FirstOrDefault();

            if (regla == null)
                regla = reglas.Where(r => monto >= r.MontoDesde).OrderByDescending(r => r.MontoDesde).FirstOrDefault();

            if (regla == null) return (0m, new List<VMSueldoDetalle>());

            var importe = Math.Round(monto * (regla.Porcentaje / 100m), 2, MidpointRounding.AwayFromZero);
            var det = new List<VMSueldoDetalle>
            {
                new VMSueldoDetalle
                {
                    TipoOrigen = 1,
                    IdTipoNegocio = idTipoNegocio,
                    BaseMonto = monto,
                    Porcentaje = regla.Porcentaje,
                    ImporteCalc = importe,
                    Observacion = $"{obsBase} Acumulado al {regla.Porcentaje:n2}% sobre el total"
                }
            };
            return (importe, det);
        }

        public static List<VMRegla> ListarReglas(byte tipo, int? idTipoNegocio)
        {
            const string tag = "ListarReglas";
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    return db.Sueldos_Reglas
                        .Where(r => r.IdTipoRegla == tipo && (r.IdTipoNegocio == idTipoNegocio || (idTipoNegocio == null && r.IdTipoNegocio == null)))
                        .OrderBy(r => r.IdTipoNegocio == null ? 1 : 0)
                        .ThenBy(r => r.MontoDesde)
                        .Select(r => new VMRegla
                        {
                            Id = r.Id,
                            IdTipoRegla = r.IdTipoRegla,
                            IdTipoNegocio = r.IdTipoNegocio,
                            MontoDesde = r.MontoDesde,
                            MontoHasta = r.MontoHasta,
                            Porcentaje = r.Porcentaje,
                            Activo = r.Activo
                        })
                        .ToList();
                }
            }
            catch (Exception ex) { Log(ex, tag); throw; }
        }

        public static bool GuardarRegla(VMRegla r)
        {
            const string tag = "GuardarRegla";
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    if (r.Id == 0)
                    {
                        var ent = new Sueldos_Reglas
                        {
                            FechaAlta = DateTime.Now,
                            IdTipoRegla = r.IdTipoRegla,
                            IdTipoNegocio = r.IdTipoNegocio,
                            MontoDesde = r.MontoDesde,
                            MontoHasta = r.MontoHasta,
                            Porcentaje = r.Porcentaje,
                            Activo = r.Activo,
                            UsuarioAlta = SessionHelper.GetUsuarioSesion()?.Id
                        };
                        db.Sueldos_Reglas.Add(ent);
                    }
                    else
                    {
                        var ent = db.Sueldos_Reglas.Find(r.Id);
                        if (ent == null) return false;

                        ent.IdTipoNegocio = r.IdTipoNegocio;
                        ent.MontoDesde = r.MontoDesde;
                        ent.MontoHasta = r.MontoHasta;
                        ent.Porcentaje = r.Porcentaje;
                        ent.Activo = r.Activo;

                        db.Entry(ent).State = EntityState.Modified;
                    }

                    db.SaveChanges();
                    return true;
                }
            }
            catch (Exception ex) { Log(ex, tag); throw; }
        }

        public static bool EliminarRegla(int id)
        {
            const string tag = "EliminarRegla";
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var ent = db.Sueldos_Reglas.Find(id);
                    if (ent == null) return false;

                    db.Sueldos_Reglas.Remove(ent);
                    db.SaveChanges();
                    return true;
                }
            }
            catch (Exception ex) { Log(ex, tag); throw; }
        }

        /* ============================ Bases por TN ============================ */
        private static Dictionary<int?, decimal> TotalesVentasPorTipoNegocio(int idUsuario, DateTime desde, DateTime hasta)
        {
            const string tag = "TotalesVentasPorTipoNegocio";
            try
            {
                var d0 = desde.Date;
                var h1 = hasta.Date.AddDays(1);

                using (var db = new Sistema_DavidEntities())
                {
                    return (from v in db.Ventas
                            where v.idVendedor == idUsuario && v.Fecha >= d0 && v.Fecha < h1
                            group ((v.Entrega ?? 0) + (v.Restante ?? 0)) by v.IdTipoNegocio into g
                            select new { IdTipoNegocio = (int?)g.Key, Total = g.Sum() })
                           .ToDictionary(x => x.IdTipoNegocio, x => (decimal)x.Total);
                }
            }
            catch (Exception ex) { Log(ex, tag); throw; }
        }

        private static Dictionary<int, decimal> TotalesCobrosPorTipoNegocio(
       int idUsuario, DateTime desde, DateTime hasta)
        {
            const string tag = "TotalesCobrosPorTipoNegocio";
            try
            {
                var d0 = desde.Date;
                var h1 = hasta.Date.AddDays(1);

                using (var db = new Sistema_DavidEntities())
                {
                    // Traigo los cobros itemizados con TN resuelto (IV o Venta)
                    var items =
                        (from iv in db.InformacionVentas
                         where iv.idCobrador == idUsuario && iv.Fecha >= d0 && iv.Fecha < h1
                         join v in db.Ventas on iv.IdVenta equals v.Id into gj
                         from v in gj.DefaultIfEmpty()
                         select new
                         {
                             TN = (int?)(iv.IdTipoNegocio ?? (int?)(v != null ? (int?)v.IdTipoNegocio : null)),
                             Importe = (decimal)(iv.Entrega ?? 0m)
                         }).ToList();

                    // Acumuladores:
                    //  a) base por TN (lo que devuelve esta función)
                    var basePorTN = new Dictionary<int, decimal>();
                    //  b) consolidado por (TN, %), para armar el detalle luego en AplicarTramos
                    var porTNyPct = new Dictionary<(int tn, decimal pct), (decimal baseSum, decimal impSum)>();

                    foreach (var it in items)
                    {
                        if (it.Importe <= 0) continue;

                        var tn = it.TN ?? 0;

                        // sumo base por TN (esto mantiene vm.TotalCobranzas correcta)
                        if (!basePorTN.TryGetValue(tn, out var accBase)) accBase = 0m;
                        basePorTN[tn] = accBase + it.Importe;

                        // reglas activas para ese TN (2 = Cobros)
                        var reglas = GetReglas(2, it.TN);
                        if (reglas == null || reglas.Count == 0) continue;

                        // banda NO marginal que contiene el importe (o la última cuyo Desde <= importe)
                        var banda =
                            reglas.FirstOrDefault(r => it.Importe >= r.MontoDesde &&
                                                       it.Importe <= (r.MontoHasta ?? decimal.MaxValue))
                            ?? reglas.LastOrDefault(r => it.Importe >= r.MontoDesde)
                            ?? reglas.First();

                        var pct = banda.Porcentaje;
                        var com = Math.Round(it.Importe * (pct / 100m), 2, MidpointRounding.AwayFromZero);

                        var key = (tn, pct);
                        if (!porTNyPct.TryGetValue(key, out var acc)) acc = (0m, 0m);
                        acc.baseSum += it.Importe;
                        acc.impSum += com;
                        porTNyPct[key] = acc;
                    }

                    // Construyo el detalle consolidado y lo dejo cacheado para AplicarTramos
                    var detallePorTN = new Dictionary<int, List<VMSueldoDetalle>>();
                    foreach (var grp in porTNyPct.GroupBy(k => k.Key.tn))
                    {
                        var list = grp
                            .OrderByDescending(kv => kv.Key.pct)
                            .Select(kv => new VMSueldoDetalle
                            {
                                TipoOrigen = 2,
                                IdTipoNegocio = grp.Key == 0 ? (int?)null : grp.Key,
                                BaseMonto = Math.Round(kv.Value.baseSum, 2),
                                Porcentaje = kv.Key.pct,
                                ImporteCalc = Math.Round(kv.Value.impSum, 2),
                                Observacion = $"Cobranzas al {kv.Key.pct:n2}%"
                            })
                            .ToList();

                        detallePorTN[grp.Key] = list;
                    }

                    // Actualizo cache global (para el próximo AplicarTramos inmediato)
                    _ultimoDetalleCobros = detallePorTN;

                    return basePorTN;
                }
            }
            catch (Exception ex)
            {
                Log(ex, tag);
                throw;
            }
        }


        /* ============================ Calcular ============================ */
        public static VMSueldoCalc Calcular(int idUsuario, DateTime desde, DateTime hasta)
        {
            const string tag = "Calcular";
            try
            {
                var vm = new VMSueldoCalc
                {
                    IdUsuario = idUsuario,
                    Desde = desde.Date,
                    Hasta = hasta.Date,
                    Detalles = new List<VMSueldoDetalle>(),
                    TotalVentas = 0,
                    ImporteVentas = 0,
                    TotalCobranzas = 0,
                    ImporteCobranzas = 0,
                    ImporteTotal = 0
                };

                var ventasTN = TotalesVentasPorTipoNegocio(idUsuario, desde, hasta);
                foreach (var kv in ventasTN)
                {
                    vm.TotalVentas += kv.Value;
                    var ap = AplicarAcumulativoVentas(kv.Value, kv.Key, "Ventas.");
                    vm.ImporteVentas += ap.total;
                    vm.Detalles.AddRange(ap.det);
                }

                var cobrosTN = TotalesCobrosPorTipoNegocio(idUsuario, desde, hasta);
                foreach (var kv in cobrosTN)
                {
                    vm.TotalCobranzas += kv.Value;
                    var ap = AplicarTramos(kv.Value, 2, kv.Key, "Cobranzas.");
                    vm.ImporteCobranzas += ap.total;
                    vm.Detalles.AddRange(ap.det);
                }

                vm.ImporteTotal = Math.Round(vm.ImporteVentas + vm.ImporteCobranzas, 2);
                return vm;
            }
            catch (Exception ex) { Log(ex, tag); throw; }
        }

        /* ============================ Pagos Parciales ============================ */
        public static List<object> PagosParcialesListar(int idUsuario, DateTime desde, DateTime hasta, bool soloSinAsignar)
        {
            const string tag = "PagosParcialesListar";
            try
            {
                var d0 = desde.Date;
                var h1 = hasta.Date.AddDays(1);

                using (var db = new Sistema_DavidEntities())
                {
                    // Arranco sin filtrar por usuario; lo aplico si corresponde
                    var q = db.Sueldos_PagosParciales
                              .Where(p => p.FechaPago >= d0 && p.FechaPago < h1);

                    if (idUsuario > 0)
                        q = q.Where(p => p.IdUsuario == idUsuario);

                    if (soloSinAsignar)
                        q = q.Where(p => p.IdSueldo == null);

                    return q.OrderByDescending(p => p.FechaPago)
                            .Select(p => new
                            {
                                p.Id,
                                p.IdUsuario,
                                p.FechaPago,
                                p.Metodo,
                                p.Importe,
                                p.Nota,
                                p.IdSueldo
                            })
                            .ToList<object>();
                }
            }
            catch (Exception ex) { Log(ex, tag); throw; }
        }

        public static bool GuardarPagoSuelto(int idUsuario, DateTime fecha, string metodo, decimal importe, string nota)
        {
            const string tag = "GuardarPagoSuelto";
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var ent = new Sueldos_PagosParciales
                    {
                        IdUsuario = idUsuario,
                        FechaPago = fecha.Date,
                        Metodo = (metodo ?? "EFECTIVO").ToUpperInvariant(),
                        Importe = importe,
                        Nota = nota,
                        IdUsuarioAlta = SessionHelper.GetUsuarioSesion()?.Id,
                        FechaAlta = DateTime.Now
                    };
                    db.Sueldos_PagosParciales.Add(ent);
                    db.SaveChanges();
                    return true;
                }
            }
            catch (Exception ex) { Log(ex, tag); throw; }
        }



        public static bool EliminarPagoSuelto(int id)
        {
            const string tag = "EliminarPagoSuelto";
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var ent = db.Sueldos_PagosParciales.Find(id);
                    if (ent == null) return false;
                    if (ent.IdSueldo != null) throw new InvalidOperationException("El pago ya está asociado a un sueldo.");

                    db.Sueldos_PagosParciales.Remove(ent);
                    db.SaveChanges();
                    return true;
                }
            }
            catch (Exception ex) { Log(ex, tag); throw; }
        }

        /* ============================ Guardar/Actualizar Cab + Pagos ============================ */
        static DateTime ClampSqlDate(DateTime d)
        {
            var min = new DateTime(1753, 1, 1);
            var max = new DateTime(9999, 12, 31, 23, 59, 59, 997);
            if (d < min) return min;
            if (d > max) return max;
            return d;
        }

        public static int GuardarOActualizarCabConPagos(
            int? idSueldo,
            VMSueldoCalc calc,
            string concepto,
            string nota,
            IEnumerable<VMPagoInput> pagos,
            string rutaComprobanteFirma,
            IEnumerable<int> pagosParcialesIds // <-- NUEVO
        )
        {
            const string tag = "GuardarOActualizarCabConPagos";
            try
            {
                using (var db = new Sistema_DavidEntities())
                using (var tx = db.Database.BeginTransaction())
                {
                    var d0 = ClampSqlDate((calc.Desde == default(DateTime) ? DateTime.Today : calc.Desde).Date);
                    var h0 = ClampSqlDate((calc.Hasta == default(DateTime) ? DateTime.Today : calc.Hasta).Date);
                    var now = ClampSqlDate(DateTime.Now);

                    Sueldos cab;

                    if (idSueldo.HasValue && idSueldo.Value > 0)
                    {
                        cab = db.Sueldos.Find(idSueldo.Value);
                        if (cab == null) throw new Exception("No se encontró el sueldo a editar.");

                        cab.IdUsuario = calc.IdUsuario;
                        cab.FechaDesde = d0;
                        cab.FechaHasta = h0;
                        cab.Concepto = concepto ?? string.Empty;
                        cab.NotaInterna = nota ?? string.Empty;
                        cab.ImporteTotal = calc.ImporteTotal;
                        if (!string.IsNullOrWhiteSpace(rutaComprobanteFirma))
                            cab.RutaComprobante = rutaComprobanteFirma;

                        var detOld = db.Sueldos_Detalle.Where(x => x.IdSueldo == cab.Id).ToList();
                        if (detOld.Any()) db.Sueldos_Detalle.RemoveRange(detOld);

                        foreach (var d in calc.Detalles ?? new List<VMSueldoDetalle>())
                        {
                            db.Sueldos_Detalle.Add(new Sueldos_Detalle
                            {
                                IdSueldo = cab.Id,
                                TipoOrigen = d.TipoOrigen,
                                IdTipoNegocio = d.IdTipoNegocio,
                                BaseMonto = d.BaseMonto,
                                Porcentaje = d.Porcentaje,
                                ImporteCalc = d.ImporteCalc,
                                Observacion = d.Observacion
                            });
                        }

                        var pOld = db.Sueldos_Pagos.Where(x => x.IdSueldo == cab.Id).ToList();
                        if (pOld.Any()) db.Sueldos_Pagos.RemoveRange(pOld);

                        decimal abonado = 0m;

                        // pagos manuales de la UI
                        foreach (var p in (pagos ?? new List<VMPagoInput>()))
                        {
                            var f = ClampSqlDate((p.Fecha == default(DateTime) ? DateTime.Today : p.Fecha).Date);
                            db.Sueldos_Pagos.Add(new Sueldos_Pagos
                            {
                                IdSueldo = cab.Id,
                                FechaPago = f,
                                Metodo = (p.Metodo ?? "EFECTIVO").ToUpperInvariant(),
                                Importe = p.Importe,
                                Nota = p.Nota,
                                IdUsuarioAlta = SessionHelper.GetUsuarioSesion()?.Id,
                                FechaAlta = now
                            });
                            abonado += p.Importe;
                        }

                        // asociar pagos Parciales seleccionados
                        AsociarPagosParcialesInterno(db, cab.Id, calc.IdUsuario, pagosParcialesIds, ref abonado, now);

                        cab.Abonado = abonado;
                        cab.Saldo = Math.Round(cab.ImporteTotal - cab.Abonado, 2);
                        cab.Estado = cab.Saldo <= 0 ? (byte)2 : (cab.Abonado > 0 ? (byte)1 : (byte)0);

                        db.SaveChanges();
                        tx.Commit();
                        return cab.Id;
                    }
                    else
                    {
                        cab = new Sueldos
                        {
                            IdUsuario = calc.IdUsuario,
                            FechaDesde = d0,
                            FechaHasta = h0,
                            Concepto = concepto ?? string.Empty,
                            ImporteTotal = calc.ImporteTotal,
                            Abonado = 0m,
                            Saldo = calc.ImporteTotal,
                            NotaInterna = nota ?? string.Empty,
                            Estado = 0,
                            FechaAlta = now,
                            IdUsuarioAlta = SessionHelper.GetUsuarioSesion()?.Id,
                            RutaComprobante = rutaComprobanteFirma
                        };

                        db.Sueldos.Add(cab);
                        db.SaveChanges();

                        foreach (var d in calc.Detalles ?? new List<VMSueldoDetalle>())
                        {
                            db.Sueldos_Detalle.Add(new Sueldos_Detalle
                            {
                                IdSueldo = cab.Id,
                                TipoOrigen = d.TipoOrigen,
                                IdTipoNegocio = d.IdTipoNegocio,
                                BaseMonto = d.BaseMonto,
                                Porcentaje = d.Porcentaje,
                                ImporteCalc = d.ImporteCalc,
                                Observacion = d.Observacion
                            });
                        }

                        decimal abonado = 0m;

                        foreach (var p in (pagos ?? new List<VMPagoInput>()))
                        {
                            var f = ClampSqlDate((p.Fecha == default(DateTime) ? DateTime.Today : p.Fecha).Date);
                            db.Sueldos_Pagos.Add(new Sueldos_Pagos
                            {
                                IdSueldo = cab.Id,
                                FechaPago = f,
                                Metodo = (p.Metodo ?? "EFECTIVO").ToUpperInvariant(),
                                Importe = p.Importe,
                                Nota = p.Nota,
                                IdUsuarioAlta = SessionHelper.GetUsuarioSesion()?.Id,
                                FechaAlta = now
                            });
                            abonado += p.Importe;
                        }

                        // asociar Parciales
                        AsociarPagosParcialesInterno(db, cab.Id, calc.IdUsuario, pagosParcialesIds, ref abonado, now);

                        cab.Abonado = abonado;
                        cab.Saldo = Math.Round(cab.ImporteTotal - cab.Abonado, 2);
                        cab.Estado = cab.Saldo <= 0 ? (byte)2 : (cab.Abonado > 0 ? (byte)1 : (byte)0);

                        db.SaveChanges();
                        tx.Commit();
                        return cab.Id;
                    }
                }
            }
            catch (Exception ex) { Log(ex, tag); throw; }
        }

        private static void AsociarPagosParcialesInterno(
            Sistema_DavidEntities db, int idSueldo, int idUsuario, IEnumerable<int> ids, ref decimal abonado, DateTime now)
        {
            if (ids == null) return;
            var arr = ids.Distinct().ToArray();
            if (arr.Length == 0) return;

            var Parciales = db.Sueldos_PagosParciales
                            .Where(x => arr.Contains(x.Id) && x.IdSueldo == null && x.IdUsuario == idUsuario)
                            .ToList();

            foreach (var s in Parciales)
            {
                // Creo una fila de Sueldos_Pagos
                db.Sueldos_Pagos.Add(new Sueldos_Pagos
                {
                    IdSueldo = idSueldo,
                    FechaPago = s.FechaPago,
                    Metodo = (s.Metodo ?? "EFECTIVO").ToUpperInvariant(),
                    Importe = s.Importe,
                    Nota = s.Nota,
                    IdUsuarioAlta = s.IdUsuarioAlta,
                    FechaAlta = s.FechaAlta
                });

                // Marco el suelto como asociado
                s.IdSueldo = idSueldo;
                db.Entry(s).State = EntityState.Modified;

                abonado += s.Importe;
            }
        }

        /* ============================ Pago suelto directo (legacy) ============================ */
        public static bool RegistrarPago(int idSueldo, DateTime fecha, string metodo, decimal importe, string nota, string ruta /* sin uso */)
        {
            const string tag = "RegistrarPago";
            try
            {
                using (var db = new Sistema_DavidEntities())
                using (var tx = db.Database.BeginTransaction())
                {
                    var cab = db.Sueldos.Find(idSueldo);
                    if (cab == null) return false;

                    var f = ClampSqlDate((fecha == default(DateTime) ? DateTime.Today : fecha).Date);

                    db.Sueldos_Pagos.Add(new Sueldos_Pagos
                    {
                        IdSueldo = idSueldo,
                        FechaPago = f,
                        Metodo = (metodo ?? "EFECTIVO").ToUpperInvariant(),
                        Importe = importe,
                        Nota = nota,
                        IdUsuarioAlta = SessionHelper.GetUsuarioSesion()?.Id,
                        FechaAlta = ClampSqlDate(DateTime.Now)
                    });

                    cab.Abonado += importe;
                    cab.Saldo = (cab.ImporteTotal - cab.Abonado);
                    db.Entry(cab).State = EntityState.Modified;

                    db.SaveChanges();
                    tx.Commit();
                    return true;
                }
            }
            catch (Exception ex) { Log(ex, tag); throw; }
        }

        /* ============================ Obtener ============================ */
        public static VMSueldoCabFull Obtener(int idSueldo)
        {
            const string tag = "Obtener";
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    db.Configuration.LazyLoadingEnabled = false;
                    db.Configuration.ProxyCreationEnabled = false;

                    var cabRow = db.Sueldos.AsNoTracking()
                        .Where(s => s.Id == idSueldo)
                        .Select(s => new
                        {
                            s.Id,
                            s.IdUsuario,
                            s.FechaDesde,
                            s.FechaHasta,
                            s.Concepto,
                            s.NotaInterna,
                            s.ImporteTotal,
                            s.Abonado,
                            s.Saldo,
                            s.Estado,
                            s.FechaAlta,
                            s.RutaComprobante
                        })
                        .FirstOrDefault();

                    if (cabRow == null)
                        return new VMSueldoCabFull
                        {
                            Cab = null,
                            Det = new List<Sueldos_Detalle>(),
                            Pagos = new List<Sueldos_Pagos>()
                        };

                    var detRows = db.Sueldos_Detalle.AsNoTracking()
                        .Where(d => d.IdSueldo == idSueldo)
                        .OrderBy(d => d.Id)
                        .Select(d => new
                        {
                            d.Id,
                            d.IdSueldo,
                            d.TipoOrigen,
                            d.IdTipoNegocio,
                            d.BaseMonto,
                            d.Porcentaje,
                            d.ImporteCalc,
                            d.Observacion
                        }).ToList();

                    var pgRows = db.Sueldos_Pagos.AsNoTracking()
                        .Where(p => p.IdSueldo == idSueldo)
                        .OrderByDescending(p => p.FechaPago)
                        .Select(p => new
                        {
                            p.Id,
                            p.IdSueldo,
                            p.FechaPago,
                            p.Metodo,
                            p.Importe,
                            p.Nota,
                            p.RutaComprobante
                        }).ToList();

                    var cab = new Sueldos
                    {
                        Id = cabRow.Id,
                        IdUsuario = cabRow.IdUsuario,
                        FechaDesde = cabRow.FechaDesde,
                        FechaHasta = cabRow.FechaHasta,
                        Concepto = cabRow.Concepto,
                        NotaInterna = cabRow.NotaInterna,
                        ImporteTotal = cabRow.ImporteTotal,
                        Abonado = cabRow.Abonado,
                        Saldo = cabRow.Saldo,
                        Estado = cabRow.Estado,
                        FechaAlta = cabRow.FechaAlta,
                        RutaComprobante = cabRow.RutaComprobante
                    };

                    var det = detRows.Select(d => new Sueldos_Detalle
                    {
                        Id = d.Id,
                        IdSueldo = d.IdSueldo,
                        TipoOrigen = d.TipoOrigen,
                        IdTipoNegocio = d.IdTipoNegocio,
                        BaseMonto = d.BaseMonto,
                        Porcentaje = d.Porcentaje,
                        ImporteCalc = d.ImporteCalc,
                        Observacion = d.Observacion
                    }).ToList();

                    var pg = pgRows.Select(p => new Sueldos_Pagos
                    {
                        Id = p.Id,
                        IdSueldo = p.IdSueldo,
                        FechaPago = p.FechaPago,
                        Metodo = p.Metodo,
                        Importe = p.Importe,
                        Nota = p.Nota,
                        RutaComprobante = p.RutaComprobante
                    }).ToList();

                    return new VMSueldoCabFull { Cab = cab, Det = det, Pagos = pg };
                }
            }
            catch (Exception ex) { Log(ex, tag); throw; }
        }

        /* ============================ Legacy compat ============================ */
        public static int GuardarCab(VMSueldoCalc calc, string concepto, string nota)
            => GuardarOActualizarCabConPagos(null, calc, concepto, nota, new List<VMPagoInput>(), null, new List<int>());

        public static int GuardarCabConPagos(VMSueldoCalc calc, string concepto, string nota,
            IEnumerable<VMPagoInput> pagos, string rutaComprobanteFirma)
            => GuardarOActualizarCabConPagos(null, calc, concepto, nota, pagos, rutaComprobanteFirma, new List<int>());
    }
}
