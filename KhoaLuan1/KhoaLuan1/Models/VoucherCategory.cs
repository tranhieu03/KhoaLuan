using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class VoucherCategory
{
    public int VoucherCategoryId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public virtual ICollection<Voucher> Vouchers { get; set; } = new List<Voucher>();
}
