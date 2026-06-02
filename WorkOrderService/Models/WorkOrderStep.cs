namespace WorkOrderService.Models;

/// <summary>
/// Persists work order execution steps that were previously hardcoded on the frontend.
/// Enables Flow 1 completion check: WO cannot be Completed unless all steps are done.
/// </summary>
public class WorkOrderStep
{
    public int StepID { get; set; }
    public int WorkOrderID { get; set; }
    public int Sequence { get; set; }                           // display order (1, 2, 3 ...)
    public string Label { get; set; } = string.Empty;          // e.g. "Machine setup & calibration"
    public bool IsCompleted { get; set; } = false;
    public DateTime? CompletedDate { get; set; }
    public string? CompletedBy { get; set; }                   // operator name
    public int? CompletedByUserID { get; set; }                // optional UserID from AuthService
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public WorkOrder? WorkOrder { get; set; }
}
