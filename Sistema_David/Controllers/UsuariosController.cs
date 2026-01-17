using Newtonsoft.Json.Linq;
using Sistema_David.Helpers;
using Sistema_David.Models;
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
    [CheckBloqueoSistema]
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

        public ActionResult ListarTipoNegocio()
        {
            try
            {
                // Esto asume que UsuariosModel.ListaTipoNegocio() retorna entidades con Id y Nombre.
                var tipos = UsuariosModel.ListaTipoNegocio()
                    .Select(t => new VMTiposNegocio
                    {
                        Id = t.Id,
                        Nombre = t.Nombre
                    })
                    .OrderBy(t => t.Nombre) // opcional: ordenado alfabético
                    .ToList();

                return Json(new { data = tipos }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                // Nunca devuelvas null: la UI espera { data: [] }
                return Json(new { data = new List<VMTiposNegocio>(), error = "No se pudo obtener tipos de negocio." },
                            JsonRequestBehavior.AllowGet);
            }
        }

        public ActionResult BuscarTipoNegocio(int id)
        {
            var result = UsuariosModel.BuscarTipoNegocio(id);

            VMTiposNegocio tipoNegocio = new VMTiposNegocio();

            tipoNegocio.Id = result.Id;
            tipoNegocio.Nombre = result.Nombre;
            tipoNegocio.DiasVencimiento = (int)result.DiasVencimiento;

            return Json(new { data = tipoNegocio }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult CambiarDiasVencimientoNegocio(int id, int valor)
        {
            var result = UsuariosModel.CambiarDiasVencimientoNegocio(id, valor);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

     
        public ActionResult ListarUserActivos()
        {
            var result = UsuariosModel.ListaActivos();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }


        public ActionResult ListarActivos(int TipoNegocio)
        {
            var result = UsuariosModel.ListaUsuariosActivos(TipoNegocio);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ListaUsuariosConAsignacionActivos()
        {
            var result = UsuariosModel.ListaUsuariosConAsignacionActivos();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }


        public ActionResult setVistaStock(int id, int stock)
        {
            try
            {

                var result = UsuariosModel.setVistaStock(id, stock);

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


        public ActionResult BloqueoSistema(int id, int bloqueo)
        {
            try
            {

                var result = UsuariosModel.BloqueoSistema(id, bloqueo);

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
        public ActionResult ListarCobradores()
        {
            List<VMUser> cobradores;

            if(SessionHelper.GetUsuarioSesion() != null && (SessionHelper.GetUsuarioSesion().IdRol == 1 || SessionHelper.GetUsuarioSesion().IdRol == 4))
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
                // Esto asume que UsuariosModel.ListaTipoNegocio() retorna entidades con Id y Nombre.
                var tiposnegocios = UsuariosModel.ListaTipoNegocio()
                    .Select(t => new VMTiposNegocio
                    {
                        Id = t.Id,
                        Nombre = t.Nombre
                    })
                    .OrderBy(t => t.Nombre) // opcional: ordenado alfabético
                    .ToList();


                var result = new Dictionary<string, object>();
                result.Add("Usuario", usuario);
                result.Add("Roles", roles);
                result.Add("Estados", estados);
                result.Add("TiposNegocios", tiposnegocios);
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
        public ActionResult Nuevo(VMUser model)
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
        public ActionResult Modificar(VMUser model)
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