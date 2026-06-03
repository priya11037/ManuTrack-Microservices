using ManuTrack.SharedKernel.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkOrderService.DTOs;
using WorkOrderService.Services.Interfaces;

namespace WorkOrderService.Controllers;

[ApiController]
[Route("api/v1/workorders")]
[Authorize]
public class WorkOrderController(IWorkOrderService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<WorkOrderViewModel>>>> GetAll(
        [FromQuery] string? status,
        [FromQuery] int?    productId,
        [FromQuery] string? assignedTo)
    {
        var result = await service.GetAllAsync(status, productId, assignedTo);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkOrderViewModel>>> GetById(int id)
    {
        var result = await service.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProductionPlanner")]
    public async Task<ActionResult<ApiResponse<WorkOrderViewModel>>> Create([FromBody] CreateWorkOrderRequest request)
    {
        var result = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.WorkOrderID }, result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,ProductionPlanner")]
    public async Task<ActionResult<ApiResponse<WorkOrderViewModel>>> Update(int id, [FromBody] UpdateWorkOrderRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Admin,ProductionPlanner,ShopFloorOperator")]
    public async Task<ActionResult<ApiResponse<WorkOrderViewModel>>> UpdateStatus(int id, [FromBody] UpdateWorkOrderStatusRequest request)
    {
        var result = await service.UpdateStatusAsync(id, request);
        return Ok(result);
    }

    /// <summary>SFO-only endpoint: update produced qty + optionally status in one call.</summary>
    [HttpPut("{id:int}/progress")]
    [Authorize(Roles = "Admin,ProductionPlanner,ShopFloorOperator")]
    public async Task<ActionResult<ApiResponse<WorkOrderViewModel>>> UpdateProgress(
        int id, [FromBody] UpdateWorkOrderRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpPut("{id:int}/reassign")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<WorkOrderViewModel>>> Reassign(int id, [FromBody] ReassignWorkOrderRequest request)
    {
        var result = await service.ReassignAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        var result = await service.DeleteAsync(id);
        return Ok(result);
    }
}
