using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Sistema_David.Controllers
{

    [Authorize]
    [CheckBloqueoSistema]

    public class ProductosController : Controller
    {
        // GET: Producto


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
            var result = ProductosModel.ListaProductos();

            var json = Json(new { data = result }, JsonRequestBehavior.AllowGet);
            json.MaxJsonLength = 500000000;
            return json;
            
        }

        public ActionResult ObtenerImagen(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var producto = db.Productos.Find(id);

                // Verificar si el producto existe y si tiene una imagen
                if (producto != null && !string.IsNullOrEmpty(producto.Imagen))
                {
                    try
                    {
                        // Si hay una imagen en la base de datos, devolverla
                        return File(Convert.FromBase64String(producto.Imagen), "image/jpeg");
                    }
                    catch (FormatException)
                    {
                        // Si el formato base64 es incorrecto, retornar la imagen predeterminada
                        return File(Server.MapPath("~/Imagenes/productodefault.png"), "image/png");
                    }
                }
                else
                {
                    // Si no hay imagen, retornar la imagen predeterminada
                    return File(Server.MapPath("~/Imagenes/productodefault.png"), "image/png");
                }
            }
        }


        public ActionResult ListarActivos()
        {
            var result = ProductosModel.ListaProductosActivos();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ListarCategorias()
        {
            var result = ProductosModel.ListaCategorias();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public bool GuardarDatos(FileInput Imagenes)
        {
            try
            {
                var result = false;



                if (Imagenes != null)
                {
                    string path = Server.MapPath("~/Uploads/");
                    if (!Directory.Exists(path))
                    {
                        Directory.CreateDirectory(path);
                    }

                    result = ProductosModel.GuardarDatos(Imagenes, path);

                    return result;

                }
                return result;
            }

            catch (Exception e)
            {
                ViewBag.Message = "Upload failed";
                return false;
            }
        }

        public ActionResult Nuevo(Producto model)
        {
            try
            {

                var result = ProductosModel.Nuevo(model);

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

                var result = ProductosModel.Eliminar(id);

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
        public ActionResult EditarInfo(int id)
        {
            try
            {

                var producto = ProductosModel.BuscarProducto(id);
                var categorias = ProductosModel.ListaCategorias();

                var result = new Dictionary<string, object>();
                result.Add("Producto", producto);
                result.Add("Categorias", categorias);
                return Json(result, JsonRequestBehavior.AllowGet);
            }

            catch (Exception ex)
            {
                return Json(null);
            }

        }


        public ActionResult EditarActivo(int id, int activo)
        {
            try
            {

                var result = ProductosModel.EditarActivo(id, activo);

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



        public ActionResult Editar(Producto model)
        {
            try
            {

                var result = ProductosModel.Editar(model);

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