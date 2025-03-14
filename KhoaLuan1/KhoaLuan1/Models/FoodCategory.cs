using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class FoodCategory
{
    public int FoodCategoryId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
