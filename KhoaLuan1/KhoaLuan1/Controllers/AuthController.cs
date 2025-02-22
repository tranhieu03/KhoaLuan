using KhoaLuan1.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Org.BouncyCastle.Asn1.Ocsp;
using System.ComponentModel.DataAnnotations;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly KhoaLuantestContext _context;
        private readonly EmailService _emailService;
        private static Dictionary<string, string> otpStorage = new(); // Lưu OTP tạm thời


        public AuthController(KhoaLuantestContext context, EmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        // API Đăng ký
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Kiểm tra email đã tồn tại
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
                return BadRequest(new { message = "Email is already in use." });

            // Tạo người dùng mới
            var user = new User
            {
                FullName = model.FullName,
                Email = model.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                Role = model.Role,
                PhoneNumber = model.PhoneNumber,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Registration successful." });
        }

        // API Đăng nhập
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest model)
        {
            Console.WriteLine($"Login request received: {model.Email}");
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == model.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash))
                return Unauthorized(new { message = "Invalid email or password." });

            HttpContext.Session.SetInt32("UserId", user.UserId);
            HttpContext.Session.SetString("FullName", user.FullName);
            HttpContext.Session.SetString("Email", user.Email);
            HttpContext.Session.SetString("Role", user.Role);
            HttpContext.Session.SetString("PhoneNumber", user.PhoneNumber);


            return Ok(new { message = "Login successful." });
        }


        // API Kiểm tra trạng thái đăng nhập
        [HttpGet("status")]
        public IActionResult Status()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
                return Unauthorized(new { message = "Not logged in." });

            var fullName = HttpContext.Session.GetString("FullName");
            var email = HttpContext.Session.GetString("Email");
            var role = HttpContext.Session.GetString("Role");
            var phoneNumber = HttpContext.Session.GetString("PhoneNumber");

            return Ok(new
            {
                userId,
                fullName,
                email,
                role,
                phoneNumber
            });
        }

        // API Đăng xuất
        [HttpPost("logout")]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear(); // Xóa toàn bộ dữ liệu trong Session
            return Ok(new { message = "Logout successful." });
        }



        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = _context.Users.FirstOrDefault(u => u.Email == request.Email);
            if (user == null)
                return BadRequest(new { message = "Email không tồn tại." });

            // Tạo mã OTP 6 số
            string otp = new Random().Next(100000, 999999).ToString();

            // Lưu vào bảng PasswordResetToken
            var resetToken = new PasswordResetToken
            {
                UserId = user.UserId,
                Token = otp,
                ExpiryTime = DateTime.UtcNow.AddMinutes(10) // OTP hết hạn sau 10 phút
            };

            _context.PasswordResetTokens.Add(resetToken);
            _context.SaveChanges();

            // Gửi email chứa OTP
            string emailBody = $"<h3>Mã OTP đặt lại mật khẩu của bạn:</h3><h2>{otp}</h2><p>Mã này sẽ hết hạn sau 10 phút.</p>";

            bool isSent = await _emailService.SendEmailAsync(request.Email, "Reset Password OTP", emailBody);

            if (!isSent)
                return StatusCode(500, new { message = "Gửi email thất bại." });

            return Ok(new { message = "Vui lòng kiểm tra email để lấy OTP." });
        }
        [HttpPost("reset-password")]
        public IActionResult ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var resetToken = _context.PasswordResetTokens
                .FirstOrDefault(t => t.Token == request.Token && t.ExpiryTime > DateTime.UtcNow);

            if (resetToken == null)
                return BadRequest(new { message = "OTP không hợp lệ hoặc đã hết hạn." });

            var user = _context.Users.FirstOrDefault(u => u.UserId == resetToken.UserId);
            if (user == null)
                return BadRequest(new { message = "Người dùng không tồn tại." });

            // Cập nhật mật khẩu (hash password trước khi lưu)
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            _context.Users.Update(user);

            // Xóa token sau khi dùng
            _context.PasswordResetTokens.Remove(resetToken);
            _context.SaveChanges();

            return Ok(new { message = "Mật khẩu đã được cập nhật thành công." });
        }


    }
    public class RegisterRequest
    {
        [Required]
        [StringLength(100, MinimumLength = 3)]
        public string FullName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MinLength(6)]
        public string Password { get; set; }

        [Required]
        [RegularExpression("^(Customer|Seller|DeliveryPerson|Admin)$", ErrorMessage = "Invalid role.")]
        public string Role { get; set; }
        public string PhoneNumber { get; set; }
    }

    public class LoginRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }
    }
    

public class ForgotPasswordRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }
    }
    public class ResetPasswordRequest
    {
        [Required]
        public string Token { get; set; }

        [Required]
        [MinLength(6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự.")]
        public string NewPassword { get; set; }
    }

}
