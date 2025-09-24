using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class VMTiposNegocio
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public int DiasVencimiento { get; set; }
    }
}