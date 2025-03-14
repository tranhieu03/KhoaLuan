using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class VoucherCustomer
{
    public int VoucherCustomerId { get; set; }

    public int VoucherId { get; set; }

    public int UserId { get; set; }

    public string CustomerType { get; set; } = null!;

    public DateTime? AppliedDate { get; set; }

    public virtual User User { get; set; } = null!;

    public virtual Voucher Voucher { get; set; } = null!;
}
