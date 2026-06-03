using WorkOrderService.Models;

namespace WorkOrderService.Repositories.Interfaces;

public interface IWorkOrderTaskRepository
{
    Task<IEnumerable<WorkOrderTask>> GetByWorkOrderIdAsync(int workOrderId);
    Task<IEnumerable<WorkOrderTask>> GetOpenByAssigneeAsync(string assignedTo);
    Task<WorkOrderTask?> GetByIdAsync(int id);
    Task<WorkOrderTask> CreateAsync(WorkOrderTask task);
    Task<WorkOrderTask> UpdateAsync(WorkOrderTask task);
    Task DeleteAsync(WorkOrderTask task);
    Task<bool> ExistsAsync(int id);
}
