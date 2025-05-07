using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class Product
{
    public int ProductId { get; set; }

    public int RestaurantId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public string? ImageUrl { get; set; }

    public int? StockQuantity { get; set; }

    public string Status { get; set; } = null!;

    public int? FoodCategoryId { get; set; }

    public decimal? AverageRating { get; set; }

    public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();

    public virtual FoodCategory? FoodCategory { get; set; }

    public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();

    public virtual Restaurant Restaurant { get; set; } = null!;

    public virtual ICollection<Voucher> Vouchers { get; set; } = new List<Voucher>();
}
