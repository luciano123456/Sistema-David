using System;

namespace Sistema_David.Models.Modelo
{
    public class VMClienteAdjunto
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public string Extension { get; set; }
        public int TamanoBytes { get; set; }
        public string Fecha { get; set; }
        public bool EsImagen { get; set; }
        public string Url { get; set; }
    }

    public class VMClienteAdjuntosResultado
    {
        public bool Ok { get; set; }
        public string Mensaje { get; set; }
        public System.Collections.Generic.List<VMClienteAdjunto> Items { get; set; }
    }
}
