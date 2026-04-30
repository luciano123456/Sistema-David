using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.ViewModels
{
    public partial class VMRendimiento
    {
        public int Id { get; set; }
        public int IdVenta { get; set; }
        public int IdVendedor { get; set; }

        public int? IdOriginal { get; set; }
        public string IdUnico { get; set; }
        public string Origen { get; set; }

        public decimal? CapitalInicial { get; set; }
        public decimal? Venta { get; set; }
        public decimal? Cobro { get; set; }
        public decimal? CapitalFinal { get; set; }
        public decimal? Restante { get; set; }
        public decimal? Interes { get; set; }

        public DateTime? Fecha { get; set; }
        public DateTime? ProximoCobro { get; set; }
        public DateTime? FechaLimite { get; set; }

        public string Descripcion { get; set; }
        public string Cliente { get; set; }

        public int? whatssap { get; set; }
        public int? ActualizoUbicacion { get; set; }

        public string MetodoPago { get; set; }
        public string Imagen { get; set; }
        public string CuentaBancaria { get; set; }

        public int? IdTipoNegocio { get; set; }
        public string TipoNegocio { get; set; }

        /// <summary>Vendedor de la venta (clásica o electro), según IdVenta.</summary>
        public string Vendedor { get; set; }

        /// <summary>Id del usuario cobrador (InformacionVentas.IdCobrador o Ventas_Electrodomesticos_Pagos.UsuarioCreacion según el SP).</summary>
        public int IdCobrador { get; set; }

        /// <summary>Nombre legible del cobrador (se completa en servidor a partir de <see cref="IdCobrador"/>).</summary>
        public string UsuarioCobro { get; set; }
    }
}
