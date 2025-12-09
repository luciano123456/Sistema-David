using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Globalization;
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
        public static VM_HistorialVentasResp ListarHistorial(DateTime? desde, DateTime? hasta, string estado)
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

                var ventas = q.ToList();
                var rows = new List<VM_HistorialVentasRow>();

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
                        Pagado = cuotas.Sum(c => c.MontoPagado),
                        Pendiente = cuotas.Sum(c =>
                            (c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos) - c.MontoPagado),
                        PorcentajePago =
                            cuotas.Sum(c => (c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos)) == 0
                                ? 100
                                : (cuotas.Sum(c => c.MontoPagado)
                                    / cuotas.Sum(c => (c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos)))
                                * 100,
                        CuotasVencidas = cuotas.Count(c =>
                            c.Estado != "Pagada" && c.FechaVencimiento < DateTime.Now),
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
                    decimal entrega = m.Entrega ?? 0;
                    decimal restante = Math.Max(0, m.ImporteTotal - entrega);

                    var venta = new Ventas_Electrodomesticos
                    {
                        FechaVenta = m.FechaVenta,
                        IdCliente = m.IdCliente,
                        IdVendedor = m.IdVendedor,
                        ImporteTotal = R2(m.ImporteTotal),
                        ImporteInteres = 0,
                        ImporteRecargos = R2(m.RecargoFijo ?? 0),
                        ImporteDescuentos = R2(m.DescuentoFijo ?? 0),
                        FormaCuotas = m.FormaCuotas,
                        CantidadCuotas = m.CantidadCuotas,
                        FechaVencimiento = m.FechaVencimiento,
                        Estado = "Activa",
                        Entrega = R2(entrega),
                        Restante = R2(restante),
                        Observacion = m.Observacion,
                        UsuarioCreacion = m.UsuarioOperador,
                        FechaCreacion = DateTime.Now
                    };

                    db.Ventas_Electrodomesticos.Add(venta);
                    db.SaveChanges();

                    /* ITEMS */
                    foreach (var it in m.Items)
                    {
                        db.Ventas_Electrodomesticos_Detalle.Add(new Ventas_Electrodomesticos_Detalle
                        {
                            IdVenta = venta.Id,
                            IdProducto = it.IdProducto,
                            Producto = it.Producto,
                            Cantidad = it.Cantidad,
                            PrecioUnitario = it.PrecioUnitario,
                            Subtotal = it.Subtotal
                        });
                    }
                    db.SaveChanges();

                    /* CUOTAS */
                    foreach (var c in m.Cuotas)
                    {
                        decimal total = R2(c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos);

                        db.Ventas_Electrodomesticos_Cuotas.Add(new Ventas_Electrodomesticos_Cuotas
                        {
                            IdVenta = venta.Id,
                            NumeroCuota = c.NumeroCuota,
                            FechaVencimiento = c.FechaVencimiento,
                            MontoOriginal = R2(c.MontoOriginal),
                            MontoRecargos = R2(c.MontoRecargos),
                            MontoDescuentos = R2(c.MontoDescuentos),
                            MontoPagado = 0,
                            MontoRestante = total,
                            Estado = "Pendiente",
                            UsuarioCreacion = m.UsuarioOperador,
                            FechaCreacion = DateTime.Now
                        });
                    }

                    db.SaveChanges();

                    Audit(db, venta.Id, null, m.UsuarioOperador,
                        "CrearVenta", null,
                        $"Venta creada. Entrega={venta.Entrega}, Restante={venta.Restante}");

                    db.SaveChanges();
                    tx.Commit();

                    return venta.Id;
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    throw new Exception("Error al crear venta: " + ex.Message, ex);
                }
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
                    .Include(x => x.Ventas_Electrodomesticos_Cuotas)
                    .Include(x => x.Ventas_Electrodomesticos_Pagos.Select(p => p.Ventas_Electrodomesticos_Pagos_Detalle))
                    .Include(x => x.Ventas_Electrodomesticos_Historial)
                    .FirstOrDefault(x => x.Id == idVenta);

                if (v == null)
                    return null;

                var vm = new VM_Ventas_Electrodomesticos_Detalle
                {
                    // ================= CLIENTE =================
                    ClienteNombre = v.Clientes != null
                        ? ((v.Clientes.Nombre ?? "") + " " + (v.Clientes.Apellido ?? "")).Trim()
                        : null,
                    ClienteDireccion = v.Clientes?.Direccion,
                    ClienteTelefono = v.Clientes?.Telefono,
                    ClienteEstado = ClientesModel.InformacionCliente(v.IdCliente).Estado,
                    ClienteDNI = v.Clientes?.Dni,   // ajustá el nombre de campo si no es Dni

                    // ================= HEADER VENTA =================
                    IdVenta = v.Id,
                    FechaVenta = v.FechaVenta,
                    IdCliente = v.IdCliente,
                    IdVendedor = v.IdVendedor,
                    ImporteTotal = v.ImporteTotal,

                    ImporteInteres = v.ImporteInteres,
                    ImporteRecargos = v.ImporteRecargos,
                    ImporteDescuentos = v.ImporteDescuentos,

                    FormaCuotas = v.FormaCuotas,
                    CantidadCuotas = v.CantidadCuotas,
                    FechaVencimiento = v.FechaVencimiento,
                    Estado = v.Estado,
                    Observacion = v.Observacion,

                    Entrega = (decimal)v.Entrega,
                    Restante = (decimal)v.Restante
                };

                // ================= ITEMS =================
                vm.Items = v.Ventas_Electrodomesticos_Detalle
                    .Select(i => new VM_Ventas_Electrodomesticos_Item
                    {
                        IdProducto = i.IdProducto,
                        Producto = i.Producto,
                        Cantidad = i.Cantidad,
                        PrecioUnitario = i.PrecioUnitario
                        // Subtotal se calcula en la VM (Cantidad * PrecioUnitario)
                    })
                    .ToList();

                // ================= CUOTAS =================
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
                        MontoRestante = c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos - c.MontoPagado,
                        Estado = c.Estado
                    })
                    .ToList();

                // ================= PAGOS (obj genérico) =================
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

                // ================= HISTORIAL (obj genérico) =================
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

                    var pago = new Ventas_Electrodomesticos_Pagos
                    {
                        IdVenta = venta.Id,
                        FechaPago = m.FechaPago,
                        MedioPago = m.MedioPago,
                        ImporteTotal = R2(m.ImporteTotal),
                        Observacion = m.Observacion,
                        UsuarioCreacion = m.UsuarioOperador,
                        FechaCreacion = DateTime.Now
                    };

                    db.Ventas_Electrodomesticos_Pagos.Add(pago);
                    db.SaveChanges();

                    decimal totalAplicado = 0m;

                    foreach (var ap in m.Aplicaciones.OrderBy(x => x.IdCuota))
                    {
                        var cuota = db.Ventas_Electrodomesticos_Cuotas
                            .FirstOrDefault(x => x.Id == ap.IdCuota && x.IdVenta == venta.Id);

                        if (cuota == null)
                            throw new Exception($"Cuota {ap.IdCuota} no encontrada");

                        var restante = (cuota.MontoOriginal + cuota.MontoRecargos - cuota.MontoDescuentos)
                            - cuota.MontoPagado;

                        var aplicar = Math.Min(restante, ap.ImporteAplicado);

                        if (aplicar <= 0) continue;

                        db.Ventas_Electrodomesticos_Pagos_Detalle.Add(new Ventas_Electrodomesticos_Pagos_Detalle
                        {
                            IdPago = pago.Id,
                            IdCuota = cuota.Id,
                            ImporteAplicado = R2(aplicar)
                        });

                        var pagAnt = cuota.MontoPagado;
                        cuota.MontoPagado = R2(cuota.MontoPagado + aplicar);
                        cuota.MontoRestante = R2((cuota.MontoOriginal + cuota.MontoRecargos - cuota.MontoDescuentos)
                            - cuota.MontoPagado);

                        cuota.Estado = cuota.MontoRestante > 0 ? "Pendiente" : "Pagada";
                        cuota.UsuarioModificacion = m.UsuarioOperador;
                        cuota.FechaModificacion = DateTime.Now;

                        Audit(db, venta.Id, cuota.Id, m.UsuarioOperador,
                            "PagoCuota", $"Antes={pagAnt}", $"Ahora={cuota.MontoPagado}");

                        totalAplicado += aplicar;
                    }

                    if (totalAplicado <= 0)
                        throw new Exception("El pago no aplicó a ninguna cuota");

                    RecalcularEstadoVenta(db, venta, m.UsuarioOperador);

                    Audit(db, venta.Id, null, m.UsuarioOperador,
                        "RegistrarPago", null, $"Pago #{pago.Id} por {pago.ImporteTotal}");

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
         * RECARGO / DESCUENTO
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

                    if (recargo.HasValue) c.MontoRecargos = R2(recargo.Value);
                    if (descuento.HasValue) c.MontoDescuentos = R2(descuento.Value);

                    var total = c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos;
                    c.MontoRestante = R2(total - c.MontoPagado);
                    c.Estado = c.MontoRestante > 0 ? "Pendiente" : "Pagada";

                    c.UsuarioModificacion = usuario;
                    c.FechaModificacion = DateTime.Now;

                    Audit(db, c.IdVenta, c.Id, usuario,
                        "Recargo/Descuento", null, null);

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
         * ELIMINAR VENTA
         * =========================================================== */
        public static string EliminarVenta(int idVenta, int usuario)
        {
            using (var db = new Sistema_DavidEntities())
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    var v = db.Ventas_Electrodomesticos
                        .Include(x => x.Ventas_Electrodomesticos_Pagos)
                        .Include(x => x.Ventas_Electrodomesticos_Cuotas)
                        .Include(x => x.Ventas_Electrodomesticos_Detalle)
                        .FirstOrDefault(x => x.Id == idVenta);

                    if (v == null)
                        return "Venta no encontrada";

                    if (v.Ventas_Electrodomesticos_Pagos.Any())
                        return "No se puede eliminar: la venta tiene pagos";

                    db.Ventas_Electrodomesticos_Detalle.RemoveRange(v.Ventas_Electrodomesticos_Detalle);
                    db.Ventas_Electrodomesticos_Cuotas.RemoveRange(v.Ventas_Electrodomesticos_Cuotas);

                    Audit(db, v.Id, null, usuario,
                        "EliminarVenta", v.Estado, "Eliminada", "Eliminación total");

                    db.Ventas_Electrodomesticos.Remove(v);
                    db.SaveChanges();

                    tx.Commit();
                    return "Venta eliminada con éxito";
                }
                catch
                {
                    tx.Rollback();
                    throw;
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

                    // Como dijiste que NO se edita nada desde el frontend,
                    // solo actualizamos campos simples:

                    venta.FechaVenta = m.FechaVenta;
                    venta.Observacion = m.Observacion;
                    venta.IdVendedor = m.IdVendedor;

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
         * LISTAR CUOTAS A COBRAR
         * =========================================================== */
        public static List<VM_Ventas_Electrodomesticos_CuotaCobroRow>
     ListarCuotasACobrar(VM_Ventas_Electrodomesticos_FiltroCobros f)
        {
            using (var db = new Sistema_DavidEntities())
            {
                var q = db.Ventas_Electrodomesticos_Cuotas
                    .Include(c => c.Ventas_Electrodomesticos)
                    .AsQueryable();

                var desde = f.FechaDesde?.Date;
                var hasta = f.FechaHasta?.Date;

                if (desde.HasValue)
                    q = q.Where(c =>
                        DbFunctions.TruncateTime(c.FechaVencimiento) >= desde.Value);

                if (hasta.HasValue)
                    q = q.Where(c =>
                        DbFunctions.TruncateTime(c.FechaVencimiento) <= hasta.Value);

                if (f.IdCliente.HasValue && f.IdCliente.Value > 0)
                    q = q.Where(c => c.Ventas_Electrodomesticos.IdCliente == f.IdCliente.Value);

                if (f.IdVendedor.HasValue && f.IdVendedor.Value > 0)
                    q = q.Where(c => c.Ventas_Electrodomesticos.IdVendedor == f.IdVendedor.Value);

                if (!string.IsNullOrEmpty(f.EstadoCuota))
                {
                    if (f.EstadoCuota == "Vencida")
                    {
                        var hoy = DateTime.Today;

                        q = q.Where(c =>
                            c.Estado != "Pagada" &&
                            DbFunctions.TruncateTime(c.FechaVencimiento) < hoy);
                    }
                    else
                    {
                        q = q.Where(c => c.Estado == f.EstadoCuota);
                    }
                }

                var rows = q.ToList()
                    .Select(c => new VM_Ventas_Electrodomesticos_CuotaCobroRow
                    {
                        IdCuota = c.Id,
                        IdVenta = c.IdVenta,
                        NumeroCuota = c.NumeroCuota,
                        FechaVencimiento = c.FechaVencimiento,
                        TotalCuota = R2(c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos),
                        MontoPagado = R2(c.MontoPagado),
                        MontoRestante = R2(
                            (c.MontoOriginal + c.MontoRecargos - c.MontoDescuentos) - c.MontoPagado
                        ),
                        Estado = c.Estado,

                        IdCliente = c.Ventas_Electrodomesticos.IdCliente,
                        ClienteNombre =
                            (c.Ventas_Electrodomesticos.Clientes.Nombre + " " +
                             c.Ventas_Electrodomesticos.Clientes.Apellido).Trim(),

                        IdVendedor = c.Ventas_Electrodomesticos.IdVendedor,
                        VendedorNombre =
                            c.Ventas_Electrodomesticos.Usuarios != null
                                ? c.Ventas_Electrodomesticos.Usuarios.Nombre
                                : null
                    })
                    .OrderBy(r => r.FechaVencimiento)
                    .ThenBy(r => r.NumeroCuota)
                    .ToList();

                return rows;
            }
        }

    }
}
