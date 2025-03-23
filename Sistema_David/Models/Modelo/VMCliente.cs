using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class VMCliente
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public string Apellido { get; set; }
        public string Dni { get; set; }
        public string Direccion { get; set; }

        public Nullable<int> IdEstado { get; set; }
        public string Estado { get; set; }
        public string Telefono { get; set; }
        public Nullable<int> IdVendedor { get; set; }
        public Nullable<int> IdZona { get; set; }
        public Nullable<int> IdVendedorAsignado { get; set; }
        public string VendedorAsignado { get; set; }

        public string Vendedor { get; set; }
        public string Zona { get; set; }

        public decimal Saldo { get; set; }
        public DateTime Fecha { get; set; }
        public string Longitud { get; set; }
        public string Latitud { get; set; }
        public DateTime? FechaenCero { get; set; }

        public virtual EstadosClientes EstadosClientes { get; set; }

        public virtual VMVenta Ventas { get; set; }

    }
}