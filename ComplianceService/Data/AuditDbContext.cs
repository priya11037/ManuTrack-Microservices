using ComplianceService.Models;
using Microsoft.EntityFrameworkCore;

namespace ComplianceService.Data;

public class AuditDbContext(DbContextOptions<AuditDbContext> options) : DbContext(options)
{
    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AuditEntry>(e =>
        {
            e.HasKey(a => a.AuditID);
            e.Property(a => a.AuditID).ValueGeneratedOnAdd();
            e.Property(a => a.UserName).IsRequired().HasMaxLength(200).HasDefaultValue("");
            e.Property(a => a.Action).IsRequired().HasMaxLength(200);
            e.Property(a => a.EntityType).IsRequired().HasMaxLength(100);
            e.Property(a => a.EntityID).IsRequired().HasMaxLength(100);
            e.Property(a => a.ServiceName).HasMaxLength(100).HasDefaultValue("");
            e.Property(a => a.Details).HasColumnType("nvarchar(max)");
            e.Property(a => a.Severity).HasMaxLength(20).HasDefaultValue("info");
            e.Property(a => a.IpAddress).HasMaxLength(45).HasDefaultValue("");
            e.HasIndex(a => a.Timestamp);
            e.HasIndex(a => a.UserID);
            e.HasIndex(a => a.ServiceName);
            e.HasIndex(a => a.Severity);
        });
    }
}
