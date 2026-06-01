namespace QualityService.Models;

public class Inspection
{
    public int      InspectionID  { get; set; }
    public int      WorkOrderID   { get; set; }
    public string   ProductName   { get; set; } = string.Empty;
    public string   Sku           { get; set; } = string.Empty;
    public int      Quantity      { get; set; }
    public string   Priority      { get; set; } = "Medium";   // Low / Medium / High / Critical
    public string   InspectorName { get; set; } = string.Empty;
    public DateTime ScheduledDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public string   Status        { get; set; } = "Pending";  // Pending / In Review / Passed / Failed
    public string?  Notes         { get; set; }
    public DateTime  CreatedDate  { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate  { get; set; }

    public ICollection<Defect> Defects { get; set; } = new List<Defect>();
}
