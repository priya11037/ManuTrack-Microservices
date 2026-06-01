using System.Net.Http.Json;
using System.Security.Claims;
using ComplianceService.DTOs;
using ComplianceService.Models;
using ComplianceService.Repositories.Interfaces;
using ComplianceService.Services.Interfaces;
using ManuTrack.SharedKernel.Exceptions;
using ManuTrack.SharedKernel.Responses;
using Microsoft.AspNetCore.Http;

namespace ComplianceService.Services;

public class ComplianceReportServiceImpl(
    IComplianceReportRepository repo,
    IAuditRepository auditRepo,
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
    ILogger<ComplianceReportServiceImpl> logger) : IComplianceReportService
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

    private async Task WriteAuditAsync(string action, string entityId, string? details = null)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            await auditRepo.CreateAsync(new AuditEntry
            {
                UserID      = userId,
                UserName    = userName,
                Action      = action,
                EntityType  = "ComplianceReport",
                EntityID    = entityId,
                ServiceName = "ComplianceService",
                Details     = details,
                Severity    = "success",
                Timestamp   = DateTime.UtcNow
            });
        }
        catch (Exception ex) { logger.LogWarning(ex, "Audit write failed."); }
    }

    private async Task NotifyAsync(int userId, string title, string message)
    {
        try
        {
            var nc = AuthorizedClient("NotificationService");
            await nc.PostAsJsonAsync("api/v1/notifications", new
            {
                UserID = userId, Title = title, Message = message, Category = "Compliance"
            });
        }
        catch (Exception ex) { logger.LogWarning(ex, "Compliance notification failed."); }
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public async Task<ApiResponse<IEnumerable<ComplianceReportViewModel>>> GetAllAsync(
        string? status, string? reportType)
    {
        var reports = await repo.GetAllAsync(status, reportType);
        return ApiResponse<IEnumerable<ComplianceReportViewModel>>.Ok(reports.Select(Map));
    }

    public async Task<ApiResponse<ComplianceReportViewModel>> GetByIdAsync(int id)
    {
        var report = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Compliance report {id} not found.");
        return ApiResponse<ComplianceReportViewModel>.Ok(Map(report));
    }

    public async Task<ApiResponse<ComplianceReportViewModel>> CreateAsync(CreateComplianceReportRequest request)
    {
        var (userId, userName) = GetCurrentUser();

        // Auto-generate report number
        var nextId       = await repo.GetNextIdAsync();
        var reportNumber = $"CR-{nextId:D4}";

        var report = new ComplianceReport
        {
            ReportNumber       = reportNumber,
            Title              = request.Title,
            Type               = request.Type,
            Priority           = request.Priority,
            Status             = "Draft",
            Period             = request.Period,
            PreparedBy         = request.PreparedBy,
            ReviewedBy         = request.ReviewedBy ?? string.Empty,
            SubmissionDeadline = request.SubmissionDeadline,
            Findings           = request.Findings,
            Actions            = request.Actions,
            Notes              = request.Notes,
            CreatedDate        = DateTime.UtcNow,
        };

        var created = await repo.CreateAsync(report);

        await WriteAuditAsync("Created ComplianceReport", created.ReportID.ToString(),
            $"Report: {reportNumber}, Type: {request.Type}, PreparedBy: {request.PreparedBy}");

        return ApiResponse<ComplianceReportViewModel>.Ok(Map(created), "Compliance report created.");
    }

    public async Task<ApiResponse<ComplianceReportViewModel>> UpdateStatusAsync(
        int id, UpdateReportStatusRequest request)
    {
        var report = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Compliance report {id} not found.");

        var prevStatus = report.Status;
        report.Status      = request.Status;
        report.UpdatedDate = DateTime.UtcNow;

        // Set SubmittedDate when status advances to Submitted
        if (request.Status == "Submitted")
            report.SubmittedDate = DateTime.UtcNow;

        var updated = await repo.UpdateAsync(report);

        await WriteAuditAsync($"Status → {request.Status}", id.ToString(),
            $"Report: {report.ReportNumber}, {prevStatus} → {request.Status}");

        // Notify on key status transitions (fire-and-forget)
        var (userId, _) = GetCurrentUser();
        if (userId > 0)
        {
            if (request.Status == "Under Review")
                _ = Task.Run(() => NotifyAsync(userId,
                    "Report Sent for Review",
                    $"{report.ReportNumber} — {report.Title} is now Under Review."));

            if (request.Status == "Approved")
                _ = Task.Run(() => NotifyAsync(userId,
                    "Report Approved ✓",
                    $"{report.ReportNumber} — {report.Title} has been Approved."));

            if (request.Status == "Submitted")
                _ = Task.Run(() => NotifyAsync(userId,
                    "Report Submitted",
                    $"{report.ReportNumber} — {report.Title} has been submitted to regulatory authority."));

            if (request.Status == "Rejected")
                _ = Task.Run(() => NotifyAsync(userId,
                    "Report Rejected",
                    $"{report.ReportNumber} — {report.Title} was Rejected. Please revise and resubmit."));
        }

        return ApiResponse<ComplianceReportViewModel>.Ok(Map(updated), "Report status updated.");
    }

    public async Task<ApiResponse<ComplianceReportViewModel>> ApproveReportAsync(
        int id, ApproveReportRequest request)
    {
        var report = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Compliance report {id} not found.");

        report.Status      = "Approved";
        report.UpdatedDate = DateTime.UtcNow;
        var updated = await repo.UpdateAsync(report);

        await WriteAuditAsync("Approved ComplianceReport", id.ToString(), $"Report: {report.ReportNumber}");
        return ApiResponse<ComplianceReportViewModel>.Ok(Map(updated), "Report approved.");
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private static ComplianceReportViewModel Map(ComplianceReport r) => new()
    {
        ReportID           = r.ReportID,
        ReportNumber       = r.ReportNumber,
        Title              = r.Title,
        Type               = r.Type,
        Priority           = r.Priority,
        Status             = r.Status,
        Period             = r.Period,
        PreparedBy         = r.PreparedBy,
        ReviewedBy         = r.ReviewedBy,
        SubmissionDeadline = r.SubmissionDeadline,
        SubmittedDate      = r.SubmittedDate,
        Findings           = r.Findings,
        Actions            = r.Actions,
        Notes              = r.Notes,
        CreatedDate        = r.CreatedDate,
        UpdatedDate        = r.UpdatedDate,
    };
}
