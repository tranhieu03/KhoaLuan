using KhoaLuan1.Hubs;
using KhoaLuan1.Models;
using KhoaLuan1.Service;
using MailKit;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<OrderController> _logger;
        private readonly KhoaluantestContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly VNPayService _vnPayService;
        private readonly MapService _mapService;


        public OrderController(KhoaluantestContext context, IHubContext<NotificationHub> hubContext,
           VNPayService vnPayService, MapService mapService, IConfiguration configuration, ILogger<OrderController> logger)
        {
            _context = context;
            _hubContext = hubContext;
            _vnPayService = vnPayService;
            _mapService = mapService;
            _configuration = configuration;
            _logger = logger;
        }

        // api danh sách voucher


        [HttpGet("valid-vouchers")]
        public async Task<IActionResult> GetValidVouchers()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Not logged in." });

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "User not found." });

            var validVouchers = await _context.Vouchers
                .Include(v => v.VoucherCategory)
                .Where(v => v.Status == "Active" &&
                    (v.VoucherCategory.Name == "User" && v.UserId == userId ||
                     v.VoucherCategory.Name == "Restaurant" ||
                     v.VoucherCategory.Name == "Product"))
                .Select(v => new
                {
                    v.Code,
                    v.VoucherCategory.Name,
                    v.DiscountAmount,
                    v.VoucherType,
                    v.ExpirationDate
                })
                .ToListAsync();

            return Ok(validVouchers);
        }



        //API tạo đơn hàng từ giỏ hàng
        [HttpPost("create-order")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            try
            {
                _logger.LogInformation("Bắt đầu xử lý yêu cầu tạo đơn hàng");

                // 1. Xác thực người dùng
                var userId = HttpContext.Session.GetInt32("UserId");
                if (userId == null)
                {
                    _logger.LogWarning("Yêu cầu tạo đơn hàng bị từ chối: Người dùng chưa đăng nhập");
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập để tiếp tục." });
                }

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("Yêu cầu tạo đơn hàng bị từ chối: Không tìm thấy thông tin người dùng {UserId}", userId);
                    return NotFound(new { success = false, message = "Không tìm thấy thông tin người dùng." });
                }

                // 2. Xác thực địa chỉ giao hàng
                string deliveryAddress = string.IsNullOrEmpty(request.Address) ? user.Address : request.Address;
                if (string.IsNullOrEmpty(deliveryAddress))
                {
                    _logger.LogWarning("Yêu cầu tạo đơn hàng bị từ chối: Thiếu địa chỉ giao hàng");
                    return BadRequest(new { success = false, message = "Vui lòng cung cấp địa chỉ giao hàng hoặc cập nhật địa chỉ trong hồ sơ." });
                }

                // 3. Kiểm tra giỏ hàng
                if (request.SelectedCartItems == null || !request.SelectedCartItems.Any())
                {
                    _logger.LogWarning("Yêu cầu tạo đơn hàng bị từ chối: Không có sản phẩm được chọn");
                    return BadRequest(new { success = false, message = "Vui lòng chọn ít nhất một sản phẩm để đặt hàng." });
                }

                var cartItems = await _context.CartItems
                    .Where(c => c.UserId == userId && request.SelectedCartItems.Contains(c.CartItemId))
                    .Include(c => c.Product)
                    .ThenInclude(p => p.Restaurant)
                    .ToListAsync();

                if (!cartItems.Any())
                {
                    _logger.LogWarning("Yêu cầu tạo đơn hàng bị từ chối: Không tìm thấy sản phẩm đã chọn");
                    return BadRequest(new { success = false, message = "Không tìm thấy sản phẩm đã chọn hoặc giỏ hàng trống." });
                }

                // 4. Kiểm tra món ăn từ nhiều nhà hàng
                var distinctRestaurantIds = cartItems.Select(c => c.Product.RestaurantId).Distinct().ToList();
                if (distinctRestaurantIds.Count > 1)
                {
                    _logger.LogWarning("Yêu cầu tạo đơn hàng bị từ chối: Sản phẩm từ nhiều nhà hàng khác nhau");
                    return BadRequest(new { success = false, message = "Bạn không thể chọn món ăn từ nhiều nhà hàng khác nhau trong cùng một đơn hàng." });
                }

                // 5. Lấy tọa độ địa chỉ giao hàng
                double orderLat, orderLng;
                try
                {
                    _logger.LogInformation("Đang lấy tọa độ từ địa chỉ: {Address}", deliveryAddress);
                    (orderLat, orderLng) = await _mapService.GetCoordinates(deliveryAddress);
                    _logger.LogInformation("Đã lấy tọa độ thành công: {Lat}, {Lng}", orderLat, orderLng);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Không thể lấy tọa độ từ địa chỉ giao hàng: {Address}", deliveryAddress);
                    return BadRequest(new { success = false, message = $"Không thể xác định vị trí địa chỉ giao hàng. Vui lòng kiểm tra lại địa chỉ." });
                }

                // 6. Xử lý tạo đơn hàng
                var restaurantId = distinctRestaurantIds.First();
                var restaurant = cartItems.First().Product.Restaurant;
                double restaurantLat = (double)restaurant.Latitude;
                double restaurantLng = (double)restaurant.Longitude;

                // 7. Tính khoảng cách và phí vận chuyển
                double? distanceKm;
                try
                {
                    _logger.LogInformation("Đang tính khoảng cách giữa nhà hàng và địa chỉ giao hàng");
                    distanceKm = await _mapService.CalculateDistanceAsync(restaurantLat, restaurantLng, orderLat, orderLng);
                    if (distanceKm == null)
                    {
                        _logger.LogWarning("Không thể tính khoảng cách đường đi");
                        return BadRequest(new { success = false, message = "Không thể tính khoảng cách đường đi. Vui lòng thử lại sau." });
                    }
                    _logger.LogInformation("Khoảng cách: {Distance} km", distanceKm);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi khi tính khoảng cách đường đi");
                    return BadRequest(new { success = false, message = "Không thể tính khoảng cách đường đi. Vui lòng thử lại sau." });
                }

                // 8. Tính toán giá trị đơn hàng
                decimal productTotal = cartItems.Sum(c => c.Quantity * c.Product.Price);
                decimal shippingFee = CalculateShippingFee(distanceKm.Value);
                decimal discountAmount = 0;
                Voucher? appliedVoucher = null;

                // 9. Xử lý voucher nếu có
                if (!string.IsNullOrEmpty(request.VoucherCode))
                {
                    _logger.LogInformation("Đang xử lý voucher: {VoucherCode}", request.VoucherCode);
                    appliedVoucher = await _context.Vouchers
                        .Include(v => v.VoucherCategory)
                        .FirstOrDefaultAsync(v => v.Code == request.VoucherCode && v.Status == "Active");

                    if (appliedVoucher != null)
                    {
                        // Validate voucher
                        bool isValidVoucher = true;
                        string validationMessage = string.Empty;

                        if (appliedVoucher.VoucherCategory.Name == "User" && appliedVoucher.UserId != userId)
                        {
                            isValidVoucher = false;
                            validationMessage = "Mã giảm giá này không thuộc về bạn.";
                        }
                        else if (appliedVoucher.VoucherCategory.Name == "Restaurant" && appliedVoucher.RestaurantId != restaurantId)
                        {
                            isValidVoucher = false;
                            validationMessage = "Mã giảm giá này không áp dụng cho nhà hàng này.";
                        }
                        else if (appliedVoucher.VoucherCategory.Name == "Product" && !cartItems.Any(i => i.ProductId == appliedVoucher.ProductId))
                        {
                            isValidVoucher = false;
                            validationMessage = "Mã giảm giá này không áp dụng cho các sản phẩm trong đơn hàng.";
                        }

                        if (isValidVoucher)
                        {
                            _logger.LogInformation("Voucher hợp lệ, đang áp dụng giảm giá");
                            discountAmount = appliedVoucher.VoucherType == "Fixed"
                                ? appliedVoucher.DiscountAmount
                                : (productTotal * appliedVoucher.DiscountAmount) / 100;
                        }
                        else
                        {
                            _logger.LogWarning("Voucher không hợp lệ: {Message}", validationMessage);
                            return BadRequest(new { success = false, message = validationMessage });
                        }
                    }
                    else
                    {
                        _logger.LogWarning("Không tìm thấy voucher có mã: {VoucherCode}", request.VoucherCode);
                        return BadRequest(new { success = false, message = "Mã giảm giá không hợp lệ hoặc đã hết hạn." });
                    }
                }

                decimal totalAmount = productTotal + shippingFee - discountAmount;
                if (totalAmount < 0) totalAmount = 0;

                _logger.LogInformation("Thông tin đơn hàng: Tổng tiền hàng={ProductTotal}, Phí ship={ShippingFee}, Giảm giá={DiscountAmount}, Tổng thanh toán={TotalAmount}",
                    productTotal, shippingFee, discountAmount, totalAmount);

                // 10. Tạo đơn hàng
                var order = new Order
                {
                    UserId = userId.Value,
                    RestaurantId = restaurantId,
                    Status = "Pending",
                    OrderDate = DateTime.UtcNow,
                    TotalAmount = totalAmount,
                    Address = deliveryAddress,
                    Latitude = (decimal)orderLat,
                    Longitude = (decimal)orderLng,
                    PaymentMethod = request.PaymentMethod,
                    PaymentStatus = "Unpaid", // Mặc định là Unpaid, sẽ cập nhật khi thanh toán thành công
                    DistanceKm = (decimal)distanceKm.Value,
                    DiscountAmount = discountAmount,
                    ShipFee = shippingFee
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Đã tạo đơn hàng: OrderId={OrderId}", order.OrderId);

                // 11. Tạo chi tiết đơn hàng
                var orderDetails = new List<object>();
                foreach (var item in cartItems)
                {
                    _context.OrderDetails.Add(new OrderDetail
                    {
                        OrderId = order.OrderId,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        Price = item.Product.Price
                    });

                    orderDetails.Add(new
                    {
                        ProductId = item.ProductId,
                        ProductName = item.Product.Name,
                        Quantity = item.Quantity,
                        Price = item.Product.Price
                    });
                }

                // 12. Xóa giỏ hàng
                _context.CartItems.RemoveRange(cartItems);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Đã xóa các sản phẩm đã chọn khỏi giỏ hàng");

                // 13. Xử lý thanh toán VNPay nếu được chọn
                if (request.PaymentMethod == "VNPay")
                {
                    _logger.LogInformation("Bắt đầu xử lý thanh toán VNPay cho đơn hàng {OrderId}", order.OrderId);

                    try
                    {
                        // Tạo PaymentRequest từ Order
                        var paymentRequest = new PaymentRequest
                        {
                            OrderId = order.OrderId.ToString(),
                            Amount = order.TotalAmount,
                            OrderDescription = $"Thanh toan don hang {order.OrderId}",
                            CustomerName = user.FullName ?? "Khach hang",
                            ReturnUrl = _configuration["VNPay:ReturnUrl"]
                        };

                        var paymentUrl = _vnPayService.CreatePaymentUrl(paymentRequest, HttpContext);
                        _logger.LogInformation("Đã tạo URL thanh toán VNPay thành công cho đơn hàng {OrderId}", order.OrderId);

                        // Lưu thông tin đơn hàng tạm thời vào session
                        HttpContext.Session.SetString($"Order_{order.OrderId}", System.Text.Json.JsonSerializer.Serialize(new
                        {
                            OrderId = order.OrderId,
                            CreatedDate = DateTime.UtcNow
                        }));

                        return Ok(new
                        {
                            success = true,
                            message = "Redirect to VNPay",
                            paymentUrl,
                            orderId = order.OrderId,
                            paymentMethod = "VNPay"
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Lỗi khi xử lý thanh toán VNPay cho đơn hàng {OrderId}", order.OrderId);
                        return StatusCode(500, new
                        {
                            success = false,
                            message = "Có lỗi xảy ra khi xử lý thanh toán VNPay. Vui lòng thử lại sau."
                        });
                    }
                }

                // 14. Trả về kết quả cho các phương thức thanh toán khác
                return Ok(new
                {
                    success = true,
                    message = "Đơn hàng đã được tạo thành công.",
                    orderId = order.OrderId,
                    totalAmount,
                    shippingFee,
                    discountAmount,
                    paymentMethod = request.PaymentMethod,
                    orderDetails
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không xác định khi xử lý yêu cầu tạo đơn hàng");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Có lỗi xảy ra khi xử lý đơn hàng của bạn. Vui lòng thử lại sau."
                });
            }
        }



        //api xem đơn hàng
        [HttpGet("order-details/{orderId}")]
        public async Task<IActionResult> GetOrderDetails(int orderId)
        {
            // Get current user ID from session
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Not logged in." });

            // Find the order with related data
            var order = await _context.Orders
                .Include(o => o.Restaurant)
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.Product)
                .FirstOrDefaultAsync(o => o.OrderId == orderId && o.UserId == userId);

            if (order == null)
                return NotFound(new { message = "Order not found or you don't have permission to view this order." });

            // Prepare the response
            var orderDetails = order.OrderDetails.Select(od => new
            {
                od.ProductId,
                ProductName = od.Product.Name,
                od.Quantity,
                od.Price,
                TotalPrice = od.Quantity * od.Price,
                ProductImage = od.Product.ImageUrl
            }).ToList();

            var response = new
            {
                OrderId = order.OrderId,
                RestaurantId = order.RestaurantId,
                RestaurantName = order.Restaurant?.Name,
                Status = order.Status,
                OrderDate = order.OrderDate,
                DeliveryAddress = order.Address,
                DistanceKm = order.DistanceKm,
                ProductTotal = orderDetails.Sum(od => od.TotalPrice),
                ShippingFee = order.ShipFee,
                DiscountAmount = order.DiscountAmount,
                TotalAmount = order.TotalAmount,
                PaymentMethod = order.PaymentMethod,
                PaymentStatus = order.PaymentStatus,
                OrderDetails = orderDetails
            };

            return Ok(response);
        }


        private decimal CalculateShippingFee(double distanceKm)
        {
            const decimal baseFee = 10000m; // Phí cho 2 km đầu
            const decimal additionalFeePerKm = 3500m; // Phí cho mỗi km tiếp theo
            const double baseDistance = 2.0; // 2 km đầu

            if (distanceKm <= baseDistance)
            {
                return baseFee;
            }

            double extraDistance = distanceKm - baseDistance;
            decimal extraFee = (decimal)extraDistance * additionalFeePerKm;

            return baseFee + extraFee;
        }




        [HttpGet("vnpay-return")]
        public async Task<IActionResult> VNPayReturn()
        {
            // Lấy toàn bộ query parameters từ URL
            var queryCollection = HttpContext.Request.Query;

            // Validate signature bằng cách truyền trực tiếp IQueryCollection
            if (!_vnPayService.ValidatePayment(queryCollection))
            {
                return BadRequest(new { success = false, message = "Invalid signature" });
            }
            var vnpResponse = queryCollection.ToDictionary(
                k => k.Key,
                v => v.Value.ToString());

            // Kiểm tra mã phản hồi
            if (!vnpResponse.ContainsKey("vnp_ResponseCode") || vnpResponse["vnp_ResponseCode"] != "00")
            {
                var errorMessage = vnpResponse.ContainsKey("vnp_ResponseMessage")
                    ? $"Payment failed: {vnpResponse["vnp_ResponseMessage"]}"
                    : "Payment failed";

                return BadRequest(new { success = false, message = errorMessage });
            }

            // Lấy thông tin đơn hàng
            if (!vnpResponse.ContainsKey("vnp_OrderInfo"))
            {
                return BadRequest(new { success = false, message = "Missing order information" });
            }

            var orderIdStr = vnpResponse["vnp_OrderInfo"].Split(' ').Last();
            if (!int.TryParse(orderIdStr, out var orderId))
            {
                return BadRequest(new { success = false, message = "Invalid order ID format" });
            }

            // Tìm và cập nhật đơn hàng
            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
            {
                return NotFound(new { success = false, message = "Order not found" });
            }

            // Cập nhật trạng thái thanh toán
            order.PaymentStatus = "Paid";
            order.PaymentDate = DateTime.UtcNow;

            if (vnpResponse.ContainsKey("vnp_TransactionNo"))
            {
                order.TransactionId = vnpResponse["vnp_TransactionNo"];
            }

            try
            {
                await _context.SaveChangesAsync();

                // Gửi thông báo hoặc xử lý tiếp theo nếu cần
                await _hubContext.Clients.Group($"order-{orderId}")
                    .SendAsync("PaymentSuccess", new { orderId = orderId });

                return Redirect($"{_configuration["ClientUrl"]}/order-success/{orderId}?payment=success");
            }
            catch (Exception ex)
            {
                // Log lỗi ở đây
                return StatusCode(500, new { success = false, message = $"Error updating order: {ex.Message}" });
            }
        }


        //nhà hàng xác nhận đơn hàng
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




        // API người giao hàng xác nhận đã giao hàng thành công
        [HttpPost("confirm-delivery/{orderId}")]
        public async Task<IActionResult> ConfirmDelivery(int orderId)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null || role != "DeliveryPerson")
            {
                return Unauthorized(new { message = "Bạn không có quyền xác nhận giao hàng." });
            }

            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
            {
                return NotFound(new { message = "Đơn hàng không tồn tại." });
            }

            if (order.Status != "InDelivery")
            {
                return BadRequest(new { message = "Trạng thái đơn hàng không hợp lệ để xác nhận giao hàng." });
            }

            if (order.DeliveryPersonId != userId)
            {
                return Unauthorized(new { message = "Bạn không phải là người giao hàng của đơn hàng này." });
            }

            // Cập nhật trạng thái đơn hàng thành "Delivered"
            order.Status = "Delivered";
            await _context.SaveChangesAsync();

            // Tạo thông báo cho khách hàng
            var notificationToCustomer = new Notification
            {
                UserId = order.UserId,
                Message = $"Đơn hàng #{order.OrderId} đã được giao thành công. Vui lòng xác nhận đã nhận hàng.",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            // Tạo thông báo cho nhà hàng
            var notificationToRestaurant = new Notification
            {
                UserId = await _context.Restaurants
                    .Where(r => r.RestaurantId == order.RestaurantId)
                    .Select(r => r.SellerId)
                    .FirstOrDefaultAsync(),
                Message = $"Đơn hàng #{order.OrderId} đã được giao thành công.",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            _context.Notifications.AddRange(notificationToCustomer, notificationToRestaurant);
            await _context.SaveChangesAsync();

            // Gửi thông báo qua SignalR
            await _hubContext.Clients.User(order.UserId.ToString())
                .SendAsync("ReceiveNotification", notificationToCustomer.Message);

            await _hubContext.Clients.Group($"Restaurant_{order.RestaurantId}")
                .SendAsync("ReceiveNotification", notificationToRestaurant.Message);

            return Ok(new { message = "Xác nhận giao hàng thành công." });
        }

        // API khách hàng xác nhận đã nhận được hàng
        [HttpPost("confirm-receipt/{orderId}")]
        public async Task<IActionResult> ConfirmReceipt(int orderId)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null || role != "Customer")
            {
                return Unauthorized(new { message = "Bạn không có quyền xác nhận nhận hàng." });
            }

            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
            {
                return NotFound(new { message = "Đơn hàng không tồn tại." });
            }

            if (order.Status != "Delivered")
            {
                return BadRequest(new { message = "Trạng thái đơn hàng không hợp lệ để xác nhận nhận hàng." });
            }

            if (order.UserId != userId)
            {
                return Unauthorized(new { message = "Bạn không phải là người mua của đơn hàng này." });
            }

            // Cập nhật trạng thái đơn hàng thành "Completed"
            order.Status = "Completed";

            // Cập nhật trạng thái thanh toán thành "Paid" nếu là thanh toán khi nhận hàng
            if (order.PaymentMethod == "COD" && order.PaymentStatus == "Unpaid")
            {
                order.PaymentStatus = "Paid";
            }

            await _context.SaveChangesAsync();

            // Tạo thông báo cho nhà hàng
            var restaurantSellerId = await _context.Restaurants
                .Where(r => r.RestaurantId == order.RestaurantId)
                .Select(r => r.SellerId)
                .FirstOrDefaultAsync();

            var notificationToRestaurant = new Notification
            {
                UserId = restaurantSellerId,
                Message = $"Khách hàng đã xác nhận nhận đơn hàng #{order.OrderId}.",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            // Tạo thông báo cho người giao hàng
            var notificationToDeliveryPerson = new Notification
            {
                UserId = order.DeliveryPersonId.Value,
                Message = $"Khách hàng đã xác nhận nhận đơn hàng #{order.OrderId}.",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            _context.Notifications.AddRange(notificationToRestaurant, notificationToDeliveryPerson);
            await _context.SaveChangesAsync();

            // Gửi thông báo qua SignalR
            await _hubContext.Clients.Group($"Restaurant_{order.RestaurantId}")
                .SendAsync("ReceiveNotification", notificationToRestaurant.Message);

            await _hubContext.Clients.User(order.DeliveryPersonId.ToString())
                .SendAsync("ReceiveNotification", notificationToDeliveryPerson.Message);

            return Ok(new { message = "Xác nhận nhận hàng thành công." });
        }

        // API khách hàng báo chưa nhận được hàng
        [HttpPost("report-undelivered/{orderId}")]
        public async Task<IActionResult> ReportUndelivered(int orderId, [FromBody] ReportUndeliveredRequest request)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null || role != "Customer")
            {
                return Unauthorized(new { message = "Bạn không có quyền báo cáo đơn hàng." });
            }

            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
            {
                return NotFound(new { message = "Đơn hàng không tồn tại." });
            }

            if (order.Status != "Delivered")
            {
                return BadRequest(new { message = "Chỉ có thể báo chưa nhận được hàng khi đơn hàng ở trạng thái đã giao." });
            }

            if (order.UserId != userId)
            {
                return Unauthorized(new { message = "Bạn không phải là người mua của đơn hàng này." });
            }

            // Cập nhật trạng thái đơn hàng
            order.Status = "DeliveryDisputed";
            await _context.SaveChangesAsync();

            // Tạo thông báo cho nhà hàng
            var restaurantSellerId = await _context.Restaurants
                .Where(r => r.RestaurantId == order.RestaurantId)
                .Select(r => r.SellerId)
                .FirstOrDefaultAsync();

            var notificationToRestaurant = new Notification
            {
                UserId = restaurantSellerId,
                Message = $"Khách hàng báo chưa nhận được đơn hàng #{order.OrderId}. Lý do: {request.Reason}",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            // Tạo thông báo cho người giao hàng
            var notificationToDeliveryPerson = new Notification
            {
                UserId = order.DeliveryPersonId.Value,
                Message = $"Khách hàng báo chưa nhận được đơn hàng #{order.OrderId}. Lý do: {request.Reason}",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            _context.Notifications.AddRange(notificationToRestaurant, notificationToDeliveryPerson);

            // Lưu thông tin tranh chấp
            var message = new Message
            {
                SenderId = userId.Value,
                ReceiverId = order.DeliveryPersonId.Value,
                OrderId = order.OrderId,
                Content = $"Khách hàng báo chưa nhận được hàng. Lý do: {request.Reason}",
                SentAt = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            // Gửi thông báo qua SignalR
            await _hubContext.Clients.Group($"Restaurant_{order.RestaurantId}")
                .SendAsync("ReceiveNotification", notificationToRestaurant.Message);

            await _hubContext.Clients.User(order.DeliveryPersonId.ToString())
                .SendAsync("ReceiveNotification", notificationToDeliveryPerson.Message);

            return Ok(new { message = "Đã báo cáo chưa nhận được hàng. Chúng tôi sẽ liên hệ để hỗ trợ bạn." });
        }




    }

    public class CreateOrderRequest
    {
        public string Address { get; set; }
        public List<int> SelectedCartItems { get; set; }
        public string PaymentMethod { get; set; }
        public string? VoucherCode { get; set; } // Thêm mã giảm giá (có thể null nếu không sử dụng)
    }

    public class ReportUndeliveredRequest
    {
        [Required]
        public string Reason { get; set; }
    }

}
