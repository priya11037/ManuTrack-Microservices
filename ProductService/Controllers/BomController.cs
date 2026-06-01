using ManuTrack.SharedKernel.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductService.DTOs;
using ProductService.Services.Interfaces;

namespace ProductService.Controllers;

[ApiController]
[Route("api/v1/bom")]
[Authorize]
public class BomController(IBomService service) : ControllerBase
{
    /// <summary>GET /api/v1/bom/product/{productId} — returns nested BOM tree for a product</summary>
    [HttpGet("product/{productId:int}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<BomItemViewModel>>>> GetByProduct(int productId)
    {
        var result = await service.GetBomsByProductIdAsync(productId);
        return Ok(result);
    }

    /// <summary>POST /api/v1/bom — add a BOM item (root or child)</summary>
    [HttpPost]
    [Authorize(Roles = "Admin,ProductionPlanner")]
    public async Task<ActionResult<ApiResponse<BomItemViewModel>>> Create([FromBody] CreateBomItemRequest request)
    {
        var result = await service.CreateBomItemAsync(request);
        return Ok(result);
    }

    /// <summary>DELETE /api/v1/bom/{id} — remove a BOM item and its children</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,ProductionPlanner")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        var result = await service.DeleteBomItemAsync(id);
        return Ok(result);
    }
}
