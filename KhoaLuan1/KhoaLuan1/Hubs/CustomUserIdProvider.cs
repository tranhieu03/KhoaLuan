// CustomUserIdProvider.cs
using Microsoft.AspNetCore.SignalR;
using System;

namespace KhoaLuan1.Hubs
{
    public class CustomUserIdProvider : IUserIdProvider
    {
        public string GetUserId(HubConnectionContext connection)
        {
            return connection.User?.FindFirst("UserId")?.Value;
        }
    }
}