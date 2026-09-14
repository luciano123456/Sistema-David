using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Net.Http.Headers;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
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
            var sesion = SessionHelper.GetUsuarioSesion();
            if (!SessionHelper.EsAdminOComprobantes())
            {
                ViewData["ErrorPermisos"] = "No puedes acceder a esta pantalla";
                return View();
            }

            ViewBag.ErrorPermisos = null;
            ViewBag.EsAdmin = sesion != null && sesion.IdRol == 1;
            ViewBag.EsComprobante = sesion != null && sesion.IdRol == 4;
            return View();
        }

        private static Usuarios UsuarioActual()
        {
            return SessionHelper.GetUsuarioSesion();
        }

        private static bool EsAdmin()
        {
            return UsuarioActual()?.IdRol == 1;
        }

        private static bool EsComprobante()
        {
            return UsuarioActual()?.IdRol == 4;
        }

        public ActionResult ObtenerDetalle(int id)
        {
            var producto = ProductosModel.BuscarProducto(id);
            if (producto == null)
                return Json(new { Status = false }, JsonRequestBehavior.AllowGet);

            var categorias = ProductosModel.ListaCategorias();
            return Json(new { Status = true, Producto = producto, Categorias = categorias }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult BuscarClientesWsp(string nombre, string dni)
        {
            var sesion = SessionHelper.GetUsuarioSesion();
            int idVendedor = -1;

            if (sesion != null && sesion.IdRol == 2)
                idVendedor = sesion.Id;

            var clientes = ProductosModel.BuscarClientesParaWhatsapp(nombre, dni, idVendedor);
            return Json(new { data = clientes }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult Listar()
        {
            try
            {
                var result = ProductosModel.ListaProductos();
                var totalStock = ProductosModel.TotalDineroEnStock();
                var data = result.Select(x => new
                {
                    x.Id,
                    x.Codigo,
                    x.Nombre,
                    x.idCategoria,
                    x.Categoria,
                    x.Stock,
                    x.PrecioCompra,
                    x.PrecioVenta,
                    x.PorcVenta,
                    x.Total,
                    x.DiasVencimiento,
                    x.Activo,
                    x.Marca,
                    x.TieneImagen,
                    x.TienePendiente,
                    x.IdSolicitudPendiente
                }).ToList();
                var json = Json(new { data, totalStock }, JsonRequestBehavior.AllowGet);
                json.MaxJsonLength = int.MaxValue;
                return json;
            }
            catch (Exception)
            {
                Response.StatusCode = 200;
                var json = Json(new
                {
                    data = new object[0],
                    totalStock = 0m,
                    error = "No se pudieron cargar los productos. Intentá de nuevo."
                }, JsonRequestBehavior.AllowGet);
                json.MaxJsonLength = int.MaxValue;
                return json;
            }
        }

        [HttpGet]
        public ActionResult ObtenerImagen(int id)
        {
            try
            {
                byte[] bytes;
                string mime;
                if (!ProductosModel.ObtenerImagenBytes(id, out bytes, out mime) || bytes == null || bytes.Length == 0)
                    return ImagenProductoPorDefecto(cacheLong: false);

                Response.Cache.SetCacheability(HttpCacheability.Public);
                Response.Cache.SetMaxAge(TimeSpan.FromDays(7));
                Response.Cache.SetExpires(DateTime.Now.AddDays(7));
                return File(bytes, mime ?? "image/jpeg");
            }
            catch (Exception)
            {
                return ImagenProductoPorDefecto(cacheLong: false);
            }
        }

        private FileResult ImagenProductoPorDefecto(bool cacheLong)
        {
            if (cacheLong)
            {
                Response.Cache.SetCacheability(HttpCacheability.Public);
                Response.Cache.SetMaxAge(TimeSpan.FromDays(30));
                Response.Cache.SetExpires(DateTime.Now.AddDays(30));
            }
            else
            {
                Response.Cache.SetCacheability(HttpCacheability.Private);
                Response.Cache.SetMaxAge(TimeSpan.FromSeconds(30));
            }
            var path = Server.MapPath("~/Imagenes/productodefault.png");
            if (System.IO.File.Exists(path))
                return File(path, "image/png");

            var tiny = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=");
            return File(tiny, "image/png");
        }

        [HttpPost]
        public ActionResult AgregarStockCantidad()
        {
            return MutarStock(true);
        }

        [HttpPost]
        public ActionResult RestarStockCantidad()
        {
            return MutarStock(false);
        }

        private ActionResult MutarStock(bool sumar)
        {
            try
            {
                var body = LeerJson<JObject>() ?? new JObject();
                int id = JsonEntero(body, "Id", "id");
                int cantidad = JsonEntero(body, "Cantidad", "cantidad");
                bool overwrite = JsonBool(body, "ConfirmOverwrite", "confirmOverwrite");

                var user = UsuarioActual();
                if (user == null) return Json(new { Status = false, Mensaje = "Sesión inválida." });
                if (id <= 0) return Json(new { Status = false, Mensaje = "Producto inválido." });

                if (EsComprobante())
                    return Json(ProductosCambiosModel.SolicitarStock(id, cantidad, sumar, user.Id, overwrite));

                var antes = ProductosModel.BuscarProducto(id);
                var result = sumar ? ProductosModel.SumarStock(id, cantidad) : ProductosModel.RestarStock(id, cantidad);
                if (result)
                {
                    ProductosCambiosModel.RegistrarCambioDirecto("Stock", antes, ProductosModel.BuscarProducto(id), user.Id);
                }
                return Json(new { Status = result });
            }
            catch (Exception)
            {
                return Json(new { Status = false });
            }
        }

        public ActionResult ListarActivos()
        {
            var result = ProductosModel.ListaProductosActivos();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ListarActivosConStock()
        {
            var result = ProductosModel.ListaProductosActivosConStock();
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

        [HttpPost]
        public ActionResult Nuevo()
        {
            try
            {
                var model = LeerProductoDesdeRequest();
                if (model == null)
                    return Json(new { Status = false, Mensaje = "No se recibieron datos del producto." });

                if (string.IsNullOrWhiteSpace(model.Nombre))
                    return Json(new { Status = false, Mensaje = "Ingresá el nombre del producto." });

                var user = UsuarioActual();
                if (user == null)
                    return Json(new { Status = false, Mensaje = "Sesión inválida." });

                if (EsComprobante())
                    return Json(ProductosCambiosModel.SolicitarNuevo(model, user.Id));

                var result = ProductosModel.Nuevo(model);
                if (result)
                {
                    ProductosCambiosModel.RegistrarCambioDirecto("Nuevo", null, model, user.Id);
                    return Json(new { Status = true });
                }

                return Json(new { Status = false, Mensaje = "No se pudo registrar el producto. Revisá los datos e intentá de nuevo." });
            }
            catch (Exception)
            {
                return Json(new { Status = false, Mensaje = "No se pudo registrar el producto. Revisá los datos e intentá de nuevo." });
            }
        }

        [HttpPost]
        public ActionResult Eliminar()
        {
            try
            {
                var body = LeerJson<JObject>() ?? new JObject();
                int id = JsonEntero(body, "Id", "id");
                bool overwrite = JsonBool(body, "ConfirmOverwrite", "confirmOverwrite");

                var user = UsuarioActual();
                if (user == null) return Json(new { Status = false });
                if (id <= 0) return Json(new { Status = false, Mensaje = "Producto inválido." });

                if (EsComprobante())
                    return Json(ProductosCambiosModel.SolicitarEliminar(id, user.Id, overwrite));

                var stock = StockModel.ObtenerUsuariosConProductoEnStock(id);

                if (stock != null && stock.Any())
                {
                    var mensaje = $"No puedes eliminar este producto ya que lo tienen {stock.Count} vendedores:";
                    var detalle = stock
                        .Select(x => $"- {x.Usuario} ({x.Cantidad}) ${x.PrecioVenta}")
                        .ToList();

                    return Json(new
                    {
                        Status = false,
                        TieneStock = true,
                        Mensaje = mensaje,
                        Detalle = detalle
                    });
                }


                var antes = ProductosModel.BuscarProducto(id);
                var result = ProductosModel.Eliminar(id);
                if (result)
                {
                    ProductosCambiosModel.RegistrarCambioDirecto("Eliminar", antes, null, user.Id);
                }

                return Json(new { Status = result });
            }
            catch (Exception ex)
            {
                return Json(new { Status = false });
            }
        }


        [HttpPost]
        public ActionResult EditarInfo()
        {
            try
            {
                var body = LeerJson<JObject>() ?? new JObject();
                int id = JsonEntero(body, "Id", "id");
                if (id <= 0) int.TryParse(Request["id"], out id);
                var producto = ProductosModel.BuscarProducto(id);
                if (producto == null)
                    return Json(new { Status = false, Mensaje = "No se pudo cargar el producto. Intentá de nuevo." });

                var categorias = ProductosModel.ListaCategorias();

                var result = new Dictionary<string, object>();
                result.Add("Status", true);
                result.Add("Producto", producto);
                result.Add("Categorias", categorias);
                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch (Exception)
            {
                return Json(new { Status = false, Mensaje = "No se pudo cargar el producto. Intentá de nuevo." });
            }
        }


        [HttpPost]
        public ActionResult EditarActivo()
        {
            try
            {
                var body = LeerJson<JObject>() ?? new JObject();
                int id = JsonEntero(body, "id", "Id");
                int activo = JsonEntero(body, "activo", "Activo");
                bool overwrite = JsonBool(body, "ConfirmOverwrite", "confirmOverwrite");
                if (id <= 0)
                {
                    int.TryParse(Request["id"], out id);
                    int.TryParse(Request["activo"], out activo);
                }

                var user = UsuarioActual();
                if (user == null) return Json(new { Status = false, Mensaje = "Sesión inválida." });
                if (id <= 0) return Json(new { Status = false, Mensaje = "Producto inválido." });

                if (EsComprobante())
                    return Json(ProductosCambiosModel.SolicitarActivo(id, activo, user.Id, overwrite));

                var antes = ProductosModel.BuscarProducto(id);
                var result = ProductosModel.EditarActivo(id, activo);
                if (result)
                {
                    ProductosCambiosModel.RegistrarCambioDirecto("Activo", antes, ProductosModel.BuscarProducto(id), user.Id);
                }

                return Json(new { Status = result, Mensaje = result ? null : "No se pudo cambiar el estado. Intentá de nuevo." });
            }
            catch (Exception)
            {
                return Json(new { Status = false, Mensaje = "No se pudo cambiar el estado. Intentá de nuevo." });
            }
        }

        [HttpPost]
        public ActionResult ActualizarImagen()
        {
            try
            {
                var body = LeerJson<JObject>() ?? new JObject();
                int id = JsonEntero(body, "id", "Id");
                bool overwrite = JsonBool(body, "ConfirmOverwrite", "confirmOverwrite");
                var imagen = JsonTexto(body, "imagen", "Imagen");

                var user = UsuarioActual();
                if (user == null) return Json(new { Status = false, Mensaje = "Sesión inválida." });
                if (id <= 0) return Json(new { Status = false, Mensaje = "Producto inválido." });
                if (string.IsNullOrWhiteSpace(imagen))
                    return Json(new { Status = false, Mensaje = "Elegí una imagen." });

                if (EsComprobante())
                {
                    var actual = ProductosModel.BuscarProducto(id);
                    if (actual == null)
                        return Json(new { Status = false, Mensaje = "No se encontró el producto." });

                    actual.Imagen = imagen;
                    actual.ConfirmOverwrite = overwrite;
                    return Json(ProductosCambiosModel.SolicitarEditar(actual, user.Id, true));
                }

                if (!EsAdmin())
                    return Json(new { Status = false, Mensaje = "No tenés permiso para cambiar la imagen." });

                var antes = ProductosModel.BuscarProducto(id);
                var result = ProductosModel.ActualizarImagen(id, imagen);
                if (result)
                {
                    var despues = ProductosModel.BuscarProducto(id);
                    ProductosCambiosModel.RegistrarCambioDirecto("Editar", antes, despues, user.Id);
                    return Json(new { Status = true });
                }

                return Json(new { Status = false, Mensaje = "No se pudo guardar la imagen. Intentá de nuevo." });
            }
            catch (Exception)
            {
                return Json(new { Status = false, Mensaje = "No se pudo guardar la imagen. Intentá de nuevo." });
            }
        }

        [HttpPost]
        public ActionResult Editar()
        {
            try
            {
                var model = LeerProductoDesdeRequest();
                if (model == null || model.Id <= 0)
                    return Json(new { Status = false, Mensaje = "Producto inválido." });

                if (string.IsNullOrWhiteSpace(model.Nombre))
                    return Json(new { Status = false, Mensaje = "Ingresá el nombre del producto." });

                var user = UsuarioActual();
                if (user == null)
                    return Json(new { Status = false, Mensaje = "Sesión inválida." });

                if (EsComprobante())
                    return Json(ProductosCambiosModel.SolicitarEditar(model, user.Id, true));

                var antes = ProductosModel.BuscarProducto(model.Id);
                var result = ProductosModel.Editar(model);
                if (result)
                {
                    ProductosCambiosModel.RegistrarCambioDirecto("Editar", antes, model, user.Id);
                    return Json(new { Status = true });
                }

                return Json(new { Status = false, Mensaje = "No se pudo guardar el producto. Intentá otra vez." });
            }
            catch (Exception)
            {
                return Json(new { Status = false, Mensaje = "No se pudo guardar el producto. Intentá otra vez." });
            }
        }

        public ActionResult ContarPendientes()
        {
            try
            {
                var user = UsuarioActual();
                if (user == null || user.IdRol != 1)
                    return Json(new { Status = false, Count = 0 }, JsonRequestBehavior.AllowGet);

                var count = ProductosCambiosModel.ContarPendientes(user.IdRol ?? 0, user.Id);
                return Json(new { Status = true, Count = count }, JsonRequestBehavior.AllowGet);
            }
            catch
            {
                return Json(new { Status = false, Count = 0 }, JsonRequestBehavior.AllowGet);
            }
        }

        public ActionResult ListarPendientes()
        {
            var user = UsuarioActual();
            if (user == null || user.IdRol != 1)
                return Json(new { data = new List<VMProductoSolicitud>() }, JsonRequestBehavior.AllowGet);

            var data = ProductosCambiosModel.ListarPendientes(user.IdRol ?? 0, user.Id);
            var json = Json(new { data }, JsonRequestBehavior.AllowGet);
            json.MaxJsonLength = int.MaxValue;
            return json;
        }

        public ActionResult DetallePendiente(int id)
        {
            var user = UsuarioActual();
            if (user == null || user.IdRol != 1)
                return Json(new { Status = false }, JsonRequestBehavior.AllowGet);

            var row = ProductosCambiosModel.ObtenerSolicitud(id);
            if (row == null)
                return Json(new { Status = false }, JsonRequestBehavior.AllowGet);

            if (user.IdRol == 4 && row.IdUsuarioSolicita != user.Id)
                return Json(new { Status = false, Mensaje = "No tenés permiso para ver esta solicitud." }, JsonRequestBehavior.AllowGet);

            return Json(new { Status = true, Solicitud = row }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ImagenSolicitud(int id, string lado = "despues", int extra = -1)
        {
            var user = UsuarioActual();
            if (user == null || user.IdRol != 1)
                return new HttpStatusCodeResult(403);

            string mime;
            var bytes = ProductosCambiosModel.ObtenerImagenSolicitud(id, lado, extra, out mime);
            if (bytes == null || bytes.Length == 0)
                return ImagenProductoPorDefecto(false);

            return File(bytes, mime ?? "image/jpeg");
        }

        [HttpPost]
        public ActionResult AceptarPendiente(VMResolverPendiente model)
        {
            if (!EsAdmin())
                return Json(new { Status = false, Mensaje = "Solo el administrador puede aceptar cambios." });

            if (model == null || model.Id <= 0)
                return Json(new { Status = false, Mensaje = "Solicitud inválida." });

            var result = ProductosCambiosModel.Aceptar(model.Id, UsuarioActual().Id, model.Comentario);
            return Json(result);
        }

        [HttpPost]
        public ActionResult RechazarPendiente(VMResolverPendiente model)
        {
            if (!EsAdmin())
                return Json(new { Status = false, Mensaje = "Solo el administrador puede rechazar cambios." });

            if (model == null || model.Id <= 0)
                return Json(new { Status = false, Mensaje = "Solicitud inválida." });

            var result = ProductosCambiosModel.Rechazar(model.Id, UsuarioActual().Id, model.Comentario);
            return Json(result);
        }

        [HttpPost]
        public ActionResult AceptarPendientes(VMResolverPendientes model)
        {
            if (!EsAdmin())
                return Json(new { Status = false, Mensaje = "Solo el administrador puede aceptar cambios." });

            if (model == null || model.Ids == null || model.Ids.Count == 0)
                model = LeerJson<VMResolverPendientes>() ?? model;

            if (model == null || model.Ids == null || model.Ids.Count == 0)
                return Json(new { Status = false, Mensaje = "No hay solicitudes seleccionadas." });

            var result = ProductosCambiosModel.AceptarVarios(model.Ids, UsuarioActual().Id, model.Comentario);
            return Json(result);
        }

        [HttpPost]
        public ActionResult RechazarPendientes(VMResolverPendientes model)
        {
            if (!EsAdmin())
                return Json(new { Status = false, Mensaje = "Solo el administrador puede rechazar cambios." });

            if (model == null || model.Ids == null || model.Ids.Count == 0)
                model = LeerJson<VMResolverPendientes>() ?? model;

            if (model == null || model.Ids == null || model.Ids.Count == 0)
                return Json(new { Status = false, Mensaje = "No hay solicitudes seleccionadas." });

            var result = ProductosCambiosModel.RechazarVarios(model.Ids, UsuarioActual().Id, model.Comentario);
            return Json(result);
        }

        [HttpPost]
        public ActionResult AccionMasiva(VMProductoAccionMasiva model)
        {
            try
            {
                var user = UsuarioActual();
                if (user == null)
                    return Json(new { Status = false, Mensaje = "Sesión inválida." });

                if (model == null || model.Ids == null || model.Ids.Count == 0)
                    model = LeerJson<VMProductoAccionMasiva>() ?? model;

                if (!EsAdmin())
                    return Json(new { Status = false, Mensaje = "La acción masiva solo está disponible para el administrador." });

                if (model == null || model.Ids == null || model.Ids.Count == 0)
                    return Json(new { Status = false, Mensaje = "No hay productos seleccionados." });

                var accion = (model.Accion ?? "").Trim().ToLowerInvariant();
                if (accion != "activar" && accion != "desactivar" && accion != "eliminar")
                    return Json(new { Status = false, Mensaje = "Acción inválida." });

                var ids = model.Ids.Where(x => x > 0).Distinct().ToList();
                int ok = 0;
                int fallidos = 0;
                var detalle = new List<string>();

                foreach (var id in ids)
                {
                    try
                    {
                        if (accion == "eliminar")
                        {
                            var stock = StockModel.ObtenerUsuariosConProductoEnStock(id);
                            if (stock != null && stock.Any())
                            {
                                fallidos++;
                                if (detalle.Count < 3)
                                    detalle.Add("Hay vendedores con stock de uno de los productos.");
                                continue;
                            }
                            var antes = ProductosModel.BuscarProducto(id);
                            var result = ProductosModel.Eliminar(id);
                            if (result)
                            {
                                ProductosCambiosModel.RegistrarCambioDirecto("Eliminar", antes, null, user.Id);
                                ok++;
                            }
                            else fallidos++;
                        }
                        else
                        {
                            var activo = accion == "activar" ? 1 : 0;
                            var antes = ProductosModel.BuscarProducto(id);
                            var result = ProductosModel.EditarActivo(id, activo);
                            if (result)
                            {
                                ProductosCambiosModel.RegistrarCambioDirecto("Activo", antes, ProductosModel.BuscarProducto(id), user.Id);
                                ok++;
                            }
                            else fallidos++;
                        }
                    }
                    catch
                    {
                        fallidos++;
                    }
                }

                if (ok == 0)
                {
                    var msg = detalle.FirstOrDefault()
                        ?? (accion == "eliminar"
                            ? "No se pudieron eliminar los productos seleccionados."
                            : "No se pudieron actualizar los productos seleccionados.");
                    return Json(new { Status = false, Mensaje = msg, Detalle = detalle, Fallidos = fallidos });
                }

                string mensaje;
                if (accion == "eliminar")
                    mensaje = ok == 1 ? "Producto eliminado." : ok + " productos eliminados.";
                else if (accion == "activar")
                    mensaje = ok == 1 ? "Producto activado." : ok + " productos activados.";
                else
                    mensaje = ok == 1 ? "Producto desactivado." : ok + " productos desactivados.";

                if (fallidos > 0)
                    mensaje += " " + fallidos + " no se pudieron aplicar.";

                return Json(new { Status = true, Mensaje = mensaje, Ok = ok, Fallidos = fallidos, Detalle = detalle });
            }
            catch (Exception)
            {
                return Json(new { Status = false, Mensaje = "No se pudo completar la acción. Intentá de nuevo." });
            }
        }

        public ActionResult ListarHistorial(int? idProducto, string desde, string hasta)
        {
            var user = UsuarioActual();
            if (user == null || user.IdRol != 1)
                return Json(new { data = new List<VMProductoHistorial>() }, JsonRequestBehavior.AllowGet);

            DateTime fd, fh;
            DateTime? d1 = DateTime.TryParse(desde, out fd) ? fd : (DateTime?)null;
            DateTime? d2 = DateTime.TryParse(hasta, out fh) ? fh : (DateTime?)null;

            var data = ProductosCambiosModel.ListarHistorial(idProducto, d1, d2);
            var json = Json(new { data }, JsonRequestBehavior.AllowGet);
            json.MaxJsonLength = int.MaxValue;
            return json;
        }

        public ActionResult DetalleHistorial(int id)
        {
            var user = UsuarioActual();
            if (user == null || user.IdRol != 1)
                return Json(new { Status = false }, JsonRequestBehavior.AllowGet);

            var row = ProductosCambiosModel.ObtenerHistorial(id);
            if (row == null)
                return Json(new { Status = false }, JsonRequestBehavior.AllowGet);

            return Json(new { Status = true, Historial = row }, JsonRequestBehavior.AllowGet);
        }

        private static T LeerJson<T>() where T : class
        {
            if (System.Web.HttpContext.Current?.Request?.InputStream == null)
                return null;

            var stream = System.Web.HttpContext.Current.Request.InputStream;
            if (stream.CanSeek)
                stream.Position = 0;

            using (var reader = new StreamReader(stream))
            {
                var json = reader.ReadToEnd();
                if (string.IsNullOrWhiteSpace(json))
                    return null;

                return JsonConvert.DeserializeObject<T>(json);
            }
        }

        private static VMProducto LeerProductoDesdeRequest()
        {
            return LeerJson<VMProducto>();
        }

        private static int JsonEntero(JObject body, params string[] names)
        {
            if (body == null || names == null) return 0;
            foreach (var n in names)
            {
                var t = body[n];
                if (t == null || t.Type == JTokenType.Null) continue;
                int v;
                if (t.Type == JTokenType.Integer) return t.Value<int>();
                if (int.TryParse(t.ToString(), out v)) return v;
            }
            return 0;
        }

        private static bool JsonBool(JObject body, params string[] names)
        {
            if (body == null || names == null) return false;
            foreach (var n in names)
            {
                var t = body[n];
                if (t == null || t.Type == JTokenType.Null) continue;
                if (t.Type == JTokenType.Boolean) return t.Value<bool>();
                bool b;
                if (bool.TryParse(t.ToString(), out b)) return b;
                int i;
                if (int.TryParse(t.ToString(), out i)) return i != 0;
            }
            return false;
        }

        private static string JsonTexto(JObject body, params string[] names)
        {
            if (body == null || names == null) return "";
            foreach (var n in names)
            {
                var t = body[n];
                if (t == null || t.Type == JTokenType.Null) continue;
                var s = t.Type == JTokenType.String ? t.Value<string>() : t.ToString();
                if (!string.IsNullOrWhiteSpace(s)) return s;
            }
            return "";
        }

        /*
         * WhatsApp Business API (Meta) — deshabilitado temporalmente.
         * El envío desde Productos usa api.whatsapp.com en el navegador (ver Productos.js).
         *
        [HttpPost]
        public async Task<ActionResult> EnviarWhatsappProducto(EnviarWhatsappProductoRequest request)
        {
            try
            {
                if (request == null || request.IdProducto <= 0)
                    return Json(new { Status = false, Mensaje = "Producto inválido." });

                if (string.IsNullOrWhiteSpace(request.Telefono))
                    return Json(new { Status = false, Mensaje = "Ingresá un teléfono válido." });

                var producto = ProductosModel.BuscarProducto(request.IdProducto);
                if (producto == null)
                    return Json(new { Status = false, Mensaje = "No se encontró el producto." });

                var token = ConfigurationManager.AppSettings["MetaWhatsAppToken"];
                var phoneNumberId = ConfigurationManager.AppSettings["MetaWhatsAppPhoneNumberId"];
                var version = ConfigurationManager.AppSettings["MetaWhatsAppApiVersion"] ?? "v25.0";

                if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(phoneNumberId))
                {
                    return Json(new
                    {
                        Status = false,
                        Mensaje = "Falta configurar Token o Phone Number ID de WhatsApp."
                    });
                }

                var telefono = NormalizarTelefonoWhatsapp(request.Telefono);

                using (var client = new HttpClient())
                {
                    client.DefaultRequestHeaders.Authorization =
                        new AuthenticationHeaderValue("Bearer", token);

                    var urlMensajes =
                        $"https://graph.facebook.com/{version}/{phoneNumberId}/messages";

                    // 1. Primero manda el texto del producto.
                    var textoResultado = await EnviarTextoWhatsapp(
                        client,
                        urlMensajes,
                        telefono,
                        request.Mensaje
                    );

                    if (!textoResultado.Status)
                        return Json(textoResultado);

                    await Task.Delay(800);

                    // 2. Junta foto principal + fotos extra.
                    var imagenes = ObtenerImagenesProductoWhatsapp(producto);

                    if (!imagenes.Any())
                    {
                        return Json(new
                        {
                            Status = true,
                            Mensaje = "Producto enviado, pero no tiene imágenes cargadas."
                        });
                    }

                    int enviadas = 0;
                    var errores = new List<string>();

                    for (int i = 0; i < imagenes.Count; i++)
                    {
                        var imagenBase64 = imagenes[i];

                        var subida = await SubirImagenWhatsapp(
                            client,
                            version,
                            phoneNumberId,
                            imagenBase64
                        );

                        if (!subida.Status)
                        {
                            errores.Add(subida.Mensaje);
                            continue;
                        }

                        var envioImagen = await EnviarImagenWhatsapp(
                            client,
                            urlMensajes,
                            telefono,
                            subida.MediaId
                        );

                        if (envioImagen.Status)
                            enviadas++;
                        else
                            errores.Add(envioImagen.Mensaje);

                        if (i < imagenes.Count - 1)
                            await Task.Delay(600);
                    }

                    if (enviadas == 0)
                    {
                        return Json(new
                        {
                            Status = false,
                            Mensaje = "El texto se envió, pero Meta no pudo enviar las imágenes. " +
                                      string.Join(" | ", errores.Take(2))
                        });
                    }

                    return Json(new
                    {
                        Status = true,
                        Mensaje = $"Producto enviado con {enviadas} imagen(es)."
                    });
                }
            }
            catch (Exception)
            {
                return Json(new
                {
                    Status = false,
                    Mensaje = "No se pudo enviar el producto. Intentá de nuevo."
                });
            }
        }

        private static List<string> ObtenerImagenesProductoWhatsapp(VMProducto producto)
        {
            var imagenes = new List<string>();

            if (producto == null)
                return imagenes;

            if (EsImagenBase64Valida(producto.Imagen))
                imagenes.Add(producto.Imagen);

            if (producto.ImagenesExtra != null)
            {
                imagenes.AddRange(
                    producto.ImagenesExtra
                        .Where(EsImagenBase64Valida)
                );
            }

            return imagenes
                .Select(LimpiarBase64Imagen)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();
        }

        private static bool EsImagenBase64Valida(string base64)
        {
            try
            {
                var limpia = LimpiarBase64Imagen(base64);
                if (string.IsNullOrWhiteSpace(limpia))
                    return false;

                var bytes = Convert.FromBase64String(limpia);
                return ObtenerMimeTypeImagen(bytes) != null;
            }
            catch
            {
                return false;
            }
        }

        private static async Task<ResultadoWhatsapp> EnviarTextoWhatsapp(
            HttpClient client,
            string url,
            string telefono,
            string mensaje)
        {
            var payload = new
            {
                messaging_product = "whatsapp",
                to = telefono,
                type = "text",
                text = new
                {
                    body = mensaje ?? "",
                    preview_url = false
                }
            };

            var response = await client.PostAsync(
                url,
                new StringContent(
                    JsonConvert.SerializeObject(payload),
                    Encoding.UTF8,
                    "application/json"
                )
            );

            if (response.IsSuccessStatusCode)
                return new ResultadoWhatsapp { Status = true };

            return new ResultadoWhatsapp
            {
                Status = false,
                Mensaje = await ObtenerErrorMeta(response)
            };
        }

        private static async Task<ResultadoSubidaImagen> SubirImagenWhatsapp(
            HttpClient client,
            string version,
            string phoneNumberId,
            string imagenBase64)
        {
            try
            {
                imagenBase64 = LimpiarBase64Imagen(imagenBase64);

                var bytes = Convert.FromBase64String(imagenBase64);
                var mimeType = ObtenerMimeTypeImagen(bytes);

                if (mimeType == null)
                {
                    return new ResultadoSubidaImagen
                    {
                        Status = false,
                        Mensaje = "Una imagen no es JPG ni PNG válido."
                    };
                }

                using (var form = new MultipartFormDataContent())
                {
                    var archivo = new ByteArrayContent(bytes);
                    archivo.Headers.ContentType = new MediaTypeHeaderValue(mimeType);

                    var extension = mimeType == "image/png" ? "png" : "jpg";

                    form.Add(new StringContent("whatsapp"), "messaging_product");
                    form.Add(new StringContent(mimeType), "type");
                    form.Add(archivo, "file", "producto." + extension);

                    var url =
                        $"https://graph.facebook.com/{version}/{phoneNumberId}/media";

                    var response = await client.PostAsync(url, form);

                    if (!response.IsSuccessStatusCode)
                    {
                        return new ResultadoSubidaImagen
                        {
                            Status = false,
                            Mensaje = await ObtenerErrorMeta(response)
                        };
                    }

                    var contenido = await response.Content.ReadAsStringAsync();
                    var json = JObject.Parse(contenido);
                    var mediaId = json["id"]?.ToString();

                    if (string.IsNullOrWhiteSpace(mediaId))
                    {
                        return new ResultadoSubidaImagen
                        {
                            Status = false,
                            Mensaje = "Meta no devolvió el ID de la imagen."
                        };
                    }

                    return new ResultadoSubidaImagen
                    {
                        Status = true,
                        MediaId = mediaId
                    };
                }
            }
            catch (Exception)
            {
                return new ResultadoSubidaImagen
                {
                    Status = false,
                    Mensaje = "No se pudo subir una imagen. Intentá de nuevo."
                };
            }
        }

        private static async Task<ResultadoWhatsapp> EnviarImagenWhatsapp(
            HttpClient client,
            string url,
            string telefono,
            string mediaId)
        {
            var payload = new
            {
                messaging_product = "whatsapp",
                to = telefono,
                type = "image",
                image = new
                {
                    id = mediaId
                }
            };

            var response = await client.PostAsync(
                url,
                new StringContent(
                    JsonConvert.SerializeObject(payload),
                    Encoding.UTF8,
                    "application/json"
                )
            );

            if (response.IsSuccessStatusCode)
                return new ResultadoWhatsapp { Status = true };

            return new ResultadoWhatsapp
            {
                Status = false,
                Mensaje = await ObtenerErrorMeta(response)
            };
        }

        private static string LimpiarBase64Imagen(string base64)
        {
            if (string.IsNullOrWhiteSpace(base64))
                return "";

            var coma = base64.IndexOf(',');

            return coma >= 0
                ? base64.Substring(coma + 1)
                : base64;
        }

        private static string ObtenerMimeTypeImagen(byte[] bytes)
        {
            if (bytes == null || bytes.Length < 4)
                return null;

            // PNG
            if (bytes[0] == 137 &&
                bytes[1] == 80 &&
                bytes[2] == 78 &&
                bytes[3] == 71)
            {
                return "image/png";
            }

            // JPG / JPEG
            if (bytes[0] == 255 &&
                bytes[1] == 216 &&
                bytes[2] == 255)
            {
                return "image/jpeg";
            }

            return null;
        }

        private static async Task<string> ObtenerErrorMeta(HttpResponseMessage response)
        {
            var contenido = await response.Content.ReadAsStringAsync();

            try
            {
                var json = JObject.Parse(contenido);

                return json["error"]?["message"]?.ToString()
                    ?? "Meta rechazó la operación.";
            }
            catch
            {
                return "Meta rechazó la operación.";
            }
        }

        private static string NormalizarTelefonoWhatsapp(string telefono)
        {
            var numeros = new string(
                (telefono ?? "")
                    .Where(char.IsDigit)
                    .ToArray()
            );

            if (string.IsNullOrWhiteSpace(numeros))
                return "";

            // Si ya viene con código de país, respetarlo.
            // Ejemplo: +54 11 4440-1267 -> 541144401267
            if (numeros.StartsWith("54"))
                return numeros;

            // Para pruebas locales de este número:
            // 1144401267 -> 541144401267
            return "54" + numeros.TrimStart('0');
        }
        */

    }

    /*
    public class EnviarWhatsappProductoRequest
    {
        public int IdProducto { get; set; }
        public string Telefono { get; set; }
        public string Mensaje { get; set; }
    }

    public class ResultadoWhatsapp
    {
        public bool Status { get; set; }
        public string Mensaje { get; set; }
    }

    public class ResultadoSubidaImagen
    {
        public bool Status { get; set; }
        public string MediaId { get; set; }
        public string Mensaje { get; set; }
    }
    */
}