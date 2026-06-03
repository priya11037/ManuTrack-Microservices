using ManuTrack.SharedKernel.Responses;
using QualityService.DTOs;

namespace QualityService.Services.Interfaces;

public interface IInspectionService
{
    Task<ApiResponse<IEnumerable<InspectionViewModel>>> GetAllAsync(string? status, int? workOrderId);
    Task<ApiResponse<InspectionViewModel>> GetByIdAsync(int id);
    Task<ApiResponse<InspectionViewModel>> CreateAsync(CreateInspectionRequest request);
    Task<ApiResponse<InspectionViewModel>> UpdateResultAsync(int id, UpdateInspectionStatusRequest request);
    Task<ApiResponse<InspectionViewModel>> ReassignAsync(int id, ReassignInspectionRequest request);
}
