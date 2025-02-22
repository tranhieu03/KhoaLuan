using KhoaLuan1.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly KhoaLuantestContext _context;

        public ProductController(KhoaLuantestContext context)
        {
            _context = context;
        }

        // API Đăng bài bán hàng
        [HttpPost("create")]
        public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest model)
        {
            // Kiểm tra trạng thái đăng nhập
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "seller")
                return Ok(new { message = "Only sellers are allowed to post products." });

            // Kiểm tra xem seller có nhà hàng chưa
            var restaurant = await _context.Restaurants.FirstOrDefaultAsync(r => r.SellerId == userId.Value);
            if (restaurant == null)
                return BadRequest(new { message = "You need to register a restaurant before posting products." });

            // Tạo sản phẩm mới
            var product = new Product
            {
                RestaurantId = restaurant.RestaurantId,
                Name = model.Name,
                Description = model.Description,
                Price = model.Price,
                ImageUrl = model.ImageUrl,
                StockQuantity = model.StockQuantity
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Product created successfully.", productId = product.ProductId });
        }
        [HttpGet("listsanphamcuahang")]
        public async Task<IActionResult> ListProductRes()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "seller")
                return BadRequest(new { message = "Only sellers are allowed to view products." });

            // Kiểm tra xem seller có nhà hàng chưa
            var restaurant = await _context.Restaurants.FirstOrDefaultAsync(r => r.SellerId == userId.Value);
            if (restaurant == null)
                return BadRequest(new { message = "You need to register a restaurant to view products." });

            // Lấy danh sách sản phẩm thuộc nhà hàng
            var products = await _context.Products
                .Where(p => p.RestaurantId == restaurant.RestaurantId)
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

    }
    public class CreateProductRequest
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
        public int StockQuantity { get; set; }
    }

}
