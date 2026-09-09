using Newtonsoft.Json.Linq;
using NPOI.SS.Formula.Functions;
using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;

namespace Sistema_David.Controllers
{

    [Authorize]
    [CheckBloqueoSistema]
    public class RendimientoController : Controller
    {


        public ActionResult Index()
        {

            ViewBag.ErrorPermisos = null;

            if (SessionHelper.GetUsuarioSesion() != null && (SessionHelper.GetUsuarioSesion().IdRol != 1) && SessionHelper.GetUsuarioSesion().IdRol != 4) //ROL  VENDEDOR
            {
                ViewBag.ErrorPermisos = "No puedes acceder a esta pantalla";
            }

            ViewBag.EsAdmin = SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 1;

            return View();
        }

        public ActionResult Analisis()
        {
            ViewBag.ErrorPermisos = null;

            if (SessionHelper.GetUsuarioSesion() == null || SessionHelper.GetUsuarioSesion().IdRol != 1)
            {
                ViewBag.ErrorPermisos = "No puedes acceder a esta pantalla";
            }

            return View();
        }

        [HttpGet]
        public ActionResult ObtenerAnalisis(DateTime fechadesde, DateTime fechahasta, int tiponegocio, string metodoPago, int IdCuentaBancaria, int idVendedor, int comprobantesEnviados = -1, int idEstado = 1)
        {
            if (SessionHelper.GetUsuarioSesion() == null || SessionHelper.GetUsuarioSesion().IdRol != 1)
                return new HttpStatusCodeResult(403);

            if (HttpContext != null && HttpContext.Server != null)
                HttpContext.Server.ScriptTimeout = 600;

            var result = RendimientoAnalisisModel.Analizar(
                idVendedor, fechadesde, fechahasta, tiponegocio, metodoPago, IdCuentaBancaria, comprobantesEnviados, idEstado);

            var json = Json(result, JsonRequestBehavior.AllowGet);
            json.MaxJsonLength = int.MaxValue;
            return json;
        }

        public ActionResult Listar() 
        {
            var result = RendimientosModel.ListaUsuarios();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }


        [HttpGet]
        public ActionResult MostrarRendimiento(int id, int ventas, int cobranzas, DateTime fechadesde, DateTime fechahasta, int tiponegocio, string metodoPago, int IdCuentaBancaria, int ComprobantesEnviados)
        {
            if (HttpContext != null && HttpContext.Server != null)
                HttpContext.Server.ScriptTimeout = 600;

            var result = RendimientosModel.MostrarRendimiento(id, ventas, cobranzas, fechadesde, fechahasta, tiponegocio, metodoPago, IdCuentaBancaria, ComprobantesEnviados)
                         ?? new List<VMRendimiento>();
            var kpis = RendimientosModel.CalcularKpis(result);

            var json = Json(new { data = result, kpis }, JsonRequestBehavior.AllowGet);
            json.MaxJsonLength = int.MaxValue;
            return json;
        }


        [HttpGet]
        public ActionResult ObtenerImagen(int id, string origen)
        {
            var result = RendimientosModel.ObtenerImagen(id, origen);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult MostrarClientesAusentes(DateTime fechadesde, DateTime fechahasta)
        {


            var result = RendimientosModel.MostrarClientesAusentes(fechadesde, fechahasta);

            var json = Json(new { data = result }, JsonRequestBehavior.AllowGet);
            json.MaxJsonLength = int.MaxValue;
            return json;
        }

        public ActionResult MostrarCantidadClientesAusentes()
        {
            int cantidad = RendimientosModel.MostrarCantidadClientesAusentes();
            return Json(new { cantidad = cantidad }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult MostrarCantidadComprobantes()
        {
            int cantidad = RendimientosModel.MostrarCantidadComprobantes();
            return Json(new { cantidad = cantidad }, JsonRequestBehavior.AllowGet);
        }



        public async Task<ActionResult> ListarVentas(int idVendedor, int tipoNegocio)
        {
            var result = VentasModel.ListaVentas(idVendedor, tipoNegocio);

            var json = Json(new { data = result }, JsonRequestBehavior.AllowGet);
            json.MaxJsonLength = 999999999;
            return json;
        }




        [HttpGet]
        public ActionResult MostrarRendimientoGeneral(DateTime fechadesde, DateTime fechahasta) 
        {
            {

                var resultRendimiento = RendimientosModel.MostrarRendimientoGeneral(fechadesde, fechahasta);
                var resultCobrado = RendimientosModel.MostrarCobrado(fechadesde, fechahasta);
                var resultClientesAusentes = RendimientosModel.MostrarClientesAusentes(fechadesde, fechahasta);

                var result = new Dictionary<string, object>();
                result.Add("Rendimiento", resultRendimiento);
                result.Add("Cobrado", resultCobrado);
                result.Add("ClientesAusentes", resultClientesAusentes);
                var json = Json(result, JsonRequestBehavior.AllowGet);
                json.MaxJsonLength = int.MaxValue;
                return json;
            }

        }
    }
}