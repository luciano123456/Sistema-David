using System;
using System.Collections.Generic;

namespace Sistema_David.Models.ViewModels
{

    public class VM_HistorialVentasRow
    {
        public int IdVenta { get; set; }
        public DateTime Fecha { get; set; }
        public string Cliente { get; set; }
        public decimal Total { get; set; }
        public decimal Pagado { get; set; }
        public decimal Pendiente { get; set; }
        public decimal PorcentajePago { get; set; }
        public int CuotasVencidas { get; set; }
        public string Estado { get; set; }

        // Para desplegar cuotas en tabla
        public List<VM_HistorialCuota> Cuotas { get; set; } = new List<VM_HistorialCuota>();
    }

    public class VM_HistorialCuota
    {
        public int NumeroCuota { get; set; }
        public int Id { get; set; }
        public DateTime FechaVencimiento { get; set; }
        public decimal MontoOriginal { get; set; }
        public decimal MontoPagado { get; set; }
        public decimal Recargos { get; set; }
        public decimal Descuentos { get; set; }
        public string Estado { get; set; }
    }

    public class VM_HistorialVentasResp
    {
        public List<VM_HistorialVentasRow> Filas { get; set; }
        public object Kpis { get; set; }
    }

   


    // ====== Crear Venta ======
    public class VM_Ventas_Electrodomesticos_Crear
    {
        public DateTime FechaVenta { get; set; }
        public int IdCliente { get; set; }
        public int IdVendedor { get; set; }
        public int IdVenta { get; set; }

        public decimal ImporteTotal { get; set; }

        public decimal? Entrega { get; set; }
        public decimal? Restante { get; set; }

        public string FormaCuotas { get; set; }
        public int? CantidadCuotas { get; set; }
        public DateTime? FechaVencimiento { get; set; }

        public decimal? RecargoPorcentaje { get; set; }
        public decimal? RecargoFijo { get; set; }
        public decimal? DescuentoPorcentaje { get; set; }
        public decimal? DescuentoFijo { get; set; }

        public string Observacion { get; set; }

        public List<VM_Ventas_Electrodomesticos_Item> Items { get; set; }
        public List<VM_Ventas_Electrodomesticos_CuotaPlan> Cuotas { get; set; }

        public int UsuarioOperador { get; set; }
    }

    // ====== Pago ======
    public class VM_Ventas_Electrodomesticos_PagoAplicacion
    {
        public int IdCuota { get; set; }
        public decimal ImporteAplicado { get; set; }
    }

    public class VM_Ventas_Electrodomesticos_Pago
    {
        public int IdVenta { get; set; }
        public DateTime FechaPago { get; set; }
        public string MedioPago { get; set; } // "Efectivo"|"Transferencia"|"Cuenta"
        public decimal ImporteTotal { get; set; }
        public string Observacion { get; set; }
        public List<VM_Ventas_Electrodomesticos_PagoAplicacion> Aplicaciones { get; set; } = new List<VM_Ventas_Electrodomesticos_PagoAplicacion>();
        public int UsuarioOperador { get; set; }
    }

    // ====== Detalle para la vista ======
    public class VM_Ventas_Electrodomesticos_Cuota
    {
        public int Id { get; set; }
        public int NumeroCuota { get; set; }
        public DateTime FechaVencimiento { get; set; }
        public decimal MontoOriginal { get; set; }
        public decimal MontoRecargos { get; set; }
        public decimal MontoDescuentos { get; set; }
        public decimal MontoPagado { get; set; }
        public decimal? MontoRestante { get; set; }
        public string Estado { get; set; }
    }

    public class VM_Ventas_Electrodomesticos_Detalle
    {
        public string ClienteNombre { get; set; }
        public string ClienteDireccion { get; set; }
        public string ClienteTelefono { get; set; }
        public string ClienteEstado { get; set; }
        public string ClienteDNI { get; set; }

        public int IdVenta { get; set; }
        public DateTime FechaVenta { get; set; }
        public int IdCliente { get; set; }
        public int IdVendedor { get; set; }
        public decimal ImporteTotal { get; set; }

        public decimal ImporteInteres { get; set; }
        public decimal ImporteRecargos { get; set; }
        public decimal ImporteDescuentos { get; set; }

        public string FormaCuotas { get; set; }
        public int? CantidadCuotas { get; set; }
        public DateTime? FechaVencimiento { get; set; }
        public string Estado { get; set; }
        public string Observacion { get; set; }

        public decimal Entrega { get; set; }
        public decimal Restante { get; set; }

        public List<VM_Ventas_Electrodomesticos_Item> Items { get; set; }
            = new List<VM_Ventas_Electrodomesticos_Item>();
        public List<VM_Ventas_Electrodomesticos_Cuota> Cuotas { get; set; }
            = new List<VM_Ventas_Electrodomesticos_Cuota>();

        public object Pagos { get; set; }
        public object Historial { get; set; }
    }


    // ====== Filtro lista de cobros ======
    public class VM_Ventas_Electrodomesticos_FiltroCobros
    {
        public DateTime? FechaDesde { get; set; }
        public DateTime? FechaHasta { get; set; }
        public int? IdCliente { get; set; }
        public int? IdVendedor { get; set; }
        public string EstadoCuota { get; set; } // "Pendiente"|"Vencida"|"Pagada"|null
    }

    public class FiltroHistorialVentas
    {
        public DateTime? FechaDesde { get; set; }
        public DateTime? FechaHasta { get; set; }
        public string Cliente { get; set; }
        public string Estado { get; set; }
    }


    public class VM_Ventas_Electrodomesticos_CuotaCobroRow
    {
        public int IdCuota { get; set; }
        public int IdVenta { get; set; }
        public int NumeroCuota { get; set; }
        public DateTime FechaVencimiento { get; set; }
        public decimal TotalCuota { get; set; }
        public decimal MontoPagado { get; set; }
        public decimal MontoRestante { get; set; }
        public string Estado { get; set; }

        public int IdCliente { get; set; }
        public string ClienteNombre { get; set; }  // ★ NUEVO

        public int IdVendedor { get; set; }
        public string VendedorNombre { get; set; } // ★ OPCIONAL (útil para filtros)
    }


    public class VM_Ventas_Electrodomesticos_Item
    {
        public int? IdProducto { get; set; }
        public string Producto { get; set; }
        public decimal Cantidad { get; set; }
        public decimal PrecioUnitario { get; set; }
        public decimal Subtotal => Math.Round(Cantidad * PrecioUnitario, 2);
    }

    public class VM_Ventas_Electrodomesticos_CuotaPlan
    {
        public int NumeroCuota { get; set; }
        public DateTime FechaVencimiento { get; set; }
        public decimal MontoOriginal { get; set; }
        public decimal MontoRecargos { get; set; }
        public decimal MontoDescuentos { get; set; }
        public string Observacion { get; set; }
    }




}
