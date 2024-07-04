//using DocumentFormat.OpenXml.VariantTypes;
//using Sistema_David.Helpers;
//using Sistema_David.Models.DB;
//using Sistema_David.Models.Modelo;
//using System;
//using System.Collections.Generic;
//using System.Data;
//using System.Globalization;
//using System.IO;
//using System.Web.Mvc;
//using Excel = Microsoft.Office.Interop.Excel;
//using OfficeOpenXml;
//using OfficeOpenXml.Style;
//using System.Diagnostics;
//using Sistema_David.Models.Manager;
//using Sistema_David.Models;
//using Sistema_David.Models.ViewModels;
//using Twilio;
//using Twilio.Rest.Api.V2010.Account;
//using Twilio.Types;

//namespace Sistema_David.Controllers

//{

//    [Authorize]
//    public class PedidosController : Controller
//    {
//        // GET: Ventas
//        public ActionResult Index()
//        {

//            return View();
//        }

//        public ActionResult Nuevo()
//        {
//            return View();
//        }

//        public ActionResult Editar()
//        {
//            return View();
//        }

//        public ActionResult Listar(int idVendedor, DateTime FechaEntrega)
//        {
//            List<Pedido> result;

//            if (SessionHelper.GetUsuarioSesion() != null && SessionHelper.GetUsuarioSesion().IdRol == 2 || SessionHelper.GetUsuarioSesion().IdRol == 3) //ROL VENDEDOR
//            {
//                result = PedidosModel.ListaPedidos(SessionHelper.GetUsuarioSesion().Id, FechaEntrega);
//            }
//            else
//            {
//                result = PedidosModel.ListaPedidos(idVendedor, FechaEntrega);
//            }


//            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
//        }


//        public ActionResult ListarProductosPedido(int id)
//        {
//            try
//            {

//                var result = PedidosModel.ListaProductosPedido(id);
//                return Json(new { data = result }, JsonRequestBehavior.AllowGet);
//            }

//            catch (Exception ex)
//            {
//                return Json(null);
//            }

//        }

//        public ActionResult ListarEstados()
//        {
//            List<EstadosPedidos> usuarios;
//                usuarios = PedidosModel.ListaEstados();
//            return Json(new { data = usuarios }, JsonRequestBehavior.AllowGet);
//        }

//        public ActionResult NuevoPedido(Pedidos pedido)
//        {
//            try
//            {


//                var result = PedidosModel.Nuevo(pedido);

//                return Json(new { Status = result });
//            }
//            catch (Exception ex)
//            {
//                return Json(new { Status = false });
//            }

//        }

//        [HttpPost]
//        public ActionResult Eliminar(int id)
//        {
//            try
//            {


//                //ANTES DE BORRAR LA VENTA, LE SUMAMOS EL STOCK AL USUARIO
//                var productosVenta = PedidosModel.ListaProductosPedido(id);
//                var venta = PedidosModel.BuscarPedido(id);

//                var resultProductosPedido = PedidosModel.EliminarProductos(id);
//                var result = PedidosModel.Eliminar(id);

//                if (result && resultProductosPedido)
//                    return Json(new { Status = true });

//                else
//                    return Json(new { Status = false });
//            }
//            catch (Exception ex)
//            {
//                return Json(new { Status = false });
//            }

//        }

//    }

//}

