namespace QualityService.Models;

public class Defect
{
    public int      DefectID       { get; set; }
    public int      InspectionID   { get; set; }
    public int      WorkOrderID    { get; set; }
    public string   ProductName    { get; set; } = string.Empty;
    public string   Severity       { get; set; } = string.Empty;  // Minor / Major / Critical
    public string   DefectType     { get; set; } = string.Empty;
    public int      DefectiveUnits { get; set; }
    public string   RootCause      { get; set; } = string.Empty;
    public string   ActionTaken    { get; set; } = string.Empty;  // Rework / Scrap / Accept / Hold
    public string   Status         { get; set; } = "Open";        // Open / In Progress / Resolved
    public string   ReportedBy     { get; set; } = string.Empty;
    public DateTime ReportedDate   { get; set; } = DateTime.UtcNow;
    public string?  Notes          { get; set; }
    public DateTime  CreatedDate   { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate   { get; set; }

    public Inspection? Inspection { get; set; }
}
