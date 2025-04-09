using System;
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
}
