using ManuTrack.SharedKernel.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkOrderService.DTOs;
using WorkOrderService.Services.Interfaces;

namespace WorkOrderService.Controllers;

[ApiController]
[Route("api/v1/tasks")]
[Authorize]
public class WorkOrderTaskController(IWorkOrderTaskService service) : ControllerBase
{
    [HttpGet("workorder/{workOrderId:int}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<WorkOrderTaskViewModel>>>> GetByWorkOrder(int workOrderId)
    {
        var result = await service.GetByWorkOrderIdAsync(workOrderId);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkOrderTaskViewModel>>> GetById(int id)
    {
        var result = await service.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProductionPlanner,ShopFloorOperator")]
    public async Task<ActionResult<ApiResponse<WorkOrderTaskViewModel>>> Create([FromBody] CreateWorkOrderTaskRequest request)
    {
        var result = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.TaskID }, result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,ProductionPlanner,ShopFloorOperator")]
    public async Task<ActionResult<ApiResponse<WorkOrderTaskViewModel>>> Update(int id, [FromBody] UpdateWorkOrderTaskRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Admin,ProductionPlanner,ShopFloorOperator")]
    public async Task<ActionResult<ApiResponse<WorkOrderTaskViewModel>>> UpdateStatus(int id, [FromBody] UpdateTaskStatusRequest request)
    {
        var result = await service.UpdateStatusAsync(id, request);
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
