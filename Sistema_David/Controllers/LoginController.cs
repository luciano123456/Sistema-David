using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.Modelo;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;

namespace Sistema_David.Controllers
{
    public class LoginController : Controller
    {
        // GET: Login
        [AllowAnonymous]
        public ActionResult Index(string mensajeBloqueo)
        {


            if (!string.IsNullOrEmpty(mensajeBloqueo))
            {
                ViewBag.MensajeBloqueo = mensajeBloqueo;
                LoginModel.Cerrar_Sesion();
                return View();

            }

            if (SessionHelper.GetUsuarioSesion() == null)
            {
                return View();
            } else
            {
                return RedirectToAction("Index", "Ventas");
            }
            
        }

        [AllowAnonymous]
        [HttpPost]
        public ActionResult Login_User(String usuario, string contrasena)
        {
            try
            {


                var result = LoginModel.LoginUsuario(usuario, contrasena);

                if (result != null && result.BloqueoSistema == 1) //BLOQUEADO
                {
                    return Json(new { Status = false, Mensaje = "Tu usuario se encuentra bloqueado en este momento." });
                }

                if (result != null && result.IdEstado != 4) //SI NO ESTA BLOQUEADO
                {
                    FormsAuthentication.SetAuthCookie(usuario, false);
                    SessionHelper.SetUsuarioSesion(result);
                    return Json(new { Status = true, Data = result });


                }
                else if (result != null &&  result.IdEstado == 4) //BLOQUEADO
                {
                    return Json(new { Status = false, Mensaje = "Tu usuario se encuentra bloqueado permanentemente." });
                }
                else
                { 
                    return Json(new { Status = false, Mensaje = "El usuario o la contraseña es incorrecta." });
                }

            }
            catch (Exception ex)
            {
                return Json(new { Status = false, Exception = ex.InnerException.Message }); ;///////////lllll
            }
        }

        [AllowAnonymous]
        [HttpPost]
        public ActionResult CerrarSesion()
        {
            LoginModel.Cerrar_Sesion();
            return Json(new { Status = true });
        }
    }
} //..