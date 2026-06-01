namespace InventoryService.Models;

/// <summary>
/// Represents a free-form inventory item (raw material or finished good).
/// Not linked to the product catalog — managed entirely by the Inventory Manager.
/// </summary>
public class InventoryItem
{
    public int     InventoryID      { get; set; }
    public string  Sku              { get; set; } = string.Empty;
    public string  Name             { get; set; } = string.Empty;   // was ProductName
    public string  Category         { get; set; } = string.Empty;   // Raw Material, Component, etc.
    public string  Unit             { get; set; } = "pcs";          // pcs, kg, m, L…
    public string  Location         { get; set; } = string.Empty;   // e.g. "Warehouse A"
    public decimal QuantityOnHand   { get; set; }
    public decimal MinimumQuantity  { get; set; }
    public decimal MaximumQuantity  { get; set; } = 9999;
    public decimal UnitCost         { get; set; }
    public string  Supplier         { get; set; } = string.Empty;
    public string  Status           { get; set; } = string.Empty;   // InStock / LowStock / OutOfStock
    public string? Notes            { get; set; }
    public DateTime  CreatedDate    { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedDate   { get; set; }

    public ICollection<StockMovement> StockMovements { get; set; } = [];
}
