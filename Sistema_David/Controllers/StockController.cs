﻿using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Sistema_David.Controllers
{

    [CheckBloqueoSistema]
    public class StockController : Controller
    {
        // GET: Stock
        public ActionResult Index()
        {

            var stockPendiente = StockPendienteModel.ExisteStockPendiente(SessionHelper.GetUsuarioSesion().Id, "Pendiente");

            if (stockPendiente == true && SessionHelper.GetUsuarioSesion().IdRol != 1) // No afecta a administradores
            {
                // Si hay stock pendiente, redirige al índice de StockController
                return RedirectToAction("Index", "StockPendiente");
            }

            return View();
        }

        public ActionResult General()
        {

            var stockPendiente = StockPendienteModel.ExisteStockPendiente(SessionHelper.GetUsuarioSesion().Id, "Pendiente");

            if (stockPendiente == true && SessionHelper.GetUsuarioSesion().IdRol != 1) // No afecta a administradores
            {
                // Si hay stock pendiente, redirige al índice de StockController
                return RedirectToAction("Index", "StockPendiente");
            }

            return View();
        }


        public ActionResult BuscarStock(int id)
        {
            var result = StockModel.BuscarStock(id);

            return Json(new
            {
                data = result.Stocks,
                vistaStock = result.VistaStock
            }, JsonRequestBehavior.AllowGet);
        }



        public ActionResult BuscarStockProducto(string producto)
        {
            var result = StockModel.BuscarStockProducto(producto);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }



        public ActionResult BuscarStockUser(int idUsuario, int idProducto)
        {
            var result = StockModel.BuscarStockUser(idUsuario, idProducto);

            var json = Json(new { data = result }, JsonRequestBehavior.AllowGet);
            json.MaxJsonLength = 500000000;
            return json;
        }


        public ActionResult EditarInfo(int id)
        {
            var result = StockModel.EditarInfo(id);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }


        public ActionResult Transferir(int idStock, int cantidad, int idUser, int idUserAsignado)
        {
            var stock = StockModel.EditarInfo(idStock);

            if (stock.Cantidad < cantidad)
            {
                return Json(new { data = "-1" }, JsonRequestBehavior.AllowGet);
            }

            var restarStock = StockModel.RestarStock(idStock, cantidad, idUserAsignado);

            if (restarStock)
            {
                StocksPendientes model = new StocksPendientes();

                model.Fecha = DateTime.Now;
                model.Cantidad = cantidad;
                model.IdUsuarioAsignado = idUserAsignado;
                model.IdUsuario = idUser;
                model.Estado = "Pendiente";
                model.Asignacion = "TRANSFERENCIA";
                model.IdProducto = stock.IdProducto;


                var stockPendiente = StockPendienteModel.Agregar(model);

                return Json(new { data = stockPendiente }, JsonRequestBehavior.AllowGet);
            }
            else
            {
                return Json(new { data = "-1" }, JsonRequestBehavior.AllowGet);
            }

           
        }

        public ActionResult Agregar(StocksPendientes model)
        {
            try
            {

                var producto = StockModel.BuscarStockUser((int)model.IdUsuario, (int)model.IdProducto);

                if (producto != null)
                {
                    SumarStock((int)model.IdUsuario, (int)model.IdProducto, (int)model.Cantidad);
                    return Json(new { Status = 1 });
                }
                var result = StockModel.Agregar(model);
                if (result)
                    return Json(new { Status = 1 });

                else
                    return Json(new { Status = 0 });
            }
            catch (Exception ex)
            {
                return Json(new { Status = 0 });
            }

        }


        public ActionResult AgregarStockCantidad(int id, int cantidad)
        {
            try
            {

                VMStockUsuario stock = StockModel.BuscarStockId(id);

                StocksPendientes stockPendiente = new StocksPendientes();

                stockPendiente.Estado = "Pendiente";
                stockPendiente.Cantidad = cantidad;
                stockPendiente.IdProducto = stock.IdProducto;
                stockPendiente.Tipo = "SUMAR";
                stockPendiente.Asignacion = "ADMINISTRADOR";
                stockPendiente.IdUsuario = stock.IdUsuario;
                stockPendiente.IdUsuarioAsignado = SessionHelper.GetUsuarioSesion().Id;
                stockPendiente.Fecha = DateTime.Now;

                var result = StockPendienteModel.Sumar(stockPendiente);

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

                VMStockUsuario   stock = StockModel.BuscarStockId(id);

                StocksPendientes stockPendiente = new StocksPendientes();

                stockPendiente.Estado = "Pendiente";
                stockPendiente.Cantidad = cantidad;
                stockPendiente.IdProducto = stock.IdProducto;
                stockPendiente.Tipo = "RESTAR";
                stockPendiente.Asignacion = "ADMINISTRADOR";
                stockPendiente.IdUsuario = stock.IdUsuario;
                stockPendiente.IdUsuarioAsignado = SessionHelper.GetUsuarioSesion().Id;
                stockPendiente.Fecha = DateTime.Now;

                var result = StockPendienteModel.Restar(stockPendiente);

                return Json(new { Status = result });

            }
            catch (Exception ex)
            {
                return Json(new { Status = false });
            }

        }

        public ActionResult Eliminar(int id)
        {
            try
            {

                VMStockUsuario stock = StockModel.BuscarStockId(id);

                StocksPendientes stockPendiente = new StocksPendientes();

                stockPendiente.Estado = "Pendiente";
                stockPendiente.Cantidad = stock.Cantidad;
                stockPendiente.IdProducto = stock.IdProducto;
                stockPendiente.Tipo = "ELIMINAR";
                stockPendiente.Asignacion = "ADMINISTRADOR";
                stockPendiente.IdUsuario = stock.IdUsuario;
                stockPendiente.IdUsuarioAsignado = SessionHelper.GetUsuarioSesion().Id;
                stockPendiente.Fecha = DateTime.Now;



                var result = StockPendienteModel.Eliminar(stockPendiente);

                    return Json(new { Status = result });

            }
            catch (Exception ex)
            {
                return Json(new { Status = false });
            }

        }



        public ActionResult Editar(VMStockUsuario model)
        {
            try
            {

                var result = StockModel.Editar(model);

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

        public ActionResult SumarStock(int idUsuario, int idProducto, int CantidadStock)
        {
            try
            {

                var result = StockModel.SumarStock(idUsuario, idProducto, CantidadStock);

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