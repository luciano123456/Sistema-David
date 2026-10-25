using System;

namespace Sistema_David.Models.Modelo
{
    public class VMNavbarAlerta
    {
        public int Id { get; set; }
        public int IdVenta { get; set; }
        public int IdCliente { get; set; }
        public int IdCuota { get; set; }
        public string Cliente { get; set; }
        public DateTime Fecha { get; set; }
        public string FechaTexto { get; set; }
        public string FechaCobroTexto { get; set; }
        public string Tipo { get; set; }
        public string Origen { get; set; }
        public string Estado { get; set; }
        public string Cobrador { get; set; }
        public string Observacion { get; set; }
        public string Url { get; set; }
        public string Telefono { get; set; }
        public string FechaVisitaTexto { get; set; }
        public string HoraVisitaTexto { get; set; }
    }
}
