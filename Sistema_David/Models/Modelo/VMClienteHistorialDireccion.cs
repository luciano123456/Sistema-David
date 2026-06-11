using System;

namespace Sistema_David.Models.Modelo
{
    public class VMClienteHistorialDireccion
    {
        public int Id { get; set; }
        public int IdCliente { get; set; }
        public string DireccionAnterior { get; set; }
        public string DireccionNueva { get; set; }
        public string LatitudAnterior { get; set; }
        public string LatitudNueva { get; set; }
        public string LongitudAnterior { get; set; }
        public string LongitudNueva { get; set; }
        public int? IdUsuario { get; set; }
        public string UsuarioNombre { get; set; }
        public DateTime FechaCambio { get; set; }
        public string Origen { get; set; }
    }
}
