using InventoryService.Models;

namespace InventoryService.Repositories.Interfaces;

public interface IPurchaseOrderRepository
{
    Task<IEnumerable<PurchaseOrder>> GetAllAsync(string? status = null);
    Task<PurchaseOrder?> GetByIdAsync(int id);
    Task<PurchaseOrder> CreateAsync(PurchaseOrder po);
    Task<PurchaseOrder> UpdateAsync(PurchaseOrder po);
    Task<bool> ExistsAsync(int id);
    Task<int>  GetNextIdAsync();
}
