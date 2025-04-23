using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using KhoaLuan1.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;

namespace KhoaLuan1.Hubs
{
    public class ChatHub : Hub
    {
        private readonly KhoaluantestContext _context;
        private readonly ILogger<ChatHub> _logger;

        public ChatHub(KhoaluantestContext context, ILogger<ChatHub> logger)
        {
            _context = context;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst("UserId")?.Value;
            var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                _logger.LogInformation($"User {userId} with role {role} connected to ChatHub");

                // Tự động tham gia các nhóm chat dựa trên vai trò
                int userIdInt = int.Parse(userId);

                if (role == "Customer")
                {
                    // Khách hàng tham gia vào tất cả nhóm chat của đơn hàng của họ
                    var orders = await _context.Orders
                        .Where(o => o.UserId == userIdInt &&
                               (o.Status == "InDelivery" || o.Status == "ReadyForDelivery"))
                        .Select(o => o.OrderId)
                        .ToListAsync();

                    foreach (var orderId in orders)
                    {
                        await Groups.AddToGroupAsync(Context.ConnectionId, $"Order_{orderId}");
                        _logger.LogInformation($"Customer {userId} joined Order_{orderId} group");
                    }
                }
                else if (role == "DeliveryPerson")
                {
                    // Shipper tham gia vào tất cả nhóm chat của đơn hàng mà họ đang giao
                    var orders = await _context.Orders
                        .Where(o => o.DeliveryPersonId == userIdInt && o.Status == "InDelivery")
                        .Select(o => o.OrderId)
                        .ToListAsync();

                    foreach (var orderId in orders)
                    {
                        await Groups.AddToGroupAsync(Context.ConnectionId, $"Order_{orderId}");
                        _logger.LogInformation($"DeliveryPerson {userId} joined Order_{orderId} group");
                    }
                }
                else if (role == "Seller")
                {
                    // Người bán tham gia vào tất cả nhóm chat của đơn hàng từ nhà hàng của họ
                    var restaurantIds = await _context.Restaurants
                        .Where(r => r.SellerId == userIdInt)
                        .Select(r => r.RestaurantId)
                        .ToListAsync();

                    foreach (var restaurantId in restaurantIds)
                    {
                        var orders = await _context.Orders
                            .Where(o => o.RestaurantId == restaurantId &&
                                  (o.Status == "InDelivery" || o.Status == "ReadyForDelivery"))
                            .Select(o => o.OrderId)
                            .ToListAsync();

                        foreach (var orderId in orders)
                        {
                            await Groups.AddToGroupAsync(Context.ConnectionId, $"Order_{orderId}");
                            _logger.LogInformation($"Seller {userId} joined Order_{orderId} group for restaurant {restaurantId}");
                        }
                    }
                }
            }

            await base.OnConnectedAsync();
        }

        public async Task SendMessage(int orderId, string content, int? receiverId = null)
        {
            try
            {
                // Lấy thông tin người dùng từ context
                var userId = Context.User?.FindFirst("UserId")?.Value;
                var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    throw new HubException("Bạn cần đăng nhập để gửi tin nhắn.");
                }

                int senderIdInt = int.Parse(userId);

                // Kiểm tra quyền truy cập vào order
                var order = await _context.Orders
                    .Include(o => o.User)
                    .Include(o => o.DeliveryPerson)
                    .Include(o => o.Restaurant)
                    .FirstOrDefaultAsync(o => o.OrderId == orderId);

                if (order == null)
                {
                    throw new HubException("Không tìm thấy đơn hàng.");
                }

                // Kiểm tra người dùng có quyền chat trong order này không
                bool hasAccess = false;

                if (role == "Customer" && order.UserId == senderIdInt)
                    hasAccess = true;
                else if (role == "DeliveryPerson" && order.DeliveryPersonId == senderIdInt)
                    hasAccess = true;
                else if (role == "Seller")
                {
                    var restaurant = await _context.Restaurants
                        .FirstOrDefaultAsync(r => r.RestaurantId == order.RestaurantId && r.SellerId == senderIdInt);
                    if (restaurant != null)
                        hasAccess = true;
                }

                if (!hasAccess)
                {
                    throw new HubException("Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này.");
                }

                // Kiểm tra nếu là Customer thì phải chỉ định người nhận
                if (role == "Customer" && receiverId == null)
                {
                    throw new HubException("Khách hàng cần chỉ định người nhận tin nhắn (Người bán hoặc Người giao hàng).");
                }

                // Kiểm tra tính hợp lệ của người nhận (nếu có)
                if (receiverId != null)
                {
                    bool validReceiver = false;

                    // Nếu người gửi là Customer
                    if (role == "Customer")
                    {
                        // Người nhận phải là Seller hoặc DeliveryPerson của đơn hàng này
                        if (receiverId == order.Restaurant?.SellerId || receiverId == order.DeliveryPersonId)
                            validReceiver = true;
                    }
                    // Nếu người gửi là Seller hoặc DeliveryPerson thì có thể gửi cho bất kỳ ai trong đơn hàng
                    else
                    {
                        if (receiverId == order.UserId || receiverId == order.Restaurant?.SellerId || receiverId == order.DeliveryPersonId)
                            validReceiver = true;
                    }

                    if (!validReceiver)
                    {
                        throw new HubException("Người nhận không hợp lệ.");
                    }
                }

                // Lưu tin nhắn vào database
                var message = new Message
                {
                    SenderId = senderIdInt,
                    OrderId = orderId,
                    ReceiverId = receiverId, // Null means message to all participants
                    Content = content,
                    SentAt = DateTime.UtcNow,
                    IsRead = false
                };

                await _context.Messages.AddAsync(message);
                await _context.SaveChangesAsync();

                // Lấy thông tin người gửi để hiển thị trên giao diện
                var sender = await _context.Users
                    .FirstOrDefaultAsync(u => u.UserId == senderIdInt);

                var messageData = new
                {
                    messageId = message.MessageId,
                    senderId = message.SenderId,
                    senderName = sender.FullName,
                    senderRole = role,
                    receiverId = message.ReceiverId,
                    content = message.Content,
                    sentAt = message.SentAt,
                    orderId = message.OrderId,
                    isPrivate = receiverId != null
                };

                // Nếu là tin nhắn riêng tư, chỉ gửi cho người nhận và người gửi
                if (receiverId != null)
                {
                    await Clients.User(receiverId.ToString()).SendAsync("ReceiveMessage", messageData);
                    // Gửi lại cho người gửi để họ cũng thấy tin nhắn đã gửi
                    await Clients.Caller.SendAsync("ReceiveMessage", messageData);
                }
                // Nếu là tin nhắn chung, gửi cho tất cả trong nhóm
                else
                {
                    await Clients.Group($"Order_{orderId}").SendAsync("ReceiveMessage", messageData);
                }

                // Tạo thông báo cho người nhận tin nhắn
               
                    await CreateNotificationForUser(message, order, sender.FullName, receiverId.Value);
               
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SendMessage method");
                throw new HubException($"Lỗi khi gửi tin nhắn: {ex.Message}");
            }
        }

        private async Task CreateNotificationForUser(Message message, Order order, string senderName, int receiverId)
        {
            // Bỏ qua nếu người nhận là người gửi
            if (receiverId == message.SenderId)
                return;

            var notification = new Notification
            {
                UserId = receiverId,
                Message = $"Tin nhắn riêng tư về đơn hàng #{order.OrderId} từ {senderName}",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            await _context.Notifications.AddAsync(notification);
            await _context.SaveChangesAsync();

            // Gửi thông báo thông qua SignalR
            await Clients.User(receiverId.ToString())
                .SendAsync("ReceiveNotification", new
                {
                    id = notification.Id,
                    message = notification.Message,
                    createdAt = notification.CreatedAt,
                    isRead = notification.IsRead
                });
        }
        public async Task JoinOrderChat(int orderId)
        {
            var userId = Context.User?.FindFirst("UserId")?.Value;
            var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                throw new HubException("Bạn cần đăng nhập để tham gia cuộc trò chuyện.");
            }

            int userIdInt = int.Parse(userId);

            // Kiểm tra quyền truy cập
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
            {
                throw new HubException("Không tìm thấy đơn hàng.");
            }

            bool hasAccess = false;

            if (role == "Customer" && order.UserId == userIdInt)
                hasAccess = true;
            else if (role == "DeliveryPerson" && order.DeliveryPersonId == userIdInt)
                hasAccess = true;
            else if (role == "Seller")
            {
                var restaurant = await _context.Restaurants
                    .FirstOrDefaultAsync(r => r.RestaurantId == order.RestaurantId && r.SellerId == userIdInt);
                if (restaurant != null)
                    hasAccess = true;
            }

            if (!hasAccess)
            {
                throw new HubException("Bạn không có quyền tham gia cuộc trò chuyện này.");
            }

            // Tham gia vào nhóm chat
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Order_{orderId}");
            _logger.LogInformation($"User {userId} joined Order_{orderId} group manually");

            // Thông báo cho người dùng đã tham gia thành công
            await Clients.Caller.SendAsync("JoinedChat", orderId);
        }

        public async Task LeaveOrderChat(int orderId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Order_{orderId}");
            await Clients.Caller.SendAsync("LeftChat", orderId);
        }

        public async Task MarkAsRead(int messageId)
        {
            var userId = Context.User?.FindFirst("UserId")?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                throw new HubException("Bạn cần đăng nhập để đánh dấu tin nhắn đã đọc.");
            }

            var message = await _context.Messages.FindAsync(messageId);
            if (message != null && message.ReceiverId == int.Parse(userId))
            {
                // Đánh dấu tin nhắn đã đọc nếu người dùng là người nhận
                message.IsRead = true;
                await _context.SaveChangesAsync();

                // Thông báo cho người gửi rằng tin nhắn đã được đọc
                await Clients.User(message.SenderId.ToString()).SendAsync("MessageRead", messageId);
            }
        }
    }
}