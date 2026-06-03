using System.Net.Http.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using ManuTrack.SharedKernel.Exceptions;
using ManuTrack.SharedKernel.Responses;
using QualityService.DTOs;
using QualityService.Models;
using QualityService.Repositories.Interfaces;
using QualityService.Services.Interfaces;

namespace QualityService.Services;

public class InspectionServiceImpl(
    IInspectionRepository repo,
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
    ILogger<InspectionServiceImpl> logger) : IInspectionService
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private string? GetBearerToken()
    {
        var auth = httpContextAccessor.HttpContext?.Request.Headers["Authorization"].ToString();
        return auth?.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) == true
            ? auth["Bearer ".Length..] : null;
    }

    private (int UserId, string UserName) GetCurrentUser()
    {
        var user  = httpContextAccessor.HttpContext?.User;
        var idVal = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? user?.FindFirst("sub")?.Value;
        var name  = user?.FindFirst(ClaimTypes.Name)?.Value ?? user?.FindFirst("name")?.Value ?? "Unknown";
        int.TryParse(idVal, out var id);
        return (id, name);
    }

    private HttpClient AuthorizedClient(string name)
    {
        var client = httpClientFactory.CreateClient(name);
        var token  = GetBearerToken();
        if (token != null)
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task LogAuditAsync(string action, string entity, string id, string? details = null)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            if (userId == 0) return;
            var c = AuthorizedClient("ComplianceService");
            await c.PostAsJsonAsync("api/v1/audit", new
            {
                UserID = userId, UserName = userName, Action = action,
                EntityType = entity, EntityID = id, ServiceName = "QualityService", Details = details
            });
        }
        catch (Exception ex) { logger.LogWarning(ex, "Audit log failed."); }
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public async Task<ApiResponse<IEnumerable<InspectionViewModel>>> GetAllAsync(string? status, int? workOrderId)
    {
        var items = await repo.GetAllAsync(status, workOrderId);
        return ApiResponse<IEnumerable<InspectionViewModel>>.Ok(items.Select(Map));
    }

    public async Task<ApiResponse<InspectionViewModel>> GetByIdAsync(int id)
    {
        var ins = await repo.GetByIdWithDefectsAsync(id)
            ?? throw new NotFoundException($"Inspection {id} not found.");
        return ApiResponse<InspectionViewModel>.Ok(Map(ins));
    }

    public async Task<ApiResponse<InspectionViewModel>> CreateAsync(CreateInspectionRequest request)
    {
        // Try to get product name from WorkOrderService (non-blocking — fire-and-forget)
        var productName = string.Empty;
        var sku         = string.Empty;
        try
        {
            var woClient = AuthorizedClient("WorkOrderService");
            var woResp   = await woClient.GetAsync($"api/v1/workorders/{request.WorkOrderID}");
            if (woResp.IsSuccessStatusCode)
            {
                var woResult = await woResp.Content.ReadFromJsonAsync<WoResponseDto>(
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                productName = woResult?.Data?.ProductName ?? string.Empty;
                sku         = woResult?.Data?.Sku         ?? string.Empty;
            }
        }
        catch (Exception ex) { logger.LogWarning(ex, "Could not fetch WO {Id} for product name.", request.WorkOrderID); }

        var inspection = new Inspection
        {
            WorkOrderID   = request.WorkOrderID,
            ProductName   = productName,
            Sku           = sku,
            Quantity      = request.Quantity,
            Priority      = request.Priority,
            InspectorName = request.InspectorName,
            ScheduledDate = request.ScheduledDate,
            Status        = "Pending",
            Notes         = request.Notes,
            CreatedDate   = DateTime.UtcNow,
        };

        var created = await repo.CreateAsync(inspection);

        await LogAuditAsync("Created Inspection", "Inspection", created.InspectionID.ToString(),
            $"WO: {request.WorkOrderID}, Inspector: {request.InspectorName}");

        return ApiResponse<InspectionViewModel>.Ok(Map(created), "Inspection created.");
    }

    public async Task<ApiResponse<InspectionViewModel>> UpdateResultAsync(int id, UpdateInspectionStatusRequest request)
    {
        var inspection = await repo.GetByIdWithDefectsAsync(id)
            ?? throw new NotFoundException($"Inspection {id} not found.");

        inspection.Status      = request.Status;
        if (request.Notes != null) inspection.Notes = request.Notes;
        inspection.UpdatedDate = DateTime.UtcNow;

        if (request.Status is "Passed" or "Failed")
            inspection.CompletedDate = DateTime.UtcNow;

        var updated = await repo.UpdateAsync(inspection);

        await LogAuditAsync("Updated Inspection Status", "Inspection", id.ToString(),
            $"Status: {request.Status}, WO: {inspection.WorkOrderID}");

        // Notify if Failed
        if (request.Status == "Failed")
        {
            try
            {
                var (userId, _) = GetCurrentUser();
                if (userId > 0)
                {
                    var nc = AuthorizedClient("NotificationService");
                    await nc.PostAsJsonAsync("api/v1/notifications", new
                    {
                        UserID   = userId,
                        Title    = "Inspection Failed",
                        Message  = $"INS-{id:D4} failed for WO-{inspection.WorkOrderID:D4} ({inspection.ProductName}). Please log defects.",
                        Category = "Quality"
                    });
                }
            }
            catch (Exception ex) { logger.LogWarning(ex, "Failed-inspection notification error."); }
        }

        return ApiResponse<InspectionViewModel>.Ok(Map(updated), "Inspection status updated.");
    }

    public async Task<ApiResponse<InspectionViewModel>> ReassignAsync(int id, ReassignInspectionRequest request)
    {
        var inspection = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Inspection {id} not found.");

        var previousInspector = inspection.InspectorName;
        inspection.InspectorName = request.InspectorName;
        inspection.UpdatedDate   = DateTime.UtcNow;

        var updated = await repo.UpdateAsync(inspection);

        await LogAuditAsync("Reassigned Inspection", "Inspection", id.ToString(),
            $"Inspector changed from '{previousInspector}' to '{request.InspectorName}'" +
            (string.IsNullOrEmpty(request.Reason) ? "" : $". Reason: {request.Reason}"));

        return ApiResponse<InspectionViewModel>.Ok(Map(updated), "Inspection reassigned successfully.");
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private static InspectionViewModel Map(Inspection i) => new()
    {
        InspectionID  = i.InspectionID,
        WorkOrderID   = i.WorkOrderID,
        ProductName   = i.ProductName,
        Sku           = i.Sku,
        Quantity      = i.Quantity,
        Priority      = i.Priority,
        InspectorName = i.InspectorName,
        ScheduledDate = i.ScheduledDate,
        CompletedDate = i.CompletedDate,
        Status        = i.Status,
        Notes         = i.Notes,
        CreatedDate   = i.CreatedDate,
        UpdatedDate   = i.UpdatedDate,
        DefectsLogged = i.Defects.Count,
    };

    // ── Local DTOs for WorkOrderService response ──────────────────────────────
    private sealed class WoResponseDto { public WoDataDto? Data { get; set; } }
    private sealed class WoDataDto
    {
        public string ProductName { get; set; } = string.Empty;
        public string Sku         { get; set; } = string.Empty;
    }
}
