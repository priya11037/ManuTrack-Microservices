using Microsoft.EntityFrameworkCore;
using QualityService.Data;
using QualityService.Models;
using QualityService.Repositories.Interfaces;

namespace QualityService.Repositories;

public class InspectionRepository(QualityDbContext db) : IInspectionRepository
{
    public async Task<IEnumerable<Inspection>> GetAllAsync(string? status = null, int? workOrderId = null)
    {
        var query = db.Inspections.Include(i => i.Defects).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(i => i.Status == status);
        if (workOrderId.HasValue) query = query.Where(i => i.WorkOrderID == workOrderId.Value);
        return await query.OrderByDescending(i => i.ScheduledDate).ToListAsync();
    }

    public async Task<Inspection?> GetByIdAsync(int id) => await db.Inspections.FindAsync(id);

    public async Task<Inspection?> GetByIdWithDefectsAsync(int id) =>
        await db.Inspections.Include(i => i.Defects).FirstOrDefaultAsync(i => i.InspectionID == id);

    public async Task<Inspection> CreateAsync(Inspection inspection)
    {
        db.Inspections.Add(inspection);
        await db.SaveChangesAsync();
        return inspection;
    }

    public async Task<Inspection> UpdateAsync(Inspection inspection)
    {
        db.Inspections.Update(inspection);
        await db.SaveChangesAsync();
        return inspection;
    }

    public async Task<bool> ExistsAsync(int id) => await db.Inspections.AnyAsync(i => i.InspectionID == id);
}
