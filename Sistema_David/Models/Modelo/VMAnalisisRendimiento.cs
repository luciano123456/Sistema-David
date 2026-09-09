using System;
using System.Collections.Generic;

namespace Sistema_David.Models.ViewModels
{
    public class VMAnalisisRendimiento
    {
        public string FechaDesde { get; set; }
        public string FechaHasta { get; set; }
        public int DiasPeriodo { get; set; }
        public string ResumenPeriodo { get; set; }

        public VMAnalisisKpis Kpis { get; set; }
        public VMAnalisisDestacados Destacados { get; set; }
        public List<string> Insights { get; set; }
        public List<string> Falencias { get; set; }

        public List<VMAnalisisPersona> RankingCompleto { get; set; }
        /// <summary>Todos los vendedores del padrón (incluye $0). No es un top recortado.</summary>
        public List<VMAnalisisPersona> TopVentas { get; set; }
        /// <summary>Todos los cobradores del padrón (incluye $0). No es un top recortado.</summary>
        public List<VMAnalisisPersona> TopCobros { get; set; }
        public List<VMAnalisisPersona> TopInteres { get; set; }
        public List<VMAnalisisPersona> TopCobradores { get; set; }

        public List<VMAnalisisSerie> SerieDiaria { get; set; }
        public List<VMAnalisisItem> MetodosPago { get; set; }
        public List<VMAnalisisItem> TiposNegocio { get; set; }
        public List<VMAnalisisItem> CuentasBancarias { get; set; }
        public List<VMAnalisisItem> DiasSemana { get; set; }
        public List<VMAnalisisCliente> TopClientesVenta { get; set; }
        public List<VMAnalisisCliente> TopClientesCobro { get; set; }
        public List<VMAnalisisCliente> ClientesMenosCompra { get; set; }
        /// <summary>Clientes con FechaenCero en el rango del análisis.</summary>
        public List<VMAnalisisClienteCero> ClientesEnCero { get; set; }
        public List<VMAnalisisPersona> AusentesPorCobrador { get; set; }
        /// <summary>Fiado actual (Restante en calle) vs cobrado del período, por vendedor de la venta.</summary>
        public List<VMAnalisisFiado> FiadoCalle { get; set; }
        /// <summary>Cuotas/cuentas vencidas hoy (sin recorte de fechas), por vendedor de la venta.</summary>
        public List<VMAnalisisVencidas> CuotasVencidas { get; set; }
        /// <summary>Venta y cobro del recorte agrupados por vendedor de la venta (no por cobrador).</summary>
        public List<VMAnalisisPersona> PorVendedorPeriodo { get; set; }
    }

    public class VMAnalisisKpis
    {
        public decimal TotalVentas { get; set; }
        public decimal TotalCobros { get; set; }
        public decimal TotalInteres { get; set; }
        public decimal TotalEfectivo { get; set; }
        public decimal TotalTransferencia { get; set; }
        public decimal TotalTransferenciaPropia { get; set; }
        public decimal TotalTransferenciaTerceros { get; set; }
        public decimal TicketPromedioVenta { get; set; }
        public decimal TicketPromedioCobro { get; set; }
        public decimal RatioCobroSobreVenta { get; set; }
        public int CantVentas { get; set; }
        public int CantCobros { get; set; }
        public int CantIntereses { get; set; }
        public int CantClientesUnicos { get; set; }
        public int CantVendedoresActivos { get; set; }
        public int CantCobradoresActivos { get; set; }
        public int CantAusentes { get; set; }
        public int VentasUnicas { get; set; }
        public decimal PctEfectivo { get; set; }
        public decimal PctTransferencia { get; set; }
    }

    public class VMAnalisisDestacados
    {
        public VMAnalisisPersona MejorVendedor { get; set; }
        public VMAnalisisPersona MejorCobrador { get; set; }
        public VMAnalisisPersona MasCompleto { get; set; }
        public VMAnalisisPersona MasInteres { get; set; }
        public VMAnalisisPersona MasOperaciones { get; set; }
        public string MejorDiaCobros { get; set; }
        public string MejorDiaVentas { get; set; }
    }

    public class VMAnalisisPersona
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public decimal TotalVentas { get; set; }
        public decimal TotalCobros { get; set; }
        public decimal TotalInteres { get; set; }
        public decimal TotalGenerado { get; set; }
        public int CantVentas { get; set; }
        public int CantCobros { get; set; }
        public int CantIntereses { get; set; }
        public int CantOperaciones { get; set; }
        public decimal Score { get; set; }
        public decimal Equilibrio { get; set; }
        /// <summary>Porcentaje cobrado del fiado electro en la calle (-1 si no tiene). Plata/plata, no % de cuotas.</summary>
        public decimal PctCobradoFiado { get; set; }
        /// <summary>Cobrado / vendido del recorte, por vendedor de la venta. -1 si no vendió en el período.</summary>
        public decimal PctCobradoPeriodo { get; set; }
        public string Rol { get; set; }
    }

    public class VMAnalisisFiado
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public decimal Fiado { get; set; }
        public decimal Cobrado { get; set; }
        public decimal Pendiente { get; set; }
        /// <summary>Cobrado del período / fiado actual × 100. -1 si fiado es 0.</summary>
        public decimal PctCobrado { get; set; }
        public int CantVentas { get; set; }
    }

    public class VMAnalisisVencidas
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public int CantCuotas { get; set; }
        public decimal MontoVencido { get; set; }
        public int CantClientes { get; set; }
    }

    public class VMAnalisisSerie
    {
        public string Fecha { get; set; }
        public string FechaIso { get; set; }
        public decimal Ventas { get; set; }
        public decimal Cobros { get; set; }
        public decimal Interes { get; set; }
        public decimal Efectivo { get; set; }
        public decimal Transferencia { get; set; }
        public int Operaciones { get; set; }
    }

    public class VMAnalisisItem
    {
        public string Nombre { get; set; }
        public decimal Importe { get; set; }
        public int Cantidad { get; set; }
        public decimal Porcentaje { get; set; }
    }

    public class VMAnalisisCliente
    {
        public string Nombre { get; set; }
        public decimal Importe { get; set; }
        public int Cantidad { get; set; }
        public string TipoNegocio { get; set; }
        public string FechaUltimaVenta { get; set; }
    }

    public class VMAnalisisClienteCero
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public string Direccion { get; set; }
        public string Zona { get; set; }
        public string Latitud { get; set; }
        public string Longitud { get; set; }
        public string Vendedor { get; set; }
        public string FechaCero { get; set; }
        public int DiasDesdeCero { get; set; }
        public decimal Importe { get; set; }
    }
}
