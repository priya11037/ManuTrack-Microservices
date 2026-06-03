using System.ComponentModel.DataAnnotations;

namespace QualityService.DTOs;

public class CreateInspectionRequest
{
    [Required]
    [Range(1, int.MaxValue)]
    public int WorkOrderID { get; set; }

    [Range(1, 999999)]
    public int Quantity { get; set; } = 1;

    [RegularExpression("^(Low|Medium|High|Critical)$")]
    public string Priority { get; set; } = "Medium";

    [Required][StringLength(200, MinimumLength = 2)]
    public string InspectorName { get; set; } = string.Empty;

    public DateTime ScheduledDate { get; set; } = DateTime.UtcNow;

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public class ReassignInspectionRequest
{
    [Required][StringLength(200, MinimumLength = 2)]
    public string InspectorName { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Reason { get; set; }
}

public class UpdateInspectionStatusRequest
{
    [Required]
    [RegularExpression("^(Pending|In Review|Passed|Failed)$",
        ErrorMessage = "Status must be: Pending, In Review, Passed, or Failed.")]
    public string Status { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public class InspectionViewModel
{
    public int      InspectionID  { get; set; }
    public int      WorkOrderID   { get; set; }
    public string   ProductName   { get; set; } = string.Empty;
    public string   Sku           { get; set; } = string.Empty;
    public int      Quantity      { get; set; }
    public string   Priority      { get; set; } = string.Empty;
    public string   InspectorName { get; set; } = string.Empty;
    public DateTime ScheduledDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public string   Status        { get; set; } = string.Empty;
    public string?  Notes         { get; set; }
    public DateTime  CreatedDate  { get; set; }
    public DateTime? UpdatedDate  { get; set; }
    public int      DefectsLogged { get; set; }
}
