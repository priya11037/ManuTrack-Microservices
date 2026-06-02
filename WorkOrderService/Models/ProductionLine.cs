namespace WorkOrderService.Models;

/// <summary>
/// Replaces the hardcoded ['Line A','Line B','Line C','Line D'] array in the frontend.
/// Enables dynamic production line management (add/rename/deactivate lines).
/// </summary>
public class ProductionLine
{
    public int LineID { get; set; }
    public string LineName { get; set; } = string.Empty;       // e.g. "Line A"
    public string? Description { get; set; }
    public int Capacity { get; set; } = 0;                     // max concurrent work orders
    public string Status { get; set; } = "Active";             // Active | Maintenance | Inactive
    public string? Location { get; set; }                      // physical location in factory
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedDate { get; set; }
    public ICollection<WorkOrder> WorkOrders { get; set; } = new List<WorkOrder>();
}
