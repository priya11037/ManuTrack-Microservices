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

public class PurchaseOrderServiceImpl(
    IPurchaseOrderRepository repo,
    IInventoryRepository inventoryRepo,
    IStockMovementRepository movementRepo,
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
    ILogger<PurchaseOrderServiceImpl> logger) : IPurchaseOrderService
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
        var user  = httpContextAccessor.HttpContext?.User;
        var idVal = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? user?.FindFirst("sub")?.Value;
        var name  = user?.FindFirst(ClaimTypes.Name)?.Value ?? user?.FindFirst("name")?.Value ?? "Unknown";
        int.TryParse(idVal, out var id);
        return (id, name);
    }

    private async Task LogAuditAsync(string action, string entity, string entityId, string? details = null)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            if (userId == 0) return;
            var client = httpClientFactory.CreateClient("ComplianceService");
            var token  = GetBearerToken();
            if (token != null)
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            await client.PostAsJsonAsync("api/v1/audit", new
            {
                UserID = userId, UserName = userName, Action = action,
                EntityType = entity, EntityID = entityId,
                ServiceName = "InventoryService", Details = details
            });
        }
        catch (Exception ex) { logger.LogWarning(ex, "Audit log failed in PO service."); }
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public async Task<ApiResponse<IEnumerable<PurchaseOrderViewModel>>> GetAllAsync(string? status)
    {
        var orders = await repo.GetAllAsync(status);
        return ApiResponse<IEnumerable<PurchaseOrderViewModel>>.Ok(orders.Select(Map));
    }

    public async Task<ApiResponse<PurchaseOrderViewModel>> GetByIdAsync(int id)
    {
        var po = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Purchase order {id} not found.");
        return ApiResponse<PurchaseOrderViewModel>.Ok(Map(po));
    }

    public async Task<ApiResponse<PurchaseOrderViewModel>> CreateAsync(CreatePurchaseOrderRequest request)
    {
        // Auto-generate PO number from next ID
        var nextId   = await repo.GetNextIdAsync();
        var poNumber = $"PO-{nextId:D4}";

        var po = new PurchaseOrder
        {
            PONumber     = poNumber,
            SupplierName = request.Supplier,
            ItemName     = request.ItemName,
            ItemSku      = request.Sku,
            Quantity     = request.Quantity,
            UnitCost     = request.UnitCost,
            TotalCost    = request.Quantity * request.UnitCost,
            Priority     = request.Priority,
            Status       = "Draft",
            OrderDate    = request.OrderDate,
            ExpectedDate = request.ExpectedDate,
            Notes        = request.Notes,
            CreatedDate  = DateTime.UtcNow,
        };

        var created = await repo.CreateAsync(po);

        await LogAuditAsync("Created Purchase Order", "PurchaseOrder", created.POID.ToString(),
            $"PO: {poNumber}, Supplier: {request.Supplier}, Item: {request.ItemName}, Qty: {request.Quantity}");

        return ApiResponse<PurchaseOrderViewModel>.Ok(Map(created), "Purchase order created.");
    }

    public async Task<ApiResponse<PurchaseOrderViewModel>> UpdateStatusAsync(int id, UpdatePurchaseOrderStatusRequest request)
    {
        var po = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"Purchase order {id} not found.");

        // When PO is marked Received → auto-update matching inventory item's stock
        if (request.Status == "Received" && po.Status != "Received")
        {
            await ReceiveStockAsync(po);
        }

        po.Status       = request.Status;
        po.ModifiedDate = DateTime.UtcNow;
        var updated     = await repo.UpdateAsync(po);

        await LogAuditAsync("Updated PO Status", "PurchaseOrder", id.ToString(),
            $"PO: {po.PONumber}, New Status: {request.Status}");

        return ApiResponse<PurchaseOrderViewModel>.Ok(Map(updated), "Purchase order status updated.");
    }

    // ── Receive stock: find matching inventory item by SKU or name, add qty ───
    private async Task ReceiveStockAsync(PurchaseOrder po)
    {
        try
        {
            var (userId, _) = GetCurrentUser();

            // Try to find existing inventory item by SKU first, then by name
            var allItems = await inventoryRepo.GetAllAsync(null, null);
            InventoryItem? invItem = null;

            if (!string.IsNullOrWhiteSpace(po.ItemSku))
                invItem = allItems.FirstOrDefault(i =>
                    string.Equals(i.Sku, po.ItemSku, StringComparison.OrdinalIgnoreCase));

            invItem ??= allItems.FirstOrDefault(i =>
                string.Equals(i.Name, po.ItemName, StringComparison.OrdinalIgnoreCase));

            if (invItem != null)
            {
                // Found — increase quantity
                invItem.QuantityOnHand += po.Quantity;
                invItem.ModifiedDate    = DateTime.UtcNow;

                var newStatus = invItem.QuantityOnHand <= 0       ? InventoryStatus.OutOfStock :
                                invItem.QuantityOnHand <= invItem.MinimumQuantity ? InventoryStatus.LowStock :
                                                                    InventoryStatus.InStock;
                invItem.Status = newStatus;
                await inventoryRepo.UpdateAsync(invItem);

                await movementRepo.CreateAsync(new StockMovement
                {
                    InventoryID  = invItem.InventoryID,
                    MovementType = StockMovementType.StockIn,
                    Quantity     = po.Quantity,
                    Reason       = $"Received from {po.PONumber}",
                    ReferenceID  = po.PONumber,
                    PerformedBy  = userId,
                    CreatedDate  = DateTime.UtcNow,
                });
            }
            else
            {
                // Not found — create a new inventory item automatically
                var newItem = new InventoryItem
                {
                    Sku             = po.ItemSku,
                    Name            = po.ItemName,
                    Category        = "Component",   // default
                    Unit            = "pcs",
                    Location        = string.Empty,
                    QuantityOnHand  = po.Quantity,
                    MinimumQuantity = 0,
                    MaximumQuantity = 9999,
                    UnitCost        = po.UnitCost,
                    Supplier        = po.SupplierName,
                    Status          = InventoryStatus.InStock,
                    Notes           = $"Auto-created from {po.PONumber}",
                    CreatedDate     = DateTime.UtcNow,
                };

                var created = await inventoryRepo.CreateAsync(newItem);

                await movementRepo.CreateAsync(new StockMovement
                {
                    InventoryID  = created.InventoryID,
                    MovementType = StockMovementType.StockIn,
                    Quantity     = po.Quantity,
                    Reason       = $"Initial receipt from {po.PONumber}",
                    ReferenceID  = po.PONumber,
                    PerformedBy  = userId,
                    CreatedDate  = DateTime.UtcNow,
                });
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Stock update failed when receiving PO {POID}.", po.POID);
        }
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private static PurchaseOrderViewModel Map(PurchaseOrder p) => new()
    {
        PurchaseOrderID = p.POID,
        PONumber        = p.PONumber,
        SupplierName = p.SupplierName,
        ItemName     = p.ItemName,
        ItemSku      = p.ItemSku,
        Quantity     = p.Quantity,
        UnitCost     = p.UnitCost,
        TotalCost    = p.TotalCost,
        Priority     = p.Priority,
        Status       = p.Status,
        OrderDate    = p.OrderDate,
        ExpectedDate = p.ExpectedDate,
        Notes        = p.Notes,
        CreatedDate  = p.CreatedDate,
        ModifiedDate = p.ModifiedDate,
    };
}
