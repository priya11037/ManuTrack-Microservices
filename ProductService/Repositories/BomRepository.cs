using Microsoft.EntityFrameworkCore;
using ProductService.Data;
using ProductService.Models;
using ProductService.Repositories.Interfaces;

namespace ProductService.Repositories;

public class BomRepository(ProductDbContext db) : IBomRepository
{
    /// <summary>
    /// Returns all BomItems for a product, flat list sorted by ID.
    /// The service layer builds the tree.
    /// </summary>
    public async Task<IEnumerable<BomItem>> GetByProductIdAsync(int productId) =>
        await db.BomItems
                .Where(b => b.ProductID == productId)
                .OrderBy(b => b.BomItemID)
                .ToListAsync();

    public async Task<BomItem?> GetByIdAsync(int id) =>
        await db.BomItems.FindAsync(id);

    public async Task<BomItem> CreateAsync(BomItem item)
    {
        db.BomItems.Add(item);
        await db.SaveChangesAsync();
        return item;
    }

    public async Task DeleteAsync(BomItem item)
    {
        // EF Cascade will delete children if FK is set to CASCADE
        db.BomItems.Remove(item);
        await db.SaveChangesAsync();
    }
}
