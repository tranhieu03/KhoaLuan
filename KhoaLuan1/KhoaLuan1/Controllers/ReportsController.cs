using KhoaLuan1.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly KhoaluantestContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ReportsController(KhoaluantestContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }


        private bool IsValidFilterType(string filterType)
        {
            return filterType.Equals("day", StringComparison.OrdinalIgnoreCase) ||
                   filterType.Equals("month", StringComparison.OrdinalIgnoreCase) ||
                   filterType.Equals("year", StringComparison.OrdinalIgnoreCase);
        }

        // Báo cáo doanh thu theo nhà hàng có lọc theo ngày/tháng/năm
        [HttpGet("seller/revenue")]
        public async Task<IActionResult> GetSellerRevenue([FromQuery] string filterType, [FromQuery] DateTime date)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");
            if (!userId.HasValue) return Unauthorized("User not logged in.");
            if(role != "seller")
            {
                return Unauthorized(new { message = "Bạn không có quyền truy cập." });
            }
        
            if (!IsValidFilterType(filterType))
                return BadRequest("Invalid filter type. Use 'day', 'month', or 'year'.");

            var restaurant = await _context.Restaurants.FirstOrDefaultAsync(r => r.SellerId == userId);
            if (restaurant == null) return NotFound("Restaurant not found for this seller.");

            var query = _context.Orders.Where(o => o.RestaurantId == restaurant.RestaurantId && o.Status == "Completed");

            query = filterType.ToLower() switch
            {
                "day" => query.Where(o => o.OrderDate.Date == date.Date),
                "month" => query.Where(o => o.OrderDate.Year == date.Year && o.OrderDate.Month == date.Month),
                "year" => query.Where(o => o.OrderDate.Year == date.Year),
                _ => query
            };

            var totalRevenue = await query.SumAsync(o => o.TotalAmount);
            return Ok(new { revenue = totalRevenue });
        }

        // Báo cáo doanh thu theo sản phẩm có lọc theo ngày/tháng/năm
        [HttpGet("seller/product-revenue")]
        public async Task<IActionResult> GetProductRevenue([FromQuery] string filterType, [FromQuery] DateTime date)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (!userId.HasValue) return Unauthorized("User not logged in.");

            if (!IsValidFilterType(filterType))
                return BadRequest("Invalid filter type. Use 'day', 'month', or 'year'.");

            var restaurant = await _context.Restaurants.FirstOrDefaultAsync(r => r.SellerId == userId);
            if (restaurant == null) return NotFound("Restaurant not found for this seller.");

            var query = _context.OrderDetails
                .Include(od => od.Order)
                .Include(od => od.Product) // Thêm include Product để lấy thông tin sản phẩm
                .Where(od => od.Order.RestaurantId == restaurant.RestaurantId && od.Order.Status == "Completed");

            query = filterType.ToLower() switch
            {
                "day" => query.Where(od => od.Order.OrderDate.Date == date.Date),
                "month" => query.Where(od => od.Order.OrderDate.Year == date.Year && od.Order.OrderDate.Month == date.Month),
                "year" => query.Where(od => od.Order.OrderDate.Year == date.Year),
                _ => query
            };

            var productRevenue = await query.GroupBy(od => new { od.ProductId, od.Product.Name }) // Nhóm theo ProductId và Product Name
                .Select(g => new
                {
                    ProductId = g.Key.ProductId,
                    ProductName = g.Key.Name, // Thêm tên sản phẩm
                    TotalQuantitySold = g.Sum(od => od.Quantity), // Thêm tổng số lượng bán ra
                    TotalRevenue = g.Sum(od => od.Price * od.Quantity)
                })
                .OrderByDescending(x => x.TotalRevenue) // Sắp xếp theo doanh thu giảm dần
                .ToListAsync();

            return Ok(productRevenue);
        }

      

        // Thống kê số lượng đơn hàng đã giao của người giao hàng theo ngày/tháng/năm
        [HttpGet("delivery/orders")]
        public async Task<IActionResult> GetDeliveryOrders([FromQuery] string filterType, [FromQuery] DateTime date)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (!userId.HasValue) return Unauthorized("User not logged in.");

            if (!IsValidFilterType(filterType))
                return BadRequest("Invalid filter type. Use 'day', 'month', or 'year'.");

            var query = _context.Orders.Where(o => o.DeliveryPersonId == userId && o.Status == "Completed");

            query = filterType.ToLower() switch
            {
                "day" => query.Where(o => o.OrderDate.Date == date.Date),
                "month" => query.Where(o => o.OrderDate.Year == date.Year && o.OrderDate.Month == date.Month),
                "year" => query.Where(o => o.OrderDate.Year == date.Year),
                _ => query
            };

            var totalOrders = await query.CountAsync();
            return Ok(new { totalOrders });
        }
    }
}
