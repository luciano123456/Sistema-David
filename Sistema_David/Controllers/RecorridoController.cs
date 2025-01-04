 using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;

namespace Sistema_David.Controllers
{

    [Authorize]
    [CheckBloqueoSistema]
    public class RecorridoController : Controller
    {

        public ActionResult Index()
        {
            return View();
        }


        public ActionResult BuscarRecorridoUser(int id)
        {
            try
            {
                var result = RecorridosModel.BuscarRecorridoUser(id);

                if(result != null) { 
                Recorridos recorrido = new Recorridos
                {
                    Id = result.Id,
                    IdUsuario = result.IdUsuario,
                    Fecha = result.Fecha,
                    Orden = result.Orden,
                    CantRecorridos = result.CantRecorridos
                };

                return Json(new { data = recorrido }, JsonRequestBehavior.AllowGet);
                }

                return Json(new { data = result }, JsonRequestBehavior.AllowGet);

            }
            catch
            {
                return Json(null);
            }
        }

        public ActionResult BorrarRecorridoUser(int id)
        {
            try
            {
                var result = RecorridosModel.BorrarRecorridoUser(id);

                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch
            {
                return Json(null);
            }
        }

        public ActionResult BorrarRecorridoVenta(int idUsuario, int orden)
        {
            try
            {
                var result = RecorridosModel.BuscarRecorridoVenta(idUsuario, orden);

                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch
            {
                return Json(null);
            }
        }

        public ActionResult BorrarRecorridoCliente(int idRecorrido, int idCliente)
        {
            try
            {
                var result = RecorridosModel.BorrarRecorridoCliente(idRecorrido, idCliente);

                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch
            {
                return Json(null);
            }
        }


        public ActionResult ColumnDown(int id, int idVenta)
        {
            try
            {
                var result = RecorridosModel.ColumnDownPendiente(id, idVenta);

                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch
            {
                return Json(null);
            }
        }


        public ActionResult ColumnUp(int id)
        {
            try
            {
                var result = RecorridosModel.ColumnUp(id);

                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch
            {
                return Json(null);
            }
        }


        public ActionResult ArmarRecorrido(int idVendedor, int idCobrador, DateTime FechaCobroDesde, DateTime FechaCobroHasta, string DNI, int idZona, string clientes)
        {
            List<Venta> resultCobros;

            var existeRecorrido = RecorridosModel.BuscarRecorridoUser(SessionHelper.GetUsuarioSesion().Id);

            if(existeRecorrido != null)
            {
                return Json(new { data = "" }, JsonRequestBehavior.AllowGet);
            }

            List<int> listaClientes = new List<int>();
            if (!string.IsNullOrEmpty(clientes))
            {
                listaClientes = clientes.Split(',').Select(int.Parse).ToList();
            }

            if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 2) //ROL VENDEDOR
            {
                resultCobros = CobranzasModel.ListaCobranzas(SessionHelper.GetUsuarioSesion().Id, SessionHelper.GetUsuarioSesion().Id, FechaCobroDesde, FechaCobroHasta, DNI, idZona, listaClientes);
            }
            else if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 3) //ROL COBRADOR)
            {
                resultCobros = CobranzasModel.ListaCobranzas(-1, SessionHelper.GetUsuarioSesion().Id, FechaCobroDesde, FechaCobroHasta, DNI, idZona, listaClientes);
            }
            else
            {
                resultCobros = CobranzasModel.ListaCobranzas(idVendedor, idCobrador, FechaCobroDesde, FechaCobroHasta, DNI, idZona, listaClientes);
            }


            var result = RecorridosModel.ArmarRecorrido(resultCobros);



            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

    }
}