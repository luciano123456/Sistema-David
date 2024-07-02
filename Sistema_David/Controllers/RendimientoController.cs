using Newtonsoft.Json.Linq;
using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Sistema_David.Controllers
{

    [Authorize]
    public class RendimientoController : Controller
    {


        public ActionResult Index()
        {

            ViewBag.ErrorPermisos = null;

            if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 2) //ROL  VENDEDOR
            {
                ViewBag.ErrorPermisos = "No puedes acceder a esta pantalla";
            }

            return View();
        }

        public ActionResult Listar()
        {
            var result = RendimientosModel.ListaUsuarios();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }


        [HttpGet]
        public ActionResult MostrarRendimiento(int id, int ventas, int cobranzas,DateTime fechadesde, DateTime fechahasta)
        {


            var result = RendimientosModel.MostrarRendimiento(id, ventas, cobranzas, fechadesde, fechahasta);

            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ListarVentas(int idVendedor)
        {
            List<Venta> result;

            result = VentasModel.ListaVentas(idVendedor);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }




        [HttpGet]
        public ActionResult MostrarRendimientoGeneral(DateTime fechadesde, DateTime fechahasta) 
        {
            {

                var resultRendimiento = RendimientosModel.MostrarRendimientoGeneral(fechadesde, fechahasta);
                var resultCobrado = RendimientosModel.MostrarCobrado(fechadesde, fechahasta);

                var result = new Dictionary<string, object>();
                result.Add("Rendimiento", resultRendimiento);
                result.Add("Cobrado", resultCobrado);
                return Json(result, JsonRequestBehavior.AllowGet);
            }

        }
    }
}