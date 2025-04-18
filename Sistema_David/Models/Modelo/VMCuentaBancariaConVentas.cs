using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.ViewModels
{
    public class VMCuentaBancariaConVentas
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public string CBU { get; set; }
        public int CuentaPropia { get; set; }
        public int Activo { get; set; }
        public decimal MontoPagar { get; set; }
        public decimal Entrega { get; set; }
        public List<VMInformacionVenta> InformacionVentas { get; set; }
    }

}