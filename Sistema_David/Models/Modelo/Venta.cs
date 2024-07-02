using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class Venta
    {
        public int Id { get; set; }
        public int idCliente { get; set; }
        public Nullable<System.DateTime> Fecha { get; set; }
        public Nullable<decimal> Entrega { get; set; }
        public Nullable<decimal> Restante { get; set; }
        public Nullable<System.DateTime> FechaCobro { get; set; }
        public Nullable<System.DateTime> FechaLimite { get; set; }
        public int idVendedor { get; set; }
        public int idCobrador { get; set; }
        public int idZona { get; set; }
        public int idEstado { get; set; }
        public string Observacion { get; set; }
        public string Cliente { get; set; }
        public string Direccion { get; set; }
        public string Vendedor { get; set; }
        public string Zona { get; set; }
        public string EstadoCliente { get; set; }
        public string DireccionCliente { get; set; }
        public string TelefonoCliente { get; set; }
        public string DniCliente { get; set; }
        public int Importante { get; set; }
        public int Orden { get; set; }
        public int Comprobante { get; set; }
        public decimal ValorCuota { get; set; }
        public decimal SaldoCliente { get; set; }
        public decimal Interes { get; set; }
        public DateTime FechaCliente { get; set; }
        public DateTime P_FechaCobro { get; set; }
        public decimal P_ValorCuota { get; set; }
        public virtual Clientes Clientes { get; set; }
        public virtual Zonas Zonas { get; set; }
        
    }
}