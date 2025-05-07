using KhoaLuan1.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly KhoaluantestContext _context;

        public AccountController(KhoaluantestContext context)
        {
            _context = context;
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetCurrentUserProfile()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
            {
                return Unauthorized(new { message = "User is not logged in." });
            }

            var user = await _context.Users
                .Where(u => u.UserId == userId)
                .Select(u => new
                {
                    u.UserId,
                    u.Email,
                    u.FullName,
                    u.PhoneNumber,
                    u.Address,
                    u.CreatedAt,
                    u.Role,
                    // Thông tin bổ sung cho DeliveryPerson
                    AverageRating = u.Role == "DeliveryPerson" ? u.AverageRating : (decimal?)null,
                    VehicleNumber = u.Role == "DeliveryPerson" ? u.VehicleNumber : null,
                    FrontIdCardImage = u.Role == "DeliveryPerson" ? u.FrontIdCardImage : null,
                    BackIdCardImage = u.Role == "DeliveryPerson" ? u.BackIdCardImage : null
                })
                .FirstOrDefaultAsync();

            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            return Ok(user);
        }

        [HttpPut("update-profile")]
        public async Task<IActionResult> UpdateUserProfile([FromBody] UpdateUserProfileDto updateDto)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
            {
                return Unauthorized(new { message = "User is not logged in." });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            // Cập nhật các trường cơ bản
            user.FullName = updateDto.FullName ?? user.FullName;
            user.PhoneNumber = updateDto.PhoneNumber ?? user.PhoneNumber;
            user.Address = updateDto.Address ?? user.Address;

            // Cập nhật thông tin riêng cho DeliveryPerson
            if (user.Role == "DeliveryPerson")
            {
                user.VehicleNumber = updateDto.VehicleNumber ?? user.VehicleNumber;
            }

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Profile updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while updating the profile." });
            }
        }


        [HttpGet("my-restaurant")]
        public async Task<IActionResult> GetMyRestaurant()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
            {
                return Unauthorized(new { message = "User is not logged in." });
            }

            var restaurant = await _context.Restaurants
                .Where(r => r.SellerId == userId)
                .Select(r => new
                {
                    r.RestaurantId,
                    r.Name,
                    r.Address,
                    r.PhoneNumber,
                    r.Status,
                    r.FrontIdCardImage,
                    r.BackIdCardImage,
                    r.BusinessLicenseImage,
                    ProductsCount = r.Products.Count(p => p.Status == "Active")
                })
                .FirstOrDefaultAsync();

            if (restaurant == null)
            {
                return NotFound(new { message = "Restaurant not found or you are not the owner." });
            }

            return Ok(restaurant);
        }

        [HttpPut("update-info")]
        public async Task<IActionResult> UpdateRestaurantInfo([FromBody] UpdateRestaurantInfoDto updateDto)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
            {
                return Unauthorized(new { message = "User is not logged in." });
            }

            var restaurant = await _context.Restaurants
                .FirstOrDefaultAsync(r => r.SellerId == userId);

            if (restaurant == null)
            {
                return NotFound(new { message = "Restaurant not found or you are not the owner." });
            }

            // Cập nhật thông tin cơ bản
            restaurant.Name = updateDto.Name ?? restaurant.Name;
            restaurant.Address = updateDto.Address ?? restaurant.Address;
            restaurant.PhoneNumber = updateDto.PhoneNumber ?? restaurant.PhoneNumber;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Restaurant information updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while updating restaurant information." });
            }
        }

        
    }

    public class UpdateUserProfileDto
    {
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string? VehicleNumber { get; set; } // Cho DeliveryPerson
    }

    public class UpdateRestaurantInfoDto
    {
        public string? Name { get; set; }
        public string? Address { get; set; }
        public string? PhoneNumber { get; set; }
    }
}
