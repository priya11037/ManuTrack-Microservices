using System.Net.Http.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using WorkOrderService.Enums;
using ManuTrack.SharedKernel.Exceptions;
using ManuTrack.SharedKernel.Responses;
using WorkOrderService.DTOs;
using WorkOrderService.Models;
using WorkOrderService.Repositories.Interfaces;
using WorkOrderService.Services.Interfaces;

namespace WorkOrderService.Services;

public class WorkOrderServiceImpl(
    IWorkOrderRepository repo,
    IWorkOrderTaskRepository taskRepo,
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
    ILogger<WorkOrderServiceImpl> logger) : IWorkOrderService
{
    // ── Helpers ─────────────────────────────────────────────────────────────

    private string? GetBearerToken()
    {
        var auth = httpContextAccessor.HttpContext?.Request.Headers["Authorization"].ToString();
        return auth?.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) == true
            ? auth["Bearer ".Length..] : null;
    }

    private (int UserId, string UserName) GetCurrentUser()
    {
        var user = httpContextAccessor.HttpContext?.User;
        var idVal = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                 ?? user?.FindFirst("sub")?.Value;
        var name = user?.FindFirst(ClaimTypes.Name)?.Value
                ?? user?.FindFirst("name")?.Value
                ?? "Unknown";
        int.TryParse(idVal, out var id);
        return (id, name);
    }

    // ── Change 3: Completion notification (fire-and-forget) ──────────────────
    private async Task NotifyWorkOrderCompletedAsync(int workOrderId)
    {
        try
        {
            var (userId, _) = GetCurrentUser();
            if (userId == 0) return;

            var client = httpClientFactory.CreateClient("NotificationService");
            var token = GetBearerToken();
            if (token != null)
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            await client.PostAsJsonAsync("api/v1/notifications", new
            {
                UserID = userId,
                Title = "Work Order Completed",
                Message = $"Work Order #{workOrderId} has been completed successfully.",
                Category = "WorkOrder"
            });
        }
        catch (Exception ex) { logger.LogWarning(ex, "Work order completion notification failed for WO {WorkOrderId}.", workOrderId); }
    }

    private async Task LogAuditAsync(string action, string entityType, string entityId, string? details = null)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            if (userId == 0) return;

            var client = httpClientFactory.CreateClient("ComplianceService");
            var token = GetBearerToken();
            if (token != null)
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            await client.PostAsJsonAsync("api/v1/audit", new
            {
                UserID = userId,
                UserName = userName,
                Action = action,
                EntityType = entityType,
                EntityID = entityId,
                ServiceName = "WorkOrderService",
                Details = details
            });
        }
        catch (Exception ex) { logger.LogWarning(ex, "Audit log failed in WorkOrderService."); }
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    public async Task<ApiResponse<IEnumerable<WorkOrderViewModel>>> GetAllAsync(string? status, int? productId, string? assignedTo = null)
    {
        var orders = await repo.GetAllAsync(status, productId, assignedTo);
        return ApiResponse<IEnumerable<WorkOrderViewModel>>.Ok(orders.Select(Map));
    }

    public async Task<ApiResponse<WorkOrderViewModel>> GetByIdAsync(int id)
    {
        var order = await repo.GetByIdWithTasksAsync(id)
            ?? throw new NotFoundException($"WorkOrder {id} not found.");
        return ApiResponse<WorkOrderViewModel>.Ok(Map(order));
    }

    public async Task<ApiResponse<WorkOrderViewModel>> CreateAsync(CreateWorkOrderRequest request)
    {
        if (request.EndDate <= request.StartDate)
            throw new ValidationException("EndDate must be after StartDate.");

        // Auto-generate WoNumber
        var nextId   = await repo.GetNextIdAsync();
        var woNumber = $"WO-{nextId:D4}";

        var workOrder = new WorkOrder
        {
            WoNumber           = woNumber,
            ProductID          = request.ProductID,
            ProductName        = request.ProductName,
            Sku                = request.Sku ?? string.Empty,
            Quantity           = request.Quantity,
            Priority           = request.Priority ?? "Medium",
            ProductionLine     = request.ProductionLine ?? string.Empty,
            StartDate          = request.StartDate,
            EndDate            = request.EndDate,
            EstimatedStartDate = request.EstimatedStartDate,
            EstimatedEndDate   = request.EstimatedEndDate,
            AssignedTo         = request.AssignedTo,
            AssignedOperatorID = request.AssignedOperatorID,
            CreatedBy          = request.CreatedBy,
            Notes              = request.Notes,
            Status             = WorkOrderStatus.Pending,
            CreatedDate        = DateTime.UtcNow
        };

        var created = await repo.CreateAsync(workOrder);

        await LogAuditAsync("Created WorkOrder", "WorkOrder", created.WorkOrderID.ToString(),
            $"ProductID: {created.ProductID}, ProductName: {created.ProductName}, Quantity: {created.Quantity}");

        return ApiResponse<WorkOrderViewModel>.Ok(Map(created), "Work order created successfully.");
    }

    public async Task<ApiResponse<WorkOrderViewModel>> UpdateAsync(int id, UpdateWorkOrderRequest request)
    {
        var order = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"WorkOrder {id} not found.");

        if (request.Quantity.HasValue)           order.Quantity       = request.Quantity.Value;
        if (!string.IsNullOrEmpty(request.Priority))       order.Priority       = request.Priority;
        if (!string.IsNullOrEmpty(request.ProductionLine)) order.ProductionLine = request.ProductionLine;
        if (request.ProducedQty.HasValue)         order.ProducedQty    = request.ProducedQty.Value;
        if (request.StartDate.HasValue)           order.StartDate      = request.StartDate.Value;
        if (request.EndDate.HasValue)             order.EndDate        = request.EndDate.Value;
        if (request.EstimatedStartDate.HasValue)  order.EstimatedStartDate = request.EstimatedStartDate.Value;
        if (request.EstimatedEndDate.HasValue)    order.EstimatedEndDate   = request.EstimatedEndDate.Value;
        if (request.AssignedTo != null)           order.AssignedTo     = request.AssignedTo;
        if (request.AssignedOperatorID.HasValue)  order.AssignedOperatorID = request.AssignedOperatorID.Value;
        if (request.CreatedBy != null)            order.CreatedBy      = request.CreatedBy;
        if (request.Notes != null)                order.Notes          = request.Notes;
        order.ModifiedDate = DateTime.UtcNow;

        var updated = await repo.UpdateAsync(order);

        await LogAuditAsync("Updated WorkOrder", "WorkOrder", id.ToString(),
            $"Quantity: {updated.Quantity}, AssignedTo: {updated.AssignedTo}");

        return ApiResponse<WorkOrderViewModel>.Ok(Map(updated), "Work order updated successfully.");
    }

    public async Task<ApiResponse<WorkOrderViewModel>> UpdateStatusAsync(int id, UpdateWorkOrderStatusRequest request)
    {
        var order = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"WorkOrder {id} not found.");

        // Only block Completed if backend tasks exist and are incomplete.
        // (WOs from the schedule UI have no backend tasks, so incompleteTasks will be 0.)
        // Inspection validation is NOT required — QI does inspections independently.
        if (request.Status == WorkOrderStatus.Completed)
        {
            var tasks = await taskRepo.GetByWorkOrderIdAsync(id);
            var incompleteTasks = tasks.Count(t =>
                t.Status == WorkOrderTaskStatus.Pending ||
                t.Status == WorkOrderTaskStatus.InProgress);

            if (incompleteTasks > 0)
                throw new ValidationException(
                    $"Cannot complete work order — {incompleteTasks} task(s) are still incomplete.");
        }

        // auto-set ActualStartDate / ActualEndDate on status transition
        if (request.Status == WorkOrderStatus.InProgress && order.ActualStartDate == null)
            order.ActualStartDate = DateTime.UtcNow;

        if (request.Status == WorkOrderStatus.Completed)
            order.ActualEndDate = DateTime.UtcNow;

        order.Status = request.Status;
        order.ModifiedDate = DateTime.UtcNow;

        var updated = await repo.UpdateAsync(order);

        await LogAuditAsync("Updated WorkOrder Status", "WorkOrder", id.ToString(),
            $"New Status: {request.Status}");

        // Notify on Completed (fire-and-forget)
        if (request.Status == WorkOrderStatus.Completed)
        {
            await NotifyWorkOrderCompletedAsync(id);
            // ── Option A: consume BOM materials from inventory, add finished goods ──
            // Fire-and-forget: runs in background, never blocks or throws to caller
            _ = Task.Run(() => ConsumeInventoryOnCompletionAsync(updated));
        }

        // reload with tasks for accurate ProgressPercentage
        var withTasks = await repo.GetByIdWithTasksAsync(id);
        return ApiResponse<WorkOrderViewModel>.Ok(Map(withTasks!), "Work order status updated.");
    }

    public async Task<ApiResponse> DeleteAsync(int id)
    {
        var order = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"WorkOrder {id} not found.");

        await repo.DeleteAsync(order);

        await LogAuditAsync("Deleted WorkOrder", "WorkOrder", id.ToString(),
            $"ProductName: {order.ProductName}, Quantity: {order.Quantity}");

        return ApiResponse.Ok("Work order deleted successfully.");
    }

    // ── Change 7: Validate passed inspection before Completed ────────────────
    private async Task ValidatePassedInspectionAsync(int workOrderId)
    {
        try
        {
            var client = httpClientFactory.CreateClient("QualityService");
            var token = GetBearerToken();
            if (token != null)
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync($"api/v1/inspections?workOrderId={workOrderId}");
            if (!response.IsSuccessStatusCode) return; // QualityService unavailable — allow through

            var result = await response.Content
                .ReadFromJsonAsync<InspectionListResponseDto>(
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            var inspections = result?.Data;
            if (inspections == null) return;

            var hasPassedInspection = inspections.Any(i =>
                i.Result?.Equals("Pass", StringComparison.OrdinalIgnoreCase) == true &&
                i.Status?.Equals("Completed", StringComparison.OrdinalIgnoreCase) == true);

            if (!hasPassedInspection)
                throw new ValidationException(
                    "Work order cannot be completed without a passed inspection. " +
                    "Please complete quality inspection first.");
        }
        catch (ValidationException) { throw; }
        catch (Exception ex) { logger.LogWarning(ex, "QualityService unavailable during inspection validation for WO {WorkOrderId}. Allowing through.", workOrderId); }
    }

    // ── Local DTOs for QualityService response ────────────────────────────────
    private sealed class InspectionListResponseDto
    {
        public IEnumerable<InspectionSummaryDto>? Data { get; set; }
    }
    private sealed class InspectionSummaryDto
    {
        public string? Result { get; set; }
        public string? Status { get; set; }
    }

    // ── Option A: Consume BOM materials & add finished goods ──────────────────
    // Called fire-and-forget from UpdateStatusAsync when WO → Completed.
    // NEVER throws — logs warnings and skips gracefully on any failure.
    private async Task ConsumeInventoryOnCompletionAsync(WorkOrder order)
    {
        try
        {
            var token   = GetBearerToken();
            var produced = order.ProducedQty > 0 ? order.ProducedQty : order.Quantity;

            // ── 1. Get all current inventory items ───────────────────────────
            var invClient = httpClientFactory.CreateClient("InventoryService");
            if (token != null)
                invClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var invResp = await invClient.GetAsync("api/v1/inventory");
            if (!invResp.IsSuccessStatusCode)
            {
                logger.LogWarning("InventoryService unavailable — skipping BOM consumption for WO {WoNumber}.", order.WoNumber);
                return;
            }

            var invResult = await invResp.Content
                .ReadFromJsonAsync<InventoryListDto>(
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            var allInventory = invResult?.Data?.ToList() ?? [];

            // ── 2. Get BOM for this product ──────────────────────────────────
            var prodClient = httpClientFactory.CreateClient("ProductService");
            if (token != null)
                prodClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var bomResp = await prodClient.GetAsync($"api/v1/bom/product/{order.ProductID}");
            var bomItems = new List<BomItemDto>();

            if (bomResp.IsSuccessStatusCode)
            {
                var bomResult = await bomResp.Content
                    .ReadFromJsonAsync<BomListDto>(
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                bomItems = bomResult?.Data?.ToList() ?? [];
            }
            else
            {
                logger.LogWarning("No BOM found for ProductID {ProductID} — skipping material deduction.", order.ProductID);
            }

            // ── 3. Deduct BOM materials from inventory (fire-and-forget each) ──
            foreach (var bom in bomItems)
            {
                // Match BOM item to inventory item by name (case-insensitive)
                var match = allInventory.FirstOrDefault(i =>
                    string.Equals(i.Name, bom.Name, StringComparison.OrdinalIgnoreCase));

                if (match == null)
                {
                    logger.LogInformation(
                        "BOM item '{BomName}' has no matching inventory item — skipping deduction.", bom.Name);
                    continue;
                }

                var deductQty = (double)bom.Quantity * produced;
                var adjustUrl = $"api/v1/inventory/{match.InventoryID}/adjust";
                var adjustBody = new
                {
                    Adjustment = -deductQty,
                    Reason = $"Consumed by {order.WoNumber} ({order.ProductName}, {produced} units produced)"
                };

                var adjustResp = await invClient.PutAsJsonAsync(adjustUrl, adjustBody);
                if (adjustResp.IsSuccessStatusCode)
                    logger.LogInformation(
                        "Deducted {Qty} of '{Item}' from inventory for WO {WoNumber}.",
                        deductQty, bom.Name, order.WoNumber);
                else
                    logger.LogWarning(
                        "Failed to deduct '{Item}' from inventory (HTTP {Status}).",
                        bom.Name, adjustResp.StatusCode);
            }

            // ── 4. Add finished goods to inventory ───────────────────────────
            // Find an existing finished-good inventory item with the same product name
            var finishedGood = allInventory.FirstOrDefault(i =>
                string.Equals(i.Name, order.ProductName, StringComparison.OrdinalIgnoreCase));

            if (finishedGood != null)
            {
                // Existing: increment qty
                var fgUrl  = $"api/v1/inventory/{finishedGood.InventoryID}/adjust";
                var fgBody = new
                {
                    Adjustment = (double)produced,
                    Reason = $"Finished goods from {order.WoNumber}"
                };
                var fgResp = await invClient.PutAsJsonAsync(fgUrl, fgBody);
                if (fgResp.IsSuccessStatusCode)
                    logger.LogInformation(
                        "Added {Qty} finished units of '{Product}' to inventory.", produced, order.ProductName);
            }
            else
            {
                // New product: create finished good entry
                var createBody = new
                {
                    Sku          = order.Sku,
                    Name         = order.ProductName,
                    Category     = "Finished Good",
                    Unit         = "pcs",
                    Location     = string.Empty,
                    CurrentStock = (double)produced,
                    MinStock     = 0,
                    MaxStock     = 99999,
                    UnitCost     = 0,
                    Supplier     = "Internal",
                    Notes        = $"Auto-created on WO {order.WoNumber} completion"
                };
                var createResp = await invClient.PostAsJsonAsync("api/v1/inventory", createBody);
                if (createResp.IsSuccessStatusCode)
                    logger.LogInformation(
                        "Created new finished good inventory entry for '{Product}'.", order.ProductName);
            }

            // ── 5. Notify Inventory Manager about the consumption ────────────
            try
            {
                var (userId, _) = GetCurrentUser();
                if (userId > 0)
                {
                    var notifyClient = httpClientFactory.CreateClient("NotificationService");
                    if (token != null)
                        notifyClient.DefaultRequestHeaders.Authorization =
                            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

                    await notifyClient.PostAsJsonAsync("api/v1/notifications", new
                    {
                        UserID   = userId,
                        Title    = "Production Completed — Stock Updated",
                        Message  = $"{order.WoNumber} completed: {produced} × {order.ProductName} added to finished goods. {bomItems.Count} material(s) deducted.",
                        Category = "Inventory"
                    });
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to send inventory notification for WO {WoNumber}.", order.WoNumber);
            }
        }
        catch (Exception ex)
        {
            // Never propagate — this is fire-and-forget
            logger.LogError(ex, "ConsumeInventoryOnCompletionAsync failed for WO {WoNumber}. System unaffected.", order.WoNumber);
        }
    }

    // ── Local DTOs for cross-service responses ────────────────────────────────
    private sealed class InventoryListDto      { public IEnumerable<InventoryItemDto>? Data { get; set; } }
    private sealed class InventoryItemDto
    {
        public int    InventoryID { get; set; }
        public string Name        { get; set; } = string.Empty;
        public decimal CurrentStock { get; set; }
        public decimal MinStock     { get; set; }
    }
    private sealed class BomListDto           { public IEnumerable<BomItemDto>? Data { get; set; } }
    private sealed class BomItemDto
    {
        public string  Name     { get; set; } = string.Empty;
        public decimal Quantity { get; set; }  // qty per 1 unit of product
        public string  Unit     { get; set; } = string.Empty;
    }

    // ── Mapper ───────────────────────────────────────────────────────────────

    private static WorkOrderViewModel Map(WorkOrder w)
    {
        var totalTasks = w.Tasks.Count;
        var completedTasks = w.Tasks.Count(t => t.Status == WorkOrderTaskStatus.Completed);
        var progress = totalTasks == 0 ? 0m : Math.Round((decimal)completedTasks / totalTasks * 100, 1);

        var isOverdue = w.EstimatedEndDate.HasValue
            && w.EstimatedEndDate.Value < DateTime.UtcNow
            && w.Status != WorkOrderStatus.Completed
            && w.Status != WorkOrderStatus.Cancelled;

        return new WorkOrderViewModel
        {
            WorkOrderID        = w.WorkOrderID,
            WoNumber           = w.WoNumber,           // ← was missing
            ProductID          = w.ProductID,
            ProductName        = w.ProductName,
            Sku                = w.Sku,                // ← was missing
            Quantity           = w.Quantity,
            ProducedQty        = w.ProducedQty,        // ← was missing
            Priority           = w.Priority,           // ← was missing
            ProductionLine     = w.ProductionLine,     // ← was missing
            StartDate          = w.StartDate,
            EndDate            = w.EndDate,
            EstimatedStartDate = w.EstimatedStartDate,
            EstimatedEndDate   = w.EstimatedEndDate,
            ActualStartDate    = w.ActualStartDate,
            ActualEndDate      = w.ActualEndDate,
            Status             = w.Status,
            AssignedTo         = w.AssignedTo,
            AssignedOperatorID = w.AssignedOperatorID,
            CreatedBy          = w.CreatedBy,
            Notes              = w.Notes,
            CreatedDate        = w.CreatedDate,
            ModifiedDate       = w.ModifiedDate,
            TaskCount          = totalTasks,
            ProgressPercentage = progress,
            IsOverdue          = isOverdue
        };
    }
}
