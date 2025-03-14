using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class VoucherProduct
{
    public int VoucherProductId { get; set; }

    public int VoucherId { get; set; }

    public int ProductId { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual Voucher Voucher { get; set; } = null!;
}
