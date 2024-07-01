using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.ViewModels
{
    public partial class RendimientoGeneral
    {
        public string Fecha { get; set; }
        public decimal CapitalInicial { get; set; }
        public decimal Ventas { get; set; }
        public decimal Cobranza { get; set; }
        public decimal CapitalFinal { get; set; }
    }
}