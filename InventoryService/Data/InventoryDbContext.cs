using InventoryService.Models;
using Microsoft.EntityFrameworkCore;

namespace InventoryService.Data;

public class InventoryDbContext(DbContextOptions<InventoryDbContext> options) : DbContext(options)
{
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<InventoryLocation> InventoryLocations => Set<InventoryLocation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ── InventoryItem ──────────────────────────────────────────────────────
        modelBuilder.Entity<InventoryItem>(e =>
        {
            e.HasKey(i => i.InventoryID);
            e.Property(i => i.InventoryID).ValueGeneratedOnAdd();
            e.Property(i => i.Sku).HasMaxLength(50);
            e.Property(i => i.Name).IsRequired().HasMaxLength(200);
            e.Property(i => i.Category).HasMaxLength(100);
            e.Property(i => i.Unit).HasMaxLength(20).HasDefaultValue("pcs");
            e.Property(i => i.Location).HasMaxLength(200);
            e.Property(i => i.QuantityOnHand).HasColumnType("decimal(18,4)");
            e.Property(i => i.MinimumQuantity).HasColumnType("decimal(18,4)");
            e.Property(i => i.MaximumQuantity).HasColumnType("decimal(18,4)").HasDefaultValue(9999m);
            e.Property(i => i.UnitCost).HasColumnType("decimal(18,4)");
            e.Property(i => i.Supplier).HasMaxLength(200);
            e.Property(i => i.Status).IsRequired().HasMaxLength(50).HasDefaultValue("InStock");
            e.Property(i => i.Notes).HasMaxLength(500);

            e.HasMany(i => i.StockMovements)
             .WithOne(m => m.InventoryItem)
             .HasForeignKey(m => m.InventoryID)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(i => i.Sku);
            e.HasIndex(i => i.Status);
        });

        // ── StockMovement ──────────────────────────────────────────────────────
        modelBuilder.Entity<StockMovement>(e =>
        {
            e.HasKey(m => m.MovementID);
            e.Property(m => m.MovementID).ValueGeneratedOnAdd();
            e.Property(m => m.MovementType).IsRequired().HasMaxLength(50);
            e.Property(m => m.Quantity).HasColumnType("decimal(18,4)");
            e.Property(m => m.Reason).IsRequired().HasMaxLength(500);
            e.Property(m => m.ReferenceID).HasMaxLength(100);
            e.HasIndex(m => m.InventoryID);
        });

        // ── PurchaseOrder ──────────────────────────────────────────────────────
        modelBuilder.Entity<PurchaseOrder>(e =>
        {
            e.HasKey(p => p.POID);
            e.Property(p => p.POID).ValueGeneratedOnAdd();
            e.Property(p => p.PONumber).IsRequired().HasMaxLength(50).HasDefaultValue("");
            e.Property(p => p.SupplierName).IsRequired().HasMaxLength(200).HasDefaultValue("");
            e.Property(p => p.ItemName).IsRequired().HasMaxLength(200).HasDefaultValue("");
            e.Property(p => p.ItemSku).HasMaxLength(50).HasDefaultValue("");
            e.Property(p => p.Quantity).HasColumnType("decimal(18,4)");
            e.Property(p => p.UnitCost).HasColumnType("decimal(18,4)");
            e.Property(p => p.TotalCost).HasColumnType("decimal(18,4)");
            e.Property(p => p.Priority).IsRequired().HasMaxLength(20).HasDefaultValue("Medium");
            e.Property(p => p.Status).IsRequired().HasMaxLength(50).HasDefaultValue("Draft");
            e.Property(p => p.Notes).HasMaxLength(1000);
            e.HasIndex(p => p.Status);
            e.HasIndex(p => p.Priority);

        });

        // ── Supplier ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Supplier>(e =>
        {
            e.HasKey(s => s.SupplierID);
            e.Property(s => s.SupplierID).ValueGeneratedOnAdd();
            e.Property(s => s.Name).IsRequired().HasMaxLength(200);
            e.Property(s => s.ContactPerson).HasMaxLength(200);
            e.Property(s => s.Phone).HasMaxLength(50);
            e.Property(s => s.Email).HasMaxLength(200);
            e.Property(s => s.Address).HasMaxLength(500);
            e.HasIndex(s => s.Name);
        });

        // ── InventoryLocation ──────────────────────────────────────────────────
        modelBuilder.Entity<InventoryLocation>(e =>
        {
            e.HasKey(l => l.LocationID);
            e.Property(l => l.LocationID).ValueGeneratedOnAdd();
            e.Property(l => l.Name).IsRequired().HasMaxLength(200);
            e.Property(l => l.Description).HasMaxLength(500);
            e.HasIndex(l => l.Name);
        });

    }
}
