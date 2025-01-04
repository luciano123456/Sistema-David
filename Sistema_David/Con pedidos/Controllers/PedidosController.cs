using DocumentFormat.OpenXml.VariantTypes;
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
    public class PedidosController : Controller
    {
        // GET: Ventas
        public ActionResult Index()
        {

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

    }

}

