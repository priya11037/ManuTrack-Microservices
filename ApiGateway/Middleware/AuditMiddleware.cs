using ApiGateway.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

namespace ApiGateway.Middleware;

public class AuditMiddleware(RequestDelegate next, IConfiguration config)
{
    // Only log state-changing methods + failed auth attempts
    private static readonly HashSet<string> _auditMethods = ["POST", "PUT", "PATCH", "DELETE"];

    // Map URL segments to human-readable entity types
    private static readonly Dictionary<string, string> _entityMap = new()
    {
        { "auth/login",       "Auth"           },
        { "auth/users",       "Users"          },
        { "auth/register",    "Users"          },
        { "workorders",       "WorkOrders"     },
        { "tasks",            "Tasks"          },
        { "products",         "Products"       },
        { "bom",              "BOM"            },
        { "inventory",        "Inventory"      },
        { "purchase-orders",  "PurchaseOrders" },
        { "inspections",      "Quality"        },
        { "defects",          "Quality"        },
        { "compliance",       "Compliance"     },
        { "audit-logs",       "AuditLogs"      },
        { "notifications",    "Notifications"  },
        { "analytics",        "Analytics"      },
    };

    public async Task InvokeAsync(HttpContext context, IServiceScopeFactory scopeFactory)
    {
        await next(context);  // Let the request complete first

        // Skip non-auditable requests
        if (!ShouldAudit(context)) return;

        // Fire-and-forget so audit never blocks the response
        _ = WriteAuditAsync(context, scopeFactory);
    }

    private bool ShouldAudit(HttpContext context)
    {
        var method = context.Request.Method.ToUpper();

        // Always log failed authentication (401/403) regardless of method
        if (context.Response.StatusCode is 401 or 403) return true;

        // Log all state-changing requests
        return _auditMethods.Contains(method);
    }

    private async Task WriteAuditAsync(HttpContext context, IServiceScopeFactory scopeFactory)
    {
        try
        {
            var (userId, userName) = DecodeJwt(context);
            var entityType         = GetEntityType(context.Request.Path);
            var entityId           = ExtractEntityId(context.Request.Path);
            var action             = GetAction(context);
            var details            = BuildDetails(context, userName, entityType, action);
            var ipAddress          = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<GatewayAuditDbContext>();

            db.AuditEntries.Add(new GatewayAuditEntry
            {
                UserID      = userId,
                UserName    = userName,
                Action      = action,
                EntityType  = entityType,
                EntityID    = entityId,
                ServiceName = "ApiGateway",
                Details     = details,
                Timestamp   = DateTime.UtcNow,
            });

            await db.SaveChangesAsync();
        }
        catch
        {
            // Audit failure must NEVER crash the gateway
        }
    }

    // ── JWT decoding ─────────────────────────────────────────────────────────────
    private (int userId, string userName) DecodeJwt(HttpContext context)
    {
        var authHeader = context.Request.Headers.Authorization.ToString();
        if (!authHeader.StartsWith("Bearer ")) return (0, "Anonymous");

        var token   = authHeader["Bearer ".Length..];
        var key     = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var handler = new JwtSecurityTokenHandler();

        try
        {
            handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey         = key,
                ValidateIssuer           = false,
                ValidateAudience         = false,
                ValidateLifetime         = false, // Already validated by downstream
            }, out var validatedToken);

            var jwt    = (JwtSecurityToken)validatedToken;
            var name   = jwt.Claims.FirstOrDefault(c => c.Type == "name"
                          || c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")?.Value
                          ?? "Unknown";
            var idStr  = jwt.Claims.FirstOrDefault(c => c.Type == "sub"
                          || c.Type == "nameid"
                          || c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value
                          ?? "0";

            return (int.TryParse(idStr, out var id) ? id : 0, name);
        }
        catch
        {
            return (0, "Anonymous");
        }
    }

    // ── URL → Entity Type ────────────────────────────────────────────────────────
    private static string GetEntityType(PathString path)
    {
        var lower = path.ToString().ToLower();
        foreach (var (key, value) in _entityMap)
        {
            if (lower.Contains(key)) return value;
        }
        return "System";
    }

    // ── Extract entity ID from URL ─────────────────────────────────────────────
    private static string ExtractEntityId(PathString path)
    {
        var segments = path.ToString().Split('/', StringSplitOptions.RemoveEmptyEntries);
        // Last segment is often the ID (numeric)
        return segments.LastOrDefault(s => int.TryParse(s, out _)) ?? "0";
    }

    // ── HTTP Method + Status → Action ────────────────────────────────────────────
    private static string GetAction(HttpContext context)
    {
        var method = context.Request.Method.ToUpper();
        var status = context.Response.StatusCode;
        var path   = context.Request.Path.ToString().ToLower();

        if (status == 401) return "Unauthorized Access";
        if (status == 403) return "Access Denied";

        return method switch
        {
            "POST"   when path.Contains("login")    => "Login",
            "POST"   when path.Contains("register") => "Register User",
            "POST"                                   => "Create",
            "PUT"    when path.Contains("status")   => "Status Change",
            "PUT"    when path.Contains("activate") => "Activate",
            "PUT"    when path.Contains("deactivate") => "Deactivate",
            "PUT"    when path.Contains("approve")  => "Approve",
            "PUT"                                    => "Update",
            "PATCH"                                  => "Update",
            "DELETE"                                 => "Delete",
            _                                        => method,
        };
    }

    // ── Human-readable detail string ─────────────────────────────────────────────
    private static string BuildDetails(HttpContext context, string userName,
        string entityType, string action)
    {
        var path   = context.Request.Path.ToString();
        var status = context.Response.StatusCode;
        var method = context.Request.Method.ToUpper();

        if (status == 401)
            return $"{userName} attempted to access a restricted resource — authentication required";
        if (status == 403)
            return $"{userName} does not have permission to access {entityType}";

        // Login / register
        if (action == "Login")
            return $"{userName} logged in successfully";
        if (action == "Register User")
            return $"{userName} registered a new user account";

        // CRUD actions with entity-specific descriptions
        var entityLabel = entityType switch
        {
            "WorkOrders"    => "work order",
            "Tasks"         => "work order task",
            "Products"      => "product",
            "BOM"           => "BOM item",
            "Inventory"     => "inventory item",
            "PurchaseOrders"=> "purchase order",
            "Quality"       => path.Contains("defect") ? "defect" : "inspection",
            "Compliance"    => "compliance report",
            "Notifications" => "notification",
            "Analytics"     => "analytics record",
            "Users"         => "user",
            _               => entityType.ToLower(),
        };

        return action switch
        {
            "Create"        => $"{userName} created a new {entityLabel}",
            "Update"        => $"{userName} updated a {entityLabel}",
            "Status Change" => $"{userName} changed the status of a {entityLabel}",
            "Activate"      => $"{userName} activated a {entityLabel}",
            "Deactivate"    => $"{userName} deactivated a {entityLabel}",
            "Approve"       => $"{userName} approved a {entityLabel}",
            "Delete"        => $"{userName} deleted a {entityLabel}",
            _               => $"{userName} performed {action} on {entityLabel}",
        };
    }
}
