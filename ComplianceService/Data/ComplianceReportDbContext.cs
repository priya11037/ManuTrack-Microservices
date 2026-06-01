using ComplianceService.Models;
using Microsoft.EntityFrameworkCore;

namespace ComplianceService.Data;

public class ComplianceReportDbContext(DbContextOptions<ComplianceReportDbContext> options) : DbContext(options)
{
    public DbSet<ComplianceReport> ComplianceReports => Set<ComplianceReport>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ComplianceReport>(e =>
        {
            e.HasKey(r => r.ReportID);
            e.Property(r => r.ReportID).ValueGeneratedOnAdd();
            e.Property(r => r.ReportNumber).HasMaxLength(20).HasDefaultValue("");
            e.Property(r => r.Title).IsRequired().HasMaxLength(200);
            e.Property(r => r.Type).IsRequired().HasMaxLength(50).HasDefaultValue("");
            e.Property(r => r.Priority).IsRequired().HasMaxLength(20).HasDefaultValue("Medium");
            e.Property(r => r.Status).IsRequired().HasMaxLength(50).HasDefaultValue("Draft");
            e.Property(r => r.Period).HasMaxLength(100).HasDefaultValue("");
            e.Property(r => r.PreparedBy).HasMaxLength(200).HasDefaultValue("");
            e.Property(r => r.ReviewedBy).HasMaxLength(200).HasDefaultValue("");
            e.Property(r => r.Notes).HasMaxLength(1000);
            e.HasIndex(r => r.Type);
            e.HasIndex(r => r.Status);
        });
    }
}
