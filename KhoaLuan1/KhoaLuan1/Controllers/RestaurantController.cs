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
                var (lat, lng) = await _mapService.GetCoordinates(model.Address);

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
                    PhoneNumber= model.PhoneNumber,
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
    }

    public class CreateRestaurantRequest
    {
        public string Name { get; set; }
        public string Address { get; set; }
        public string PhoneNumber { get; set; }
        public IFormFile FrontIdCardImage { get; set; }
        public IFormFile BackIdCardImage { get; set; }
        public IFormFile BusinessLicenseImage { get; set; }
    }
}
