using Sistema_David.Models.DB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Modelo
{
    public class FileInput
    {
        public string Name { get; set; }
        public HttpPostedFileBase File { get; set; }

    }
}