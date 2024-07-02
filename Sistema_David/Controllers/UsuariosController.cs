using Newtonsoft.Json.Linq;
using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Sistema_David.Controllers
{

    [Authorize]
    public class UsuariosController : Controller
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
            var result = UsuariosModel.ListaUsuarios();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ListarActivos()
        {
            var result = UsuariosModel.ListaUsuariosActivos();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ListarCobradores()
        {
            List<User> cobradores;

            if(SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 1)
            {
                cobradores = UsuariosModel.ListaCobradores();
            } else
            {
                cobradores = UsuariosModel.ListaCobradoresId(SessionHelper.GetUsuarioSesion().Id);
            }
           
            return Json(new { data = cobradores }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ListarRoles()
        {
            var result = UsuariosModel.ListaRoles();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public ActionResult EditarInfo(int id)
        {
            try
            {

                

                var usuario = UsuariosModel.BuscarUsuario(id);
                var roles = UsuariosModel.ListaRoles();
                var estados = UsuariosModel.ListaEstados();

                var result = new Dictionary<string, object>();
                result.Add("Usuario", usuario);
                result.Add("Roles", roles);
                result.Add("Estados", estados);
                return Json(result, JsonRequestBehavior.AllowGet);
            }

            catch (Exception ex)
            {
                return Json(null);
            }

        }

        [HttpPost]
        public ActionResult BuscarUsuario(int id)
        {
            try
            {
                var usuario = UsuariosModel.BuscarUsuario(id);
                return Json(usuario, JsonRequestBehavior.AllowGet);
            }

            catch (Exception ex)
            {
                return Json(null);
            }

        }

        public ActionResult NuevoModif(int id)
        {

            if (id > 0)
            {
                var result = UsuariosModel.BuscarUsuario(id);
                 return View(result);
            }
            else
            {
                return View();
            }
        }

        [HttpPost]
        public ActionResult Nuevo(User model)
        {
            try
            {

                var result = UsuariosModel.Nuevo(model);

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

        [HttpPost]
        public ActionResult Eliminar(int id)
        {
            try
            {

                var result = UsuariosModel.Eliminar(id);

              
                    return Json(new { Status = result });
            }
            catch (Exception ex)
            {
                return Json(new { Status = "Ha ocurrido un error" });
            }

        }


        [HttpPost]
        public ActionResult setFechaExportacion()
        {
            try
            {

                var result = UsuariosModel.setFechaExportacion(SessionHelper.GetUsuarioSesion().Id);


                return Json(new { Status = result });
            }
            catch (Exception ex)
            {
                return Json(new { Status = "Ha ocurrido un error" });
            }

        }


        [HttpPost]
        public ActionResult Modificar(User model)
        {

            try
            {

                var result = UsuariosModel.Editar(model);

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