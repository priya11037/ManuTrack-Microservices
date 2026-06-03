using System.ComponentModel.DataAnnotations;

namespace WorkOrderService.DTOs;

public class CreateWorkOrderRequest : IValidatableObject
{
    [Required(ErrorMessage = "ProductID is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "ProductID must be a positive integer.")]
    public int ProductID { get; set; }

    [Required(ErrorMessage = "Product name is required.")]
    [MinLength(2, ErrorMessage = "Product name must be at least 2 characters.")]
    [MaxLength(200, ErrorMessage = "Product name cannot exceed 200 characters.")]
    public string ProductName { get; set; } = string.Empty;

    [MaxLength(50, ErrorMessage = "SKU cannot exceed 50 characters.")]
    public string? Sku { get; set; }

    [Required(ErrorMessage = "Quantity is required.")]
    [Range(1, 1000000, ErrorMessage = "Quantity must be between 1 and 1,000,000.")]
    public int Quantity { get; set; }

    [RegularExpression("^(Low|Medium|High|Critical)$",
        ErrorMessage = "Priority must be one of: Low, Medium, High, Critical.")]
    public string Priority { get; set; } = "Medium";

    [MaxLength(50, ErrorMessage = "ProductionLine cannot exceed 50 characters.")]
    public string? ProductionLine { get; set; }

    [Required(ErrorMessage = "Start date is required.")]
    public DateTime StartDate { get; set; }

    [Required(ErrorMessage = "End date is required.")]
    public DateTime EndDate { get; set; }

    public DateTime? EstimatedStartDate { get; set; }
    public DateTime? EstimatedEndDate { get; set; }

    [MinLength(2, ErrorMessage = "AssignedTo must be at least 2 characters.")]
    [MaxLength(200, ErrorMessage = "AssignedTo cannot exceed 200 characters.")]
    public string? AssignedTo { get; set; }

    public int? AssignedOperatorID { get; set; }

    [MaxLength(200, ErrorMessage = "CreatedBy cannot exceed 200 characters.")]
    public string? CreatedBy { get; set; }

    [MaxLength(1000, ErrorMessage = "Notes cannot exceed 1000 characters.")]
    public string? Notes { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (EndDate <= StartDate)
            yield return new ValidationResult("End date must be after start date.", [nameof(EndDate)]);
    }
}

public class UpdateWorkOrderRequest
{
    [Range(1, 1000000, ErrorMessage = "Quantity must be between 1 and 1,000,000.")]
    public int? Quantity { get; set; }

    public string? Priority { get; set; }
    public string? ProductionLine { get; set; }
    public int? ProducedQty { get; set; }

    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? EstimatedStartDate { get; set; }
    public DateTime? EstimatedEndDate { get; set; }

    [MinLength(2)]
    [MaxLength(200)]
    public string? AssignedTo { get; set; }

    public int? AssignedOperatorID { get; set; }

    [MaxLength(200)]
    public string? CreatedBy { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }
}

public class ReassignWorkOrderRequest
{
    [Required][StringLength(200, MinimumLength = 2)]
    public string AssignedTo { get; set; } = string.Empty;

    public int? AssignedOperatorID { get; set; }

    [StringLength(500)]
    public string? Reason { get; set; }
}

public class UpdateWorkOrderStatusRequest
{
    [Required(ErrorMessage = "Status is required.")]
    [RegularExpression("^(Planned|In Progress|On Hold|Completed|Cancelled)$",
        ErrorMessage = "Status must be one of: Planned, In Progress, On Hold, Completed, Cancelled")]
    public string Status { get; set; } = string.Empty;
}

public class WorkOrderViewModel
{
    public int WorkOrderID { get; set; }
    public string WoNumber { get; set; } = string.Empty;
    public int ProductID { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int ProducedQty { get; set; }
    public string Priority { get; set; } = "Medium";
    public string ProductionLine { get; set; } = string.Empty;
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
    public DateTime CreatedDate { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public int TaskCount { get; set; }
    public decimal ProgressPercentage { get; set; }
    public bool IsOverdue { get; set; }
}
