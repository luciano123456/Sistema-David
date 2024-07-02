using Newtonsoft.Json;
using NPOI.HSSF.UserModel;
using NPOI.SS.UserModel;
using NPOI.XSSF.UserModel;
using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using Sistema_David.Models.ViewModels;
using SpreadsheetLight;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Excel = Microsoft.Office.Interop.Excel;

namespace Sistema_David.Controllers
{

    [Authorize]
    public class CobranzasController : Controller
    {



        // GET: Cobranzas
        public ActionResult Index()
        {
            ViewBag.ErrorPermisos = null;

            if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 2) //ROL  VENDEDOR
            {
                ViewBag.ErrorPermisos = "No puedes acceder a esta pantalla";
            }

            var stockPendiente = StockPendienteModel.ListarStockPendienteId(SessionHelper.GetUsuarioSesion().Id, "Pendiente");

            if (stockPendiente.Count > 0 && SessionHelper.GetUsuarioSesion().IdRol != 1) // No afecta a administradores
            {
                // Si hay stock pendiente, redirige al índice de StockController
                return RedirectToAction("Index", "StockPendiente");
            }

            return View();

        }

        public ActionResult Listar(int idVendedor, int idCobrador, DateTime FechaCobroDesde, DateTime FechaCobroHasta, string DNI, int idZona)
        {
            List<Venta> result;

            if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 2) //ROL VENDEDOR
            {
                result = CobranzasModel.ListaCobranzas(SessionHelper.GetUsuarioSesion().Id, SessionHelper.GetUsuarioSesion().Id, FechaCobroDesde, FechaCobroHasta, DNI, idZona);
            }
            else if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 3) //ROL COBRADOR)
            {
                result = CobranzasModel.ListaCobranzas(-1, SessionHelper.GetUsuarioSesion().Id, FechaCobroDesde, FechaCobroHasta, DNI, idZona);
            }
            else
            {
                result = CobranzasModel.ListaCobranzas(idVendedor, idCobrador, FechaCobroDesde, FechaCobroHasta, DNI, idZona);
            }


            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult AsignarCobrador(int idCobrador, string cobranzas)
        {
            try
            {
                var lstCobranzas = JsonConvert.DeserializeObject<List<int>>(cobranzas);

                var result = CobranzasModel.AsignarCobrador(lstCobranzas, idCobrador);


                return Json(result);
            }
            catch (Exception ex)
            {
                return Json(null);
            }


        }


        public ActionResult ColumnDown(int id)
        {
            try
            {
                var result = CobranzasModel.ColumnDown(id);

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
                var result = CobranzasModel.ColumnUp(id);

                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch
            {
                return Json(null);
            }
        }

        public ActionResult ColumnSet(int id, int orden)
        {
            try
            {
                var result = CobranzasModel.ColumnSet(id, orden);

                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch
            {
                return Json(null);
            }
        }

        public ActionResult ColumnImportante(int id, int importante, int orden)
        {
            try
            {
                var result = CobranzasModel.ColumnImportante(id, importante, orden);

                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch
            {
                return Json(null);
            }
        }

        public ActionResult Cobranza(Ventas model)
        {
            try
            {
                Venta venta = VentasModel.BuscarVenta(model.Id);


                if ((venta != null && venta.Restante < model.Entrega) || venta == null)
                {
                    return Json(new { Status = false });
                }

                var result = CobranzasModel.Cobranza(model);


                return Json(new { Status = true });
            }
            catch (Exception ex)
            {
                return Json(new { Status = false });
            }

        }
    }
}