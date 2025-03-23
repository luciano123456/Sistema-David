using System;

using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class VMStockPendiente
    {
        public int Id { get; set; }
        public Nullable<int> IdUsuario { get; set; }
        public Nullable<int> IdUsuarioAsignado { get; set; }
        public Nullable<System.DateTime> Fecha { get; set; }
        public Nullable<int> IdProducto { get; set; }
        public Nullable<int> Cantidad { get; set; }
        public string Estado { get; set; }
        public string UsuarioAsignado { get; set; }
        public string Usuario { get; set; }
        public string Producto { get; set; }
        public string ImagenProducto { get; set; }
        public string Asignacion { get; set; }
        public string Tipo { get; set; }

    }
}