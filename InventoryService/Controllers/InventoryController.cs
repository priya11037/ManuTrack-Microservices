using InventoryService.DTOs;
using InventoryService.Services.Interfaces;
using ManuTrack.SharedKernel.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryService.Controllers;

[ApiController]
[Route("api/v1/inventory")]
[Authorize]
public class InventoryController(IInventoryService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<InventoryItemViewModel>>>> GetAll(
        [FromQuery] string? status, [FromQuery] int? locationId)
        => Ok(await service.GetAllAsync(status, locationId));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<InventoryItemViewModel>>> GetById(int id)
        => Ok(await service.GetByIdAsync(id));

    [HttpGet("low-stock")]
    public async Task<ActionResult<ApiResponse<IEnumerable<InventoryItemViewModel>>>> GetLowStock()
        => Ok(await service.GetLowStockAsync());

    [HttpGet("{id:int}/movements")]
    public async Task<ActionResult<ApiResponse<IEnumerable<StockMovementViewModel>>>> GetMovements(int id)
        => Ok(await service.GetMovementsAsync(id));

    [HttpPost]
    [Authorize(Roles = "Admin,InventoryManager")]
    public async Task<ActionResult<ApiResponse<InventoryItemViewModel>>> Create([FromBody] CreateInventoryItemRequest request)
    {
        var result = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.InventoryID }, result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,InventoryManager")]
    public async Task<ActionResult<ApiResponse<InventoryItemViewModel>>> Update(int id, [FromBody] UpdateInventoryItemRequest request)
        => Ok(await service.UpdateAsync(id, request));

    [HttpPut("{id:int}/adjust")]
    [Authorize(Roles = "Admin,InventoryManager,ShopFloorOperator")]
    public async Task<ActionResult<ApiResponse<InventoryItemViewModel>>> AdjustQuantity(int id, [FromBody] AdjustQuantityRequest request)
        => Ok(await service.AdjustQuantityAsync(id, request));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
        => Ok(await service.DeleteAsync(id));
}
