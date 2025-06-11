using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class ResultadoStock
    {
        public List<VMStockUsuario> Stocks { get; set; }
        public bool VistaStock { get; set; }
    }
}