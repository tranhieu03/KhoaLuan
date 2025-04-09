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
        private readonly KhoaluantestContext _context;

        public CustomerController(KhoaluantestContext context)
        {
            _context = context;
        }


        //API Xem toàn bộ danh sách món ăn
        [HttpGet("all-products")]
        public async Task<IActionResult> GetAllProducts(
     int page = 1,
     int pageSize = 10,
     string searchTerm = "",
     int? foodCategoryId = null, // Đổi thành foodCategoryId
     decimal? minPrice = null,
     decimal? maxPrice = null,
     string sortBy = "name",
     bool sortAscending = true)
        {
            var query = _context.Products
                .Include(p => p.Restaurant)
                .Include(p => p.FoodCategory)
                .Where(p => p.Status == "Active");

            if (!string.IsNullOrEmpty(searchTerm))
            {
                query = query.Where(p =>
                    p.Name.Contains(searchTerm) ||
                    p.Description.Contains(searchTerm));
            }

            // Lọc theo ID thay vì tên
            if (foodCategoryId.HasValue)
            {
                query = query.Where(p => p.FoodCategoryId == foodCategoryId.Value);
            }

            if (minPrice.HasValue)
            {
                query = query.Where(p => p.Price >= minPrice);
            }

            if (maxPrice.HasValue)
            {
                query = query.Where(p => p.Price <= maxPrice);
            }

            // Apply sorting
            switch (sortBy.ToLower())
            {
                case "price":
                    query = sortAscending ?
                        query.OrderBy(p => p.Price) :
                        query.OrderByDescending(p => p.Price);
                    break;
                case "rating":
                    query = sortAscending ?
                        query.OrderBy(p => p.AverageRating) :
                        query.OrderByDescending(p => p.AverageRating);
                    break;
                case "newest":
                    query = sortAscending ?
                        query.OrderBy(p => p.ProductId) :
                        query.OrderByDescending(p => p.ProductId);
                    break;
                default: // Default sort by name
                    query = sortAscending ?
                        query.OrderBy(p => p.Name) :
                        query.OrderByDescending(p => p.Name);
                    break;
            }

            // Lấy tổng số sản phẩm trước
            var totalProducts = await query.CountAsync();

            // Lấy danh sách sản phẩm theo trang nhưng KHÔNG xử lý URL trong truy vấn
            var products = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new ProductResponseDto
                {
                    ProductId = p.ProductId,
                    Name = p.Name,
                    Description = p.Description,
                    Price = p.Price,
                    ImageUrl = p.ImageUrl, // Không xử lý URL trong LINQ query
                    StockQuantity = (int)p.StockQuantity,
                    AverageRating = p.AverageRating,
                    Restaurant = new RestaurantInfoDto
                    {
                        RestaurantId = p.Restaurant.RestaurantId,
                        Name = p.Restaurant.Name,
                        Address = p.Restaurant.Address
                    },
                    FoodCategory = p.FoodCategory != null ? new FoodCategoryDto
                    {
                        FoodCategoryId = p.FoodCategory.FoodCategoryId,
                        Name = p.FoodCategory.Name
                    } : null
                })
                .ToListAsync();

            // Xử lý URL sau khi đã lấy dữ liệu từ database
            foreach (var product in products)
            {
                product.ImageUrl = FormatImageUrl(product.ImageUrl);
            }

            return Ok(new PaginatedResponse<ProductResponseDto>
            {
                TotalItems = totalProducts,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalProducts / (double)pageSize),
                Items = products
            });
        }

        // Helper method to format image URLs correctly
        private static string FormatImageUrl(string imageUrl)
        {
            if (string.IsNullOrEmpty(imageUrl))
                return null;

            // Check if it's already a full URL
            if (imageUrl.StartsWith("http://") || imageUrl.StartsWith("https://"))
                return imageUrl;

            // Check if it's a local path starting with /uploads
            if (imageUrl.StartsWith("/uploads"))
                return $"https://localhost:44308{imageUrl}";

            // Add the base path for local uploads
            return $"https://localhost:44308/uploads/{imageUrl.TrimStart('/')}";
        }

        //API Xem chi tiết cửa hàng

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
                    p.StockQuantity,
                    p.AverageRating
                })
                .ToListAsync();

            return Ok(products);
        }


        [HttpGet("product-detail/{productId}")]
        public async Task<IActionResult> GetProductDetail(int productId)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "Customer")
                return BadRequest(new { message = "Only customers are allowed to view product details." });

            var product = await _context.Products
                .Include(p => p.Restaurant)
                .Include(p => p.FoodCategory)
                .FirstOrDefaultAsync(p => p.ProductId == productId);

            if (product == null || product.Status != "Active")
                return NotFound(new { message = "Product not found or inactive." });

            var reviews = await _context.ProductReviews
                .Include(pr => pr.User)
                .Include(pr => pr.OrderDetail)
                    .ThenInclude(od => od.Order)
                .Where(pr => pr.OrderDetail.ProductId == productId)
                .OrderByDescending(pr => pr.CreatedAt)
                .Take(10)
                .Select(pr => new
                {
                    pr.ProductReviewId,
                    pr.Rating,
                    pr.Comment,
                    pr.CreatedAt,
                    User = new
                    {
                        pr.User.UserId,
                        pr.User.FullName
                    },
                    OrderDate = pr.OrderDetail.Order.OrderDate
                })
                .ToListAsync();

            var result = new
            {
                ProductId = product.ProductId,
                Name = product.Name,
                Description = product.Description,
                Price = product.Price,
                ImageUrl = product.ImageUrl,
                StockQuantity = product.StockQuantity,
                AverageRating = product.AverageRating,
                FoodCategory = new
                {
                    product.FoodCategory?.FoodCategoryId,
                    product.FoodCategory?.Name
                },
                Restaurant = new
                {
                    product.Restaurant.RestaurantId,
                    product.Restaurant.Name,
                    product.Restaurant.Address,
                    product.Restaurant.PhoneNumber
                },
                Reviews = reviews,
                ReviewStatistics = new
                {
                    TotalReviews = await _context.ProductReviews
                        .CountAsync(pr => pr.OrderDetail.ProductId == productId),
                    RatingDistribution = new
                    {
                        FiveStar = await _context.ProductReviews
                            .CountAsync(pr => pr.OrderDetail.ProductId == productId && pr.Rating == 5),
                        FourStar = await _context.ProductReviews
                            .CountAsync(pr => pr.OrderDetail.ProductId == productId && pr.Rating == 4),
                        ThreeStar = await _context.ProductReviews
                            .CountAsync(pr => pr.OrderDetail.ProductId == productId && pr.Rating == 3),
                        TwoStar = await _context.ProductReviews
                            .CountAsync(pr => pr.OrderDetail.ProductId == productId && pr.Rating == 2),
                        OneStar = await _context.ProductReviews
                            .CountAsync(pr => pr.OrderDetail.ProductId == productId && pr.Rating == 1)
                    }
                }
            };

            return Ok(result);
        }

        //API Xem danh sách các order của từng khách hàng

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


    public class ProductResponseDto
    {
        public int ProductId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string ImageUrl { get; set; }
        public int StockQuantity { get; set; }
        public decimal? AverageRating { get; set; }
        public int ReviewCount { get; set; }
        public RestaurantInfoDto Restaurant { get; set; }
        public FoodCategoryDto FoodCategory { get; set; }
    }

    public class RestaurantInfoDto
    {
        public int RestaurantId { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string ImageUrl { get; set; }
        public double AverageRating { get; set; }
    }

    public class FoodCategoryDto
    {
        public int FoodCategoryId { get; set; }
        public string Name { get; set; }
    }

    public class PaginatedResponse<T>
    {
        public int TotalItems { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public List<T> Items { get; set; }
    }
}
