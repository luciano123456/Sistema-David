using Sistema_David.Models.DB;
using System.Collections.Generic;

namespace Sistema_David.Models.Modelo
{
    public class VMProducto
    {
        public int Id { get; set; }
        public string Codigo { get; set; }
        public string Nombre { get; set; }
        public string Imagen { get; set; }
        public int Activo { get; set; }

        public string Categoria { get; set; }
        public int? idCategoria { get; set; }
        public int? Stock { get; set; }
        public decimal? PrecioCompra { get; set; }
        public decimal? PrecioVenta { get; set; }
        public decimal? Total { get; set; }
        public int? PorcVenta { get; set; }
        public int? DiasVencimiento { get; set; }

        public string Marca { get; set; }
        public string Modelo { get; set; }
        public string Color { get; set; }
        public string Accesorios { get; set; }
        public string Caracteristicas { get; set; }
        public string Descripcion { get; set; }
        public string FinConEntrega { get; set; }
        public string FinSinEntrega { get; set; }
        public string FinSemanal { get; set; }
        public string FinQuincenal { get; set; }
        public string FinMensual { get; set; }
        public string ImagenesAdicionales { get; set; }
        public List<string> ImagenesExtra { get; set; }

        /// <summary>Indica si el producto tiene imagen en BD (listado, sin cargar bytes).</summary>
        public bool TieneImagen { get; set; }

        public virtual Categorias Categorias { get; set; }
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Usage", "CA2227:CollectionPropertiesShouldBeReadOnly")]
        public virtual ICollection<VMStockUsuario> Stock1 { get; set; }
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Usage", "CA2227:CollectionPropertiesShouldBeReadOnly")]
        public virtual ICollection<VMStockUsuario> Stock2 { get; set; }
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Usage", "CA2227:CollectionPropertiesShouldBeReadOnly")]
        public virtual ICollection<VMVenta> Ventas { get; set; }
    }
}
