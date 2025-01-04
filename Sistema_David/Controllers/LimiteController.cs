using Newtonsoft.Json;
using Sistema_David.Helpers;
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

    public class LimiteController : Controller
    {
        // GET: Stock
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult ListaLimites()
        {

            List<Limites> lstLimites;

            lstLimites = LimitesModel.ListaLimites();

            return Json(new { data = lstLimites }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult BuscarValorLimite(string nombre)
        {

            var result = LimitesModel.BuscarValorLimite(nombre);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }


        public ActionResult Editar(Limite model)
        {
            var result = LimitesModel.Editar(model);
            return Json(new { data = result }, JsonRequestBehavior.AllowGet);
        }

        


    }
}