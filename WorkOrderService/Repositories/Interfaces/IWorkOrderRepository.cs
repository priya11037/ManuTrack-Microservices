using WorkOrderService.Models;

namespace WorkOrderService.Repositories.Interfaces;

public interface IWorkOrderRepository
{
    Task<IEnumerable<WorkOrder>> GetAllAsync(string? status = null, int? productId = null, string? assignedTo = null);
    Task<WorkOrder?> GetByIdAsync(int id);
    Task<WorkOrder?> GetByIdWithTasksAsync(int id);
    Task<WorkOrder> CreateAsync(WorkOrder workOrder);
    Task<WorkOrder> UpdateAsync(WorkOrder workOrder);
    Task DeleteAsync(WorkOrder workOrder);
    Task<bool> ExistsAsync(int id);
    Task<int>  GetNextIdAsync();
}
