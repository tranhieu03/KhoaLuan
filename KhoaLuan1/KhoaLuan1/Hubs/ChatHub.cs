using Microsoft.AspNetCore.SignalR;
using System.Text.RegularExpressions;

namespace KhoaLuan1.Hubs
{
    public class ChatHub:Hub
    {
        public async Task SendMessage(string groupName, string sender, string message)
        {
            await Clients.Group(groupName).SendAsync("ReceiveMessage", sender, message);
        }

        // Tham gia vào nhóm (phòng chat giữa user và cửa hàng)
        public async Task JoinGroup(string groupName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            await Clients.Group(groupName).SendAsync("Notify", $"{Context.ConnectionId} has joined the group.");
        }
        public async Task LeaveGroup(string groupName)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            await Clients.Group(groupName).SendAsync("Notify", $"{Context.ConnectionId} has left the group.");
        }
    }
}
