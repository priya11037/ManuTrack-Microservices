namespace WorkOrderService.Models;

/// <summary>
/// Persists an operator's flagged issue on a work order.
/// Replaces the previous frontend-only in-memory flag that was lost on page reload.
/// </summary>
public class WorkOrderFlag
{
    public int WorkOrderFlagID { get; set; }
    public int WorkOrderID { get; set; }
    public string Reason { get; set; } = string.Empty;         // operator's description of the issue
    public string FlaggedBy { get; set; } = string.Empty;      // operator name / user reference
    public int? FlaggedByUserID { get; set; }                  // optional UserID from AuthService
    public string Status { get; set; } = "Open";               // Open | Resolved | Dismissed
    public string? Resolution { get; set; }                    // filled in when resolved
    public DateTime FlaggedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedDate { get; set; }
    public WorkOrder? WorkOrder { get; set; }
}
