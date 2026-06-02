using InventoryService.Data;
using InventoryService.Models;
using InventoryService.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventoryService.Repositories;

public class SupplierRepository(InventoryDbContext db) : ISupplierRepository
{
    public async Task<IEnumerable<Supplier>> GetAllAsync(bool? isActive = null)
    {
        var query = db.Suppliers.AsQueryable();
        if (isActive.HasValue) query = query.Where(s => s.IsActive == isActive.Value);
        return await query.OrderBy(s => s.Name).ToListAsync();
    }

    public async Task<Supplier?> GetByIdAsync(int id) =>
        await db.Suppliers.FindAsync(id);

    public async Task<Supplier> CreateAsync(Supplier supplier)
    {
        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();
        return supplier;
    }

    public async Task<Supplier> UpdateAsync(Supplier supplier)
    {
        db.Suppliers.Update(supplier);
        await db.SaveChangesAsync();
        return supplier;
    }

    public async Task DeleteAsync(Supplier supplier)
    {
        db.Suppliers.Remove(supplier);
        await db.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(int id) =>
        await db.Suppliers.AnyAsync(s => s.SupplierID == id);

    public async Task<bool> HasPurchaseOrdersAsync(int id) =>
        await db.PurchaseOrders.AnyAsync(p => p.SupplierName == db.Suppliers
            .Where(s => s.SupplierID == id).Select(s => s.Name).FirstOrDefault());
}
