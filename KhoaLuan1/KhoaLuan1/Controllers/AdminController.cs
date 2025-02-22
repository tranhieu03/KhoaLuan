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
        private readonly KhoaLuantestContext _context;

        public AdminController(KhoaLuantestContext context)
        {
            _context = context;
        }
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

        // 4. Xóa đơn hàng
        [HttpDelete("orders/{id}")]
        public async Task<IActionResult> DeleteOrder(int id)
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

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
