import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Frontend model (used by all components) ───────────────────────────────────
export interface WorkOrder {
  id:          string;
  woNumber:    string;
  product:     string;
  sku:         string;
  quantity:    number;
  produced:    number;
  priority:    'Low' | 'Medium' | 'High' | 'Critical';
  status:      'Planned' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';
  startDate:   string;
  dueDate:     string;
  assignedTo:  string;
  line:        string;
  notes:       string;
  avatarColor: string;
}

// ── Backend DTO shape (matches C# WorkOrderViewModel) ─────────────────────────
interface WorkOrderDto {
  workOrderID:        number;
  woNumber?:          string;
  productID:          number;
  productName:        string;
  sku?:               string;
  quantity:           number;
  producedQty?:       number;
  priority:           WorkOrder['priority'];
  status:             WorkOrder['status'];
  startDate:          string;
  endDate:            string;
  assignedTo?:        string;
  assignedOperatorID?:number;
  line?:              string;
  notes?:             string;
  createdBy?:         string;
  createdAt?:         string;
}

// ── Request shapes ────────────────────────────────────────────────────────────
export interface CreateWorkOrderRequest {
  productID:    number;
  productName:  string;
  quantity:     number;
  priority:     WorkOrder['priority'];
  startDate:    string;
  endDate:      string;
  assignedTo?:      string;
  productionLine?:  string;  // backend field name (was 'line' in frontend)
  notes?:           string;
}

export interface UpdateWorkOrderRequest {
  quantity?:        number;
  priority?:        string;
  startDate?:       string;
  endDate?:         string;
  assignedTo?:      string;
  productionLine?:  string;
  notes?:           string;
}

@Injectable({ providedIn: 'root' })
export class WorkOrderService {
  private http = inject(HttpClient);
  private url  = environment.api.workOrders;

  // ── State (writable inside service, readonly to outside via signal) ───────
  private _workOrders = signal<WorkOrder[]>([]);
  readonly workOrders = this._workOrders.asReadonly();
  isLoading           = signal(false);
  error               = signal<string | null>(null);

  // ── Computed stats ────────────────────────────────────────────────────────
  stats = computed(() => {
    const all   = this._workOrders();
    const today = new Date().toISOString().split('T')[0];
    return {
      total:      all.length,
      planned:    all.filter(w => w.status === 'Planned').length,
      inProgress: all.filter(w => w.status === 'In Progress').length,
      onHold:     all.filter(w => w.status === 'On Hold').length,
      completed:  all.filter(w => w.status === 'Completed').length,
      overdue:    all.filter(w => w.status !== 'Completed' && w.status !== 'Cancelled' && w.dueDate < today).length,
    };
  });

  // ── API ───────────────────────────────────────────────────────────────────
  loadAll(status?: string, productId?: number, assignedTo?: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    let params = new HttpParams();
    if (status)     params = params.set('status',     status);
    if (productId)  params = params.set('productId',  productId);
    if (assignedTo) params = params.set('assignedTo', assignedTo);

    this.http.get<WorkOrderDto[]>(this.url, { params })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next:  dtos => this._workOrders.set(dtos.map(d => this.fromDto(d))),
        error: err  => this.error.set(err.message),
      });
  }

  create(req: CreateWorkOrderRequest): Observable<WorkOrder> {
    return this.http.post<WorkOrderDto>(this.url, req).pipe(
      tap(dto => {
        const wo = this.fromDto(dto);
        this._workOrders.update(list => [wo, ...list]);
      }),
      // Return mapped WorkOrder to caller
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tap() as any,
    );
  }

  update(id: string, req: UpdateWorkOrderRequest): Observable<WorkOrder> {
    return this.http.put<WorkOrderDto>(`${this.url}/${id}`, req).pipe(
      tap(dto => {
        const updated = this.fromDto(dto);
        this._workOrders.update(list => list.map(w => w.id === id ? updated : w));
      }),
    ) as unknown as Observable<WorkOrder>;
  }

  updateStatus(id: string, status: WorkOrder['status']): Observable<WorkOrder> {
    return this.http.put<WorkOrderDto>(`${this.url}/${id}/status`, { status }).pipe(
      tap(dto => {
        const updated = this.fromDto(dto);
        this._workOrders.update(list => list.map(w => w.id === id ? updated : w));
      }),
    ) as unknown as Observable<WorkOrder>;
  }

  /**
   * SFO-safe progress update — calls PUT /workorders/{id}/progress
   * which allows ShopFloorOperator role (unlike the full PUT /workorders/{id}).
   */
  updateProgress(id: string, producedQty: number): Observable<WorkOrder> {
    return this.http.put<WorkOrderDto>(`${this.url}/${id}/progress`, { producedQty }).pipe(
      tap(dto => {
        const updated = this.fromDto(dto);
        this._workOrders.update(list => list.map(w => w.id === id ? updated : w));
      }),
    ) as unknown as Observable<WorkOrder>;
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      tap(() => this._workOrders.update(list => list.filter(w => w.id !== id)))
    );
  }

  // ── Local optimistic update (used by Kanban DnD before API call) ──────────
  updateLocalStatus(id: string, status: WorkOrder['status']): void {
    this._workOrders.update(list =>
      list.map(w => w.id === id ? { ...w, status } : w)
    );
  }

  addLocal(wo: WorkOrder): void {
    this._workOrders.update(list => [wo, ...list]);
  }

  updateLocal(id: string, changes: Partial<WorkOrder>): void {
    this._workOrders.update(list =>
      list.map(w => w.id === id ? { ...w, ...changes } : w)
    );
  }

  removeLocal(id: string): void {
    this._workOrders.update(list => list.filter(w => w.id !== id));
  }

  // ── DTO mapper — defensive with fallback field names ─────────────────────
  private fromDto(dto: any): WorkOrder {
    const rawId = dto.workOrderID ?? dto.WorkOrderID ?? dto.id ?? 0;
    return {
      id:          rawId.toString(),
      woNumber:    dto.woNumber ?? dto.WoNumber ?? `WO-${rawId.toString().padStart(4, '0')}`,
      product:     dto.productName ?? dto.ProductName ?? '',
      sku:         dto.sku ?? dto.Sku ?? '',
      quantity:    dto.quantity ?? 0,
      produced:    dto.producedQty ?? dto.ProducedQty ?? 0,
      priority:    (dto.priority ?? dto.Priority ?? 'Medium') as WorkOrder['priority'],
      status:      (dto.status ?? dto.Status ?? 'Planned') as WorkOrder['status'],
      startDate:   dto.startDate?.split('T')[0] ?? dto.StartDate?.split('T')[0] ?? '',
      dueDate:     dto.endDate?.split('T')[0] ?? dto.EndDate?.split('T')[0] ?? '',
      assignedTo:  dto.assignedTo ?? dto.AssignedTo ?? '',
      line:        dto.productionLine ?? dto.ProductionLine ?? dto.line ?? 'Line A',
      notes:       dto.notes ?? dto.Notes ?? '',
      avatarColor: this.pickColor(dto.assignedOperatorID ?? dto.AssignedOperatorID ?? 0),
    };
  }

  private pickColor(seed: number): string {
    const palette = ['#2563eb','#10b981','#f59e0b','#8b5cf6','#ef4444','#0ea5e9','#ec4899','#6366f1','#14b8a6','#a855f7'];
    return palette[seed % palette.length];
  }
}
