using KhoaLuan1.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly KhoaluantestContext _context;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly ILogger<ProductController> _logger;

        public ProductController(
            KhoaluantestContext context,
            IWebHostEnvironment webHostEnvironment,
            ILogger<ProductController> logger)
        {
            _context = context;
            _webHostEnvironment = webHostEnvironment;
            _logger = logger;
        }

        private async Task<ActionResult<Restaurant>> GetCurrentUserRestaurant()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "seller")
                return BadRequest(new { message = "Only sellers are allowed to manage products." });

            var restaurant = await _context.Restaurants.FirstOrDefaultAsync(r => r.SellerId == userId.Value);
            if (restaurant == null)
                return BadRequest(new { message = "You need to register a restaurant to manage products." });

            return restaurant;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateProduct([FromForm] CreateProductRequest model)
        {
            var restaurantResult = await GetCurrentUserRestaurant();
            if (restaurantResult.Result != null) return restaurantResult.Result;
            var restaurant = restaurantResult.Value;

            // Kiểm tra bắt buộc phải có file ảnh upload
            if (model.ImageFile == null || model.ImageFile.Length == 0)
            {
                return BadRequest(new { message = "Image file is required." });
            }

            string imageUrl;
            try
            {
                imageUrl = await UploadProductImage(model.ImageFile);
                if (imageUrl == null)
                    return BadRequest(new { message = "Failed to upload image" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading product image");
                return StatusCode(500, new { message = "Error uploading image file" });
            }

            var product = new Product
            {
                RestaurantId = restaurant.RestaurantId,
                Name = model.Name,
                Description = model.Description,
                Price = (decimal)model.Price,
                ImageUrl = imageUrl,
                StockQuantity = model.StockQuantity,
                Status = "Active",
                FoodCategoryId = model.FoodCategoryId
            };
            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Product created successfully.",
                productId = product.ProductId
            });
        }


        [HttpGet("listsanphamcuahang")]
        public async Task<IActionResult> ListProductRes()
        {
            var restaurantResult = await GetCurrentUserRestaurant();
            if (restaurantResult.Result != null) return restaurantResult.Result;
            var restaurant = restaurantResult.Value;

            var products = await _context.Products
                .Where(p => p.RestaurantId == restaurant.RestaurantId && p.Status == "Active")
                .Select(p => new ProductViewModel
                {
                    ProductId = p.ProductId,
                    Name = p.Name,
                    Description = p.Description,
                    Price = p.Price,
                    ImageUrl = p.ImageUrl,
                    StockQuantity = (int)p.StockQuantity,
                    Status = p.Status,
                    FoodCategoryId = p.FoodCategoryId
                })
                .ToListAsync();

            return Ok(products);
        }

        [HttpPut("update/{productId}")]
        public async Task<IActionResult> UpdateProduct(int productId, [FromForm] ProductUpdateModel model)
        {
            var restaurantResult = await GetCurrentUserRestaurant();
            if (restaurantResult.Result != null) return restaurantResult.Result;
            var restaurant = restaurantResult.Value;

            var product = await _context.Products
                .FirstOrDefaultAsync(p => p.ProductId == productId && p.RestaurantId == restaurant.RestaurantId);

            if (product == null)
                return NotFound(new { message = "Product not found or you don't have permission to modify it" });

            if (model.ImageFile != null)
            {
                if (!string.IsNullOrEmpty(product.ImageUrl))
                    DeleteOldImage(product.ImageUrl);

                var imageUrl = await UploadProductImage(model.ImageFile);
                if (imageUrl == null)
                    return BadRequest(new { message = "Failed to upload image" });

                product.ImageUrl = imageUrl;
            }

            product.Name = model.Name ?? product.Name;
            product.Description = model.Description ?? product.Description;
            product.Price = model.Price ?? product.Price;
            product.StockQuantity = model.StockQuantity ?? product.StockQuantity;
            product.Status = model.Status ?? product.Status;
            product.FoodCategoryId = model.FoodCategoryId ?? product.FoodCategoryId;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Product updated successfully" });
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "Concurrency error updating product {ProductId}", productId);
                return StatusCode(500, new { message = "Error updating product" });
            }
        }

        [HttpGet("listsanphamdaxoa")]
        public async Task<IActionResult> ListDeletedProducts()
        {
            var restaurantResult = await GetCurrentUserRestaurant();
            if (restaurantResult.Result != null) return restaurantResult.Result;
            var restaurant = restaurantResult.Value;

            var products = await _context.Products
                .Where(p => p.RestaurantId == restaurant.RestaurantId && p.Status == "Inactive")
                .Select(p => new ProductViewModel
                {
                    ProductId = p.ProductId,
                    Name = p.Name,
                    Description = p.Description,
                    Price = p.Price,
                    ImageUrl = p.ImageUrl,
                    StockQuantity = (int)p.StockQuantity,
                    Status = p.Status
                })
                .ToListAsync();

            return Ok(products);
        }

        [HttpPut("delete/{id}")]
        public async Task<IActionResult> MarkProductAsDeleted(int id)
        {
            var restaurantResult = await GetCurrentUserRestaurant();
            if (restaurantResult.Result != null) return restaurantResult.Result;
            var restaurant = restaurantResult.Value;

            var product = await _context.Products
                .FirstOrDefaultAsync(p => p.ProductId == id && p.RestaurantId == restaurant.RestaurantId);

            if (product == null)
                return NotFound(new { message = $"Product with ID {id} not found in your restaurant" });

            if (product.Status == "Inactive")
                return BadRequest(new { message = "Product is already inactive" });

            // Kiểm tra xem sản phẩm có đang trong đơn hàng đang xử lý không
            var existingInOrders = await _context.OrderDetails
                .Include(od => od.Order)
                .AnyAsync(od => od.ProductId == id &&
                         (od.Order.Status == "Pending" || od.Order.Status == "Processing" ||
                          od.Order.Status == "Shipping"));

            if (existingInOrders)
            {
                return BadRequest(new
                {
                    message = "Cannot deactivate this product because it's part of ongoing orders"
                });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Sử dụng "Inactive" thay vì "Deleted" vì đây là giá trị được phép
                product.Status = "Inactive";

                var cartItems = await _context.CartItems
                    .Where(ci => ci.ProductId == id)
                    .ToListAsync();

                foreach (var item in cartItems)
                {
                    // Đảm bảo CartItems cũng sử dụng giá trị hợp lệ tùy thuộc vào ràng buộc của nó
                    item.Status = "Deleted"; // Giả sử "Deleted" là hợp lệ cho CartItems
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Marked product {ProductId} as inactive", id);
                return Ok(new { message = $"Product {product.Name} marked as inactive" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error marking product {ProductId} as inactive", id);
                return StatusCode(500, new
                {
                    message = "Error updating product status",
                    details = ex.Message
                });
            }
        }

        [HttpPut("restore/{id}")]
        public async Task<IActionResult> RestoreProduct(int id)
        {
            var restaurantResult = await GetCurrentUserRestaurant();
            if (restaurantResult.Result != null) return restaurantResult.Result;
            var restaurant = restaurantResult.Value;

            var product = await _context.Products
                .FirstOrDefaultAsync(p => p.ProductId == id && p.RestaurantId == restaurant.RestaurantId);

            if (product == null)
                return NotFound(new { message = $"Product with ID {id} not found in your restaurant" });

            if (product.Status == "Active")
                return BadRequest(new { message = "Product is already active" });

            try
            {
                product.Status = "Active";

                var cartItems = await _context.CartItems
                    .Where(ci => ci.ProductId == id && ci.Status == "Inactive")
                    .ToListAsync();

                foreach (var item in cartItems)
                {
                    item.Status = "Active";
                }

                await _context.SaveChangesAsync();
                return Ok(new { message = $"Product {product.Name} restored successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restoring product {ProductId}", id);
                return StatusCode(500, new { message = "Error restoring product" });
            }
        }

        [HttpGet("food-categories")]
        public async Task<IActionResult> GetAllFoodCategories()
        {
            try
            {
                var categories = await _context.FoodCategories
                    .Select(fc => new FoodCategoryDto
                    {
                        FoodCategoryId = fc.FoodCategoryId,
                        Name = fc.Name
                    })
                    .ToListAsync();

                return Ok(categories);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting food categories");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        private async Task<string> UploadProductImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return null;

            var uploadsFolder = Path.Combine(_webHostEnvironment.WebRootPath, "uploads", "products");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }

            return $"/uploads/products/{uniqueFileName}";
        }

        private void DeleteOldImage(string imageUrl)
        {
            if (string.IsNullOrEmpty(imageUrl)) return;

            try
            {
                var imagePath = Path.Combine(_webHostEnvironment.WebRootPath, imageUrl.TrimStart('/'));
                if (System.IO.File.Exists(imagePath))
                    System.IO.File.Delete(imagePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting old image {ImageUrl}", imageUrl);
            }
        }
    }

    public class ProductViewModel
    {
        public int ProductId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string ImageUrl { get; set; }
        public int StockQuantity { get; set; }
        public string Status { get; set; }
        public int? FoodCategoryId { get; set; }
    }

    public class CreateProductRequest
    {
        [Required]
        public string Name { get; set; }

        public string Description { get; set; }

        [Required]
        public double Price { get; set; }

        public IFormFile ImageFile { get; set; }

        [Required]
        public int StockQuantity { get; set; }

        public int FoodCategoryId { get; set; }
    }

    public class ProductUpdateModel
    {
        public string Name { get; set; }
        public string Description { get; set; }

        [Range(0.01, 10000)]
        public decimal? Price { get; set; }

        public IFormFile ImageFile { get; set; }

        [Range(0, 10000)]
        public int? StockQuantity { get; set; }

        public string Status { get; set; }
        public int? FoodCategoryId { get; set; }
    }
}