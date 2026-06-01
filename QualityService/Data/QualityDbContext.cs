using Microsoft.EntityFrameworkCore;
using QualityService.Models;

namespace QualityService.Data;

public class QualityDbContext(DbContextOptions<QualityDbContext> options) : DbContext(options)
{
    public DbSet<Inspection> Inspections => Set<Inspection>();
    public DbSet<Defect>     Defects     => Set<Defect>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ── Inspection ────────────────────────────────────────────────────────
        modelBuilder.Entity<Inspection>(e =>
        {
            e.HasKey(i => i.InspectionID);
            e.Property(i => i.InspectionID).ValueGeneratedOnAdd();
            e.Property(i => i.ProductName).HasMaxLength(200).HasDefaultValue("");
            e.Property(i => i.Sku).HasMaxLength(50).HasDefaultValue("");
            e.Property(i => i.Priority).HasMaxLength(20).HasDefaultValue("Medium");
            e.Property(i => i.InspectorName).IsRequired().HasMaxLength(200);
            e.Property(i => i.Status).IsRequired().HasMaxLength(50).HasDefaultValue("Pending");
            e.Property(i => i.Notes).HasMaxLength(1000);
            e.HasIndex(i => i.WorkOrderID);
            e.HasIndex(i => i.Status);
        });

        // ── Defect ────────────────────────────────────────────────────────────
        modelBuilder.Entity<Defect>(e =>
        {
            e.HasKey(d => d.DefectID);
            e.Property(d => d.DefectID).ValueGeneratedOnAdd();
            e.Property(d => d.ProductName).HasMaxLength(200).HasDefaultValue("");
            e.Property(d => d.Severity).IsRequired().HasMaxLength(50);
            e.Property(d => d.DefectType).IsRequired().HasMaxLength(200);
            e.Property(d => d.RootCause).HasMaxLength(300).HasDefaultValue("");
            e.Property(d => d.ActionTaken).HasMaxLength(50).HasDefaultValue("Rework");
            e.Property(d => d.Status).IsRequired().HasMaxLength(50).HasDefaultValue("Open");
            e.Property(d => d.ReportedBy).HasMaxLength(200).HasDefaultValue("");
            e.Property(d => d.Notes).HasMaxLength(500);

            e.HasOne(d => d.Inspection)
             .WithMany(i => i.Defects)
             .HasForeignKey(d => d.InspectionID)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(d => d.InspectionID);
            e.HasIndex(d => d.Status);
            e.HasIndex(d => d.WorkOrderID);
        });
    }
}
