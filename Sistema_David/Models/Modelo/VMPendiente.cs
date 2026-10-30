using System;
using System.Collections.Generic;

namespace Sistema_David.Models.Modelo
{
    public class VMPendienteFiltro
    {
        public string Pestana { get; set; }
        public string Tipo { get; set; }
        public int IdResponsable { get; set; }
        public string Prioridad { get; set; }
        public string Estado { get; set; }
        public string Busqueda { get; set; }
    }

    public class VMPendienteLista
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public string FechaTexto { get; set; }
        public string Tipo { get; set; }
        public string Nombre { get; set; }
        public string Dni { get; set; }
        public string Direccion { get; set; }
        public string Telefono { get; set; }
        public string Titulo { get; set; }
        public int IdResponsable { get; set; }
        public string Responsable { get; set; }
        public string Prioridad { get; set; }
        public string Estado { get; set; }
        public int IdUsuarioCarga { get; set; }
        public string UsuarioCarga { get; set; }
        public DateTime FechaCarga { get; set; }
        public string FechaCargaTexto { get; set; }
        public DateTime? FechaAlarma { get; set; }
        public string FechaAlarmaTexto { get; set; }
        public DateTime? FechaResolucion { get; set; }
        public string FechaResolucionTexto { get; set; }
    }

    public class VMPendienteDetalle : VMPendienteLista
    {
        public int? IdCliente { get; set; }
        public int? IdVendedor { get; set; }
        public string VendedorNombre { get; set; }
        public string Descripcion { get; set; }
        public string Solucion { get; set; }
        public int? IdUsuarioResolvio { get; set; }
        public string UsuarioResolvio { get; set; }
        public List<int> Destinatarios { get; set; }
        public string DestinatariosNombres { get; set; }
        public List<VMPendienteObs> Observaciones { get; set; }
        public List<VMPendienteAdjunto> Adjuntos { get; set; }
    }

    public partial class VMPendienteGuardar
    {
        public int Id { get; set; }
        public string Tipo { get; set; }
        public DateTime? Fecha { get; set; }
        public int? IdCliente { get; set; }
        public int? IdVendedor { get; set; }
        public string Titulo { get; set; }
        public string Descripcion { get; set; }
        public string ObservacionInicial { get; set; }
        public int IdResponsable { get; set; }
        public string Prioridad { get; set; }
        public string Estado { get; set; }
        public DateTime? FechaAlarma { get; set; }
        public List<int> Destinatarios { get; set; }
    }

    public class VMPendienteObs
    {
        public int Id { get; set; }
        public string Texto { get; set; }
        public int IdUsuario { get; set; }
        public string Usuario { get; set; }
        public DateTime Fecha { get; set; }
        public string FechaTexto { get; set; }
    }

    public class VMPendienteAdjunto
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public string Extension { get; set; }
        public int TamanoBytes { get; set; }
        public string Fecha { get; set; }
        public bool EsImagen { get; set; }
        public string Url { get; set; }
    }

    public class VMPendienteAdjuntosResultado
    {
        public bool Ok { get; set; }
        public string Mensaje { get; set; }
        public List<VMPendienteAdjunto> Items { get; set; }
    }

    public class VMPendienteAlarma
    {
        public int IdDestinatario { get; set; }
        public int IdActividad { get; set; }
        public int IdUsuario { get; set; }
        public string Titulo { get; set; }
        public string Tipo { get; set; }
        public string Nombre { get; set; }
        public string Prioridad { get; set; }
        public DateTime FechaAlarma { get; set; }
        public string FechaAlarmaTexto { get; set; }
        public string Url { get; set; }
    }

    public class VMPendienteRealtime
    {
        public int Contador { get; set; }
        public List<VMPendienteAlarma> Due { get; set; }
        public List<VMPendienteAlarma> Proximas { get; set; }
    }

    public class VMPendienteUsuario
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public string Usuario { get; set; }
        public string Rol { get; set; }
        public int IdRol { get; set; }
    }

    public class VMPendienteCliente
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public string Apellido { get; set; }
        public string NombreCompleto { get; set; }
        public string Dni { get; set; }
        public string Direccion { get; set; }
        public string Telefono { get; set; }
    }

    public class VMPendienteSolucion
    {
        public int Id { get; set; }
        public string Solucion { get; set; }
    }

    public class VMPendienteObservacionNueva
    {
        public int Id { get; set; }
        public string Texto { get; set; }
    }
}
