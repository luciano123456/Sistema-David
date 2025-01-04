using Sistema_David.Helpers;
using Sistema_David.Models.DB;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models
{
    public class LoginModel
    {
        public static Usuarios LoginUsuario(String Usuario, string contrasena)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var oPeople = db.Usuarios.Where(m => m.Usuario == Usuario).FirstOrDefault();
                if (oPeople == null || oPeople.Contrasena != contrasena)
                {
                    return null;
                }
                else
                {

                    var user = new Usuarios();

                    user.Usuario = oPeople.Usuario;
                    user.Nombre = oPeople.Nombre;
                    user.Apellido = oPeople.Apellido;
                    user.Contrasena = oPeople.Contrasena;
                    user.IdRol = oPeople.IdRol;
                    user.IdEstado = oPeople.IdEstado;
                    user.CantVentas = oPeople.CantVentas;
                    user.Direccion = oPeople.Direccion;
                    user.Dni = oPeople.Dni;
                    user.Id = oPeople.Id;
                    user.Telefono = oPeople.Telefono;
                    user.ClientesCero = oPeople.ClientesCero;
                    user.BloqueoSistema = oPeople.BloqueoSistema;
                    user.IdTipoNegocio = oPeople.IdTipoNegocio;
                    SessionHelper.SetUsuarioSesion(user);
                    return user;
                }
            }

        }

        public static bool Cerrar_Sesion()
        {
                SessionHelper.CerrarSession();
                return true;
            }
    }
}