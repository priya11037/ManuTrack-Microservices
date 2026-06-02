using InventoryService.Data;
using InventoryService.Models;
using InventoryService.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventoryService.Repositories;

public class LocationRepository(InventoryDbContext db) : ILocationRepository
{
    public async Task<IEnumerable<InventoryLocation>> GetAllAsync(bool? isActive = null)
    {
        var query = db.InventoryLocations.AsQueryable();
        if (isActive.HasValue) query = query.Where(l => l.IsActive == isActive.Value);
        return await query.OrderBy(l => l.Name).ToListAsync();
    }

    public async Task<InventoryLocation?> GetByIdAsync(int id) =>
        await db.InventoryLocations.FindAsync(id);

    public async Task<InventoryLocation> CreateAsync(InventoryLocation location)
    {
        db.InventoryLocations.Add(location);
        await db.SaveChangesAsync();
        return location;
    }

    public async Task<InventoryLocation> UpdateAsync(InventoryLocation location)
    {
        db.InventoryLocations.Update(location);
        await db.SaveChangesAsync();
        return location;
    }

    public async Task DeleteAsync(InventoryLocation location)
    {
        db.InventoryLocations.Remove(location);
        await db.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(int id) =>
        await db.InventoryLocations.AnyAsync(l => l.LocationID == id);

    public async Task<bool> HasItemsAsync(int locationId) =>
        await db.InventoryItems.AnyAsync(i => i.Location == db.InventoryLocations
            .Where(l => l.LocationID == locationId).Select(l => l.Name).FirstOrDefault());
}
