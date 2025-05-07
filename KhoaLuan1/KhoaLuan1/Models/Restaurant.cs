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

    public string? FrontIdCardImage { get; set; }

    public string? BackIdCardImage { get; set; }

    public string? BusinessLicenseImage { get; set; }

    public string? PhoneNumber { get; set; }

    public string Status { get; set; } = null!;

    public string? RestaurantImage { get; set; }

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();

    public virtual User Seller { get; set; } = null!;

    public virtual ICollection<Voucher> Vouchers { get; set; } = new List<Voucher>();
}
