﻿using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class VMCuentaBancaria
    {
        public int Id { get; set; }
        

        public string CBU { get; set; }
        public string Nombre { get; set; }
        public int CuentaPropia { get; set; }
        public int Activo { get; set; }
        public decimal MontoPagar { get; set; }
        public decimal Entrega { get; set; }
        public DateTime FechaMontoPagar { get; set; }

        public List<VMInformacionVenta> InformacionVentas { get; set; }
    }
}