using System.ComponentModel.DataAnnotations;

namespace ComplianceService.DTOs;

// ── Compliance Report DTOs ────────────────────────────────────────────────────

public class CreateComplianceReportRequest
{
    [Required][StringLength(200, MinimumLength = 3)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(Quality|Safety|Environmental|Production|Supplier)$",
        ErrorMessage = "Type must be: Quality, Safety, Environmental, Production, or Supplier.")]
    public string Type { get; set; } = string.Empty;

    [RegularExpression("^(Low|Medium|High|Critical)$")]
    public string Priority { get; set; } = "Medium";

    [Required][StringLength(100)]
    public string Period { get; set; } = string.Empty;

    [Required][StringLength(200)]
    public string PreparedBy { get; set; } = string.Empty;

    [StringLength(200)]
    public string? ReviewedBy { get; set; }

    [Required]
    public DateTime SubmissionDeadline { get; set; }

    public int Findings { get; set; }
    public int Actions  { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public class UpdateReportStatusRequest
{
    [Required]
    [RegularExpression("^(Draft|Under Review|Approved|Submitted|Rejected)$",
        ErrorMessage = "Status must be: Draft, Under Review, Approved, Submitted, or Rejected.")]
    public string Status { get; set; } = string.Empty;
}

// Kept for backward compat with /approve endpoint
public class ApproveReportRequest
{
    [StringLength(200)]
    public string? ApprovedBy { get; set; }
}

public class ComplianceReportViewModel
{
    public int      ReportID           { get; set; }
    public string   ReportNumber       { get; set; } = string.Empty;
    public string   Title              { get; set; } = string.Empty;
    public string   Type               { get; set; } = string.Empty;
    public string   Priority           { get; set; } = string.Empty;
    public string   Status             { get; set; } = string.Empty;
    public string   Period             { get; set; } = string.Empty;
    public string   PreparedBy         { get; set; } = string.Empty;
    public string   ReviewedBy         { get; set; } = string.Empty;
    public DateTime  SubmissionDeadline { get; set; }
    public DateTime? SubmittedDate      { get; set; }
    public int       Findings           { get; set; }
    public int       Actions            { get; set; }
    public string?   Notes              { get; set; }
    public DateTime  CreatedDate        { get; set; }
    public DateTime? UpdatedDate        { get; set; }
}

// ── Audit DTOs ────────────────────────────────────────────────────────────────

public class LogAuditEntryRequest
{
    [Range(0, int.MaxValue)]
    public int UserID { get; set; }

    [StringLength(200)]
    public string UserName { get; set; } = string.Empty;

    [Required][StringLength(200, MinimumLength = 2)]
    public string Action { get; set; } = string.Empty;

    [Required][StringLength(100, MinimumLength = 2)]
    public string EntityType { get; set; } = string.Empty;

    [Required][StringLength(100)]
    public string EntityID { get; set; } = string.Empty;

    [StringLength(100)]
    public string ServiceName { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? Details { get; set; }

    // Optional — defaults to "info" if not provided
    public string Severity  { get; set; } = "info";
    public string IpAddress { get; set; } = string.Empty;
}

public class AuditEntryViewModel
{
    public int      AuditID     { get; set; }
    public int      UserID      { get; set; }
    public string   UserName    { get; set; } = string.Empty;
    public string   Action      { get; set; } = string.Empty;
    public string   EntityType  { get; set; } = string.Empty;
    public string   EntityID    { get; set; } = string.Empty;
    public string   ServiceName { get; set; } = string.Empty;
    public string?  Details     { get; set; }
    public string   Severity    { get; set; } = "info";
    public string   IpAddress   { get; set; } = string.Empty;
    public DateTime Timestamp   { get; set; }
}
