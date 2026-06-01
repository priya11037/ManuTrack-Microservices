namespace ProductService.Models;

public class Product
{
    public int ProductID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Sku  { get; set; } = string.Empty;   // product code e.g. SA-1042
    public string Category { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0";
    public string Status { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedDate { get; set; }
    public ICollection<BomItem> BomItems { get; set; } = new List<BomItem>();
}
