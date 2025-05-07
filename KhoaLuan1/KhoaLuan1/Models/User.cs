using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class User
{
    public int UserId { get; set; }

    public string FullName { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string Role { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public string? PhoneNumber { get; set; }

    public string Status { get; set; } = null!;

    public string? Address { get; set; }

    public decimal? AverageRating { get; set; }

    public string? FrontIdCardImage { get; set; }

    public string? BackIdCardImage { get; set; }

    public string? VehicleNumber { get; set; }

    public string OriginRole { get; set; } = null!;

    public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();

    public virtual ICollection<DeliveryTracking> DeliveryTrackings { get; set; } = new List<DeliveryTracking>();

    public virtual ICollection<Message> MessageReceivers { get; set; } = new List<Message>();

    public virtual ICollection<Message> MessageSenders { get; set; } = new List<Message>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual ICollection<Order> OrderDeliveryPeople { get; set; } = new List<Order>();

    public virtual ICollection<Order> OrderUsers { get; set; } = new List<Order>();

    public virtual ICollection<PasswordResetToken> PasswordResetTokens { get; set; } = new List<PasswordResetToken>();

    public virtual ICollection<ProductReview> ProductReviews { get; set; } = new List<ProductReview>();

    public virtual ICollection<Restaurant> Restaurants { get; set; } = new List<Restaurant>();

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual ICollection<Voucher> Vouchers { get; set; } = new List<Voucher>();
}
