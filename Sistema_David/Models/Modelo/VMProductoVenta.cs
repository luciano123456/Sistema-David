using System;

using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class VMProductoVenta
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public int IdVenta { get; set; }
        public int Cantidad { get; set; }
        public Nullable<decimal> PrecioUnitario { get; set; }
        public string Producto { get; set; }
        public decimal PrecioTotal { get; set; }

        public virtual Productos Productos { get; set; }
        public virtual Ventas Ventas { get; set; }

    }
}