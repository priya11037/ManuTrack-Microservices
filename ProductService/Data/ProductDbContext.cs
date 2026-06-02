using Microsoft.EntityFrameworkCore;
using ProductService.Models;

namespace ProductService.Data;

public class ProductDbContext(DbContextOptions<ProductDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products  => Set<Product>();
    public DbSet<BomItem> BomItems  => Set<BomItem>();
    public DbSet<Bom> Boms          => Set<Bom>();              // Fix 9: register proper BOM relationship table

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ── Product ────────────────────────────────────────────────────────────
        modelBuilder.Entity<Product>(e =>
        {
            e.HasKey(p => p.ProductID);
            e.Property(p => p.ProductID).ValueGeneratedOnAdd();
            e.Property(p => p.Name).IsRequired().HasMaxLength(200);
            e.Property(p => p.Sku).HasMaxLength(50);
            e.Property(p => p.Category).IsRequired().HasMaxLength(100);
            e.Property(p => p.Version).IsRequired().HasMaxLength(20).HasDefaultValue("1.0");
            e.Property(p => p.Status).IsRequired().HasMaxLength(50).HasDefaultValue("Draft");
            e.Property(p => p.Description).HasMaxLength(1000);
            e.HasIndex(p => p.Name);
            e.HasIndex(p => p.Category);
        });

        // ── BomItem ────────────────────────────────────────────────────────────
        modelBuilder.Entity<BomItem>(e =>
        {
            e.HasKey(b => b.BomItemID);
            e.Property(b => b.BomItemID).ValueGeneratedOnAdd();
            e.Property(b => b.Name).IsRequired().HasMaxLength(200);
            e.Property(b => b.Quantity).IsRequired().HasColumnType("decimal(18,4)");
            e.Property(b => b.Unit).IsRequired().HasMaxLength(20).HasDefaultValue("pcs");
            e.Property(b => b.Type).IsRequired().HasMaxLength(50).HasDefaultValue("raw-material");

            // FK → Product (with CASCADE delete: delete product → delete all BOM items)
            e.HasOne(b => b.Product)
             .WithMany(p => p.BomItems)
             .HasForeignKey(b => b.ProductID)
             .OnDelete(DeleteBehavior.Cascade);

            // Self-referencing FK for tree (NO CASCADE to avoid cycles)
            e.HasOne(b => b.Parent)
             .WithMany(b => b.Children)
             .HasForeignKey(b => b.ParentID)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);

            e.HasIndex(b => b.ProductID);
            e.HasIndex(b => b.ParentID);
        });

        // ── Bom (spec-compliant ProductID → ComponentID relationship table) ────
        modelBuilder.Entity<Bom>(e =>
        {
            e.HasKey(b => b.BOMID);
            e.Property(b => b.BOMID).ValueGeneratedOnAdd();
            e.Property(b => b.Quantity).HasColumnType("decimal(18,4)");
            e.Property(b => b.Version).IsRequired().HasMaxLength(20).HasDefaultValue("1.0");
            e.Property(b => b.Status).IsRequired().HasMaxLength(50).HasDefaultValue("Active");
            e.Property(b => b.Notes).HasMaxLength(500);

            e.HasOne(b => b.Product)
             .WithMany()
             .HasForeignKey(b => b.ProductID)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(b => b.Component)
             .WithMany()
             .HasForeignKey(b => b.ComponentID)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(b => b.ProductID);
            e.HasIndex(b => b.ComponentID);
        });
    }
}
