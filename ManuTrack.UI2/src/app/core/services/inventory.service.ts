import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Frontend models — match component interfaces exactly ──────────────────────
export interface StockItem {
  id:           string;
  itemID?:      number;
  sku:          string;
  name:         string;
  category:     string;
  unit:         string;
  currentStock: number;
  minStock:     number;
  maxStock:     number;
  unitCost:     number;
  supplier:     string;
  location:     string;
  lastUpdated:  string;
}

export interface PurchaseOrder {
  id:              string;
  purchaseOrderID?: number;
  poNumber:        string;
  supplier:        string;
  item:            string;   // itemName from backend
  sku:             string;
  quantity:        number;
  unitCost:        number;
  totalCost:       number;
  status:          'Draft' | 'Submitted' | 'Approved' | 'Ordered' | 'Received' | 'Cancelled';
  priority:        'Low' | 'Medium' | 'High' | 'Urgent';
  orderDate:       string;
  expectedDate:    string;
  notes:           string;
}

// ── Backend DTOs ──────────────────────────────────────────────────────────────
interface StockItemDto {
  itemID:       number;
  sku:          string;
  name:         string;
  category:     string;
  unit:         string;
  currentStock: number;
  minStock:     number;
  maxStock:     number;
  unitCost:     number;
  supplier:     string;
  location:     string;
  lastUpdated?: string;
}

interface PurchaseOrderDto {
  purchaseOrderID: number;
  poNumber:        string;
  supplier:        string;
  itemName:        string;
  sku:             string;
  quantity:        number;
  unitCost:        number;
  totalCost:       number;
  status:          PurchaseOrder['status'];
  priority:        PurchaseOrder['priority'];
  orderDate:       string;
  expectedDate:    string;
  notes?:          string;
}

export interface CreateStockItemRequest {
  sku:          string;
  name:         string;
  category:     string;
  unit:         string;
  currentStock: number;
  minStock:     number;
  maxStock:     number;
  unitCost:     number;
  supplier:     string;
  location:     string;
}

export interface CreatePurchaseOrderRequest {
  supplier:     string;
  itemName:     string;
  sku:          string;
  quantity:     number;
  unitCost:     number;
  priority:     PurchaseOrder['priority'];
  orderDate:    string;
  expectedDate: string;
  notes?:       string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http         = inject(HttpClient);
  private invUrl       = environment.api.inventory;
  private poUrl        = environment.api.purchaseOrders;
  private supplierUrl  = (environment.api as any).suppliers ?? 'http://localhost:5000/api/v1/suppliers';
  private locationUrl  = (environment.api as any).locations ?? 'http://localhost:5000/api/v1/locations';

  // ── State ──────────────────────────────────────────────────────────────────
  private _stockItems     = signal<StockItem[]>([]);
  private _suppliers      = signal<string[]>([]);
  private _locations      = signal<string[]>([]);
  readonly suppliers      = this._suppliers.asReadonly();
  readonly locations      = this._locations.asReadonly();
  private _purchaseOrders = signal<PurchaseOrder[]>([]);
  readonly stockItems     = this._stockItems.asReadonly();
  readonly purchaseOrders = this._purchaseOrders.asReadonly();
  isLoading               = signal(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  stockStats = computed(() => {
    const all = this._stockItems();
    return {
      total:      all.length,
      low:        all.filter(i => i.currentStock <= i.minStock).length,
      ok:         all.filter(i => i.currentStock > i.minStock && i.currentStock < i.maxStock).length,
      overstock:  all.filter(i => i.currentStock >= i.maxStock).length,
      totalValue: all.reduce((sum, i) => sum + i.currentStock * i.unitCost, 0),
    };
  });

  poStats = computed(() => {
    const all = this._purchaseOrders();
    return {
      total:      all.length,
      pending:    all.filter(o => ['Draft','Submitted','Approved','Ordered'].includes(o.status)).length,
      urgent:     all.filter(o => o.priority === 'Urgent' && !['Received','Cancelled'].includes(o.status)).length,
      totalSpend: all.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.totalCost, 0),
    };
  });

  // ── Stock API ──────────────────────────────────────────────────────────────
  loadStock(): void {
    this.isLoading.set(true);
    this.http.get<StockItemDto[]>(this.invUrl)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({ next: dtos => this._stockItems.set(dtos.map(d => this.fromStockDto(d))) });
  }

  createStockItem(req: CreateStockItemRequest): Observable<StockItem> {
    return this.http.post<StockItemDto>(this.invUrl, req).pipe(
      tap(dto => this._stockItems.update(list => [this.fromStockDto(dto), ...list]))
    ) as unknown as Observable<StockItem>;
  }

  updateStockItem(id: number, req: Partial<CreateStockItemRequest>): Observable<StockItem> {
    return this.http.put<StockItemDto>(`${this.invUrl}/${id}`, req).pipe(
      tap(dto => {
        const updated = this.fromStockDto(dto);
        this._stockItems.update(list => list.map(i => i.itemID === id ? updated : i));
      })
    ) as unknown as Observable<StockItem>;
  }

  deleteStockItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.invUrl}/${id}`).pipe(
      tap(() => this._stockItems.update(list => list.filter(i => i.itemID !== id)))
    );
  }

  // ── Suppliers API ─────────────────────────────────────────────────────────
  loadSuppliers(): void {
    this.http.get<any[]>(this.supplierUrl).subscribe({
      next: dtos => this._suppliers.set(dtos.map(d => d.name ?? d.Name ?? '').filter(Boolean)),
      error: () => {} // silently ignore — fallback keeps existing list
    });
  }

  // ── Locations API ─────────────────────────────────────────────────────────
  loadLocations(): void {
    this.http.get<any[]>(this.locationUrl).subscribe({
      next: dtos => this._locations.set(dtos.map(d => d.name ?? d.Name ?? '').filter(Boolean)),
      error: () => {}
    });
  }

  // ── Purchase Order API ─────────────────────────────────────────────────────
  loadPurchaseOrders(): void {
    this.http.get<PurchaseOrderDto[]>(this.poUrl)
      .subscribe({ next: dtos => this._purchaseOrders.set(dtos.map(d => this.fromPoDto(d))) });
  }

  createPurchaseOrder(req: CreatePurchaseOrderRequest): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrderDto>(this.poUrl, req).pipe(
      tap(dto => this._purchaseOrders.update(list => [this.fromPoDto(dto), ...list]))
    ) as unknown as Observable<PurchaseOrder>;
  }

  updatePurchaseOrderStatus(id: number, status: PurchaseOrder['status']): Observable<PurchaseOrder> {
    return this.http.put<PurchaseOrderDto>(`${this.poUrl}/${id}/status`, { status }).pipe(
      tap(dto => {
        const updated = this.fromPoDto(dto);
        this._purchaseOrders.update(list => list.map(o => o.purchaseOrderID === id ? updated : o));
      })
    ) as unknown as Observable<PurchaseOrder>;
  }

  // ── Local remove helpers ──────────────────────────────────────────────────
  removeLocalPO(id: string): void {
    this._purchaseOrders.update(list => list.filter(o => o.id !== id));
  }

  // ── DTO mappers — handle multiple possible field name casings from backend ──
  private fromStockDto(dto: any): StockItem {
    // Handles both old (ProductName/QuantityOnHand) and new (name/currentStock) field names
    const rawId = dto.inventoryID ?? dto.itemID ?? dto.InventoryID ?? 0;
    return {
      id:           rawId.toString(),
      itemID:       rawId,
      sku:          dto.sku          ?? dto.Sku          ?? '',
      name:         dto.name         ?? dto.Name         ?? dto.productName ?? dto.ProductName ?? '',
      category:     dto.category     ?? dto.Category     ?? '',
      unit:         dto.unit         ?? dto.Unit         ?? 'pcs',
      currentStock: dto.currentStock ?? dto.CurrentStock ?? dto.quantityOnHand ?? dto.QuantityOnHand ?? 0,
      minStock:     dto.minStock     ?? dto.MinStock     ?? dto.minimumQuantity ?? dto.MinimumQuantity ?? 0,
      maxStock:     dto.maxStock     ?? dto.MaxStock     ?? dto.maximumQuantity ?? dto.MaximumQuantity ?? 9999,
      unitCost:     dto.unitCost     ?? dto.UnitCost     ?? 0,
      supplier:     dto.supplier     ?? dto.Supplier     ?? '',
      location:     dto.location     ?? dto.Location     ?? dto.locationName   ?? dto.LocationName   ?? '',
      lastUpdated:  (dto.modifiedDate ?? dto.ModifiedDate ?? dto.createdDate ?? dto.CreatedDate ?? '')
                      .split?.('T')[0] ?? new Date().toISOString().split('T')[0],
    };
  }

  private fromPoDto(dto: any): PurchaseOrder {
    // Handles both old (POID, SupplierName, ExpectedDeliveryDate) and new (purchaseOrderID etc.)
    const rawId = dto.pOID ?? dto.POID ?? dto.purchaseOrderID ?? dto.PurchaseOrderID ?? 0;
    return {
      id:              rawId.toString(),
      purchaseOrderID: rawId,
      poNumber:        dto.poNumber    ?? dto.PONumber    ?? `PO-${rawId}`,
      supplier:        dto.supplierName ?? dto.SupplierName ?? dto.supplier ?? '',
      item:            dto.itemName    ?? dto.ItemName    ?? dto.item ?? '',
      sku:             dto.itemSku     ?? dto.ItemSku     ?? dto.sku ?? '',
      quantity:        dto.quantity    ?? dto.Quantity    ?? 0,
      unitCost:        dto.unitCost    ?? dto.UnitCost    ?? 0,
      totalCost:       dto.totalCost   ?? dto.TotalCost   ?? dto.totalAmount ?? 0,
      status:          dto.status      ?? dto.Status      ?? 'Draft',
      priority:        dto.priority    ?? dto.Priority    ?? 'Medium',
      orderDate:       (dto.orderDate    ?? dto.OrderDate    ?? '').split?.('T')[0] ?? '',
      expectedDate:    (dto.expectedDate ?? dto.ExpectedDate ?? dto.expectedDeliveryDate ?? '').split?.('T')[0] ?? '',
      notes:           dto.notes       ?? dto.Notes       ?? '',
    };
  }
}
