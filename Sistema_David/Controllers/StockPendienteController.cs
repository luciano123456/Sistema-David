using DocumentFormat.OpenXml.Office2010.Excel;
using Newtonsoft.Json;
using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Sistema_David.Controllers
{

    [CheckBloqueoSistema]
    public class StockPendienteController : Controller
    {
        // GET: Stock
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult ListarStockPendiente(int id, string Estado, DateTime Fecha)
        {


            List<StockPendientes> stockPendiente;

            if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 1) //ROL ADMIN, ADMIN TRAE TODOS, SI ES VENDEDOR, SOLO SU USER
            {
                stockPendiente = StockPendienteModel.ListarStockPendiente(id > 0 ? id : -1, Estado, Fecha);
            }
            else
            {
                stockPendiente = StockPendienteModel.ListarStockPendiente(id, Estado, null);
            }

            var json = Json(new { data = stockPendiente }, JsonRequestBehavior.AllowGet);
            json.MaxJsonLength = 500000000;
            return json;

        }



        public ActionResult AceptarStock(int id)
        {
            var result = StockPendienteModel.AceptarStock(id);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult RechazarStock(int id)
        {
            var result = StockPendienteModel.RechazarStock(id);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }


        public ActionResult EliminarStock(int id)
        {
            var result = StockPendienteModel.EliminarStock(id);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ModificarStock(int id, int cantidad)
        {
            var result = StockPendienteModel.ModificarStock(id, cantidad);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public ActionResult EditarInfo(int id)
        {
            try
            {

                var result = StockPendienteModel.BuscarStockPendiente(id);
                return Json(new { data = result }, JsonRequestBehavior.AllowGet);
            }

            catch (Exception ex)
            {
                return Json(null);
            }

        }


        public ActionResult ModificarEstadoStockList(string stocks, string estado)
        {
            try
            {
                var lstStocks = JsonConvert.DeserializeObject<List<int>>(stocks);

                var result = StockPendienteModel.ModificarEstadoStockList(lstStocks, estado);


                return Json(result);
            }
            catch (Exception ex)
            {
                return Json(null);
            }


        }



        public ActionResult Agregar(StocksPendientes model)
        {
            try
            {


                var result = StockPendienteModel.Agregar(model);
                if (result)
                    return Json(new { Status = 1 });

                else
                    return Json(new { Status = 0 });
            }
            catch (Exception ex)
            {
                return Json(new { Status = 0 });
            }

        }


    }
}