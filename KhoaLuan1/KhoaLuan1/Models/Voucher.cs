using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class Voucher
{
    public int VoucherId { get; set; }

    public string Code { get; set; } = null!;

    public decimal DiscountAmount { get; set; }

    public DateTime ExpirationDate { get; set; }

    public string? Status { get; set; }

    public string VoucherType { get; set; } = null!;

    public int? VoucherCategoryId { get; set; }

    public int? UserId { get; set; }

    public int? ProductId { get; set; }

    public int? RestaurantId { get; set; }

    public int? MinimumOrderAmount { get; set; }

    public int? MaximumDiscountAmount { get; set; }

    public int? UsageLimit { get; set; }

    public string ApplyMode { get; set; } = null!;

    public virtual Product? Product { get; set; }

    public virtual Restaurant? Restaurant { get; set; }

    public virtual User? User { get; set; }

    public virtual VoucherCategory? VoucherCategory { get; set; }

    public virtual ICollection<VoucherCondition> VoucherConditions { get; set; } = new List<VoucherCondition>();
}
