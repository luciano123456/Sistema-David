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
            ViewBag.ErrorPermisos = null;
            return View();
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
            var result = ProductosModel.ListaProductos();
            var totalStock = ProductosModel.TotalDineroEnStock();
            return Json(new { data = result, totalStock }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ObtenerImagen(int id)
        {
            using (var db = new Sistema_DavidEntities())
            {
                var imagen = db.Productos
                    .Where(p => p.Id == id)
                    .Select(p => p.Imagen)
                    .FirstOrDefault();

                if (string.IsNullOrEmpty(imagen))
                    return ImagenProductoPorDefecto(cacheLong: true);

                try
                {
                    var bytes = Convert.FromBase64String(imagen);
                    Response.Cache.SetCacheability(HttpCacheability.Public);
                    Response.Cache.SetMaxAge(TimeSpan.FromDays(7));
                    Response.Cache.SetExpires(DateTime.Now.AddDays(7));
                    return File(bytes, "image/jpeg");
                }
                catch (FormatException)
                {
                    return ImagenProductoPorDefecto(cacheLong: true);
                }
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
            return File(Server.MapPath("~/Imagenes/productodefault.png"), "image/png");
        }

        public ActionResult AgregarStockCantidad(int id, int cantidad)
        {
            try
            {

               
                var result = ProductosModel.SumarStock(id, cantidad);

                return Json(new { Status = result });

            }
            catch (Exception ex)
            {
                return Json(new { Status = false });
            }

        }

        public ActionResult RestarStockCantidad(int id, int cantidad)
        {
            try
            {


                var result = ProductosModel.RestarStock(id, cantidad);

                return Json(new { Status = result });

            }
            catch (Exception ex)
            {
                return Json(new { Status = false });
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

        [HttpPost]
        public ActionResult Nuevo()
        {
            try
            {
                var model = LeerProductoDesdeRequest();
                if (model == null)
                    return Json(new { Status = false, Mensaje = "No se recibieron datos del producto." });

                var result = ProductosModel.Nuevo(model);
                if (result)
                    return Json(new { Status = true });

                return Json(new { Status = false, Mensaje = "No se pudo registrar. Verificá categoría, código y que la base tenga las columnas nuevas de Productos." });
            }
            catch (Exception ex)
            {
                return Json(new { Status = false, Mensaje = ex.Message });
            }
        }

        [HttpPost]
        public ActionResult Eliminar(int id)
        {
            try
            {
                var stock = StockModel.ObtenerUsuariosConProductoEnStock(id);

                if (stock.Any())
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


                var result = ProductosModel.Eliminar(id);

                return Json(new { Status = result });
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



        [HttpPost]
        public ActionResult Editar()
        {
            try
            {
                var model = LeerProductoDesdeRequest();
                if (model == null || model.Id <= 0)
                    return Json(new { Status = false, Mensaje = "Producto inválido." });

                var result = ProductosModel.Editar(model);
                if (result)
                    return Json(new { Status = true });

                return Json(new { Status = false, Mensaje = "No se pudo modificar el producto." });
            }
            catch (Exception ex)
            {
                return Json(new { Status = false, Mensaje = ex.Message });
            }
        }

        private static VMProducto LeerProductoDesdeRequest()
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

                return JsonConvert.DeserializeObject<VMProducto>(json);
            }
        }

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

                    // 2. Junta foto principal + fotos extra.
                    var imagenes = new List<string>();

                    if (!string.IsNullOrWhiteSpace(producto.Imagen))
                        imagenes.Add(producto.Imagen);

                    if (producto.ImagenesExtra != null && producto.ImagenesExtra.Any())
                    {
                        imagenes.AddRange(
                            producto.ImagenesExtra
                                .Where(x => !string.IsNullOrWhiteSpace(x))
                        );
                    }

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

                    foreach (var imagenBase64 in imagenes)
                    {
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
            catch (Exception ex)
            {
                return Json(new
                {
                    Status = false,
                    Mensaje = "Error al enviar el producto: " + ex.Message
                });
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
            catch (Exception ex)
            {
                return new ResultadoSubidaImagen
                {
                    Status = false,
                    Mensaje = "No se pudo subir una imagen: " + ex.Message
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

    }

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
}