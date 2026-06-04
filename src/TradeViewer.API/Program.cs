using Microsoft.EntityFrameworkCore;
using TradeViewer.Application.Interfaces;
using TradeViewer.Application.Options;
using TradeViewer.Application.Services;
using TradeViewer.Infrastructure.Parsers;
using TradeViewer.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "TradeViewer API", Version = "v1" });
});

// SQLite via EF Core
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default") ?? "Data Source=tradeviewer.db"));

// Alpha Vantage options
builder.Services.AddSingleton(new AlphaVantageOptions(
    builder.Configuration["AlphaVantage:ApiKey"] ?? string.Empty));

// Clean Architecture registrations
builder.Services.AddScoped<ITradeRepository, TradeRepository>();
builder.Services.AddScoped<ITradeFileParser, CsvTradeParser>();
builder.Services.AddScoped<ITradeFileParser, XmlTradeParser>();
builder.Services.AddScoped<TradeService>();
builder.Services.AddScoped<RiskRewardService>();
builder.Services.AddHttpClient<ChartService>(client =>
{
    client.DefaultRequestHeaders.Add("User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    client.Timeout = TimeSpan.FromSeconds(10);
});

// CORS – allow React dev server
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// ── Migrations / DB init ─────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// ── Middleware ────────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("DevCors");
if (app.Environment.IsProduction())
    app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
