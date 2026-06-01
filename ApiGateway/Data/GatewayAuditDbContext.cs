using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace ApiGateway.Data;

// Minimal model — maps to the same AuditEntries table in ManuTrackGovernanceDB
public class GatewayAuditEntry
{
    [Key]                               // ← explicit PK declaration
    public int     AuditID     { get; set; }
    public int     UserID      { get; set; }
    public string  UserName    { get; set; } = string.Empty;
    public string  Action      { get; set; } = string.Empty;
    public string  EntityType  { get; set; } = string.Empty;
    public string  EntityID    { get; set; } = string.Empty;
    public string  ServiceName { get; set; } = string.Empty;
    public string? Details     { get; set; }
    public DateTime Timestamp  { get; set; } = DateTime.UtcNow;
}

public class GatewayAuditDbContext(DbContextOptions<GatewayAuditDbContext> options)
    : DbContext(options)
{
    public DbSet<GatewayAuditEntry> AuditEntries => Set<GatewayAuditEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GatewayAuditEntry>(entity =>
        {
            entity.ToTable("AuditEntries");          // map to existing table
            entity.HasKey(e => e.AuditID);           // explicit primary key
            entity.Property(e => e.AuditID)
                  .ValueGeneratedOnAdd();             // auto-increment (IDENTITY)
        });
    }
}
