using System;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Threading.Tasks;
using KhoaLuan1.Models;
using KhoaLuan1.Service;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RestaurantController : ControllerBase
    {
        private readonly KhoaluantestContext _context;
        private readonly MapService _mapService;

        public RestaurantController(KhoaluantestContext context, MapService mapService)
        {
            _context = context;
            _mapService = mapService;
        }


        //API TẠo nhà hàng

        [HttpPost("create")]
        public async Task<IActionResult> CreateRestaurant([FromForm] CreateRestaurantRequest model)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null) return Unauthorized(new { message = "User is not logged in." });
            if (role != "seller") return Unauthorized(new { message = "Only sellers can create a restaurant." });

            var existingRestaurant = await _context.Restaurants.FirstOrDefaultAsync(r => r.SellerId == userId.Value);
            if (existingRestaurant != null) return BadRequest(new { message = "You already have a registered restaurant." });

            try
            {
                double lat, lng;

                // Nếu client gửi tọa độ từ bản đồ, sử dụng chúng
                if (model.Latitude.HasValue && model.Longitude.HasValue)
                {
                    lat = model.Latitude.Value;
                    lng = model.Longitude.Value;
                }
                else
                {
                    // Nếu không có tọa độ từ bản đồ, lấy từ địa chỉ
                    if (string.IsNullOrEmpty(model.Address))
                        return BadRequest(new { message = "Address is required if coordinates are not provided." });

                    (lat, lng) = await _mapService.GetCoordinates(model.Address);
                }

                var frontIdPath = await SaveFile(model.FrontIdCardImage);
                var backIdPath = await SaveFile(model.BackIdCardImage);
                var businessLicensePath = await SaveFile(model.BusinessLicenseImage);

                var restaurant = new Restaurant
                {
                    SellerId = userId.Value,
                    Name = model.Name,
                    Address = model.Address,
                    Latitude = lat, 
                    Longitude = lng, 
                    PhoneNumber = model.PhoneNumber,
                    FrontIdCardImage = frontIdPath,
                    BackIdCardImage = backIdPath,
                    BusinessLicenseImage = businessLicensePath,
                    Status = "Pending" // Chờ duyệt từ Admin
                };

                _context.Restaurants.Add(restaurant);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Restaurant created successfully, pending approval.", restaurant });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private async Task<string> SaveFile(IFormFile file)
        {
            if (file == null || file.Length == 0) return null;
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads");
            Directory.CreateDirectory(uploadsFolder);
            var filePath = Path.Combine(uploadsFolder, Guid.NewGuid() + Path.GetExtension(file.FileName));
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }
            return "/uploads/" + Path.GetFileName(filePath);
        }       

            // GET: api/RestaurantCheck/has-restaurant
            [HttpGet("has-restaurant")]
            public async Task<ActionResult<UserRestaurantCheckDto>> CheckCurrentUserHasRestaurant()
            {
                // Lấy userId từ session
                if (!HttpContext.Session.TryGetValue("UserId", out var userIdBytes))
                {
                    return Unauthorized(new UserRestaurantCheckDto
                    {
                        Message = "User chưa đăng nhập"
                    });
                }

            var userId = HttpContext.Session.GetInt32("UserId");

               

                // Tìm nhà hàng của user này
                var restaurant = await _context.Restaurants
                    .FirstOrDefaultAsync(r => r.SellerId == userId);

                return Ok(new UserRestaurantCheckDto
                {
                    HasRestaurant = restaurant != null,
                    RestaurantId = restaurant?.RestaurantId,
                    RestaurantName = restaurant?.Name,
                    RestaurantStatus = restaurant?.Status,
                    Message = restaurant != null ? "User có nhà hàng" : "User chưa có nhà hàng"
                });
            }

        [HttpGet("my-restaurant")]
        public async Task<ActionResult<RestaurantDetailDTO>> GetMyRestaurant()
        {
            // Get userId from session
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "seller")
                return Unauthorized(new { message = "Only sellers can access their restaurant information." });

            // Find the restaurant owned by this seller
            var restaurant = await _context.Restaurants
                .Include(r => r.Seller)
                .FirstOrDefaultAsync(r => r.SellerId == userId.Value);

            if (restaurant == null)
                return NotFound(new { message = "You don't have a registered restaurant." });

            // Map to DTO
            var restaurantDto = new RestaurantDetailDTO
            {
                RestaurantId = restaurant.RestaurantId,
                Name = restaurant.Name,
                Address = restaurant.Address,
                Latitude = restaurant.Latitude,
                Longitude = restaurant.Longitude,
                PhoneNumber = restaurant.PhoneNumber,
                SellerId = restaurant.SellerId,
                Status = restaurant.Status,
                RestaurantImage = restaurant.RestaurantImage,
                SellerName = restaurant.Seller.FullName,
                SellerEmail = restaurant.Seller.Email,
                SellerPhone = restaurant.Seller.PhoneNumber
            };

            return Ok(restaurantDto);
        }

        // PUT: api/Restaurant/update
        [HttpPut("update")]
        public async Task<IActionResult> UpdateRestaurant([FromForm] UpdateRestaurantRequest model)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "seller")
                return Unauthorized(new { message = "Only sellers can update their restaurant information." });

            // Find the restaurant owned by this seller
            var restaurant = await _context.Restaurants
                .FirstOrDefaultAsync(r => r.SellerId == userId.Value);

            if (restaurant == null)
                return NotFound(new { message = "You don't have a registered restaurant." });

            try
            {
                // Update restaurant information
                restaurant.Name = model.Name;

                // Only update address and coordinates if address is provided
                if (!string.IsNullOrEmpty(model.Address))
                {
                    restaurant.Address = model.Address;

                    // Luôn lấy tọa độ từ địa chỉ mới, bỏ qua tọa độ người dùng nhập (nếu có)
                    (double lat, double lng) = await _mapService.GetCoordinates(model.Address);
                    restaurant.Latitude = lat;
                    restaurant.Longitude = lng;
                }

                if (!string.IsNullOrEmpty(model.PhoneNumber))
                {
                    restaurant.PhoneNumber = model.PhoneNumber;
                }

                // Update restaurant image if provided
                if (model.RestaurantImage != null)
                {
                    // Delete the old image if exists
                    if (!string.IsNullOrEmpty(restaurant.RestaurantImage))
                    {
                        var oldImagePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", restaurant.RestaurantImage.TrimStart('/'));
                        if (System.IO.File.Exists(oldImagePath))
                        {
                            System.IO.File.Delete(oldImagePath);
                        }
                    }

                    // Save the new image
                    restaurant.RestaurantImage = await SaveFile(model.RestaurantImage);
                }

                _context.Entry(restaurant).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Restaurant updated successfully.",
                    restaurant = new
                    {
                        restaurant.RestaurantId,
                        restaurant.Name,
                        restaurant.Address,
                        restaurant.Latitude,
                        restaurant.Longitude,
                        restaurant.PhoneNumber,
                        restaurant.Status,
                        restaurant.RestaurantImage
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class CreateRestaurantRequest
    {
        public string Name { get; set; }
        public string Address { get; set; }
        public string PhoneNumber { get; set; }
        public IFormFile FrontIdCardImage { get; set; }
        public IFormFile BackIdCardImage { get; set; }
        public IFormFile BusinessLicenseImage { get; set; }
        public double? Latitude { get; set; }  // Tùy chọn: tọa độ vĩ độ từ bản đồ
        public double? Longitude { get; set; } // Tùy chọn: tọa độ kinh độ từ bản đồ
    }

    public class UserRestaurantCheckDto
    {
        public bool HasRestaurant { get; set; }
        public int? RestaurantId { get; set; }
        public string? RestaurantName { get; set; }
        public string? RestaurantStatus { get; set; }
        public string? Message { get; set; }
    }
    public class RestaurantDetailDTO
    {

        public int RestaurantId { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string PhoneNumber { get; set; }
        public string Description { get; set; }
        public int SellerId { get; set; }
        public string Status { get; set; }
        public string RestaurantImage { get; set; }

        // Include seller information without sensitive data
        public string SellerName { get; set; }
        public string SellerEmail { get; set; }
        public string SellerPhone { get; set; }
    }
    public class UpdateRestaurantRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        public string Address { get; set; }

        [StringLength(15)]
        [RegularExpression(@"^[0-9]+$", ErrorMessage = "Phone number must contain only digits")]
        public string PhoneNumber { get; set; }


        public IFormFile RestaurantImage { get; set; }

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
    // DTO for updating restaurant information
    public class UpdateRestaurantDTO
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        [StringLength(255)]
        public string Address { get; set; }

        [StringLength(15)]
        [RegularExpression(@"^[0-9]+$", ErrorMessage = "Phone number must contain only digits")]
        public string PhoneNumber { get; set; }

        public string Description { get; set; }

        public string RestaurantImage { get; set; }
    }

    // DTO for restaurant list items (summary view)
    public class RestaurantListItemDTO
    {
        public int RestaurantId { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string Status { get; set; }
        public string RestaurantImage { get; set; }
        public string SellerName { get; set; }
    }
}
