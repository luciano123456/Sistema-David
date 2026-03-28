using System;

namespace Sistema_David.Models.Modelo
{
    public class VMVentaRendimiento
    {
        public int Id { get; set; }
        public int IdCliente { get; set; }
        public int IdVendedor { get; set; }

        public decimal? Restante { get; set; }

        public string EstadoCliente { get; set; }
        public string Vendedor { get; set; }

        public int IdTipoNegocio { get; set; }
        public string TipoVenta { get; set; } // ELECTRO / INDUMENTARIA

        public Nullable<System.DateTime> Fecha { get; set; }
    }
}