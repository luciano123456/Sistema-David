using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Web.Mvc;

namespace Sistema_David.Controllers
{
    [Authorize]
    [CheckBloqueoSistema]
    public class Ventas_ElectrodomesticosController : Controller
    {
        public ActionResult Historial() => View();
        public ActionResult NuevoModif() => View();
        public ActionResult Cobros() => View();

        /* ================= DETALLE ================= */
        public ActionResult GetDetalleVenta(int idVenta)
        {
            try
            {
                var data = Ventas_ElectrodomesticosModel.ObtenerVenta(idVenta);
                return Json(new { success = data != null, data, message = (data == null ? "Venta no encontrada" : null) },
                    JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error al obtener venta: " + ex.Message },
                    JsonRequestBehavior.AllowGet);
            }
        }


        /* ================= HISTORIAL ================= */
        public ActionResult GetHistorialVentas(DateTime? fechaDesde, DateTime? fechaHasta, string estado, int idVendedor)
        {
            try
            {
                VM_HistorialVentasResp data;

                var usuarioSesion = SessionHelper.GetUsuarioSesion();

                if (usuarioSesion != null && (usuarioSesion.IdRol == 2 || usuarioSesion.IdRol == 3)) // ROL VENDEDOR
                {
                    data = Ventas_ElectrodomesticosModel.ListarHistorial(fechaDesde, fechaHasta, estado, usuarioSesion.Id);
                }
                else
                {
                    data = Ventas_ElectrodomesticosModel.ListarHistorial(fechaDesde, fechaHasta, estado, idVendedor);
                }

                return Json(new
                {
                    success = true,
                    data = data.Filas,
                    kpis = data.Kpis
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error al obtener historial de ventas: " + ex.Message },
                    JsonRequestBehavior.AllowGet);
            }
        }




        /* ================= CUOTAS A COBRAR ================= */
        public ActionResult ListarCuotasACobrar(DateTime? fechaDesde, DateTime? fechaHasta, int? idCliente, int? idVendedor, string estado)
        {
            try
            {
                var filtro = new VM_Ventas_Electrodomesticos_FiltroCobros
                {
                    FechaDesde = fechaDesde,
                    FechaHasta = fechaHasta,
                    IdCliente = idCliente,
                    IdVendedor = idVendedor,
                    EstadoCuota = estado
                };

                var data = Ventas_ElectrodomesticosModel.ListarCuotasACobrar(filtro);
                return Json(new { data }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { data = new List<object>(), error = ex.Message },
                    JsonRequestBehavior.AllowGet);
            }
        }

        /* ================= CREAR VENTA ================= */
        [HttpPost]
        public ActionResult CrearVenta(VM_Ventas_Electrodomesticos_Crear model)
        {
            try
            {
                if (model == null)
                    return Json(new { success = false, message = "Datos inválidos" });

                if (model.UsuarioOperador <= 0 && SessionHelper.GetUsuarioSesion() != null)
                    model.UsuarioOperador = SessionHelper.GetUsuarioSesion().Id;

                int idVenta = Ventas_ElectrodomesticosModel.CrearVenta(model);

                return Json(new { success = true, idVenta });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        /* ================= REGISTRAR PAGO ================= */
        [HttpPost]
        public ActionResult RegistrarPago(VM_Ventas_Electrodomesticos_Pago model)
        {
            try
            {
                if (model == null || model.IdVenta <= 0)
                    return Json(new { success = false, message = "Datos inválidos" });

                if (model.UsuarioOperador <= 0 && SessionHelper.GetUsuarioSesion() != null)
                    model.UsuarioOperador = SessionHelper.GetUsuarioSesion().Id;

                var idPago = Ventas_ElectrodomesticosModel.RegistrarPago(model);
                return Json(new { success = true, idPago });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error al registrar pago: " + ex.Message });
            }
        }

        /* ================= EDITAR CUOTA ================= */
        [HttpPost]
        public ActionResult EditarCuota(int idCuota, DateTime? nuevaFecha, decimal? nuevoMontoOriginal)
        {
            try
            {
                var usuario = SessionHelper.GetUsuarioSesion()?.Id ?? 0;
                Ventas_ElectrodomesticosModel.EditarCuota(idCuota, nuevaFecha, nuevoMontoOriginal, usuario);
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error al editar cuota: " + ex.Message });
            }
        }

        /* ================= EDITAR VENTA ================= */
        [HttpPost]
        public ActionResult EditarVenta(VM_Ventas_Electrodomesticos_Crear model)
        {
            try
            {
                if (model == null || model.IdVenta <= 0)
                    return Json(new { success = false, message = "Datos inválidos" });

                model.UsuarioOperador = SessionHelper.GetUsuarioSesion()?.Id ?? 0;

                var resp = Ventas_ElectrodomesticosModel.EditarVenta(model);
                return Json(new { success = resp == "OK", message = resp });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        /* ================= RECARGO / DESCUENTO (LEGACY) =================
         * Sigue existiendo para no romper nada, pero ya no se usará para
         * descuentos. Solo recargos con el nuevo esquema (múltiples recargos).
         * ================================================================= */
        [HttpPost]
        public ActionResult ActualizarRecargoDescuentoCuota(int idCuota, decimal? recargo, decimal? descuento)
        {
            try
            {
                var usuario = SessionHelper.GetUsuarioSesion()?.Id ?? 0;
                Ventas_ElectrodomesticosModel.ActualizarRecargoDescuentoCuota(idCuota, recargo, descuento, usuario);
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error al actualizar recargo/descuento: " + ex.Message });
            }
        }

        /* ================= RECARGOS NUEVA TABLA ================= */

        [HttpPost]
        public ActionResult AgregarRecargoCuota(VM_Ventas_Electrodomesticos_RecargoCuota model)
        {
            try
            {
                if (model == null || model.IdCuota <= 0)
                    return Json(new { success = false, message = "Datos inválidos" });

                if (model.UsuarioOperador <= 0 && SessionHelper.GetUsuarioSesion() != null)
                    model.UsuarioOperador = SessionHelper.GetUsuarioSesion().Id;

                var idRecargo = Ventas_ElectrodomesticosModel.AgregarRecargoCuota(model);

                return Json(new { success = true, idRecargo });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error al agregar recargo: " + ex.Message });
            }
        }

        [HttpPost]
        public ActionResult EliminarRecargoCuota(int idRecargo)
        {
            try
            {
                var usuario = SessionHelper.GetUsuarioSesion()?.Id ?? 0;
                var msg = Ventas_ElectrodomesticosModel.EliminarRecargoCuota(idRecargo, usuario);

                return Json(new
                {
                    success = msg == "OK",
                    message = msg
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error al eliminar recargo: " + ex.Message });
            }
        }

        /* ================= ELIMINAR PAGO ================= */
        [HttpPost]
        public ActionResult EliminarPago(int idPago)
        {
            try
            {
                var usuario = SessionHelper.GetUsuarioSesion()?.Id ?? 0;
                var msg = Ventas_ElectrodomesticosModel.EliminarPago(idPago, usuario);

                return Json(new
                {
                    success = msg == "OK",
                    message = msg
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error al eliminar pago: " + ex.Message });
            }
        }

        /* ================= ELIMINAR VENTA ================= */
        [HttpPost]
        public ActionResult EliminarVenta(int id)
        {
            try
            {
                var usuario = SessionHelper.GetUsuarioSesion()?.Id ?? 0;
                var msg = Ventas_ElectrodomesticosModel.EliminarVenta(id, usuario);
                return Json(new { success = msg.Contains("éxito"), message = msg });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error al eliminar venta: " + ex.Message });
            }
        }
    }
}
