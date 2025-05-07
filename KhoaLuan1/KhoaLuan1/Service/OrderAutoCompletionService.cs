using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using KhoaLuan1.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace KhoaLuan1.Services
{
    public class OrderAutoCompletionService : BackgroundService
    {
        private readonly ILogger<OrderAutoCompletionService> _logger;
        private readonly IServiceProvider _serviceProvider;

        public OrderAutoCompletionService(
            ILogger<OrderAutoCompletionService> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Order Auto Completion Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("Order Auto Completion Service running at: {time}", DateTimeOffset.Now);

                await ProcessPendingOrders();

                // Chạy kiểm tra mỗi giờ
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }

            _logger.LogInformation("Order Auto Completion Service is stopping.");
        }

        private async Task ProcessPendingOrders()
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<KhoaluantestContext>();

                // Tìm các đơn hàng ở trạng thái Delivered đã quá 8 giờ
                var cutoffTime = DateTime.UtcNow.AddHours(-8);

                var ordersToComplete = await dbContext.Orders
                    .Where(o => o.Status == "Delivered" &&
                           o.OrderDate != null &&
                           o.OrderDate.AddHours(8) < DateTime.UtcNow)
                    .ToListAsync();

                if (ordersToComplete.Any())
                {
                    _logger.LogInformation("Found {Count} orders to auto-complete", ordersToComplete.Count);

                    foreach (var order in ordersToComplete)
                    {
                        order.Status = "Completed";

                        // Cập nhật trạng thái thanh toán nếu là COD
                        if (order.PaymentMethod == "COD" && order.PaymentStatus == "Unpaid")
                        {
                            order.PaymentStatus = "Paid";
                        }

                        // Tạo thông báo tự động
                        if (order.UserId !=0)
                        {
                            var notificationToCustomer = new Notification
                            {
                                UserId = order.UserId,
                                Message = $"Đơn hàng #{order.OrderId} đã được tự động xác nhận hoàn thành.",
                                CreatedAt = DateTime.UtcNow,
                                IsRead = false
                            };
                            dbContext.Notifications.Add(notificationToCustomer);
                        }

                        if (order.DeliveryPersonId.HasValue)
                        {
                            var notificationToDeliveryPerson = new Notification
                            {
                                UserId = order.DeliveryPersonId.Value,
                                Message = $"Đơn hàng #{order.OrderId} đã được tự động xác nhận hoàn thành.",
                                CreatedAt = DateTime.UtcNow,
                                IsRead = false
                            };
                            dbContext.Notifications.Add(notificationToDeliveryPerson);
                        }

                        _logger.LogInformation("Auto-completed order {OrderId}", order.OrderId);
                    }

                    await dbContext.SaveChangesAsync();
                }
                else
                {
                    _logger.LogInformation("No orders to auto-complete at this time");
                }
            }
        }
    }
}