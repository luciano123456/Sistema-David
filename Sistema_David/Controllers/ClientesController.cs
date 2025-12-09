using NPOI.HSSF.UserModel;
using NPOI.SS.UserModel;
using NPOI.XSSF.UserModel;
using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using Sistema_David.Models.ViewModels;
using SpreadsheetLight;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Excel = Microsoft.Office.Interop.Excel;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Google.Apis.Util.Store;


namespace Sistema_David.Controllers
{

    [Authorize]
    [CheckBloqueoSistema]
    public class ClientesController : Controller
    {



        // GET: Clientes
        public ActionResult Index()
        {
            ViewBag.ErrorPermisos = null;

            if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 2) //ROL  VENDEDOR
            {
                ViewBag.ErrorPermisos = "No puedes acceder a esta pantalla";
            }

            var stockPendiente = StockPendienteModel.ExisteStockPendiente(SessionHelper.GetUsuarioSesion().Id, "Pendiente");

            if (stockPendiente == true && SessionHelper.GetUsuarioSesion().IdRol != 1) // No afecta a administradores
            {
                // Si hay stock pendiente, redirige al índice de StockController
                return RedirectToAction("Index", "StockPendiente");
            }

            return View();

        }

        public ActionResult Editar()
        {
            ViewBag.ErrorPermisos = null;

            if (SessionHelper.GetUsuarioSesion() == null)
            {
                ViewBag.ErrorPermisos = "No puedes acceder a esta pantalla";
            }

            return View();

        }


        public ActionResult ImportacionExcel()
        {

            return View();
        }


        [HttpPost]
        public ActionResult GuardarDatos(FileInput Imagenes)
        {
            try
            {
                var result = new List<Clientes>();

                string path = Server.MapPath("~/Uploads/");

                if (Imagenes != null)
                {
                   
                    if (!Directory.Exists(path))
                    {
                        Directory.CreateDirectory(path);
                    }

                    result = ClientesModel.GuardarDatos(Imagenes, path);

                }
                return Json(new { data = result, directory = path }, JsonRequestBehavior.AllowGet);
            }

            catch (Exception e)
            {
                ViewBag.Message = "Upload failed";
                return Json(null);
            }
        }


        public ActionResult GetCliente(string Dni)
        {
            var result = ClientesModel.BuscarCliente(Dni);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult Listar(int idVendedor, string Nombre, string Apellido, string Dni, int idZona)
        {

            List<VMCliente> result;
            List<VMCliente> resultSaldo = new List<VMCliente>();
            List<VMVenta> ventasUser;

            if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 2) //ROL VENDEDOR
            {
                result = ClientesModel.ListaClientes(SessionHelper.GetUsuarioSesion().Id, Nombre, Apellido, Dni, idZona);



            }
            else
            {
                result = ClientesModel.ListaClientes(idVendedor, Nombre, Apellido, Dni, idZona);


            }

            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }


        public ActionResult GetClientes()
        {
            var result = ClientesModel.ListaClientes();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }


        public ActionResult GetClientesVendedor(int idVendedor)
        {
            var result = ClientesModel.ListaClientesVendedor(idVendedor);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }


        public ActionResult ListarVendedores()
        {
            var result = UsuariosModel.ListaUsuarios();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ListarEstados()
        {
            var result = ClientesModel.ListaEstados();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ListarZonas()
        {
            var result = ClientesModel.ListaZonas();
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public ActionResult ListaEstadosyVendedores()
        {
            try
            {
                List<VMUser> usuarios;

                if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 1) //ROL ADMIN, ADMIN TRAE TODOS, SI ES VENDEDOR, SOLO SU USER
                {
                    usuarios = UsuariosModel.ListaUsuarios();
                }
                else
                {
                    usuarios = UsuariosModel.ListaUsuariosId(SessionHelper.GetUsuarioSesion().Id);
                }

                var estados = UsuariosModel.ListaEstados();
                var zonas = UsuariosModel.ListaZonas();

                var result = new Dictionary<string, object>();
                result.Add("Usuarios", usuarios);
                result.Add("Estados", estados);
                result.Add("Zonas", zonas);
                return Json(result, JsonRequestBehavior.AllowGet);
            }

            catch (Exception ex)
            {
                return Json(null);
            }

        }


        public ActionResult Nuevo(VMCliente model)
        {
            try
            {

                var result = ClientesModel.Nuevo(model);

                    return Json(new { Status = result });
            }
            catch (Exception ex)
            {
                return Json(new { Status = 1 });
            }

        }

        [HttpPost]
        public ActionResult NuevaDireccion(VMClienteNuevaDireccion model)
        {
            try
            {

                var result = ClientesModel.NuevaDireccion(model.IdCliente, model.Longitud, model.Latitud);

                return Json(new { Status = result });
            }
            catch (Exception ex)
            {
                return Json(new { Status = 1 });
            }

        }

        [HttpPost]
        public ActionResult Eliminar(int id)
        {
            try
            {

                var result = ClientesModel.Eliminar(id);

              
                    return Json(new { Status = result });

            }
            catch (Exception ex)
            {
                return Json(new { Status = "Ha ocurrido un error" });
            }

        }



        [HttpPost]
        public ActionResult EnvWhatssap(int id, string mensaje)
        {
            try
            {

                var result = ClientesModel.EnviarWhatssap(id, mensaje);

                return Json(new { data = result }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(null);
            }

        }

        [HttpPost]
        public ActionResult EditarInfo(int id)
        {
            try
            {



                var usuario = ClientesModel.BuscarCliente(id);
                var usuarios = UsuariosModel.ListaUsuarios();
                var estados = ClientesModel.ListaEstados();
                var zonas = ClientesModel.ListaZonas();

                var result = new Dictionary<string, object>();
                result.Add("Usuario", usuario);
                result.Add("Usuarios", usuarios);
                result.Add("Estados", estados);
                result.Add("Zonas", zonas);
                return Json(result, JsonRequestBehavior.AllowGet);
            }

            catch (Exception ex)
            {
                return Json(null);
            }

        }

        public ActionResult EditarTelefono(int id, string telefono)
        {
            try
            {

                var result = ClientesModel.EditarTelefono(id, telefono);

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

        public ActionResult EditarCliente(VMCliente model)
        {
            try
            {

                var result = ClientesModel.Editar(model);

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
        public ActionResult GenerarExcel(List<VMCliente> data)
        {


            try
            {
                if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 2) { return Json(new { status = false }); }//ROL VENDEDOR

                // Obtener los datos de tu DataTable (aquí asumimos que ya tienes los datos en un DataTable llamado "dataTable")
                DataTable dataTable = new DataTable();

                dataTable.Columns.Add("Nombre", typeof(string));
                dataTable.Columns.Add("Apellido", typeof(string));
                dataTable.Columns.Add("Dni", typeof(string));
                dataTable.Columns.Add("Direccion", typeof(string));
                dataTable.Columns.Add("Telefono", typeof(string));
                dataTable.Columns.Add("Vendedor", typeof(string));
                dataTable.Columns.Add("Estado", typeof(string));


                foreach (var row in data)
                {
                    dataTable.Rows.Add(row.Nombre, row.Apellido, row.Dni, row.Direccion, row.Telefono, row.Vendedor, row.Estado);
                }

                // Crear una nueva instancia de Excel
                Excel.Application excelApp = new Excel.Application();
                Excel.Workbook workbook = excelApp.Workbooks.Add();
                Excel.Worksheet worksheet = workbook.ActiveSheet;

                Excel.Range headerRange = worksheet.Range[worksheet.Cells[1, 1], worksheet.Cells[1, dataTable.Columns.Count]];
                headerRange.Interior.Color = System.Drawing.Color.GreenYellow.ToArgb(); // Cambiar el color según tus preferencias
                headerRange.Font.Color = System.Drawing.Color.White.ToArgb();

                // Escribir los encabezados de las columnas
                for (int col = 0; col < dataTable.Columns.Count; col++)
                {
                    worksheet.Cells[1, col + 1] = dataTable.Columns[col].ColumnName;
                }

                // Escribir los datos en las filas
                for (int row = 0; row < dataTable.Rows.Count; row++)
                {
                    for (int col = 0; col < dataTable.Columns.Count; col++)
                    {
                        worksheet.Cells[row + 2, col + 1] = dataTable.Rows[row][col].ToString();
                    }
                }




                // Guardar el archivo Excel
                string fileName = "Clientes " + DateTime.Now.ToString("MM.dd.yyyy") + ".xlsx";

                string carpetaDescargas = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile) + "\\Downloads";


                string filePath = Path.Combine(carpetaDescargas, fileName);
                workbook.SaveAs(filePath);

                // Liberar recursos
                workbook.Close();
                excelApp.Quit();

                // Descargar el archivo Excel
                byte[] fileBytes = System.IO.File.ReadAllBytes(filePath);

                return Json(new { status = true, ruta = carpetaDescargas });
            }
            catch (Exception e)
            {
                return Json(new { status = false, error = e.InnerException });
            }

        }
    }
        
}