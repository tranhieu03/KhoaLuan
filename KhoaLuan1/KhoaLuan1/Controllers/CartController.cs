using KhoaLuan1.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CartController : ControllerBase
    {
        private readonly KhoaluantestContext _context;

        public CartController(KhoaluantestContext context)
        {
            _context = context;
        }

        //API Danh sách sản phẩm trong giỏ hàng
        [HttpGet("Cart_items")]
        public async Task<IActionResult> GetCartItems()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var phoneNumber = HttpContext.Session.GetString("PhoneNumber");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            var cartItems = await _context.CartItems
                .Include(p => p.Product)
                .Where(p => p.UserId == userId)
                .Select(p => new
                {
                    p.CartItemId,
                    p.ProductId,
                    p.Product.Name,
                    p.Product.Description,
                    p.Product.ImageUrl,
                    p.Product.Price,
                    p.Quantity,
                    TotalPrice = p.Quantity * p.Product.Price
                })
                .ToListAsync();

            if (!cartItems.Any())
            {
                return Ok(new { message = "Your cart is empty.", Items = cartItems });
            }

            var totalAmount = cartItems.Sum(ci => ci.TotalPrice);

            return Ok(new
            {
                Items = cartItems,
                TotalAmount = totalAmount
            });
        }


        //API Thêm sản phẩm vào giỏ hàng

        [HttpPost("Cart_add")]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartRequest request)
        {
            var userId = HttpContext.Session.GetInt32("UserId");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            var product = await _context.Products.FindAsync(request.ProductId);

            if (product == null)
                return NotFound(new { message = "Product not found." });

            if (product.StockQuantity < request.Quantity)
                return BadRequest(new { message = "Insufficient stock for the product." });

            var cartItem = await _context.CartItems
                .FirstOrDefaultAsync(ci => ci.UserId == userId && ci.ProductId == request.ProductId);

            if (cartItem != null)
            {
                // Update quantity
                cartItem.Quantity += request.Quantity;
            }
            else
            {
                // Add new item to cart
                cartItem = new CartItem
                {
                    UserId = userId.Value,
                    ProductId = request.ProductId,
                    Quantity = request.Quantity
                };
                await _context.CartItems.AddAsync(cartItem);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Product added to cart successfully." });
        }

        //API Xóa sản phẩm khỏi giỏ hàng

        [HttpDelete("remove/{cartItemId}")]
        public async Task<IActionResult> RemoveFromCart(int cartItemId)
        {
            var userId = HttpContext.Session.GetInt32("UserId");

            if (userId == null)
                return Unauthorized(new { message = "User is not logged in." });

            var cartItem = await _context.CartItems
                .FirstOrDefaultAsync(ci => ci.CartItemId == cartItemId && ci.UserId == userId);

            if (cartItem == null)
                return NotFound(new { message = "Cart item not found." });

            _context.CartItems.Remove(cartItem);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Cart item removed successfully." });
        }

        [HttpPut("update/{cartItemId}")]
        public async Task<IActionResult> UpdateCartItem(int cartItemId, [FromBody] UpdateCartItemDto updateDto)
        {
            // Kiểm tra đăng nhập
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
            {
                return Unauthorized(new { message = "User is not logged in." });
            }

            // Tìm cart item
            var cartItem = await _context.CartItems
                .Include(ci => ci.Product)
                .FirstOrDefaultAsync(ci => ci.CartItemId == cartItemId && ci.UserId == userId);

            if (cartItem == null)
            {
                return NotFound(new { message = "Cart item not found." });
            }

            // Validate số lượng
            if (updateDto.Quantity <= 0)
            {
                return BadRequest(new { message = "Quantity must be greater than 0." });
            }

            // Kiểm tra số lượng tồn kho
            if (updateDto.Quantity > cartItem.Product.StockQuantity)
            {
                return BadRequest(new { message = $"Only {cartItem.Product.StockQuantity} items available in stock." });
            }

            // Cập nhật số lượng
            cartItem.Quantity = updateDto.Quantity;
            _context.CartItems.Update(cartItem);

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new
                {
                    message = "Cart item updated successfully.",
                    cartItemId = cartItem.CartItemId,
                    newQuantity = cartItem.Quantity,
                    totalPrice = cartItem.Quantity * cartItem.Product.Price
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while updating the cart item." });
            }
        }

        public class UpdateCartItemDto
        {
            public int Quantity { get; set; }
        }

    }
    public class AddToCartRequest
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }
}
