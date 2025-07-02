
using Sistema_David.Models.DB;
using System;
namespace Sistema_David.Models.Modelo
{
    public class VMInformacionVenta
    {
        public int Id { get; set; }
        public int IdVenta { get; set; }
        public Nullable<System.DateTime> Fecha { get; set; }
        public string Descripcion { get; set; }
        public string Cobrador { get; set; }
        public string Cliente { get; set; }

        public decimal Entrega { get; set; }
        public decimal Restante { get; set; }
        public decimal ValorCuota { get; set; }
        public decimal Interes { get; set; }
        public decimal Deuda { get; set; }
        public int idVendedor { get; set; }
        public int whatssap { get; set; }
        public string Observacion { get; set; }
        public string Imagen { get; set; }
        public string MetodoPago { get; set; }
        public string FranjaHoraria { get; set; }
        public string TipoInteres { get; set; }
        public int idCobrador { get; set; }
        public int idCliente { get; set; }
        public int ClienteAusente { get; set; }
        public int CobroPendiente { get; set; }
        public Nullable<int> IdCuentaBancaria { get; set; }
        public Nullable<int> ActualizoUbicacion { get; set; }



        public virtual Ventas Ventas { get; set; }
    }
}