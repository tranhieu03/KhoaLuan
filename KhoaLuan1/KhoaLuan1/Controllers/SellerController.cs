using KhoaLuan1.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SellerController : ControllerBase
    {
        private readonly KhoaLuantestContext _context;
        public SellerController(KhoaLuantestContext context)
        {
            _context = context;
        }


        [HttpGet("seller-orders")]
        public async Task<IActionResult> GetSellerOrders()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "seller")
                return BadRequest(new { message = "Only sellers are allowed to view their orders." });

            try
            {
                // Lấy danh sách nhà hàng của seller
                var sellerRestaurants = await _context.Restaurants
                    .Where(r => r.SellerId == userId)
                    .Select(r => r.RestaurantId)
                    .ToListAsync();

                if (!sellerRestaurants.Any())
                    return NotFound(new { message = "No restaurants found for this seller." });

                // Lấy danh sách đơn hàng liên quan đến các nhà hàng của seller
                var orders = await _context.Orders
                    .Where(o => sellerRestaurants.Contains(o.RestaurantId))
                    .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.Product)
                    .Include(o => o.User) // Để lấy thông tin người đặt hàng
                    .ToListAsync();

                return Ok(new
                {
                    Success = true,
                    Orders = orders.Select(o => new
                    {
                        o.OrderId,
                        o.Status,
                        o.TotalAmount,
                        o.OrderDate,
                        o.Address,
                        o.PaymentStatus,
                        CustomerName = o.User.FullName, // Thông tin khách hàng
                        CustomerPhone = o.User.PhoneNumber, // Số điện thoại khách hàng
                        Items = o.OrderDetails.Select(od => new
                        {
                            ProductName = od.Product.Name,
                            od.Quantity,
                            od.Price
                        })
                    })
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

    }
}
