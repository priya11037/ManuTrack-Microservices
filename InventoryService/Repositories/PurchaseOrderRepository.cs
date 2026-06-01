using InventoryService.Data;
using InventoryService.Models;
using InventoryService.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventoryService.Repositories;

public class PurchaseOrderRepository(InventoryDbContext db) : IPurchaseOrderRepository
{
    public async Task<IEnumerable<PurchaseOrder>> GetAllAsync(string? status = null)
    {
        var query = db.PurchaseOrders.AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status);
        return await query.OrderByDescending(p => p.OrderDate).ToListAsync();
    }

    public async Task<PurchaseOrder?> GetByIdAsync(int id) =>
        await db.PurchaseOrders.FindAsync(id);

    public async Task<PurchaseOrder> CreateAsync(PurchaseOrder po)
    {
        db.PurchaseOrders.Add(po);
        await db.SaveChangesAsync();
        return po;
    }

    public async Task<PurchaseOrder> UpdateAsync(PurchaseOrder po)
    {
        db.PurchaseOrders.Update(po);
        await db.SaveChangesAsync();
        return po;
    }

    public async Task<bool> ExistsAsync(int id) =>
        await db.PurchaseOrders.AnyAsync(p => p.POID == id);

    public async Task<int> GetNextIdAsync() =>
        (await db.PurchaseOrders.MaxAsync(p => (int?)p.POID) ?? 0) + 1;
}
