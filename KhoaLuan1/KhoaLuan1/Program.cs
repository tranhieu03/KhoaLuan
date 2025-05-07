using KhoaLuan1.Hubs;
using KhoaLuan1.Middleware;
using KhoaLuan1.Models;
using KhoaLuan1.Service;
using KhoaLuan1.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddHttpClient<ZaloPayService>();
builder.Services.AddScoped<ZaloPayService>();
builder.Services.AddScoped<EmailService>();
// Đăng ký HttpClient với cấu hình riêng cho MapService
builder.Services.AddHttpClient<MapService>(client =>
{
    client.BaseAddress = new Uri("https://rsapi.goong.io");
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// Đăng ký MapService
builder.Services.AddScoped<MapService>();
builder.Services.AddHostedService<OrderBackgroundService>();
builder.Services.AddHostedService<PaymentTimeoutService>();
builder.Services.AddScoped<VoucherService>();
builder.Services.AddScoped<VNPayService>();
builder.Services.AddScoped<IVnPayService, VNPayService>();
builder.Services.AddHostedService<OrderAutoCompletionService>();

builder.Services.AddHttpContextAccessor();
builder.Services.AddLogging(logging => logging.AddConsole());   


// Add DbContext
builder.Services.AddDbContext<KhoaLuan1.Models.KhoaluantestContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add In-Memory Cache and Session
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.Cookie.Name = ".KhoaLuan1.Session";
    options.Cookie.SameSite = SameSiteMode.None; // For cross-site requests
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always; // For HTTPS
    options.IdleTimeout = TimeSpan.FromMinutes(30); // Session timeout
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// Add CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("https://localhost:3000") // URL React App
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseStaticFiles();
app.UseHttpsRedirection();
app.UseRouting();
// Use the specific CORS policy
app.UseCors("AllowReactApp");

// Add Session Middleware
app.UseSession();
app.UseMiddleware<SignalRAuthMiddleware>();
app.UseAuthorization();

app.MapControllers();
app.MapHub<KhoaLuan1.Hubs.ChatHub>("/chatHub");
app.MapHub<NotificationHub>("/notificationHub");

app.Run();
