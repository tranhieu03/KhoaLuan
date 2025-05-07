using KhoaLuan1.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace KhoaLuan1.Service
{
    public class VoucherService
    {
        private readonly KhoaluantestContext _context;
        private readonly ILogger<VoucherService> _logger;

        public VoucherService(KhoaluantestContext context, ILogger<VoucherService> logger)
        {
            _context = context;
            _logger = logger;
        }

        #region User Functions (Existing)

        public async Task<(List<Voucher> Vouchers, string ErrorMessage)> GetValidVouchersForUser(int userId)
        {
            try
            {
                // Get user with essential information
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return (new List<Voucher>(), "Không tìm thấy thông tin người dùng.");
                }

                // Get all active vouchers with their conditions in a single query
                var allActiveVouchers = await _context.Vouchers
                    .Include(v => v.VoucherCategory)
                    .Include(v => v.VoucherConditions)
                    .Where(v => v.Status == "Active" && v.ExpirationDate > DateTime.UtcNow)
                    .ToListAsync();

                // Pre-load user-specific data needed for voucher validation
                var userOrderCount = await _context.Orders.CountAsync(o => o.UserId == userId);

                // Filter vouchers based on conditions
                var validVouchers = new List<Voucher>();

                foreach (var voucher in allActiveVouchers)
                {
                    if (IsVoucherValidForUser(voucher, user, userOrderCount))
                    {
                        validVouchers.Add(voucher);
                    }
                }

                return (validVouchers, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách voucher hợp lệ cho người dùng {UserId}", userId);
                return (new List<Voucher>(), "Có lỗi xảy ra khi lấy danh sách voucher. Vui lòng thử lại sau.");
            }
        }

        public async Task<(bool IsValid, string ValidationMessage, decimal DiscountAmount, Voucher Voucher)>
            ValidateVoucherForOrder(string voucherCode, int userId, decimal orderTotal, int restaurantId,
                                  List<int> productIds = null)
        {
            try
            {
                // Load voucher with all related data needed for validation
                var voucher = await _context.Vouchers
                    .Include(v => v.VoucherCategory)
                    .Include(v => v.VoucherConditions)
                    .FirstOrDefaultAsync(v => v.Code == voucherCode &&
                                           v.Status == "Active" &&
                                           v.ExpirationDate > DateTime.UtcNow);

                if (voucher == null)
                {
                    return (false, "Mã giảm giá không hợp lệ hoặc đã hết hạn.", 0, null);
                }

                // Get user information
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return (false, "Không tìm thấy thông tin người dùng.", 0, null);
                }

                // Pre-load user data for condition checks
                var userOrderCount = await _context.Orders.CountAsync(o => o.UserId == userId);

                // Validate based on voucher category
                switch (voucher.VoucherCategory?.Name)
                {
                    case "User":
                        if (voucher.UserId != userId)
                        {
                            return (false, "Mã giảm giá này không thuộc về bạn.", 0, null);
                        }
                        break;

                    case "Restaurant":
                        if (voucher.RestaurantId != restaurantId)
                        {
                            return (false, "Mã giảm giá này không áp dụng cho nhà hàng này.", 0, null);
                        }
                        break;

                    case "Product":
                        if (productIds != null && !productIds.Contains(voucher.ProductId ?? -1))
                        {
                            return (false, "Mã giảm giá này không áp dụng cho các sản phẩm trong đơn hàng.", 0, null);
                        }
                        break;
                }

                // Validate voucher conditions
                if (voucher.VoucherConditions != null && voucher.VoucherConditions.Any())
                {
                    bool isValidForConditions = EvaluateVoucherConditions(voucher, user, userOrderCount);

                    if (!isValidForConditions)
                    {
                        return (false, "Bạn không đủ điều kiện để sử dụng mã giảm giá này.", 0, null);
                    }
                }

                // Validate minimum order amount
                if (voucher.MinimumOrderAmount.HasValue && orderTotal < voucher.MinimumOrderAmount.Value)
                {
                    return (false, $"Đơn hàng cần đạt tối thiểu {voucher.MinimumOrderAmount.Value:N0}đ để áp dụng mã giảm giá này.", 0, null);
                }

                // Validate usage limit
                if (voucher.UsageLimit.HasValue && voucher.UsageLimit.Value <= 0)
                {
                    return (false, "Mã giảm giá này đã hết lượt sử dụng.", 0, null);
                }

                // Calculate discount amount
                decimal discountAmount = voucher.VoucherType == "Fixed"
                    ? voucher.DiscountAmount
                    : Math.Min((orderTotal * voucher.DiscountAmount) / 100,
                                 voucher.MaximumDiscountAmount ?? decimal.MaxValue);

                return (true, "Mã giảm giá hợp lệ", discountAmount, voucher);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xác thực voucher {VoucherCode}", voucherCode);
                return (false, "Có lỗi xảy ra khi xác thực mã giảm giá. Vui lòng thử lại sau.", 0, null);
            }
        }

        private bool IsVoucherValidForUser(Voucher voucher, User user, int userOrderCount)
        {
            // Case 1: Individual user voucher (UserId phải trùng)
            if (voucher.ApplyMode == "Individual" &&

                voucher.UserId == user.UserId)
            {
                return true;
            }

            // Case 2: Public voucher không ràng buộc UserId (Restaurant, Product, Freeship)
            if (voucher.ApplyMode == "Individual" &&

                voucher.UserId == null)
            {
                return true;
            }

            // Case 3: Voucher theo điều kiện, nhưng không có điều kiện nào => xem như Public
            if (voucher.ApplyMode == "Condition" &&
                (voucher.VoucherCategory?.Name == "Free Shipping") &&
                (voucher.VoucherConditions == null || !voucher.VoucherConditions.Any()))
            {
                return true;
            }

            // Case 4: Voucher theo điều kiện, có điều kiện => kiểm tra kỹ
            if (voucher.ApplyMode == "Condition" && voucher.VoucherConditions != null && voucher.VoucherConditions.Any())
            {
                return EvaluateVoucherConditions(voucher, user, userOrderCount);
            }

            return false;
        }

        private bool EvaluateVoucherConditions(Voucher voucher, User user, int userOrderCount)
        {
            // If no conditions, assume valid
            if (voucher.VoucherConditions == null || !voucher.VoucherConditions.Any())
                return true;

            foreach (var condition in voucher.VoucherConditions)
            {
                switch (condition.ConditionType)
                {
                    case "User":
                        if (!EvaluateUserCondition(condition, user, userOrderCount))
                            return false;
                        break;

                    // For other condition types that might need evaluation during order creation
                    // (These will be evaluated in ValidateVoucherForOrder where we have the order context)
                    default:
                        // Return true for now as we only pre-evaluate user conditions
                        // Other conditions will be checked during actual order creation
                        break;
                }
            }

            return true;
        }

        private bool EvaluateUserCondition(VoucherCondition condition, User user, int userOrderCount)
        {
            switch (condition.Field)
            {
                case "JoinDate":
                    DateTime joinDate = user.CreatedAt;
                    DateTime compareDate = DateTime.Parse(condition.Value);

                    return condition.Operator switch
                    {
                        ">" => joinDate > compareDate,
                        "<" => joinDate < compareDate,
                        "=" => joinDate.Date == compareDate.Date,
                        _ => false
                    };

                case "TotalOrders":
                    int compareValue = int.Parse(condition.Value);

                    return condition.Operator switch
                    {
                        ">" => userOrderCount > compareValue,
                        ">=" => userOrderCount >= compareValue,
                        "<" => userOrderCount < compareValue,
                        "<=" => userOrderCount <= compareValue,
                        "=" => userOrderCount == compareValue,
                        _ => false
                    };

                case "UserCategory":
                case "Role":
                    string userRole = user.Role;
                    if (condition.Operator == "=")
                        return userRole == condition.Value;

                    if (condition.Operator == "IN")
                    {
                        var roles = JsonSerializer.Deserialize<List<string>>(condition.Value);
                        return roles?.Contains(userRole) ?? false;
                    }
                    return false;

                default:
                    return false;
            }
        }

        // Use this method to evaluate voucher conditions during order creation
        public bool EvaluateOrderVoucherConditions(Voucher voucher, Order order, List<OrderDetail> orderDetails)
        {
            if (voucher.VoucherConditions == null || !voucher.VoucherConditions.Any())
                return true;

            foreach (var condition in voucher.VoucherConditions)
            {
                switch (condition.ConditionType)
                {
                    case "Order":
                        if (!EvaluateOrderCondition(condition, order))
                            return false;
                        break;

                    case "Product":
                        if (!EvaluateProductCondition(condition, orderDetails))
                            return false;
                        break;

                    default:
                        // For User and Restaurant conditions, we assume they've been validated already
                        break;
                }
            }

            return true;
        }

        private bool EvaluateOrderCondition(VoucherCondition condition, Order order)
        {
            switch (condition.Field)
            {
                case "TotalAmount":
                    decimal totalAmount = order.TotalAmount;
                    decimal compareValue = decimal.Parse(condition.Value);

                    return condition.Operator switch
                    {
                        ">" => totalAmount > compareValue,
                        ">=" => totalAmount >= compareValue,
                        "<" => totalAmount < compareValue,
                        "<=" => totalAmount <= compareValue,
                        "=" => totalAmount == compareValue,
                        _ => false
                    };

                case "OrderDate":
                    DateTime orderDate = order.OrderDate;
                    DateTime compareDate = DateTime.Parse(condition.Value);

                    return condition.Operator switch
                    {
                        ">" => orderDate > compareDate,
                        "<" => orderDate < compareDate,
                        "=" => orderDate.Date == compareDate.Date,
                        _ => false
                    };

                default:
                    return false;
            }
        }

        private bool EvaluateProductCondition(VoucherCondition condition, List<OrderDetail> orderDetails)
        {
            switch (condition.Field)
            {
                case "ProductId":
                    int productId = int.Parse(condition.Value);
                    bool productExists = orderDetails.Any(od => od.ProductId == productId);

                    return condition.Operator switch
                    {
                        "INCLUDES" => productExists,
                        "EXCLUDES" => !productExists,
                        _ => false
                    };

                case "MinimumQuantity":
                    string[] parts = condition.Value.Split('|');
                    int productIdForQty = int.Parse(parts[0]);
                    int minQuantity = int.Parse(parts[1]);

                    int quantity = orderDetails
                        .Where(od => od.ProductId == productIdForQty)
                        .Sum(od => od.Quantity);

                    return quantity >= minQuantity;

                case "ProductCategory":
                    // This would require loading product categories, which we should do in a batch
                    // during order processing to avoid repeated DB calls
                    // For simplicity, we'll assume it's valid for now
                    _logger.LogWarning("ProductCategory condition validation requires additional optimization");
                    return true;

                default:
                    return false;
            }
        }

        #endregion

        #region Admin Functions (New)

        public async Task<(List<Voucher> Vouchers, string ErrorMessage)> GetAllVouchers(string status = null, string categoryName = null)
        {
            try
            {
                var query = _context.Vouchers
                    .Include(v => v.VoucherCategory)
                    .Include(v => v.VoucherConditions)
                    .Include(v => v.Restaurant)
                    .Include(v => v.Product)
                    .Include(v => v.User)
                    .AsQueryable();

                // Apply filters if provided
                if (!string.IsNullOrEmpty(status))
                    query = query.Where(v => v.Status == status);

                if (!string.IsNullOrEmpty(categoryName))
                    query = query.Where(v => v.VoucherCategory.Name == categoryName);

                var vouchers = await query.ToListAsync();
                return (vouchers, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving vouchers with admin filters");
                return (new List<Voucher>(), "Có lỗi xảy ra khi lấy danh sách voucher. Vui lòng thử lại sau.");
            }
        }

        public async Task<(Voucher Voucher, string ErrorMessage)> GetVoucherById(int voucherId)
        {
            try
            {
                var voucher = await _context.Vouchers
                    .Include(v => v.VoucherCategory)
                    .Include(v => v.VoucherConditions)
                    .Include(v => v.Restaurant)
                    .Include(v => v.Product)
                    .Include(v => v.User)
                    .FirstOrDefaultAsync(v => v.VoucherId == voucherId);

                if (voucher == null)
                    return (null, "Không tìm thấy voucher.");

                return (voucher, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving voucher with ID {VoucherId}", voucherId);
                return (null, "Có lỗi xảy ra khi lấy thông tin voucher. Vui lòng thử lại sau.");
            }
        }

        public async Task<(bool Success, string Message)> CreateVoucher(Voucher voucher, List<VoucherCondition> conditions = null)
        {
            try
            {
                // Validate voucher
                if (string.IsNullOrWhiteSpace(voucher.Code))
                    return (false, "Mã voucher không được để trống.");

                // Check if code exists
                if (await _context.Vouchers.AnyAsync(v => v.Code == voucher.Code))
                    return (false, "Mã voucher đã tồn tại.");

                // Validate expiration date
                if (voucher.ExpirationDate <= DateTime.UtcNow)
                    return (false, "Ngày hết hạn phải lớn hơn ngày hiện tại.");

                // Begin transaction
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    // Add voucher
                    _context.Vouchers.Add(voucher);
                    await _context.SaveChangesAsync();

                    // Add conditions if provided
                    if (conditions != null && conditions.Any())
                    {
                        foreach (var condition in conditions)
                        {
                            condition.VoucherId = voucher.VoucherId;
                            condition.CreatedDate = DateTime.UtcNow;
                            condition.UpdatedDate = DateTime.UtcNow;
                            _context.VoucherConditions.Add(condition);
                        }
                        await _context.SaveChangesAsync();
                    }

                    // Commit transaction
                    await transaction.CommitAsync();
                    return (true, "Tạo voucher thành công.");
                }
                catch (Exception ex)
                {
                    // Rollback transaction on error
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Error creating voucher in transaction");
                    return (false, "Có lỗi xảy ra khi tạo voucher. Vui lòng thử lại sau.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating voucher");
                return (false, "Có lỗi xảy ra khi tạo voucher. Vui lòng thử lại sau.");
            }
        }

        public async Task<(bool Success, string Message)> UpdateVoucher(int voucherId, Voucher updatedVoucher, bool updateConditions = false, List<VoucherCondition> newConditions = null)
        {
            try
            {
                var existingVoucher = await _context.Vouchers
                    .Include(v => v.VoucherConditions)
                    .FirstOrDefaultAsync(v => v.VoucherId == voucherId);

                if (existingVoucher == null)
                    return (false, "Không tìm thấy voucher.");

                // Check code uniqueness if code is changed
                if (!string.IsNullOrWhiteSpace(updatedVoucher.Code) &&
                    updatedVoucher.Code != existingVoucher.Code &&
                    await _context.Vouchers.AnyAsync(v => v.Code == updatedVoucher.Code && v.VoucherId != voucherId))
                {
                    return (false, "Mã voucher đã tồn tại.");
                }

                // Begin transaction
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    // Update voucher properties that are provided
                    if (!string.IsNullOrWhiteSpace(updatedVoucher.Code))
                        existingVoucher.Code = updatedVoucher.Code;

                    if (!string.IsNullOrWhiteSpace(updatedVoucher.VoucherType))
                        existingVoucher.VoucherType = updatedVoucher.VoucherType;

                    if (updatedVoucher.DiscountAmount != 0)
                        existingVoucher.DiscountAmount = updatedVoucher.DiscountAmount;

                    existingVoucher.MinimumOrderAmount = updatedVoucher.MinimumOrderAmount;
                    existingVoucher.MaximumDiscountAmount = updatedVoucher.MaximumDiscountAmount;
                    existingVoucher.UsageLimit = updatedVoucher.UsageLimit;

                    if (updatedVoucher.ExpirationDate != DateTime.MinValue)
                        existingVoucher.ExpirationDate = updatedVoucher.ExpirationDate;

                    if (!string.IsNullOrWhiteSpace(updatedVoucher.Status))
                        existingVoucher.Status = updatedVoucher.Status;

                    if (!string.IsNullOrWhiteSpace(updatedVoucher.ApplyMode))
                        existingVoucher.ApplyMode = updatedVoucher.ApplyMode;

                    existingVoucher.VoucherCategoryId = updatedVoucher.VoucherCategoryId;
                    existingVoucher.RestaurantId = updatedVoucher.RestaurantId;
                    existingVoucher.ProductId = updatedVoucher.ProductId;
                    existingVoucher.UserId = updatedVoucher.UserId;

                    // Update conditions if requested
                    if (updateConditions)
                    {
                        // Remove existing conditions
                        _context.VoucherConditions.RemoveRange(existingVoucher.VoucherConditions);
                        await _context.SaveChangesAsync();

                        // Add new conditions
                        if (newConditions != null && newConditions.Any())
                        {
                            foreach (var condition in newConditions)
                            {
                                condition.VoucherId = existingVoucher.VoucherId;
                                condition.CreatedDate = DateTime.UtcNow;
                                condition.UpdatedDate = DateTime.UtcNow;
                                _context.VoucherConditions.Add(condition);
                            }
                        }
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return (true, "Cập nhật voucher thành công.");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Error updating voucher in transaction");
                    return (false, "Có lỗi xảy ra khi cập nhật voucher. Vui lòng thử lại sau.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating voucher");
                return (false, "Có lỗi xảy ra khi cập nhật voucher. Vui lòng thử lại sau.");
            }
        }

        public async Task<(bool Success, string Message)> DeleteVoucher(int voucherId)
        {
            try
            {
                var voucher = await _context.Vouchers
                    .Include(v => v.VoucherConditions)
                    .FirstOrDefaultAsync(v => v.VoucherId == voucherId);

                if (voucher == null)
                    return (false, "Không tìm thấy voucher.");

                // Begin transaction
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    // Remove conditions first to avoid foreign key constraint issues
                    if (voucher.VoucherConditions != null && voucher.VoucherConditions.Any())
                    {
                        _context.VoucherConditions.RemoveRange(voucher.VoucherConditions);
                        await _context.SaveChangesAsync();
                    }

                    // Then remove voucher
                    _context.Vouchers.Remove(voucher);
                    await _context.SaveChangesAsync();

                    // Commit transaction
                    await transaction.CommitAsync();
                    return (true, "Xóa voucher thành công.");
                }
                catch (Exception ex)
                {
                    // Rollback transaction on error
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Error deleting voucher in transaction");
                    return (false, "Có lỗi xảy ra khi xóa voucher. Vui lòng thử lại sau.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting voucher");
                return (false, "Có lỗi xảy ra khi xóa voucher. Vui lòng thử lại sau.");
            }
        }

        public async Task<List<VoucherCategory>> GetVoucherCategories()
        {
            try
            {
                return await _context.VoucherCategories.ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving voucher categories");
                return new List<VoucherCategory>();
            }
        }

        public async Task<string> GenerateUniqueVoucherCode(int length = 8)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            string code;

            do
            {
                code = new string(Enumerable.Repeat(chars, length)
                    .Select(s => s[random.Next(s.Length)]).ToArray());
            } while (await _context.Vouchers.AnyAsync(v => v.Code == code));

            return code;
        }

        #endregion
    }
}