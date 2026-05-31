using ManuTrack.SharedKernel.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QualityService.DTOs;
using QualityService.Services.Interfaces;

namespace QualityService.Controllers;

[ApiController]
[Route("api/v1/defects")]
[Authorize]
public class DefectController(IDefectService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<DefectViewModel>>>> GetAll(
        [FromQuery] string? status, [FromQuery] string? severity)
        => Ok(await service.GetAllAsync(status, severity));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<DefectViewModel>>> GetById(int id)
        => Ok(await service.GetByIdAsync(id));

    [HttpGet("inspection/{inspectionId:int}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<DefectViewModel>>>> GetByInspection(int inspectionId)
        => Ok(await service.GetByInspectionIdAsync(inspectionId));

    [HttpPost]
    [Authorize(Roles = "Admin,QualityInspector")]
    public async Task<ActionResult<ApiResponse<DefectViewModel>>> Create([FromBody] CreateDefectRequest request)
    {
        var result = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.DefectID }, result);
    }

    [HttpPut("{id:int}/resolve")]
    [Authorize(Roles = "Admin,QualityInspector,ShopFloorOperator")]
    public async Task<ActionResult<ApiResponse<DefectViewModel>>> Resolve(int id, [FromBody] ResolveDefectRequest request)
        => Ok(await service.ResolveAsync(id, request));

    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Admin,QualityInspector")]
    public async Task<ActionResult<ApiResponse<DefectViewModel>>> UpdateStatus(int id, [FromBody] UpdateDefectStatusRequest request)
        => Ok(await service.UpdateStatusAsync(id, request));
}
