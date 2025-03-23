using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class VMStockUsuario
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public int Cantidad { get; set; }
        public int IdCategoria { get; set; }
        public int IdUsuario { get; set; }

        public string Usuario { get; set; }

        public decimal Total { get; set; }

        public decimal PrecioVenta { get; set; }
        public string TipoNegocio { get; set; }

        public string Producto { get; set; }
        public virtual Productos Productos { get; set; }
        public virtual Productos Productos1 { get; set; }
        public virtual Usuarios Usuarios { get; set; }
        public string Estado { get; internal set; }
    }
}