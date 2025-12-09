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
    public class ClientesModel
    {

        public static List<VMCliente> ListaClientes()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var query = @"SELECT c.Id, c.Nombre, c.Fecha, c.Apellido, c.Dni, c.Direccion, c.Telefono, c.IdEstado, c.IdZona, c.Longitud, c.LimiteVentas, c.Latitud, c.FechaEncero, c.IdVendedorAsignado, z.Nombre as Zona, ec.Nombre as Estado, c.IdVendedor, u.Nombre as Vendedor, COALESCE(s.Saldo, 0) AS Saldo 
                      FROM Clientes c 
                      INNER JOIN EstadosClientes ec ON c.IdEstado = ec.Id 
                      INNER JOIN Usuarios u ON c.IdVendedor = u.Id 
					  INNER JOIN Zonas z on c.IdZona = z.Id
                      INNER JOIN (
                        SELECT idCliente, COALESCE(SUM(Restante), 0) AS Saldo 
                        FROM Ventas GROUP BY idCliente
                      ) s ON s.idCliente = c.Id";

                var result = db.Database.SqlQuery<VMCliente>(query).ToList();

                return result;
            }
        }

        public static List<VMCliente> ListaClientes(int idVendedor, string Nombre, string Apellido, string Dni, int idZona)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var query = @"SELECT c.Id, c.Nombre, c.Fecha, c.Apellido, c.Dni, c.Direccion, c.Telefono, c.IdEstado, c.IdZona, c.Longitud, c.LimiteVentas, c.Latitud, c.FechaEncero, c.IdVendedorAsignado, z.Nombre as Zona, ec.Nombre as Estado, c.IdVendedor, u.Nombre as Vendedor, COALESCE(s.Saldo, 0) AS Saldo 
                      FROM Clientes c 
                      INNER JOIN EstadosClientes ec ON c.IdEstado = ec.Id 
                      INNER JOIN Usuarios u ON c.IdVendedor = u.Id 
					  INNER JOIN Zonas z on c.IdZona = z.Id
                      LEFT JOIN (
                        SELECT idCliente, COALESCE(SUM(Restante), 0) AS Saldo 
                        FROM Ventas GROUP BY idCliente
                      ) s ON s.idCliente = c.Id";

                var result = db.Database.SqlQuery<VMCliente>(query)
                    .Where(x => (x.IdVendedor == idVendedor || idVendedor == -1) &&
                                (x.IdZona == idZona || idZona == -1) &&
                                (x.Nombre != null && x.Nombre.ToUpper().Contains(Nombre.ToUpper()) || string.IsNullOrEmpty(Nombre)) &&
                                (x.Apellido != null && x.Apellido.ToUpper().Contains(Apellido.ToUpper()) || string.IsNullOrEmpty(Apellido)) &&
                                (x.Dni != null && x.Dni.ToUpper().Contains(Dni.ToUpper()) || string.IsNullOrEmpty(Dni)))
                    .ToList();

                return result;
            }
        }

        public static List<VMCliente> ListaClientesVendedor(int idVendedor)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var query = @"SELECT c.Id, c.Nombre, c.Fecha, c.Apellido, c.Dni, c.Direccion, c.Telefono, c.IdEstado, c.IdZona, c.Longitud, c.LimiteVentas, c.Latitud, c.FechaEncero, c.IdVendedorAsignado, z.Nombre as Zona, ec.Nombre as Estado, c.IdVendedor, u.Nombre as Vendedor, COALESCE(s.Saldo, 0) AS Saldo 
                      FROM Clientes c 
                      INNER JOIN EstadosClientes ec ON c.IdEstado = ec.Id 
                      INNER JOIN Usuarios u ON c.IdVendedor = u.Id 
					  INNER JOIN Zonas z on c.IdZona = z.Id
                      INNER JOIN (
                        SELECT idCliente, COALESCE(SUM(Restante), 0) AS Saldo 
                        FROM Ventas GROUP BY idCliente
                      ) s ON s.idCliente = c.Id";

                var result = db.Database.SqlQuery<VMCliente>(query)
                     .Where(x => (x.IdVendedor == idVendedor || idVendedor == -1))
                     .ToList();

                return result;
            }
        }


        public static VMCliente InformacionCliente(int idCliente)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var query = @"SELECT c.Id, c.Nombre, c.Fecha, c.Apellido, c.Dni, c.Direccion, c.Telefono, c.IdEstado, c.IdZona, c.Longitud, c.Latitud, c.LimiteVentas, z.Nombre as Zona, c.FechaEncero, c.IdVendedorAsignado, ec.Nombre as Estado, c.IdVendedor, u.Nombre as Vendedor, COALESCE(s.Saldo, 0) AS Saldo 
                      FROM Clientes c 
                      INNER JOIN EstadosClientes ec ON c.IdEstado = ec.Id 
                      INNER JOIN Usuarios u ON c.IdVendedor = u.Id 
					  INNER JOIN Zonas z on c.IdZona = z.Id
                      LEFT JOIN (
                        SELECT idCliente, COALESCE(SUM(Restante), 0) AS Saldo 
                        FROM Ventas GROUP BY idCliente
                      ) s ON s.idCliente = c.Id";

                var result = db.Database.SqlQuery<VMCliente>(query)
                    .Where(x => (x.Id == idCliente))
                    .FirstOrDefault();

                return result;
            }
        }



        public static List<EstadosClientes> ListaEstados()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.Roles
                          .SqlQuery("select * from EstadosClientes")
                              select new EstadosClientes
                              {
                                  Id = d.Id,
                                  Nombre = d.Nombre
                              }).ToList();

                return result;
            }
        }

        public static List<Zonas> ListaZonas()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.Zonas
                          .SqlQuery("select * from Zonas")
                              select new Zonas
                              {
                                  Id = d.Id,
                                  Nombre = d.Nombre
                              }).ToList();

                return result;
            }
        }


        public static int NuevaDireccion(int idCliente, string Longitud, string Latitud)
        {
            try
            {
                using (var db = new Sistema_DavidEntities())
                {
                    var client = db.Clientes.FirstOrDefault(x => x.Id == idCliente);

                    if (client == null)
                        return 2; // Cliente no encontrado

                    client.Latitud = Latitud;
                    client.Longitud = Longitud;

                    db.Entry(client).Property(c => c.Latitud).IsModified = true;
                    db.Entry(client).Property(c => c.Longitud).IsModified = true;

                    db.SaveChanges();
                    return 0;
                }
            }
            catch
            {
                return 1; // Error general
            }
        }


        public static int Nuevo(VMCliente model)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    Clientes result = new Clientes();

                    Clientes client = db.Clientes.Where(x=> x.Dni.Trim() == model.Dni.Trim()).FirstOrDefault();

                    if(client  != null)
                    {
                        return 2;
                    }

                    if (model != null)
                    {
                        result.Nombre = model.Nombre;
                        result.Apellido = model.Apellido;
                        result.Dni = model.Dni;
                        result.Direccion = model.Direccion;
                        result.Telefono = model.Telefono;
                        result.IdVendedor = model.IdVendedor;
                        result.IdZona = model.IdZona;
                        result.Latitud = model.Latitud;
                        result.Longitud = model.Longitud;
                        result.IdEstado = 1;
                        result.Fecha = DateTime.Now;
                        result.FechaenCero = DateTime.Now;
                        result.IdVendedorAsignado = 0;
                        result.LimiteVentas = model.LimiteVentas != null ? model.LimiteVentas : 0;

                        db.Clientes.Add(result);
                        db.SaveChanges();

                        return 0;
                    }
                }

                return 1;
            }
            catch (Exception e)
            {
                return 1;
            }
        }

        public static bool Editar(VMCliente model)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    if (model != null)
                    {
                        var result = db.Clientes.Find(model.Id);
                        result.Nombre = model.Nombre;
                        result.Apellido = model.Apellido;
                        result.Dni = model.Dni;
                        result.Direccion = model.Direccion;
                        result.Telefono = model.Telefono;
                        result.IdVendedor = model.IdVendedor;
                        result.IdEstado = model.IdEstado;
                        result.IdZona = model.IdZona;
                        result.Longitud = model.Longitud;
                        result.Latitud = model.Latitud;
                        result.LimiteVentas = model.LimiteVentas != null ? model.LimiteVentas : 0;

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


        public static bool SetearClienteEnCero(int id)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    var cliente = db.Clientes.Find(id);

                    cliente.FechaenCero = DateTime.Now;
                    db.Entry(cliente).State = System.Data.Entity.EntityState.Modified;
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

        public static bool CambiarVendedor(int id, int idVendedor)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    var cliente = db.Clientes.Where(x => x.Id == id && x.IdVendedorAsignado == idVendedor).FirstOrDefault(); //SOLO LO ASIGNAMOS SI EL ASIGNADO ES EL QUE VENDE

                    if (cliente != null)
                    {
                        cliente.IdVendedor = idVendedor;
                        cliente.IdVendedorAsignado = null;
                        db.Entry(cliente).State = System.Data.Entity.EntityState.Modified;
                        db.SaveChanges();
                    }

                    return true;
                }
                return false;
            }
            catch (Exception e)
            {
                return false;
            }
        }

        public static bool DeleteClienteEnCero(int id)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    var cliente = db.Clientes.Find(id);

                    cliente.FechaenCero = null;
                    db.Entry(cliente).State = System.Data.Entity.EntityState.Modified;
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

        public static bool EditarTelefono(int id, string telefono)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    if (id > 0)
                    {
                        var result = db.Clientes.Find(id);
                        result.Telefono = telefono;

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


        public static List<Clientes> GuardarDatos(FileInput Imagenes, string path)
        {
            try
            {

                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    Imagenes.File.SaveAs(path + Path.GetFileName(Imagenes.File.FileName));

                    List<Clientes> listaClientes = new List<Clientes>();

                    SLDocument s1 = new SLDocument(path + Path.GetFileName(Imagenes.File.FileName));

                    var fila1 = s1.GetCellValueAsString(1, 1);
                    var fila2 = s1.GetCellValueAsString(1, 2);
                    var fila3 = s1.GetCellValueAsString(1, 3);
                    var fila4 = s1.GetCellValueAsString(1, 4);
                    var fila5 = s1.GetCellValueAsString(1, 5);
                    var fila6 = s1.GetCellValueAsString(1, 6);
                    var fila7 = s1.GetCellValueAsString(1, 7);

                    if (fila1 != "Nombre" || fila2 != "Apellido" || fila3 != "Dni" || fila4 != "Direccion" || fila5 != "IdEstado" || fila6 != "Telefono" || fila7 != "IdVendedor")
                    {
                        return null;
                    }

                    int iRow = 2;

                    while (!string.IsNullOrEmpty(s1.GetCellValueAsString(iRow, 1)))
                    {
                        var cliente = new Clientes
                        {
                            Nombre = s1.GetCellValueAsString(iRow, 1),
                            Apellido = s1.GetCellValueAsString(iRow, 2),
                            Dni = s1.GetCellValueAsString(iRow, 3),
                            Direccion = s1.GetCellValueAsString(iRow, 4),
                            IdEstado = int.Parse(s1.GetCellValueAsString(iRow, 5)),
                            Telefono = s1.GetCellValueAsString(iRow, 6),
                            IdVendedor = int.Parse(s1.GetCellValueAsString(iRow, 7))
                        };

                        listaClientes.Add(cliente);

                        db.Clientes.Add(cliente);


                        iRow++;
                    }


                    db.SaveChanges();

                    return listaClientes;
                }
            }

            catch (Exception e)
            {
                return null;
            }
        }

        public static VMCliente BuscarCliente(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                var query = @"SELECT c.Id, c.Nombre, c.Apellido, c.Fecha, c.Dni, c.Direccion, c.Telefono, c.IdEstado, c.IdZona, c.Longitud, c.Latitud, c.LimiteVentas, z.Nombre as Zona, c.FechaEncero, c.IdVendedorAsignado, ec.Nombre as Estado, c.IdVendedor, u.Nombre as Vendedor, COALESCE(s.Saldo, 0) AS Saldo 
                      FROM Clientes c 
                      INNER JOIN EstadosClientes ec ON c.IdEstado = ec.Id 
                      INNER JOIN Usuarios u ON c.IdVendedor = u.Id 
					  INNER JOIN Zonas z on c.IdZona = z.Id
                      LEFT JOIN (
                        SELECT idCliente, COALESCE(SUM(Restante), 0) AS Saldo 
                        FROM Ventas GROUP BY idCliente
                      ) s ON s.idCliente = c.Id";

                var result = db.Database.SqlQuery<VMCliente>(query)
                     .Where(x => x.Id == id).FirstOrDefault();


                return result;
            }
        }



        public static VMCliente BuscarCliente(string documento)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var user = (from d in db.Clientes
                         .SqlQuery("select c.Id, c.Nombre, c.Apellido, c.Fecha, c.Dni, c.Direccion, c.Telefono, c.IdEstado,  c.IdZona, c.Longitud, c.Latitud, c.FechaEncero,  c.LimiteVentas, c.IdVendedorAsignado, ec.Nombre as Estado, ec.Nombre, c.IdVendedor, u.Nombre as Vendedor from Clientes c inner join EstadosClientes ec on c.IdEstado = ec.Id inner join Usuarios u on c.IdVendedor  = u.Id")
                            select new VMCliente
                            {
                                Id = d.Id,
                                Nombre = d.Nombre,
                                Apellido = d.Apellido,
                                Dni = d.Dni,
                                Direccion = d.Direccion,
                                Telefono = d.Telefono,
                                Vendedor = d.Usuarios.Nombre,
                                Estado = d.EstadosClientes.Nombre,
                                IdEstado = d.IdEstado,
                                IdVendedor = d.IdVendedor,
                                IdZona = d.IdZona,
                                Longitud = d.Longitud,
                                Latitud = d.Latitud,
                                FechaenCero = d.FechaenCero != null ? d.FechaenCero : null,
                                IdVendedorAsignado = d.IdVendedorAsignado != null || d.IdVendedorAsignado == 0 ? d.IdVendedorAsignado : null,
                                LimiteVentas = (decimal)d.LimiteVentas
                            }).Where(x => x.Dni != null && x.Dni.Trim() == documento.Trim()).FirstOrDefault();

                return user;
            }
        }

        public static (List<VMVenta> Ventas  , decimal TotalRestante) RestanteVentasCliente(int idCliente)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                // Obtenemos la lista de ventas del cliente
                var ventas = (from v in db.Ventas
                              join c in db.Clientes on v.idCliente equals c.Id
                              join u in db.Usuarios on v.idVendedor equals u.Id
                              join t in db.TipoNegocio on v.IdTipoNegocio equals t.Id
                              where v.idCliente == idCliente
                              select new VMVenta
                              {
                                  Id = v.Id,
                                  idCliente = v.idCliente,
                                  Fecha = v.Fecha,
                                  Entrega = v.Entrega,
                                  Restante = v.Restante,
                              }).ToList();

                // Calculamos la suma de los valores restantes
                decimal totalRestante = ventas.Sum(v => v.Restante ?? 0); // Manejo de nulos si Restante puede ser null

                // Devolvemos la lista de ventas y la suma de los restantes
                return (ventas, totalRestante);
            }
        }

        public static string Eliminar(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var result = db.Clientes.Find(id);

                    if (result != null)
                    {

                        var ventas = VentasModel.ListaVentasCliente(id);

                        if (ventas.Count > 0)
                            return "No podes eliminar al cliente ya que tiene " + ventas.Count + " ventas asignadas.";

                        db.Clientes.Remove(result);
                        db.SaveChanges();

                        return "Cliente eliminado con exito";
                    }
                }

                return "Ha ocurrido un error";
            }
            catch (Exception e)
            {
                return "Ha ocurrido un error";
            }
        }

        public static VMCliente EnviarWhatssap(int id, string mensaje)
        {

            try
            {
                var result = BuscarCliente(id);
                return result;
            }
            catch (Exception e)
            {
                return null;
            }
        }

    }
}