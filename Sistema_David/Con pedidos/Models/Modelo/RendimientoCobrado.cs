using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.ViewModels
{
    public partial class RendimientoCobrado
    {

        public int idVendedor { get; set; }
        public string Vendedor { get; set; }
        public decimal TotalCobrado { get; set; }
        
    }
}