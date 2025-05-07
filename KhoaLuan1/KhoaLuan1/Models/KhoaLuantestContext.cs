using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace KhoaLuan1.Models;

public partial class KhoaluantestContext : DbContext
{
    public KhoaluantestContext()
    {
    }

    public KhoaluantestContext(DbContextOptions<KhoaluantestContext> options)
        : base(options)
    {
    }

    public virtual DbSet<CartItem> CartItems { get; set; }

    public virtual DbSet<DeliveryTracking> DeliveryTrackings { get; set; }

    public virtual DbSet<EmailSendRecord> EmailSendRecords { get; set; }

    public virtual DbSet<FoodCategory> FoodCategories { get; set; }

    public virtual DbSet<Message> Messages { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<OrderDetail> OrderDetails { get; set; }

    public virtual DbSet<PasswordResetToken> PasswordResetTokens { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<ProductReview> ProductReviews { get; set; }

    public virtual DbSet<Restaurant> Restaurants { get; set; }

    public virtual DbSet<Review> Reviews { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Voucher> Vouchers { get; set; }

    public virtual DbSet<VoucherCategory> VoucherCategories { get; set; }

    public virtual DbSet<VoucherCondition> VoucherConditions { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseSqlServer("Name=DefaultConnection");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.HasKey(e => e.CartItemId).HasName("PK__CartItem__488B0B0AE6F54D37");

            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasDefaultValue("Active");

            entity.HasOne(d => d.Product).WithMany(p => p.CartItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__CartItems__Produ__32AB8735");

            entity.HasOne(d => d.User).WithMany(p => p.CartItems)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__CartItems__UserI__31B762FC");
        });

        modelBuilder.Entity<DeliveryTracking>(entity =>
        {
            entity.HasKey(e => e.TrackingId).HasName("PK__DeliveryTracking__ID");

            entity.ToTable("DeliveryTracking");

            entity.Property(e => e.Latitude).HasColumnType("decimal(10, 6)");
            entity.Property(e => e.Longitude).HasColumnType("decimal(10, 6)");
            entity.Property(e => e.TrackingTime).HasColumnType("datetime");
            entity.Property(e => e.TrackingType)
                .HasMaxLength(50)
                .HasDefaultValue("Start");

            entity.HasOne(d => d.DeliveryPerson).WithMany(p => p.DeliveryTrackings)
                .HasForeignKey(d => d.DeliveryPersonId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DeliveryTracking_User");

            entity.HasOne(d => d.Order).WithMany(p => p.DeliveryTrackings)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DeliveryTracking_Order");
        });

        modelBuilder.Entity<EmailSendRecord>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__EmailSen__3214EC0755C0F5E7");

            entity.ToTable("EmailSendRecord");

            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.LastSentTime).HasColumnType("datetime");
        });

        modelBuilder.Entity<FoodCategory>(entity =>
        {
            entity.HasKey(e => e.FoodCategoryId).HasName("PK__FoodCate__5451B7EBD7BD6067");

            entity.ToTable("FoodCategory");

            entity.HasIndex(e => e.Name, "UQ__FoodCate__737584F62C597F9E").IsUnique();

            entity.Property(e => e.Description).HasMaxLength(255);
            entity.Property(e => e.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.MessageId).HasName("PK__Messages__C87C0C9CCB06022F");

            entity.ToTable(tb => tb.HasTrigger("trg_Messages_AfterInsert"));

            entity.HasIndex(e => e.IsRead, "IX_Messages_IsRead");

            entity.HasIndex(e => e.OrderId, "IX_Messages_OrderId");

            entity.HasIndex(e => e.ReceiverId, "IX_Messages_ReceiverId").HasFilter("([ReceiverId] IS NOT NULL)");

            entity.HasIndex(e => e.SenderId, "IX_Messages_SenderId");

            entity.HasIndex(e => e.SentAt, "IX_Messages_SentAt");

            entity.Property(e => e.SentAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Order).WithMany(p => p.Messages)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Messages__OrderI__4D5F7D71");

            entity.HasOne(d => d.Receiver).WithMany(p => p.MessageReceivers)
                .HasForeignKey(d => d.ReceiverId)
                .HasConstraintName("FK__Messages__Receiv__4C6B5938");

            entity.HasOne(d => d.Sender).WithMany(p => p.MessageSenders)
                .HasForeignKey(d => d.SenderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Messages__Sender__4B7734FF");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Notifica__3214EC07116AAACC");

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getutcdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Message).HasMaxLength(500);

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__Notificat__UserI__51300E55");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.OrderId).HasName("PK__Orders__C3905BCF75D28AB0");

            entity.Property(e => e.Address).HasMaxLength(255);
            entity.Property(e => e.DiscountAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DistanceKm).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Latitude).HasColumnType("decimal(10, 6)");
            entity.Property(e => e.Longitude).HasColumnType("decimal(10, 6)");
            entity.Property(e => e.OrderDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.PaymentDate).HasColumnType("datetime");
            entity.Property(e => e.PaymentMethod).HasMaxLength(50);
            entity.Property(e => e.PaymentStatus).HasMaxLength(50);
            entity.Property(e => e.ShipFee).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("Pending");
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.TransactionId).HasMaxLength(100);

            entity.HasOne(d => d.DeliveryPerson).WithMany(p => p.OrderDeliveryPeople)
                .HasForeignKey(d => d.DeliveryPersonId)
                .HasConstraintName("FK__Orders__Delivery__395884C4");

            entity.HasOne(d => d.Restaurant).WithMany(p => p.Orders)
                .HasForeignKey(d => d.RestaurantId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Orders__Restaura__3864608B");

            entity.HasOne(d => d.User).WithMany(p => p.OrderUsers)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Orders__UserId__37703C52");
        });

        modelBuilder.Entity<OrderDetail>(entity =>
        {
            entity.HasKey(e => e.OrderDetailId).HasName("PK__OrderDet__D3B9D36C4298E6D8");

            entity.Property(e => e.Price).HasColumnType("decimal(10, 2)");

            entity.HasOne(d => d.Order).WithMany(p => p.OrderDetails)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__OrderDeta__Order__3C34F16F");

            entity.HasOne(d => d.Product).WithMany(p => p.OrderDetails)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__OrderDeta__Produ__3D2915A8");
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.TokenId).HasName("PK__Password__658FEEEA1D62C6F4");

            entity.ToTable("PasswordResetToken");

            entity.HasIndex(e => e.Token, "IDX_PasswordResetToken_Token");

            entity.HasIndex(e => e.UserId, "IDX_PasswordResetToken_UserId");

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Expiration).HasColumnType("datetime");
            entity.Property(e => e.IsUsed).HasDefaultValue(false);
            entity.Property(e => e.Token).HasMaxLength(255);

            entity.HasOne(d => d.User).WithMany(p => p.PasswordResetTokens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_PasswordResetToken_User");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.ProductId).HasName("PK__Products__B40CC6CD807A8870");

            entity.Property(e => e.AverageRating).HasColumnType("decimal(3, 2)");
            entity.Property(e => e.ImageUrl).HasMaxLength(255);
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Price).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasDefaultValue("Active");
            entity.Property(e => e.StockQuantity).HasDefaultValue(0);

            entity.HasOne(d => d.FoodCategory).WithMany(p => p.Products)
                .HasForeignKey(d => d.FoodCategoryId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_Product_FoodCategory");

            entity.HasOne(d => d.Restaurant).WithMany(p => p.Products)
                .HasForeignKey(d => d.RestaurantId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Products__Restau__2EDAF651");
        });

        modelBuilder.Entity<ProductReview>(entity =>
        {
            entity.HasKey(e => e.ProductReviewId).HasName("PK__ProductR__396318808F1B9CA5");

            entity.ToTable(tb => tb.HasTrigger("trg_UpdateProductRating"));

            entity.Property(e => e.Comment).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.OrderDetail).WithMany(p => p.ProductReviews)
                .HasForeignKey(d => d.OrderDetailId)
                .HasConstraintName("FK_ProductReview_OrderDetail");

            entity.HasOne(d => d.User).WithMany(p => p.ProductReviews)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_ProductReview_User");
        });

        modelBuilder.Entity<Restaurant>(entity =>
        {
            entity.HasKey(e => e.RestaurantId).HasName("PK__Restaura__87454C9535ADCB92");

            entity.Property(e => e.Address).HasMaxLength(255);
            entity.Property(e => e.BackIdCardImage).HasMaxLength(255);
            entity.Property(e => e.BusinessLicenseImage).HasMaxLength(255);
            entity.Property(e => e.FrontIdCardImage).HasMaxLength(255);
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(15)
                .IsUnicode(false);
            entity.Property(e => e.RestaurantImage).HasMaxLength(255);
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasDefaultValue("Pending");

            entity.HasOne(d => d.Seller).WithMany(p => p.Restaurants)
                .HasForeignKey(d => d.SellerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Restauran__Selle__2B0A656D");
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(e => e.ReviewId).HasName("PK__Review__74BC79CEBA7C422C");

            entity.ToTable(tb => tb.HasTrigger("trg_UpdateDeliveryPersonRating"));

            entity.Property(e => e.Comment).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Order).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.OrderId)
                .HasConstraintName("FK_Review_Order");

            entity.HasOne(d => d.User).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_Review_User");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__1788CC4C49DD9F9C");

            entity.HasIndex(e => e.Email, "UQ__Users__A9D10534468CC25F").IsUnique();

            entity.Property(e => e.Address).HasMaxLength(255);
            entity.Property(e => e.AverageRating).HasColumnType("decimal(3, 2)");
            entity.Property(e => e.BackIdCardImage).HasMaxLength(255);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.FrontIdCardImage).HasMaxLength(255);
            entity.Property(e => e.FullName).HasMaxLength(100);
            entity.Property(e => e.OriginRole)
                .HasMaxLength(50)
                .HasDefaultValue("Customer");
            entity.Property(e => e.PasswordHash).HasMaxLength(255);
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(10)
                .IsFixedLength();
            entity.Property(e => e.Role).HasMaxLength(50);
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("Active");
            entity.Property(e => e.VehicleNumber).HasMaxLength(20);
        });

        modelBuilder.Entity<Voucher>(entity =>
        {
            entity.HasKey(e => e.VoucherId).HasName("PK__Voucher__3AEE792171DFF232");

            entity.ToTable("Voucher");

            entity.HasIndex(e => e.ApplyMode, "IX_Vouchers_ApplyMode");

            entity.HasIndex(e => e.Code, "UQ__Voucher__A25C5AA703693E01").IsUnique();

            entity.Property(e => e.ApplyMode)
                .HasMaxLength(20)
                .HasDefaultValue("Individual");
            entity.Property(e => e.Code).HasMaxLength(50);
            entity.Property(e => e.DiscountAmount).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.ExpirationDate).HasColumnType("datetime");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("Active");
            entity.Property(e => e.VoucherType).HasMaxLength(50);

            entity.HasOne(d => d.Product).WithMany(p => p.Vouchers)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_Voucher_Product");

            entity.HasOne(d => d.Restaurant).WithMany(p => p.Vouchers)
                .HasForeignKey(d => d.RestaurantId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_Voucher_Restaurant");

            entity.HasOne(d => d.User).WithMany(p => p.Vouchers)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_Voucher_User");

            entity.HasOne(d => d.VoucherCategory).WithMany(p => p.Vouchers)
                .HasForeignKey(d => d.VoucherCategoryId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_Voucher_VoucherCategory");
        });

        modelBuilder.Entity<VoucherCategory>(entity =>
        {
            entity.HasKey(e => e.VoucherCategoryId).HasName("PK__VoucherC__9EED8AF5F1CF6E4A");

            entity.ToTable("VoucherCategory");

            entity.HasIndex(e => e.Name, "UQ__VoucherC__737584F60BE822FC").IsUnique();

            entity.Property(e => e.Description).HasMaxLength(255);
            entity.Property(e => e.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<VoucherCondition>(entity =>
        {
            entity.HasKey(e => e.VoucherConditionId).HasName("PK__VoucherC__D55F79033E3EE1EC");

            entity.HasIndex(e => e.ConditionType, "IX_VoucherConditions_ConditionType");

            entity.HasIndex(e => e.VoucherId, "IX_VoucherConditions_VoucherId");

            entity.Property(e => e.ConditionType).HasMaxLength(20);
            entity.Property(e => e.CreatedDate).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.Field).HasMaxLength(50);
            entity.Property(e => e.Operator).HasMaxLength(20);
            entity.Property(e => e.UpdatedDate).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.Voucher).WithMany(p => p.VoucherConditions)
                .HasForeignKey(d => d.VoucherId)
                .HasConstraintName("FK_VoucherConditions_Vouchers");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
