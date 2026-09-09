using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Globalization;
using System.Linq;

namespace Sistema_David.Models
{
    public static class RendimientoAnalisisModel
    {
        private static readonly CultureInfo EsAr = CultureInfo.GetCultureInfo("es-AR");
        private static readonly string[] DiasEs =
        {
            "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
        };

        public static VMAnalisisRendimiento Analizar(
            int idVendedor,
            DateTime fechaDesde,
            DateTime fechaHasta,
            int tipoNegocio,
            string metodoPago,
            int idCuentaBancaria,
            int comprobantesEnviados = -1,
            int idEstado = 1)
        {
            var desde = fechaDesde.Date;
            var hasta = fechaHasta.Date;
            if (hasta < desde)
            {
                var tmp = desde;
                desde = hasta;
                hasta = tmp;
            }

            var rows = RendimientosModel.MostrarRendimiento(
                idVendedor, 1, 1, desde, hasta, tipoNegocio,
                string.IsNullOrWhiteSpace(metodoPago) ? "Todos" : metodoPago,
                idCuentaBancaria, comprobantesEnviados) ?? new List<VMRendimiento>();

            var ausentes = RendimientosModel.MostrarClientesAusentes(desde, hasta)
                           ?? new List<VMInformacionVenta>();

            var personas = new Dictionary<int, VMAnalisisPersona>();
            var porVendedor = new Dictionary<int, VMAnalisisPersona>();
            var seriePorDia = new Dictionary<DateTime, VMAnalisisSerie>();
            var metodos = new Dictionary<string, VMAnalisisItem>(StringComparer.OrdinalIgnoreCase);
            var tipos = new Dictionary<string, VMAnalisisItem>(StringComparer.OrdinalIgnoreCase);
            var cuentas = new Dictionary<string, VMAnalisisItem>(StringComparer.OrdinalIgnoreCase);
            var diasSemana = new Dictionary<int, VMAnalisisItem>();
            var clientesVenta = new Dictionary<string, VMAnalisisCliente>(StringComparer.OrdinalIgnoreCase);
            var clientesCobro = new Dictionary<string, VMAnalisisCliente>(StringComparer.OrdinalIgnoreCase);
            var clientesUnicos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var ventasUnicas = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            for (int d = 0; d < 7; d++)
            {
                diasSemana[d] = new VMAnalisisItem { Nombre = DiasEs[d] };
            }

            var kpis = new VMAnalisisKpis();

            foreach (var r in rows)
            {
                if (r == null) continue;

                var desc = r.Descripcion ?? "";
                var metodo = (r.MetodoPago ?? "").Trim();
                var metodoUp = metodo.ToUpperInvariant();
                var esVenta = Contiene(desc, "Venta");
                var esCobro = Contiene(desc, "Cobranza");
                var esInteres = EsInteres(desc, metodo);
                var venta = r.Venta ?? 0;
                var cobro = r.Cobro ?? 0;
                var interes = r.Interes ?? 0;
                var fecha = (r.Fecha ?? desde).Date;
                var esElectro = EsElectro(r);

                if (!string.IsNullOrWhiteSpace(r.Cliente))
                    clientesUnicos.Add(r.Cliente.Trim());

                var diaSerie = ObtenerSerie(seriePorDia, fecha);
                diaSerie.Operaciones++;

                if (esVenta && venta != 0)
                {
                    kpis.TotalVentas += venta;
                    kpis.CantVentas++;
                    diaSerie.Ventas += venta;
                    if (r.IdVenta > 0)
                        ventasUnicas.Add((esElectro ? "E" : "C") + r.IdVenta);
                    else if (!string.IsNullOrWhiteSpace(r.IdUnico))
                        ventasUnicas.Add(r.IdUnico);

                    AcumularPersona(personas, r.IdVendedor, NombrePersona(r.Vendedor, r.IdVendedor), p =>
                    {
                        p.TotalVentas += venta;
                        p.CantVentas++;
                    });
                    if (r.IdVendedor > 0)
                    {
                        AcumularPersona(porVendedor, r.IdVendedor, NombrePersona(r.Vendedor, r.IdVendedor), p =>
                        {
                            p.TotalVentas += venta;
                            p.CantVentas++;
                        });
                    }
                    AcumularCliente(clientesVenta, r.Cliente, venta, r.TipoNegocio, fecha);
                    AcumularItem(tipos, NombreODefault(r.TipoNegocio, "Sin tipo"), venta, 1);
                }

                if (esCobro && cobro != 0)
                {
                    kpis.TotalCobros += cobro;
                    kpis.CantCobros++;
                    diaSerie.Cobros += cobro;

                    if (metodoUp == "EFECTIVO")
                    {
                        kpis.TotalEfectivo += cobro;
                        diaSerie.Efectivo += cobro;
                    }
                    else if (metodoUp == "TRANSFERENCIA PROPIA")
                    {
                        kpis.TotalTransferenciaPropia += cobro;
                        kpis.TotalTransferencia += cobro;
                        diaSerie.Transferencia += cobro;
                    }
                    else if (metodoUp == "TRANSFERENCIA A TERCEROS")
                    {
                        kpis.TotalTransferenciaTerceros += cobro;
                        kpis.TotalTransferencia += cobro;
                        diaSerie.Transferencia += cobro;
                    }

                    var idCobrador = r.IdCobrador > 0 ? r.IdCobrador : 0;
                    var nomCobrador = NombrePersona(r.UsuarioCobro, idCobrador);
                    AcumularPersona(personas, idCobrador, nomCobrador, p =>
                    {
                        p.TotalCobros += cobro;
                        p.CantCobros++;
                    });
                    if (r.IdVendedor > 0)
                    {
                        AcumularPersona(porVendedor, r.IdVendedor, NombrePersona(r.Vendedor, r.IdVendedor), p =>
                        {
                            p.TotalCobros += cobro;
                            p.CantCobros++;
                        });
                    }

                    AcumularCliente(clientesCobro, r.Cliente, cobro, r.TipoNegocio, fecha);
                    AcumularItem(metodos, string.IsNullOrWhiteSpace(metodo) ? "Sin método" : metodo, cobro, 1);

                    if (!string.IsNullOrWhiteSpace(r.CuentaBancaria) && metodoUp.Contains("TRANSFERENCIA"))
                        AcumularItem(cuentas, r.CuentaBancaria.Trim(), cobro, 1);

                    var dow = (int)fecha.DayOfWeek;
                    diasSemana[dow].Importe += cobro;
                    diasSemana[dow].Cantidad++;
                }

                if (esInteres && interes != 0)
                {
                    kpis.TotalInteres += interes;
                    kpis.CantIntereses++;
                    diaSerie.Interes += interes;

                    var idOp = r.IdCobrador > 0 ? r.IdCobrador : r.IdVendedor;
                    var nomOp = r.IdCobrador > 0
                        ? NombrePersona(r.UsuarioCobro, r.IdCobrador)
                        : NombrePersona(r.Vendedor, r.IdVendedor);
                    AcumularPersona(personas, idOp, nomOp, p =>
                    {
                        p.TotalInteres += interes;
                        p.CantIntereses++;
                    });
                }
            }

            kpis.VentasUnicas = ventasUnicas.Count;
            kpis.CantClientesUnicos = clientesUnicos.Count;
            kpis.CantAusentes = ausentes.Count;
            kpis.TicketPromedioVenta = kpis.CantVentas > 0 ? Math.Round(kpis.TotalVentas / kpis.CantVentas, 2) : 0;
            kpis.TicketPromedioCobro = kpis.CantCobros > 0 ? Math.Round(kpis.TotalCobros / kpis.CantCobros, 2) : 0;
            kpis.RatioCobroSobreVenta = kpis.TotalVentas > 0
                ? Math.Round(kpis.TotalCobros / kpis.TotalVentas * 100m, 1)
                : 0;
            var totalMedios = kpis.TotalEfectivo + kpis.TotalTransferencia;
            kpis.PctEfectivo = totalMedios > 0 ? Math.Round(kpis.TotalEfectivo / totalMedios * 100m, 1) : 0;
            kpis.PctTransferencia = totalMedios > 0 ? Math.Round(kpis.TotalTransferencia / totalMedios * 100m, 1) : 0;

            foreach (var p in personas.Values)
            {
                p.TotalGenerado = p.TotalVentas + p.TotalCobros + p.TotalInteres;
                p.CantOperaciones = p.CantVentas + p.CantCobros + p.CantIntereses;
                var maxVC = Math.Max(p.TotalVentas, p.TotalCobros);
                var minVC = Math.Min(p.TotalVentas, p.TotalCobros);
                p.Equilibrio = maxVC > 0 ? Math.Round(minVC / maxVC * 100m, 1) : 0;
                p.PctCobradoPeriodo = p.TotalVentas > 0
                    ? Math.Round(p.TotalCobros / p.TotalVentas * 100m, 1)
                    : -1m;
                if (p.CantVentas > 0 && p.CantCobros > 0) p.Rol = "Completo";
                else if (p.CantVentas > 0) p.Rol = "Vendedor";
                else if (p.CantCobros > 0) p.Rol = "Cobrador";
                else if (p.CantIntereses > 0) p.Rol = "Intereses";
                else p.Rol = "";
            }

            var padron = CargarPadronUsuarios(idVendedor, idEstado);
            var idsPadron = new HashSet<int>(
                (padron ?? new List<UsuarioPadron>())
                    .Where(u => u != null && u.Id > 0)
                    .Select(u => u.Id));
            if (idEstado > 0)
            {
                FiltrarPersonasPorEstado(personas, idsPadron);
                FiltrarPersonasPorEstado(porVendedor, idsPadron);
            }

            CalcularScores(personas.Values.ToList());

            var ranking = personas.Values
                .Where(p => p.Id > 0 && p.CantOperaciones > 0)
                .OrderByDescending(p => p.Score)
                .ThenByDescending(p => p.TotalGenerado)
                .ToList();

            kpis.CantVendedoresActivos = ranking.Count(p => p.CantVentas > 0);
            kpis.CantCobradoresActivos = ranking.Count(p => p.CantCobros > 0);

            foreach (var p in porVendedor.Values)
            {
                p.PctCobradoPeriodo = p.TotalVentas > 0
                    ? Math.Round(p.TotalCobros / p.TotalVentas * 100m, 1)
                    : -1m;
            }
            var porVendedorPeriodo = ArmarRankingTodos(porVendedor, padron, idVendedor, idEstado, p => p.TotalVentas);

            var serie = CompletarSerie(seriePorDia, desde, hasta);
            var mejorDiaCobros = serie.OrderByDescending(s => s.Cobros).FirstOrDefault();
            var mejorDiaVentas = serie.OrderByDescending(s => s.Ventas).FirstOrDefault();

            var topVentas = ArmarRankingTodos(personas, padron, idVendedor, idEstado, p => p.TotalVentas);
            var topCobrosComoVendedor = ArmarRankingTodos(personas, padron, idVendedor, idEstado, p => p.TotalCobros);
            var topInteres = ranking.Where(p => p.TotalInteres > 0).OrderByDescending(p => p.TotalInteres).Take(10).ToList();

            var ausentesPorCobrador = ausentes
                .GroupBy(a => (a.Cobrador ?? "Sin cobrador").Trim())
                .Select(g => new VMAnalisisPersona
                {
                    Nombre = string.IsNullOrWhiteSpace(g.Key) ? "Sin cobrador" : g.Key,
                    CantOperaciones = g.Count(),
                    CantCobros = g.Count()
                })
                .OrderByDescending(x => x.CantOperaciones)
                .Take(8)
                .ToList();
            ausentesPorCobrador = FiltrarAusentesPorEstado(ausentesPorCobrador, padron, idEstado);

            var destacados = new VMAnalisisDestacados
            {
                MejorVendedor = topVentas.FirstOrDefault(p => p.TotalVentas > 0),
                MejorCobrador = topCobrosComoVendedor.FirstOrDefault(p => p.TotalCobros > 0),
                MasCompleto = ranking.FirstOrDefault(p => p.Rol == "Completo") ?? ranking.FirstOrDefault(),
                MasInteres = topInteres.FirstOrDefault(),
                MasOperaciones = ranking.OrderByDescending(p => p.CantOperaciones).FirstOrDefault(),
                MejorDiaCobros = mejorDiaCobros != null && mejorDiaCobros.Cobros > 0
                    ? mejorDiaCobros.Fecha + " · " + mejorDiaCobros.Cobros.ToString("C0", EsAr)
                    : "—",
                MejorDiaVentas = mejorDiaVentas != null && mejorDiaVentas.Ventas > 0
                    ? mejorDiaVentas.Fecha + " · " + mejorDiaVentas.Ventas.ToString("C0", EsAr)
                    : "—"
            };

            var diasPeriodo = (int)(hasta - desde).TotalDays + 1;
            var vm = new VMAnalisisRendimiento
            {
                FechaDesde = desde.ToString("dd/MM/yyyy"),
                FechaHasta = hasta.ToString("dd/MM/yyyy"),
                DiasPeriodo = diasPeriodo,
                ResumenPeriodo = desde.ToString("dd/MM/yyyy") + " al " + hasta.ToString("dd/MM/yyyy") + " · " + diasPeriodo + (diasPeriodo == 1 ? " día" : " días"),
                Kpis = kpis,
                Destacados = destacados,
                RankingCompleto = ranking.Take(15).ToList(),
                TopVentas = topVentas,
                TopCobros = topCobrosComoVendedor,
                TopInteres = topInteres,
                TopCobradores = topCobrosComoVendedor,
                SerieDiaria = serie,
                MetodosPago = CerrarPorcentajes(metodos.Values.OrderByDescending(x => x.Importe).ToList(), kpis.TotalCobros),
                TiposNegocio = CerrarPorcentajes(tipos.Values.OrderByDescending(x => x.Importe).ToList(), kpis.TotalVentas),
                CuentasBancarias = CerrarPorcentajes(cuentas.Values.OrderByDescending(x => x.Importe).Take(8).ToList(), kpis.TotalTransferencia),
                DiasSemana = CerrarPorcentajes(diasSemana.Values.OrderBy(x => Array.IndexOf(DiasEs, x.Nombre)).ToList(), kpis.TotalCobros),
                TopClientesVenta = clientesVenta.Values.OrderByDescending(c => c.Importe).Take(8).ToList(),
                TopClientesCobro = clientesCobro.Values.OrderByDescending(c => c.Importe).Take(8).ToList(),
                ClientesMenosCompra = ArmarClientesMenosCompra(idVendedor, desde, hasta, tipoNegocio),
                ClientesEnCero = ArmarClientesEnCero(idVendedor, desde, hasta, tipoNegocio),
                AusentesPorCobrador = ausentesPorCobrador,
                FiadoCalle = FiltrarPorIds(ArmarCobranzaVsFiado(idVendedor, tipoNegocio, porVendedor.Values), x => x.Id, idsPadron, idEstado),
                CuotasVencidas = FiltrarPorIds(ArmarCuotasVencidas(idVendedor, tipoNegocio), x => x.Id, idsPadron, idEstado),
                PorVendedorPeriodo = porVendedorPeriodo,
                Insights = ArmarInsights(kpis, destacados, ranking, metodos.Values.ToList(), tipos.Values.ToList(), serie, ausentes.Count, diasPeriodo),
                Falencias = ArmarFalencias(ranking, ausentesPorCobrador, kpis, diasPeriodo)
            };

            return vm;
        }

        private static void CalcularScores(List<VMAnalisisPersona> personas)
        {
            if (personas == null || personas.Count == 0) return;
            var maxV = personas.Max(p => p.TotalVentas);
            var maxC = personas.Max(p => p.TotalCobros);
            var maxI = personas.Max(p => p.TotalInteres);
            var maxO = personas.Max(p => (decimal)p.CantOperaciones);
            if (maxV <= 0) maxV = 1;
            if (maxC <= 0) maxC = 1;
            if (maxI <= 0) maxI = 1;
            if (maxO <= 0) maxO = 1;

            foreach (var p in personas)
            {
                var nv = p.TotalVentas / maxV;
                var nc = p.TotalCobros / maxC;
                var ni = p.TotalInteres / maxI;
                var no = p.CantOperaciones / maxO;
                var bonusCompleto = (p.CantVentas > 0 && p.CantCobros > 0) ? 0.12m : 0m;
                var eq = p.Equilibrio / 100m;
                p.Score = Math.Round((nv * 35m) + (nc * 32m) + (ni * 8m) + (no * 13m) + (eq * 12m) + (bonusCompleto * 100m), 1);
            }
        }

        private static List<string> ArmarInsights(
            VMAnalisisKpis k,
            VMAnalisisDestacados d,
            List<VMAnalisisPersona> ranking,
            List<VMAnalisisItem> metodos,
            List<VMAnalisisItem> tipos,
            List<VMAnalisisSerie> serie,
            int ausentes,
            int dias)
        {
            var list = new List<string>();
            if (d.MasCompleto != null)
                list.Add(d.MasCompleto.Nombre + " es el perfil más completo del período (score " + d.MasCompleto.Score.ToString("0.0") + "): combina ventas, cobros y equilibrio.");
            if (d.MejorVendedor != null)
                list.Add(d.MejorVendedor.Nombre + " lidera ventas con " + d.MejorVendedor.TotalVentas.ToString("C0", EsAr) + " en " + d.MejorVendedor.CantVentas + " operaciones.");
            if (d.MejorCobrador != null)
                list.Add(d.MejorCobrador.Nombre + " es quien más cobró: " + d.MejorCobrador.TotalCobros.ToString("C0", EsAr) + ".");
            if (k.TotalVentas > 0)
                list.Add("Se generaron " + k.TotalVentas.ToString("C0", EsAr) + " en ventas y se cobró el " + k.RatioCobroSobreVenta.ToString("0.0") + "% de ese volumen en el mismo recorte.");
            if (k.TotalCobros > 0)
                list.Add("De lo cobrado, " + k.PctEfectivo.ToString("0.0") + "% fue efectivo y " + k.PctTransferencia.ToString("0.0") + "% transferencia.");
            var topMetodo = metodos.OrderByDescending(x => x.Importe).FirstOrDefault();
            if (topMetodo != null && topMetodo.Importe > 0)
                list.Add("El medio de cobro más usado en importe es " + topMetodo.Nombre + ".");
            if (!string.IsNullOrEmpty(d.MejorDiaCobros) && d.MejorDiaCobros != "—")
                list.Add("El día más fuerte de cobranzas fue " + d.MejorDiaCobros + ".");
            if (ausentes > 0)
                list.Add("Hubo " + ausentes + " visita" + (ausentes == 1 ? "" : "s") + " con cliente ausente en el rango.");
            if (k.CantVendedoresActivos > 0)
                list.Add("Hubo " + k.CantVendedoresActivos + " vendedor" + (k.CantVendedoresActivos == 1 ? "" : "es") + " con ventas y " + k.CantCobradoresActivos + " cobrador" + (k.CantCobradoresActivos == 1 ? "" : "es") + " activos en " + dias + " día" + (dias == 1 ? "" : "s") + ".");
            if (serie != null && serie.Count >= 3)
            {
                var ultimos = serie.Skip(Math.Max(0, serie.Count - 3)).Sum(s => s.Cobros);
                var primeros = serie.Take(3).Sum(s => s.Cobros);
                if (ultimos > primeros * 1.25m && primeros > 0)
                    list.Add("Las cobranzas se aceleraron hacia el final del período.");
                else if (primeros > ultimos * 1.25m && ultimos > 0)
                    list.Add("Las cobranzas fueron más fuertes al inicio del período.");
            }
            if (list.Count == 0)
                list.Add("No hay movimientos suficientes en el rango para armar un análisis. Probá otras fechas o quitá filtros.");
            return list;
        }

        private static string Plural(int n, string uno, string muchos)
        {
            return n == 1 ? uno : muchos;
        }

        private static List<string> ArmarFalencias(
            List<VMAnalisisPersona> ranking,
            List<VMAnalisisPersona> ausentesPorCobrador,
            VMAnalisisKpis k,
            int dias)
        {
            var list = new List<string>();
            if (ranking == null || ranking.Count == 0) return list;

            var yaNombrados = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var vendedores = ranking.Where(p => p.CantVentas > 0).ToList();
            var lapsus = dias <= 1 ? "este día" : ("estos " + dias + " días");

            if (vendedores.Count >= 3)
            {
                var promedioImporte = vendedores.Average(p => p.TotalVentas);
                var promedioCant = vendedores.Average(p => (decimal)p.CantVentas);
                var flojos = vendedores
                    .Where(p => p.TotalVentas < promedioImporte * 0.4m)
                    .OrderBy(p => p.TotalVentas)
                    .ThenBy(p => p.CantVentas)
                    .Take(4)
                    .ToList();

                foreach (var p in flojos)
                {
                    list.Add(
                        "Observar a " + p.Nombre + ": en " + lapsus + " hizo " +
                        p.CantVentas + " " + Plural(p.CantVentas, "venta", "ventas") +
                        " por " + p.TotalVentas.ToString("C0", EsAr) +
                        ". Está bastante por debajo del promedio del equipo (" +
                        promedioImporte.ToString("C0", EsAr) + " / " +
                        promedioCant.ToString("0.0") + " ventas).");
                    yaNombrados.Add(p.Nombre);
                }
            }

            if (dias >= 14)
            {
                var minimoEsperado = Math.Max(2, dias / 14);
                var pocasVentas = vendedores
                    .Where(p => p.CantVentas > 0 && p.CantVentas <= minimoEsperado && !yaNombrados.Contains(p.Nombre))
                    .OrderBy(p => p.CantVentas)
                    .Take(3)
                    .ToList();
                foreach (var p in pocasVentas)
                {
                    list.Add(
                        "Ojo con " + p.Nombre + ": solo " + p.CantVentas + " " +
                        Plural(p.CantVentas, "venta", "ventas") + " en " + lapsus +
                        " (" + p.TotalVentas.ToString("C0", EsAr) + "). Conviene revisar actividad y cartera.");
                    yaNombrados.Add(p.Nombre);
                }
            }

            var vendenSinCobrar = ranking
                .Where(p => p.CantVentas > 0 && p.TotalCobros == 0)
                .OrderByDescending(p => p.TotalVentas)
                .Take(4)
                .ToList();
            foreach (var p in vendenSinCobrar)
            {
                list.Add(
                    "Atención con " + p.Nombre + ": vendió " + p.TotalVentas.ToString("C0", EsAr) +
                    " en " + p.CantVentas + " " + Plural(p.CantVentas, "venta", "ventas") +
                    " y no registró cobros en este recorte. Equilibrio en 0%.");
            }

            var desbalance = ranking
                .Where(p => p.Rol == "Completo" && p.Equilibrio < 25m && p.TotalVentas > p.TotalCobros && p.TotalVentas > 0)
                .OrderBy(p => p.Equilibrio)
                .Take(3)
                .ToList();
            foreach (var p in desbalance)
            {
                if (vendenSinCobrar.Any(x => x.Id == p.Id)) continue;
                list.Add(
                    "Revisar a " + p.Nombre + ": vendió " + p.TotalVentas.ToString("C0", EsAr) +
                    " y cobró " + p.TotalCobros.ToString("C0", EsAr) +
                    " (equilibrio " + p.Equilibrio.ToString("0.0") + "%). La cartera puede estar quedando atrás.");
            }

            if (ausentesPorCobrador != null)
            {
                var topAus = ausentesPorCobrador.FirstOrDefault();
                if (topAus != null && topAus.CantOperaciones >= 5)
                {
                    list.Add(
                        "En visitas, " + topAus.Nombre + " acumula " + topAus.CantOperaciones +
                        " clientes ausentes en el período. Conviene mirar recorrido y franja horaria.");
                }
            }

            if (k != null && k.TotalVentas > 0 && k.RatioCobroSobreVenta < 40m)
            {
                list.Add(
                    "En el equipo se cobró solo el " + k.RatioCobroSobreVenta.ToString("0.0") +
                    "% de lo vendido en el mismo recorte. Hay desfasaje entre ventas y cobranzas.");
            }

            if (list.Count == 0)
                list.Add("En este recorte no aparecen falencias claras de vendedores. El equipo está parejo o hay pocos datos para comparar.");

            return list.Take(8).ToList();
        }

        private static List<VMAnalisisSerie> CompletarSerie(Dictionary<DateTime, VMAnalisisSerie> map, DateTime desde, DateTime hasta)
        {
            var list = new List<VMAnalisisSerie>();
            for (var f = desde; f <= hasta; f = f.AddDays(1))
            {
                if (map.TryGetValue(f, out var s))
                    list.Add(s);
                else
                {
                    list.Add(new VMAnalisisSerie
                    {
                        Fecha = f.ToString("dd/MM"),
                        FechaIso = f.ToString("yyyy-MM-dd")
                    });
                }
            }
            return list;
        }

        private static VMAnalisisSerie ObtenerSerie(Dictionary<DateTime, VMAnalisisSerie> map, DateTime fecha)
        {
            if (!map.TryGetValue(fecha, out var s))
            {
                s = new VMAnalisisSerie
                {
                    Fecha = fecha.ToString("dd/MM"),
                    FechaIso = fecha.ToString("yyyy-MM-dd")
                };
                map[fecha] = s;
            }
            return s;
        }

        private static void AcumularPersona(Dictionary<int, VMAnalisisPersona> map, int id, string nombre, Action<VMAnalisisPersona> acc)
        {
            if (!map.TryGetValue(id, out var p))
            {
                p = new VMAnalisisPersona { Id = id, Nombre = nombre };
                map[id] = p;
            }
            if (string.IsNullOrWhiteSpace(p.Nombre) || p.Nombre == "Sin asignar")
                p.Nombre = nombre;
            acc(p);
        }

        private static void AcumularCliente(Dictionary<string, VMAnalisisCliente> map, string cliente, decimal importe, string tipo, DateTime fecha)
        {
            var key = string.IsNullOrWhiteSpace(cliente) ? "Sin cliente" : cliente.Trim();
            if (!map.TryGetValue(key, out var c))
            {
                c = new VMAnalisisCliente { Nombre = key, TipoNegocio = tipo ?? "" };
                map[key] = c;
            }
            c.Importe += importe;
            c.Cantidad++;
            var iso = fecha.ToString("yyyy-MM-dd");
            if (string.IsNullOrEmpty(c.FechaUltimaVenta) || string.CompareOrdinal(iso, c.FechaUltimaVenta) > 0)
                c.FechaUltimaVenta = iso;
        }

        private static List<VMAnalisisFiado> ArmarCobranzaVsFiado(
            int idVendedor,
            int tipoNegocio,
            IEnumerable<VMAnalisisPersona> cobrosPeriodo)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    db.Configuration.ProxyCreationEnabled = false;
                    db.Configuration.LazyLoadingEnabled = false;

                    var incluirClasicas = tipoNegocio <= 0 || tipoNegocio == 1;
                    var incluirElectro = tipoNegocio <= 0 || tipoNegocio == 3;
                    var filtrarVendedor = idVendedor > 0;
                    var map = new Dictionary<int, VMAnalisisFiado>();

                    if (incluirClasicas)
                    {
                        var q = db.Ventas.AsNoTracking()
                            .Where(v => (v.Restante ?? 0) > 0
                                && (v.Estado == null || v.Estado == ""));
                        if (filtrarVendedor)
                            q = q.Where(v => v.idVendedor == idVendedor);

                        var rows = q
                            .GroupBy(v => v.idVendedor)
                            .Select(g => new
                            {
                                Id = g.Key,
                                Fiado = g.Sum(x => x.Restante ?? 0),
                                Cant = g.Count()
                            })
                            .ToList();
                        foreach (var x in rows)
                            AcumularFiado(map, x.Id, x.Fiado, x.Cant);
                    }

                    if (incluirElectro)
                    {
                        var q = db.Ventas_Electrodomesticos.AsNoTracking()
                            .Where(v => !v.Eliminada
                                && (v.Estado == null || v.Estado != "Pendiente")
                                && (v.Restante ?? 0) > 0);
                        if (filtrarVendedor)
                            q = q.Where(v => v.IdVendedor == idVendedor);

                        var rows = q
                            .GroupBy(v => v.IdVendedor)
                            .Select(g => new
                            {
                                Id = g.Key,
                                Fiado = g.Sum(x => x.Restante ?? 0),
                                Cant = g.Count()
                            })
                            .ToList();
                        foreach (var x in rows)
                            AcumularFiado(map, x.Id, x.Fiado, x.Cant);
                    }

                    if (cobrosPeriodo != null)
                    {
                        foreach (var p in cobrosPeriodo)
                        {
                            if (p == null || p.Id <= 0) continue;
                            if (filtrarVendedor && p.Id != idVendedor) continue;
                            if (!map.TryGetValue(p.Id, out var f))
                            {
                                f = new VMAnalisisFiado { Id = p.Id, Nombre = p.Nombre };
                                map[p.Id] = f;
                            }
                            f.Cobrado += p.TotalCobros;
                            if (string.IsNullOrWhiteSpace(f.Nombre) || f.Nombre == "Sin asignar" || f.Nombre.StartsWith("Usuario #"))
                                f.Nombre = NombrePersona(p.Nombre, p.Id);
                        }
                    }

                    CompletarNombresUsuarios(db, map.Values, x => x.Id, (x, n) => x.Nombre = n, x => x.Nombre);

                    foreach (var f in map.Values)
                    {
                        if (string.IsNullOrWhiteSpace(f.Nombre))
                            f.Nombre = NombrePersona(null, f.Id);
                        f.Pendiente = f.Fiado;
                        f.PctCobrado = f.Fiado > 0
                            ? Math.Round(f.Cobrado / f.Fiado * 100m, 2)
                            : -1m;
                    }

                    return map.Values
                        .Where(x => x.Id > 0 && (x.Fiado > 0 || x.Cobrado != 0))
                        .OrderByDescending(x => x.Fiado)
                        .ThenBy(x => x.PctCobrado < 0 ? decimal.MaxValue : x.PctCobrado)
                        .ThenBy(x => x.Nombre)
                        .ToList();
                }
            }
            catch
            {
                return new List<VMAnalisisFiado>();
            }
        }

        private static void AcumularFiado(Dictionary<int, VMAnalisisFiado> map, int id, decimal fiado, int cant)
        {
            if (!map.TryGetValue(id, out var f))
            {
                f = new VMAnalisisFiado { Id = id, Nombre = NombrePersona(null, id) };
                map[id] = f;
            }
            f.Fiado += fiado;
            f.CantVentas += cant;
        }

        private static List<VMAnalisisVencidas> ArmarCuotasVencidas(int idVendedor, int tipoNegocio)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    db.Configuration.ProxyCreationEnabled = false;
                    db.Configuration.LazyLoadingEnabled = false;

                    var hoy = DateTime.Today;
                    var incluirClasicas = tipoNegocio <= 0 || tipoNegocio == 1;
                    var incluirElectro = tipoNegocio <= 0 || tipoNegocio == 3;
                    var filtrarVendedor = idVendedor > 0;
                    var map = new Dictionary<int, AggVencidas>();

                    if (incluirClasicas)
                    {
                        var q = db.Ventas.AsNoTracking()
                            .Where(v => (v.Restante ?? 0) > 0
                                && (v.Estado == null || v.Estado == "")
                                && (
                                    (v.FechaCobro != null && DbFunctions.TruncateTime(v.FechaCobro) < hoy)
                                    || (v.FechaCobro == null && v.FechaLimite != null && DbFunctions.TruncateTime(v.FechaLimite) < hoy)
                                ));
                        if (filtrarVendedor)
                            q = q.Where(v => v.idVendedor == idVendedor);

                        var rows = q
                            .Select(v => new { Id = v.idVendedor, IdCliente = v.idCliente, Restante = v.Restante ?? 0 })
                            .ToList();
                        foreach (var x in rows)
                            AcumularVencida(map, x.Id, x.IdCliente, x.Restante);
                    }

                    if (incluirElectro)
                    {
                        var q =
                            from c in db.Ventas_Electrodomesticos_Cuotas.AsNoTracking()
                            join v in db.Ventas_Electrodomesticos.AsNoTracking() on c.IdVenta equals v.Id
                            where !v.Eliminada
                                  && (v.Estado == null || v.Estado != "Pendiente")
                                  && c.Estado != "Pagada"
                                  && DbFunctions.TruncateTime(c.FechaVencimiento) < hoy
                            select new
                            {
                                Id = v.IdVendedor,
                                IdCliente = v.IdCliente,
                                RestanteCampo = c.MontoRestante,
                                Calculado = (c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos) - c.MontoPagado
                            };
                        if (filtrarVendedor)
                            q = q.Where(x => x.Id == idVendedor);

                        var rows = q.ToList();
                        foreach (var x in rows)
                        {
                            var rest = x.RestanteCampo.HasValue && x.RestanteCampo.Value > 0
                                ? x.RestanteCampo.Value
                                : x.Calculado;
                            if (rest <= 0) continue;
                            AcumularVencida(map, x.Id, x.IdCliente, rest);
                        }
                    }

                    var list = map.Values
                        .Where(x => x.Id > 0 && x.CantCuotas > 0)
                        .Select(x => new VMAnalisisVencidas
                        {
                            Id = x.Id,
                            Nombre = NombrePersona(null, x.Id),
                            CantCuotas = x.CantCuotas,
                            MontoVencido = x.Monto,
                            CantClientes = x.Clientes.Count
                        })
                        .ToList();

                    CompletarNombresUsuarios(db, list, x => x.Id, (x, n) => x.Nombre = n, x => x.Nombre);

                    return list
                        .OrderByDescending(x => x.MontoVencido)
                        .ThenByDescending(x => x.CantCuotas)
                        .ThenBy(x => x.Nombre)
                        .ToList();
                }
            }
            catch
            {
                return new List<VMAnalisisVencidas>();
            }
        }

        private class AggVencidas
        {
            public int Id;
            public int CantCuotas;
            public decimal Monto;
            public HashSet<int> Clientes = new HashSet<int>();
        }

        private static void AcumularVencida(Dictionary<int, AggVencidas> map, int idVendedor, int idCliente, decimal monto)
        {
            if (!map.TryGetValue(idVendedor, out var a))
            {
                a = new AggVencidas { Id = idVendedor };
                map[idVendedor] = a;
            }
            a.CantCuotas++;
            a.Monto += monto;
            if (idCliente > 0)
                a.Clientes.Add(idCliente);
        }

        private class UsuarioPadron
        {
            public int Id;
            public string Nombre;
        }

        private static void FiltrarPersonasPorEstado(Dictionary<int, VMAnalisisPersona> map, HashSet<int> idsPadron)
        {
            if (map == null || idsPadron == null) return;
            var quitar = map.Keys.Where(id => !idsPadron.Contains(id)).ToList();
            foreach (var id in quitar)
                map.Remove(id);
        }

        private static List<T> FiltrarPorIds<T>(List<T> list, Func<T, int> getId, HashSet<int> idsPadron, int idEstado)
        {
            if (list == null) return new List<T>();
            if (idEstado <= 0 || idsPadron == null) return list;
            return list.Where(x => x != null && idsPadron.Contains(getId(x))).ToList();
        }

        private static List<VMAnalisisPersona> FiltrarAusentesPorEstado(
            List<VMAnalisisPersona> list,
            List<UsuarioPadron> padron,
            int idEstado)
        {
            if (list == null) return new List<VMAnalisisPersona>();
            if (idEstado <= 0) return list;
            var nombres = new HashSet<string>(
                (padron ?? new List<UsuarioPadron>())
                    .Where(u => u != null && !string.IsNullOrWhiteSpace(u.Nombre))
                    .Select(u => u.Nombre.Trim()),
                StringComparer.OrdinalIgnoreCase);
            return list.Where(x =>
            {
                var n = (x != null ? x.Nombre : null) ?? "";
                n = n.Trim();
                if (n.Length == 0 || n.Equals("Sin cobrador", StringComparison.OrdinalIgnoreCase))
                    return true;
                return nombres.Contains(n);
            }).ToList();
        }

        private static List<UsuarioPadron> CargarPadronUsuarios(int idVendedor, int idEstado)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    db.Configuration.ProxyCreationEnabled = false;
                    db.Configuration.LazyLoadingEnabled = false;

                    var q = db.Usuarios.AsNoTracking().Where(u => u.Id > 0);
                    if (idVendedor > 0)
                        q = q.Where(u => u.Id == idVendedor);
                    if (idEstado > 0)
                        q = q.Where(u => u.IdEstado == idEstado);

                    return q
                        .Select(u => new { u.Id, u.Nombre, u.Apellido })
                        .ToList()
                        .Select(u => new UsuarioPadron
                        {
                            Id = u.Id,
                            Nombre = NombrePersona(((u.Nombre ?? "") + " " + (u.Apellido ?? "")).Trim(), u.Id)
                        })
                        .ToList();
                }
            }
            catch
            {
                return new List<UsuarioPadron>();
            }
        }

        private static List<VMAnalisisPersona> ArmarRankingTodos(
            Dictionary<int, VMAnalisisPersona> personas,
            List<UsuarioPadron> padron,
            int idVendedor,
            int idEstado,
            Func<VMAnalisisPersona, decimal> importe)
        {
            var map = new Dictionary<int, VMAnalisisPersona>();
            if (personas != null)
            {
                foreach (var p in personas.Values)
                {
                    if (p == null || p.Id <= 0) continue;
                    if (idVendedor > 0 && p.Id != idVendedor) continue;
                    if (idEstado > 0 && (padron == null || !padron.Any(u => u != null && u.Id == p.Id))) continue;
                    map[p.Id] = new VMAnalisisPersona
                    {
                        Id = p.Id,
                        Nombre = p.Nombre,
                        TotalVentas = p.TotalVentas,
                        TotalCobros = p.TotalCobros,
                        TotalInteres = p.TotalInteres,
                        TotalGenerado = p.TotalGenerado,
                        CantVentas = p.CantVentas,
                        CantCobros = p.CantCobros,
                        CantIntereses = p.CantIntereses,
                        CantOperaciones = p.CantOperaciones,
                        Score = p.Score,
                        Equilibrio = p.Equilibrio,
                        PctCobradoPeriodo = p.PctCobradoPeriodo,
                        Rol = p.Rol
                    };
                }
            }

            if (padron != null)
            {
                foreach (var u in padron)
                {
                    if (u == null || u.Id <= 0) continue;
                    if (idVendedor > 0 && u.Id != idVendedor) continue;
                    if (!map.TryGetValue(u.Id, out var p))
                    {
                        map[u.Id] = new VMAnalisisPersona { Id = u.Id, Nombre = u.Nombre, PctCobradoPeriodo = -1m };
                    }
                    else if (string.IsNullOrWhiteSpace(p.Nombre) || p.Nombre == "Sin asignar" || p.Nombre.StartsWith("Usuario #"))
                    {
                        p.Nombre = u.Nombre;
                    }
                }
            }

            if (idVendedor > 0 && !map.ContainsKey(idVendedor)
                && (idEstado <= 0 || (padron != null && padron.Any(u => u != null && u.Id == idVendedor))))
            {
                var nom = padron != null
                    ? padron.Where(u => u != null && u.Id == idVendedor).Select(u => u.Nombre).FirstOrDefault()
                    : null;
                map[idVendedor] = new VMAnalisisPersona
                {
                    Id = idVendedor,
                    Nombre = NombrePersona(nom, idVendedor),
                    PctCobradoPeriodo = -1m
                };
            }

            return map.Values
                .OrderByDescending(importe)
                .ThenBy(p => p.Nombre)
                .ToList();
        }

        private static void CompletarNombresUsuarios<T>(
            Sistema_DavidEntities db,
            IEnumerable<T> items,
            Func<T, int> getId,
            Action<T, string> setNombre,
            Func<T, string> getNombre)
        {
            var list = items == null ? new List<T>() : items.ToList();
            var ids = list.Select(getId).Where(id => id > 0).Distinct().ToList();
            if (ids.Count == 0) return;

            var usuarios = db.Usuarios.AsNoTracking()
                .Where(u => ids.Contains(u.Id))
                .Select(u => new { u.Id, u.Nombre, u.Apellido })
                .ToList();
            var nombres = new Dictionary<int, string>();
            foreach (var u in usuarios)
            {
                var n = ((u.Nombre ?? "") + " " + (u.Apellido ?? "")).Trim();
                if (!string.IsNullOrEmpty(n))
                    nombres[u.Id] = n;
            }

            foreach (var item in list)
            {
                var id = getId(item);
                var actual = getNombre(item);
                if (!nombres.TryGetValue(id, out var n)) continue;
                if (string.IsNullOrWhiteSpace(actual) || actual == "Sin asignar" || actual.StartsWith("Usuario #"))
                    setNombre(item, n);
            }
        }

        private static List<VMAnalisisClienteCero> ArmarClientesEnCero(int idVendedor, DateTime desde, DateTime hasta, int tipoNegocio)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    db.Configuration.ProxyCreationEnabled = false;
                    db.Configuration.LazyLoadingEnabled = false;

                    var desdeD = desde.Date;
                    var hastaExcl = hasta.Date.AddDays(1);
                    var hoy = DateTime.Today;
                    var incluirClasicas = tipoNegocio <= 0 || tipoNegocio == 1;
                    var incluirElectro = tipoNegocio <= 0 || tipoNegocio == 3;
                    var filtrarVendedor = idVendedor > 0;

                    var q = db.Clientes.AsNoTracking()
                        .Where(c => c.FechaenCero != null
                            && c.FechaenCero >= desdeD
                            && c.FechaenCero < hastaExcl);
                    if (filtrarVendedor)
                        q = q.Where(c => c.IdVendedor == idVendedor);

                    if (incluirClasicas && incluirElectro)
                    {
                        q = q.Where(c =>
                            db.Ventas.Any(v => v.idCliente == c.Id)
                            || db.Ventas_Electrodomesticos.Any(v => v.IdCliente == c.Id && !v.Eliminada));
                    }
                    else if (incluirClasicas)
                    {
                        q = q.Where(c => db.Ventas.Any(v => v.idCliente == c.Id));
                    }
                    else if (incluirElectro)
                    {
                        q = q.Where(c => db.Ventas_Electrodomesticos.Any(v => v.IdCliente == c.Id && !v.Eliminada));
                    }

                    var clientes = q
                        .Select(c => new
                        {
                            c.Id,
                            c.Nombre,
                            c.Apellido,
                            c.Direccion,
                            c.IdZona,
                            c.IdVendedor,
                            c.Latitud,
                            c.Longitud,
                            Fecha = c.FechaenCero.Value
                        })
                        .ToList();

                    if (clientes.Count == 0)
                        return new List<VMAnalisisClienteCero>();

                    var ids = clientes.Select(c => c.Id).ToList();
                    var idsVend = clientes.Where(c => c.IdVendedor.HasValue && c.IdVendedor.Value > 0)
                        .Select(c => c.IdVendedor.Value).Distinct().ToList();

                    var nombresVend = new Dictionary<int, string>();
                    if (idsVend.Count > 0)
                    {
                        var us = db.Usuarios.AsNoTracking()
                            .Where(u => idsVend.Contains(u.Id))
                            .Select(u => new { u.Id, u.Nombre, u.Apellido })
                            .ToList();
                        foreach (var u in us)
                        {
                            var n = ((u.Nombre ?? "") + " " + (u.Apellido ?? "")).Trim();
                            nombresVend[u.Id] = string.IsNullOrEmpty(n) ? ("Usuario #" + u.Id) : n;
                        }
                    }

                    var idsZona = clientes.Where(c => c.IdZona.HasValue && c.IdZona.Value > 0)
                        .Select(c => c.IdZona.Value).Distinct().ToList();
                    var nombresZona = new Dictionary<int, string>();
                    if (idsZona.Count > 0)
                    {
                        var zs = db.Zonas.AsNoTracking()
                            .Where(z => idsZona.Contains(z.Id))
                            .Select(z => new { z.Id, z.Nombre })
                            .ToList();
                        foreach (var z in zs)
                        {
                            var zn = NombreZonaValido(z.Id, z.Nombre);
                            if (!string.IsNullOrEmpty(zn))
                                nombresZona[z.Id] = zn;
                        }
                    }

                    var fechaCeroPorCli = clientes.ToDictionary(c => c.Id, c => c.Fecha.Date);
                    var cobrosDia = new Dictionary<int, decimal>();
                    var ultimoCobro = new Dictionary<int, Tuple<DateTime, decimal>>();

                    if (incluirClasicas)
                    {
                        var iv = (
                            from i in db.InformacionVentas.AsNoTracking()
                            join v in db.Ventas.AsNoTracking() on i.IdVenta equals v.Id
                            where ids.Contains(v.idCliente)
                                  && i.Descripcion != null
                                  && i.Descripcion.Contains("Cobranza")
                                  && i.Fecha != null
                            select new { v.idCliente, Fecha = i.Fecha.Value, Entrega = i.Entrega ?? 0 }
                        ).ToList();

                        foreach (var x in iv)
                            AcumularCobroCero(cobrosDia, ultimoCobro, fechaCeroPorCli, x.idCliente, x.Fecha, x.Entrega);
                    }

                    if (incluirElectro)
                    {
                        var pagos = (
                            from p in db.Ventas_Electrodomesticos_Pagos.AsNoTracking()
                            join v in db.Ventas_Electrodomesticos.AsNoTracking() on p.IdVenta equals v.Id
                            where ids.Contains(v.IdCliente) && !v.Eliminada
                            select new { v.IdCliente, p.FechaPago, p.ImporteTotal }
                        ).ToList();

                        foreach (var x in pagos)
                            AcumularCobroCero(cobrosDia, ultimoCobro, fechaCeroPorCli, x.IdCliente, x.FechaPago, x.ImporteTotal);
                    }

                    var list = new List<VMAnalisisClienteCero>(clientes.Count);
                    foreach (var c in clientes.OrderByDescending(x => x.Fecha))
                    {
                        decimal imp;
                        if (!cobrosDia.TryGetValue(c.Id, out imp) || imp <= 0)
                        {
                            Tuple<DateTime, decimal> ult;
                            imp = ultimoCobro.TryGetValue(c.Id, out ult) ? ult.Item2 : 0;
                        }

                        var nom = ((c.Nombre ?? "") + " " + (c.Apellido ?? "")).Trim();
                        string vend = "—";
                        if (c.IdVendedor.HasValue && nombresVend.ContainsKey(c.IdVendedor.Value))
                            vend = nombresVend[c.IdVendedor.Value];
                        string zona = "";
                        if (c.IdZona.HasValue && nombresZona.ContainsKey(c.IdZona.Value))
                            zona = nombresZona[c.IdZona.Value];

                        var f = c.Fecha.Date;
                        list.Add(new VMAnalisisClienteCero
                        {
                            Id = c.Id,
                            Nombre = string.IsNullOrEmpty(nom) ? ("Cliente #" + c.Id) : nom,
                            Direccion = (c.Direccion ?? "").Trim(),
                            Zona = zona,
                            Latitud = (c.Latitud ?? "").Trim(),
                            Longitud = (c.Longitud ?? "").Trim(),
                            Vendedor = vend,
                            FechaCero = f.ToString("dd/MM/yyyy"),
                            DiasDesdeCero = Math.Max(0, (int)(hoy - f).TotalDays),
                            Importe = imp
                        });
                    }
                    return list;
                }
            }
            catch
            {
                return new List<VMAnalisisClienteCero>();
            }
        }

        /// <summary>Solo el nombre de zona. Nunca el Id (evita "San Luis 477 · 1").</summary>
        private static string NombreZonaValido(int? idZona, string nombre)
        {
            var n = (nombre ?? "").Trim();
            if (string.IsNullOrEmpty(n)) return "";
            int idNum;
            if (int.TryParse(n, out idNum)) return "";
            return n;
        }

        private static void AcumularCobroCero(
            Dictionary<int, decimal> cobrosDia,
            Dictionary<int, Tuple<DateTime, decimal>> ultimoCobro,
            Dictionary<int, DateTime> fechaCeroPorCli,
            int idCliente,
            DateTime fecha,
            decimal importe)
        {
            DateTime fCero;
            if (fechaCeroPorCli.TryGetValue(idCliente, out fCero) && fecha.Date == fCero)
            {
                decimal prev;
                cobrosDia.TryGetValue(idCliente, out prev);
                cobrosDia[idCliente] = prev + importe;
            }

            Tuple<DateTime, decimal> ult;
            if (!ultimoCobro.TryGetValue(idCliente, out ult) || fecha >= ult.Item1)
                ultimoCobro[idCliente] = Tuple.Create(fecha, importe);
        }

        private static List<VMAnalisisCliente> ArmarClientesMenosCompra(int idVendedor, DateTime desde, DateTime hasta, int tipoNegocio)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    db.Configuration.ProxyCreationEnabled = false;
                    db.Configuration.LazyLoadingEnabled = false;

                    var desdeD = desde.Date;
                    var hastaExcl = hasta.Date.AddDays(1);
                    var incluirClasicas = tipoNegocio <= 0 || tipoNegocio == 1;
                    var incluirElectro = tipoNegocio <= 0 || tipoNegocio == 3;
                    var periodo = new Dictionary<int, AggClientePeriodo>();
                    var ultima = new Dictionary<int, DateTime>();
                    var universo = new HashSet<int>();
                    var filtrarVendedor = idVendedor > 0;

                    if (incluirClasicas)
                    {
                        var qAll = db.Ventas.AsNoTracking().Where(v => v.idCliente > 0 && v.Fecha != null);
                        var qVend = filtrarVendedor ? qAll.Where(v => v.idVendedor == idVendedor) : qAll;

                        var ult = qAll
                            .GroupBy(v => v.idCliente)
                            .Select(g => new { Id = g.Key, Fecha = g.Max(x => x.Fecha) })
                            .ToList();
                        foreach (var x in ult)
                        {
                            if (!x.Fecha.HasValue) continue;
                            MergeMaxFecha(ultima, x.Id, x.Fecha.Value.Date);
                        }

                        if (filtrarVendedor)
                        {
                            foreach (var id in qVend.Select(v => v.idCliente).Distinct().ToList())
                                universo.Add(id);
                        }

                        var per = qVend
                            .Where(v => v.Fecha >= desdeD && v.Fecha < hastaExcl)
                            .GroupBy(v => v.idCliente)
                            .Select(g => new
                            {
                                Id = g.Key,
                                Importe = g.Sum(x => (x.Entrega ?? 0) + (x.Restante ?? 0)),
                                Cant = g.Count()
                            })
                            .ToList();
                        foreach (var x in per)
                            AcumularPeriodoCliente(periodo, x.Id, x.Importe, x.Cant);
                    }

                    if (incluirElectro)
                    {
                        var qAll = db.Ventas_Electrodomesticos.AsNoTracking()
                            .Where(v => !v.Eliminada && v.IdCliente > 0);
                        var qVend = filtrarVendedor ? qAll.Where(v => v.IdVendedor == idVendedor) : qAll;

                        var ult = qAll
                            .GroupBy(v => v.IdCliente)
                            .Select(g => new { Id = g.Key, Fecha = g.Max(x => x.FechaVenta) })
                            .ToList();
                        foreach (var x in ult)
                            MergeMaxFecha(ultima, x.Id, x.Fecha.Date);

                        if (filtrarVendedor)
                        {
                            foreach (var id in qVend.Select(v => v.IdCliente).Distinct().ToList())
                                universo.Add(id);
                        }

                        var per = qVend
                            .Where(v => v.FechaVenta >= desdeD && v.FechaVenta < hastaExcl)
                            .GroupBy(v => v.IdCliente)
                            .Select(g => new
                            {
                                Id = g.Key,
                                Importe = g.Sum(x => (decimal?)x.ImporteTotal) ?? 0m,
                                Cant = g.Count()
                            })
                            .ToList();
                        foreach (var x in per)
                            AcumularPeriodoCliente(periodo, x.Id, x.Importe, x.Cant);
                    }

                    if (!filtrarVendedor)
                    {
                        foreach (var id in ultima.Keys)
                            universo.Add(id);
                    }

                    if (universo.Count == 0)
                        return new List<VMAnalisisCliente>();

                    var conPeriodo = periodo
                        .Where(kv => universo.Contains(kv.Key) && kv.Value.Cantidad > 0)
                        .Select(kv => new { Id = kv.Key, kv.Value.Importe, kv.Value.Cantidad })
                        .OrderBy(x => x.Importe)
                        .ThenBy(x => x.Cantidad)
                        .ThenBy(x => x.Id)
                        .ToList();
                    var idsConPeriodo = new HashSet<int>(conPeriodo.Select(x => x.Id));
                    var sinPeriodo = ultima
                        .Where(kv => universo.Contains(kv.Key) && !idsConPeriodo.Contains(kv.Key))
                        .OrderBy(kv => kv.Value)
                        .ThenBy(kv => kv.Key)
                        .ToList();

                    var elegidos = new List<Tuple<int, decimal, int>>(50);
                    foreach (var x in conPeriodo)
                    {
                        elegidos.Add(Tuple.Create(x.Id, x.Importe, x.Cantidad));
                        if (elegidos.Count >= 50) break;
                    }
                    if (elegidos.Count < 50)
                    {
                        foreach (var kv in sinPeriodo)
                        {
                            elegidos.Add(Tuple.Create(kv.Key, 0m, 0));
                            if (elegidos.Count >= 50) break;
                        }
                    }

                    var idList = elegidos.Select(x => x.Item1).Distinct().ToList();
                    var nombres = new Dictionary<int, string>();
                    if (idList.Count > 0)
                    {
                        var cli = db.Clientes.AsNoTracking()
                            .Where(c => idList.Contains(c.Id))
                            .Select(c => new { c.Id, c.Nombre, c.Apellido })
                            .ToList();
                        foreach (var c in cli)
                        {
                            var n = ((c.Nombre ?? "") + " " + (c.Apellido ?? "")).Trim();
                            nombres[c.Id] = string.IsNullOrEmpty(n) ? ("Cliente #" + c.Id) : n;
                        }
                    }

                    var list = new List<VMAnalisisCliente>(elegidos.Count);
                    foreach (var x in elegidos)
                    {
                        DateTime fUlt;
                        ultima.TryGetValue(x.Item1, out fUlt);
                        string nom;
                        if (!nombres.TryGetValue(x.Item1, out nom) || string.IsNullOrWhiteSpace(nom))
                            nom = "Cliente #" + x.Item1;
                        list.Add(new VMAnalisisCliente
                        {
                            Nombre = nom,
                            Importe = x.Item2,
                            Cantidad = x.Item3,
                            FechaUltimaVenta = fUlt == default(DateTime) ? "" : fUlt.ToString("dd/MM/yyyy")
                        });
                    }
                    return list;
                }
            }
            catch
            {
                return new List<VMAnalisisCliente>();
            }
        }

        private class AggClientePeriodo
        {
            public decimal Importe;
            public int Cantidad;
        }

        private static void AcumularPeriodoCliente(Dictionary<int, AggClientePeriodo> map, int id, decimal importe, int cant)
        {
            AggClientePeriodo a;
            if (!map.TryGetValue(id, out a))
            {
                a = new AggClientePeriodo();
                map[id] = a;
            }
            a.Importe += importe;
            a.Cantidad += cant;
        }

        private static void MergeMaxFecha(Dictionary<int, DateTime> map, int id, DateTime fecha)
        {
            DateTime prev;
            if (!map.TryGetValue(id, out prev) || fecha > prev)
                map[id] = fecha;
        }

        private static void AcumularItem(Dictionary<string, VMAnalisisItem> map, string nombre, decimal importe, int cant)
        {
            if (!map.TryGetValue(nombre, out var it))
            {
                it = new VMAnalisisItem { Nombre = nombre };
                map[nombre] = it;
            }
            it.Importe += importe;
            it.Cantidad += cant;
        }

        private static List<VMAnalisisItem> CerrarPorcentajes(List<VMAnalisisItem> items, decimal total)
        {
            if (items == null) return new List<VMAnalisisItem>();
            foreach (var it in items)
                it.Porcentaje = total > 0 ? Math.Round(it.Importe / total * 100m, 1) : 0;
            return items;
        }

        private static string NombrePersona(string nombre, int id)
        {
            if (!string.IsNullOrWhiteSpace(nombre)) return nombre.Trim();
            return id > 0 ? ("Usuario #" + id) : "Sin asignar";
        }

        private static string NombreODefault(string valor, string def)
        {
            return string.IsNullOrWhiteSpace(valor) ? def : valor.Trim();
        }

        private static bool Contiene(string texto, string parte)
        {
            return (texto ?? "").IndexOf(parte, StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static bool EsInteres(string descripcion, string metodoPago)
        {
            var desc = (descripcion ?? "").ToUpperInvariant();
            var metodo = (metodoPago ?? "").ToUpperInvariant();
            return desc.Contains("INTERES") || desc.Contains("INTERÉS") || desc.Contains("RECARGO")
                || metodo.Contains("INTERES") || metodo.Contains("INTERÉS") || metodo == "RECARGO";
        }

        private static bool EsElectro(VMRendimiento r)
        {
            var o = (r.Origen ?? "").ToUpperInvariant();
            if (o.Contains("ELECTRO")) return true;
            if (r.IdTipoNegocio == 3) return true;
            var d = (r.Descripcion ?? "").ToLowerInvariant();
            var t = (r.TipoNegocio ?? "").ToLowerInvariant();
            return d.Contains("electro") || t.Contains("electro");
        }
    }
}
