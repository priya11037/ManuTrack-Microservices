using Microsoft.EntityFrameworkCore;
using ProductService.Data;
using ProductService.Models;
using ProductService.Repositories.Interfaces;

namespace ProductService.Repositories;

public class ProductRepository(ProductDbContext db) : IProductRepository
{
    public async Task<IEnumerable<Product>> GetAllAsync(string? category = null, string? status = null)
    {
        var query = db.Products.Include(p => p.BomItems).AsQueryable();
        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status);
        return await query.OrderBy(p => p.Name).ToListAsync();
    }

    public async Task<Product?> GetByIdAsync(int id) =>
        await db.Products.Include(p => p.BomItems).FirstOrDefaultAsync(p => p.ProductID == id);

    public async Task<Product?> GetByNameAsync(string name) =>
        await db.Products.FirstOrDefaultAsync(p => p.Name == name);

    public async Task<Product> CreateAsync(Product product)
    {
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return product;
    }

    public async Task<Product> UpdateAsync(Product product)
    {
        db.Products.Update(product);
        await db.SaveChangesAsync();
        return product;
    }

    public async Task DeleteAsync(Product product)
    {
        db.Products.Remove(product);
        await db.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(int id) =>
        await db.Products.AnyAsync(p => p.ProductID == id);
}
