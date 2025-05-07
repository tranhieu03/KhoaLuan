using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using System.Threading.Tasks;

namespace KhoaLuan1.Middleware
{
    public class SignalRAuthMiddleware
    {
        private readonly RequestDelegate _next;

        public SignalRAuthMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (context.Request.Path.StartsWithSegments("/chatHub") ||
                context.Request.Path.StartsWithSegments("/notificationHub"))
            {
                var userId = context.Session.GetInt32("UserId");
                var role = context.Session.GetString("Role");

                if (userId.HasValue)
                {
                    var claims = new List<Claim>
                    {
                        new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()),
                        new Claim("UserId", userId.Value.ToString())
                    };

                    if (!string.IsNullOrEmpty(role))
                    {
                        claims.Add(new Claim(ClaimTypes.Role, role));
                    }

                    var identity = new ClaimsIdentity(claims, "SignalR");
                    context.User = new ClaimsPrincipal(identity);
                }
            }

            await _next(context);
        }
    }
}