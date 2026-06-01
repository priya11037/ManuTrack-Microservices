using System.ComponentModel.DataAnnotations;

namespace QualityService.DTOs;

public class CreateDefectRequest
{
    [Required][Range(1, int.MaxValue)]
    public int InspectionID { get; set; }

    [Range(0, int.MaxValue)]
    public int WorkOrderID { get; set; }

    [Required]
    [RegularExpression("^(Minor|Major|Critical)$",
        ErrorMessage = "Severity must be: Minor, Major, or Critical.")]
    public string Severity { get; set; } = string.Empty;

    [Required][StringLength(200)]
    public string DefectType { get; set; } = string.Empty;

    [Range(1, 999999)]
    public int DefectiveUnits { get; set; } = 1;

    [Required][StringLength(300)]
    public string RootCause { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(Rework|Scrap|Accept|Hold)$",
        ErrorMessage = "ActionTaken must be: Rework, Scrap, Accept, or Hold.")]
    public string ActionTaken { get; set; } = "Rework";

    [Required][StringLength(200)]
    public string ReportedBy { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Notes { get; set; }
}

public class UpdateDefectStatusRequest
{
    [Required]
    [RegularExpression("^(Open|In Progress|Resolved)$",
        ErrorMessage = "Status must be: Open, In Progress, or Resolved.")]
    public string Status { get; set; } = string.Empty;
}

// Kept for backward compatibility with DefectController.Resolve endpoint
public class ResolveDefectRequest
{
    public string? Notes { get; set; }
}

public class DefectViewModel
{
    public int      DefectID       { get; set; }
    public int      InspectionID   { get; set; }
    public int      WorkOrderID    { get; set; }
    public string   ProductName    { get; set; } = string.Empty;
    public string   Severity       { get; set; } = string.Empty;
    public string   DefectType     { get; set; } = string.Empty;
    public int      DefectiveUnits { get; set; }
    public string   RootCause      { get; set; } = string.Empty;
    public string   ActionTaken    { get; set; } = string.Empty;
    public string   Status         { get; set; } = string.Empty;
    public string   ReportedBy     { get; set; } = string.Empty;
    public DateTime ReportedDate   { get; set; }
    public string?  Notes          { get; set; }
    public DateTime  CreatedDate   { get; set; }
    public DateTime? UpdatedDate   { get; set; }
}
