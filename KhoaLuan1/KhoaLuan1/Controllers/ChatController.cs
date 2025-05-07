using KhoaLuan1.Hubs;
using KhoaLuan1.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly KhoaluantestContext _context;
    private readonly IHubContext<ChatHub> _chatHub;

    public ChatController(KhoaluantestContext context, IHubContext<ChatHub> chatHub)
    {
        _context = context;
        _chatHub = chatHub;
    }
    // Lấy danh sách người tham gia chat
    [HttpGet("participants/{orderId}")]
    public async Task<IActionResult> GetChatParticipants(int orderId)
    {
        var userId = HttpContext.Session.GetInt32("UserId");
        var role = HttpContext.Session.GetString("Role");

        if (userId == null)
        {
            return Unauthorized(new { message = "Bạn cần đăng nhập để xem thông tin người tham gia." });
        }

        // Kiểm tra quyền truy cập
        var order = await _context.Orders
            .Include(o => o.User)
            .Include(o => o.DeliveryPerson)
            .Include(o => o.Restaurant)
            .ThenInclude(r => r.Seller)
            .FirstOrDefaultAsync(o => o.OrderId == orderId);

        if (order == null)
        {
            return NotFound(new { message = "Không tìm thấy đơn hàng." });
        }

        bool hasAccess = false;

        if (role == "Customer" && order.UserId == userId)
            hasAccess = true;
        else if (role == "DeliveryPerson" && order.DeliveryPersonId == userId)
            hasAccess = true;
        else if (role == "Seller")
        {
            var restaurant = await _context.Restaurants
                .FirstOrDefaultAsync(r => r.RestaurantId == order.RestaurantId && r.SellerId == userId);
            if (restaurant != null)
                hasAccess = true;
        }

        if (!hasAccess)
        {
            return Forbid("Bạn không có quyền xem thông tin người tham gia.");
        }

        var participants = new List<object>();

        // Thêm khách hàng
        participants.Add(new
        {
            userId = order.User.UserId,
            fullName = order.User.FullName,
            role = "Customer",
            isOnline = false  // Trạng thái này có thể được cập nhật qua SignalR
        });

        // Thêm người bán
        var seller = order.Restaurant.Seller;
        participants.Add(new
        {
            userId = seller.UserId,
            fullName = seller.FullName,
            role = "Seller",
            restaurantName = order.Restaurant.Name,
            isOnline = false
        });

        // Thêm người giao hàng (nếu có)
        if (order.DeliveryPerson != null)
        {
            participants.Add(new
            {
                userId = order.DeliveryPerson.UserId,
                fullName = order.DeliveryPerson.FullName,
                role = "DeliveryPerson",
                isOnline = false
            });
        }

        return Ok(participants);
    }
    // Lấy lịch sử chat của một đơn hàng với hỗ trợ tin nhắn riêng tư
    [HttpGet("history/{orderId}")]
    public async Task<IActionResult> GetChatHistory(int orderId)
    {
        var userId = HttpContext.Session.GetInt32("UserId");
        var role = HttpContext.Session.GetString("Role");

        if (userId == null)
        {
            return Unauthorized(new { message = "Bạn cần đăng nhập để xem lịch sử chat." });
        }

        // Kiểm tra quyền truy cập
        var order = await _context.Orders.FindAsync(orderId);
        if (order == null)
        {
            return NotFound(new { message = "Không tìm thấy đơn hàng." });
        }

        bool hasAccess = false;

        if (role == "Customer" && order.UserId == userId)
            hasAccess = true;
        else if (role == "DeliveryPerson" && order.DeliveryPersonId == userId)
            hasAccess = true;
        else if (role == "Seller")
        {
            var restaurant = await _context.Restaurants
                .FirstOrDefaultAsync(r => r.RestaurantId == order.RestaurantId && r.SellerId == userId);
            if (restaurant != null)
                hasAccess = true;
        }

        if (!hasAccess)
        {
            return Forbid("Bạn không có quyền xem lịch sử chat của đơn hàng này.");
        }

        // Lấy tin nhắn với quyền truy cập thích hợp:
        // 1. Tin nhắn không có người nhận cụ thể (tin nhắn chung)
        // 2. Tin nhắn mà người dùng hiện tại là người gửi
        // 3. Tin nhắn mà người dùng hiện tại là người nhận
        var messages = await _context.Messages
            .Where(m => m.OrderId == orderId &&
                   (m.ReceiverId == null || m.SenderId == userId || m.ReceiverId == userId))
            .OrderBy(m => m.SentAt)
            .Select(m => new
            {
                messageId = m.MessageId,
                senderId = m.SenderId,
                senderName = m.Sender.FullName,
                receiverId = m.ReceiverId,
                receiverName = m.Receiver != null ? m.Receiver.FullName : null,
                content = m.Content,
                sentAt = m.SentAt,
                isRead = m.IsRead,
                isPrivate = m.ReceiverId != null
            })
            .ToListAsync();

        return Ok(messages);
    }

    [HttpPost("mark-read/{orderId}")]
    public async Task<IActionResult> MarkAllAsRead(int orderId)
    {
        var userId = HttpContext.Session.GetInt32("UserId");

        if (userId == null)
        {
            return Unauthorized(new { message = "Bạn cần đăng nhập để đánh dấu tin nhắn đã đọc." });
        }

        var unreadMessages = await _context.Messages
            .Where(m => m.OrderId == orderId && m.ReceiverId == userId && !m.IsRead)
            .ToListAsync();

        foreach (var message in unreadMessages)
        {
            message.IsRead = true;
        }

        await _context.SaveChangesAsync();

        // Thông báo cho người gửi rằng tin nhắn đã được đọc
        foreach (var message in unreadMessages)
        {
            await _chatHub.Clients.User(message.SenderId.ToString())
                .SendAsync("MessageRead", message.MessageId);
        }

        return Ok(new { message = "Đã đánh dấu tất cả tin nhắn là đã đọc.", count = unreadMessages.Count });
    }

    // Cập nhật phương thức SendMessage để hỗ trợ tin nhắn riêng tư
    [HttpPost("send")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
    {
        var userId = HttpContext.Session.GetInt32("UserId");
        var role = HttpContext.Session.GetString("Role");

        if (userId == null)
        {
            return Unauthorized(new { message = "Bạn cần đăng nhập để gửi tin nhắn." });
        }

        // Kiểm tra quyền truy cập
        var order = await _context.Orders.FindAsync(request.OrderId);
        if (order == null)
        {
            return NotFound(new { message = "Không tìm thấy đơn hàng." });
        }

        bool hasAccess = false;

        if (role == "Customer" && order.UserId == userId)
            hasAccess = true;
        else if (role == "DeliveryPerson" && order.DeliveryPersonId == userId)
            hasAccess = true;
        else if (role == "seller")
        {
            var restaurant = await _context.Restaurants
                .FirstOrDefaultAsync(r => r.RestaurantId == order.RestaurantId && r.SellerId == userId);
            if (restaurant != null)
                hasAccess = true;
        }

        if (!hasAccess)
        {
            return Forbid("Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này.");
        }

        // Kiểm tra nếu là Customer thì phải chỉ định người nhận
        if (role == "Customer" && request.ReceiverId == null)
        {
            return BadRequest(new { message = "Khách hàng cần chỉ định người nhận tin nhắn (Người bán hoặc Người giao hàng)." });
        }

        // Kiểm tra tính hợp lệ của người nhận (nếu có)
        if (request.ReceiverId != null)
        {
            bool validReceiver = false;

            // Nếu người gửi là Customer
            if (role == "Customer")
            {
                // Người nhận phải là Seller hoặc DeliveryPerson của đơn hàng này
                int? sellerId = order.Restaurant?.SellerId;
                if ((sellerId.HasValue && request.ReceiverId == sellerId) || request.ReceiverId == order.DeliveryPersonId)
                    validReceiver = true;
            }
            // Nếu người gửi là Seller
            else if (role == "seller")
            {
                // Seller chỉ có thể gửi cho Customer hoặc DeliveryPerson
                if (request.ReceiverId == order.UserId || request.ReceiverId == order.DeliveryPersonId)
                    validReceiver = true;
            }
            // Nếu người gửi là DeliveryPerson
            else if (role == "DeliveryPerson")
            {
                // DeliveryPerson có thể gửi cho Customer hoặc Seller
                if (request.ReceiverId == order.UserId || request.ReceiverId == order.Restaurant?.SellerId)
                    validReceiver = true;
            }

            if (!validReceiver)
            {
                return BadRequest(new { message = "Người nhận không hợp lệ." });
            }
        }

        // Lưu tin nhắn
        var message = new Message
        {
            SenderId = userId.Value,
            OrderId = request.OrderId,
            ReceiverId = request.ReceiverId,
            Content = request.Content,
            SentAt = DateTime.UtcNow,
            IsRead = false
        };

        await _context.Messages.AddAsync(message);
        await _context.SaveChangesAsync();

        // Lấy thông tin người gửi
        var sender = await _context.Users.FindAsync(userId);

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
            isPrivate = request.ReceiverId != null
        };

        // Nếu là tin nhắn riêng tư, chỉ gửi cho người nhận và người gửi
        if (request.ReceiverId != null)
        {
            await _chatHub.Clients.User(request.ReceiverId.ToString()).SendAsync("ReceiveMessage", messageData);
            // Không cần gửi lại cho người gửi vì họ đã thấy tin nhắn của mình
        }
        // Nếu là tin nhắn chung, gửi cho tất cả trong nhóm
        else
        {
            await _chatHub.Clients.Group($"Order_{request.OrderId}").SendAsync("ReceiveMessage", messageData);
        }

        return Ok(new { messageId = message.MessageId, sentAt = message.SentAt });
    }
}

// Cập nhật class SendMessageRequest để hỗ trợ receiverId
public class SendMessageRequest
{
    public int OrderId { get; set; }
    public string Content { get; set; }
    public int? ReceiverId { get; set; }  // Null means message to all participants
}