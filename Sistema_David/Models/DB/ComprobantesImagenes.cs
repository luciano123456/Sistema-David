//------------------------------------------------------------------------------
// <auto-generated>
//     Este código se generó a partir de una plantilla.
//
//     Los cambios manuales en este archivo pueden causar un comportamiento inesperado de la aplicación.
//     Los cambios manuales en este archivo se sobrescribirán si se regenera el código.
// </auto-generated>
//------------------------------------------------------------------------------

namespace Sistema_David.Models.DB
{
    using System;
    using System.Collections.Generic;
    
    public partial class ComprobantesImagenes
    {
        public int Id { get; set; }
        public Nullable<System.DateTime> Fecha { get; set; }
        public string Imagen { get; set; }
        public Nullable<int> IdCuenta { get; set; }
    
        public virtual CuentasBancarias CuentasBancarias { get; set; }
    }
}
