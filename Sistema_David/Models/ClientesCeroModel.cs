using DocumentFormat.OpenXml.Office2010.Excel;
using Sistema_David.Helpers;
using Sistema_David.Models.DB;
using Sistema_David.Models.ViewModels;
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
    public class ClientesCeroModel
    {

        public static List<Cliente> ListaClientes(int idVendedor, string Nombre, string Apellido, string Dni, int idZona, int idVendedorAsignado)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var query = @"SELECT c.Id, c.Nombre, c.Fecha, c.Apellido, c.Dni, c.Direccion, c.Telefono, c.IdEstado, c.IdZona, c.Longitud, c.Latitud, c.FechaEncero, c.IdVendedorAsignado, z.Nombre as Zona, ec.Nombre as Estado, c.IdVendedor, u.Nombre as Vendedor, ua.Nombre as VendedorAsignado, COALESCE(s.Saldo, 0) AS Saldo 
                      FROM Clientes c 
                      INNER JOIN EstadosClientes ec ON c.IdEstado = ec.Id 
                      INNER JOIN Usuarios u ON c.IdVendedor = u.Id 
                      LEFT JOIN Usuarios ua ON c.IdVendedorAsignado = ua.Id 
                      INNER JOIN Zonas z on c.IdZona = z.Id
                      LEFT JOIN (
                        SELECT idCliente, COALESCE(SUM(Restante), 0) AS Saldo 
                        FROM Ventas GROUP BY idCliente
                      ) s ON s.idCliente = c.Id";

                var saldoPermitido = LimitesModel.BuscarValorLimite("ClientesSaldo");

                var result = db.Database.SqlQuery<Cliente>(query)
                    .Where(x =>
                        (idVendedor == -1 || x.IdVendedor == idVendedor) &&
                        (idZona == -1 || x.IdZona == idZona) &&
                        (string.IsNullOrEmpty(Nombre) || (x.Nombre != null && x.Nombre.ToUpper().Contains(Nombre.ToUpper()))) &&
                        (string.IsNullOrEmpty(Apellido) || (x.Apellido != null && x.Apellido.ToUpper().Contains(Apellido.ToUpper()))) &&
                        (string.IsNullOrEmpty(Dni) || (x.Dni != null && x.Dni.ToUpper().Contains(Dni.ToUpper()))) &&
                        (idVendedorAsignado == -1 || x.IdVendedorAsignado == idVendedorAsignado) &&
                        x.Saldo <= saldoPermitido.Valor)
                    .ToList();

                return result;
            }
        }


        public static List<InformacionClienteAsignado> ListaInformacion(int idCliente)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var result = (from iv in db.InformacionClientesAsignados
                              join c in db.Clientes on iv.IdCliente equals c.Id
                              join u in db.Usuarios on iv.idVendedor equals u.Id
                              where iv.IdCliente == idCliente 
                              select new InformacionClienteAsignado
                              {
                                  Id = iv.Id,
                                  Fecha = iv.Fecha,
                                  IdCliente = iv.IdCliente,
                                  Cliente = db.Clientes.Where(x => x.Id == iv.IdCliente).FirstOrDefault().Nombre,
                                  Vendedor = db.Usuarios.Where(x => x.Id == iv.idVendedor).FirstOrDefault().Nombre,
                                  Observacion = iv.Observacion,
                              }).ToList();

                return result;
            }
        }

        public static bool AgregarInformacionCliente(InformacionClienteAsignado model)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    if (model == null)
                        return false; // Código para modelo nulo

                    InformacionClientesAsignados infocliente = new InformacionClientesAsignados
                    {
                        Id = model.Id,
                        Fecha = DateTime.Now,
                        IdCliente = model.IdCliente,
                        idVendedor = SessionHelper.GetUsuarioSesion().Id,
                        Observacion  = model.Observacion
                    };


                    db.InformacionClientesAsignados.Add(infocliente);
                    db.SaveChanges();

                    return true; // Éxito
                }
            }
            catch (Exception e)
            {
                // Manejar la excepción
                return false; // Código para excepción
            }
        }

        public static bool AsignarVendedor(List<int> clientes, int idVendedor)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    foreach (int client in clientes)
                    {

                        var cliente = db.Clientes.Find(client);

                        if (cliente != null)
                        {
                            cliente.IdVendedorAsignado = idVendedor;
                        }
                        else
                        {
                            return false;
                        }

                        db.Entry(cliente).State = System.Data.Entity.EntityState.Modified;

                        

                    }

                    db.SaveChanges();

                    if(idVendedor > 0) UsuariosModel.setClientesCero(idVendedor, 1);

                    return true;
                }
            }
            catch (Exception e)
            {
                return false;
            }

        }



    }
}