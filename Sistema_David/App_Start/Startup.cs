using Microsoft.AspNet.SignalR;
using Microsoft.Owin;
using Owin;
using Sistema_David.Hubs;
using System;

[assembly: OwinStartup(typeof(Sistema_David.Startup))]

namespace Sistema_David
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            GlobalHost.DependencyResolver.Register(typeof(IUserIdProvider), () => new DavidUserIdProvider());
            GlobalHost.Configuration.DisconnectTimeout = TimeSpan.FromSeconds(30);
            GlobalHost.Configuration.KeepAlive = TimeSpan.FromSeconds(10);

            var hubConfig = new HubConfiguration
            {
                EnableDetailedErrors = false,
                EnableJavaScriptProxies = true
            };

            app.MapSignalR("/signalr", hubConfig);
        }
    }
}
