using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.ViewModels
{
    public partial class VMInformacionClienteAsignado
    {
        public int Id { get; set; }
        public Nullable<int> IdCliente { get; set; }
        public Nullable<int> IdVendedor { get; set; }
        public Nullable<System.DateTime> Fecha { get; set; }
        public string Observacion { get; set; }
        public string Cliente { get; set; }
        public string Vendedor { get; set; }
    }
}