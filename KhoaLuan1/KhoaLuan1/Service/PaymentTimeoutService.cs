using KhoaLuan1.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace KhoaLuan1.Service
{
    public class PaymentTimeoutService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PaymentTimeoutService> _logger;

        public PaymentTimeoutService(
            IServiceScopeFactory scopeFactory,
            ILogger<PaymentTimeoutService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var dbContext = scope.ServiceProvider
                            .GetRequiredService<KhoaluantestContext>();

                        // Tìm các đơn hàng Pending quá 15 phút
                        var timeoutOrders = await dbContext.Orders
                            .Where(o => o.PaymentStatus == "Pending" &&
                                        o.OrderDate < DateTime.UtcNow.AddMinutes(-15))
                            .ToListAsync();

                        foreach (var order in timeoutOrders)
                        {
                            order.PaymentStatus = "Failed";
                            order.Status = "Cancelled";
                            _logger.LogInformation(
                                "Đơn hàng {OrderId} đã bị hủy do quá hạn thanh toán",
                                order.OrderId);
                        }

                        if (timeoutOrders.Any())
                        {
                            await dbContext.SaveChangesAsync();
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi khi xử lý đơn hàng quá hạn");
                }

                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }
    }
}