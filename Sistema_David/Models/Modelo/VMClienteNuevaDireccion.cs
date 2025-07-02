using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class VMClienteNuevaDireccion
    {
        public int IdCliente { get; set; }
        public string Longitud { get; set; }
        public string Latitud { get; set; }
    }
}