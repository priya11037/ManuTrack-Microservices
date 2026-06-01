using ManuTrack.SharedKernel.Responses;
using WorkOrderService.DTOs;

namespace WorkOrderService.Services.Interfaces;

public interface IWorkOrderService
{
    Task<ApiResponse<IEnumerable<WorkOrderViewModel>>> GetAllAsync(string? status, int? productId, string? assignedTo = null);
    Task<ApiResponse<WorkOrderViewModel>> GetByIdAsync(int id);
    Task<ApiResponse<WorkOrderViewModel>> CreateAsync(CreateWorkOrderRequest request);
    Task<ApiResponse<WorkOrderViewModel>> UpdateAsync(int id, UpdateWorkOrderRequest request);
    Task<ApiResponse<WorkOrderViewModel>> UpdateStatusAsync(int id, UpdateWorkOrderStatusRequest request);
    Task<ApiResponse> DeleteAsync(int id);
}
