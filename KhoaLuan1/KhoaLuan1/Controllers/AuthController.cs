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
        private readonly KhoaluantestContext _context;
        private readonly EmailService _emailService;
        private static Dictionary<string, (RegisterRequest UserInfo, string Otp, DateTime ExpiryTime)> otpStorage = new(); // Lưu OTP tạm thời


        public AuthController(KhoaluantestContext context, EmailService emailService)
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

            // Tạo mã OTP
            string otp = new Random().Next(100000, 999999).ToString();

            // Lưu thông tin đăng ký tạm thời (chưa lưu vào DB)
            otpStorage[model.Email] = (model, otp, DateTime.UtcNow.AddMinutes(10));

            // Gửi email chứa OTP
            string emailBody = $"<h3>Mã OTP để xác nhận tài khoản của bạn:</h3><h2>{otp}</h2><p>Mã này sẽ hết hạn sau 10 phút.</p>";
            bool isSent = await _emailService.SendEmailAsync(model.Email, "Account Verification OTP", emailBody);

            if (!isSent)
                return StatusCode(500, new { message = "Gửi email thất bại." });

            return Ok(new { message = "OTP đã được gửi đến email, vui lòng xác nhận để hoàn tất đăng ký." });
        }


        // API xác nhận OTP
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!otpStorage.ContainsKey(request.Email))
                return BadRequest(new { message = "Email không hợp lệ hoặc OTP đã hết hạn." });

            var (userInfo, otp, expiryTime) = otpStorage[request.Email];

            if (expiryTime < DateTime.UtcNow)
            {
                otpStorage.Remove(request.Email);
                return BadRequest(new { message = "OTP đã hết hạn." });
            }

            if (request.Otp != otp)
                return BadRequest(new { message = "OTP không hợp lệ." });

            // Xác định trạng thái tài khoản
            string status = userInfo.Role == "Customer" ? "Active" : "Pending";

            // Tạo người dùng mới và lưu vào database
            var user = new User
            {
                FullName = userInfo.FullName,
                Email = userInfo.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(userInfo.Password),
                Role = userInfo.Role,
                PhoneNumber = userInfo.PhoneNumber,
                CreatedAt = DateTime.UtcNow,
                Status = status
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Xóa OTP sau khi đăng ký thành công
            otpStorage.Remove(request.Email);

            return Ok(new { message = "Xác nhận OTP thành công, tài khoản đã được tạo." });
        }


        // API Đăng nhập
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == model.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash))
                return Unauthorized(new { message = "Invalid email or password." });

            if (user.Status != "Active")
                return Unauthorized(new { message = "Tài khoản của bạn chưa được xác nhận." });

            HttpContext.Session.SetInt32("UserId", user.UserId);
            HttpContext.Session.SetString("FullName", user.FullName);
            HttpContext.Session.SetString("Email", user.Email);
            HttpContext.Session.SetString("Role", user.Role);
            HttpContext.Session.SetString("PhoneNumber", user.PhoneNumber);

            return Ok(new { message = "Login successful." });
        }

        // api admin xác nhận người dùng

        //[HttpPost("confirm-user/{userId}")]
        //public async Task<IActionResult> ConfirmUser(int userId)
        //{
        //    var user = await _context.Users.FindAsync(userId);
        //    if (user == null)
        //        return NotFound(new { message = "Người dùng không tồn tại." });

        //    if (user.Status == "Active")
        //        return BadRequest(new { message = "Người dùng đã được kích hoạt trước đó." });

        //    user.Status = "Active";
        //    _context.Users.Update(user);
        //    await _context.SaveChangesAsync();

        //    return Ok(new { message = "Người dùng đã được xác nhận thành công." });
        //}



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

        //API Quên mật khẩu

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
                Expiration = DateTime.UtcNow.AddMinutes(10) // OTP hết hạn sau 10 phút
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


        //API XÁc nhận OTP và mật khẩu mới
        [HttpPost("reset-password")]
        public IActionResult ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var resetToken = _context.PasswordResetTokens
                .FirstOrDefault(t => t.Token == request.Token && t.Expiration > DateTime.UtcNow);

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
    public class VerifyOtpRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Otp { get; set; }
    }


}
