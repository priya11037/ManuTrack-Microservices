using InventoryService.DTOs;
using InventoryService.Services.Interfaces;
using ManuTrack.SharedKernel.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryService.Controllers;

[ApiController]
[Route("api/v1/purchase-orders")]
[Authorize]
public class PurchaseOrderController(IPurchaseOrderService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<PurchaseOrderViewModel>>>> GetAll([FromQuery] string? status)
        => Ok(await service.GetAllAsync(status));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<PurchaseOrderViewModel>>> GetById(int id)
        => Ok(await service.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = "Admin,InventoryManager")]
    public async Task<ActionResult<ApiResponse<PurchaseOrderViewModel>>> Create([FromBody] CreatePurchaseOrderRequest request)
    {
        var result = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.PurchaseOrderID }, result);
    }

    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Admin,InventoryManager")]
    public async Task<ActionResult<ApiResponse<PurchaseOrderViewModel>>> UpdateStatus(int id, [FromBody] UpdatePurchaseOrderStatusRequest request)
        => Ok(await service.UpdateStatusAsync(id, request));
}
