using System.ComponentModel.DataAnnotations;

namespace InventoryService.DTOs;

// ── Inventory Item DTOs ───────────────────────────────────────────────────────

public class CreateInventoryItemRequest
{
    [Required][StringLength(50)]
    public string Sku { get; set; } = string.Empty;

    [Required][StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required][StringLength(100)]
    public string Category { get; set; } = string.Empty;

    [Required][StringLength(20)]
    public string Unit { get; set; } = "pcs";

    [StringLength(200)]
    public string Location { get; set; } = string.Empty;

    [Range(0, 9999999)]
    public decimal CurrentStock { get; set; }

    [Range(0, 9999999)]
    public decimal MinStock { get; set; }

    [Range(1, 9999999)]
    public decimal MaxStock { get; set; } = 9999;

    [Range(0, 9999999)]
    public decimal UnitCost { get; set; }

    [StringLength(200)]
    public string Supplier { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Notes { get; set; }
}

public class UpdateInventoryItemRequest
{
    [StringLength(50)]
    public string? Sku { get; set; }

    [StringLength(200, MinimumLength = 2)]
    public string? Name { get; set; }

    [StringLength(100)]
    public string? Category { get; set; }

    [StringLength(20)]
    public string? Unit { get; set; }

    [StringLength(200)]
    public string? Location { get; set; }

    [Range(0, 9999999)]
    public decimal? CurrentStock { get; set; }

    [Range(0, 9999999)]
    public decimal? MinStock { get; set; }

    [Range(1, 9999999)]
    public decimal? MaxStock { get; set; }

    [Range(0, 9999999)]
    public decimal? UnitCost { get; set; }

    [StringLength(200)]
    public string? Supplier { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }
}

public class AdjustQuantityRequest
{
    [Required]
    [Range(-9999999, 9999999)]
    public decimal Adjustment { get; set; }

    [Required][MinLength(5)][MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}

public class InventoryItemViewModel
{
    public int      InventoryID     { get; set; }
    public string   Sku             { get; set; } = string.Empty;
    public string   Name            { get; set; } = string.Empty;
    public string   Category        { get; set; } = string.Empty;
    public string   Unit            { get; set; } = string.Empty;
    public string   Location        { get; set; } = string.Empty;
    public decimal  CurrentStock    { get; set; }
    public decimal  MinStock        { get; set; }
    public decimal  MaxStock        { get; set; }
    public decimal  UnitCost        { get; set; }
    public string   Supplier        { get; set; } = string.Empty;
    public string   Status          { get; set; } = string.Empty;
    public string?  Notes           { get; set; }
    public DateTime  CreatedDate    { get; set; }
    public DateTime? ModifiedDate   { get; set; }
}

public class StockMovementViewModel
{
    public int     MovementID   { get; set; }
    public int     InventoryID  { get; set; }
    public string  MovementType { get; set; } = string.Empty;
    public decimal Quantity     { get; set; }
    public string  Reason       { get; set; } = string.Empty;
    public string? ReferenceID  { get; set; }
    public int     PerformedBy  { get; set; }
    public DateTime CreatedDate { get; set; }
}

// ── Purchase Order DTOs ───────────────────────────────────────────────────────

public class CreatePurchaseOrderRequest
{
    [Required][StringLength(200)]
    public string Supplier { get; set; } = string.Empty;

    [Required][StringLength(200)]
    public string ItemName { get; set; } = string.Empty;

    [StringLength(50)]
    public string Sku { get; set; } = string.Empty;

    [Required][Range(1, 999999)]
    public decimal Quantity { get; set; }

    [Required][Range(0.01, 9999999)]
    public decimal UnitCost { get; set; }

    [RegularExpression("^(Low|Medium|High|Urgent)$")]
    public string Priority { get; set; } = "Medium";

    [Required]
    public DateTime OrderDate { get; set; }

    [Required]
    public DateTime ExpectedDate { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }
}

public class UpdatePurchaseOrderStatusRequest
{
    [Required]
    [RegularExpression("^(Draft|Submitted|Approved|Ordered|Received|Cancelled)$",
        ErrorMessage = "Status must be: Draft, Submitted, Approved, Ordered, Received, or Cancelled.")]
    public string Status { get; set; } = string.Empty;
}

public class PurchaseOrderViewModel
{
    public int      PurchaseOrderID { get; set; }   // serializes to purchaseOrderID in JSON
    public string   PONumber        { get; set; } = string.Empty;
    public string   SupplierName { get; set; } = string.Empty;
    public string   ItemName     { get; set; } = string.Empty;
    public string   ItemSku      { get; set; } = string.Empty;
    public decimal  Quantity     { get; set; }
    public decimal  UnitCost     { get; set; }
    public decimal  TotalCost    { get; set; }
    public string   Priority     { get; set; } = string.Empty;
    public string   Status       { get; set; } = string.Empty;
    public DateTime  OrderDate    { get; set; }
    public DateTime  ExpectedDate { get; set; }
    public string?   Notes        { get; set; }
    public DateTime  CreatedDate  { get; set; }
    public DateTime? ModifiedDate { get; set; }
}
