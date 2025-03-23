using Sistema_David.Models.DB;
using SpreadsheetLight;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.DynamicData;
using Twilio;
using Twilio.Rest.Api.V2010.Account;

namespace Sistema_David.Models.Modelo
{
    public class CuentasBancariasModel
    {




        public static List<CuentasBancarias> Lista()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.CuentasBancarias
                          .SqlQuery("select * from CuentasBancarias")
                              select new CuentasBancarias
                              {
                                  Id = d.Id,
                                  Nombre = d.Nombre,
                                  CBU = d.CBU
                              }).ToList();

                return result;
            }
        }

        public static CuentasBancarias EditarInfo(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = db.CuentasBancarias.Where(x => x.Id == id).FirstOrDefault();

                return result;
            }
        }

        public static int Nuevo(CuentaBancaria model)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    CuentasBancarias cuenta = new CuentasBancarias();

                    cuenta.Id = model.Id;
                    cuenta.CBU = model.CBU;
                    cuenta.Nombre = model.Nombre;

                    db.CuentasBancarias.Add(cuenta);
                    db.SaveChanges();

                    return 0;
                }

                return 1;
            }
            catch (Exception e)
            {
                return 1;
            }
        }

        public static bool Editar(CuentaBancaria model)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    if (model != null)
                    {
                        var result = db.CuentasBancarias.Find(model.Id);

                        result.Nombre = model.Nombre;
                        result.CBU = model.CBU;

                        db.Entry(result).State = System.Data.Entity.EntityState.Modified;
                        db.SaveChanges();

                        return true;
                    }
                    return false;
                }
            }
            catch (Exception e)
            {
                return false;
            }
        }


        public static bool Eliminar(int id)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    var cuenta = db.CuentasBancarias.Find(id);

                    db.CuentasBancarias.Remove(cuenta);
                    db.SaveChanges();

                    return true;
                }
                return false;
            }
            catch (Exception e)
            {
                return false;
            }
        }



    }
}