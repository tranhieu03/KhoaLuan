using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class Restaurant
{
    public int RestaurantId { get; set; }

    public int SellerId { get; set; }

    public string Name { get; set; } = null!;

    public string Address { get; set; } = null!;

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();

    public virtual User Seller { get; set; } = null!;
}
