using KhoaLuan1.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly KhoaluantestContext _context;
        private readonly EmailService _emailService;

        public AdminController(KhoaluantestContext context, EmailService emailService)
        {
            _context = context;
            _emailService= emailService;
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

        //================quản lý món ăn=========================

        //================Quản lý voucher========================

        //API thêm voucher
// có 2 voucher type là fixed và percentage tương ứng với giảm giá trực tiếp và giảm giá theo phần trăm
        [HttpPost("add-voucher")]
        public IActionResult AddVoucher([FromBody] VoucherDto model)
        {
            if (model == null || string.IsNullOrEmpty(model.Code))
            {
                return BadRequest("Dữ liệu không hợp lệ");
            }

            var voucher = new Voucher
            {
                Code = model.Code,
                DiscountAmount = model.DiscountAmount,
                ExpirationDate = model.ExpirationDate,
                Status = "Active",
                VoucherType = model.VoucherType,
                UserId = model.UserId,
                ProductId = model.ProductId,
                RestaurantId = model.RestaurantId,
                VoucherCategoryId = model.VoucherCategoryId
            };

            _context.Vouchers.Add(voucher);
            _context.SaveChanges();

            return Ok(new { Message = "Thêm mã giảm giá thành công", VoucherId = voucher.VoucherId });
        }

    }
    public class RejectRestaurantRequest
    {
        public string Reason { get; set; }
    }


    public class VoucherDto
    {
        public string Code { get; set; }
        public decimal DiscountAmount { get; set; }
        public DateTime ExpirationDate { get; set; }
        public string VoucherType { get; set; }
        public int? UserId { get; set; } // Áp dụng cho User cụ thể
        public int? ProductId { get; set; } // Áp dụng cho Món ăn
        public int? RestaurantId { get; set; } // Áp dụng cho Nhà hàng
        public int? VoucherCategoryId { get; set; } // Danh mục voucher
    }
}
