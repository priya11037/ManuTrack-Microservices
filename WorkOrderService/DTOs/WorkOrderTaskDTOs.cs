using System.ComponentModel.DataAnnotations;

namespace WorkOrderService.DTOs;

public class CreateWorkOrderTaskRequest
{
    [Required(ErrorMessage = "WorkOrderID is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "WorkOrderID must be a positive integer.")]
    public int WorkOrderID { get; set; }

    [Required(ErrorMessage = "Description is required.")]
    [MinLength(5, ErrorMessage = "Description must be at least 5 characters.")]
    [MaxLength(500, ErrorMessage = "Description cannot exceed 500 characters.")]
    public string Description { get; set; } = string.Empty;

    [Required(ErrorMessage = "AssignedTo is required.")]
    [MinLength(2, ErrorMessage = "AssignedTo must be at least 2 characters.")]
    [MaxLength(200, ErrorMessage = "AssignedTo cannot exceed 200 characters.")]
    public string AssignedTo { get; set; } = string.Empty;

    [MaxLength(500, ErrorMessage = "Notes cannot exceed 500 characters.")]
    public string? Notes { get; set; }
}

public class UpdateWorkOrderTaskRequest
{
    [MinLength(5, ErrorMessage = "Description must be at least 5 characters.")]
    [MaxLength(500, ErrorMessage = "Description cannot exceed 500 characters.")]
    public string? Description { get; set; }

    [MinLength(2, ErrorMessage = "AssignedTo must be at least 2 characters.")]
    [MaxLength(200, ErrorMessage = "AssignedTo cannot exceed 200 characters.")]
    public string? AssignedTo { get; set; }

    [MaxLength(500, ErrorMessage = "Notes cannot exceed 500 characters.")]
    public string? Notes { get; set; }
}

public class UpdateTaskStatusRequest
{
    [Required(ErrorMessage = "Status is required.")]
    [RegularExpression("^(To Do|In Progress|Done|Cancelled)$",
        ErrorMessage = "Status must be one of: To Do, InProgress, Done, Cancelled.")]
    public string Status { get; set; } = string.Empty;
}

public class WorkOrderTaskViewModel
{
    public int TaskID { get; set; }
    public int WorkOrderID { get; set; }
    public string Description { get; set; } = string.Empty;
    public string AssignedTo { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? CompletedDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? UpdatedDate { get; set; }
}
