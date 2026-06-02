namespace WorkOrderService.Models;

public class WorkOrder
{
    public int WorkOrderID { get; set; }
    public string WoNumber { get; set; } = string.Empty;   // e.g. WO-0001
    public int ProductID { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;        // product SKU reference
    public int Quantity { get; set; }
    public int ProducedQty { get; set; } = 0;              // units produced so far
    public string Priority { get; set; } = "Medium";       // Low | Medium | High | Critical
    public string ProductionLine { get; set; } = string.Empty; // Line A | B | C | D
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public DateTime? EstimatedStartDate { get; set; }
    public DateTime? EstimatedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? AssignedTo { get; set; }
    public int? AssignedOperatorID { get; set; }
    public string? CreatedBy { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedDate { get; set; }
    public int? ProductionLineID { get; set; }                  // FK to ProductionLines table
    public ICollection<WorkOrderTask> Tasks { get; set; } = new List<WorkOrderTask>();
    public ICollection<WorkOrderFlag> Flags { get; set; } = new List<WorkOrderFlag>();
    public ICollection<WorkOrderStep> Steps { get; set; } = new List<WorkOrderStep>();
}
