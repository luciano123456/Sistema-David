using Sistema_David.Models.DB;
using Sistema_David.Models.ViewModels;
using SpreadsheetLight;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Data.SqlClient;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.DynamicData;
using System.Web.Mvc;
using Twilio;
using Twilio.Rest.Api.V2010.Account;

namespace Sistema_David.Models.Modelo
{
    public class CuentasBancariasModel
    {


        public static List<VMCuentaBancaria> Lista(string metodopago, int activo)
        {
            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {
                    return db.CuentasBancarias
                             .Select(d => new VMCuentaBancaria
                             {
                                 Id = d.Id,
                                 Nombre = d.Nombre,
                                 CBU = d.CBU,
                                 CuentaPropia = (int)d.CuentaPropia,
                                 Activo = (int)d.Activo
                             })
                             .Where(x =>
                                ((metodopago != null && metodopago.ToUpper() == "TRANSFERENCIA PROPIA" && x.CuentaPropia == 1) ||
                                 (metodopago != null && metodopago.ToUpper() == "TRANSFERENCIA A TERCEROS" && x.CuentaPropia == 0) ||
                                 string.IsNullOrEmpty(metodopago))
                                && (x.Activo == activo || activo == -1))
                             .OrderByDescending(x => x.Activo)
                             .ToList();
                }
            }
            catch (Exception ex)
            {
                return null;
            }
        }



        public static List<VMCuentaBancariaConVentas> ListaConTotalesInformacion(string metodopago, int activo)
        {
            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {
                    var fechaDesde = DateTime.Today;              // hoy a las 00:00
                    var fechaHasta = fechaDesde.AddDays(1);       // mañana a las 00:00

                    // 1. Traer cuentas bancarias sin inicializar la lista
                    var cuentasBancarias = db.CuentasBancarias
                        .Where(x =>
                            ((metodopago != null && metodopago.ToUpper() == "TRANSFERENCIA PROPIA" && x.CuentaPropia == 1) ||
                             (metodopago != null && metodopago.ToUpper() == "TRANSFERENCIA A TERCEROS" && x.CuentaPropia == 0) ||
                             string.IsNullOrEmpty(metodopago))
                            && (x.Activo == activo || activo == -1))
                        .ToList()
                        .Select(x => new VMCuentaBancariaConVentas
                        {
                            Id = x.Id,
                            Nombre = x.Nombre,
                            CBU = x.CBU,
                            CuentaPropia = (int)x.CuentaPropia,
                            Activo = (int)x.Activo,
                            MontoPagar = (decimal)x.MontoPagar,
                            // InformacionVentas y Entrega se llenan después
                        })
                        .ToList();

                    var informacionVentas = (from iv in db.InformacionVentas
                                             join v in db.Ventas on iv.IdVenta equals v.Id
                                             where iv.Descripcion.Contains("Cobranza")
                                                   && iv.IdCuentaBancaria != null
                                                   && iv.Fecha >= fechaDesde && iv.Fecha < fechaHasta
                                             select new
                                             {
                                                 iv.Fecha,
                                                 iv.Entrega,
                                                 iv.IdCuentaBancaria,
                                                 IdCliente = v.idCliente,
                                                 iv.Id,
                                             }).ToList();

                    // 3. Asignar ventas y entregas a cada cuenta
                    foreach (var cuenta in cuentasBancarias)
                    {
                        var ventas = informacionVentas
                            .Where(iv => iv.IdCuentaBancaria == cuenta.Id)
                            .Select(iv => new VMInformacionVenta
                            {
                                Id = iv.Id,
                                Fecha = iv.Fecha,
                                Entrega = (decimal)iv.Entrega,
                                idCliente = iv.IdCliente
                            })
                            .ToList();

                        cuenta.InformacionVentas = ventas;
                        cuenta.Entrega = ventas.Sum(v => v.Entrega);
                    }

                    return cuentasBancarias;
                }
            }
            catch (Exception ex)
            {
                return null;
            }
        }




        public static List<VMCuentaBancariaConVentas> ListaSoloTotales(string metodopago, int activo)
        {
            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {
                    var fechaDesde = DateTime.Today;              // hoy a las 00:00
                    var fechaHasta = fechaDesde.AddDays(1);       // mañana a las 00:00

                    // 1. Traer cuentas bancarias
                    var cuentasBancarias = db.CuentasBancarias
                        .Where(x =>
                            ((metodopago != null && metodopago.ToUpper() == "TRANSFERENCIA PROPIA" && x.CuentaPropia == 1) ||
                             (metodopago != null && metodopago.ToUpper() == "TRANSFERENCIA A TERCEROS" && x.CuentaPropia == 0) ||
                             string.IsNullOrEmpty(metodopago))
                            && (x.Activo == activo || activo == -1))
                        .ToList()
                        .Select(x => new VMCuentaBancariaConVentas
                        {
                            Id = x.Id,
                            Nombre = x.Nombre,
                            CBU = x.CBU,
                            CuentaPropia = (int)x.CuentaPropia,
                            Activo = (int)x.Activo,
                            MontoPagar = (decimal)x.MontoPagar,
                            Entrega = 0 // Se calcula después
                        })
                        .ToList();

                    // 2. Traer solo ventas para calcular entrega
                    var informacionVentas = db.InformacionVentas
                        .Where(iv => iv.Descripcion.Contains("Cobranza")
                                     && iv.IdCuentaBancaria != null
                                      && iv.Fecha >= fechaDesde && iv.Fecha < fechaHasta)
                        .ToList();

                    // 3. Calcular solo el total de entregas por cuenta
                    foreach (var cuenta in cuentasBancarias)
                    {
                        cuenta.Entrega = informacionVentas
                            .Where(iv => iv.IdCuentaBancaria == cuenta.Id)
                            .Sum(iv => (decimal?)iv.Entrega) ?? 0;
                    }

                    return cuentasBancarias;
                }
            }
            catch (Exception ex)
            {
                return null;
            }
        }


        public static List<VMComprobantesImagenes> ObtenerComprobantes(int idCuenta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var hoy = DateTime.Today;
                var comprobantes = db.ComprobantesImagenes
                    .Where(c => c.IdCuenta == idCuenta && DbFunctions.TruncateTime(c.Fecha) == hoy)
                    .Select(c => new VMComprobantesImagenes
                    {
                        Id = c.Id,
                        Imagen = c.Imagen,
                    })
                    .ToList();

                return comprobantes;
            }
        }

        public static bool GuardarComprobantes(List<VMComprobantesImagenes> comprobantes)
        {
            if (comprobantes == null || comprobantes.Count == 0)
                return false;

            int idCuenta = comprobantes.First().IdCuenta ?? 0;
            var hoy = DateTime.Today;

            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                // 1. Eliminar comprobantes existentes del día y la cuenta
                var existentes = db.ComprobantesImagenes
                    .Where(c => c.IdCuenta == idCuenta && DbFunctions.TruncateTime(c.Fecha) == hoy)
                    .ToList();

                db.ComprobantesImagenes.RemoveRange(existentes);
                db.SaveChanges();

                // 2. Insertar solo los que tengan Imagen no vacía
                foreach (var comp in comprobantes)
                {
                    if (!string.IsNullOrWhiteSpace(comp.Imagen))
                    {
                        db.ComprobantesImagenes.Add(new ComprobantesImagenes
                        {
                            Fecha = DateTime.Now,
                            Imagen = comp.Imagen,
                            IdCuenta = comp.IdCuenta.Value
                        });
                    }
                }

                db.SaveChanges();
                return true;
            }
        }



        public static VMCuentaBancariaConVentas ObtenerInfoCuentaConTotales(int idCuenta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var informacionVenta = db.InformacionVentas
                    .Where(iv => iv.IdCuentaBancaria == idCuenta && iv.Descripcion.Contains("Cobranza"))
                    .Select(iv => new VMInformacionVenta
                    {
                        Id = iv.Id,
                        Fecha = (DateTime)iv.Fecha,
                        Entrega = (decimal)iv.Entrega,
                    })
                    .ToList();

                var totalEntregado = informacionVenta.Sum(x => x.Entrega);

                return new VMCuentaBancariaConVentas
                {
                    InformacionVentas = informacionVenta,
                    Entrega = totalEntregado
                };
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

        public static object Nuevo(VMCuentaBancaria model)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var cuenta = new CuentasBancarias
                    {
                        CBU = model.CBU,
                        Nombre = model.Nombre,
                        CuentaPropia = model.CuentaPropia,
                        Activo = model.Activo,
                        MontoPagar = model.MontoPagar
                    };

                    db.CuentasBancarias.Add(cuenta);
                    db.SaveChanges();

                    return new { Status = 0, Id = cuenta.Id };
                }
            }
            catch (Exception e)
            {
                return new { Status = 1 };
            }
        }

        public static bool Editar(VMCuentaBancaria model)
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
                        result.CuentaPropia = model.CuentaPropia;
                        result.Activo = model.Activo;
                        result.MontoPagar = model.MontoPagar;

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