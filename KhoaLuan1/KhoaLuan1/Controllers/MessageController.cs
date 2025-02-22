//using KhoaLuan1.Models;
//using Microsoft.AspNetCore.Http;
//using Microsoft.AspNetCore.Mvc;
//using Microsoft.AspNetCore.SignalR;
//using Microsoft.EntityFrameworkCore;
//using KhoaLuan1.Hubs;

//namespace KhoaLuan1.Controllers
//{
//    [Route("api/[controller]")]
//    [ApiController]
//    public class MessageController : ControllerBase
//    {
//        private readonly KhoaLuantestContext _context;
//        private readonly IHubContext<ChatHub> _chatHub;
//        public MessageController(KhoaLuantestContext context, IHubContext<ChatHub> chatHub)
//        {
//            _context = context;
//            _chatHub = chatHub;
//        }

//        [HttpPost("send")]
//        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
//        {
//            var senderId = HttpContext.Session.GetInt32("UserId");
//            var senderRole = HttpContext.Session.GetString("Role");

//            var order = await _context.Orders.FindAsync(request.OrderId);
//            if (order == null) return NotFound("Order not found");

//            int receiverId = senderRole == "Customer" ? order.DeliveryPersonId ?? 0 : order.UserId;
//            if (receiverId == 0) return BadRequest("Invalid receiver");
//            if (senderId == null)
//            {
//                return Unauthorized(new { message = "User is not logged in." });
//            }
//            var message = new Message
//            {
//                SenderId = senderId,
//                ReceiverId = receiverId,
//                OrderId = request.OrderId,
//                Content = request.Content,
//                SentAt = DateTime.UtcNow
//            };

//            _context.Messages.Add(message);
//            await _context.SaveChangesAsync();

//            // Gửi tin nhắn qua SignalR
//            await _chatHub.Clients.User(receiverId.ToString()).SendAsync("ReceiveMessage", senderId, receiverId, request.Content);

//            return Ok(new { success = true, messageId = message.MessageId });
//        }

//        [HttpGet("history/{orderId}")]
//        public async Task<IActionResult> GetMessageHistory(int orderId)
//        {
//            var userId = HttpContext.Session.GetInt32("UserId");

//            var messages = await _context.Messages
//                .Where(m => m.OrderId == orderId && (m.SenderId == userId || m.ReceiverId == userId))
//                .OrderBy(m => m.SentAt)
//                .ToListAsync();

//            return Ok(messages);
//        }
//    }
//    public class SendMessageRequest
//    {
//        public int OrderId { get; set; }
//        public string Content { get; set; }
//    }
//}
