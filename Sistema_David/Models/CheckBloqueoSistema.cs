using System.Web.Mvc;
using System.Web;
using Sistema_David.Helpers;
using Sistema_David.Models;
using Sistema_David.Models.DB;
using Sistema_David.Models.ViewModels;

public class CheckBloqueoSistemaAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext filterContext)
    {
        // Obtener el usuario actual desde la sesión o autenticación
        var usuario = SessionHelper.GetUsuarioSesion();

        VMUser userdb = null;

        if (usuario != null)
        {
           userdb = UsuariosModel.BuscarUsuario(usuario.Id);
        }


        // Si el usuario está bloqueado (BloqueoSistema == 1)
        if (usuario != null && userdb.BloqueoSistema == 1)
        {
            // Redirigir al login con un mensaje de advertencia
            filterContext.Result = new RedirectToRouteResult(
                new System.Web.Routing.RouteValueDictionary(new
                {
                    controller = "Login",
                    action = "Index",
                    mensajeBloqueo = "Tu cuenta se encuentra bloqueada para usar el sistema."
                })
            );
        }

        base.OnActionExecuting(filterContext);
    }
}
