using KhoaLuan1.Models;
using KhoaLuan1.Service;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly KhoaluantestContext _context;
        private readonly EmailService _emailService;
        private readonly VoucherService _voucherService;
        private readonly ILogger<AdminController> _logger;

        public AdminController(KhoaluantestContext context, EmailService emailService, VoucherService voucherService, ILogger<AdminController> logger)
        {
            _context = context;
            _emailService= emailService;
            _voucherService= voucherService;
            _logger = logger;
        }


        // 1. Xem toàn bộ tài khoản
        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers()
        {
            var currentUserId = HttpContext.Session.GetInt32("UserId");
            var currentUserRole = HttpContext.Session.GetString("Role");

            if (currentUserId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (currentUserRole != "Admin")
                return BadRequest(new { message = "Only Admin is permitted" });

            var users = await _context.Users
                .Select(u => new
                {
                    u.UserId,
                    u.Email,
                    u.FullName,
                    u.PhoneNumber,
                    u.Address,
                    u.CreatedAt,
                    u.Role,
                    // Thêm trường cho DeliveryPerson
                    AverageRating = u.Role == "DeliveryPerson" ? u.AverageRating : (decimal?)null,
                    VehicleNumber = u.Role == "DeliveryPerson" ? u.VehicleNumber : null,
                    FrontIdCardImage = u.Role == "DeliveryPerson" ? u.FrontIdCardImage : null,
                    BackIdCardImage = u.Role == "DeliveryPerson" ? u.BackIdCardImage : null
                })
                .ToListAsync();

            return Ok(users);
        }

        // 4. Xóa hoặc vô hiệu hóa tài khoản
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var currentUserId = HttpContext.Session.GetInt32("UserId");
            var currentUserRole = HttpContext.Session.GetString("Role");

            if (currentUserId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (currentUserRole != "Admin")
                return BadRequest(new { message = "Only Admin is permitted" });

            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound("User not found!");
            }

            // Thay vì xóa, chuyển status thành "Deleted"
            user.Status = "Deleted";
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ================= QUẢN LÝ ĐƠN HÀNG ====================

        // 1. Lấy danh sách tất cả đơn hàng
        [HttpGet("orders")]
        public async Task<ActionResult<IEnumerable<object>>> GetOrders()
        {
            var currentUserId = HttpContext.Session.GetInt32("UserId");
            var currentUserRole = HttpContext.Session.GetString("Role");

            if (currentUserId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (currentUserRole != "Admin")
                return BadRequest(new { message = "Only Admin is permitted" });

            var orders = await _context.Orders
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new
                {
                    OrderId = o.OrderId,
                    OrderDate = o.OrderDate,
                    Status = o.Status,
                    TotalAmount = o.TotalAmount,
                    Address = o.Address,
                    PaymentMethod = o.PaymentMethod,
                    PaymentStatus = o.PaymentStatus,
                    Customer = new
                    {
                        o.User.UserId,
                        o.User.FullName,
                        o.User.Email,
                        o.User.PhoneNumber
                    },
                    Restaurant = new
                    {
                        o.Restaurant.RestaurantId,
                        o.Restaurant.Name
                    },
                    DeliveryPerson = o.DeliveryPersonId != null ? new
                    {
                        o.DeliveryPerson.UserId,
                        o.DeliveryPerson.FullName,
                        o.DeliveryPerson.PhoneNumber
                    } : null,
                    Items = o.OrderDetails.Select(od => new
                    {
                        ProductId = od.ProductId,
                        ProductName = od.Product.Name,
                        Quantity = od.Quantity,
                        Price = od.Price
                    })
                })
                .ToListAsync();

            return Ok(orders);
        }

        // 2. Xem chi tiết đơn hàng
       
        // 3. Cập nhật trạng thái đơn hàng
        [HttpPut("orders/{id}")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] string newStatus)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "Admin")
                return BadRequest(new { message = "Only Admin is permitted" });
            var order = await _context.Orders.FindAsync(id);
            if (order == null)
            {
                return NotFound("Order not found!");
            }

            order.Status = newStatus;
            await _context.SaveChangesAsync();

            return NoContent();
        }


        //===========================Quản lý nhà hàng========================
        // chấp nhận hoặc từ chối nhà hàng

        [HttpGet("restaurants")]
        public async Task<ActionResult<IEnumerable<object>>> GetRestaurantsWithOwners()
        {
            // Kiểm tra quyền admin
            var currentUserId = HttpContext.Session.GetInt32("UserId");
            var currentUserRole = HttpContext.Session.GetString("Role");

            if (currentUserId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (currentUserRole != "Admin")
                return BadRequest(new { message = "Only Admin is permitted" });

            var restaurants = await _context.Restaurants
                .Include(r => r.Seller) // Include thông tin người bán
                .Select(r => new
                {
                    r.RestaurantId,
                    r.Name,
                    r.Address,
                    r.PhoneNumber,
                    r.Status,
                    SellerInfo = new
                    {
                        r.Seller.UserId,
                        r.Seller.FullName,
                        r.Seller.Email,
                        r.Seller.PhoneNumber
                    },
                    ProductsCount = r.Products.Count(p => p.Status == "Active")
                })
                .OrderByDescending(r => r.Name) // Sắp xếp theo ngày tạo mới nhất
                .ToListAsync();

            return Ok(restaurants);
        }
        [HttpPost("approve/{restaurantId}")]
        public async Task<IActionResult> ApproveRestaurant(int restaurantId)
        {
            var email = HttpContext.Session.GetString("Email");
            var restaurant = await _context.Restaurants.FindAsync(restaurantId);
            if (restaurant == null) return NotFound(new { message = "Restaurant not found." });

            restaurant.Status = "Approved";
            await _context.SaveChangesAsync();

            var emailBody = $@"
        <h2>Congratulations!</h2>
        <p>Your restaurant <strong>{restaurant.Name}</strong> has been approved.</p>
        <p>Address: {restaurant.Address}</p>
        <p>Phone: {restaurant.PhoneNumber}</p>";

            await _emailService.SendEmailAsync(email, "Restaurant Approved", emailBody);

            return Ok(new { message = "Restaurant approved and email sent." });
        }

        [HttpPost("reject/{restaurantId}")]
        public async Task<IActionResult> RejectRestaurant(int restaurantId, [FromBody] RejectRestaurantRequest model)
        {
            var email = HttpContext.Session.GetString("Email");
            var restaurant = await _context.Restaurants.FindAsync(restaurantId);
            if (restaurant == null) return NotFound(new { message = "Restaurant not found." });

            restaurant.Status = "Rejected";
            await _context.SaveChangesAsync();

            var emailBody = $@"
        <h2>Unfortunately, Your Restaurant Was Not Approved</h2>
        <p>We regret to inform you that your restaurant <strong>{restaurant.Name}</strong> was not approved.</p>
        <p>Reason: {model.Reason}</p>";

            await _emailService.SendEmailAsync(email, "Restaurant Rejected", emailBody);

            return Ok(new { message = "Restaurant rejected and email sent." });
        }


        // QUản lý voucher///////

        [HttpGet("vouchers")]
        public async Task<IActionResult> GetAllVouchers([FromQuery] string status = null, [FromQuery] string categoryName = null)
        {
            try
            {
                // Check admin permissions
                var adminId = HttpContext.Session.GetInt32("UserId");
                if (adminId == null)
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập để tiếp tục." });

                var user = await _context.Users.FindAsync(adminId);
                if (user == null || user.Role != "Admin")
                    return Unauthorized(new { success = false, message = "Bạn không có quyền truy cập chức năng này." });

                // Query vouchers with filters
                var query = _context.Vouchers
                    .Include(v => v.VoucherCategory)
                    .Include(v => v.VoucherConditions)
                    .Include(v => v.Restaurant)
                    .Include(v => v.Product)
                    .Include(v => v.User)
                    .AsQueryable();

                // Apply filters if provided
                if (!string.IsNullOrEmpty(status))
                    query = query.Where(v => v.Status == status);

                if (!string.IsNullOrEmpty(categoryName))
                    query = query.Where(v => v.VoucherCategory.Name == categoryName);

                var vouchers = await query.ToListAsync();

                // Format vouchers for response
                var result = vouchers.Select(v => new
                {
                    v.VoucherId,
                    v.Code,
                    v.VoucherType,
                    v.DiscountAmount,
                    v.MinimumOrderAmount,
                    v.MaximumDiscountAmount,
                    v.UsageLimit,
                    v.ExpirationDate,
                    v.Status,
                    v.ApplyMode,
                    VoucherCategory = v.VoucherCategory != null ? new { v.VoucherCategory.VoucherCategoryId, v.VoucherCategory.Name } : null,
                    Restaurant = v.Restaurant != null ? new { v.Restaurant.RestaurantId, v.Restaurant.Name } : null,
                    Product = v.Product != null ? new { v.Product.ProductId, v.Product.Name } : null,
                    User = v.User != null ? new { v.User.UserId, v.User.FullName, v.User.Email } : null,
                    Conditions = v.VoucherConditions?.Select(c => new
                    {
                        c.VoucherConditionId,
                        c.ConditionType,
                        c.Field,
                        c.Operator,
                        c.Value
                    }).ToList()
                }).ToList();

                return Ok(new { success = true, vouchers = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách voucher");
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi lấy danh sách voucher. Vui lòng thử lại sau." });
            }
        }

        // GET: api/admin/vouchers/{id}
        [HttpGet(("voucher/{id}"))]
        public async Task<IActionResult> GetVoucher(int id)
        {
            try
            {
                // Check admin permissions
                var adminId = HttpContext.Session.GetInt32("UserId");
                if (adminId == null)
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập để tiếp tục." });

                var user = await _context.Users.FindAsync(adminId);
                if (user == null || user.Role != "Admin")
                    return Unauthorized(new { success = false, message = "Bạn không có quyền truy cập chức năng này." });

                // Get voucher with related data
                var voucher = await _context.Vouchers
                    .Include(v => v.VoucherCategory)
                    .Include(v => v.VoucherConditions)
                    .Include(v => v.Restaurant)
                    .Include(v => v.Product)
                    .Include(v => v.User)
                    .FirstOrDefaultAsync(v => v.VoucherId == id);

                if (voucher == null)
                    return NotFound(new { success = false, message = "Không tìm thấy voucher." });

                // Format voucher for response
                var result = new
                {
                    voucher.VoucherId,
                    voucher.Code,
                    voucher.VoucherType,
                    voucher.DiscountAmount,
                    voucher.MinimumOrderAmount,
                    voucher.MaximumDiscountAmount,
                    voucher.UsageLimit,
                    voucher.ExpirationDate,
                    voucher.Status,
                    voucher.ApplyMode,
                    VoucherCategory = voucher.VoucherCategory != null ? new { voucher.VoucherCategory.VoucherCategoryId, voucher.VoucherCategory.Name } : null,
                    Restaurant = voucher.Restaurant != null ? new { voucher.Restaurant.RestaurantId, voucher.Restaurant.Name } : null,
                    Product = voucher.Product != null ? new { voucher.Product.ProductId, voucher.Product.Name } : null,
                    User = voucher.User != null ? new { voucher.User.UserId, voucher.User.FullName, voucher.User.Email } : null,
                    Conditions = voucher.VoucherConditions?.Select(c => new
                    {
                        c.VoucherConditionId,
                        c.ConditionType,
                        c.Field,
                        c.Operator,
                        c.Value
                    }).ToList()
                };

                return Ok(new { success = true, voucher = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy thông tin voucher");
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi lấy thông tin voucher. Vui lòng thử lại sau." });
            }
        }

        // POST: api/admin/vouchers
        [HttpPost("voucher-create")]
        public async Task<IActionResult> CreateVoucher([FromBody] VoucherCreateRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Kiểm tra quyền admin
                var adminId = HttpContext.Session.GetInt32("UserId");
                if (adminId == null)
                {
                    _logger.LogWarning("Unauthorized access attempt");
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập với tài khoản admin." });
                }

                var adminUser = await _context.Users.FindAsync(adminId);
                if (adminUser == null || adminUser.Role != "Admin")
                {
                    _logger.LogWarning("Unauthorized admin attempt by user {UserId}", adminId);
                    return Unauthorized(new { success = false, message = "Chỉ admin mới có quyền tạo voucher." });
                }

                // 2. Validate dữ liệu cơ bản
                if (string.IsNullOrWhiteSpace(request.Code))
                {
                    return BadRequest(new { success = false, message = "Mã voucher không được để trống." });
                }

                // 3. Kiểm tra trùng mã voucher
                if (await _context.Vouchers.AnyAsync(v => v.Code == request.Code))
                {
                    _logger.LogInformation("Voucher code already exists: {Code}", request.Code);
                    return BadRequest(new { success = false, message = "Mã voucher đã tồn tại trong hệ thống." });
                }

                // 4. Xử lý voucher category (tương tự script SQL)
                int? categoryId = request.VoucherCategoryId;
                if (categoryId.HasValue)
                {
                    var categoryExists = await _context.VoucherCategories
                        .AnyAsync(c => c.VoucherCategoryId == categoryId);

                    if (!categoryExists)
                    {
                        _logger.LogWarning("Invalid voucher category ID: {CategoryId}", categoryId);
                        return BadRequest(new { success = false, message = "Danh mục voucher không tồn tại." });
                    }
                }

                // 5. Tạo voucher mới (theo logic từ script SQL)
                var voucher = new Voucher
                {
                    Code = request.Code.Trim(),
                    VoucherType = request.VoucherType ?? "ShippingFee",
                    DiscountAmount = request.DiscountAmount,
                    MinimumOrderAmount = (int?)request.MinimumOrderAmount,
                    MaximumDiscountAmount = (int?)(request.MaximumDiscountAmount ?? request.DiscountAmount),
                    UsageLimit = request.UsageLimit,
                    ExpirationDate = request.ExpirationDate,
                    Status = "Active",
                    ApplyMode = request.ApplyMode ?? "Individual",
                    VoucherCategoryId = categoryId,
                    UserId = request.UserId == 0 ? null : request.UserId,
                    RestaurantId = request.RestaurantId == 0 ? null : request.RestaurantId,
                    ProductId = request.ProductId == 0 ? null : request.ProductId

                };

                _context.Vouchers.Add(voucher);
                await _context.SaveChangesAsync();

                // 6. Xử lý điều kiện (nếu có)
                if (request.Conditions != null && request.Conditions.Any())
                {
                    foreach (var condition in request.Conditions)
                    {
                        _context.VoucherConditions.Add(new VoucherCondition
                        {
                            VoucherId = voucher.VoucherId,
                            ConditionType = condition.ConditionType,
                            Field = condition.Field,
                            Operator = condition.Operator,
                            Value = condition.Value,
                            CreatedDate = DateTime.UtcNow
                        });
                    }
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                _logger.LogInformation("Voucher created successfully: {Code} (ID: {VoucherId})",
                    voucher.Code, voucher.VoucherId);

                return Ok(new
                {
                    success = true,
                    message = "Tạo voucher thành công",
                    voucherId = voucher.VoucherId
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Lỗi khi tạo voucher. Request: {@Request}", request);
                return StatusCode(500, new
                {
                    success = false,
                    message = $"Lỗi hệ thống: {ex.Message}"
                });
            }
        }
        // PUT: api/admin/vouchers/{id}
        [HttpPut("voucher-update{id}")]
        public async Task<IActionResult> UpdateVoucher(int id, [FromBody] VoucherUpdateRequest request)
        {
            try
            {
                // Check admin permissions
                var adminId = HttpContext.Session.GetInt32("UserId");
                if (adminId == null)
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập để tiếp tục." });

                var user = await _context.Users.FindAsync(adminId);
                if (user == null || user.Role != "Admin")
                    return Unauthorized(new { success = false, message = "Bạn không có quyền truy cập chức năng này." });

                // Find voucher
                var voucher = await _context.Vouchers
                    .Include(v => v.VoucherConditions)
                    .FirstOrDefaultAsync(v => v.VoucherId == id);

                if (voucher == null)
                    return NotFound(new { success = false, message = "Không tìm thấy voucher." });

                // Check if new code conflicts with existing codes (but allow same code as current)
                if (!string.IsNullOrWhiteSpace(request.Code) && request.Code != voucher.Code)
                {
                    var existingCode = await _context.Vouchers.AnyAsync(v => v.Code == request.Code && v.VoucherId != id);
                    if (existingCode)
                        return BadRequest(new { success = false, message = "Mã voucher đã tồn tại." });
                    voucher.Code = request.Code;
                }

                // Update voucher properties
                if (!string.IsNullOrWhiteSpace(request.VoucherType))
                    voucher.VoucherType = request.VoucherType;

                if (request.DiscountAmount.HasValue)
                    voucher.DiscountAmount = request.DiscountAmount.Value;

                if (request.MinimumOrderAmount.HasValue)
                    voucher.MinimumOrderAmount = (int)request.MinimumOrderAmount;

                if (request.MaximumDiscountAmount.HasValue)
                    voucher.MaximumDiscountAmount = (int)request.MaximumDiscountAmount;

                if (request.UsageLimit.HasValue)
                    voucher.UsageLimit = request.UsageLimit;

                if (request.ExpirationDate.HasValue)
                    voucher.ExpirationDate = request.ExpirationDate.Value;

                if (!string.IsNullOrWhiteSpace(request.Status))
                    voucher.Status = request.Status;

                if (!string.IsNullOrWhiteSpace(request.ApplyMode))
                    voucher.ApplyMode = request.ApplyMode;

                voucher.VoucherCategoryId = request.VoucherCategoryId;
                voucher.RestaurantId = request.RestaurantId;
                voucher.ProductId = request.ProductId;
                voucher.UserId = request.UserId;

                // Handle conditions update
                if (request.UpdateConditions && request.Conditions != null)
                {
                    // Remove existing conditions
                    _context.VoucherConditions.RemoveRange(voucher.VoucherConditions);

                    // Add new conditions
                    foreach (var condition in request.Conditions)
                    {
                        var voucherCondition = new VoucherCondition
                        {
                            VoucherId = voucher.VoucherId,
                            ConditionType = condition.ConditionType,
                            Field = condition.Field,
                            Operator = condition.Operator,
                            Value = condition.Value,
                            CreatedDate = DateTime.UtcNow,
                            UpdatedDate = DateTime.UtcNow
                        };

                        _context.VoucherConditions.Add(voucherCondition);
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Cập nhật voucher thành công" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật voucher");
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi cập nhật voucher. Vui lòng thử lại sau." });
            }
        }

        // DELETE: api/admin/vouchers/{id}
        [HttpDelete("voucher-delete/{id}")]
        public async Task<IActionResult> DeleteVoucher(int id)
        {
            try
            {
                // Check admin permissions
                var adminId = HttpContext.Session.GetInt32("UserId");
                if (adminId == null)
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập để tiếp tục." });

                var user = await _context.Users.FindAsync(adminId);
                if (user == null || user.Role != "Admin")
                    return Unauthorized(new { success = false, message = "Bạn không có quyền truy cập chức năng này." });

                // Find voucher
                var voucher = await _context.Vouchers
                    .Include(v => v.VoucherConditions)
                    .FirstOrDefaultAsync(v => v.VoucherId == id);

                if (voucher == null)
                    return NotFound(new { success = false, message = "Không tìm thấy voucher." });

                // Remove conditions first
                if (voucher.VoucherConditions != null && voucher.VoucherConditions.Any())
                {
                    _context.VoucherConditions.RemoveRange(voucher.VoucherConditions);
                }

                // Then remove voucher
                _context.Vouchers.Remove(voucher);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Xóa voucher thành công" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa voucher");
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi xóa voucher. Vui lòng thử lại sau." });
            }
        }

        // GET: api/admin/vouchers/categories
        [HttpGet("categories")]
        public async Task<IActionResult> GetVoucherCategories()
        {
            try
            {
                // Check admin permissions
                var adminId = HttpContext.Session.GetInt32("UserId");
                if (adminId == null)
                    return Unauthorized(new { success = false, message = "Vui lòng đăng nhập để tiếp tục." });

                var user = await _context.Users.FindAsync(adminId);
                if (user == null || user.Role != "Admin")
                    return Unauthorized(new { success = false, message = "Bạn không có quyền truy cập chức năng này." });

                var categories = await _context.VoucherCategories.ToListAsync();
                var result = categories.Select(c => new
                {
                    c.VoucherCategoryId,
                    c.Name,
                    c.Description
                }).ToList();

                return Ok(new { success = true, categories = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách loại voucher");
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi lấy danh sách loại voucher. Vui lòng thử lại sau." });
            }
        }
    }

    // Request models
    public class VoucherCreateRequest
    {
        [Required]
        public string Code { get; set; }

        public string VoucherType { get; set; } = "ShippingFee";

        [Range(0, double.MaxValue)]
        public decimal DiscountAmount { get; set; }

        public decimal? MinimumOrderAmount { get; set; } = 0;
        public decimal? MaximumDiscountAmount { get; set; }
        public int? UsageLimit { get; set; }

        [Required]
        public DateTime ExpirationDate { get; set; }

        public string ApplyMode { get; set; } = "Individual";
        public int? VoucherCategoryId { get; set; }
        public int? UserId { get; set; } = null; // Cho phép null mặc định
        public int? RestaurantId { get; set; } = null;
        public int? ProductId { get; set; } = null;
        public List<VoucherConditionRequest>? Conditions { get; set; }
    }
    public class VoucherUpdateRequest
    {
        public string Code { get; set; }
        public string VoucherType { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal? MinimumOrderAmount { get; set; }
        public decimal? MaximumDiscountAmount { get; set; }
        public int? UsageLimit { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public string Status { get; set; }
        public string ApplyMode { get; set; }
        public int? VoucherCategoryId { get; set; }
        public int? RestaurantId { get; set; }
        public int? ProductId { get; set; }
        public int? UserId { get; set; }
        public bool UpdateConditions { get; set; }
        public List<VoucherConditionRequest> Conditions { get; set; }
    }

    public class VoucherConditionRequest
    {
        public string ConditionType { get; set; } // User, Order, Product
        public string Field { get; set; }
        public string Operator { get; set; }
        public string Value { get; set; }
    }

  
    public class RejectRestaurantRequest
    {
        public string Reason { get; set; }
    }


  
}
