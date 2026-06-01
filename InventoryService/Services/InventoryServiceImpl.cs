using System.Net.Http.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using InventoryService.DTOs;
using InventoryService.Enums;
using InventoryService.Models;
using InventoryService.Repositories.Interfaces;
using InventoryService.Services.Interfaces;
using ManuTrack.SharedKernel.Exceptions;
using ManuTrack.SharedKernel.Responses;

namespace InventoryService.Services;

public class InventoryServiceImpl(
    IInventoryRepository repo,
    IStockMovementRepository movementRepo,
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
    ILogger<InventoryServiceImpl> logger) : IInventoryService
{
    // ── Helpers ──────────────────────────────────────────────────────────────

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

    private HttpClient CreateAuthorizedClient(string name)
    {
        var client = httpClientFactory.CreateClient(name);
        var token  = GetBearerToken();
        if (token != null)
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task LogAuditAsync(string action, string entity, string entityId, string? details = null)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            if (userId == 0) return;
            var client = CreateAuthorizedClient("ComplianceService");
            await client.PostAsJsonAsync("api/v1/audit", new
            {
                UserID = userId, UserName = userName, Action = action,
                EntityType = entity, EntityID = entityId,
                ServiceName = "InventoryService", Details = details
            });
        }
        catch (Exception ex) { logger.LogWarning(ex, "Audit log failed."); }
    }

    private static string DetermineStatus(decimal qty, decimal minQty) =>
        qty <= 0       ? InventoryStatus.OutOfStock :
        qty <= minQty  ? InventoryStatus.LowStock   :
                         InventoryStatus.InStock;

    private async Task UpdateStatusAndNotify(InventoryItem item)
    {
        var newStatus   = DetermineStatus(item.QuantityOnHand, item.MinimumQuantity);
        var changed     = item.Status != newStatus;
        item.Status     = newStatus;

        if (changed && newStatus != InventoryStatus.InStock)
        {
            try
            {
                var (userId, _) = GetCurrentUser();
                if (userId == 0) return;
                var client  = CreateAuthorizedClient("NotificationService");
                var msg     = newStatus == InventoryStatus.OutOfStock
                    ? $"OUT OF STOCK: '{item.Name}' (SKU: {item.Sku}). Qty: {item.QuantityOnHand}"
                    : $"LOW STOCK: '{item.Name}' (SKU: {item.Sku}). Current: {item.QuantityOnHand}, Min: {item.MinimumQuantity}";
                await client.PostAsJsonAsync("api/v1/notifications", new
                {
                    UserID   = userId,
                    Title    = newStatus == InventoryStatus.OutOfStock ? "Out of Stock Alert" : "Low Stock Warning",
                    Message  = msg,
                    Category = "Inventory"
                });
            }
            catch (Exception ex) { logger.LogWarning(ex, "Low-stock notification failed for {ItemId}.", item.InventoryID); }
        }
    }

    private async Task RecordMovementAsync(int inventoryId, string type, decimal qty, string reason, string? refId = null)
    {
        try
        {
            var (userId, _) = GetCurrentUser();
            await movementRepo.CreateAsync(new StockMovement
            {
                InventoryID  = inventoryId,
                MovementType = type,
                Quantity     = qty,
                Reason       = reason,
                ReferenceID  = refId,
                PerformedBy  = userId,
                CreatedDate  = DateTime.UtcNow
            });
        }
        catch (Exception ex) { logger.LogWarning(ex, "Stock movement record failed for {InventoryId}.", inventoryId); }
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public async Task<ApiResponse<IEnumerable<InventoryItemViewModel>>> GetAllAsync(string? status, int? locationId)
    {
        var items = await repo.GetAllAsync(status, null);   // locationId no longer used
        return ApiResponse<IEnumerable<InventoryItemViewModel>>.Ok(items.Select(Map));
    }

    public async Task<ApiResponse<InventoryItemViewModel>> GetByIdAsync(int id)
    {
        var item = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Inventory item {id} not found.");
        return ApiResponse<InventoryItemViewModel>.Ok(Map(item));
    }

    public async Task<ApiResponse<IEnumerable<InventoryItemViewModel>>> GetLowStockAsync()
    {
        var items = await repo.GetLowStockAsync();
        return ApiResponse<IEnumerable<InventoryItemViewModel>>.Ok(items.Select(Map));
    }

    public async Task<ApiResponse<IEnumerable<StockMovementViewModel>>> GetMovementsAsync(int inventoryId)
    {
        if (!await repo.ExistsAsync(inventoryId))
            throw new NotFoundException($"Inventory item {inventoryId} not found.");
        var movements = await movementRepo.GetByInventoryIdAsync(inventoryId);
        return ApiResponse<IEnumerable<StockMovementViewModel>>.Ok(movements.Select(MapMovement));
    }

    public async Task<ApiResponse<InventoryItemViewModel>> CreateAsync(CreateInventoryItemRequest request)
    {
        var item = new InventoryItem
        {
            Sku             = request.Sku,
            Name            = request.Name,
            Category        = request.Category,
            Unit            = request.Unit,
            Location        = request.Location,
            QuantityOnHand  = request.CurrentStock,
            MinimumQuantity = request.MinStock,
            MaximumQuantity = request.MaxStock,
            UnitCost        = request.UnitCost,
            Supplier        = request.Supplier,
            Notes           = request.Notes,
            CreatedDate     = DateTime.UtcNow,
        };

        await UpdateStatusAndNotify(item);
        var created = await repo.CreateAsync(item);

        if (request.CurrentStock > 0)
            await RecordMovementAsync(created.InventoryID, StockMovementType.StockIn,
                request.CurrentStock, "Initial stock entry");

        await LogAuditAsync("Created Inventory Item", "InventoryItem", created.InventoryID.ToString(),
            $"SKU: {created.Sku}, Name: {created.Name}, Qty: {created.QuantityOnHand}");

        return ApiResponse<InventoryItemViewModel>.Ok(Map(created), "Inventory item created.");
    }

    public async Task<ApiResponse<InventoryItemViewModel>> UpdateAsync(int id, UpdateInventoryItemRequest request)
    {
        var item = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Inventory item {id} not found.");

        if (request.Sku      != null) item.Sku             = request.Sku;
        if (request.Name     != null) item.Name            = request.Name;
        if (request.Category != null) item.Category        = request.Category;
        if (request.Unit     != null) item.Unit            = request.Unit;
        if (request.Location != null) item.Location        = request.Location;
        if (request.Supplier != null) item.Supplier        = request.Supplier;
        if (request.Notes    != null) item.Notes           = request.Notes;
        if (request.CurrentStock.HasValue) item.QuantityOnHand  = request.CurrentStock.Value;
        if (request.MinStock.HasValue)     item.MinimumQuantity = request.MinStock.Value;
        if (request.MaxStock.HasValue)     item.MaximumQuantity = request.MaxStock.Value;
        if (request.UnitCost.HasValue)     item.UnitCost        = request.UnitCost.Value;
        item.ModifiedDate = DateTime.UtcNow;

        await UpdateStatusAndNotify(item);
        var updated = await repo.UpdateAsync(item);

        await LogAuditAsync("Updated Inventory Item", "InventoryItem", id.ToString(),
            $"SKU: {updated.Sku}, Qty: {updated.QuantityOnHand}, Status: {updated.Status}");

        return ApiResponse<InventoryItemViewModel>.Ok(Map(updated), "Inventory item updated.");
    }

    public async Task<ApiResponse<InventoryItemViewModel>> AdjustQuantityAsync(int id, AdjustQuantityRequest request)
    {
        var item = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Inventory item {id} not found.");

        item.QuantityOnHand += request.Adjustment;
        if (item.QuantityOnHand < 0)
            throw new ValidationException("Adjustment would result in negative stock.");

        item.ModifiedDate = DateTime.UtcNow;
        await UpdateStatusAndNotify(item);
        var updated = await repo.UpdateAsync(item);

        var mType = request.Adjustment >= 0 ? StockMovementType.StockIn : StockMovementType.StockOut;
        await RecordMovementAsync(id, mType, Math.Abs(request.Adjustment), request.Reason);
        await LogAuditAsync("Adjusted Inventory", "InventoryItem", id.ToString(),
            $"Adjustment: {request.Adjustment}, NewQty: {updated.QuantityOnHand}");

        return ApiResponse<InventoryItemViewModel>.Ok(Map(updated), "Quantity adjusted.");
    }

    public async Task<ApiResponse> DeleteAsync(int id)
    {
        var item = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Inventory item {id} not found.");

        if (await movementRepo.HasMovementsAsync(id))
            throw new ConflictException(
                $"Cannot delete '{item.Name}' — it has stock movement history. Adjust qty to 0 instead.");

        await repo.DeleteAsync(item);
        await LogAuditAsync("Deleted Inventory Item", "InventoryItem", id.ToString(), $"SKU: {item.Sku}");
        return ApiResponse.Ok("Inventory item deleted.");
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    public static InventoryItemViewModel Map(InventoryItem i) => new()
    {
        InventoryID   = i.InventoryID,
        Sku           = i.Sku,
        Name          = i.Name,
        Category      = i.Category,
        Unit          = i.Unit,
        Location      = i.Location,
        CurrentStock  = i.QuantityOnHand,
        MinStock      = i.MinimumQuantity,
        MaxStock      = i.MaximumQuantity,
        UnitCost      = i.UnitCost,
        Supplier      = i.Supplier,
        Status        = i.Status,
        Notes         = i.Notes,
        CreatedDate   = i.CreatedDate,
        ModifiedDate  = i.ModifiedDate,
    };

    private static StockMovementViewModel MapMovement(StockMovement m) => new()
    {
        MovementID   = m.MovementID,
        InventoryID  = m.InventoryID,
        MovementType = m.MovementType,
        Quantity     = m.Quantity,
        Reason       = m.Reason,
        ReferenceID  = m.ReferenceID,
        PerformedBy  = m.PerformedBy,
        CreatedDate  = m.CreatedDate,
    };
}
