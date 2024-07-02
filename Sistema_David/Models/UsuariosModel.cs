using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Policy;
using System.Web;

namespace Sistema_David.Models
{
    public class UsuariosModel
    {
        public static List<User> ListaUsuarios()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var listUser = (from d in db.Usuarios
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, u.UltimaExportacion, u.UrlExportacion, r.Nombre as Rol, eu.Nombre as Estado from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id")
                                select new User
                                {
                                    Id = d.Id,
                                    Usuario = d.Usuario,
                                    Nombre = d.Nombre,
                                    Apellido = d.Apellido,
                                    Dni = d.Dni,
                                    Telefono = d.Telefono,
                                    Direccion = d.Direccion,
                                    IdRol = d.IdRol,
                                    Contrasena = d.Contrasena,
                                    CantVentas = d.CantVentas,
                                    IdEstado = d.IdEstado,
                                    Estado = d.EstadosUsuarios.Nombre,
                                    Rol = d.Roles.Nombre,
                                    UltimaExportacion = d.UltimaExportacion,
                                    UrlExportacion = d.UrlExportacion
                                }).ToList();

                return listUser;
            }
        }

        public static List<User> ListaUsuariosActivos()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var listUser = (from d in db.Usuarios
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, r.Nombre as Rol,  u.UltimaExportacion, u.UrlExportacion, eu.Nombre as Estado from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id")
                                select new User
                                {
                                    Id = d.Id,
                                    Usuario = d.Usuario,
                                    Nombre = d.Nombre,
                                    Apellido = d.Apellido,
                                    Dni = d.Dni,
                                    Telefono = d.Telefono,
                                    Direccion = d.Direccion,
                                    IdRol = d.IdRol,
                                    Contrasena = d.Contrasena,
                                    CantVentas = d.CantVentas,
                                    IdEstado = d.IdEstado,
                                    Estado = d.EstadosUsuarios.Nombre,
                                    Rol = d.Roles.Nombre,
                                    UltimaExportacion = d.UltimaExportacion,
                                    UrlExportacion = d.UrlExportacion
                                }).Where(x => x.IdEstado == 1).ToList();

                return listUser;
            }
        }

        public static List<User> ListaCobradores()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                // Realiza una consulta utilizando Linq to Entities
                var listUser = db.Usuarios
                    .Where(u => u.IdRol == 3 || u.IdRol == 1)
                    .Join(db.Roles, u => u.IdRol, r => r.Id, (u, r) => new { Usuario = u, Rol = r })
                    .Join(db.EstadosUsuarios, ur => ur.Usuario.IdEstado, eu => eu.Id, (ur, eu) => new { Usuario = ur.Usuario, Rol = ur.Rol.Nombre, Estado = eu.Nombre })
                    .GroupJoin(db.Ventas, ur_eu => ur_eu.Usuario.Id, v => v.idCobrador, (ur_eu, ventas) => new
                    {
                        Usuario = ur_eu.Usuario,
                        Rol = ur_eu.Rol,
                        Estado = ur_eu.Estado,
                        TotalCobranzas = ventas.Count() // Cuenta la cantidad de ventas del usuario
                    })
                    .Select(res => new User
                    {
                        Id = res.Usuario.Id,
                        Usuario = res.Usuario.Usuario,
                        Nombre = res.Usuario.Nombre,
                        Apellido = res.Usuario.Apellido,
                        Dni = res.Usuario.Dni,
                        Telefono = res.Usuario.Telefono,
                        Direccion = res.Usuario.Direccion,
                        IdRol = res.Usuario.IdRol,
                        Contrasena = res.Usuario.Contrasena,
                        CantVentas = res.Usuario.CantVentas,
                        IdEstado = res.Usuario.IdEstado,
                        UltimaExportacion = res.Usuario.UltimaExportacion,
                        UrlExportacion = res.Usuario.UrlExportacion,
                        Rol = res.Rol, // Se accede al nombre del rol de la estructura `res`
                        Estado = res.Estado, // Se accede al nombre del estado de la estructura `res`
                        TotalCobranzas = res.TotalCobranzas // Se accede a `TotalCobranzas` calculado en la estructura `res`
                    })
                    .ToList();

                return listUser;
            }
        }


        public static List<User> ListaCobradoresId(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var listUser = (from d in db.Usuarios
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, u.UltimaExportacion, u.UrlExportacion, r.Nombre as Rol, eu.Nombre as Estado from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id")
                                select new User
                                {
                                    Id = d.Id,
                                    Usuario = d.Usuario,
                                    Nombre = d.Nombre,
                                    Apellido = d.Apellido,
                                    Dni = d.Dni,
                                    Telefono = d.Telefono,
                                    Direccion = d.Direccion,
                                    IdRol = d.IdRol,
                                    Contrasena = d.Contrasena,
                                    CantVentas = d.CantVentas,
                                    IdEstado = d.IdEstado,
                                    Estado = d.EstadosUsuarios.Nombre,
                                    Rol = d.Roles.Nombre,
                                    UltimaExportacion = d.UltimaExportacion,
                                    UrlExportacion = d.UrlExportacion

                                }).Where(x => x.IdRol == 3 && x.Id == id).ToList();

                return listUser;
            }
        }

        public static List<User> ListaUsuariosId(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var listUser = (from d in db.Usuarios
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado,  u.UltimaExportacion, u.UrlExportacion, r.Nombre as Rol, eu.Nombre as Estado from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id")
                                select new User
                                {
                                    Id = d.Id,
                                    Usuario = d.Usuario,
                                    Nombre = d.Nombre,
                                    Apellido = d.Apellido,
                                    Dni = d.Dni,
                                    Telefono = d.Telefono,
                                    Direccion = d.Direccion,
                                    IdRol = d.IdRol,
                                    Contrasena = d.Contrasena,
                                    CantVentas = d.CantVentas,
                                    IdEstado = d.IdEstado,
                                    Estado = d.EstadosUsuarios.Nombre,
                                    Rol = d.Roles.Nombre,
                                    UltimaExportacion = d.UltimaExportacion,
                                    UrlExportacion = d.UrlExportacion
                                }).Where(x => x.Id == id).ToList();

                return listUser;
            }
        }

        public static List<Roles> ListaRoles()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.Roles
                          .SqlQuery("select * from Roles")
                              select new Roles
                              {
                                  Id = d.Id,
                                  Nombre = d.Nombre
                              }).ToList();

                return result;
            }
        }

        public static List<Roles> ListaEstados()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var result = (from d in db.EstadosUsuarios
                          .SqlQuery("select * from EstadosUsuarios")
                              select new Roles
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

        public static User BuscarUsuario(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var user = (from d in db.Usuarios
                         .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, r.Nombre as Rol,  u.UltimaExportacion, u.UrlExportacion, eu.Nombre as Estado from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id")
                            select new User
                            {
                                Id = d.Id,
                                Usuario = d.Usuario,
                                Nombre = d.Nombre,
                                Apellido = d.Apellido,
                                Dni = d.Dni,
                                Telefono = d.Telefono,
                                Direccion = d.Direccion,
                                IdRol = d.IdRol,
                                Contrasena = d.Contrasena,
                                CantVentas = d.CantVentas,
                                IdEstado = d.IdEstado,
                                Estado = d.EstadosUsuarios.Nombre,
                                Rol = d.Roles.Nombre,
                                UltimaExportacion = d.UltimaExportacion,
                                UrlExportacion = d.UrlExportacion
                            }).Where(x => x.Id == id).FirstOrDefault();

                return user;
            }
        }

        public static User BuscarUsuario(string nombre)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var user = (from d in db.Usuarios
                            select new User
                            {
                                Id = d.Id,
                                Usuario = d.Usuario,
                                Nombre = d.Nombre,
                                Apellido = d.Apellido,
                                Dni = d.Dni,
                                Telefono = d.Telefono,
                                Direccion = d.Direccion,
                                IdRol = d.IdRol,
                                Contrasena = d.Contrasena,
                                UltimaExportacion = d.UltimaExportacion,
                                UrlExportacion = d.UrlExportacion
                            }).Where(x => x.Nombre == nombre).FirstOrDefault();

                return user;
            }
        }

        public static string Eliminar(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var user = db.Usuarios.Find(id);

                    if (user != null)
                    {

                        var clientes = ClientesModel.ListaClientes(id, "", "", "", -1);


                        if (clientes.Count > 0)
                            return "No podes eliminar al usuario ya que tiene " + clientes.Count + " clientes asignados";

                        var ventas = VentasModel.ListaVentasUsuario(id);

                        if (ventas.Count > 0)
                            return "No podes eliminar al usuario ya que tiene " + ventas.Count + " ventas asignadas.";
                    }

                    if (user != null)
                    {
                        db.Usuarios.Remove(user);
                        db.SaveChanges();

                        return "Usuario eliminado con exito";
                    }
                }

                return "Ha ocurrido un error";
            }
            catch (Exception e)
            {
                return "Ha ocurrido un error";
            }
        }


        public static bool setFechaExportacion(int id)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var user = db.Usuarios.Find(id);

                    if (user != null)
                        user.UltimaExportacion = DateTime.Now;

                    db.SaveChanges();

                    return true;

                }

            }

            catch (Exception e)
            {
                return false;
            }
        }



        public static bool Nuevo(User model)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    Usuarios user = new Usuarios();

                    if (model != null)
                    {
                        user.Usuario = model.Usuario;
                        user.Nombre = model.Nombre;
                        user.Apellido = model.Apellido;
                        user.Dni = model.Dni;
                        user.Telefono = model.Telefono;
                        user.Direccion = model.Direccion;
                        user.Contrasena = model.Contrasena;
                        user.IdRol = model.IdRol;
                        user.CantVentas = 0;
                        user.IdEstado = 1;
                        user.UltimaExportacion = new DateTime(1900, 1, 1);
                        user.UrlExportacion = "N/A";


                        db.Usuarios.Add(user);
                        db.SaveChanges();

                        return true;
                    }
                }

                return false;
            }
            catch (Exception e)
            {
                return false;
            }
        }

        public static bool Editar(User model)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    if (model != null)
                    {
                        var user = db.Usuarios.Find(model.Id);
                        user.Usuario = model.Usuario;
                        user.Nombre = model.Nombre;
                        user.Apellido = model.Apellido;
                        user.Contrasena = model.Contrasena;
                        user.Dni = model.Dni;
                        user.Telefono = model.Telefono;
                        user.Direccion = model.Direccion;
                        user.IdRol = model.IdRol;
                        user.IdEstado = model.IdEstado;
                        user.UrlExportacion = model.UrlExportacion;
                        db.Entry(user).State = System.Data.Entity.EntityState.Modified;
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
    }
}
