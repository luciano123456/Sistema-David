using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.Modelo;
using Sistema_David.Realtime;
using System;
using System.Collections.Generic;
using System.Web.Mvc;

namespace Sistema_David.Controllers
{
    [Authorize]
    [CheckBloqueoSistema]
    public class PendientesController : Controller
    {
        public ActionResult Index(int? id)
        {
            if (!PuedeAcceder())
            {
                ViewData["ErrorPermisos"] = "No puedes acceder a esta pantalla";
                return View();
            }

            var sesion = SessionHelper.GetUsuarioSesion();
            ViewBag.EsAdmin = sesion != null && sesion.IdRol == 1;
            ViewBag.IdUsuario = sesion != null ? sesion.Id : 0;
            ViewBag.IdAbrir = id ?? 0;
            return View();
        }

        [HttpPost]
        public ActionResult Listar(VMPendienteFiltro filtro)
        {
            if (!PuedeAcceder())
                return Json(new { data = new List<VMPendienteLista>() }, JsonRequestBehavior.AllowGet);

            try
            {
                var data = PendientesModel.Listar(filtro);
                var json = Json(new { data = data }, JsonRequestBehavior.AllowGet);
                json.MaxJsonLength = int.MaxValue;
                return json;
            }
            catch (Exception ex)
            {
                return Json(new { data = new List<VMPendienteLista>(), error = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public ActionResult Detalle(int id)
        {
            if (!PuedeAcceder())
                return Json(new { ok = false }, JsonRequestBehavior.AllowGet);

            var data = PendientesModel.Detalle(id);
            return Json(new { ok = data != null, data = data }, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public ActionResult Guardar(VMPendienteGuardar model)
        {
            if (!PuedeAcceder())
                return Json(new { ok = false, mensaje = "Sin permiso." });

            try
            {
                var id = PendientesModel.Guardar(model, IdUsuario());
                return Json(new { ok = true, id = id, mensaje = "Actividad guardada." });
            }
            catch (Exception ex)
            {
                return Json(new { ok = false, mensaje = ex.Message });
            }
        }

        [HttpPost]
        public ActionResult AgregarObservacion(VMPendienteObservacionNueva model)
        {
            if (!PuedeAcceder())
                return Json(new { ok = false, mensaje = "Sin permiso." });

            var ok = PendientesModel.AgregarObservacion(model != null ? model.Id : 0, model != null ? model.Texto : null, IdUsuario());
            return Json(new { ok = ok, mensaje = ok ? "Observación agregada." : "No se pudo agregar la observación." });
        }

        [HttpPost]
        public ActionResult EliminarObservacion(int id)
        {
            if (!EsAdmin())
                return Json(new { ok = false, mensaje = "Solo el administrador puede eliminar comentarios." });

            var ok = PendientesModel.EliminarObservacion(id);
            return Json(new { ok = ok, mensaje = ok ? "Comentario eliminado." : "No se pudo eliminar el comentario." });
        }

        [HttpPost]
        public ActionResult Solucionar(VMPendienteSolucion model)
        {
            if (!PuedeAcceder())
                return Json(new { ok = false, mensaje = "Sin permiso." });

            try
            {
                PendientesModel.Solucionar(model != null ? model.Id : 0, model != null ? model.Solucion : null, IdUsuario());
                return Json(new { ok = true, mensaje = "Actividad solucionada." });
            }
            catch (Exception ex)
            {
                return Json(new { ok = false, mensaje = ex.Message });
            }
        }

        [HttpPost]
        public ActionResult Reabrir(int id)
        {
            if (!EsAdmin())
                return Json(new { ok = false, mensaje = "Solo el administrador puede reabrir." });

            var ok = PendientesModel.Reabrir(id, IdUsuario());
            return Json(new { ok = ok, mensaje = ok ? "Actividad reabierta." : "No se pudo reabrir." });
        }

        [HttpGet]
        public ActionResult UsuariosModulo()
        {
            if (!PuedeAcceder())
                return Json(new { data = new List<VMPendienteUsuario>() }, JsonRequestBehavior.AllowGet);

            return Json(new { data = PendientesModel.UsuariosModulo() }, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public ActionResult Vendedores()
        {
            if (!PuedeAcceder())
                return Json(new { data = new List<VMPendienteUsuario>() }, JsonRequestBehavior.AllowGet);

            return Json(new { data = PendientesModel.Vendedores() }, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public ActionResult BuscarClientes(string q)
        {
            if (!PuedeAcceder())
                return Json(new { data = new List<VMPendienteCliente>() }, JsonRequestBehavior.AllowGet);

            return Json(new { data = PendientesModel.BuscarClientes(q) }, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public ActionResult Contador()
        {
            if (!PuedeAcceder())
                return Json(new { cantidad = 0 }, JsonRequestBehavior.AllowGet);

            return Json(new { cantidad = PendientesModel.ContarAsignadas(IdUsuario()) }, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public ActionResult ListaAlertasNavbar()
        {
            if (!PuedeAcceder())
                return Json(new { cantidad = 0, data = new List<VMNavbarAlerta>() }, JsonRequestBehavior.AllowGet);

            var data = PendientesModel.ListaAlertasNavbar(IdUsuario()) ?? new List<VMNavbarAlerta>();
            var json = Json(new { cantidad = data.Count, data = data }, JsonRequestBehavior.AllowGet);
            json.MaxJsonLength = int.MaxValue;
            return json;
        }

        [HttpPost]
        public ActionResult SubirAdjuntos(int id)
        {
            if (!PuedeAcceder())
                return Json(new { ok = false, mensaje = "Sin permiso." });

            var resultado = PendientesModel.GuardarAdjuntos(id, Request.Files, IdUsuario());
            return Json(new { ok = resultado.Ok, mensaje = resultado.Mensaje, data = resultado.Items });
        }

        [HttpPost]
        public ActionResult EliminarAdjunto(int id)
        {
            if (!PuedeAcceder())
                return Json(new { ok = false });

            return Json(new { ok = PendientesModel.EliminarAdjunto(id) });
        }

        [HttpGet]
        public ActionResult VerAdjunto(int id)
        {
            if (!PuedeAcceder())
                return HttpNotFound();

            string ruta, contentType, nombre;
            if (!PendientesModel.TryAbrirAdjunto(id, out ruta, out contentType, out nombre))
                return HttpNotFound();

            if ((contentType ?? "").StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                return File(ruta, contentType);

            return File(ruta, contentType, nombre);
        }

        [HttpPost]
        public ActionResult DetenerAlarma(int idDestinatario)
        {
            if (!PuedeAcceder())
                return Json(new { ok = false });

            var ok = PendientesModel.DetenerAlarma(idDestinatario, IdUsuario());
            if (ok)
            {
                TiempoReal.AlarmaCancelada(IdUsuario(), idDestinatario);
                PendientesAlarmaScheduler.Reprogramar();
            }
            return Json(new { ok = ok });
        }

        [HttpPost]
        public ActionResult PosponerAlarma(int idDestinatario, int minutos)
        {
            if (!PuedeAcceder())
                return Json(new { ok = false });

            try
            {
                var alarma = PendientesModel.Posponer(idDestinatario, IdUsuario(), minutos);
                if (alarma != null)
                {
                    TiempoReal.AlarmaCancelada(IdUsuario(), idDestinatario);
                    TiempoReal.AlarmaProgramada(IdUsuario(), alarma);
                    PendientesAlarmaScheduler.Reprogramar();
                }
                return Json(new { ok = alarma != null, data = alarma });
            }
            catch (Exception ex)
            {
                return Json(new { ok = false, mensaje = ex.Message });
            }
        }

        [HttpPost]
        public ActionResult PosponerAlarmaHasta(int idDestinatario, DateTime hasta)
        {
            if (!PuedeAcceder())
                return Json(new { ok = false });

            try
            {
                var alarma = PendientesModel.PosponerHasta(idDestinatario, IdUsuario(), hasta);
                if (alarma != null)
                {
                    TiempoReal.AlarmaCancelada(IdUsuario(), idDestinatario);
                    TiempoReal.AlarmaProgramada(IdUsuario(), alarma);
                    PendientesAlarmaScheduler.Reprogramar();
                }
                return Json(new { ok = alarma != null, data = alarma });
            }
            catch (Exception ex)
            {
                return Json(new { ok = false, mensaje = ex.Message });
            }
        }

        private static bool PuedeAcceder()
        {
            return SessionHelper.EsAdminOComprobantes();
        }

        private static bool EsAdmin()
        {
            var u = SessionHelper.GetUsuarioSesion();
            return u != null && u.IdRol == 1;
        }

        private static int IdUsuario()
        {
            var u = SessionHelper.GetUsuarioSesion();
            return u != null ? u.Id : 0;
        }
    }
}
