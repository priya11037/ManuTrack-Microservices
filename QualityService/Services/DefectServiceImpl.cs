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

public class DefectServiceImpl(
    IDefectRepository defectRepo,
    IInspectionRepository inspectionRepo,
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
    ILogger<DefectServiceImpl> logger) : IDefectService
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

    public async Task<ApiResponse<IEnumerable<DefectViewModel>>> GetAllAsync(string? status, string? severity)
    {
        var defects = await defectRepo.GetAllAsync(status, severity);
        return ApiResponse<IEnumerable<DefectViewModel>>.Ok(defects.Select(Map));
    }

    public async Task<ApiResponse<DefectViewModel>> GetByIdAsync(int id)
    {
        var defect = await defectRepo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Defect {id} not found.");
        return ApiResponse<DefectViewModel>.Ok(Map(defect));
    }

    public async Task<ApiResponse<IEnumerable<DefectViewModel>>> GetByInspectionIdAsync(int inspectionId)
    {
        if (!await inspectionRepo.ExistsAsync(inspectionId))
            throw new NotFoundException($"Inspection {inspectionId} not found.");
        var defects = await defectRepo.GetByInspectionIdAsync(inspectionId);
        return ApiResponse<IEnumerable<DefectViewModel>>.Ok(defects.Select(Map));
    }

    public async Task<ApiResponse<DefectViewModel>> CreateAsync(CreateDefectRequest request)
    {
        var inspection = await inspectionRepo.GetByIdWithDefectsAsync(request.InspectionID)
            ?? throw new NotFoundException($"Inspection {request.InspectionID} not found.");

        var defect = new Defect
        {
            InspectionID   = request.InspectionID,
            WorkOrderID    = request.WorkOrderID > 0 ? request.WorkOrderID : inspection.WorkOrderID,
            ProductName    = inspection.ProductName,
            Severity       = request.Severity,
            DefectType     = request.DefectType,
            DefectiveUnits = request.DefectiveUnits,
            RootCause      = request.RootCause,
            ActionTaken    = request.ActionTaken,
            Status         = "Open",
            ReportedBy     = request.ReportedBy,
            ReportedDate   = DateTime.UtcNow,
            Notes          = request.Notes,
            CreatedDate    = DateTime.UtcNow,
        };

        var created = await defectRepo.CreateAsync(defect);

        await LogAuditAsync("Logged Defect", "Defect", created.DefectID.ToString(),
            $"INS: {request.InspectionID}, Severity: {request.Severity}, Action: {request.ActionTaken}");

        // ── Notify SFO if action is Rework (QI → SFO connection) ─────────────
        if (request.ActionTaken == "Rework")
            _ = Task.Run(() => NotifyReworkRequiredAsync(created, inspection));

        // ── If Critical, also put WO On Hold ──────────────────────────────────
        if (request.Severity == "Critical")
            _ = Task.Run(() => HandleCriticalDefectAsync(created.DefectID, created.WorkOrderID));

        return ApiResponse<DefectViewModel>.Ok(Map(created), "Defect logged.");
    }

    public async Task<ApiResponse<DefectViewModel>> UpdateStatusAsync(int id, UpdateDefectStatusRequest request)
    {
        var defect = await defectRepo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Defect {id} not found.");

        defect.Status      = request.Status;
        defect.UpdatedDate = DateTime.UtcNow;

        var updated = await defectRepo.UpdateAsync(defect);

        await LogAuditAsync("Updated Defect Status", "Defect", id.ToString(), $"Status: {request.Status}");
        return ApiResponse<DefectViewModel>.Ok(Map(updated), "Defect status updated.");
    }

    public async Task<ApiResponse<DefectViewModel>> ResolveAsync(int id, ResolveDefectRequest request)
    {
        var defect = await defectRepo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Defect {id} not found.");

        defect.Status      = "Resolved";
        defect.Notes       = request.Notes ?? defect.Notes;
        defect.UpdatedDate = DateTime.UtcNow;

        var updated = await defectRepo.UpdateAsync(defect);

        await LogAuditAsync("Resolved Defect", "Defect", id.ToString(), "Status: Resolved");
        return ApiResponse<DefectViewModel>.Ok(Map(updated), "Defect resolved.");
    }

    // ── Notify SFO: Rework required (QI → SFO connection) ────────────────────
    private async Task NotifyReworkRequiredAsync(Defect defect, Inspection inspection)
    {
        try
        {
            var (userId, _) = GetCurrentUser();
            if (userId == 0) return;

            var nc = AuthorizedClient("NotificationService");
            await nc.PostAsJsonAsync("api/v1/notifications", new
            {
                UserID   = userId,
                Title    = "Rework Required",
                Message  = $"DEF-{defect.DefectID:D4}: {defect.DefectiveUnits} unit(s) of {inspection.ProductName} need rework. " +
                           $"Type: {defect.DefectType}. WO: WO-{inspection.WorkOrderID:D4}.",
                Category = "Quality"
            });
        }
        catch (Exception ex) { logger.LogWarning(ex, "Rework notification failed for defect {DefectId}.", defect.DefectID); }
    }

    // ── Put WO On Hold when Critical defect logged ────────────────────────────
    private async Task HandleCriticalDefectAsync(int defectId, int workOrderId)
    {
        try
        {
            var (userId, _) = GetCurrentUser();

            // Notify
            if (userId > 0)
            {
                var nc = AuthorizedClient("NotificationService");
                await nc.PostAsJsonAsync("api/v1/notifications", new
                {
                    UserID   = userId,
                    Title    = "Critical Defect — WO On Hold",
                    Message  = $"DEF-{defectId:D4} is Critical. WO-{workOrderId:D4} has been put On Hold automatically.",
                    Category = "Quality"
                });
            }

            // Put WO On Hold
            var wc = AuthorizedClient("WorkOrderService");
            await wc.PutAsJsonAsync($"api/v1/workorders/{workOrderId}/status", new { Status = "On Hold" });
        }
        catch (Exception ex) { logger.LogWarning(ex, "Critical defect handling failed for WO {WorkOrderId}.", workOrderId); }
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private static DefectViewModel Map(Defect d) => new()
    {
        DefectID       = d.DefectID,
        InspectionID   = d.InspectionID,
        WorkOrderID    = d.WorkOrderID,
        ProductName    = d.ProductName,
        Severity       = d.Severity,
        DefectType     = d.DefectType,
        DefectiveUnits = d.DefectiveUnits,
        RootCause      = d.RootCause,
        ActionTaken    = d.ActionTaken,
        Status         = d.Status,
        ReportedBy     = d.ReportedBy,
        ReportedDate   = d.ReportedDate,
        Notes          = d.Notes,
        CreatedDate    = d.CreatedDate,
        UpdatedDate    = d.UpdatedDate,
    };
}
