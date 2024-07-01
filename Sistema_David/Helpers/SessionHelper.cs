using System;
using System.Collections.Generic;
using System.Linq;
using System;
using System.Configuration;
using System.Web;
using System.Web.Security;
using Sistema_David.Models;
using Newtonsoft.Json;
using Sistema_David.Models.DB;

namespace Sistema_David.Helpers
{
    public class SessionHelper
    {


        private static int sesionDuracion
        {
            get
            {
                Int32.TryParse(ConfigurationManager.AppSettings["DuracionSesion"], out int keyDuracion);
                return keyDuracion > 0 ? keyDuracion : 60;
            }
        }

        public static Usuarios UsuarioSistema
        {
            get
            {
                return GetUsuarioSesion();
            }
        }

        /// <summary>
        /// Permite setear un usuario en la sesión del sistema por X cantidad de tiempo, según key 'DuracionSesion' en web.config
        /// </summary>
        public static void SetUsuarioSesion(Usuarios usuario)
        {
            FormsAuthentication.SetAuthCookie(usuario.Usuario, true);
            var usuarioSerializado = JsonConvert.SerializeObject(usuario);
            var usuarioAutentificado = new FormsAuthenticationTicket(1, usuario.Usuario, DateTime.Now, DateTime.Now.AddMinutes(sesionDuracion), true, usuarioSerializado);
            var usuarioEncriptado = FormsAuthentication.Encrypt(usuarioAutentificado);
            HttpContext.Current.Response.Cookies.Add(new HttpCookie(FormsAuthentication.FormsCookieName, usuarioEncriptado));
        }

        public static void CerrarSession()
        {
            FormsAuthentication.SignOut();
        }

        /// <summary>
        /// Devuelve un objeto de tipo Usuario que está seteado en el UserData del HttpContext
        /// </summary>
        /// <returns></returns>
        public static Usuarios GetUsuarioSesion()
        {
            FormsAuthenticationTicket usuarioAutentificado = null;
            var usuarioCookie = HttpContext.Current.Request.Cookies[FormsAuthentication.FormsCookieName];
            if (usuarioCookie != null && !string.IsNullOrEmpty(usuarioCookie.Value))
                usuarioAutentificado = FormsAuthentication.Decrypt(usuarioCookie.Value);
            if (usuarioAutentificado != null && !usuarioAutentificado.Expired && !string.IsNullOrEmpty(usuarioAutentificado.UserData))
                return JsonConvert.DeserializeObject<Usuarios>(usuarioAutentificado.UserData);
            else
                return null;
        }
    }
}