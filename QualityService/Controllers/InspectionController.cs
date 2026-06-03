using ManuTrack.SharedKernel.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QualityService.DTOs;
using QualityService.Services.Interfaces;

namespace QualityService.Controllers;

[ApiController]
[Route("api/v1/inspections")]
[Authorize]
public class InspectionController(IInspectionService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<InspectionViewModel>>>> GetAll(
        [FromQuery] string? status, [FromQuery] int? workOrderId)
        => Ok(await service.GetAllAsync(status, workOrderId));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<InspectionViewModel>>> GetById(int id)
        => Ok(await service.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = "Admin,QualityInspector")]
    public async Task<ActionResult<ApiResponse<InspectionViewModel>>> Create([FromBody] CreateInspectionRequest request)
    {
        var result = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.InspectionID }, result);
    }

    [HttpPut("{id:int}/result")]
    [Authorize(Roles = "Admin,QualityInspector")]
    public async Task<ActionResult<ApiResponse<InspectionViewModel>>> UpdateResult(int id, [FromBody] UpdateInspectionStatusRequest request)
        => Ok(await service.UpdateResultAsync(id, request));

    [HttpPut("{id:int}/reassign")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<InspectionViewModel>>> Reassign(int id, [FromBody] ReassignInspectionRequest request)
        => Ok(await service.ReassignAsync(id, request));
}
