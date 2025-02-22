using KhoaLuan1.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RestaurantController : ControllerBase
    {
        private readonly KhoaLuantestContext _context;
        public RestaurantController(KhoaLuantestContext context)
        {
            _context = context;
        }

        // API Tạo nhà hàng
        [HttpPost("create")]
        public async Task<IActionResult> CreateRestaurant([FromBody] CreateRestaurantRequest model)
        {
            // Kiểm tra trạng thái đăng nhập
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            if (role != "seller")
                return Ok(new { message = "Only sellers can create a restaurant." });

            // Kiểm tra nếu Seller đã có nhà hàng
            var existingRestaurant = await _context.Restaurants.FirstOrDefaultAsync(r => r.SellerId == userId.Value);
            if (existingRestaurant != null)
                return BadRequest(new { message = "You already have a registered restaurant." });

            // Tạo nhà hàng mới
            var restaurant = new Restaurant
            {
                SellerId = userId.Value,
                Name = model.Name,
                Address = model.Address,
                Latitude = model.Latitude,
                Longitude = model.Longitude
            };

            _context.Restaurants.Add(restaurant);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Restaurant created successfully.", restaurantId = restaurant.RestaurantId });
        }
    }
    public class CreateRestaurantRequest
    {
        public string Name { get; set; }
        public string Address { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }
}
