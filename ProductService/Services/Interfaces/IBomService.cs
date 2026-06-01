using ManuTrack.SharedKernel.Responses;
using ProductService.DTOs;

namespace ProductService.Services.Interfaces;

public interface IBomService
{
    /// <summary>Get all BOM items for a product as a nested tree.</summary>
    Task<ApiResponse<IEnumerable<BomItemViewModel>>> GetBomsByProductIdAsync(int productId);

    /// <summary>Create a new BOM line item (root or nested).</summary>
    Task<ApiResponse<BomItemViewModel>> CreateBomItemAsync(CreateBomItemRequest request);

    /// <summary>Delete a BOM item and all its children.</summary>
    Task<ApiResponse> DeleteBomItemAsync(int id);
}
