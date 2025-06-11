using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.ViewModels
{
    public partial class VMUser
    {
        public int Id { get; set; }
        public string Usuario { get; set; }
        public string Nombre { get; set; }
        public string Apellido { get; set; }
        public string Dni { get; set; }
        public string Telefono { get; set; }
        public string Direccion { get; set; }
        public Nullable<int> IdRol { get; set; }
        public string Contrasena { get; set; }
        public string Estado { get; set; }
        public string Rol { get; set; }
        public string TipoNegocio { get; set; }
        public int ClientesCero { get; set; }
        public DateTime? UltimaExportacion { get; set; }
        public string UrlExportacion { get; set; }
        public Nullable<int> CantVentas { get; set; }
        public Nullable<int> IdEstado { get; set; }
        public Nullable<int> TotalCobranzas { get; set; }
        public Nullable<int> TotalAsignados { get; set; }
        public Nullable<int> IdTipoNegocio { get; set; }
        public Nullable<int> BloqueoSistema { get; set; }
        public Nullable<int> VistaStock { get; set; }

        public virtual EstadosUsuarios EstadosUsuarios { get; set; }
        public virtual Roles Roles { get; set; }
    }
}