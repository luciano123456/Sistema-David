﻿using DocumentFormat.OpenXml.VariantTypes;
using Sistema_David.Helpers;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.IO;
using System.Web.Mvc;
using Excel = Microsoft.Office.Interop.Excel;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using System.Diagnostics;
using Sistema_David.Models.Manager;
using Sistema_David.Models;
using Sistema_David.Models.ViewModels;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace Sistema_David.Controllers

{

    [Authorize]
    public class VentasController : Controller
    {
        // GET: Ventas
        public ActionResult Index()
        {
            var stockPendiente = StockPendienteModel.ListarStockPendienteId(SessionHelper.GetUsuarioSesion().Id, "Pendiente");

            if (stockPendiente.Count > 0 && SessionHelper.GetUsuarioSesion().IdRol != 1) // No afecta a administradores
            {
                // Si hay stock pendiente, redirige al índice de StockController
                return RedirectToAction("Index", "StockPendiente");
            }


            return View();
        }

        public ActionResult Nuevo()
        {
            return View();
        }

        public ActionResult Editar()
        {
            return View();
        }

        public ActionResult Informacion()
        {
            return View();
        }

        [HttpPost]
        public ActionResult InformacionVentayProductos(int id)
        {
            try
            {
                Venta venta = VentasModel.BuscarVenta(id);
                List<ProductosVenta> productos = VentasModel.ListaProductosVenta(id);

                var result = new Dictionary<string, object>();
                result.Add("Venta", venta);
                result.Add("Productos", productos);
                return Json(result, JsonRequestBehavior.AllowGet);
            }

            catch (Exception ex)
            {
                return Json(null);
            }

        }



        public ActionResult Listar(int idVendedor, DateTime FechaDesde, DateTime FechaHasta, DateTime FechaLimiteDesde, DateTime FechaLimiteHasta, int Finalizadas)
        {
            List<Venta> result;

            if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 2 || SessionHelper.GetUsuarioSesion().IdRol == 3) //ROL VENDEDOR
            {
                result = VentasModel.ListaVentas(SessionHelper.GetUsuarioSesion().Id, FechaDesde, FechaHasta,  FechaLimiteDesde, FechaLimiteHasta, Finalizadas);
            }
            else
            {
                result = VentasModel.ListaVentas(idVendedor, FechaDesde, FechaHasta, FechaLimiteDesde, FechaLimiteHasta, Finalizadas);
            }


            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ListarTodas()
        {
            List<Venta> result;


                result = VentasModel.ListaVentasTodas();
        
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }




        public ActionResult ListarVendedores()
        {
            List<User> usuarios;

            if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 1) //ROL ADMIN, ADMIN TRAE TODOS, SI ES VENDEDOR, SOLO SU USER
            {
                usuarios = UsuariosModel.ListaUsuarios();
            }
            else
            {
                usuarios = UsuariosModel.ListaUsuariosId(SessionHelper.GetUsuarioSesion().Id);
            }
            return Json(new { data = usuarios }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult ListarProductosVenta(int id)
        {
            try
            {

                var result = VentasModel.ListaProductosVenta(id);
                return Json(new { data = result }, JsonRequestBehavior.AllowGet);
            }

            catch (Exception ex)
            {
                return Json(null);
            }

        }



        public ActionResult NuevaVenta(Ventas venta)
        {
            try
            {

                
                var result = VentasModel.Nuevo(venta);

                return Json(new { Status = result });
            }
            catch (Exception ex)
            {
                return Json(new { Status = false });
            }

        }


        public ActionResult EditarInfoVenta(Ventas venta)
        {
            try
            {

                 
                var result = VentasModel.EditarInfoVenta(venta);

                return Json(new { Status = true });
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

                
                //ANTES DE BORRAR LA VENTA, LE SUMAMOS EL STOCK AL USUARIO
                var productosVenta = VentasModel.ListaProductosVenta(id);
                var venta = VentasModel.BuscarVenta(id);
               

                foreach (ProductosVenta producto in productosVenta)
                {
                    StockUsuarios HayStock = StockModel.BuscarStockUser(venta.idVendedor, producto.IdProducto);

                    if( HayStock != null)
                    {
                        StockModel.SumarStock(venta.idVendedor, producto.IdProducto, producto.Cantidad);
                    } else
                    {
                        StockUsuarios stock = new StockUsuarios();

                        stock.IdProducto = producto.IdProducto;
                        stock.Cantidad = producto.Cantidad;
                        stock.IdUsuario = venta.idVendedor;
                        stock.IdCategoria = 0;
                        StockModel.AgregarStockEliminarVenta(stock);
                    }
                }


                var resultProductosVenta = VentasModel.EliminarProductos(id);
                var result = VentasModel.Eliminar(id);
                var infoventa = VentasModel.EliminarTodaInformacionVenta(id);




                if (result && resultProductosVenta && infoventa)
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
        public ActionResult EditarVenta(int id)
        {
            try
            {

                var result = VentasModel.Editar(id);
                return Json(new { data = result });
            }
            catch (Exception ex)
            {
                return Json(new { data = "" });
            }

        }

        public ActionResult ListarInformacionVenta(int id)
        {
            try
            {

                var result = VentasModel.ListarInformacionVenta(id);
                return Json(new { data = result }, JsonRequestBehavior.AllowGet);
            }

            catch (Exception ex)
            {
                return Json(null);
            }

        }

        public ActionResult AgregarInformacionVenta(InformacionVentas model)
        {
            try
            {

                var result = VentasModel.AgregarInformacionVenta(model);
                return Json(new { data = result }, JsonRequestBehavior.AllowGet);
            }

            catch (Exception ex)
            {
                return Json(null);
            }

        }


        public ActionResult EliminarInformacionVenta(int id)
        {
            try
            {

                var result = VentasModel.EliminarInformacionVenta(id);
                return Json(new { data = result }, JsonRequestBehavior.AllowGet);


            }

            catch (Exception ex)
            {
                return Json(null);
            }

        }

        [HttpPost]
        public ActionResult EnvWhatssap(int id, string mensaje)
        {
            try
            {

                var result = VentasModel.EnviarWhatssap(id, mensaje);

                return Json(new { data = result });

            }
            catch (Exception ex)
            {
                return Json(null);
            }

        }

        public ActionResult EnvWhatssapCobranza(int id, string mensaje)
        {
            try
            {
                var ultimaInfoVenta = VentasModel.UltimaInformacionVenta(id);

                var result = new Dictionary<string, object>();
                var editawsp = VentasModel.EditarWSPInformacionVenta(ultimaInfoVenta.Id, 1);
                result.Add("Cliente", VentasModel.EnviarWhatssap(id, mensaje));
                result.Add("InformacionVenta", ultimaInfoVenta);
                result.Add("Venta", VentasModel.BuscarVenta(ultimaInfoVenta.IdVenta));

                return Json(result, JsonRequestBehavior.AllowGet);


            }
            catch (Exception ex)
            {
                // Manejar el error aquí o registrar el error para su depuración.
                return Json(null);
            }
        }




        public ActionResult EnvWhatssapInformacionVenta(int id)
        {
            try
            {

                var result = new Dictionary<string, object>();
                var infoventa = VentasModel.BuscarInformacionVenta(id);
                var productosVenta = VentasModel.ListaProductosVenta(infoventa.IdVenta);

                VentasModel.EditarWSPInformacionVenta(id, 1);

                result.Add("Cliente", VentasModel.EnviarWhatssapInfoVenta(id));
                result.Add("InformacionVenta", infoventa);
                result.Add("Venta", VentasModel.BuscarVenta(infoventa.IdVenta));
                result.Add("ProductosVenta", productosVenta);

                return Json(result, JsonRequestBehavior.AllowGet);

            }
            catch (Exception ex)
            {
                return Json(null);
            }

        }


        [HttpPost]
        public ActionResult GenerarExcel(List<Venta> data)
        {


            try { 
           
            DataTable dataTable = new DataTable();

            dataTable.Columns.Add("Cliente", typeof(string));
            dataTable.Columns.Add("Fecha", typeof(string));
            dataTable.Columns.Add("Entrega", typeof(decimal));
            dataTable.Columns.Add("Restante", typeof(decimal));
            dataTable.Columns.Add("Fecha de Cobro", typeof(string));
            dataTable.Columns.Add("Fecha Limite", typeof(string));
            dataTable.Columns.Add("Vendedor", typeof(string));
            dataTable.Columns.Add("Observacion", typeof(string));

           

            foreach (var row in data)
            {
                dataTable.Rows.Add(row.Cliente, Convert.ToDateTime(row.Fecha.ToString()).ToString("dd/MM/yyyy"), row.Entrega, row.Restante, Convert.ToDateTime(row.FechaCobro.ToString()).ToString("dd/MM/yyyy"), Convert.ToDateTime(row.FechaLimite.ToString()).ToString("dd/MM/yyyy"), row.Vendedor, row.Observacion);
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
            string fileName = "Ventas " + DateTime.Now.ToString("MM.dd.yyyy") + ".xlsx";

            string carpetaDescargas = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile) + "\\Downloads";


            string filePath = Path.Combine(carpetaDescargas, fileName);
            workbook.SaveAs(filePath);

            // Liberar recursos
            workbook.Close();
            excelApp.Quit();

            // Descargar el archivo Excel
            byte[] fileBytes = System.IO.File.ReadAllBytes(filePath);

                return Json(new { ruta = carpetaDescargas });
            }
            catch (Exception e)
            {
                return Json(false);
            }

        }
    }

}

