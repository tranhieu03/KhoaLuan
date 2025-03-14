using KhoaLuan1.Hubs;
using KhoaLuan1.Models;
using KhoaLuan1.Service;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly KhoaluantestContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IVnPayService _vnPayService;

        private readonly IMoMoService _moMoService;

        public OrderController(KhoaluantestContext context, IHubContext<NotificationHub> hubContext, IMoMoService moMoService, IVnPayService vnPayService)
        {
            _context = context;
            _hubContext = hubContext;
            
            _moMoService = moMoService;
            _vnPayService = vnPayService;
        }



        //API tạo đơn hàng từ giỏ hàng

        [HttpPost("create-order")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Not logged in." });

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "User not found." });

            if (string.IsNullOrEmpty(request.Address))
                return BadRequest(new { message = "Address is required." });

            if (request.SelectedCartItems == null || !request.SelectedCartItems.Any())
                return BadRequest(new { message = "No cart items selected." });

            var cartItems = await _context.CartItems
                .Where(c => c.UserId == userId && request.SelectedCartItems.Contains(c.CartItemId))
                .Include(c => c.Product)
                .ToListAsync();

            if (!cartItems.Any())
                return BadRequest(new { message = "Selected cart items not found or empty." });

            var groupedByRestaurant = cartItems.GroupBy(c => c.Product.RestaurantId).ToList();
            var paymentOrders = new List<object>();

            foreach (var group in groupedByRestaurant)
            {
                var restaurantId = group.Key;
                var items = group.ToList();
                decimal totalAmount = items.Sum(c => c.Quantity * c.Product.Price);

                var order = new Order
                {
                    UserId = userId.Value,
                    RestaurantId = restaurantId,
                    Status = "Pending",
                    OrderDate = DateTime.UtcNow,
                    TotalAmount = totalAmount,
                    Address = request.Address,
                    PaymentMethod = request.PaymentMethod, // "VNPay" hoặc "COD"
                    PaymentStatus = request.PaymentMethod == "VNPay" ? "Paid" : "Unpaid"
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                foreach (var item in items)
                {
                    _context.OrderDetails.Add(new OrderDetail
                    {
                        OrderId = order.OrderId,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        Price = item.Product.Price
                    });
                }

                await _context.SaveChangesAsync();

                if (request.PaymentMethod == "VNPay")
                {
                    // 🏦 Tạo URL thanh toán VNPay
                    var paymentUrl = _vnPayService.CreatePaymentUrl(new PaymentInformationModel
                    {
                        BillId = order.OrderId.ToString(),
                        Total = totalAmount,
                        RoomName = "Order Payment"
                    }, HttpContext);

                    paymentOrders.Add(new
                    {
                        OrderId = order.OrderId,
                        RestaurantId = restaurantId,
                        TotalAmount = totalAmount,
                        PaymentUrl = paymentUrl
                    });
                }
                else
                {
                    var notification = new Notification
                    {
                        UserId = restaurantId, // Gán UserId của chủ nhà hàng nếu có
                        Message = $"Đơn hàng #{order.OrderId} mới từ khách hàng {user.FullName}.",
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false
                    };

                    _context.Notifications.Add(notification);
                    await _context.SaveChangesAsync();
                    // Nếu thanh toán khi nhận hàng, thông báo đơn hàng cho nhà hàng
                    await _hubContext.Clients.Group($"Restaurant_{restaurantId}")
             .SendAsync("ReceiveNotification", notification.Message);
                }
            }

            // 🛒 Xóa sản phẩm đã đặt trong giỏ hàng
            _context.CartItems.RemoveRange(cartItems);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Orders created. Please complete payment if needed.",
                Orders = paymentOrders
            });
        }




        //[HttpGet("payment-callback")]
        //public async Task<IActionResult> PaymentCallback()
        //{
        //    var response = _vnPayService.PaymentExecute(Request.Query);

        //    if (!response.Success)
        //    {
        //        return BadRequest(new { message = "Payment verification failed.", response });
        //    }

        //    // 📝 Cập nhật trạng thái đơn hàng trong DB
        //    var order = await _context.Orders.FindAsync(response.OrderId);
        //    if (order == null)
        //    {
        //        return NotFound(new { message = "Order not found." });
        //    }

        //    order.PaymentStatus = "Paid";
        //    _context.Orders.Update(order);
        //    await _context.SaveChangesAsync();

        //    return Ok(new
        //    {
        //        message = "Payment successful.",
        //        response
        //    });
        //}




        //API nhà hàng xác nhận đơn hàng

        [HttpPost("confirm-order/{orderId}")]
        public async Task<IActionResult> ConfirmOrder(int orderId)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null || role != "seller")
                return Unauthorized(new { message = "Access denied." });

            var order = await _context.Orders.FindAsync(orderId);
            if (order == null || order.Status != "Pending")
                return BadRequest(new { message = "Invalid order status." });

            // Cập nhật trạng thái đơn hàng
            order.Status = "ReadyForDelivery";
            await _context.SaveChangesAsync();
            Console.WriteLine($"✅ Đơn hàng {orderId} đã cập nhật trạng thái ReadyForDelivery");

            // Kiểm tra có deliveryPerson nào không
            var deliveryPerson = await _context.Users.FirstOrDefaultAsync(u => u.Role == "DeliveryPerson");

            if (deliveryPerson == null)
            {
                Console.WriteLine("⚠ Không tìm thấy người giao hàng nào.");
                return Ok(new { message = "Order confirmed, but no available delivery person found." });
            }

            Console.WriteLine($"✅ Người giao hàng tìm thấy: {deliveryPerson.UserId}");

            // Tạo thông báo mới
            var notification = new Notification
            {
                UserId = deliveryPerson.UserId, // Gán ID hợp lệ
                Message = $"Order #{order.OrderId} is ready for delivery!",
                CreatedAt = DateTime.UtcNow
            };

            try
            {
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();
                Console.WriteLine("✅ Thông báo đã được lưu vào database.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Lỗi khi lưu thông báo: {ex.Message}");
            }

            // Gửi thông báo qua SignalR
            try
            {
                await _hubContext.Clients.Group("DeliveryPersons")
                    .SendAsync("ReceiveNotification", notification.Message);
                Console.WriteLine("✅ Thông báo đã gửi qua SignalR.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Lỗi khi gửi thông báo qua SignalR: {ex.Message}");
            }

            return Ok(new { message = "Order confirmed successfully." });
        }



        //API người giao hàng nhận đơn(chuyển trạng thái đơn)

        [HttpPost("accept-delivery/{orderId}")]
        public async Task<IActionResult> AcceptDelivery(int orderId)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null || role != "DeliveryPerson")
            {
                return Unauthorized(new { message = "Bạn không có quyền nhận đơn hàng này." });
            }

            var order = await _context.Orders.FindAsync(orderId);
            if (order == null || order.Status != "ReadyForDelivery")
            {
                return BadRequest(new { message = "Đơn hàng không có sẵn để giao." });
            }

            // Kiểm tra đơn hàng đã được nhận bởi shipper khác chưa
            if (order.DeliveryPersonId != null)
            {
                return BadRequest(new { message = "Đơn hàng này đã được nhận bởi shipper khác." });
            }

            // Gán shipper và cập nhật trạng thái đơn hàng
            order.DeliveryPersonId = userId.Value;
            order.Status = "InDelivery";
            await _context.SaveChangesAsync();

            // 📌 Thêm thông báo vào DB
            var notification = new Notification
            {
                UserId = order.UserId, // Gửi thông báo cho khách hàng
                Message = $"Shipper đã nhận đơn hàng #{order.OrderId}.",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Gửi thông báo tới nhà hàng qua SignalR
            await _hubContext.Clients.Group($"Restaurant_{order.RestaurantId}")
                .SendAsync("ReceiveNotification", $"Shipper đã nhận đơn hàng #{order.OrderId}.");

            return Ok(new { message = "Bạn đã nhận đơn hàng thành công." });
        }




        //API Xem các đơn hàng đang giao hoặc đã giao của từng nhà hàng, tài xế, khách hàng

        [HttpGet("delivery-orders")]
        public async Task<IActionResult> GetDeliveryOrders()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
            {
                return Unauthorized(new { message = "Bạn chưa đăng nhập." });
            }

            IQueryable<Order> ordersQuery = _context.Orders
                .Include(o => o.User)
                .Include(o => o.Restaurant)
                .Include(o => o.DeliveryPerson)
                .Where(o => o.Status == "InDelivery" || o.Status == "Delivered");

            if (role == "DeliveryPerson")
            {
                // Shipper chỉ thấy đơn hàng họ đang giao
                ordersQuery = ordersQuery.Where(o => o.DeliveryPersonId == userId);
            }
            else if (role == "seller")
            {
                // Lấy tất cả đơn hàng thuộc nhà hàng của seller
                var restaurantIds = await _context.Restaurants
                    .Where(r => r.SellerId == userId)
                    .Select(r => r.RestaurantId)
                    .ToListAsync();

                ordersQuery = ordersQuery.Where(o => restaurantIds.Contains(o.RestaurantId));
            }
            else if (role == "Customer")
            {
                // Lấy đơn hàng khách hàng đã mua
                ordersQuery = ordersQuery.Where(o => o.UserId == userId);
            }

            var orders = await ordersQuery
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new
                {
                    o.OrderId,
                    CustomerName = o.User.FullName,
                    CustomerPhone = o.User.PhoneNumber,
                    o.Address,
                    o.TotalAmount,
                    o.Status,
                    o.PaymentMethod,
                    o.PaymentStatus,
                    RestaurantName = o.Restaurant.Name,
                    DeliveryPersonName = o.DeliveryPerson != null ? o.DeliveryPerson.FullName : "Chưa có",
                    o.OrderDate
                })
                .ToListAsync();

            return Ok(orders);
        }

    }

    public class CreateOrderRequest
    {
        public string Address { get; set; }
        public List<int> SelectedCartItems { get; set; }
        public string PaymentMethod { get; set; }
    }
    

}
