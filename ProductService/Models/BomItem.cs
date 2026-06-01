namespace ProductService.Models;

/// <summary>
/// A single line-item in a product's Bill of Materials.
/// Items can be nested (ParentID) for sub-assembly trees.
/// Name is free-form — components do NOT have to be registered Products.
/// </summary>
public class BomItem
{
    public int    BomItemID   { get; set; }
    public int    ProductID   { get; set; }   // the parent product this BOM belongs to
    public int?   ParentID    { get; set; }   // null = root level; non-null = child of another BomItem
    public string Name        { get; set; } = string.Empty;
    public decimal Quantity   { get; set; }
    public string Unit        { get; set; } = "pcs";
    public string Type        { get; set; } = "raw-material"; // raw-material | sub-assembly | purchased-part
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public Product?           Product  { get; set; }
    public BomItem?           Parent   { get; set; }
    public ICollection<BomItem> Children { get; set; } = new List<BomItem>();
}
