using Microsoft.AspNet.SignalR;
using Sistema_David.Helpers;

namespace Sistema_David.Hubs
{
    public class DavidUserIdProvider : IUserIdProvider
    {
        public string GetUserId(IRequest request)
        {
            var usuario = SessionHelper.GetUsuarioSesion();
            return usuario != null && usuario.Id > 0 ? usuario.Id.ToString() : null;
        }
    }
}
