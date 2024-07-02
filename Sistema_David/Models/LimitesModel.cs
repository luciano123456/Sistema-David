using Sistema_David.Models.DB;
using SpreadsheetLight;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Web;
using Twilio;
using Twilio.Rest.Api.V2010.Account;

namespace Sistema_David.Models.Modelo
{
    public class LimitesModel
    {


        public static List<Limites> ListaLimites()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.Limites
                          .SqlQuery("select * from Limite")
                              select new Limites
                              {
                                  Id = d.Id,
                                  Nombre = d.Nombre,
                                  Valor = d.Valor
                              }).ToList();

                return result;
            }
        }


        public static bool Editar(Limite model)
        {
            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {
                    if (model != null)
                    {
                        var limite = db.Limites.SingleOrDefault(x => x.Nombre == model.Nombre);

                        if (limite != null)
                        {
                            limite.Valor = model.Valor != null ? model.Valor : limite.Valor;
                            db.SaveChanges();
                            return true;
                        }
                    }
                    return false;
                }
            }
            catch (Exception e)
            {
                return false;
            }
        }



        public static Limite BuscarValorLimite(string nombre)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var limite = (from d in db.Limites
                         .SqlQuery("select l.Id, l.Nombre, l.Valor from Limites l")
                            select new Limite
                            {
                                Id = d.Id,
                                Nombre = d.Nombre,
                                Valor = d.Valor,
                            }).Where(x => x.Nombre == nombre).FirstOrDefault();

                return limite;
            }
        }



    }
}