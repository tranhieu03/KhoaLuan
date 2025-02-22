using KhoaLuan1.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
namespace KhoaLuan1.Hubs;
public class NotificationHub : Hub
{
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
            var role = Context.GetHttpContext()?.Session?.GetString("Role");
            var userId = Context.GetHttpContext()?.Session?.GetInt32("UserId");

            if (role == null || userId == null)
            {
                await base.OnConnectedAsync();
                return;
            }

            using (var context = new KhoaLuantestContext())
            {
                if (role == "seller")
                {
                    // Lấy RestaurantId từ bảng Restaurants
                    var restaurant = await context.Restaurants.FirstOrDefaultAsync(r => r.SellerId == userId.Value);
                    if (restaurant != null)
                    {
                        await Groups.AddToGroupAsync(Context.ConnectionId, $"Restaurant_{restaurant.RestaurantId}");
                    }
                }
                else if (role == "DeliveryPerson")
                {
                    // Tham gia nhóm DeliveryPersons
                    await Groups.AddToGroupAsync(Context.ConnectionId, "DeliveryPersons");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in OnConnectedAsync: {ex.Message}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        try
        {
            var role = Context.GetHttpContext()?.Session?.GetString("Role");
            var userId = Context.GetHttpContext()?.Session?.GetInt32("UserId");

            if (role == null || userId == null)
            {
                await base.OnDisconnectedAsync(exception);
                return;
            }

            using (var context = new KhoaLuantestContext())
            {
                if (role == "seller")
                {
                    var restaurant = await context.Restaurants.FirstOrDefaultAsync(r => r.SellerId == userId.Value);
                    if (restaurant != null)
                    {
                        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Restaurant_{restaurant.RestaurantId}");
                    }
                }
                else if (role == "DeliveryPerson")
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, "DeliveryPersons");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in OnDisconnectedAsync: {ex.Message}");
        }

        await base.OnDisconnectedAsync(exception);
    }
}

