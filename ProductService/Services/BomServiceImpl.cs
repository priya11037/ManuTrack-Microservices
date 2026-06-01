using ManuTrack.SharedKernel.Exceptions;
using ManuTrack.SharedKernel.Responses;
using ProductService.DTOs;
using ProductService.Models;
using ProductService.Repositories.Interfaces;
using ProductService.Services.Interfaces;

namespace ProductService.Services;

public class BomServiceImpl(
    IBomRepository   bomRepo,
    IProductRepository productRepo,
    ILogger<BomServiceImpl> logger) : IBomService
{
    // ── Public methods ─────────────────────────────────────────────────────────

    public async Task<ApiResponse<IEnumerable<BomItemViewModel>>> GetBomsByProductIdAsync(int productId)
    {
        if (!await productRepo.ExistsAsync(productId))
            throw new NotFoundException($"Product {productId} not found.");

        var flat = await bomRepo.GetByProductIdAsync(productId);
        var tree = BuildTree(flat.ToList(), null);
        return ApiResponse<IEnumerable<BomItemViewModel>>.Ok(tree);
    }

    public async Task<ApiResponse<BomItemViewModel>> CreateBomItemAsync(CreateBomItemRequest request)
    {
        if (!await productRepo.ExistsAsync(request.ProductID))
            throw new NotFoundException($"Product {request.ProductID} not found.");

        // If a ParentID is provided, it must exist and belong to the same product
        if (request.ParentID.HasValue)
        {
            var parent = await bomRepo.GetByIdAsync(request.ParentID.Value)
                ?? throw new NotFoundException($"Parent BOM item {request.ParentID} not found.");
            if (parent.ProductID != request.ProductID)
                throw new ValidationException("Parent item belongs to a different product.");
        }

        var item = new BomItem
        {
            ProductID   = request.ProductID,
            ParentID    = request.ParentID,
            Name        = request.Name.Trim(),
            Quantity    = request.Quantity,
            Unit        = request.Unit,
            Type        = request.Type,
            CreatedDate = DateTime.UtcNow,
        };

        var created = await bomRepo.CreateAsync(item);
        return ApiResponse<BomItemViewModel>.Ok(Map(created), "BOM item added successfully.");
    }

    public async Task<ApiResponse> DeleteBomItemAsync(int id)
    {
        var item = await bomRepo.GetByIdAsync(id)
            ?? throw new NotFoundException($"BOM item {id} not found.");

        await bomRepo.DeleteAsync(item);
        return ApiResponse.Ok("BOM item deleted.");
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /// <summary>Recursively builds a parent-child tree from a flat list.</summary>
    private static List<BomItemViewModel> BuildTree(List<BomItem> all, int? parentId)
    {
        return all
            .Where(b => b.ParentID == parentId)
            .Select(b => new BomItemViewModel
            {
                BomItemID   = b.BomItemID,
                ProductID   = b.ProductID,
                ParentID    = b.ParentID,
                Name        = b.Name,
                Quantity    = b.Quantity,
                Unit        = b.Unit,
                Type        = b.Type,
                CreatedDate = b.CreatedDate,
                Children    = BuildTree(all, b.BomItemID),
            })
            .ToList();
    }

    private static BomItemViewModel Map(BomItem b) => new()
    {
        BomItemID   = b.BomItemID,
        ProductID   = b.ProductID,
        ParentID    = b.ParentID,
        Name        = b.Name,
        Quantity    = b.Quantity,
        Unit        = b.Unit,
        Type        = b.Type,
        CreatedDate = b.CreatedDate,
        Children    = new List<BomItemViewModel>(),
    };
}
