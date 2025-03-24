using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class ProductReview
{
    public int ProductReviewId { get; set; }

    public int OrderDetailId { get; set; }

    public int UserId { get; set; }

    public int? Rating { get; set; }

    public string? Comment { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual OrderDetail OrderDetail { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
