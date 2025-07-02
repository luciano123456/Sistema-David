using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.ViewModels
{
    public partial class VMRendimiento
    {
        public int Id { get; set; }
        public int IdVenta { get; set; }
        public int IdVendedor { get; set; }
        public decimal CapitalInicial { get; set; }
        public decimal Venta { get; set; }
        public decimal Cobro { get; set; }
        public decimal CapitalFinal { get; set; }
        public decimal Restante { get; set; }
        public decimal Interes { get; set; }
        public DateTime Fecha { get; set; }
        public DateTime ProximoCobro { get; set; }
        public DateTime FechaLimite { get; set; }
        public string Descripcion { get; set; }
        public string Cliente { get; set; }
        public int whatssap { get; set; }
        public int ActualizoUbicacion { get; set; }
        public string MetodoPago { get; set; }
        public string Imagen { get; set; }
        public string TipoNegocio { get; set; }
        public string CuentaBancaria { get; set; }
    }
}