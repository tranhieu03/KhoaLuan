using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class VoucherStore
{
    public int VoucherStoreId { get; set; }

    public int VoucherId { get; set; }

    public int RestaurantId { get; set; }

    public virtual Restaurant Restaurant { get; set; } = null!;

    public virtual Voucher Voucher { get; set; } = null!;
}
