using Sistema_David.Models.DB;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Data;
using System.Linq;
using System.Web;
using System.Globalization;
using System.Data.Entity;
using System.Data.Entity.Core.Objects;
using Sistema_David.Models.Modelo;
using Sistema_David.Helpers;

namespace Sistema_David.Models
{
    public class RecorridosModel
    {

        public static bool ColumnUp(int id)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {


                    var recorrido = db.Recorridos.Find(id);


                    if (recorrido != null && recorrido.Orden > 1)
                    {
                        recorrido.Orden -= 1;
                        var recorridoCobranza = db.RecorridosCobranzas.Where(x => x.IdRecorrido == recorrido.Id && x.Orden == recorrido.Orden).FirstOrDefault();

                        if (recorridoCobranza != null)
                        {
                            recorridoCobranza.Estado = "Pendiente";
                            db.Entry(recorridoCobranza).State = System.Data.Entity.EntityState.Modified;
                        }
                    }
                    else
                    {
                        return false;
                    }

                    db.Entry(recorrido).State = System.Data.Entity.EntityState.Modified;

                    db.SaveChanges();

                    return true;
                }
            }
            catch (Exception e)
            {
                return false;
            }
        }


        public static int ColumnDown(int id)
        {
            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {
                    int respuesta = 0;

                    var recorrido = db.Recorridos.Find(id);

                    if (recorrido != null)
                    {
                        if (recorrido.Orden >= recorrido.CantRecorridos)
                        {
                            // Eliminar el recorrido si el orden alcanza o supera la cantidad máxima de recorridos
                            db.Recorridos.Remove(recorrido);
                            respuesta = 1;
                        }
                        else
                        {

                            var recorridoCobranza = db.RecorridosCobranzas.Where(x => x.IdRecorrido == recorrido.Id && x.Orden == recorrido.Orden).FirstOrDefault();

                            if (recorridoCobranza != null)
                            {
                                recorridoCobranza.Estado = "Finalizado";
                                db.Entry(recorridoCobranza).State = System.Data.Entity.EntityState.Modified;
                            }

                            recorrido.Orden += 1;
                            db.Entry(recorrido).State = System.Data.Entity.EntityState.Modified;

                            respuesta = 2;
                        }

                        db.SaveChanges();
                    }

                    return respuesta;
                }
            }
            catch (Exception e)
            {
                // Manejo de excepciones
                return 0;
            }
        }

        public static int ColumnDownPendiente(int id, int idVenta)
        {
            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {
                    int respuesta = 0;

                    var recorrido = db.Recorridos.Find(id);

                    if (recorrido != null)
                    {
                        // Buscar y actualizar la entrada en RecorridosCobranzas con el idVenta especificado a estado "Finalizado"
                        var recorridoCobranzaFinalizado = db.RecorridosCobranzas
                            .Where(x => x.IdRecorrido == recorrido.Id && x.IdVenta == idVenta)
                            .FirstOrDefault();

                        if (recorridoCobranzaFinalizado != null)
                        {
                            recorridoCobranzaFinalizado.Estado = "Finalizado";
                            db.Entry(recorridoCobranzaFinalizado).State = System.Data.Entity.EntityState.Modified;
                        }

                        // Buscar la primera entrada en RecorridosCobranzas con estado "Pendiente"
                        var pendienteRecorridoCobranza = db.RecorridosCobranzas
                            .Where(x => x.IdRecorrido == recorrido.Id && x.Estado == "Pendiente" && x.IdVenta != idVenta)
                            .OrderBy(x => x.Orden)
                            .FirstOrDefault();

                        if (pendienteRecorridoCobranza != null)
                        {
                            // Asignar el orden de la entrada pendiente encontrada al recorrido
                            recorrido.Orden = (int)pendienteRecorridoCobranza.Orden;
                            db.Entry(recorrido).State = System.Data.Entity.EntityState.Modified;

                            respuesta = 2;
                        }
                        else
                        {
                            // Eliminar el recorrido si no hay estados pendientes
                            db.Recorridos.Remove(recorrido);
                            respuesta = 1;
                        }

                        db.SaveChanges();
                    }

                    return respuesta;
                }
            }
            catch (Exception e)
            {
                // Manejo de excepciones
                return 0;
            }
        }






        public static Recorridos BuscarRecorridoUser(int id)
        {
            try
            {


                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    int respuesta = 0;

                    var recorrido = db.Recorridos.Where(x => x.IdUsuario == id).FirstOrDefault();

                    return recorrido;
                }
            }
            catch (Exception e)
            {
                // Manejo de excepciones
                return null;
            }
        }

        public static RecorridosCobranzas BuscarRecorridoVenta(int IdUsuario, int idVenta)
        {
            try
            {


                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    int respuesta = 0;

                    var recorrido = db.Recorridos.Where(x => x.IdUsuario == IdUsuario).FirstOrDefault();

                    var recorridoCobranza = db.RecorridosCobranzas.Where(x => x.IdRecorrido == recorrido.Id && x.IdVenta == idVenta).FirstOrDefault();

                    return recorridoCobranza;
                }
            }
            catch (Exception e)
            {
                return null;
            }
        }

        public static List<RecorridosCobranzas> BuscarRecorridoVentaList(int IdUsuario)
        {
            try
            {


                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    int respuesta = 0;

                    var recorrido = db.Recorridos.Where(x => x.IdUsuario == IdUsuario).FirstOrDefault();

                    var recorridoCobranza = db.RecorridosCobranzas.Where(x => x.IdRecorrido == recorrido.Id).ToList();

                    return recorridoCobranza;
                }
            }
            catch (Exception e)
            {
                return null;
            }
        }

        public static bool BorrarRecorridoCliente(int idRecorrido, int idCliente)
        {
            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {
                    var recorrido = db.Recorridos.Where(x => x.Id == idRecorrido).FirstOrDefault();
                    var recorridoCobranzas = db.RecorridosCobranzas.Where(x => x.IdRecorrido == recorrido.Id && x.IdCliente == idCliente).ToList();
                    var recorridosRestantesCount = db.RecorridosCobranzas.Where(x => x.IdRecorrido == idRecorrido).Count();
                    var recorridosRestantes = db.RecorridosCobranzas.Where(x => x.IdRecorrido == idRecorrido).ToList();

                    int OrdenEliminado = 0;

                    if (recorridoCobranzas != null && recorridosRestantesCount > 0)
                    {
                        // Eliminar las cobranzas del cliente especificado
                        foreach (var recorridoCobranza in recorridoCobranzas)
                        {
                            db.RecorridosCobranzas.Remove(recorridoCobranza);
                            recorridosRestantesCount--;
                            OrdenEliminado = (int)recorridoCobranza.Orden;
                        }
                        db.SaveChanges();

                        // Verificar si quedan cobranzas pendientes
                       

                        if (recorridosRestantesCount == 0)
                        {
                            // No quedan recorridos, eliminar el recorrido
                            db.Recorridos.Remove(recorrido);
                        }
                        else
                        {
                            // Buscar la próxima cobranza pendiente
                            var proximaCobranzaPendiente = recorridosRestantes
                                .Where(x => x.Estado == "Pendiente" && x.Orden > OrdenEliminado)
                                .OrderBy(x => x.Orden)
                                .FirstOrDefault();

                            if (proximaCobranzaPendiente != null)
                            {
                                // Actualizar el orden del recorrido con el orden de la próxima cobranza pendiente
                                recorrido.Orden = (int)proximaCobranzaPendiente.Orden;
                                db.Entry(recorrido).State = System.Data.Entity.EntityState.Modified;
                            }
                            else
                            {
                                // No hay cobranzas pendientes, mantener el orden actual
                                recorrido.Orden = (int)recorridosRestantes.Min(x => x.Orden);
                                db.Entry(recorrido).State = System.Data.Entity.EntityState.Modified;
                            }
                        }

                        // Guardar los cambios
                        db.SaveChanges();
                    }

                    return true;
                }
            }
            catch (Exception e)
            {
                // Manejo de excepciones
                return false;
            }
        }




        public static bool BorrarRecorridoUser(int id)
        {
            try
            {


                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    int respuesta = 0;

                    var recorrido = db.Recorridos.Where(x => x.IdUsuario == id).FirstOrDefault();

                    if (recorrido != null)
                    {
                        db.Recorridos.Remove(recorrido);
                        db.SaveChanges();
                    }

                    return true;
                }
            }
            catch (Exception e)
            {
                // Manejo de excepciones
                return false;
            }
        }



        public static bool ArmarRecorrido(List<VMVenta> ventas)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var orden = 0;

                    Recorridos recorrido = new Recorridos();
                    recorrido.IdUsuario = SessionHelper.GetUsuarioSesion().Id;
                    recorrido.Orden = 1;
                    recorrido.CantRecorridos = ventas.Count();
                    recorrido.Fecha = DateTime.Now;

                    db.Recorridos.Add(recorrido);
                    db.SaveChanges();

                    foreach (VMVenta venta in ventas)
                    {
                        RecorridosCobranzas recorridoCobranza = new RecorridosCobranzas();
                        orden++;
                        recorridoCobranza.IdRecorrido = recorrido.Id;
                        recorridoCobranza.Estado = "Pendiente";
                        recorridoCobranza.IdCliente = venta.idCliente;
                        recorridoCobranza.IdVenta = venta.Id;
                        recorridoCobranza.Orden = orden;

                        db.RecorridosCobranzas.Add(recorridoCobranza);
                    }

                    db.SaveChanges();

                    return true;

                }

            }
            catch (Exception ex)
            {
                return false;
            }

        }



    }
}
