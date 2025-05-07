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

        public AuthController(KhoaluantestContext context, EmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        // API Đăng ký
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromForm] RegisterRequestWithFiles model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Kiểm tra role hợp lệ (chỉ cho phép Customer, Seller, DeliveryPerson)
            string[] validRoles = { "Customer", "seller", "DeliveryPerson" };
            if (!validRoles.Contains(model.Role))
                return BadRequest(new { message = "Role không hợp lệ. Chỉ chấp nhận Customer, seller hoặc DeliveryPerson." });

            // Kiểm tra email đã tồn tại
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
                return BadRequest(new { message = "Email đã được sử dụng." });

            // Kiểm tra số lần gửi email còn lại
            int remainingAttempts = await _emailService.GetRemainingEmailAttemptsAsync(model.Email);
            if (remainingAttempts <= 0)
            {
                return BadRequest(new { message = "Bạn đã gửi quá nhiều email đến địa chỉ này. Vui lòng thử lại sau 24 giờ." });
            }

            // Kiểm tra thông tin bắt buộc cho DeliveryPerson
            if (model.Role == "DeliveryPerson")
            {
                if (model.FrontIdCardImageFile == null || model.BackIdCardImageFile == null || string.IsNullOrEmpty(model.VehicleNumber))
                {
                    return BadRequest(new { message = "Người giao hàng cần phải cung cấp hình ảnh CCCD mặt trước, mặt sau và biển số xe." });
                }
            }

            try
            {
                // Khởi tạo các đường dẫn ảnh
                string frontIdCardImagePath = null;
                string backIdCardImagePath = null;

                // Xử lý upload ảnh nếu là DeliveryPerson
                if (model.Role == "DeliveryPerson")
                {
                    // Tạo thư mục lưu ảnh nếu chưa tồn tại
                    string uploadDirectory = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "idcards");
                    if (!Directory.Exists(uploadDirectory))
                    {
                        Directory.CreateDirectory(uploadDirectory);
                    }

                    // Xử lý ảnh CCCD mặt trước
                    if (model.FrontIdCardImageFile != null && model.FrontIdCardImageFile.Length > 0)
                    {
                        // Tạo tên file độc nhất
                        string uniqueFileName = Guid.NewGuid().ToString() + "_" + model.FrontIdCardImageFile.FileName;
                        string filePath = Path.Combine(uploadDirectory, uniqueFileName);

                        // Lưu file vào thư mục
                        using (var stream = new FileStream(filePath, FileMode.Create))
                        {
                            await model.FrontIdCardImageFile.CopyToAsync(stream);
                        }

                        // Lưu đường dẫn tương đối vào database
                        frontIdCardImagePath = "/uploads/idcards/" + uniqueFileName;
                    }

                    // Xử lý ảnh CCCD mặt sau
                    if (model.BackIdCardImageFile != null && model.BackIdCardImageFile.Length > 0)
                    {
                        // Tạo tên file độc nhất
                        string uniqueFileName = Guid.NewGuid().ToString() + "_" + model.BackIdCardImageFile.FileName;
                        string filePath = Path.Combine(uploadDirectory, uniqueFileName);

                        // Lưu file vào thư mục
                        using (var stream = new FileStream(filePath, FileMode.Create))
                        {
                            await model.BackIdCardImageFile.CopyToAsync(stream);
                        }

                        // Lưu đường dẫn tương đối vào database
                        backIdCardImagePath = "/uploads/idcards/" + uniqueFileName;
                    }
                }

                // Xác định trạng thái tài khoản ban đầu là Inactive
                var user = new User
                {
                    FullName = model.FullName,
                    Email = model.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                    Role = model.Role,
                    PhoneNumber = model.PhoneNumber,
                    CreatedAt = DateTime.UtcNow,
                    Status = "Inactive",
                    // Thêm các trường mới
                    FrontIdCardImage = frontIdCardImagePath,
                    BackIdCardImage = backIdCardImagePath,
                    VehicleNumber = model.VehicleNumber,
                    OriginRole= "Customer"

                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Xử lý OTP
                // Xóa token cũ nếu có
                var oldTokens = await _context.PasswordResetTokens.Where(t => t.UserId == user.UserId).ToListAsync();
                if (oldTokens.Any())
                {
                    _context.PasswordResetTokens.RemoveRange(oldTokens);
                }

                // Tạo mã OTP 6 số
                string otp = new Random().Next(100000, 999999).ToString();

                // Lưu vào bảng PasswordResetToken
                var resetToken = new PasswordResetToken
                {
                    UserId = user.UserId,
                    Token = otp,
                    Expiration = DateTime.UtcNow.AddSeconds(60) // OTP hết hạn sau 60 giây
                };

                _context.PasswordResetTokens.Add(resetToken);
                await _context.SaveChangesAsync();

                // Gửi email chứa OTP
                string emailBody = $"<h3>Mã OTP để xác nhận tài khoản của bạn:</h3><h2>{otp}</h2><p>Mã này sẽ hết hạn sau 60 giây.</p>";

                bool isSent = await _emailService.SendEmailAsync(user.Email, "Account Verification OTP", emailBody);

                if (!isSent)
                {
                    // Nếu gửi email thất bại, xóa user và token và hình ảnh đã upload
                    _context.PasswordResetTokens.Remove(resetToken);
                    _context.Users.Remove(user);
                    await _context.SaveChangesAsync();

                    // Xóa hình ảnh nếu có
                    if (!string.IsNullOrEmpty(frontIdCardImagePath))
                    {
                        string fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", frontIdCardImagePath.TrimStart('/'));
                        if (System.IO.File.Exists(fullPath))
                        {
                            System.IO.File.Delete(fullPath);
                        }
                    }

                    if (!string.IsNullOrEmpty(backIdCardImagePath))
                    {
                        string fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", backIdCardImagePath.TrimStart('/'));
                        if (System.IO.File.Exists(fullPath))
                        {
                            System.IO.File.Delete(fullPath);
                        }
                    }

                    return StatusCode(500, new { message = "Gửi email thất bại. Vui lòng thử lại sau." });
                }

                return Ok(new
                {
                    message = "Đăng ký thành công! OTP đã được gửi đến email, vui lòng xác nhận để hoàn tất đăng ký. Mã OTP có hiệu lực trong 60 giây.",
                    userId = user.UserId,
                    role = user.Role,
                    remainingAttempts = remainingAttempts - 1 // Số lần gửi còn lại sau khi gửi thành công
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Registration error: {ex.Message}");
                return StatusCode(500, new { message = "Đã xảy ra lỗi trong quá trình đăng ký: " + ex.Message });
            }
        }

        // API xác nhận OTP không cần email
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpOnlyRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // Tìm token dựa trên OTP và thời hạn
                var resetToken = await _context.PasswordResetTokens
                    .FirstOrDefaultAsync(t => t.Token == request.Otp && t.Expiration > DateTime.UtcNow);

                if (resetToken == null)
                    return BadRequest(new { message = "OTP không hợp lệ hoặc đã hết hạn." });

                // Tìm user dựa trên userId từ token
                var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == resetToken.UserId);
                if (user == null)
                    return NotFound(new { message = "Không tìm thấy người dùng liên kết với OTP này." });

                // Kích hoạt tài khoản
                user.Status = "Active";

                // Xóa token đã sử dụng
                _context.PasswordResetTokens.Remove(resetToken);

                // Reset số lần gửi email khi xác thực thành công
                await _emailService.ResetEmailSendCountAsync(user.Email);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Xác nhận OTP thành công, tài khoản đã được kích hoạt.",
                    email = user.Email,
                    role = user.Role
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"OTP verification error: {ex.Message}");
                return StatusCode(500, new { message = "Đã xảy ra lỗi trong quá trình xác thực OTP: " + ex.Message });
            }
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
            HttpContext.Session.SetString("OriginRole", user.OriginRole);

            return Ok(new { message = "Login successful." });
            }
        [HttpPost("resend-otp")]
        public async Task<IActionResult> ResendOtp([FromBody] ResendOtpRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null)
                return BadRequest(new { message = "Email không tồn tại." });

            // Kiểm tra trạng thái tài khoản
            if (user.Status == "Active")
                return BadRequest(new { message = "Tài khoản đã được kích hoạt." });

            // Kiểm tra số lần gửi email còn lại
            int remainingAttempts = await _emailService.GetRemainingEmailAttemptsAsync(request.Email);
            if (remainingAttempts <= 0)
            {
                return BadRequest(new { message = "Bạn đã gửi quá nhiều email đến địa chỉ này. Vui lòng thử lại sau 24 giờ." });
            }

            // Xóa token cũ nếu có
            var oldTokens = await _context.PasswordResetTokens.Where(t => t.UserId == user.UserId).ToListAsync();
            if (oldTokens.Any())
            {
                _context.PasswordResetTokens.RemoveRange(oldTokens);
            }

            // Tạo mã OTP 6 số mới
            string otp = new Random().Next(100000, 999999).ToString();

            // Lưu vào bảng PasswordResetToken
            var resetToken = new PasswordResetToken
            {
                UserId = user.UserId,
                Token = otp,
                Expiration = DateTime.UtcNow.AddSeconds(60) // OTP hết hạn sau 60 giây
            };

            _context.PasswordResetTokens.Add(resetToken);
            await _context.SaveChangesAsync();

            // Gửi email chứa OTP
            string emailBody = $"<h3>Mã OTP để xác nhận tài khoản của bạn:</h3><h2>{otp}</h2><p>Mã này sẽ hết hạn sau 60 giây.</p>";
            bool isSent = await _emailService.SendEmailAsync(request.Email, "Account Verification OTP", emailBody);

            if (!isSent)
            {
                return StatusCode(500, new { message = "Gửi email thất bại. Vui lòng thử lại sau." });
            }

            return Ok(new
            {
                message = "OTP mới đã được gửi đến email. Mã OTP có hiệu lực trong 60 giây.",
                remainingAttempts = remainingAttempts - 1
            });
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
            var originRole = HttpContext.Session.GetString("OriginRole");

            return Ok(new
            {
                userId,
                fullName,
                email,
                role,
                phoneNumber,
                originRole
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

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null)
                return BadRequest(new { message = "Email không tồn tại." });

            // Kiểm tra số lần gửi email còn lại
            int remainingAttempts = await _emailService.GetRemainingEmailAttemptsAsync(request.Email);
            if (remainingAttempts <= 0)
            {
                return BadRequest(new { message = "Bạn đã gửi quá nhiều email đến địa chỉ này. Vui lòng thử lại sau 24 giờ." });
            }

            // Xóa token cũ nếu có
            var oldTokens = await _context.PasswordResetTokens.Where(t => t.UserId == user.UserId).ToListAsync();
            if (oldTokens.Any())
            {
                _context.PasswordResetTokens.RemoveRange(oldTokens);
            }

            // Tạo mã OTP 6 số
            string otp = new Random().Next(100000, 999999).ToString();

            // Lưu vào bảng PasswordResetToken - đổi thành 60 giây
            var resetToken = new PasswordResetToken
            {
                UserId = user.UserId,
                Token = otp,
                Expiration = DateTime.UtcNow.AddSeconds(60) // OTP hết hạn sau 60 giây
            };

            _context.PasswordResetTokens.Add(resetToken);
            await _context.SaveChangesAsync();

            // Gửi email chứa OTP
            string emailBody = $"<h3>Mã OTP đặt lại mật khẩu của bạn:</h3><h2>{otp}</h2><p>Mã này sẽ hết hạn sau 60 giây.</p>";
            bool isSent = await _emailService.SendEmailAsync(request.Email, "Reset Password OTP", emailBody);

            if (!isSent)
            {
                return StatusCode(500, new { message = "Gửi email thất bại." });
            }

            return Ok(new
            {
                message = "Vui lòng kiểm tra email để lấy OTP. Mã OTP có hiệu lực trong 60 giây.",
                remainingAttempts = remainingAttempts - 1
            });
        }

        //API Xác nhận OTP và mật khẩu mới
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var resetToken = await _context.PasswordResetTokens
                .FirstOrDefaultAsync(t => t.Token == request.Token && t.Expiration > DateTime.UtcNow);

            if (resetToken == null)
                return BadRequest(new { message = "OTP không hợp lệ hoặc đã hết hạn." });

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == resetToken.UserId);
            if (user == null)
                return BadRequest(new { message = "Người dùng không tồn tại." });

            // Cập nhật mật khẩu (hash password trước khi lưu)
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            _context.Users.Update(user);

            // Xóa token sau khi dùng
            _context.PasswordResetTokens.Remove(resetToken);

            // Reset số lần gửi email khi reset mật khẩu thành công
            await _emailService.ResetEmailSendCountAsync(user.Email);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Mật khẩu đã được cập nhật thành công." });
        }
    }

    public class RegisterRequestWithFiles
    {
        [Required]
        public string FullName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MinLength(6)]
        public string Password { get; set; }

        [Required]
        public string Role { get; set; }

        [Required]
        [Phone]
        public string PhoneNumber { get; set; }

        // Make these fields optional by not having Required attribute
        public IFormFile? FrontIdCardImageFile { get; set; }
        public IFormFile? BackIdCardImageFile { get; set; }
        public string? VehicleNumber { get; set; }
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
        [RegularExpression("^(Customer|seller|DeliveryPerson|Admin)$", ErrorMessage = "Invalid role.")]
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

    // Lớp VerifyOtpRequest cũ (đã được thay thế bởi VerifyOtpOnlyRequest)
    public class VerifyOtpRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Otp { get; set; }
    }

    // Lớp yêu cầu mới chỉ cần OTP
    public class VerifyOtpOnlyRequest
    {
        [Required]
        public string Otp { get; set; }
    }
    public class ResendOtpRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }
    }
}