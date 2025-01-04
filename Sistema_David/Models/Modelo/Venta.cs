using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class RecorridoCobranza
    {
        public int Id { get; set; }
        public int IdRecorrido { get; set; }
        public string Estado { get; set; }
        public int Orden { get; set; }

        public int IdVenta { get; set; }
        public int IdCliente { get; set; }


    }
}