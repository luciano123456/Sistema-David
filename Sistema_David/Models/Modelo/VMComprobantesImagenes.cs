
using Sistema_David.Models.DB;
using System;
namespace Sistema_David.Models.Modelo
{
    public class VMComprobantesImagenes
    {
        public int Id { get; set; }
        public Nullable<System.DateTime> Fecha { get; set; }
        public string Imagen { get; set; }
        public Nullable<int> IdCuenta { get; set; }

        public virtual CuentasBancarias CuentasBancarias { get; set; }
    }
}