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
  private http    = inject(HttpClient);
  private invUrl  = environment.api.inventory;
  private poUrl   = environment.api.purchaseOrders;

  // ── State ──────────────────────────────────────────────────────────────────
  private _stockItems     = signal<StockItem[]>([]);
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

  // ── DTO mappers ────────────────────────────────────────────────────────────
  private fromStockDto(dto: StockItemDto): StockItem {
    return {
      id:           dto.itemID.toString(),
      itemID:       dto.itemID,
      sku:          dto.sku,
      name:         dto.name,
      category:     dto.category,
      unit:         dto.unit,
      currentStock: dto.currentStock,
      minStock:     dto.minStock,
      maxStock:     dto.maxStock,
      unitCost:     dto.unitCost,
      supplier:     dto.supplier,
      location:     dto.location,
      lastUpdated:  dto.lastUpdated?.split('T')[0] ?? new Date().toISOString().split('T')[0],
    };
  }

  private fromPoDto(dto: PurchaseOrderDto): PurchaseOrder {
    return {
      id:              dto.purchaseOrderID.toString(),
      purchaseOrderID: dto.purchaseOrderID,
      poNumber:        dto.poNumber,
      supplier:        dto.supplier,
      item:            dto.itemName,
      sku:             dto.sku,
      quantity:        dto.quantity,
      unitCost:        dto.unitCost,
      totalCost:       dto.totalCost,
      status:          dto.status,
      priority:        dto.priority,
      orderDate:       dto.orderDate?.split('T')[0] ?? '',
      expectedDate:    dto.expectedDate?.split('T')[0] ?? '',
      notes:           dto.notes ?? '',
    };
  }
}
