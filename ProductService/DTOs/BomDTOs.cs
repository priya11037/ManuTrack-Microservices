using System.ComponentModel.DataAnnotations;

namespace ProductService.DTOs;

/// <summary>Request to add a BOM line item (free-form — no FK to Products table required).</summary>
public class CreateBomItemRequest
{
    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "ProductID must be a positive integer.")]
    public int ProductID { get; set; }

    /// <summary>null = root level; set to parent BomItemID for sub-assemblies</summary>
    public int? ParentID { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name is required and cannot exceed 200 characters.")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Range(0.0001, 999999.9999, ErrorMessage = "Quantity must be between 0.0001 and 999,999.")]
    public decimal Quantity { get; set; }

    [Required]
    [RegularExpression("^(pcs|kg|m|L|set|m2|m3)$", ErrorMessage = "Unit must be one of: pcs, kg, m, L, set, m2, m3.")]
    public string Unit { get; set; } = "pcs";

    [Required]
    [RegularExpression("^(raw-material|sub-assembly|purchased-part)$",
        ErrorMessage = "Type must be: raw-material, sub-assembly, or purchased-part.")]
    public string Type { get; set; } = "raw-material";
}

/// <summary>Flat view of a BOM line item returned by the API.</summary>
public class BomItemViewModel
{
    public int     BomItemID   { get; set; }
    public int     ProductID   { get; set; }
    public int?    ParentID    { get; set; }
    public string  Name        { get; set; } = string.Empty;
    public decimal Quantity    { get; set; }
    public string  Unit        { get; set; } = string.Empty;
    public string  Type        { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public List<BomItemViewModel>? Children { get; set; }
}
