using Microsoft.EntityFrameworkCore;
using WorkOrderService.Data;
using WorkOrderService.Enums;
using WorkOrderService.Models;
using WorkOrderService.Repositories.Interfaces;

namespace WorkOrderService.Repositories;

public class WorkOrderTaskRepository(WorkOrderDbContext db) : IWorkOrderTaskRepository
{
    public async Task<IEnumerable<WorkOrderTask>> GetByWorkOrderIdAsync(int workOrderId) =>
        await db.WorkOrderTasks.Where(t => t.WorkOrderID == workOrderId)
                               .OrderBy(t => t.CreatedDate)
                               .ToListAsync();

    public async Task<IEnumerable<WorkOrderTask>> GetOpenByAssigneeAsync(string assignedTo, bool openOnly = false) =>
        await db.WorkOrderTasks
                .Where(t => t.AssignedTo == assignedTo &&
                            t.Status != WorkOrderTaskStatus.Cancelled &&
                            (!openOnly || t.Status == WorkOrderTaskStatus.Pending || t.Status == WorkOrderTaskStatus.InProgress))
                .OrderBy(t => t.CreatedDate)
                .ToListAsync();

    public async Task<WorkOrderTask?> GetByIdAsync(int id) =>
        await db.WorkOrderTasks.Include(t => t.WorkOrder)
                               .FirstOrDefaultAsync(t => t.TaskID == id);

    public async Task<WorkOrderTask> CreateAsync(WorkOrderTask task)
    {
        db.WorkOrderTasks.Add(task);
        await db.SaveChangesAsync();
        return task;
    }

    public async Task<WorkOrderTask> UpdateAsync(WorkOrderTask task)
    {
        db.WorkOrderTasks.Update(task);
        await db.SaveChangesAsync();
        return task;
    }

    public async Task DeleteAsync(WorkOrderTask task)
    {
        db.WorkOrderTasks.Remove(task);
        await db.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(int id) =>
        await db.WorkOrderTasks.AnyAsync(t => t.TaskID == id);
}
