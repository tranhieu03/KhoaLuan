using KhoaLuan1.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly KhoaluantestContext _context;

        public ProductController(KhoaluantestContext context)
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
                StockQuantity = model.StockQuantity,
                Status = "Active" // Thêm status mặc định
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Product created successfully.", productId = product.ProductId });
        }

        // API xem danh sách sản phẩm cửa hàng đã đăng (chỉ status = "Active")
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

            // Lấy danh sách sản phẩm thuộc nhà hàng (chỉ status = "Active")
            var products = await _context.Products
                .Where(p => p.RestaurantId == restaurant.RestaurantId && p.Status == "Active")
                .Select(p => new
                {
                    p.ProductId,
                    p.Name,
                    p.Description,
                    p.Price,
                    p.ImageUrl,
                    p.StockQuantity,
                    p.Status
                })
                .ToListAsync();

            return Ok(products);
        }

        // API xem danh sách sản phẩm đã xóa (status = "Deleted")
        [HttpGet("listsanphamdaxoa")]
        public async Task<IActionResult> ListDeletedProducts()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "seller")
                return BadRequest(new { message = "Only sellers are allowed to view deleted products." });

            // Kiểm tra xem seller có nhà hàng chưa
            var restaurant = await _context.Restaurants.FirstOrDefaultAsync(r => r.SellerId == userId.Value);
            if (restaurant == null)
                return BadRequest(new { message = "You need to register a restaurant to view deleted products." });

            // Lấy danh sách sản phẩm đã xóa thuộc nhà hàng (status = "Deleted")
            var deletedProducts = await _context.Products
                .Where(p => p.RestaurantId == restaurant.RestaurantId && p.Status == "Deleted")
                .Select(p => new
                {
                    p.ProductId,
                    p.Name,
                    p.Description,
                    p.Price,
                    p.ImageUrl,
                    p.StockQuantity,
                    p.Status
                })
                .ToListAsync();

            return Ok(deletedProducts);
        }

        // API Xóa sản phẩm (chuyển status thành "Deleted" và xóa khỏi CartItems)
        [HttpPut("delete/{id}")]
        public async Task<IActionResult> MarkProductAsDeleted(int id, [FromServices] ILogger<ProductController> logger)
        {
            try
            {
                var userId = HttpContext.Session.GetInt32("UserId");
                var role = HttpContext.Session.GetString("Role");

                if (userId == null)
                    return Unauthorized(new { message = "User is not logged in." });

                if (role != "seller")
                    return BadRequest(new { message = "Only sellers are allowed to delete products." });

                var restaurant = await _context.Restaurants.FirstOrDefaultAsync(r => r.SellerId == userId.Value);
                if (restaurant == null)
                    return BadRequest(new { message = "You don't have a restaurant to manage products." });

                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.ProductId == id && p.RestaurantId == restaurant.RestaurantId);

                if (product == null)
                    return NotFound(new { message = $"Không tìm thấy sản phẩm với ID {id} trong nhà hàng của bạn" });

                if (product.Status == "Deleted")
                    return BadRequest(new { message = "Sản phẩm này đã bị xóa trước đó" });

                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    product.Status = "Deleted";

                    var cartItems = await _context.CartItems
                        .Where(ci => ci.ProductId == id)
                        .ToListAsync();

                    if (cartItems.Any())
                    {
                        foreach (var item in cartItems)
                        {
                            item.Status = "Deleted";
                        }
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    logger.LogInformation("Đã đánh dấu sản phẩm {ProductId} và các mục giỏ hàng là 'Deleted'", id);
                    return Ok(new
                    {
                        message = $"Đã đánh dấu sản phẩm {product.Name} và các mục trong giỏ hàng là 'Deleted'"
                    });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    logger.LogError(ex, "Lỗi khi lưu thay đổi cho sản phẩm {ProductId}", id);
                    throw;
                }
            }
            catch (DbUpdateException dbEx)
            {
                logger.LogError(dbEx, "Lỗi cơ sở dữ liệu khi cập nhật sản phẩm {ProductId}", id);
                return StatusCode(500, new { message = $"Lỗi cơ sở dữ liệu: {dbEx.InnerException?.Message ?? dbEx.Message}" });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi không xác định khi xử lý sản phẩm {ProductId}", id);
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
        }

        // API Khôi phục sản phẩm (chuyển status từ "Deleted" về "Active" và cập nhật CartItems)
        [HttpPut("restore/{id}")]
        public async Task<IActionResult> RestoreProduct(int id)
        {
            try
            {
                var userId = HttpContext.Session.GetInt32("UserId");
                var role = HttpContext.Session.GetString("Role");

                if (userId == null)
                    return Unauthorized(new { message = "User is not logged in." });

                if (role != "seller")
                    return BadRequest(new { message = "Only sellers are allowed to restore products." });

                var restaurant = await _context.Restaurants.FirstOrDefaultAsync(r => r.SellerId == userId.Value);
                if (restaurant == null)
                    return BadRequest(new { message = "You don't have a restaurant to manage products." });

                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.ProductId == id && p.RestaurantId == restaurant.RestaurantId);

                if (product == null)
                    return NotFound(new { message = $"Không tìm thấy sản phẩm với ID {id} trong nhà hàng của bạn" });

                if (product.Status == "Active")
                    return BadRequest(new { message = "Sản phẩm này hiện đang ở trạng thái Active" });

                // Cập nhật status của sản phẩm thành "Active"
                product.Status = "Active";

                // Khôi phục status của các mục trong CartItems thành "Active"
                var cartItems = await _context.CartItems
                    .Where(ci => ci.ProductId == id && ci.Status == "Deleted")
                    .ToListAsync();

                if (cartItems.Any())
                {
                    foreach (var item in cartItems)
                    {
                        item.Status = "Active"; // Khôi phục trạng thái thành "Active"
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Đã khôi phục sản phẩm {product.Name} và các mục trong giỏ hàng về trạng thái 'Active'"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi server: {ex.Message}" });
            }
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