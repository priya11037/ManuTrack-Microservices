using ComplianceService.DTOs;
using ComplianceService.Models;
using ComplianceService.Repositories.Interfaces;
using ComplianceService.Services.Interfaces;
using ManuTrack.SharedKernel.Exceptions;
using ManuTrack.SharedKernel.Responses;

namespace ComplianceService.Services;

public class AuditServiceImpl(IAuditRepository repo) : IAuditService
{
    public async Task<ApiResponse<IEnumerable<AuditEntryViewModel>>> GetAllAsync(
        string? userId, string? serviceName, DateTime? from, DateTime? to,
        string? entityType, string? action, string? entityId)
    {
        var entries = await repo.GetAllAsync(userId, serviceName, from, to, entityType, action, entityId);
        return ApiResponse<IEnumerable<AuditEntryViewModel>>.Ok(entries.Select(Map));
    }

    public async Task<ApiResponse<AuditEntryViewModel>> GetByIdAsync(int id)
    {
        var entry = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Audit entry {id} not found.");
        return ApiResponse<AuditEntryViewModel>.Ok(Map(entry));
    }

    public async Task<ApiResponse<AuditEntryViewModel>> LogAsync(LogAuditEntryRequest request)
    {
        // Auto-derive severity from action if not provided
        var severity = string.IsNullOrWhiteSpace(request.Severity) ? "info" : request.Severity;
        if (severity == "info")
        {
            var a = request.Action.ToLower();
            if (a.Contains("delete") || a.Contains("cancel") || a.Contains("reject"))
                severity = "warning";
            else if (a.Contains("create") || a.Contains("approve") || a.Contains("complete"))
                severity = "success";
            else if (a.Contains("fail") || a.Contains("error") || a.Contains("denied"))
                severity = "error";
        }

        var entry = new AuditEntry
        {
            UserID      = request.UserID,
            UserName    = request.UserName,
            Action      = request.Action,
            EntityType  = request.EntityType,
            EntityID    = request.EntityID,
            ServiceName = request.ServiceName,
            Details     = request.Details,
            Severity    = severity,
            IpAddress   = request.IpAddress,
            Timestamp   = DateTime.UtcNow
        };

        var created = await repo.CreateAsync(entry);
        return ApiResponse<AuditEntryViewModel>.Ok(Map(created), "Audit entry logged.");
    }

    private static AuditEntryViewModel Map(AuditEntry a) => new()
    {
        AuditID     = a.AuditID,
        UserID      = a.UserID,
        UserName    = a.UserName,
        Action      = a.Action,
        EntityType  = a.EntityType,
        EntityID    = a.EntityID,
        ServiceName = a.ServiceName,
        Details     = a.Details,
        Severity    = a.Severity,
        IpAddress   = a.IpAddress,
        Timestamp   = a.Timestamp
    };
}
