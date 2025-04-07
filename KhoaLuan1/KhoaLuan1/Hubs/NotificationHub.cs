using KhoaLuan1.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace KhoaLuan1.Hubs
{
    public class NotificationHub : Hub
    {
        private readonly KhoaluantestContext _context;

        public NotificationHub(KhoaluantestContext context)
        {
            _context = context;
        }

        public async Task SendNotification(string groupName, string message)
        {
            await Clients.Group(groupName).SendAsync("ReceiveNotification", message);
        }

        public async Task JoinGroup(string groupName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        }

        public async Task LeaveGroup(string groupName)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        }

        public override async Task OnConnectedAsync()
        {
            try
            {
                var httpContext = Context.GetHttpContext();
                var role = httpContext?.Session.GetString("Role");
                var userId = httpContext?.Session.GetInt32("UserId");

                if (role == "DeliveryPerson")
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, "DeliveryPersons");
                    Console.WriteLine($"DeliveryPerson {userId} connected");
                }
                else if (role == "seller")
                {
                    var restaurant = await _context.Restaurants
                        .FirstOrDefaultAsync(r => r.SellerId == userId);
                    if (restaurant != null)
                    {
                        await Groups.AddToGroupAsync(Context.ConnectionId, $"Restaurant_{restaurant.RestaurantId}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"OnConnectedAsync error: {ex.Message}");
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            try
            {
                var httpContext = Context.GetHttpContext();
                var role = httpContext?.Session.GetString("Role");
                var userId = httpContext?.Session.GetInt32("UserId");

                if (role == "DeliveryPerson")
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, "DeliveryPersons");
                }
                else if (role == "seller")
                {
                    var restaurant = await _context.Restaurants
                        .FirstOrDefaultAsync(r => r.SellerId == userId);
                    if (restaurant != null)
                    {
                        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Restaurant_{restaurant.RestaurantId}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"OnDisconnectedAsync error: {ex.Message}");
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}