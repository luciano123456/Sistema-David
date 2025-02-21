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
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, u.UltimaExportacion, u.UrlExportacion, u.ClientesCero,  r.Nombre as Rol, eu.Nombre as Estado, u.IdTipoNegocio, tn.Nombre, u.BloqueoSistema from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id  inner join TipoNegocio tn on u.IdTipoNegocio = tn.Id order by u.IdEstado")
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
                                    UrlExportacion = d.UrlExportacion,
                                    ClientesCero = (int)d.ClientesCero,
                                    IdTipoNegocio = d.IdTipoNegocio, 
                                    BloqueoSistema = d.BloqueoSistema,
                                    TipoNegocio = db.TipoNegocio.FirstOrDefault(u => u.Id == d.IdTipoNegocio).Nombre,
                                }).ToList();

                return listUser;
            }
        }

        public static List<TipoNegocio> ListaTipoNegocio()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var listNegocios = db.TipoNegocio.ToList();

                return listNegocios;
            }
        }


        public static TipoNegocio BuscarTipoNegocio(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var listNegocios = db.TipoNegocio.Where(x => x.Id == id).FirstOrDefault();

                return listNegocios;
            }
        }

        public static bool CambiarDiasVencimientoNegocio(int id, int valor)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var negocio = db.TipoNegocio.Find(id);

                if (negocio != null)
                    negocio.DiasVencimiento = valor;

                db.SaveChanges();

                return true;
            }
        }

        public static List<User> ListaUsuariosActivos(int TipoNegocio)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var listUser = (from d in db.Usuarios
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, u.UltimaExportacion, u.UrlExportacion, u.ClientesCero,  r.Nombre as Rol, eu.Nombre as Estado, u.IdTipoNegocio, tn.Nombre, u.BloqueoSistema from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id  inner join TipoNegocio tn on u.IdTipoNegocio = tn.Id order by  u.IdRol, u.IdEstado")
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
                                    UrlExportacion = d.UrlExportacion,
                                    ClientesCero = (int)d.ClientesCero,
                                    IdTipoNegocio = d.IdTipoNegocio,
                                    BloqueoSistema = d.BloqueoSistema,
                                    TipoNegocio = db.TipoNegocio.FirstOrDefault(u => u.Id == d.IdTipoNegocio).Nombre,
                                }).Where(x => x.IdEstado == 1 && (x.IdTipoNegocio == TipoNegocio || TipoNegocio == -1 || (x.IdRol == 1 || x.IdRol == 3 || x.IdRol == 4))).ToList();


                return listUser;
            }
        }


        public static List<User> ListaActivos()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var listUser = (from d in db.Usuarios
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, u.UltimaExportacion, u.UrlExportacion, u.ClientesCero,  r.Nombre as Rol, eu.Nombre as Estado, u.IdTipoNegocio, tn.Nombre, u.BloqueoSistema from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id  inner join TipoNegocio tn on u.IdTipoNegocio = tn.Id order by  u.IdRol, u.IdEstado")
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
                                    UrlExportacion = d.UrlExportacion,
                                    ClientesCero = (int)d.ClientesCero,
                                    IdTipoNegocio = d.IdTipoNegocio,
                                    BloqueoSistema = d.BloqueoSistema,
                                    TipoNegocio = db.TipoNegocio.FirstOrDefault(u => u.Id == d.IdTipoNegocio).Nombre,
                                }).Where(x => x.IdEstado == 1).ToList();


                return listUser;
            }
        }

       public static List<User> ListaUsuariosConAsignacionActivos()
{
    using (Sistema_DavidEntities db = new Sistema_DavidEntities())
    {
        // Optimizar consulta SQL para contar TotalAsignados directamente en la consulta
        var usuariosActivos = db.Database.SqlQuery<User>(
            @"
                SELECT u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, 
                       u.IdEstado, u.IdTipoNegocio, u.BloqueoSistema, u.ClientesCero, r.Nombre AS Rol, u.UltimaExportacion, 
                       u.UrlExportacion, eu.Nombre AS Estado,
                       (SELECT COUNT(*) FROM Clientes c WHERE c.IdVendedorAsignado = u.Id) AS TotalAsignados
                FROM Usuarios u
                INNER JOIN Roles r ON u.IdRol = r.Id
                INNER JOIN EstadosUsuarios eu ON u.IdEstado = eu.Id
                WHERE u.IdEstado = 1")
            .ToList();

        return usuariosActivos;
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
                        TotalCobranzas = res.TotalCobranzas, // Se accede a `TotalCobranzas` calculado en la estructura `res`,
                        ClientesCero = (int)res.Usuario.ClientesCero,
                        IdTipoNegocio = res.Usuario.IdTipoNegocio,
                        BloqueoSistema = res.Usuario.BloqueoSistema
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
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, u.UltimaExportacion, u.UrlExportacion, u.ClientesCero,  r.Nombre as Rol, eu.Nombre as Estado, u.IdTipoNegocio, tn.Nombre, u.BloqueoSistema from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id  inner join TipoNegocio tn on u.IdTipoNegocio = tn.Id order by u.IdEstado")
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
                                    UrlExportacion = d.UrlExportacion,
                                    ClientesCero = (int)d.ClientesCero,
                                    IdTipoNegocio = d.IdTipoNegocio,
                                    BloqueoSistema = d.BloqueoSistema,
                                    TipoNegocio = db.TipoNegocio.FirstOrDefault(u => u.Id == d.IdTipoNegocio).Nombre,

                                }).Where(x => x.IdRol == 3 && x.Id == id).ToList();

                return listUser;
            }
        }

        public static List<User> ListaUsuariosId(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var listUser = (from d in db.Usuarios
                            .SqlQuery("select u.Id, u.Usuario, u.Nombre, u.Apellido, u.Dni, u.Telefono, u.Direccion, u.IdRol, u.Contrasena, u.CantVentas, u.IdEstado, u.UltimaExportacion, u.UrlExportacion, u.ClientesCero,  r.Nombre as Rol, eu.Nombre as Estado, u.IdTipoNegocio, tn.Nombre, u.BloqueoSistema from Usuarios u inner join Roles r on u.IdRol = r.Id inner join EstadosUsuarios eu on u.IdEstado = eu.Id  inner join TipoNegocio tn on u.IdTipoNegocio = tn.Id order by u.IdEstado")
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
                                    UrlExportacion = d.UrlExportacion,
                                    ClientesCero = (int)d.ClientesCero,
                                    IdTipoNegocio = d.IdTipoNegocio,
                                    BloqueoSistema = d.BloqueoSistema,
                                    TipoNegocio = db.TipoNegocio.FirstOrDefault(u => u.Id == d.IdTipoNegocio).Nombre,
                                }).Where(x => x.Id == id).ToList();

                return listUser;
            }
        }

        public static List<Roles> ListaRoles()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                // Usar LINQ para obtener los roles de la base de datos
                var result = db.Roles
                               .Select(r => new { r.Id, r.Nombre })
                               .ToList();

                // Convertir el resultado a una lista de objetos Roles
                var roles = result.Select(r => new Roles { Id = r.Id, Nombre = r.Nombre }).ToList();

                return roles;
            }
        }


        public static List<EstadosUsuarios> ListaEstados()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                // Usar LINQ para obtener los estados de la base de datos
                var result = db.EstadosUsuarios
                               .Select(e => new { e.Id, e.Nombre }) // Selecciona solo los campos necesarios
                               .ToList();

                // Convertir el resultado a una lista de objetos Roles
                var estados = result.Select(e => new EstadosUsuarios { Id = e.Id, Nombre = e.Nombre }).ToList();

                return estados;
            }
        }

        public static List<Zonas> ListaZonas()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                // Usar LINQ para obtener los estados de la base de datos
                var result = db.Zonas
                               .Select(e => new { e.Id, e.Nombre }) // Selecciona solo los campos necesarios
                               .ToList();

                // Convertir el resultado a una lista de objetos Roles
                var estados = result.Select(e => new Zonas { Id = e.Id, Nombre = e.Nombre }).ToList();

                return estados;
            }
        }




        public static User BuscarUsuario(int id)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                // Uso de SQL directamente para hacer un solo SELECT
                var user = db.Usuarios
                            .Where(u => u.Id == id)
                            .Join(db.Roles, u => u.IdRol, r => r.Id, (u, r) => new { u, r })
                            .Join(db.EstadosUsuarios, ur => ur.u.IdEstado, eu => eu.Id, (ur, eu) => new { ur.u, ur.r, eu })
                            .Join(db.TipoNegocio, ure => ure.u.IdTipoNegocio, tn => tn.Id, (ure, tn) => new User
                            {
                                Id = ure.u.Id,
                                Usuario = ure.u.Usuario,
                                Nombre = ure.u.Nombre,
                                Apellido = ure.u.Apellido,
                                Dni = ure.u.Dni,
                                Telefono = ure.u.Telefono,
                                Direccion = ure.u.Direccion,
                                IdRol = ure.u.IdRol,
                                Contrasena = ure.u.Contrasena,
                                CantVentas = ure.u.CantVentas,
                                IdEstado = ure.u.IdEstado,
                                Estado = ure.eu.Nombre,
                                Rol = ure.r.Nombre,
                                UltimaExportacion = ure.u.UltimaExportacion,
                                UrlExportacion = ure.u.UrlExportacion,
                                ClientesCero = (int)ure.u.ClientesCero,
                                IdTipoNegocio = ure.u.IdTipoNegocio,
                                BloqueoSistema = ure.u.BloqueoSistema,
                                TipoNegocio = tn.Nombre
                            })
                            .FirstOrDefault();

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
                                UrlExportacion = d.UrlExportacion,
                                ClientesCero = (int)d.ClientesCero,
                                IdTipoNegocio = d.IdTipoNegocio,
                                BloqueoSistema = d.BloqueoSistema,
                                TipoNegocio = db.TipoNegocio.FirstOrDefault(u => u.Id == d.IdTipoNegocio).Nombre,
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

        public static bool setClientesCero(int id, int valor)
        {

            try
            {
                using (var db = new Sistema_DavidEntities())
                {

                    var user = db.Usuarios.Find(id);

                    if (user != null)
                        user.ClientesCero = valor;

                    db.SaveChanges();

                    return true;

                }

            }

            catch (Exception e)
            {
                return false;
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
                        user.ClientesCero = 0;
                        user.IdTipoNegocio = model.IdTipoNegocio;
                        user.BloqueoSistema = 0;


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

        public static bool BloqueoSistema(int id, int bloqueo)
        {

            try
            {
                using (Sistema_DavidEntities db = new Sistema_DavidEntities())
                {

                    var user = db.Usuarios.Find(id);
                    user.BloqueoSistema = bloqueo;


                    db.Entry(user).State = System.Data.Entity.EntityState.Modified;
                    db.SaveChanges();

                    return true;
                }
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
                        user.IdTipoNegocio = model.IdTipoNegocio;
                        user.BloqueoSistema = model.BloqueoSistema;
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
