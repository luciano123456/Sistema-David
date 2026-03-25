using System;

using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class VMVentaUnificada
    {
        public int Id { get; set; }
        public int IdCliente { get; set; }
        public string Tipo { get; set; } // INDUMENTARIA | ELECTRO
        public DateTime Fecha { get; set; }

        public decimal Total { get; set; }
        public decimal Abonado { get; set; }
        public decimal Saldo { get; set; }

        public string Estado { get; set; }
        public string Vendedor { get; set; }
        public string Observacion { get; set; }
    }
}