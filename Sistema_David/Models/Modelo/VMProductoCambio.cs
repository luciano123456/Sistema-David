using System;
using System.Collections.Generic;

namespace Sistema_David.Models.Modelo
{
    public class VMProductoSnapshot
    {
        public int Id { get; set; }
        public string Codigo { get; set; }
        public string Nombre { get; set; }
        public string Imagen { get; set; }
        public int Activo { get; set; }
        public int? idCategoria { get; set; }
        public int? Stock { get; set; }
        public decimal? PrecioCompra { get; set; }
        public decimal? PrecioVenta { get; set; }
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
        public List<string> ImagenesExtra { get; set; }
        public int? StockDelta { get; set; }
        public string StockDireccion { get; set; }
    }

    public class VMProductoDiffCampo
    {
        public string Campo { get; set; }
        public string Etiqueta { get; set; }
        public string Grupo { get; set; }
        public string TipoValor { get; set; }
        public string ValorAnterior { get; set; }
        public string ValorNuevo { get; set; }
        public bool TieneImagenAntes { get; set; }
        public bool TieneImagenDespues { get; set; }
        public int ExtraAntes { get; set; }
        public int ExtraDespues { get; set; }
    }

    public class VMProductoSolicitud
    {
        public int Id { get; set; }
        public string Tipo { get; set; }
        public int? IdProducto { get; set; }
        public string NombreProducto { get; set; }
        public string Estado { get; set; }
        public int IdUsuarioSolicita { get; set; }
        public string UsuarioSolicita { get; set; }
        public DateTime FechaSolicitud { get; set; }
        public int? IdUsuarioResuelve { get; set; }
        public string UsuarioResuelve { get; set; }
        public DateTime? FechaResolucion { get; set; }
        public string Comentario { get; set; }
        public string DiffJson { get; set; }
        public int? CantidadCampos { get; set; }
        public List<VMProductoDiffCampo> Cambios { get; set; }
        public bool TieneImagenAntes { get; set; }
        public bool TieneImagenDespues { get; set; }
    }

    public class VMProductoHistorial
    {
        public int Id { get; set; }
        public int? IdProducto { get; set; }
        public int? IdSolicitud { get; set; }
        public DateTime Fecha { get; set; }
        public int IdUsuario { get; set; }
        public string UsuarioNombre { get; set; }
        public int? IdUsuarioSolicita { get; set; }
        public string UsuarioSolicitud { get; set; }
        public int? IdUsuarioResuelve { get; set; }
        public string UsuarioResolucion { get; set; }
        public string Tipo { get; set; }
        public string NombreProducto { get; set; }
        public string Resumen { get; set; }
        public string DiffJson { get; set; }
        public string Origen { get; set; }
        public string EstadoResultado { get; set; }
        public string Comentario { get; set; }
        public List<VMProductoDiffCampo> Cambios { get; set; }
    }

    public class VMPendienteReemplazo
    {
        public int Id { get; set; }
        public int IdUsuarioSolicita { get; set; }
    }

    public class VMProductoCambioResultado
    {
        public bool Status { get; set; }
        public bool Pendiente { get; set; }
        public string Mensaje { get; set; }
        public int? IdSolicitud { get; set; }
        public bool TieneStock { get; set; }
        public List<string> Detalle { get; set; }
        public int Ok { get; set; }
        public int Fallidos { get; set; }
        public bool RequiereOverwrite { get; set; }
        public bool TienePendiente { get; set; }
    }

    public class VMResolverPendiente
    {
        public int Id { get; set; }
        public string Comentario { get; set; }
    }

    public class VMResolverPendientes
    {
        public List<int> Ids { get; set; }
        public string Comentario { get; set; }
    }

    public class VMProductoAccionMasiva
    {
        public List<int> Ids { get; set; }
        public string Accion { get; set; }
    }
}
