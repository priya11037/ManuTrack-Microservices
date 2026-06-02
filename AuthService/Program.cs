using AuthService.Data;
using AuthService.Repositories;
using AuthService.Repositories.Interfaces;
using AuthService.Services;
using AuthService.Services.Interfaces;
using ManuTrack.SharedKernel.Filters;
using ManuTrack.SharedKernel.Middleware;
using Microsoft.AspNetCore.Mvc;
using ManuTrack.SharedKernel.Responses;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ── Controllers + Global Exception Filter ─────────────────────────────────
builder.Services.AddControllers(options =>
{
    options.Filters.Add<GlobalExceptionFilter>();
    options.Filters.Add<ModelValidationFilter>();
});
builder.Services.Configure<ApiBehaviorOptions>(o => o.SuppressModelStateInvalidFilter = true);

// ── Database ───────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("GovernanceDb")));

// ── JWT Authentication ─────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(
                    ApiResponse.Fail("Authorization token is required."));
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = 403;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(
                    ApiResponse.Fail("Access denied. You do not have permission to perform this action."));
            }
        };
    });

builder.Services.AddAuthorization();

// ── CORS ───────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// ── Caching ────────────────────────────────────────────────────────────────
builder.Services.AddMemoryCache();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Auth Service", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ── Dependency Injection ───────────────────────────────────────────────────
builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<IAuthService, AuthServiceImpl>();

var app = builder.Build();

// ── Middleware Pipeline ────────────────────────────────────────────────────
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Auth Service v1"));

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    db.Database.Migrate();

    if (!db.Users.Any())
    {
        db.Users.AddRange(new[]
        {
            new AuthService.Models.AuthUser { Name="John Smith",   Email="john.smith@manutrack.com",  Role="Admin",             Phone="1234567891", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin@1234!", workFactor:4), IsActive=true  },
            new AuthService.Models.AuthUser { Name="Sarah Lee",    Email="sarah.lee@manutrack.com",   Role="ProductionPlanner", Phone="1234567892", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin@1234!", workFactor:4), IsActive=true  },
            new AuthService.Models.AuthUser { Name="Mike Johnson", Email="mike.j@manutrack.com",      Role="ShopFloorOperator", Phone="1234567893", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin@1234!", workFactor:4), IsActive=true  },
            new AuthService.Models.AuthUser { Name="Emily Clark",  Email="emily.c@manutrack.com",     Role="QualityInspector",  Phone="1234567894", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin@1234!", workFactor:4), IsActive=true  },
            new AuthService.Models.AuthUser { Name="Robert Chen",  Email="robert.c@manutrack.com",    Role="InventoryManager",  Phone="1234567895", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin@1234!", workFactor:4), IsActive=true  },
            new AuthService.Models.AuthUser { Name="Linda Brown",  Email="linda.b@manutrack.com",     Role="ComplianceOfficer", Phone="1234567896", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin@1234!", workFactor:4), IsActive=true  },
            new AuthService.Models.AuthUser { Name="Tom Wilson",   Email="tom.w@manutrack.com",       Role="ShopFloorOperator", Phone="1234567897", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin@1234!", workFactor:4), IsActive=false },
            new AuthService.Models.AuthUser { Name="Amy Zhang",    Email="amy.z@manutrack.com",       Role="QualityInspector",  Phone="1234567898", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin@1234!", workFactor:4), IsActive=true  },
            new AuthService.Models.AuthUser { Name="Carlos Ramos", Email="carlos.r@manutrack.com",    Role="ProductionPlanner", Phone="1234567899", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin@1234!", workFactor:4), IsActive=true  },
            new AuthService.Models.AuthUser { Name="Nina Patel",   Email="nina.p@manutrack.com",      Role="InventoryManager",  Phone="1234567800", PasswordHash=BCrypt.Net.BCrypt.HashPassword("Admin@1234!", workFactor:4), IsActive=false },
        });
        db.SaveChanges();
    }
}

app.Run();
