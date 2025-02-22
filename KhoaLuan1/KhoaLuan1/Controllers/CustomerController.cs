using KhoaLuan1.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomerController : ControllerBase
    {
        private readonly KhoaLuantestContext _context;

        public CustomerController(KhoaLuantestContext context)
        {
            _context = context;
        }
        [HttpGet("all-products")]
        public async Task<IActionResult> GetAllProducts(int page = 1, int pageSize = 10)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "Customer")
                return BadRequest(new { message = "Only customers are allowed to view all products." });

            var totalProducts = await _context.Products.CountAsync();
            var products = await _context.Products
                .Include(p => p.Restaurant)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.ProductId,
                    p.Name,
                    p.Description,
                    p.Price,
                    p.ImageUrl,
                    p.StockQuantity,
                    p.RestaurantId, // Thêm dòng này để trả về RestaurantId
                    RestaurantName = p.Restaurant.Name,
                    RestaurantAddress = p.Restaurant.Address
                })
                .ToListAsync();

            return Ok(new
            {
                TotalProducts = totalProducts,
                Page = page,
                PageSize = pageSize,
                Products = products
            });
        }




        [HttpGet("products-by-restaurant/{restaurantId}")]
        public async Task<IActionResult> GetProductsByRestaurant(int restaurantId)
        {
            if (restaurantId <= 0)
                return BadRequest(new { message = "Invalid restaurant ID." });

            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "Customer")
                return BadRequest(new { message = "Only customers are allowed to view products by restaurant." });

            var restaurant = await _context.Restaurants.FirstOrDefaultAsync(r => r.RestaurantId == restaurantId);
            if (restaurant == null)
                return NotFound(new { message = "Restaurant not found." });

            var products = await _context.Products
                .Where(p => p.RestaurantId == restaurantId)
                .Select(p => new
                {
                    p.ProductId,
                    p.Name,
                    p.Description,
                    p.Price,
                    p.ImageUrl,
                    p.StockQuantity
                })
                .ToListAsync();

            return Ok(products);
        }
        [HttpGet("my-orders")]
        public async Task<IActionResult> GetUserOrders()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Not logged in." });

            var orders = await _context.Orders
                .Where(o => o.UserId == userId)
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

            if (!orders.Any())
                return NotFound(new { message = "No orders found." });

            return Ok(new { Orders = orders });
        }


    }
}
