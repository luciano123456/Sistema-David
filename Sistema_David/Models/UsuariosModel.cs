using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
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
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, r.Nombre as Rol, eu.Nombre as Estado from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id")
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
                                    Rol = d.Roles.Nombre
                                }).ToList();

                return listUser;
            }
        }

        public static List<User> ListaUsuariosActivos()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var listUser = (from d in db.Usuarios
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, r.Nombre as Rol, eu.Nombre as Estado from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id")
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
                                    Rol = d.Roles.Nombre
                                }).Where(x => x.IdEstado == 1).ToList();

                return listUser;
            }
        }

        public static List<User> ListaCobradores()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var listUser = (from d in db.Usuarios
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, r.Nombre as Rol, eu.Nombre as Estado from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id")
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
                                    Rol = d.Roles.Nombre
                                    
                                }).Where(x => x.IdRol == 3 || x.IdRol == 1).ToList();

                return listUser;
            }
        }

        public static List<User> ListaCobradoresId(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var listUser = (from d in db.Usuarios
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, r.Nombre as Rol, eu.Nombre as Estado from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id")
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
                                    Rol = d.Roles.Nombre

                                }).Where(x => x.IdRol == 3 && x.Id == id).ToList();

                return listUser;
            }
        }

        public static List<User> ListaUsuariosId(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var listUser = (from d in db.Usuarios
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, r.Nombre as Rol, eu.Nombre as Estado from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id")
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
                                    Rol = d.Roles.Nombre
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

        public static List<Zonas> ListaZonas ()
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
                         .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, r.Nombre as Rol, eu.Nombre as Estado from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id")
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
                                Rol = d.Roles.Nombre
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
                                Contrasena = d.Contrasena
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
                            return "No podes eliminar al usuario ya que tiene " +  clientes.Count + " clientes asignados";

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
