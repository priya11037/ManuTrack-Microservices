// Supplier entity removed — suppliers are now stored as plain strings on InventoryItem and PurchaseOrder.
// This stub satisfies the ISupplierRepository interface used by DI registration in Program.cs.
using InventoryService.Models;
using InventoryService.Repositories.Interfaces;

namespace InventoryService.Repositories;

public class SupplierRepository : ISupplierRepository
{
    public Task<IEnumerable<Supplier>>  GetAllAsync(bool? isActive = null)    => Task.FromResult(Enumerable.Empty<Supplier>());
    public Task<Supplier?>              GetByIdAsync(int id)                  => Task.FromResult<Supplier?>(null);
    public Task<Supplier>               CreateAsync(Supplier s)               => Task.FromResult(s);
    public Task<Supplier>               UpdateAsync(Supplier s)               => Task.FromResult(s);
    public Task                         DeleteAsync(Supplier s)               => Task.CompletedTask;
    public Task<bool>                   ExistsAsync(int id)                   => Task.FromResult(false);
    public Task<bool>                   HasPurchaseOrdersAsync(int id)        => Task.FromResult(false);
}
