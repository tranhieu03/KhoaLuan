using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class VoucherCondition
{
    public int VoucherConditionId { get; set; }

    public int VoucherId { get; set; }

    public string ConditionType { get; set; } = null!;

    public string Field { get; set; } = null!;

    public string Operator { get; set; } = null!;

    public string Value { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime UpdatedDate { get; set; }

    public virtual Voucher Voucher { get; set; } = null!;
}
