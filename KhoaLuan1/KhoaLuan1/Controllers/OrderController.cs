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
        private readonly VoucherService _voucherService;


        public OrderController(KhoaluantestContext context, IHubContext<NotificationHub> hubContext,
           VNPayService vnPayService, MapService mapService, IConfiguration configuration, ILogger<OrderController> logger, VoucherService voucherService)
        {
            _context = context;
            _hubContext = hubContext;
            _vnPayService = vnPayService;
            _mapService = mapService;
            _configuration = configuration;
            _logger = logger;
            _voucherService = voucherService;
        }


        // api danh sách voucher
        [HttpGet("get-valid-vouchers")]
        public async Task<IActionResult> GetValidVouchers()
        {
            try
            {
                var userId = HttpContext.Session.GetInt32("UserId");
                if (userId == null)
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập để tiếp tục." });

                var (vouchers, errorMessage) = await _voucherService.GetValidVouchersForUser(userId.Value);

                if (errorMessage != null)
                    return BadRequest(new { success = false, message = errorMessage });

                // Format vouchers for response
                var result = vouchers.Select(v => new
                {
                    v.VoucherId,
                    v.Code,
                    CategoryName = v.VoucherCategory?.Name,
                    Description = v.VoucherCategory?.Description,
                    v.DiscountAmount,
                    v.VoucherType,
                    v.ExpirationDate,
                    v.MinimumOrderAmount,
                    v.MaximumDiscountAmount,
                    v.UsageLimit,
                    Conditions = v.VoucherConditions?.Select(c => new
                    {
                        c.ConditionType,
                        c.Field,
                        c.Operator,
                        c.Value
                    })
                }).ToList();

                return Ok(new { success = true, vouchers = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách voucher hợp lệ");
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi lấy danh sách voucher. Vui lòng thử lại sau." });
            }
        }

        // Add validation endpoint for the frontend to verify vouchers before order submission
        [HttpPost("validate-voucher")]
        public async Task<IActionResult> ValidateVoucher([FromBody] ValidateVoucherRequest request)
        {
            try
            {
                var userId = HttpContext.Session.GetInt32("UserId");
                if (userId == null)
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập để tiếp tục." });

                var (isValid, validationMessage, discountAmount, voucher) =
                    await _voucherService.ValidateVoucherForOrder(
                        request.VoucherCode,
                        userId.Value,
                        request.OrderTotal,
                        request.RestaurantId,
                        request.ProductIds);

                if (!isValid)
                    return Ok(new { success = false, message = validationMessage });

                return Ok(new
                {
                    success = true,
                    message = "Mã giảm giá hợp lệ",
                    discountAmount,
                    voucherType = voucher.VoucherType,
                    categoryName = voucher.VoucherCategory?.Name
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xác thực voucher");
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi xác thực mã giảm giá. Vui lòng thử lại sau." });
            }
        }

        // DTO for validate-voucher request
       


        // Hàm đánh giá điều kiện voucher


        //tạo đơn hàng
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
                string deliveryAddress = null;
                double orderLat = 0, orderLng = 0;

                // Thứ tự ưu tiên:
                // 1. Địa chỉ từ request (người dùng nhập trực tiếp)
                // 2. Tọa độ từ request (vị trí hiện tại)
                // 3. Địa chỉ từ database của người dùng

                if (!string.IsNullOrEmpty(request.Address))
                {
                    // 2.1 Sử dụng địa chỉ từ request
                    deliveryAddress = request.Address;
                    _logger.LogInformation("Sử dụng địa chỉ từ request: {Address}", deliveryAddress);

                    // Lấy tọa độ từ địa chỉ
                    try
                    {
                        (orderLat, orderLng) = await _mapService.GetCoordinates(deliveryAddress);
                        _logger.LogInformation("Đã lấy tọa độ từ địa chỉ: {Lat}, {Lng}", orderLat, orderLng);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Không thể lấy tọa độ từ địa chỉ: {Address}", deliveryAddress);
                        return BadRequest(new { success = false, message = "Không thể xác định vị trí từ địa chỉ đã nhập. Vui lòng kiểm tra lại địa chỉ." });
                    }
                }
                else if (request.Latitude.HasValue && request.Longitude.HasValue)
                {
                    // 2.2 Sử dụng tọa độ từ request
                    orderLat = request.Latitude.Value;
                    orderLng = request.Longitude.Value;

                    // Lấy địa chỉ từ tọa độ
                    try
                    {
                        deliveryAddress = await _mapService.GetAddressFromCoordinates(orderLat, orderLng);
                        _logger.LogInformation("Đã lấy địa chỉ từ tọa độ: {Address}", deliveryAddress);

                        // Lưu địa chỉ này vào thông tin người dùng
                        user.Address = deliveryAddress;
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Đã cập nhật địa chỉ người dùng trong database");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Không thể lấy địa chỉ từ tọa độ: {Lat}, {Lng}", orderLat, orderLng);
                        return BadRequest(new { success = false, message = "Không thể xác định địa chỉ từ vị trí hiện tại. Vui lòng nhập địa chỉ thủ công." });
                    }
                }
                else if (!string.IsNullOrEmpty(user.Address))
                {
                    // 2.3 Sử dụng địa chỉ từ database
                    deliveryAddress = user.Address;

                    // Kiểm tra nếu có tọa độ trong database
                    if (!string.IsNullOrEmpty(user.Address))
                    {
                        (orderLat, orderLng) = await _mapService.GetCoordinates(user.Address);
                        _logger.LogInformation("Sử dụng tọa độ từ database: {Lat}, {Lng}", orderLat, orderLng);
                    }
                    else
                    {
                        // Nếu không có tọa độ, lấy tọa độ từ địa chỉ
                        try
                        {
                            (orderLat, orderLng) = await _mapService.GetCoordinates(deliveryAddress);
                            _logger.LogInformation("Đã lấy tọa độ từ địa chỉ database: {Lat}, {Lng}", orderLat, orderLng);

                            // Cập nhật tọa độ vào database
                            await _context.SaveChangesAsync();
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Không thể lấy tọa độ từ địa chỉ database: {Address}", deliveryAddress);
                            return BadRequest(new { success = false, message = "Không thể xác định vị trí từ địa chỉ của bạn. Vui lòng nhập địa chỉ mới." });
                        }
                    }
                }
                else
                {
                    // 2.4 Không có địa chỉ, yêu cầu người dùng nhập
                    _logger.LogWarning("Yêu cầu tạo đơn hàng bị từ chối: Thiếu địa chỉ giao hàng");
                    return BadRequest(new
                    {
                        success = false,
                        requireAddress = true,
                        message = "Vui lòng cung cấp địa chỉ giao hàng hoặc cho phép truy cập vị trí hiện tại."
                    });
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
                    _logger.LogInformation("Processing voucher: {VoucherCode}", request.VoucherCode);

                    // Get product IDs for voucher validation
                    var productIds = cartItems.Select(c => c.ProductId).ToList();

                    // Validate the voucher
                    var (isValid, validationMessage, calculatedDiscountAmount, voucher) =
                        await _voucherService.ValidateVoucherForOrder(
                            request.VoucherCode,
                            userId.Value,
                            productTotal,
                            restaurantId,
                            productIds);

                    if (!isValid)
                    {
                        _logger.LogWarning("Voucher validation failed: {Message}", validationMessage);
                        return BadRequest(new { success = false, message = validationMessage });
                    }

                    appliedVoucher = voucher;
                    discountAmount = calculatedDiscountAmount;

                    _logger.LogInformation("Voucher applied successfully. Discount: {DiscountAmount}", discountAmount);

                    // Update voucher usage (will be saved with the order transaction)
                    if (appliedVoucher.UsageLimit.HasValue)
                    {
                        appliedVoucher.UsageLimit--;
                        _context.Vouchers.Update(appliedVoucher);
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

        [HttpPost("get-user-location")]
        public async Task<IActionResult> GetUserLocation([FromBody] LocationRequest request)
        {
            try
            {
                _logger.LogInformation("Bắt đầu xử lý yêu cầu lấy vị trí người dùng");

                // 1. Xác thực người dùng
                var userId = HttpContext.Session.GetInt32("UserId");
                if (userId == null)
                {
                    _logger.LogWarning("Yêu cầu lấy vị trí bị từ chối: Người dùng chưa đăng nhập");
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập để tiếp tục." });
                }

                string address = null;
                double latitude = 0, longitude = 0;

                // 2. Kiểm tra nếu có tọa độ được gửi lên (ưu tiên cao nhất)
                if (request.Latitude.HasValue && request.Longitude.HasValue)
                {
                    latitude = request.Latitude.Value;
                    longitude = request.Longitude.Value;

                    try
                    {
                        // Lấy địa chỉ từ tọa độ
                        address = await _mapService.GetAddressFromCoordinates(latitude, longitude);
                        _logger.LogInformation("Đã lấy địa chỉ từ tọa độ: {Address}", address);

                        // Lưu địa chỉ này vào thông tin người dùng nếu cần
                        var user = await _context.Users.FindAsync(userId.Value);
                        if (user != null)
                        {
                            user.Address = address;
                           
                            await _context.SaveChangesAsync();
                            _logger.LogInformation("Đã cập nhật địa chỉ người dùng trong database");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Không thể lấy địa chỉ từ tọa độ: {Lat}, {Lng}", latitude, longitude);

                        // Lấy địa chỉ từ database nếu có
                        var userLocationResult = await _mapService.GetUserLocation(userId);
                        if (!string.IsNullOrEmpty(userLocationResult.address))
                        {
                            address = userLocationResult.address;
                            latitude = userLocationResult.latitude;
                            longitude = userLocationResult.longitude;
                            _logger.LogInformation("Sử dụng địa chỉ từ database: {Address}", address);
                        }
                        else
                        {
                            // Không có địa chỉ từ tọa độ và không có địa chỉ trong database
                            return BadRequest(new
                            {
                                success = false,
                                message = "Không thể xác định địa chỉ từ vị trí hiện tại và bạn chưa có địa chỉ lưu trữ. Vui lòng nhập địa chỉ."
                            });
                        }
                    }
                }
                else
                {
                    // 3. Không có tọa độ, thử lấy địa chỉ từ database
                    var userLocationResult = await _mapService.GetUserLocation(userId);
                    if (!string.IsNullOrEmpty(userLocationResult.address))
                    {
                        address = userLocationResult.address;
                        latitude = userLocationResult.latitude;
                        longitude = userLocationResult.longitude;
                        _logger.LogInformation("Sử dụng địa chỉ từ database: {Address}", address);
                    }
                    else
                    {
                        // 4. Không có địa chỉ trong database, yêu cầu người dùng nhập địa chỉ
                        return Ok(new
                        {
                            success = true,
                            requireAddress = true,
                            message = "Vui lòng nhập địa chỉ của bạn hoặc cho phép truy cập vị trí hiện tại."
                        });
                    }
                }

                // Trả về thông tin địa chỉ và tọa độ
                return Ok(new
                {
                    success = true,
                    address,
                    latitude,
                    longitude
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không xác định khi xử lý yêu cầu lấy vị trí người dùng");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau."
                });
            }
        }

        [HttpGet("get-default-address")]
        public async Task<IActionResult> GetDefaultAddress()
        {
            try
            {
                // 1. Xác thực người dùng
                var userId = HttpContext.Session.GetInt32("UserId");
                if (userId == null)
                {
                    _logger.LogWarning("Yêu cầu lấy địa chỉ mặc định bị từ chối: Người dùng chưa đăng nhập");
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập để tiếp tục." });
                }

                // 2. Thử lấy địa chỉ từ database
                var userLocationResult = await _mapService.GetUserLocation(userId);

                if (!string.IsNullOrEmpty(userLocationResult.address))
                {
                    // Đã có địa chỉ trong database
                    return Ok(new
                    {
                        success = true,
                        address = userLocationResult.address,
                        latitude = userLocationResult.latitude,
                        longitude = userLocationResult.longitude
                    });
                }
                else
                {
                    // Không có địa chỉ trong database, yêu cầu người dùng cung cấp vị trí
                    return Ok(new
                    {
                        success = true,
                        requireAddress = true,
                        message = "Vui lòng cung cấp vị trí hiện tại hoặc nhập địa chỉ của bạn."
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không xác định khi xử lý yêu cầu lấy địa chỉ mặc định");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau."
                });
            }
        }

        //API tạo đơn hàng từ giỏ hàng
       

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
        public async Task<IActionResult> AcceptDelivery(int orderId, [FromBody] LocationRequest locationRequest)
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

            // Kiểm tra và lưu vị trí hiện tại của tài xế
            if (locationRequest == null || !locationRequest.Latitude.HasValue || !locationRequest.Longitude.HasValue)
            {
                return BadRequest(new { message = "Vui lòng cung cấp vị trí hiện tại để nhận đơn hàng." });
            }

            // Gán shipper và cập nhật trạng thái đơn hàng
            order.DeliveryPersonId = userId.Value;
            order.Status = "InDelivery";
            await _context.SaveChangesAsync();

            // Lưu vị trí ban đầu của tài xế vào bảng DeliveryTracking
            var tracking = new DeliveryTracking
            {
                OrderId = orderId,
                DeliveryPersonId = userId.Value,
                Latitude = (decimal)locationRequest.Latitude.Value,
                Longitude = (decimal)locationRequest.Longitude.Value,
                TrackingTime = DateTime.UtcNow,
                TrackingType = "Start" // Đánh dấu đây là vị trí bắt đầu
            };

            _context.DeliveryTrackings.Add(tracking);
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

            // Gửi thông báo tới khách hàng và nhà hàng qua SignalR
            await _hubContext.Clients.User(order.UserId.ToString())
                .SendAsync("ReceiveNotification", notification.Message);

            await _hubContext.Clients.Group($"Restaurant_{order.RestaurantId}")
                .SendAsync("ReceiveNotification", $"Shipper đã nhận đơn hàng #{order.OrderId}.");

            // Gửi vị trí ban đầu của tài xế cho khách hàng
            await _hubContext.Clients.User(order.UserId.ToString())
                .SendAsync("UpdateDeliveryLocation", new
                {
                    orderId = order.OrderId,
                    latitude = locationRequest.Latitude.Value,
                    longitude = locationRequest.Longitude.Value,
                    timestamp = tracking.TrackingTime,
                    status = "Start" // Thông báo đây là vị trí bắt đầu
                });

            return Ok(new { message = "Bạn đã nhận đơn hàng thành công." });
        }

        // API người giao hàng xác nhận đã giao hàng thành công
        [HttpPost("confirm-delivery/{orderId}")]
        public async Task<IActionResult> ConfirmDelivery(int orderId, [FromBody] LocationRequest locationRequest)
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

            // Lấy vị trí hiện tại của tài xế
            if (locationRequest == null || !locationRequest.Latitude.HasValue || !locationRequest.Longitude.HasValue)
            {
                return BadRequest(new { message = "Vui lòng cung cấp vị trí hiện tại để xác nhận giao hàng." });
            }

            // Lưu vị trí giao hàng cuối cùng vào bảng DeliveryTracking
            var tracking = new DeliveryTracking
            {
                OrderId = orderId,
                DeliveryPersonId = userId.Value,
                Latitude = (decimal)locationRequest.Latitude.Value,
                Longitude = (decimal)locationRequest.Longitude.Value,
                TrackingTime = DateTime.UtcNow,
                TrackingType = "Delivered" // Đánh dấu đây là vị trí giao hàng
            };

            _context.DeliveryTrackings.Add(tracking);

            // Cập nhật vị trí giao hàng cuối cùng vào đơn hàng
            order.Latitude = (decimal)locationRequest.Latitude.Value;
            order.Longitude = (decimal)locationRequest.Longitude.Value;

            // Cập nhật thời gian giao hàng
            order.PaymentDate = DateTime.UtcNow;

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

            // Gửi vị trí cuối cùng của tài xế cho khách hàng
            await _hubContext.Clients.User(order.UserId.ToString())
                .SendAsync("UpdateDeliveryLocation", new
                {
                    orderId = order.OrderId,
                    latitude = locationRequest.Latitude.Value,
                    longitude = locationRequest.Longitude.Value,
                    timestamp = tracking.TrackingTime,
                    status = "Delivered" // Thông báo đây là vị trí giao hàng
                });

            return Ok(new { message = "Xác nhận giao hàng thành công." });
        }

        [HttpGet("delivery-tracking/{orderId}")]
        public async Task<IActionResult> GetDeliveryTracking(int orderId)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
            {
                return Unauthorized(new { message = "Bạn chưa đăng nhập." });
            }

            // Kiểm tra quyền truy cập (người dùng là khách hàng của đơn hàng hoặc nhà hàng hoặc tài xế)
            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
            {
                return NotFound(new { message = "Không tìm thấy đơn hàng." });
            }

            // Kiểm tra quyền
            var role = HttpContext.Session.GetString("Role");
            bool hasAccess = false;

            if (role == "Customer" && order.UserId == userId)
            {
                hasAccess = true;
            }
            else if (role == "seller")
            {
                var restaurant = await _context.Restaurants
                    .FirstOrDefaultAsync(r => r.RestaurantId == order.RestaurantId && r.SellerId == userId);
                hasAccess = restaurant != null;
            }
            else if (role == "DeliveryPerson" && order.DeliveryPersonId == userId)
            {
                hasAccess = true;
            }

            if (!hasAccess)
            {
                return Unauthorized(new { message = "Bạn không có quyền xem thông tin này." });
            }

            // Lấy danh sách các vị trí theo dõi
            var orderInfo = await _context.Orders
        .Where(o => o.OrderId == orderId)
        .Include(o => o.Restaurant) // Đảm bảo lấy thông tin nhà hàng
        .Select(o => new {
            o.OrderId,
            o.Status,
            RestaurantLocation = new
            {
               Lattitude = o.Restaurant.Latitude.ToString().Replace(",","."),  // Giả sử đã có trong database
                Longtitude=o.Restaurant.Longitude.ToString().Replace(",","."), // Giả sử đã có trong database
                o.Restaurant.Name,
                o.Restaurant.Address
            },
            CustomerLocation = new
            {
                o.Latitude,  // Vị trí giao hàng
                o.Longitude, // Vị trí giao hàng
                o.Address
            }
        })
        .FirstOrDefaultAsync();

            if (orderInfo == null)
            {
                return NotFound(new { message = "Không tìm thấy thông tin đơn hàng." });
            }

            // Lấy lịch sử vị trí shipper (giữ nguyên)
            var trackingData = await _context.DeliveryTrackings
                .Where(t => t.OrderId == orderId)
                .OrderBy(t => t.TrackingTime)
                .Select(t => new
                {
                    t.TrackingId,
                    t.Latitude,
                    t.Longitude,
                    t.TrackingTime,
                    t.TrackingType
                })
                .ToListAsync();

            // Lấy vị trí hiện tại của shipper (vị trí mới nhất)
            var currentPosition = trackingData.OrderByDescending(t => t.TrackingTime).FirstOrDefault();

            // Trả về đầy đủ thông tin
            return Ok(new
            {
                orderInfo.OrderId,
                orderInfo.Status,
                RestaurantLocation = orderInfo.RestaurantLocation,
                CustomerLocation = orderInfo.CustomerLocation,
                CurrentShipperLocation = currentPosition,
                FullTrackingHistory = trackingData
            });
        }

        [HttpPost("update-delivery-location")]
        public async Task<IActionResult> UpdateDeliveryLocation([FromBody] DeliveryLocationRequest request)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");
            if (userId == null || role != "DeliveryPerson")
            {
                return Unauthorized(new { message = "Bạn không có quyền cập nhật vị trí giao hàng." });
            }

            if (!request.OrderId.HasValue || !request.Latitude.HasValue || !request.Longitude.HasValue)
            {
                return BadRequest(new { message = "Thiếu thông tin vị trí hoặc mã đơn hàng." });
            }

            var order = await _context.Orders.FindAsync(request.OrderId.Value);
            if (order == null)
            {
                return NotFound(new { message = "Đơn hàng không tồn tại." });
            }

            if (order.DeliveryPersonId != userId)
            {
                return Unauthorized(new { message = "Bạn không phải là người giao hàng của đơn hàng này." });
            }

            if (order.Status != "InDelivery")
            {
                return BadRequest(new { message = "Đơn hàng không trong quá trình giao." });
            }

            // Tạo bản ghi theo dõi vị trí
            var tracking = new DeliveryTracking
            {
                OrderId = request.OrderId.Value,
                DeliveryPersonId = userId.Value,
                Latitude = (decimal)request.Latitude.Value,
                Longitude = (decimal)request.Longitude.Value,
                TrackingTime = DateTime.UtcNow
            };

            _context.DeliveryTrackings.Add(tracking);
            await _context.SaveChangesAsync();

            // Gửi vị trí mới đến khách hàng qua SignalR
            await _hubContext.Clients.User(order.UserId.ToString())
                .SendAsync("UpdateDeliveryLocation", new
                {
                    orderId = order.OrderId,
                    latitude = request.Latitude.Value,
                    longitude = request.Longitude.Value,
                    timestamp = tracking.TrackingTime
                });

            return Ok(new { message = "Vị trí đã được cập nhật thành công." });
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
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public List<int> SelectedCartItems { get; set; }
        public string PaymentMethod { get; set; }
        public string? VoucherCode { get; set; } // Thêm mã giảm giá (có thể null nếu không sử dụng)
    }

    public class ReportUndeliveredRequest
    {
        [Required]
        public string Reason { get; set; }
    }

    public class LocationRequest
    {
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
    public class DeliveryLocationRequest
    {
        public int? OrderId { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }

    public class ValidateVoucherRequest
    {
        public string VoucherCode { get; set; }
        public decimal OrderTotal { get; set; }
        public int RestaurantId { get; set; }
        public List<int> ProductIds { get; set; }
    }

}
