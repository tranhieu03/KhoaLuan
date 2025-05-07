using KhoaLuan1.Models;
using KhoaLuan1.Service;
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
        private readonly ILogger<CustomerController> _logger;
        private readonly MapService _mapService;

        public CustomerController(KhoaluantestContext context, ILogger<CustomerController> logger, MapService mapService)
        {
            _context = context;
            _logger = logger;
            _mapService = mapService;
        }


        [HttpGet("all-products")]
        public async Task<IActionResult> GetAllProducts(
     int page = 1,
     int pageSize = 10,
     string searchTerm = "",
     int? foodCategoryId = null,
     decimal? minPrice = null,
     decimal? maxPrice = null,
     string sortBy = "name",
     bool sortAscending = true,
     double? latitude = null,  // Thêm tham số vị trí người dùng
     double? longitude = null) // Thêm tham số vị trí người dùng
        {
            try
            {
                // Lấy vị trí người dùng nếu không được cung cấp
                if (!latitude.HasValue || !longitude.HasValue)
                {
                    var userId = HttpContext.Session.GetInt32("UserId");
                    if (userId.HasValue)
                    {
                        var userLocation = await _mapService.GetUserLocation(userId);
                        if (userLocation.latitude != 0 && userLocation.longitude != 0)
                        {
                            latitude = userLocation.latitude;
                            longitude = userLocation.longitude;
                        }
                    }
                }

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

                // Lấy danh sách sản phẩm trước khi áp dụng sắp xếp theo khoảng cách
                var products = await query
                    .Select(p => new
                    {
                        Product = p,
                        RestaurantLatitude = p.Restaurant.Latitude,
                        RestaurantLongitude = p.Restaurant.Longitude
                    })
                    .ToListAsync();

                // Tổng số sản phẩm
                var totalProducts = products.Count;

                // Tính khoảng cách và sắp xếp nếu có vị trí người dùng
                var productsWithDistance = new List<(ProductResponseDto ProductDto, double? Distance)>();

                foreach (var item in products)
                {
                    var productDto = new ProductResponseDto
                    {
                        ProductId = item.Product.ProductId,
                        Name = item.Product.Name,
                        Description = item.Product.Description,
                        Price = item.Product.Price,
                        ImageUrl = FormatImageUrl(item.Product.ImageUrl),
                        StockQuantity = (int)item.Product.StockQuantity,
                        AverageRating = item.Product.AverageRating,
                        Restaurant = new RestaurantInfoDto
                        {
                            RestaurantId = item.Product.Restaurant.RestaurantId,
                            Name = item.Product.Restaurant.Name,
                            Address = item.Product.Restaurant.Address,
                            Latitude = (decimal?)item.RestaurantLatitude,
                            Longitude = (decimal?)item.RestaurantLongitude
                        },
                        FoodCategory = item.Product.FoodCategory != null ? new FoodCategoryDto
                        {
                            FoodCategoryId = item.Product.FoodCategory.FoodCategoryId,
                            Name = item.Product.FoodCategory.Name
                        } : null
                    };

                    double? distance = null;
                    if (latitude.HasValue && longitude.HasValue &&
                        item.RestaurantLatitude.HasValue && item.RestaurantLongitude.HasValue)
                    {
                        // Sử dụng dịch vụ bản đồ để tính khoảng cách
                        distance = await _mapService.CalculateDistanceAsync(
                            latitude.Value, longitude.Value,
                            item.RestaurantLatitude.Value, item.RestaurantLongitude.Value);

                        productDto.Distance = distance; // Thêm khoảng cách vào DTO
                    }

                    productsWithDistance.Add((productDto, distance));
                }

                // Áp dụng sắp xếp
                IEnumerable<ProductResponseDto> sortedProducts;

                if (sortBy.ToLower() == "distance" && latitude.HasValue && longitude.HasValue)
                {
                    // Sắp xếp theo khoảng cách
                    sortedProducts = sortAscending
                        ? productsWithDistance.OrderBy(p => p.Distance ?? double.MaxValue).Select(p => p.ProductDto)
                        : productsWithDistance.OrderByDescending(p => p.Distance ?? double.MinValue).Select(p => p.ProductDto);
                }
                else
                {
                    // Sắp xếp theo các tiêu chí khác
                    switch (sortBy.ToLower())
                    {
                        case "price":
                            sortedProducts = sortAscending
                                ? productsWithDistance.OrderBy(p => p.ProductDto.Price).Select(p => p.ProductDto)
                                : productsWithDistance.OrderByDescending(p => p.ProductDto.Price).Select(p => p.ProductDto);
                            break;
                        case "rating":
                            sortedProducts = sortAscending
                                ? productsWithDistance.OrderBy(p => p.ProductDto.AverageRating).Select(p => p.ProductDto)
                                : productsWithDistance.OrderByDescending(p => p.ProductDto.AverageRating).Select(p => p.ProductDto);
                            break;
                        case "newest":
                            sortedProducts = sortAscending
                                ? productsWithDistance.OrderBy(p => p.ProductDto.ProductId).Select(p => p.ProductDto)
                                : productsWithDistance.OrderByDescending(p => p.ProductDto.ProductId).Select(p => p.ProductDto);
                            break;
                        default: // Default sort by name
                            sortedProducts = sortAscending
                                ? productsWithDistance.OrderBy(p => p.ProductDto.Name).Select(p => p.ProductDto)
                                : productsWithDistance.OrderByDescending(p => p.ProductDto.Name).Select(p => p.ProductDto);
                            break;
                    }
                }

                // Phân trang sau khi đã sắp xếp
                var pagedProducts = sortedProducts
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();

                return Ok(new PaginatedResponse<ProductResponseDto>
                {
                    TotalItems = totalProducts,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling(totalProducts / (double)pageSize),
                    Items = pagedProducts
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách sản phẩm với sắp xếp theo khoảng cách");
                return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi xử lý yêu cầu" });
            }
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
           

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

           

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
           

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

           

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
        public RestaurantInfoDto Restaurant { get; set; }
        public FoodCategoryDto FoodCategory { get; set; }
        public double? Distance { get; set; } // Thêm trường khoảng cách
    }

    public class RestaurantInfoDto
    {
        public int RestaurantId { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string ImageUrl { get; set; }
        public double AverageRating { get; set; }
        public decimal? Latitude { get; set; }  // Thêm vĩ độ
        public decimal? Longitude { get; set; } // Thêm kinh độ
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
