using ManuTrack.SharedKernel.Responses;
using WorkOrderService.DTOs;

namespace WorkOrderService.Services.Interfaces;

public interface IWorkOrderTaskService
{
    Task<ApiResponse<IEnumerable<WorkOrderTaskViewModel>>> GetByWorkOrderIdAsync(int workOrderId);
    Task<ApiResponse<IEnumerable<WorkOrderTaskViewModel>>> GetOpenByAssigneeAsync(string assignedTo);
    Task<ApiResponse<WorkOrderTaskViewModel>> GetByIdAsync(int id);
    Task<ApiResponse<WorkOrderTaskViewModel>> CreateAsync(CreateWorkOrderTaskRequest request);
    Task<ApiResponse<WorkOrderTaskViewModel>> UpdateAsync(int id, UpdateWorkOrderTaskRequest request);
    Task<ApiResponse<WorkOrderTaskViewModel>> UpdateStatusAsync(int id, UpdateTaskStatusRequest request);
    Task<ApiResponse> DeleteAsync(int id);
}
