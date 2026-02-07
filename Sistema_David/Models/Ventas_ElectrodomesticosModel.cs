using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using Sistema_David.Models.ViewModels;

namespace Sistema_David.Models
{
    public class Ventas_ElectrodomesticosModel
    {
        /* ===========================================================
         * Helpers
         * =========================================================== */

        private static decimal R2(decimal v) =>
            Math.Round(v, 2, MidpointRounding.AwayFromZero);

        private static DateTime NextPeriod(DateTime from, string forma)
        {
            switch ((forma ?? "").Trim())
            {
                case "Diaria": return from.AddDays(1);
                case "Semanal": return from.AddDays(7);
                case "Quincenal": return from.AddDays(14);
                case "Mensual": return from.AddMonths(1);
                default: return from.AddDays(7);
            }
        }

        /* ===========================================================
         * HISTORIAL
         * =========================================================== */
        public static VM_HistorialVentasResp ListarHistorial(DateTime? desde, DateTime? hasta, string estado, int idVendedor)
        {
            using (var db = new Sistema_DavidEntities())
            {
                var q = db.Ventas_Electrodomesticos.AsQueryable();

                if (desde.HasValue)
                {
                    var d = desde.Value.Date;
                    q = q.Where(v =>
                        DbFunctions.TruncateTime(v.FechaVenta) >= DbFunctions.TruncateTime(d));
                }

                if (hasta.HasValue)
                {
                    var h = hasta.Value.Date;
                    q = q.Where(v =>
                        DbFunctions.TruncateTime(v.FechaVenta) <= DbFunctions.TruncateTime(h));
                }

                if (!string.IsNullOrWhiteSpace(estado))
                    q = q.Where(v => v.Estado == estado);

                if (idVendedor > 0)
                    q = q.Where(v => v.IdVendedor == idVendedor);

                var ventas = q.ToList();
                var rows = new List<VM_HistorialVentasRow>();
                var hoy = DateTime.Today;

                foreach (var v in ventas)
                {
                    var cuotas = db.Ventas_Electrodomesticos_Cuotas
                        .Where(c => c.IdVenta == v.Id)
                        .OrderBy(c => c.NumeroCuota)
                        .ToList();

                    var row = new VM_HistorialVentasRow
                    {
                        IdVenta = v.Id,
                        Fecha = v.FechaVenta,
                        Cliente = v.Clientes?.Nombre,
                        Total = v.ImporteTotal,
                        Pagado = (decimal)(cuotas.Sum(c => c.MontoPagado) + v.Entrega),
                        Pendiente = cuotas.Sum(c =>
                            (c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos) - c.MontoPagado),
                        PorcentajePago =
                            cuotas.Sum(c => (c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos)) == 0
                                ? 100
                                : (cuotas.Sum(c => c.MontoPagado)
                                    / cuotas.Sum(c => (c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos)))
                                * 100,



                        CuotasVencidas = cuotas.Count(c =>
                            c.Estado != "Pagada" && c.FechaVencimiento.Date < hoy),
                        Estado = v.Estado
                    };

                    foreach (var c in cuotas)
                    {
                        row.Cuotas.Add(new VM_HistorialCuota
                        {
                            Id = c.Id,
                            NumeroCuota = c.NumeroCuota,
                            FechaVencimiento = c.FechaVencimiento,
                            MontoOriginal = c.MontoOriginal,
                            MontoPagado = c.MontoPagado,
                            Recargos = c.MontoRecargos,
                            Descuentos = c.MontoDescuentos,
                            Estado = c.Estado
                        });
                    }

                    rows.Add(row);
                }

                return new VM_HistorialVentasResp
                {
                    Filas = rows,
                    Kpis = new
                    {
                        CantidadVentas = rows.Count,
                        TotalVendido = rows.Sum(x => x.Total),
                        TotalCobrado = rows.Sum(x => x.Pagado),
                        TotalPendiente = rows.Sum(x => x.Pendiente)
                    }
                };
            }
        }

        /* ===========================================================
         * Audit
         * =========================================================== */
        private static void Audit(Sistema_DavidEntities db, int? idVenta, int? idCuota,
            int usuario, string campo, string anterior, string nuevo, string obs = null)
        {
            db.Ventas_Electrodomesticos_Historial.Add(new Ventas_Electrodomesticos_Historial
            {
                IdVenta = idVenta,
                IdCuota = idCuota,
                UsuarioCambio = usuario,
                FechaCambio = DateTime.Now,
                Campo = campo,
                ValorAnterior = anterior,
                ValorNuevo = nuevo,
                Observacion = obs
            });
        }

        /* ===========================================================
         * ELIMINAR PAGO (REVERSA COMPLETA)
         * =========================================================== */
        public static string EliminarPago(int idPago, int usuario)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var pago = db.Ventas_Electrodomesticos_Pagos
                        .Include(p => p.Ventas_Electrodomesticos)
                        .Include(p => p.Ventas_Electrodomesticos_Pagos_Detalle)
                        .FirstOrDefault(p => p.Id == idPago);

                    if (pago == null)
                        return "Pago no encontrado";

                    var venta = pago.Ventas_Electrodomesticos;
                    if (venta == null)
                        return "Venta asociada no encontrada";

                    /* ============================
                       REVERSAR APLICACIONES
                    ============================ */
                    foreach (var det in pago.Ventas_Electrodomesticos_Pagos_Detalle)
                    {
                        var cuota = db.Ventas_Electrodomesticos_Cuotas
                            .FirstOrDefault(c => c.Id == det.IdCuota);

                        if (cuota == null) continue;

                        var pagAnt = cuota.MontoPagado;

                        cuota.MontoPagado = Math.Round(cuota.MontoPagado - det.ImporteAplicado, 2);
                        if (cuota.MontoPagado < 0) cuota.MontoPagado = 0;

                        var total = cuota.MontoOriginal + cuota.MontoRecargos - cuota.MontoDescuentos;
                        cuota.MontoRestante = Math.Round(total - cuota.MontoPagado, 2);

                        cuota.Estado = cuota.MontoRestante > 0 ? "Pendiente" : "Pagada";
                        cuota.UsuarioModificacion = usuario;
                        cuota.FechaModificacion = DateTime.Now;

                        Audit(db, venta.Id, cuota.Id, usuario,
                            "EliminarPago",
                            $"PagadoAntes={pagAnt}",
                            $"PagadoAhora={cuota.MontoPagado}",
                            $"Reverso de pago #{idPago}");
                    }

                    /* ============================
                       ELIMINAR DETALLES + PAGO
                    ============================ */
                    db.Ventas_Electrodomesticos_Pagos_Detalle.RemoveRange(
                        pago.Ventas_Electrodomesticos_Pagos_Detalle
                    );
                    db.Ventas_Electrodomesticos_Pagos.Remove(pago);

                    /* ============================
                       RECALCULAR ESTADO DE VENTA
                    ============================ */
                    RecalcularEstadoVenta(db, venta, usuario);

                    Audit(db, venta.Id, null, usuario,
                        "EliminarPago",
                        pago.ImporteTotal.ToString("N2"),
                        "Pago eliminado");

                    db.SaveChanges();
                    tx.Commit();

                    return "OK";
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    return "Error al eliminar pago: " + ex.Message;
                }
            }
        }

        /* ===========================================================
         * ESTADO DE LA VENTA
         * =========================================================== */
        private static void RecalcularEstadoVenta(Sistema_DavidEntities db,
            Ventas_Electrodomesticos venta, int usuario)
        {
            var saldo = db.Ventas_Electrodomesticos_Cuotas
                .Where(c => c.IdVenta == venta.Id)
                .Select(c => (c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos) - c.MontoPagado)
                .DefaultIfEmpty(0m)
                .Sum();

            var nuevo = R2(saldo) <= 0 ? "Cancelada" : "Activa";

            if (!string.Equals(nuevo, venta.Estado, StringComparison.OrdinalIgnoreCase))
            {
                var ant = venta.Estado;
                venta.Estado = nuevo;
                venta.UsuarioModificacion = usuario;
                venta.FechaModificacion = DateTime.Now;

                Audit(db, venta.Id, null, usuario, "EstadoVenta", ant, nuevo);
            }

            venta.Restante = R2(saldo);
        }

        /* ===========================================================
         * CREAR VENTA
         * =========================================================== */
        public static int CrearVenta(VM_Ventas_Electrodomesticos_Crear m)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    /* ===============================
                     * 1️⃣ VALIDAR STOCK
                     * =============================== */

                    foreach (var it in m.Items)
                    {
                        var stockUser = db.StockUsuarios
                            .FirstOrDefault(s =>
                                s.IdUsuario == m.IdVendedor &&
                                s.IdProducto == it.IdProducto);

                        if (stockUser == null || stockUser.Cantidad < it.Cantidad)
                            throw new Exception($"Stock insuficiente para {it.Producto}");
                    }

                    /* ===============================
                     * 🔥 CALCULAR RECARGOS / DESCUENTOS
                     * =============================== */

                    decimal totalRecargos = m.Cuotas?.Sum(c => R2(c.MontoRecargos)) ?? 0;
                    decimal totalDescuentos = m.Cuotas?.Sum(c => R2(c.MontoDescuentos)) ?? 0;

                    /* ===============================
                     * 2️⃣ CREAR VENTA
                     * =============================== */

                    decimal entrega = m.Entrega ?? 0;
                    decimal restante = Math.Max(0, m.ImporteTotal - entrega);

                    var venta = new Ventas_Electrodomesticos
                    {
                        FechaVenta = m.FechaVenta,
                        IdCliente = m.IdCliente,
                        IdVendedor = m.IdVendedor,

                        ImporteTotal = R2(m.ImporteTotal),
                        ImporteRecargos = R2(totalRecargos),      // 🔥 CLAVE
                        ImporteDescuentos = R2(totalDescuentos),  // 🔥 CLAVE
                        ImporteInteres = 0,

                        Entrega = R2(entrega),
                        Restante = R2(restante),

                        FormaCuotas = m.FormaCuotas,
                        CantidadCuotas = m.CantidadCuotas,
                        FechaVencimiento = m.FechaVencimiento,

                        RecargoTipo = m.RecargoTipo,
                        RecargoValor = m.RecargoValor,

                        DescuentoTipo = m.DescuentoTipo,
                        DescuentoValor = m.DescuentoValor,

                        Estado = "Activa",
                        Observacion = m.Observacion,
                        UsuarioCreacion = m.UsuarioOperador,
                        FechaCreacion = DateTime.Now,
                        Turno = m.Turno,
                        FranjaHoraria = m.FranjaHoraria
                    };

                    db.Ventas_Electrodomesticos.Add(venta);
                    db.SaveChanges();

                    /* ===============================
                     * 3️⃣ DESCONTAR STOCK + DETALLE
                     * =============================== */

                    foreach (var it in m.Items)
                    {
                        var stockUser = db.StockUsuarios.First(s =>
                            s.IdUsuario == m.IdVendedor &&
                            s.IdProducto == it.IdProducto);

                        stockUser.Cantidad -= (int)it.Cantidad;

                        if (stockUser.Cantidad <= 0)
                            db.StockUsuarios.Remove(stockUser);
                        else
                            db.Entry(stockUser).State = EntityState.Modified;

                        var prod = db.Productos.First(p => p.Id == it.IdProducto);
                        prod.Stock -= (int?)it.Cantidad;
                        db.Entry(prod).State = EntityState.Modified;

                        db.Ventas_Electrodomesticos_Detalle.Add(
                            new Ventas_Electrodomesticos_Detalle
                            {
                                IdVenta = venta.Id,
                                IdProducto = it.IdProducto,
                                Producto = it.Producto,
                                Cantidad = it.Cantidad,
                                PrecioUnitario = it.PrecioUnitario,
                                Subtotal = it.Subtotal
                            }
                        );
                    }

                    db.SaveChanges();

                    /* ===============================
                     * 4️⃣ CREAR CUOTAS
                     * =============================== */

                    foreach (var c in m.Cuotas)
                    {
                        var totalCuota = R2(
                            c.MontoOriginal +
                            c.MontoRecargos -
                            c.MontoDescuentos
                        );

                        db.Ventas_Electrodomesticos_Cuotas.Add(
                            new Ventas_Electrodomesticos_Cuotas
                            {
                                IdVenta = venta.Id,
                                NumeroCuota = c.NumeroCuota,
                                FechaVencimiento = c.FechaVencimiento,
                                MontoOriginal = R2(c.MontoOriginal),
                                MontoRecargos = R2(c.MontoRecargos),
                                MontoDescuentos = R2(c.MontoDescuentos),
                                MontoPagado = 0,
                                MontoRestante = totalCuota,
                                Estado = "Pendiente",
                                FechaCobro = c.FechaVencimiento,
                                UsuarioCreacion = m.UsuarioOperador,
                                FechaCreacion = DateTime.Now,
                                CobroPendiente = 0,
                                TransferenciaPendiente = 0
                            }
                        );
                    }

                    db.SaveChanges();
                    tx.Commit();

                    return venta.Id;
                }
                catch
                {
                    tx.Rollback();
                    throw;
                }
            }
        }


        public static int? ResolverIdVentaDesdeMovimiento(int idMovimiento, string descripcion)
        {
            if (string.IsNullOrWhiteSpace(descripcion))
                return null;

            using (var db = new Sistema_DavidEntities())
            {
                if (descripcion.Contains("Venta"))
                    return idMovimiento;

                if (descripcion.Contains("Cobranza"))
                {
                    return db.Ventas_Electrodomesticos_Pagos
                        .Where(p => p.Id == idMovimiento)
                        .Select(p => (int?)p.IdVenta)
                        .FirstOrDefault();
                }

                if (descripcion.Contains("Recargo"))
                {
                    return db.Ventas_Electrodomesticos_Cuotas_Recargos
                        .Where(r => r.Id == idMovimiento)
                        .Select(r => (int?)r.Ventas_Electrodomesticos_Cuotas.IdVenta)
                        .FirstOrDefault();
                }

                return null;
            }
        }



        /* ===========================================================
         * OBTENER DETALLE
         * =========================================================== */
        public static VM_Ventas_Electrodomesticos_Detalle ObtenerVenta(int idVenta)
        {
            using (var db = new Sistema_DavidEntities())
            {
                var v = db.Ventas_Electrodomesticos
                    .Include(x => x.Clientes)
                    .Include(x => x.Ventas_Electrodomesticos_Detalle)
                    .Include(x => x.Ventas_Electrodomesticos_Cuotas
                        .Select(c => c.Ventas_Electrodomesticos_Cuotas_Recargos))
                    .Include(x => x.Ventas_Electrodomesticos_Pagos
                        .Select(p => p.Ventas_Electrodomesticos_Pagos_Detalle))
                    .Include(x => x.Ventas_Electrodomesticos_Historial)
                    .FirstOrDefault(x => x.Id == idVenta);

                if (v == null)
                    return null;

                var vm = new VM_Ventas_Electrodomesticos_Detalle
                {
                    /* ================= CLIENTE ================= */
                    ClienteNombre = v.Clientes != null
                        ? ((v.Clientes.Nombre ?? "") + " " + (v.Clientes.Apellido ?? "")).Trim()
                        : null,
                    ClienteDireccion = v.Clientes?.Direccion,
                    ClienteTelefono = v.Clientes?.Telefono,
                    ClienteEstado = ClientesModel.InformacionCliente(v.IdCliente).Estado,
                    ClienteDNI = v.Clientes?.Dni,

                    /* ================= HEADER VENTA ================= */
                    IdVenta = v.Id,
                    FechaVenta = v.FechaVenta,
                    IdCliente = v.IdCliente,
                    IdVendedor = v.IdVendedor,
                    ImporteTotal = v.ImporteTotal,

                    ImporteInteres = v.ImporteInteres,
                    ImporteRecargos = v.ImporteRecargos,
                    ImporteDescuentos = v.ImporteDescuentos,

                    // 🔥 NUEVOS CAMPOS (CONTRATO DE RECARGO/DESCUENTO)
                    RecargoTipo = v.RecargoTipo,
                    RecargoValor = v.RecargoValor,
                    DescuentoTipo = v.DescuentoTipo,
                    DescuentoValor = v.DescuentoValor,

                    FormaCuotas = v.FormaCuotas,
                    CantidadCuotas = v.CantidadCuotas,
                    FechaVencimiento = v.FechaVencimiento,
                    Estado = v.Estado,
                    Observacion = v.Observacion,

                    FranjaHoraria = v.FranjaHoraria,
                    Turno = v.Turno,

                    Entrega = v.Entrega ?? 0,
                    Restante = v.Restante ?? 0
                };

                /* ================= ITEMS ================= */
                vm.Items = v.Ventas_Electrodomesticos_Detalle
                    .Select(i => new VM_Ventas_Electrodomesticos_Item
                    {
                        IdProducto = i.IdProducto,
                        Producto = i.Producto,
                        Cantidad = i.Cantidad,
                        PrecioUnitario = i.PrecioUnitario
                    })
                    .ToList();

                /* ================= CUOTAS ================= */
                vm.Cuotas = v.Ventas_Electrodomesticos_Cuotas
                    .OrderBy(c => c.NumeroCuota)
                    .Select(c => new VM_Ventas_Electrodomesticos_Cuota
                    {
                        Id = c.Id,
                        NumeroCuota = c.NumeroCuota,
                        FechaVencimiento = c.FechaVencimiento,

                        MontoOriginal = c.MontoOriginal,
                        MontoRecargos = c.MontoRecargos,
                        MontoDescuentos = c.MontoDescuentos,
                        MontoPagado = c.MontoPagado,

                        MontoRestante =
                            c.MontoOriginal +
                            c.MontoRecargos -
                            c.MontoDescuentos -
                            c.MontoPagado,

                        Estado = c.Estado,

                        // 🔥 RECARGOS INDIVIDUALES
                        Recargos = c.Ventas_Electrodomesticos_Cuotas_Recargos
                            .OrderBy(r => r.Fecha)
                            .Select(r => new VM_Ventas_Electrodomesticos_RecargoCuotaDetalle
                            {
                                Id = r.Id,
                                IdCuota = r.IdCuota,
                                Fecha = r.Fecha,
                                Tipo = r.Tipo,
                                Valor = r.Valor,
                                ImporteCalculado = r.ImporteCalculado,
                                Observacion = r.Observacion,
                                UsuarioCreacion = r.UsuarioCreacion
                            })
                            .ToList()
                    })
                    .ToList();

                /* ================= PAGOS ================= */
                vm.Pagos = v.Ventas_Electrodomesticos_Pagos
                    .OrderByDescending(p => p.FechaPago)
                    .Select(p => new
                    {
                        p.Id,
                        p.IdVenta,
                        p.FechaPago,
                        p.MedioPago,
                        p.ImporteTotal,
                        p.Observacion,
                        p.ClienteAusente,
                        p.Imagen,
                        p.IdCuentaBancaria,
                        p.TipoInteres,
                        p.ActualizoUbicacion,
                        Detalles = p.Ventas_Electrodomesticos_Pagos_Detalle
                            .Select(d => new
                            {
                                d.Id,
                                d.IdPago,
                                d.IdCuota,
                                d.ImporteAplicado
                            })
                            .ToList()
                    })
                    .ToList();

                /* ================= HISTORIAL ================= */
                vm.Historial = v.Ventas_Electrodomesticos_Historial
                    .OrderByDescending(h => h.FechaCambio)
                    .Select(h => new
                    {
                        h.Id,
                        h.IdVenta,
                        h.IdCuota,
                        h.UsuarioCambio,
                        h.FechaCambio,
                        h.Campo,
                        h.ValorAnterior,
                        h.ValorNuevo,
                        h.Observacion
                    })
                    .ToList();

                return vm;
            }
        }

        /* ===========================================================
         * REGISTRAR PAGO
         * =========================================================== */
        public static int RegistrarPago(VM_Ventas_Electrodomesticos_Pago m)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var venta = db.Ventas_Electrodomesticos
                        .Include(x => x.Ventas_Electrodomesticos_Cuotas)
                        .FirstOrDefault(x => x.Id == m.IdVenta);

                    if (venta == null)
                        throw new Exception("Venta inexistente");

                    venta.ObservacionCobro = "";
                    venta.EstadoCobro = 0;

                    // ===============================
                    // 🔒 RESTANTE TOTAL DE LA VENTA
                    // ===============================
                    decimal totalVenta = R2(venta.ImporteTotal);
                    decimal totalPagado = venta.Ventas_Electrodomesticos_Cuotas
                        .Sum(c => c.MontoPagado);

                    decimal restanteVenta = R2(totalVenta - totalPagado);

                    if (m.ImporteTotal <= 0)
                        throw new Exception("Importe inválido");

                    if (R2(m.ImporteTotal) > restanteVenta)
                        throw new Exception(
                            $"El importe del cobro ({m.ImporteTotal}) supera el saldo pendiente de la venta ({restanteVenta})"
                        );

                    // ===============================
                    // 💰 CREAR PAGO
                    // ===============================
                    var pago = new Ventas_Electrodomesticos_Pagos
                    {
                        IdVenta = venta.Id,
                        FechaPago = m.FechaPago,
                        MedioPago = m.MedioPago,
                        ImporteTotal = R2(m.ImporteTotal),
                        Observacion = m.Observacion,
                        UsuarioCreacion = m.UsuarioOperador,
                        FechaCreacion = DateTime.Now,

                        ClienteAusente = m.ClienteAusente,
                        Imagen = m.Imagen,
                        IdCuentaBancaria = m.IdCuentaBancaria,
                        TipoInteres = m.TipoInteres,
                        ActualizoUbicacion = m.ActualizoUbicacion
                    };

                    db.Ventas_Electrodomesticos_Pagos.Add(pago);
                    db.SaveChanges();

                    // ===============================
                    // 🔁 APLICAR EN CASCADA
                    // ===============================
                    decimal montoDisponible = R2(m.ImporteTotal);

                    var cuotasPendientes = venta.Ventas_Electrodomesticos_Cuotas
                        .Where(c => c.MontoRestante > 0)
                        .OrderBy(c => c.NumeroCuota)
                        .ToList();

                    foreach (var cuota in cuotasPendientes)
                    {
                        if (montoDisponible <= 0)
                            break;

                        decimal restanteCuota =
                            (cuota.MontoOriginal + cuota.MontoRecargos - cuota.MontoDescuentos)
                            - cuota.MontoPagado;

                        if (restanteCuota <= 0)
                            continue;

                        decimal aplicar = Math.Min(restanteCuota, montoDisponible);

                        // 🔹 detalle
                        db.Ventas_Electrodomesticos_Pagos_Detalle.Add(
                            new Ventas_Electrodomesticos_Pagos_Detalle
                            {
                                IdPago = pago.Id,
                                IdCuota = cuota.Id,
                                ImporteAplicado = R2(aplicar)
                            });

                        var pagAnt = cuota.MontoPagado;

                        cuota.MontoPagado = R2(cuota.MontoPagado + aplicar);
                        cuota.MontoRestante = R2(
                            (cuota.MontoOriginal + cuota.MontoRecargos - cuota.MontoDescuentos)
                            - cuota.MontoPagado
                        );

                        cuota.Estado = cuota.MontoRestante > 0 ? "Pendiente" : "Pagada";
                        cuota.UsuarioModificacion = m.UsuarioOperador;
                        cuota.FechaModificacion = DateTime.Now;
                        cuota.TransferenciaPendiente = 0;
                        cuota.CobroPendiente = 0;

                        Audit(
                            db,
                            venta.Id,
                            cuota.Id,
                            m.UsuarioOperador,
                            "PagoCuota",
                            $"Antes={pagAnt}",
                            $"Ahora={cuota.MontoPagado}",
                            $"Pago #{pago.Id} | Aplicado={aplicar}"
                        );

                        montoDisponible -= aplicar;
                    }

                    if (montoDisponible > 0)
                        throw new Exception("Error interno: el pago no se aplicó completamente");

                    // ===============================
                    // 🔄 REESTADO VENTA
                    // ===============================
                    RecalcularEstadoVenta(db, venta, m.UsuarioOperador);

                    Audit(
                        db,
                        venta.Id,
                        null,
                        m.UsuarioOperador,
                        "RegistrarPago",
                        null,
                        $"Pago #{pago.Id} por {pago.ImporteTotal}",
                        $"Cuenta={m.IdCuentaBancaria} | ClienteAusente={m.ClienteAusente}"
                    );

                    db.SaveChanges();
                    tx.Commit();

                    return pago.Id;
                }
                catch
                {
                    tx.Rollback();
                    throw;
                }
            }
        }


        /* ===========================================================
         * EDITAR CUOTA INDIVIDUAL
         * =========================================================== */
        public static void EditarCuota(int idCuota, DateTime? nuevaFecha,
            decimal? nuevoMontoOriginal, int usuario)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var c = db.Ventas_Electrodomesticos_Cuotas
                        .Include(x => x.Ventas_Electrodomesticos)
                        .FirstOrDefault(x => x.Id == idCuota);

                    if (c == null)
                        throw new Exception("Cuota inexistente");

                    if (nuevaFecha.HasValue)
                        c.FechaVencimiento = nuevaFecha.Value.Date;

                    if (nuevoMontoOriginal.HasValue)
                        c.MontoOriginal = R2(nuevoMontoOriginal.Value);

                    var total = c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos;
                    c.MontoRestante = R2(total - c.MontoPagado);
                    c.Estado = c.MontoRestante > 0 ? "Pendiente" : "Pagada";

                    c.UsuarioModificacion = usuario;
                    c.FechaModificacion = DateTime.Now;

                    Audit(db, c.IdVenta, c.Id, usuario,
                        "EditarCuota", null, null);

                    RecalcularEstadoVenta(db, c.Ventas_Electrodomesticos, usuario);

                    db.SaveChanges();
                    tx.Commit();
                }
                catch
                {
                    tx.Rollback();
                    throw;
                }
            }
        }

        /* ===========================================================
         * RECARGO / DESCUENTO (LEGACY)
         * =========================================================== */
        public static void ActualizarRecargoDescuentoCuota(int idCuota,
            decimal? recargo, decimal? descuento, int usuario)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var c = db.Ventas_Electrodomesticos_Cuotas
                        .Include(x => x.Ventas_Electrodomesticos)
                        .FirstOrDefault(x => x.Id == idCuota);

                    if (c == null)
                        throw new Exception("Cuota inexistente");

                    // Ya no se usa descuento "on the fly" desde ajustes nuevos.
                    // Este método queda por compatibilidad.
                    if (recargo.HasValue)
                        c.MontoRecargos = R2(recargo.Value);

                    var total = c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos;
                    c.MontoRestante = R2(total - c.MontoPagado);
                    c.Estado = c.MontoRestante > 0 ? "Pendiente" : "Pagada";

                    c.UsuarioModificacion = usuario;
                    c.FechaModificacion = DateTime.Now;

                    Audit(db, c.IdVenta, c.Id, usuario,
                        "Recargo/Descuento (legacy)", null, null);

                    RecalcularEstadoVenta(db, c.Ventas_Electrodomesticos, usuario);

                    db.SaveChanges();
                    tx.Commit();
                }
                catch
                {
                    tx.Rollback();
                    throw;
                }
            }
        }

        /* ===========================================================
         * NUEVOS MÉTODOS: RECARGOS CUOTAS (MULTIPLES)
         * =========================================================== */

        public static int AgregarRecargoCuota(VM_Ventas_Electrodomesticos_RecargoCuota m)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var cuota = db.Ventas_Electrodomesticos_Cuotas
                        .Include(c => c.Ventas_Electrodomesticos)
                        .FirstOrDefault(c => c.Id == m.IdCuota);

                    if (cuota == null)
                        throw new Exception("Cuota inexistente");

                    var tipo = (m.Tipo ?? "").Trim();
                    if (tipo != "Fijo" && tipo != "Porcentaje")
                        throw new Exception("Tipo de recargo inválido. Debe ser 'Fijo' o 'Porcentaje'.");

                    var baseCalculo = cuota.MontoOriginal;
                    decimal importeCalc;

                    if (tipo == "Fijo")
                    {
                        importeCalc = R2(m.Valor);
                    }
                    else // Porcentaje
                    {
                        importeCalc = R2(baseCalculo * m.Valor / 100m);
                    }

                    var rec = new Ventas_Electrodomesticos_Cuotas_Recargos
                    {
                        IdCuota = cuota.Id,
                        Fecha = m.Fecha ?? DateTime.Now,
                        Tipo = tipo,
                        Valor = R2(m.Valor),
                        ImporteCalculado = importeCalc,
                        Observacion = m.Observacion,
                        UsuarioCreacion = m.UsuarioOperador,
                        FechaCreacion = DateTime.Now
                    };

                    db.Ventas_Electrodomesticos_Cuotas_Recargos.Add(rec);
                    db.SaveChanges();

                    // Recalcular MontoRecargos acumulado
                    var totalRecargos = db.Ventas_Electrodomesticos_Cuotas_Recargos
                        .Where(r => r.IdCuota == cuota.Id)
                        .Select(r => r.ImporteCalculado)
                        .DefaultIfEmpty(0m)
                        .Sum();

                    cuota.MontoRecargos = R2(totalRecargos);

                    var total = cuota.MontoOriginal + cuota.MontoRecargos - cuota.MontoDescuentos;
                    cuota.MontoRestante = R2(total - cuota.MontoPagado);
                    cuota.Estado = cuota.MontoRestante > 0 ? "Pendiente" : "Pagada";
                    cuota.UsuarioModificacion = m.UsuarioOperador;
                    cuota.FechaModificacion = DateTime.Now;

                    Audit(db, cuota.IdVenta, cuota.Id, m.UsuarioOperador,
                        "RecargoCuota",
                        null,
                        $"Tipo={tipo}; Valor={m.Valor}; Importe={importeCalc}",
                        m.Observacion);

                    RecalcularEstadoVenta(db, cuota.Ventas_Electrodomesticos, m.UsuarioOperador);

                    db.SaveChanges();
                    tx.Commit();

                    return rec.Id;
                }
                catch
                {
                    tx.Rollback();
                    throw;
                }
            }
        }

        public static string EliminarRecargoCuota(int idRecargo, int usuario)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var rec = db.Ventas_Electrodomesticos_Cuotas_Recargos
                        .Include(r => r.Ventas_Electrodomesticos_Cuotas.Ventas_Electrodomesticos)
                        .FirstOrDefault(r => r.Id == idRecargo);

                    if (rec == null)
                        return "Recargo no encontrado";

                    var cuota = rec.Ventas_Electrodomesticos_Cuotas;
                    var venta = cuota.Ventas_Electrodomesticos;

                    var infoAnt = $"Tipo={rec.Tipo}; Valor={rec.Valor}; Importe={rec.ImporteCalculado}";

                    db.Ventas_Electrodomesticos_Cuotas_Recargos.Remove(rec);
                    db.SaveChanges();

                    var totalRecargos = db.Ventas_Electrodomesticos_Cuotas_Recargos
                        .Where(r => r.IdCuota == cuota.Id)
                        .Select(r => r.ImporteCalculado)
                        .DefaultIfEmpty(0m)
                        .Sum();

                    cuota.MontoRecargos = R2(totalRecargos);

                    var total = cuota.MontoOriginal + cuota.MontoRecargos - cuota.MontoDescuentos;
                    cuota.MontoRestante = R2(total - cuota.MontoPagado);
                    cuota.Estado = cuota.MontoRestante > 0 ? "Pendiente" : "Pagada";
                    cuota.UsuarioModificacion = usuario;
                    cuota.FechaModificacion = DateTime.Now;

                    Audit(db, cuota.IdVenta, cuota.Id, usuario,
                        "EliminarRecargoCuota",
                        infoAnt,
                        $"RecargosTotales={cuota.MontoRecargos}",
                        "Se eliminó un recargo individual");

                    RecalcularEstadoVenta(db, venta, usuario);

                    db.SaveChanges();
                    tx.Commit();

                    return "OK";
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    return "Error al eliminar recargo: " + ex.Message;
                }
            }
        }

        /* ===========================================================
         * ELIMINAR VENTA
         * =========================================================== */
        public static string EliminarVenta(int idVenta, int usuario)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var venta = db.Ventas_Electrodomesticos
                        .Include(v => v.Ventas_Electrodomesticos_Detalle)
                        .Include(v => v.Ventas_Electrodomesticos_Cuotas
                            .Select(c => c.Ventas_Electrodomesticos_Cuotas_Recargos))
                        .Include(v => v.Ventas_Electrodomesticos_Pagos)
                        .FirstOrDefault(v => v.Id == idVenta);

                    if (venta == null)
                        return "Venta no encontrada";

                    if (venta.Ventas_Electrodomesticos_Pagos.Any())
                        return "No se puede eliminar: la venta tiene pagos";

                    /* ===============================
                     * 1️⃣ DEVOLVER STOCK
                     * =============================== */
                    foreach (var det in venta.Ventas_Electrodomesticos_Detalle)
                    {
                        // 🔼 STOCK GENERAL
                        var prod = db.Productos.First(p => p.Id == det.IdProducto);
                        prod.Stock += (int?)det.Cantidad;
                        db.Entry(prod).State = EntityState.Modified;

                        // 🔼 STOCK USUARIO
                        var stockUser = db.StockUsuarios.FirstOrDefault(s =>
                            s.IdUsuario == venta.IdVendedor &&
                            s.IdProducto == det.IdProducto);

                        if (stockUser != null)
                        {
                            stockUser.Cantidad += (int)det.Cantidad;
                            db.Entry(stockUser).State = EntityState.Modified;
                        }
                        else
                        {
                            db.StockUsuarios.Add(new StockUsuarios
                            {
                                IdUsuario = venta.IdVendedor,
                                IdProducto = (int)det.IdProducto,
                                Cantidad = (int)det.Cantidad
                            });
                        }
                    }

                    /* ===============================
                     * 2️⃣ ELIMINAR RECARGOS DE CUOTAS
                     * =============================== */
                    foreach (var cuota in venta.Ventas_Electrodomesticos_Cuotas)
                    {
                        if (cuota.Ventas_Electrodomesticos_Cuotas_Recargos.Any())
                        {
                            db.Ventas_Electrodomesticos_Cuotas_Recargos
                                .RemoveRange(cuota.Ventas_Electrodomesticos_Cuotas_Recargos);
                        }
                    }

                    /* ===============================
                     * 3️⃣ ELIMINAR CUOTAS
                     * =============================== */
                    db.Ventas_Electrodomesticos_Cuotas
                        .RemoveRange(venta.Ventas_Electrodomesticos_Cuotas);

                    /* ===============================
                     * 4️⃣ ELIMINAR DETALLE
                     * =============================== */
                    db.Ventas_Electrodomesticos_Detalle
                        .RemoveRange(venta.Ventas_Electrodomesticos_Detalle);

                    /* ===============================
                     * 5️⃣ AUDITORÍA
                     * =============================== */
                    Audit(
                        db,
                        venta.Id,
                        null,
                        usuario,
                        "EliminarVenta",
                        venta.Estado,
                        "Eliminada",
                        "Eliminación total con devolución de stock"
                    );

                    /* ===============================
                     * 6️⃣ ELIMINAR VENTA
                     * =============================== */
                    db.Ventas_Electrodomesticos.Remove(venta);

                    db.SaveChanges();
                    tx.Commit();

                    return "Venta eliminada con éxito";
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    return "Error al eliminar venta: " + ex.Message;
                }
            }
        }



        /* ===========================================================
         * EDITAR VENTA (SIN RESTRICCIONES DEL BACKEND)
         * =========================================================== */
        public static string EditarVenta(VM_Ventas_Electrodomesticos_Crear m)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var venta = db.Ventas_Electrodomesticos
                        .Include(x => x.Ventas_Electrodomesticos_Detalle)
                        .Include(x => x.Ventas_Electrodomesticos_Cuotas)
                        .FirstOrDefault(x => x.Id == m.IdVenta);

                    if (venta == null)
                        return "Venta no encontrada";

                    venta.FechaVenta = m.FechaVenta;
                    venta.Observacion = m.Observacion;
                    venta.IdVendedor = m.IdVendedor;
                    venta.FranjaHoraria = m.FranjaHoraria;
                    venta.Turno = m.Turno;

                    venta.UsuarioModificacion = m.UsuarioOperador;
                    venta.FechaModificacion = DateTime.Now;

                    db.SaveChanges();
                    tx.Commit();

                    return "OK";
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    return "Error al modificar: " + ex.Message;
                }
            }
        }


        /* ===========================================================
 * LISTAR COBROS PENDIENTES
 * (MISMAS COLUMNAS QUE COBROS, SIN FILTROS)
 * =========================================================== */
        public static List<VM_Ventas_Electrodomesticos_CuotaCobroRow>
        ListarCobrosPendientes(VM_Ventas_Electrodomesticos_FiltroCobros f)
        {
            using (var db = new Sistema_DavidEntities())
            {
                var q =
                    from c in db.Ventas_Electrodomesticos_Cuotas
                    join v in db.Ventas_Electrodomesticos
                        on c.IdVenta equals v.Id
                    join cli in db.Clientes
                        on v.IdCliente equals cli.Id
                    join z in db.Zonas
                        on cli.IdZona equals z.Id into zonasJoin
                    from z in zonasJoin.DefaultIfEmpty()
                    join u in db.Usuarios
                        on v.IdVendedor equals u.Id into vendedoresJoin
                    from u in vendedoresJoin.DefaultIfEmpty()
                    where c.CobroPendiente == 1
                    select new
                    {
                        Cuota = c,
                        Venta = v,
                        Cliente = cli,
                        Zona = z,
                        Vendedor = u
                    };

                // 👉 filtros MINIMOS que ya usabas
                if (f.IdCliente.HasValue && f.IdCliente.Value > 0)
                    q = q.Where(x => x.Venta.IdCliente == f.IdCliente.Value);

                if (f.IdVendedor.HasValue && f.IdVendedor.Value > 0)
                    q = q.Where(x => x.Venta.IdVendedor == f.IdVendedor.Value);



                var rows = q
                    .ToList()
                    .Select(x => new VM_Ventas_Electrodomesticos_CuotaCobroRow
                    {
                        IdCuota = x.Cuota.Id,
                        IdVenta = x.Cuota.IdVenta,
                        NumeroCuota = x.Cuota.NumeroCuota,

                        FechaVencimiento = x.Cuota.FechaVencimiento,
                        FechaCobro = (DateTime)x.Cuota.FechaCobro,

                        TotalCuota = R2(
                            x.Cuota.MontoOriginal +
                            x.Cuota.MontoRecargos -
                            x.Cuota.MontoDescuentos
                        ),

                        MontoPagado = R2(x.Cuota.MontoPagado),

                        MontoRestante = R2(
                            (x.Cuota.MontoOriginal +
                             x.Cuota.MontoRecargos -
                             x.Cuota.MontoDescuentos) -
                            x.Cuota.MontoPagado
                        ),

                        Estado = x.Cuota.Estado,

                        // ===== CLIENTE =====
                        IdCliente = x.Venta.IdCliente,
                        ClienteNombre = (x.Cliente.Nombre + " " + x.Cliente.Apellido).Trim(),
                        ClienteDireccion = x.Cliente.Direccion,
                        ClienteLatitud = x.Cliente.Latitud,
                        ClienteLongitud = x.Cliente.Longitud,

                        // ===== ZONA =====
                        IdZona = x.Cliente.IdZona,
                        ZonaNombre = x.Zona != null ? x.Zona.Nombre : null,

                        // ===== VENDEDOR =====
                        IdVendedor = x.Venta.IdVendedor,
                        VendedorNombre = x.Vendedor != null ? x.Vendedor.Nombre : null,

                        // ===== TURNO / FRANJA =====
                        Turno = x.Venta.Turno,
                        FranjaHoraria = x.Venta.FranjaHoraria
                    })
                    .OrderBy(r => r.FechaVencimiento)
                    .ThenBy(r => r.NumeroCuota)
                    .ToList();

                return rows;
            }
        }

        public static List<VM_Ventas_Electrodomesticos_CuotaCobroRow>
      ListarTransferenciasPendientes(VM_Ventas_Electrodomesticos_FiltroCobros f)
        {
            using (var db = new Sistema_DavidEntities())
            {
                var q =
                    from c in db.Ventas_Electrodomesticos_Cuotas
                    join v in db.Ventas_Electrodomesticos
                        on c.IdVenta equals v.Id
                    join cli in db.Clientes
                        on v.IdCliente equals cli.Id
                    join z in db.Zonas
                        on cli.IdZona equals z.Id into zonasJoin
                    from z in zonasJoin.DefaultIfEmpty()
                    join u in db.Usuarios
                        on v.IdVendedor equals u.Id into vendedoresJoin
                    from u in vendedoresJoin.DefaultIfEmpty()
                    where c.TransferenciaPendiente == 1
                    select new
                    {
                        Cuota = c,
                        Venta = v,
                        Cliente = cli,
                        Zona = z,
                        Vendedor = u
                    };

                // 👉 filtros MINIMOS que ya usabas
                if (f.IdCliente.HasValue && f.IdCliente.Value > 0)
                    q = q.Where(x => x.Venta.IdCliente == f.IdCliente.Value);

                if (f.IdVendedor.HasValue && f.IdVendedor.Value > 0)
                    q = q.Where(x => x.Venta.IdVendedor == f.IdVendedor.Value);

                var rows = q
                    .ToList()
                    .Select(x => new VM_Ventas_Electrodomesticos_CuotaCobroRow
                    {
                        IdCuota = x.Cuota.Id,
                        IdVenta = x.Cuota.IdVenta,
                        NumeroCuota = x.Cuota.NumeroCuota,

                        FechaVencimiento = x.Cuota.FechaVencimiento,
                        FechaCobro = (DateTime)x.Cuota.FechaCobro,

                        TotalCuota = R2(
                            x.Cuota.MontoOriginal +
                            x.Cuota.MontoRecargos -
                            x.Cuota.MontoDescuentos
                        ),

                        MontoPagado = R2(x.Cuota.MontoPagado),

                        MontoRestante = R2(
                            (x.Cuota.MontoOriginal +
                             x.Cuota.MontoRecargos -
                             x.Cuota.MontoDescuentos) -
                            x.Cuota.MontoPagado
                        ),

                        Estado = x.Cuota.Estado,

                        // ===== CLIENTE =====
                        IdCliente = x.Venta.IdCliente,
                        ClienteNombre = (x.Cliente.Nombre + " " + x.Cliente.Apellido).Trim(),
                        ClienteDireccion = x.Cliente.Direccion,
                        ClienteLatitud = x.Cliente.Latitud,
                        ClienteLongitud = x.Cliente.Longitud,

                        // ===== ZONA =====
                        IdZona = x.Cliente.IdZona,
                        ZonaNombre = x.Zona != null ? x.Zona.Nombre : null,

                        // ===== VENDEDOR =====
                        IdVendedor = x.Venta.IdVendedor,
                        VendedorNombre = x.Vendedor != null ? x.Vendedor.Nombre : null,

                        // ===== TURNO / FRANJA =====
                        Turno = x.Venta.Turno,
                        FranjaHoraria = x.Venta.FranjaHoraria
                    })
                    .OrderBy(r => r.FechaVencimiento)
                    .ThenBy(r => r.NumeroCuota)
                    .ToList();

                return rows;
            }
        }






        public static string MarcarCobroPendienteResuelto(int idCuota, int usuario)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var cuota = db.Ventas_Electrodomesticos_Cuotas
                        .FirstOrDefault(c => c.Id == idCuota);

                    if (cuota == null)
                        return "Cuota no encontrada";

                    cuota.CobroPendiente = 0;
                    cuota.UsuarioModificacion = usuario;
                    cuota.FechaModificacion = DateTime.Now;

                    Audit(
                        db,
                        cuota.IdVenta,
                        cuota.Id,
                        usuario,
                        "CobroPendiente",
                        "1",
                        "0",
                        "Cobro pendiente resuelto"
                    );

                    db.SaveChanges();
                    tx.Commit();
                    return "OK";
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    return "Error: " + ex.Message;
                }
            }
        }


        public static string MarcarTransferenciaPendiente(int estado, int idCuota, int usuario)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var cuota = db.Ventas_Electrodomesticos_Cuotas
                        .FirstOrDefault(c => c.Id == idCuota);

                    if (cuota == null)
                        return "Cuota no encontrada";

                    cuota.TransferenciaPendiente = estado;
                    cuota.UsuarioModificacion = usuario;
                    cuota.FechaModificacion = DateTime.Now;

                    Audit(
                        db,
                        cuota.IdVenta,
                        cuota.Id,
                        usuario,
                        "Transferencia Pendiente",
                        "1",
                        "0",
                        "Transferencia Pendiente"
                    );

                    db.SaveChanges();
                    tx.Commit();
                    return "OK";
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    return "Error: " + ex.Message;
                }
            }
        }

        /* ===========================================================
         * LISTAR CUOTAS A COBRAR
         * =========================================================== */
        public static List<VM_Ventas_Electrodomesticos_CuotaCobroRow>
        ListarCuotasACobrar(VM_Ventas_Electrodomesticos_FiltroCobros f)
        {
            using (var db = new Sistema_DavidEntities())
            {
                var q =
                    from c in db.Ventas_Electrodomesticos_Cuotas
                    join v in db.Ventas_Electrodomesticos
                        on c.IdVenta equals v.Id
                    join cli in db.Clientes
                        on v.IdCliente equals cli.Id
                    join z in db.Zonas
                        on cli.IdZona equals z.Id into zonasJoin
                    from z in zonasJoin.DefaultIfEmpty()
                    join u in db.Usuarios
                        on v.IdVendedor equals u.Id into vendedoresJoin
                    from u in vendedoresJoin.DefaultIfEmpty()
                    where c.CobroPendiente <= 0 && c.TransferenciaPendiente <= 0
                    select new
                    {
                        Cuota = c,
                        Venta = v,
                        Cliente = cli,
                        Zona = z,
                        Vendedor = u
                    };

                var desde = f.FechaDesde?.Date;
                var hasta = f.FechaHasta?.Date;

                /* =========================
                   FILTRO POR FECHA DE COBRO
                ========================= */
                if (desde.HasValue)
                    q = q.Where(x =>
                        DbFunctions.TruncateTime(x.Cuota.FechaCobro) >= desde.Value);

                if (hasta.HasValue)
                    q = q.Where(x =>
                        DbFunctions.TruncateTime(x.Cuota.FechaCobro) <= hasta.Value);

                if (f.IdCliente.HasValue && f.IdCliente.Value > 0)
                    q = q.Where(x =>
                        x.Venta.IdCliente == f.IdCliente.Value);

                if (f.IdVendedor.HasValue && f.IdVendedor.Value > 0)
                    q = q.Where(x =>
                        x.Venta.IdVendedor == f.IdVendedor.Value );

                /* =========================
                   FILTROS NUEVOS
                ========================= */
                if (f.IdZona.HasValue && f.IdZona.Value > 0)
                    q = q.Where(x =>
                        x.Cliente.IdZona == f.IdZona.Value);

                if (!string.IsNullOrWhiteSpace(f.Turno))
                    q = q.Where(x =>
                        x.Venta.Turno == f.Turno);

                if (!string.IsNullOrWhiteSpace(f.FranjaHoraria))
                    q = q.Where(x =>
                        x.Venta.FranjaHoraria == f.FranjaHoraria);

                /* =========================
                   ESTADO CUOTA
                ========================= */
                if (!string.IsNullOrEmpty(f.EstadoCuota))
                {
                    if (f.EstadoCuota == "Vencida")
                    {
                        var hoy = DateTime.Today;

                        q = q.Where(x =>
                            x.Cuota.Estado != "Pagada" &&
                            DbFunctions.TruncateTime(x.Cuota.FechaCobro) < hoy);
                    }
                    else
                    {
                        q = q.Where(x => x.Cuota.Estado == f.EstadoCuota);
                    }
                }


                q = q.Where(x =>
                     x.Venta.IdCobrador == f.IdVendedor.Value);


                var rows = q
                    .ToList()
                    .Select(x => new VM_Ventas_Electrodomesticos_CuotaCobroRow
                    {
                        IdCuota = x.Cuota.Id,
                        IdVenta = x.Cuota.IdVenta,
                        NumeroCuota = x.Cuota.NumeroCuota,

                        FechaVencimiento = x.Cuota.FechaVencimiento,
                        FechaCobro = x.Cuota.FechaCobro,

                        TotalCuota = R2(
                            x.Cuota.MontoOriginal +
                            x.Cuota.MontoRecargos -
                            x.Cuota.MontoDescuentos
                        ),

                        MontoPagado = R2(x.Cuota.MontoPagado),

                        MontoRestante = R2(
                            (x.Cuota.MontoOriginal +
                             x.Cuota.MontoRecargos -
                             x.Cuota.MontoDescuentos) -
                            x.Cuota.MontoPagado
                        ),

                        Estado = x.Cuota.Estado,

                        IdCliente = x.Venta.IdCliente,
                        ClienteNombre = (x.Cliente.Nombre + " " + x.Cliente.Apellido).Trim(),

                        IdVendedor = x.Venta.IdVendedor,
                        VendedorNombre = x.Vendedor != null ? x.Vendedor.Nombre : null,

                        // 🔥 ZONA / DIRECCIÓN / MAPA
                        IdZona = x.Cliente.IdZona,
                        ZonaNombre = x.Zona != null ? x.Zona.Nombre : null,

                        ClienteDireccion = x.Cliente.Direccion,
                        ClienteLatitud = x.Cliente.Latitud,
                        ClienteLongitud = x.Cliente.Longitud,

                        // 🔥 TURNO / FRANJA
                        Turno = x.Venta.Turno,
                        FranjaHoraria = x.Venta.FranjaHoraria,

                        EstadoCobro = x.Venta.EstadoCobro ?? 0,
                        ObservacionCobro = x.Venta.ObservacionCobro,
                    })
                    .OrderBy(r => r.FechaVencimiento)
                    .ThenBy(r => r.NumeroCuota)
                    .ToList();

                return rows;
            }
        }



        public static string ReprogramarCobroCuota(int idCuota, DateTime nuevaFecha, int usuario, string observacion)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var cuota = db.Ventas_Electrodomesticos_Cuotas
                        .Include(c => c.Ventas_Electrodomesticos)
                        .FirstOrDefault(c => c.Id == idCuota);

                    if (cuota == null)
                        return "Cuota no encontrada";

                    var fechaAnterior = cuota.FechaCobro;

                    cuota.FechaCobro = nuevaFecha.Date;
                    cuota.CobroPendiente = 1;
                    cuota.UsuarioModificacion = usuario;
                    cuota.FechaModificacion = DateTime.Now;

                    Audit(
                         db,
                         cuota.IdVenta,
                         cuota.Id,
                         usuario,
                         "ReprogramarCobro",
                         fechaAnterior?.ToString("dd/MM/yyyy") ?? "(sin fecha)",
                         nuevaFecha.ToString("dd/MM/yyyy"),
                         string.IsNullOrWhiteSpace(observacion)
                             ? "Cobro pendiente"
                             : observacion
                     );

                    db.SaveChanges();
                    tx.Commit();
                    return "OK";
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    return "Error al reprogramar cobro: " + ex.Message;
                }
            }
        }

        private static string NormalizarTurno(string turno)
        {
            if (string.IsNullOrWhiteSpace(turno)) return null;

            turno = turno.Trim().ToLower();
            if (turno.StartsWith("m")) return "M";
            if (turno.StartsWith("t")) return "T";

            return turno.ToUpper();
        }



        /* ===========================================================
 * ASIGNAR COBRADOR A VENTA (INDIVIDUAL)
 * =========================================================== */
        public static string AsignarCobradorVenta(int idVenta, int idCobrador, int usuarioOperador, string obs = null)
        {
            if (idVenta <= 0) return "Venta inválida";
            if (idCobrador <= 0) return "Cobrador inválido";

            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var venta = db.Ventas_Electrodomesticos.FirstOrDefault(v => v.Id == idVenta);
                    if (venta == null) return "Venta no encontrada";

                    var cobrador = db.Usuarios.FirstOrDefault(u => u.Id == idCobrador);
                    if (cobrador == null) return "Cobrador no encontrado";

                    var anterior = venta.IdCobrador.HasValue ? venta.IdCobrador.Value.ToString() : "(sin)";

                    if (!venta.IdCobrador.HasValue || venta.IdCobrador.Value != idCobrador)
                    {
                        venta.IdCobrador = idCobrador;
                        venta.UsuarioModificacion = usuarioOperador;
                        venta.FechaModificacion = DateTime.Now;

                        Audit(
                            db,
                            venta.Id,
                            null,
                            usuarioOperador,
                            "AsignarCobradorVenta",
                            anterior,
                            idCobrador.ToString(),
                            string.IsNullOrWhiteSpace(obs)
                                ? $"Asignado cobrador={cobrador.Nombre}"
                                : obs
                        );

                        db.SaveChanges();
                    }

                    tx.Commit();
                    return "OK";
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    return "Error al asignar cobrador: " + ex.Message;
                }
            }
        }

        /* ===========================================================
 * ASIGNAR COBRADOR A VENTAS (MASIVO)
 * =========================================================== */
        public static string AsignarCobradorVentas(int idCobrador, List<int> idsVentas, int usuarioOperador, string obs = null)
        {
            if (idCobrador <= 0) return "Cobrador inválido";
            if (idsVentas == null || idsVentas.Count == 0) return "No hay ventas seleccionadas";

            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var cobrador = db.Usuarios.FirstOrDefault(u => u.Id == idCobrador);
                    if (cobrador == null) return "Cobrador no encontrado";

                    var ventas = db.Ventas_Electrodomesticos
                        .Where(v => idsVentas.Contains(v.Id))
                        .ToList();

                    if (ventas.Count == 0) return "No se encontraron ventas";

                    foreach (var v in ventas)
                    {
                        var anterior = v.IdCobrador.HasValue ? v.IdCobrador.Value.ToString() : "(sin)";

                        if (!v.IdCobrador.HasValue || v.IdCobrador.Value != idCobrador)
                        {
                            v.IdCobrador = idCobrador;
                            v.UsuarioModificacion = usuarioOperador;
                            v.FechaModificacion = DateTime.Now;

                            Audit(
                                db,
                                v.Id,
                                null,
                                usuarioOperador,
                                "AsignarCobradorVenta",
                                anterior,
                                idCobrador.ToString(),
                                string.IsNullOrWhiteSpace(obs)
                                    ? $"Asignado cobrador={cobrador.Nombre}"
                                    : obs
                            );
                        }
                    }

                    db.SaveChanges();
                    tx.Commit();
                    return "OK";
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    return "Error al asignar cobrador: " + ex.Message;
                }
            }
        }

        public static string GuardarObservacionCobro(int idVenta, string observacion, int usuario)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var venta = db.Ventas_Electrodomesticos.FirstOrDefault(v => v.Id == idVenta);
                    if (venta == null) return "Venta no encontrada";

                    var obsNueva = (observacion ?? "").Trim();

                    // setear
                    venta.EstadoCobro = 1;
                    venta.ObservacionCobro = obsNueva;
                    venta.UsuarioModificacion = usuario;
                    venta.FechaModificacion = DateTime.Now;

                    // si querés auditar (si tenés Audit accesible acá)
                    Audit(db, venta.Id, null, usuario, "EstadoCobro", null, "1", "ObsCobro");
                    Audit(db, venta.Id, null, usuario, "ObservacionCobro", null, obsNueva);

                    db.SaveChanges();
                    tx.Commit();
                    return "OK";
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    return "Error: " + ex.Message;
                }
            }
        }


    }
}
