using System.ComponentModel.DataAnnotations;

namespace ProductService.DTOs;

public class CreateProductRequest
{
    [Required(ErrorMessage = "Product name is required.")]
    [MinLength(2)][MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50, ErrorMessage = "SKU cannot exceed 50 characters.")]
    public string? Sku { get; set; }   // ← new

    [Required(ErrorMessage = "Category is required.")]
    [MinLength(2)][MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [RegularExpression(@"^\d+\.\d+(\.\d+)?$")]
    [MaxLength(20)]
    public string Version { get; set; } = "1.0";

    [MaxLength(1000)]
    public string? Description { get; set; }
}

public class UpdateProductRequest
{
    [MinLength(2)][MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(50)]
    public string? Sku { get; set; }   // ← new

    [MinLength(2)][MaxLength(100)]
    public string? Category { get; set; }

    [RegularExpression(@"^\d+\.\d+(\.\d+)?$")]
    [MaxLength(20)]
    public string? Version { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }
}

public class UpdateProductStatusRequest
{
    [Required]
    [RegularExpression("^(Draft|Active|Discontinued)$")]
    public string Status { get; set; } = string.Empty;
}

public class ProductViewModel
{
    public int      ProductID    { get; set; }
    public string   Name         { get; set; } = string.Empty;
    public string   Sku          { get; set; } = string.Empty;   // ← new
    public string   Category     { get; set; } = string.Empty;
    public string   Version      { get; set; } = string.Empty;
    public string   Status       { get; set; } = string.Empty;
    public string?  Description  { get; set; }
    public bool     HasBom       { get; set; }                   // ← new: does this product have BOM items?
    public DateTime CreatedDate  { get; set; }
    public DateTime? ModifiedDate { get; set; }
}
