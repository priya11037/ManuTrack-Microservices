namespace InventoryService.Models;

/// <summary>
/// A single-item purchase order. Each PO covers one line item for simplicity.
/// When status changes to "Received", the corresponding inventory item's qty is auto-increased.
/// </summary>
public class PurchaseOrder
{
    public int     POID         { get; set; }
    public string  PONumber     { get; set; } = string.Empty;   // auto-generated e.g. PO-0001
    public string  SupplierName { get; set; } = string.Empty;
    public string  ItemName     { get; set; } = string.Empty;   // item being ordered
    public string  ItemSku      { get; set; } = string.Empty;
    public decimal Quantity     { get; set; }
    public decimal UnitCost     { get; set; }
    public decimal TotalCost    { get; set; }                   // = Quantity × UnitCost
    public string  Priority     { get; set; } = "Medium";       // Low / Medium / High / Urgent
    public string  Status       { get; set; } = "Draft";        // Draft / Submitted / Approved / Ordered / Received / Cancelled
    public DateTime  OrderDate      { get; set; }
    public DateTime  ExpectedDate   { get; set; }
    public string?   Notes          { get; set; }
    public DateTime  CreatedDate    { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedDate   { get; set; }
    public ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
}
