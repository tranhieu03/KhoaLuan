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
builder.Services.AddSingleton<EmailService>();
builder.Services.AddSingleton<MapService>();
builder.Services.AddHttpClient<IMoMoService, MoMoService>();
builder.Services.AddScoped<IMoMoService, MoMoService>();
builder.Services.Configure<MoMoOptionModel>(builder.Configuration.GetSection("MomoAPI"));
builder.Services.AddScoped<IVnPayService, VnPayService>();
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

app.UseHttpsRedirection();
app.UseRouting();
// Use the specific CORS policy
app.UseCors("AllowReactApp");

// Add Session Middleware
app.UseSession();

app.UseAuthorization();

app.MapControllers();
app.MapHub<KhoaLuan1.Hubs.ChatHub>("/chatHub");
app.MapHub<KhoaLuan1.Hubs.NotificationHub>("/notificationHub");

app.Run();
