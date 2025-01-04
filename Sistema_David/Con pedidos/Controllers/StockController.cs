using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Sistema_David.Controllers
{
    public class StockController : Controller
    {
        // GET: Stock
        public ActionResult Index()
        {

            var stockPendiente = StockPendienteModel.ListarStockPendienteId(SessionHelper.GetUsuarioSesion().Id, "Pendiente");

            if (stockPendiente.Count > 0 && SessionHelper.GetUsuarioSesion().IdRol != 1) // No afecta a administradores
            {
                // Si hay stock pendiente, redirige al índice de StockController
                return RedirectToAction("Index", "StockPendiente");
            }

            return View();
        }


        public ActionResult BuscarStock(int id)
        {
            var result = StockModel.BuscarStock(id);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

       



        public ActionResult BuscarStockUser(int idUsuario, int idProducto)
        {
            var result = StockModel.BuscarStockUser(idUsuario, idProducto);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }


        public ActionResult EditarInfo(int id)
        {
            var result = StockModel.EditarInfo(id);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult Agregar(StocksPendientes model)
        {
            try
            {

                var producto = StockModel.BuscarStockUser((int)model.IdUsuario, (int)model.IdProducto);

                if (producto != null)
                {
                    SumarStock((int)model.IdUsuario, (int)model.IdProducto, (int)model.Cantidad);
                    return Json(new { Status = 1 });
                }
                var result = StockModel.Agregar(model);
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

        public ActionResult Eliminar(int id)
        {
            try
            {

                var result = StockModel.Eliminar(id);

                if (result)
                    return Json(new { Status = true });

                else
                    return Json(new { Status = false });
            }
            catch (Exception ex)
            {
                return Json(new { Status = false });
            }

        }

        public ActionResult Editar(StockUsuarios model)
        {
            try
            {

                var result = StockModel.Editar(model);

                if (result)
                    return Json(new { Status = true });

                else
                    return Json(new { Status = false });
            }
            catch (Exception ex)
            {
                return Json(new { Status = false });
            }

        }

        public ActionResult SumarStock(int idUsuario, int idProducto, int CantidadStock)
        {
            try
            {

                var result = StockModel.SumarStock(idUsuario, idProducto, CantidadStock);

                if (result)
                    return Json(new { Status = true });

                else
                    return Json(new { Status = false });
            }
            catch (Exception ex)
            {
                return Json(new { Status = false });
            }

        }

    }
}