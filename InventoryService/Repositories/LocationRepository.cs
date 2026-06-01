// Location entity removed — location is now a plain string on InventoryItem.
// This stub satisfies the ILocationRepository interface used by DI registration in Program.cs.
using InventoryService.Models;
using InventoryService.Repositories.Interfaces;

namespace InventoryService.Repositories;

public class LocationRepository : ILocationRepository
{
    public Task<IEnumerable<InventoryLocation>> GetAllAsync(bool? isActive = null) => Task.FromResult(Enumerable.Empty<InventoryLocation>());
    public Task<InventoryLocation?>             GetByIdAsync(int id)               => Task.FromResult<InventoryLocation?>(null);
    public Task<InventoryLocation>              CreateAsync(InventoryLocation l)   => Task.FromResult(l);
    public Task<InventoryLocation>              UpdateAsync(InventoryLocation l)   => Task.FromResult(l);
    public Task                                 DeleteAsync(InventoryLocation l)   => Task.CompletedTask;
    public Task<bool>                           ExistsAsync(int id)                => Task.FromResult(false);
    public Task<bool>                           HasItemsAsync(int locationId)      => Task.FromResult(false);
}
