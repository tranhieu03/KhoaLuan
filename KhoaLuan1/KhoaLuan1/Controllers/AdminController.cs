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
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "Admin")
                return BadRequest(new { message = "Only Admin is permitted" });
            return await _context.Users.ToListAsync();
        }

        // 2. Xem chi tiết tài khoản
        [HttpGet("users/{id}")]
        public async Task<ActionResult<User>> GetUser(int id)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "Admin")
                return BadRequest(new { message = "Only Admin is permitted" });
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound("User not found!");
            }
            return user;
        }

        // 3. Cập nhật thông tin tài khoản
        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUser(int id, User updatedUser)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "Admin")
                return BadRequest(new { message = "Only Admin is permitted" });
            if (id != updatedUser.UserId)
            {
                return BadRequest("User ID mismatch!");
            }

            _context.Entry(updatedUser).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Users.Any(e => e.UserId == id))
                {
                    return NotFound("User not found!");
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // 4. Xóa hoặc vô hiệu hóa tài khoản
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "Admin")
                return BadRequest(new { message = "Only Admin is permitted" });
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound("User not found!");
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ================= QUẢN LÝ ĐƠN HÀNG ====================

        // 1. Lấy danh sách tất cả đơn hàng
        [HttpGet("orders")]
        public async Task<ActionResult<IEnumerable<Order>>> GetOrders()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "Admin")
                return BadRequest(new { message = "Only Admin is permitted" });
            return await _context.Orders.Include(o => o.User).ToListAsync();
        }

        // 2. Xem chi tiết đơn hàng
        [HttpGet("orders/{id}")]
        public async Task<ActionResult<Order>> GetOrder(int id)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "Admin")
                return BadRequest(new { message = "Only Admin is permitted" });
            var order = await _context.Orders
                .Include(o => o.User)
                .Include(o => o.OrderDetails)
                .ThenInclude(od => od.Product)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null)
            {
                return NotFound("Order not found!");
            }

            return order;
        }

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
