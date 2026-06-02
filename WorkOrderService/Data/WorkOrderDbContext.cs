using Microsoft.EntityFrameworkCore;
using WorkOrderService.Models;

namespace WorkOrderService.Data;

public class WorkOrderDbContext(DbContextOptions<WorkOrderDbContext> options) : DbContext(options)
{
    public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();
    public DbSet<WorkOrderTask> WorkOrderTasks => Set<WorkOrderTask>();
    public DbSet<WorkOrderFlag> WorkOrderFlags => Set<WorkOrderFlag>();     // Fix 6: operator issue flags
    public DbSet<WorkOrderStep> WorkOrderSteps => Set<WorkOrderStep>();     // Fix 7: persisted execution steps
    public DbSet<ProductionLine> ProductionLines => Set<ProductionLine>();  // Fix 8: production lines

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<WorkOrder>(e =>
        {
            e.HasKey(w => w.WorkOrderID);
            e.Property(w => w.WorkOrderID).ValueGeneratedOnAdd();
            e.Property(w => w.ProductName).IsRequired().HasMaxLength(200);
            e.Property(w => w.Status).IsRequired().HasMaxLength(50).HasDefaultValue("Pending");
            e.Property(w => w.AssignedTo).HasMaxLength(200);
            e.Property(w => w.Notes).HasMaxLength(1000);
            e.HasIndex(w => w.ProductID);
            e.HasIndex(w => w.Status);

            e.HasMany(w => w.Flags)
             .WithOne(f => f.WorkOrder)
             .HasForeignKey(f => f.WorkOrderID)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasMany(w => w.Steps)
             .WithOne(s => s.WorkOrder)
             .HasForeignKey(s => s.WorkOrderID)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkOrderTask>(e =>
        {
            e.HasKey(t => t.TaskID);
            e.Property(t => t.TaskID).ValueGeneratedOnAdd();
            e.Property(t => t.Description).IsRequired().HasMaxLength(500);
            e.Property(t => t.AssignedTo).IsRequired().HasMaxLength(200);
            e.Property(t => t.Status).IsRequired().HasMaxLength(50).HasDefaultValue("Pending");
            e.Property(t => t.Notes).HasMaxLength(500);

            e.HasOne(t => t.WorkOrder)
             .WithMany(w => w.Tasks)
             .HasForeignKey(t => t.WorkOrderID)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(t => t.WorkOrderID);
        });

        // ── WorkOrderFlag ──────────────────────────────────────────────────────
        modelBuilder.Entity<WorkOrderFlag>(e =>
        {
            e.HasKey(f => f.WorkOrderFlagID);
            e.Property(f => f.WorkOrderFlagID).ValueGeneratedOnAdd();
            e.Property(f => f.Reason).IsRequired().HasMaxLength(1000);
            e.Property(f => f.FlaggedBy).IsRequired().HasMaxLength(200);
            e.Property(f => f.Status).IsRequired().HasMaxLength(50).HasDefaultValue("Open");
            e.Property(f => f.Resolution).HasMaxLength(1000);
            e.HasIndex(f => f.WorkOrderID);
            e.HasIndex(f => f.Status);
        });

        // ── WorkOrderStep ──────────────────────────────────────────────────────
        modelBuilder.Entity<WorkOrderStep>(e =>
        {
            e.HasKey(s => s.StepID);
            e.Property(s => s.StepID).ValueGeneratedOnAdd();
            e.Property(s => s.Label).IsRequired().HasMaxLength(300);
            e.Property(s => s.CompletedBy).HasMaxLength(200);
            e.HasIndex(s => s.WorkOrderID);
        });

        // ── ProductionLine ─────────────────────────────────────────────────────
        modelBuilder.Entity<ProductionLine>(e =>
        {
            e.HasKey(l => l.LineID);
            e.Property(l => l.LineID).ValueGeneratedOnAdd();
            e.Property(l => l.LineName).IsRequired().HasMaxLength(100);
            e.Property(l => l.Description).HasMaxLength(500);
            e.Property(l => l.Status).IsRequired().HasMaxLength(50).HasDefaultValue("Active");
            e.Property(l => l.Location).HasMaxLength(200);
            e.HasIndex(l => l.LineName).IsUnique();

            e.HasMany(l => l.WorkOrders)
             .WithOne()
             .HasForeignKey(w => w.ProductionLineID)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
