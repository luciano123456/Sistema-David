using Newtonsoft.Json;
using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Principal;
using System.Web;
using System.Web.Mvc;

namespace Sistema_David.Controllers
{
    [Authorize]
    [CheckBloqueoSistema]
    public class PagosController : Controller
    {
        public ActionResult Index() => View();
        public ActionResult NuevoModif(int? id) => View(id);

        // ===== Helpers =====
        private DateTime? ParseSoloFecha(string s)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(s)) return null;
                s = s.Trim();
                if (string.Equals(s, "null", StringComparison.OrdinalIgnoreCase)) return null;
                if (string.Equals(s, "undefined", StringComparison.OrdinalIgnoreCase)) return null;

                var formatos = new[] { "yyyy-MM-dd", "dd/MM/yyyy", "yyyy/MM/dd" };

                if (DateTime.TryParseExact(s, formatos, CultureInfo.InvariantCulture, DateTimeStyles.None, out var exact))
                    return exact.Date;

                if (DateTime.TryParse(s, CultureInfo.CurrentCulture, DateTimeStyles.None, out var any))
                    return any.Date;

                if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out var inv))
                    return inv.Date;

                return null;
            }
            catch { return null; }
        }

        private string SaveUpload(HttpPostedFileBase f, string prefix)
        {
            if (f == null || f.ContentLength <= 0)
                throw new InvalidOperationException("Archivo vacío.");

            // 1) Ruta física preferida (configurable en Web.config)
            // <appSettings>
            //   <add key="UploadsRootPhysical" value="C:\inetpub\Sistema_David\Uploads" />
            // </appSettings>
            var prefRoot = ConfigurationManager.AppSettings["UploadsRootPhysical"];

            // 2) Si no está configurada, uso la del sitio.
            var siteRoot = Server.MapPath("~/Uploads");

            // 3) Elegimos root de trabajo
            var root = !string.IsNullOrWhiteSpace(prefRoot) ? prefRoot : siteRoot;

            // 4) Subcarpeta del módulo
            var folder = Path.Combine(root, "Sueldos");
            Directory.CreateDirectory(folder); // idempotente

            // 5) Nombre seguro + extensión
            var safe = Path.GetFileName(f.FileName) ?? "archivo";
            var ext = Path.GetExtension(safe);
            if (string.IsNullOrWhiteSpace(ext)) ext = ".png"; // fuerza algo válido
            var name = $"{prefix}_{Guid.NewGuid():N}_{DateTime.Now:yyyyMMddHHmmss}{ext}";
            var full = Path.Combine(folder, name);

            // 6) Intento guardar en la ruta física preferida; si falla por permisos, fallback al sitio
            try
            {
                // Log de identidad y path para diagnósticos
                System.Diagnostics.Trace.WriteLine(
                    $"[SaveUpload] User={WindowsIdentity.GetCurrent().Name} Path={full}");

                f.SaveAs(full);

                // URL pública: si tenés un Virtual Directory "Uploads" apuntando a 'root', esto funciona:
                return "/Uploads/Sueldos/" + name;
            }
            catch (UnauthorizedAccessException)
            {
                // Reintento en la carpeta del sitio
                var siteFolder = Path.Combine(siteRoot, "Sueldos");
                Directory.CreateDirectory(siteFolder);
                var siteFull = Path.Combine(siteFolder, name);

                f.SaveAs(siteFull);
                return Url.Content("~/Uploads/Sueldos/" + name);
            }
        }

        // ===== Historial =====
        [HttpGet]
        public ActionResult Historial(int? idVendedor, string desde, string hasta, byte? estado)
        {
            try
            {
                var fDesde = ParseSoloFecha(desde);
                var fHasta = ParseSoloFecha(hasta);

                var lista = PayrollModel.Historial(idVendedor, fDesde, fHasta, estado);
                return Json(new { data = lista }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                return Json(new { error = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // ===== Calcular (preview) =====
        [HttpGet]
        public ActionResult Calcular(int idUsuario, DateTime desde, DateTime hasta)
        {
            try
            {
                var calc = PayrollModel.Calcular(idUsuario, desde, hasta);
                return Json(calc, JsonRequestBehavior.AllowGet);
            }
            catch (InvalidOperationException ex) when (ex.Message.StartsWith("SIN_REGLAS"))
            {
                Response.StatusCode = 400;
                return Json(new { error = "Para calcular un sueldo primero debés crear reglas." }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                return Json(new { error = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // ===== Guardar TODO (cab + det + pagos + firma + asociar pagos Parciales) =====
        [HttpPost]
        public ActionResult GuardarTodo()
        {
            try
            {
                var idStr = Request.Form["id"];
                var calcJson = Request.Form["calcJson"];
                var concepto = Request.Form["concepto"];
                var nota = Request.Form["nota"];
                var pagosJson = Request.Form["pagosJson"];
                var pagosParcialesIdsJson = Request.Form["pagosParcialesIdsJson"];  // <-- NUEVO

                var calc = JsonConvert.DeserializeObject<VMSueldoCalc>(calcJson ?? "{}");

                var pagos = string.IsNullOrWhiteSpace(pagosJson)
                    ? new List<VMPagoInput>()
                    : JsonConvert.DeserializeObject<List<VMPagoInput>>(pagosJson);

                var pagosParcialesIds = string.IsNullOrWhiteSpace(pagosParcialesIdsJson)
                    ? new List<int>()
                    : JsonConvert.DeserializeObject<List<int>>(pagosParcialesIdsJson);

                string rutaFirma = null;
                var firma = Request.Files["comprobanteFirma"];
                if (firma != null && firma.ContentLength > 0)
                    rutaFirma = SaveUpload(firma, "firma");

                int? idSueldo = null;
                if (int.TryParse(idStr, out var tmp) && tmp > 0) idSueldo = tmp;

                var id = PayrollModel.GuardarOActualizarCabConPagos(
                    idSueldo, calc, concepto, nota, pagos, rutaFirma, pagosParcialesIds
                );

                return Json(new { ok = id > 0, id });
            }
            catch (Exception ex)
            {
                return Json(new { ok = false, error = ex.Message });
            }
        }

        // ===== Obtener =====
        [HttpGet]
        public ActionResult Obtener(int id)
        {
            try
            {
                var data = PayrollModel.Obtener(id);
                return Json(data, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                return Json(new { error = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // ===== Reglas =====
        [HttpGet]
        public ActionResult ListarReglas(byte tipo, int? idTipoNegocio)
        {
            try
            {
                int? tn = (idTipoNegocio.HasValue && idTipoNegocio.Value <= 0) ? (int?)null : idTipoNegocio;
                var data = PayrollModel.ListarReglas(tipo, tn);
                return Json(data, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                return Json(new { ok = false, error = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public ActionResult GuardarRegla(VMRegla r)
        {
            try { return Json(PayrollModel.GuardarRegla(r)); }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                return Json(new { ok = false, error = ex.Message });
            }
        }

        [HttpPost]
        public ActionResult EliminarRegla(int id)
        {
            try { return Json(PayrollModel.EliminarRegla(id)); }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                return Json(new { ok = false, error = ex.Message });
            }
        }

        // ===== Pagos Parciales (parciales) =====
        [HttpGet]
        public ActionResult PagosParcialesListar(int idUsuario, DateTime desde, DateTime hasta, bool soloSinAsignar = true)
        {
            try
            {
                var list = PayrollModel.PagosParcialesListar(idUsuario, desde, hasta, soloSinAsignar);
                return Json(list, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                return Json(new { ok = false, error = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

    

        [HttpPost]
        public ActionResult GuardarPagoSuelto(int idUsuario, DateTime fecha, decimal importe, string metodo, string nota)
        {
            try
            {
                var ok = PayrollModel.GuardarPagoSuelto(idUsuario, fecha, metodo, importe, nota);
                return Json(new { ok });
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                return Json(new { ok = false, error = ex.Message });
            }
        }

        // PagosController.cs
        [HttpPost]
        public ActionResult Eliminar(int id)
        {
            try
            {
                var ok = PayrollModel.EliminarSueldo(id);
                return Json(new { ok });
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                return Json(new { ok = false, error = ex.Message });
            }
        }


        [HttpPost]
        public ActionResult EliminarPagoSuelto(int id)
        {
            try
            {
                var ok = PayrollModel.EliminarPagoSuelto(id);
                return Json(new { ok });
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                return Json(new { ok = false, error = ex.Message });
            }
        }

        // ===== Pago suelto directo (legacy) =====
        [HttpPost]
        public ActionResult RegistrarPago(int idSueldo, DateTime fecha, string metodo, decimal importe, string nota)
        {
            try
            {
                var ok = PayrollModel.RegistrarPago(idSueldo, fecha, metodo, importe, nota, null);
                return Json(new { ok });
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                return Json(new { ok = false, error = ex.Message });
            }
        }
    }
}
