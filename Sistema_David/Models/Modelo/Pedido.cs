using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class Pedido
    {
        public int Id { get; set; }
        public System.DateTime Fecha { get; set; }
        public int IdVendedor { get; set; }
        public int IdCliente { get; set; }
        public int IdEstado { get; set; }
        public string NombreCliente { get; set; }
        public string Estado { get; set; }
        public string Dni { get; set; }
        public string Vendedor { get; set; }
        public string Direccion { get; set; }
        public string Telefono { get; set; }
        public string Observaciones { get; set; }
        public Nullable<decimal> Entrega { get; set; }
        public Nullable<decimal> Total { get; set; }
        public Nullable<decimal> Restante { get; set; }
        public Nullable<System.DateTime> Fecha_Entrega { get; set; }

        public virtual Clientes Clientes { get; set; }
        public virtual Usuarios Usuarios { get; set; }

    }
}