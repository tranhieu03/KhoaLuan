using KhoaLuan1.Hubs;
using KhoaLuan1.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace KhoaLuan1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewController : ControllerBase
    {
        private readonly KhoaluantestContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;

        public ReviewController(KhoaluantestContext context, IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        // API lấy danh sách sản phẩm trong đơn hàng chưa được đánh giá
        [HttpGet("unreviewed-products/{orderId}")]
        public async Task<IActionResult> GetUnreviewedProducts(int orderId)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null || role != "Customer")
            {
                return Unauthorized(new { message = "Bạn cần đăng nhập với vai trò khách hàng." });
            }

            // Kiểm tra đơn hàng thuộc về user này và đã hoàn thành
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.OrderId == orderId && o.UserId == userId && o.Status == "Completed");

            if (order == null)
            {
                return NotFound(new { message = "Đơn hàng không tồn tại hoặc chưa hoàn thành." });
            }

            // Lấy danh sách sản phẩm chưa được đánh giá
            var unreviewedProducts = await _context.OrderDetails
                .Where(od => od.OrderId == orderId &&
                      !_context.ProductReviews.Any(pr => pr.OrderDetailId == od.OrderDetailId))
                .Include(od => od.Product)
                .Select(od => new
                {
                    OrderDetailId = od.OrderDetailId,
                    ProductId = od.ProductId,
                    ProductName = od.Product.Name,
                    ProductImage = od.Product.ImageUrl,
                    Quantity = od.Quantity,
                    Price = od.Price
                })
                .ToListAsync();

            return Ok(unreviewedProducts);
        }

        // API đánh giá từng sản phẩm trong đơn hàng
        [HttpPost("ReviewProduct")]
        public async Task<IActionResult> ReviewProduct([FromBody] ProductReviewRequest request)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null || role != "Customer")
            {
                return Unauthorized(new { message = "Bạn cần đăng nhập với vai trò khách hàng để đánh giá sản phẩm." });
            }

            // Kiểm tra order detail có tồn tại và thuộc về user này không
            var orderDetail = await _context.OrderDetails
                .Include(od => od.Order)
                .Include(od => od.Product)
                .FirstOrDefaultAsync(od => od.OrderDetailId == request.OrderDetailId && od.Order.UserId == userId);

            if (orderDetail == null)
            {
                return NotFound(new { message = "Chi tiết đơn hàng không tồn tại hoặc không thuộc về bạn." });
            }

            // Kiểm tra đơn hàng đã hoàn thành chưa
            if (orderDetail.Order.Status != "Completed")
            {
                return BadRequest(new { message = "Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng hoàn thành." });
            }

            // Kiểm tra đã đánh giá sản phẩm này chưa
            var existingReview = await _context.ProductReviews
                .FirstOrDefaultAsync(pr => pr.OrderDetailId == request.OrderDetailId && pr.UserId == userId);

            if (existingReview != null)
            {
                return BadRequest(new { message = "Bạn đã đánh giá sản phẩm này rồi." });
            }

            // Tạo đánh giá mới
            var productReview = new ProductReview
            {
                OrderDetailId = request.OrderDetailId,
                UserId = userId.Value,
                Rating = request.Rating,
                Comment = request.Comment,
                CreatedAt = DateTime.UtcNow
            };

            _context.ProductReviews.Add(productReview);
            await _context.SaveChangesAsync();

            // Cập nhật rating trung bình cho sản phẩm
            await UpdateProductAverageRating(orderDetail.ProductId);

            // Kiểm tra xem đã đánh giá hết tất cả sản phẩm trong đơn hàng chưa
            var allProductsReviewed = await CheckAllProductsReviewed(orderDetail.OrderId);

            return Ok(new
            {
                message = "Đánh giá sản phẩm thành công.",
                allProductsReviewed = allProductsReviewed
            });
        }

        // API đánh giá tài xế (chỉ gọi sau khi đã đánh giá hết sản phẩm)
        [HttpPost("ReviewDelivery")]
        public async Task<IActionResult> ReviewDelivery([FromBody] DeliveryReviewRequest request)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var role = HttpContext.Session.GetString("Role");

            if (userId == null || role != "Customer")
            {
                return Unauthorized(new { message = "Bạn cần đăng nhập với vai trò khách hàng để đánh giá tài xế." });
            }

            // Kiểm tra đơn hàng có tồn tại và thuộc về user này không
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.OrderId == request.OrderId && o.UserId == userId);

            if (order == null)
            {
                return NotFound(new { message = "Đơn hàng không tồn tại hoặc không thuộc về bạn." });
            }

            // Kiểm tra đơn hàng đã hoàn thành chưa
            if (order.Status != "Completed")
            {
                return BadRequest(new { message = "Bạn chỉ có thể đánh giá tài xế sau khi đơn hàng hoàn thành." });
            }

            // Kiểm tra đã đánh giá tất cả sản phẩm chưa
            var allProductsReviewed = await CheckAllProductsReviewed(order.OrderId);
            if (!allProductsReviewed)
            {
                return BadRequest(new { message = "Vui lòng đánh giá tất cả sản phẩm trước khi đánh giá tài xế." });
            }

            // Kiểm tra đã đánh giá tài xế này chưa
            var existingReview = await _context.Reviews
                .FirstOrDefaultAsync(r => r.OrderId == request.OrderId && r.UserId == userId);

            if (existingReview != null)
            {
                return BadRequest(new { message = "Bạn đã đánh giá tài xế này rồi." });
            }

            // Kiểm tra có tài xế không
            if (order.DeliveryPersonId == null)
            {
                return BadRequest(new { message = "Đơn hàng này không có tài xế để đánh giá." });
            }

            // Tạo đánh giá mới
            var review = new Review
            {
                OrderId = request.OrderId,
                UserId = userId.Value,
                Rating = request.Rating,
                Comment = request.Comment,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            // Cập nhật rating trung bình cho tài xế
            await UpdateDeliveryPersonAverageRating(order.DeliveryPersonId.Value);

            // Thông báo cho tài xế
            var notification = new Notification
            {
                UserId = order.DeliveryPersonId.Value,
                Message = $"Khách hàng đã đánh giá bạn {request.Rating} sao cho đơn hàng #{order.OrderId}",
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Gửi thông báo qua SignalR
            await _hubContext.Clients.User(order.DeliveryPersonId.ToString())
                .SendAsync("ReceiveNotification", notification.Message);

            return Ok(new { message = "Đánh giá tài xế thành công." });
        }

        private async Task<bool> CheckAllProductsReviewed(int orderId)
        {
            var totalProducts = await _context.OrderDetails
                .CountAsync(od => od.OrderId == orderId);

            var reviewedProducts = await _context.OrderDetails
                .CountAsync(od => od.OrderId == orderId &&
                      _context.ProductReviews.Any(pr => pr.OrderDetailId == od.OrderDetailId));

            return totalProducts == reviewedProducts;
        }

        private async Task UpdateProductAverageRating(int productId)
        {
            var averageRating = await _context.ProductReviews
                .Where(pr => pr.OrderDetail.ProductId == productId)
                .AverageAsync(pr => (double?)pr.Rating) ?? 0;

            var product = await _context.Products.FindAsync(productId);
            if (product != null)
            {
                product.AverageRating = (decimal)averageRating;
                await _context.SaveChangesAsync();
            }
        }

        private async Task UpdateDeliveryPersonAverageRating(int deliveryPersonId)
        {
            var averageRating = await _context.Reviews
                .Where(r => r.Order.DeliveryPersonId == deliveryPersonId)
                .AverageAsync(r => (double?)r.Rating) ?? 0;

            var deliveryPerson = await _context.Users.FindAsync(deliveryPersonId);
            if (deliveryPerson != null)
            {
                deliveryPerson.AverageRating = (decimal)averageRating;
                await _context.SaveChangesAsync();
            }
        }
    }

    // DTOs
    public class ProductReviewRequest
    {
        [Required]
        public int OrderDetailId { get; set; }

        [Required]
        [Range(1, 5, ErrorMessage = "Rating phải từ 1 đến 5 sao.")]
        public int Rating { get; set; }

        [MaxLength(1000, ErrorMessage = "Comment không được vượt quá 1000 ký tự.")]
        public string? Comment { get; set; }
    }

    public class DeliveryReviewRequest
    {
        [Required]
        public int OrderId { get; set; }

        [Required]
        [Range(1, 5, ErrorMessage = "Rating phải từ 1 đến 5 sao.")]
        public int Rating { get; set; }

        [MaxLength(1000, ErrorMessage = "Comment không được vượt quá 1000 ký tự.")]
        public string? Comment { get; set; }
    }
}
