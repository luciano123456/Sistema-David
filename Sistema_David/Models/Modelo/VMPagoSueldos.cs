using System;

using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class VMSueldoCalc
    {
        public int IdUsuario { get; set; }
        public DateTime Desde { get; set; }
        public DateTime Hasta { get; set; }
        public decimal TotalVentas { get; set; }
        public decimal TotalCobranzas { get; set; }
        public decimal ImporteVentas { get; set; }
        public decimal ImporteCobranzas { get; set; }
        public decimal ImporteTotal { get; set; }
        public List<VMSueldoDetalle> Detalles { get; set; } = new List<VMSueldoDetalle>();
    }

    public class VMSueldoDetalle
    {
        public byte TipoOrigen { get; set; }         // 1 ventas, 2 cobranzas
        public int? IdTipoNegocio { get; set; }
        public decimal BaseMonto { get; set; }
        public decimal Porcentaje { get; set; }
        public decimal ImporteCalc { get; set; }
        public string Observacion { get; set; }
    }

    public class VMSueldoCabFull
    {
        public Sueldos Cab { get; set; }
        public List<Sueldos_Detalle> Det { get; set; }
        public List<Sueldos_Pagos> Pagos { get; set; }
    }

    public class VMRegla
    {
        public int Id { get; set; }
        public byte IdTipoRegla { get; set; }          // 1 ventas, 2 cobranzas
        public int? IdTipoNegocio { get; set; }        // null = global
        public decimal MontoDesde { get; set; }
        public decimal? MontoHasta { get; set; }
        public decimal Porcentaje { get; set; }
        public bool Activo { get; set; }
    }

    public class VMPagoInput
    {
        public DateTime Fecha { get; set; }
        public string Metodo { get; set; }
        public decimal Importe { get; set; }
        public string Nota { get; set; }
        public string FileKey { get; set; }          // nombre del archivo en FormData
        public string RutaComprobante { get; set; }  // lo completa el controller
    }

    public class VMSueldoHistRow
    {
        public int Id { get; set; }
        public string Vendedor { get; set; }
        public DateTime FechaDesde { get; set; }
        public DateTime FechaHasta { get; set; }
        public string Concepto { get; set; }
        public decimal ImporteTotal { get; set; }
        public decimal Abonado { get; set; }
        public decimal Saldo { get; set; }
        public byte Estado { get; set; }
        public DateTime FechaAlta { get; set; }
        
    }

}