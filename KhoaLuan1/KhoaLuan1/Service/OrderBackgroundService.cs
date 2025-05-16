using KhoaLuan1.Hubs;
using KhoaLuan1.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace KhoaLuan1.Service
{
    public class OrderBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<OrderBackgroundService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(5); // Check every 5 minutes
        private static readonly TimeZoneInfo _vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"); // Vietnam timezone (UTC+7)

        public OrderBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<OrderBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Order Background Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("Checking for orders to auto-cancel...");
                await ProcessPendingOrders(stoppingToken);
                await ProcessReadyForDeliveryOrders(stoppingToken);

                await Task.Delay(_checkInterval, stoppingToken);
            }

            _logger.LogInformation("Order Background Service is stopping.");
        }

        private async Task ProcessPendingOrders(CancellationToken stoppingToken)
        {
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<KhoaluantestContext>();
                    var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<NotificationHub>>();

                    // Get all pending orders that are more than 30 minutes old using Vietnam time (UTC+7)
                    var vietnamNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _vietnamTimeZone);
                    var thirtyMinutesAgo = vietnamNow.AddMinutes(-30);

                    var ordersToCancel = await dbContext.Orders
                        .Where(o => o.Status == "Pending" &&
                               TimeZoneInfo.ConvertTimeFromUtc(o.OrderDate, _vietnamTimeZone) < thirtyMinutesAgo)
                        .ToListAsync(stoppingToken);

                    foreach (var order in ordersToCancel)
                    {
                        order.Status = "Cancelled";

                        // Create notification for user
                        var notification = new Notification
                        {
                            UserId = order.UserId,
                            Message = $"Đơn hàng #{order.OrderId} đã bị hủy do nhà hàng không xác nhận trong 30 phút.",
                            CreatedAt = vietnamNow,
                            IsRead = false
                        };

                        dbContext.Notifications.Add(notification);

                        // Log the cancellation
                        _logger.LogInformation($"Auto-cancelled order {order.OrderId} due to no restaurant confirmation within 30 minutes");
                    }

                    if (ordersToCancel.Any())
                    {
                        await dbContext.SaveChangesAsync(stoppingToken);

                        // Send notifications via SignalR
                        foreach (var order in ordersToCancel)
                        {
                            await hubContext.Clients.User(order.UserId.ToString())
                                .SendAsync("ReceiveNotification",
                                    $"Đơn hàng #{order.OrderId} đã bị hủy do nhà hàng không xác nhận trong 30 phút.",
                                    cancellationToken: stoppingToken);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing pending orders for auto-cancellation");
            }
        }

        private async Task ProcessReadyForDeliveryOrders(CancellationToken stoppingToken)
        {
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<KhoaluantestContext>();
                    var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<NotificationHub>>();

                    // Get all ReadyForDelivery orders that are more than 30 minutes old and have no delivery person assigned
                    var vietnamNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _vietnamTimeZone);
                    var thirtyMinutesAgo = vietnamNow.AddMinutes(-30);

                    var ordersToCancel = await dbContext.Orders
                        .Where(o => o.Status == "ReadyForDelivery" &&
                               TimeZoneInfo.ConvertTimeFromUtc(o.OrderDate, _vietnamTimeZone) < thirtyMinutesAgo &&
                               o.DeliveryPersonId == null)
                        .ToListAsync(stoppingToken);

                    foreach (var order in ordersToCancel)
                    {
                        order.Status = "Cancelled";

                        // Create notification for user
                        var notification = new Notification
                        {
                            UserId = order.UserId,
                            Message = $"Đơn hàng #{order.OrderId} đã bị hủy do không tìm được tài xế trong 30 phút.",
                            CreatedAt = vietnamNow,
                            IsRead = false
                        };

                        dbContext.Notifications.Add(notification);

                        // Create notification for restaurant
                        var restaurantNotification = new Notification
                        {
                            // Assuming the restaurant owner's ID is accessible through a relationship
                            // You may need to adjust this based on your actual data model
                            UserId = await dbContext.Restaurants
                                .Where(r => r.RestaurantId == order.RestaurantId)
                                .Select(r => r.SellerId)
                                .FirstOrDefaultAsync(stoppingToken),
                            Message = $"Đơn hàng #{order.OrderId} đã bị hủy do không tìm được tài xế trong 30 phút.",
                            CreatedAt = vietnamNow,
                            IsRead = false
                        };

                        dbContext.Notifications.Add(restaurantNotification);

                        // Log the cancellation
                        _logger.LogInformation($"Auto-cancelled order {order.OrderId} due to no delivery person acceptance within 30 minutes");
                    }

                    if (ordersToCancel.Any())
                    {
                        await dbContext.SaveChangesAsync(stoppingToken);

                        // Send notifications via SignalR
                        foreach (var order in ordersToCancel)
                        {
                            // Notify user
                            await hubContext.Clients.User(order.UserId.ToString())
                                .SendAsync("ReceiveNotification",
                                    $"Đơn hàng #{order.OrderId} đã bị hủy do không tìm được tài xế trong 30 phút.",
                                    cancellationToken: stoppingToken);

                            // Notify restaurant
                            await hubContext.Clients.Group($"Restaurant_{order.RestaurantId}")
                                .SendAsync("ReceiveNotification",
                                    $"Đơn hàng #{order.OrderId} đã bị hủy do không tìm được tài xế trong 30 phút.",
                                    cancellationToken: stoppingToken);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing ready-for-delivery orders for auto-cancellation");
            }
        }
    }
}