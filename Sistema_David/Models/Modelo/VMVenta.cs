using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class VMVenta
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
        public string MetodoPago { get; set; }
        public string Cliente { get; set; }
        public string Direccion { get; set; }
        public string Vendedor { get; set; }
        public string Cobrador { get; set; }
        public string Zona { get; set; }
        public string EstadoCliente { get; set; }
        public string DireccionCliente { get; set; }
        public string TelefonoCliente { get; set; }
        public string DniCliente { get; set; }
        public string Latitud { get; set; }
        public string Longitud { get; set; }
        public string TipoInteres { get; set; }
        public int Importante { get; set; }
        public int Orden { get; set; }
        public int IdCuenta { get; set; }
        public int Comprobante { get; set; }
        public int IdRecorrido { get; set; }
        public int OrdenRecorrido { get; set; }
        public int IdUsuarioRecorrido { get; set; }
        public int OrdenRecorridoCobro { get; set; }
        public int IdTipoNegocio { get; set; }
        public string TipoNegocio { get; set; }
        public string EstadoRecorrido { get; set; }
        public string EstadoCobro { get; set; }
        public string Turno { get; set; }
        public string FranjaHoraria { get; set; }
        public bool EnRecorrido { get; set; }
        public string Estado { get; set; }
        public decimal ValorCuota { get; set; }
        public decimal SaldoCliente { get; set; }
        public decimal LimiteVentas { get; set; }
        public decimal Interes { get; set; }
        public int CobroPendiente { get; set; }
        public DateTime FechaCliente { get; set; }
        public DateTime P_FechaCobro { get; set; }
        public decimal P_ValorCuota { get; set; }
        public virtual Clientes Clientes { get; set; }
        public virtual Zonas Zonas { get; set; }
        public string Imagen { get; set; }
    }
}