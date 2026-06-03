import { Component, signal, computed, effect, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { WorkOrderService, WorkOrder, CreateWorkOrderRequest } from '../../core/services/work-order.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/auth/auth.service';
import { InventoryService, StockItem } from '../../core/services/inventory.service';
import { ProductService } from '../../core/services/product.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// Task model
export interface WorkOrderTask {
  taskID:        number;
  workOrderID:   number;
  description:   string;
  assignedTo:    string;
  status:        'To Do' | 'In Progress' | 'Done' | 'Cancelled';
  notes?:        string;
  completedDate?: string;
  createdDate:   string;
}

// Re-export so other components (e.g. schedule) can still import WorkOrder from here
export type { WorkOrder } from '../../core/services/work-order.service';

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Component({
  selector: 'app-work-orders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatTooltipModule, MatSnackBarModule,
    DragDropModule,
  ],
  templateUrl: './work-orders.component.html',
  styleUrl:    './work-orders.component.scss',
})
export class WorkOrdersComponent implements OnInit {
  private fb       = inject(FormBuilder);
  private snack    = inject(MatSnackBar);
  private http     = inject(HttpClient);
  readonly woSvc   = inject(WorkOrderService);
  private usrSvc   = inject(UserService);
  private auth     = inject(AuthService);
  private invSvc   = inject(InventoryService);
  private prodSvc  = inject(ProductService);

  // â”€â”€ Low-stock banner (Inventory Manager â†’ Production Planner connection) â”€â”€â”€â”€â”€
  /** Items that are low or out of stock â€” Production Planner sees these as a warning */
  lowStockItems = computed<StockItem[]>(() =>
    this.invSvc.stockItems().filter(i => i.currentStock <= i.minStock)
  );
  showStockBanner = signal(true);   // user can dismiss the banner

  // -- BOM stock warnings for WO creation drawer
  bomStockWarnings = signal<{ name: string; needed: number; available: number }[]>([]);

  // â”€â”€ Read-only mode for Admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  isReadOnly = computed(() => this.auth.userRole() === 'Admin');

  // â”€â”€ UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  viewMode        = signal<'table' | 'kanban'>('table');
  drawerOpen      = signal(false);
  drawerMode      = signal<'add' | 'edit'>('add');
  selectedWO      = signal<WorkOrder | null>(null);
  deleteConfirmId = signal<string | null>(null);
  expandedWOId    = signal<string | null>(null);

  // â”€â”€ Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  searchTerm     = signal('');
  statusFilter   = signal('all');
  priorityFilter = signal('all');

  // â”€â”€ Options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Products loaded from ProductService
  products  = computed(() => {
    const fromSvc = this.prodSvc.products().map(p => p.name);
    return fromSvc.length > 0 ? fromSvc : [];
  });
  skuMap = computed<Record<string,string>>(() =>
    Object.fromEntries(this.prodSvc.products().map(p => [p.name, p.sku]))
  );
  // Operators loaded from UserService â€” ShopFloorOperator role only
  operators = computed(() =>
    this.usrSvc.users().filter(u => u.role === 'ShopFloorOperator' && u.status === 'Active').map(u => u.name)
  );
  lines      = ['Line A','Line B','Line C','Line D'];
  priorities = ['Low','Medium','High','Critical'] as WorkOrder['priority'][];
  statuses   = ['Planned','In Progress','On Hold','Completed'] as WorkOrder['status'][];

  // â”€â”€ Data from service (single source of truth) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Expose as local alias so template references remain unchanged
  get workOrders() { return this.woSvc.workOrders; }
  get isLoading()  { return this.woSvc.isLoading; }

  // â”€â”€ Kanban mutable arrays (synced from service signal) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  kanbanPlanned:    WorkOrder[] = [];
  kanbanInProgress: WorkOrder[] = [];
  kanbanOnHold:     WorkOrder[] = [];
  kanbanCompleted:  WorkOrder[] = [];

  constructor() {
    effect(() => {
      const all = this.woSvc.workOrders();
      this.kanbanPlanned    = all.filter(w => w.status === 'Planned');
      this.kanbanInProgress = all.filter(w => w.status === 'In Progress');
      this.kanbanOnHold     = all.filter(w => w.status === 'On Hold');
      this.kanbanCompleted  = all.filter(w => w.status === 'Completed');
    });
  }

  // â”€â”€ Computed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  filteredWOs = computed(() => {
    const q  = this.searchTerm().toLowerCase().trim();
    const st = this.statusFilter();
    const pr = this.priorityFilter();
    return this.woSvc.workOrders().filter(w => {
      const matchQ  = !q || w.woNumber.toLowerCase().includes(q) || w.product.toLowerCase().includes(q) || w.assignedTo.toLowerCase().includes(q);
      const matchSt = st === 'all' || w.status === st;
      const matchPr = pr === 'all' || w.priority === pr;
      return matchQ && matchSt && matchPr;
    });
  });

  // Stats delegate to service computed
  get stats() { return this.woSvc.stats; }

  get kanbanColumns() {
    return [
      { id:'Planned',     label:'Planned',     icon:'schedule',     color:'#6b7280', bg:'#f9fafb', items: this.kanbanPlanned    },
      { id:'In Progress', label:'In Progress', icon:'autorenew',    color:'#2563eb', bg:'#eff6ff', items: this.kanbanInProgress },
      { id:'On Hold',     label:'On Hold',     icon:'pause_circle', color:'#d97706', bg:'#fffbeb', items: this.kanbanOnHold     },
      { id:'Completed',   label:'Completed',   icon:'check_circle', color:'#059669', bg:'#f0fdf4', items: this.kanbanCompleted  },
    ];
  }

  kanbanConnectedIds = ['Planned','In Progress','On Hold','Completed'];

  // â”€â”€ Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  woForm = this.fb.group({
    product:    ['', Validators.required],
    sku:        [''],
    quantity:   [1,       [Validators.required, Validators.min(1)]],
    priority:   ['Medium', Validators.required],
    status:     ['Planned', Validators.required],
    startDate:  ['', Validators.required],
    dueDate:    ['', Validators.required],
    line:       ['Line A', Validators.required],
    notes:      [''],
  });

  // ── Task management ─────────────────────────────────────────────────────────
  tasksMap        = signal<Record<string, WorkOrderTask[]>>({});  // keyed by WO id
  loadingTasksFor = signal<string | null>(null);
  taskDrawerWO    = signal<WorkOrder | null>(null);   // WO for which task drawer is open
  taskForm = this.fb.group({
    description: ['', [Validators.required, Validators.minLength(5)]],
    assignedTo:  ['', Validators.required],
    notes:       [''],
  });

  tasksFor(woId: string): WorkOrderTask[] {
    return this.tasksMap()[woId] ?? [];
  }

  loadTasks(wo: WorkOrder): void {
    if (this.tasksMap()[wo.id]) return; // already loaded
    this.loadingTasksFor.set(wo.id);
    this.http.get<any>(`${(environment.api as any).tasksByWO}/${wo.id}`).subscribe({
      next: res => {
        const tasks: WorkOrderTask[] = (res?.data ?? res) as WorkOrderTask[];
        this.tasksMap.update(m => ({ ...m, [wo.id]: tasks }));
        this.loadingTasksFor.set(null);
      },
      error: () => this.loadingTasksFor.set(null)
    });
  }

  openTaskDrawer(wo: WorkOrder, ev: Event): void {
    ev.stopPropagation();
    this.taskDrawerWO.set(wo);
    this.taskForm.reset();
    this.loadTasks(wo);
  }

  closeTaskDrawer(): void { this.taskDrawerWO.set(null); }

  saveTask(): void {
    if (this.taskForm.invalid) { this.taskForm.markAllAsTouched(); return; }
    const wo = this.taskDrawerWO()!;
    const v  = this.taskForm.value;
    this.http.post<any>(`${environment.api.tasks}`, {
      workOrderID:  parseInt(wo.id),
      description:  v.description,
      assignedTo:   v.assignedTo,
      notes:        v.notes || undefined,
    }).subscribe({
      next: res => {
        const task = res?.data ?? res;
        this.tasksMap.update(m => ({ ...m, [wo.id]: [...(m[wo.id] ?? []), task] }));
        this.taskForm.reset();
        this.woSvc.loadAll();
        this.toast(`Task assigned to ${v.assignedTo}`, 'success');
      },
      error: () => this.toast('Failed to add task', 'warn')
    });
  }

  deleteTask(wo: WorkOrder, taskID: number, ev: Event): void {
    ev.stopPropagation();
    this.http.delete(`${environment.api.tasks}/${taskID}`).subscribe({
      next: () => {
        this.tasksMap.update(m => ({ ...m, [wo.id]: (m[wo.id] ?? []).filter(t => t.taskID !== taskID) }));
        this.toast('Task removed', 'warn');
      },
      error: () => this.toast('Failed to remove task', 'warn')
    });
  }

  taskStatusColor(s: string): string {
    return { 'To Do': '#6b7280', 'In Progress': '#2563eb', Done: '#059669', Cancelled: '#dc2626' }[s] ?? '#6b7280';
  }

  ngOnInit(): void {
    this.woSvc.loadAll();
    this.invSvc.loadStock();
    this.prodSvc.loadProducts();
    // Admin gets full list; others only need ShopFloorOperators for dropdown
    if (this.auth.userRole() === 'Admin') {
      this.usrSvc.loadAll();
    } else {
      this.usrSvc.loadByRole('ShopFloorOperator');
    }
  }

  // â”€â”€ Kanban DnD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  onKanbanDrop(event: CdkDragDrop<WorkOrder[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    const wo        = event.container.data[event.currentIndex];
    const newStatus = event.container.id as WorkOrder['status'];

    // Optimistic update â€” UI feels instant
    this.woSvc.updateLocalStatus(wo.id, newStatus);

    // Persist to backend
    this.woSvc.updateStatus(wo.id, newStatus).subscribe({
      next: () => this.toast(`${wo.woNumber} â†’ ${newStatus}`, 'info'),
      error: () => {
        // Rollback on failure
        this.woSvc.updateLocalStatus(wo.id, wo.status);
        this.toast(`Failed to update ${wo.woNumber}`, 'warn');
      },
    });
  }

  // â”€â”€ Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  openAddDrawer(): void {
    this.drawerMode.set('add');
    this.selectedWO.set(null);
    const today = new Date().toISOString().split('T')[0];
    this.woForm.reset({ priority:'Medium', status:'Planned', startDate: today, dueDate: today, line:'Line A', quantity:1 });
    this.drawerOpen.set(true);
  }

  openEditDrawer(wo: WorkOrder, ev?: Event): void {
    ev?.stopPropagation();
    this.drawerMode.set('edit');
    this.selectedWO.set(wo);
    this.woForm.patchValue(wo);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void { this.drawerOpen.set(false); this.selectedWO.set(null); this.bomStockWarnings.set([]); }

  onProductChange(name: string): void {
    this.woForm.get('sku')?.setValue(this.skuMap()[name] ?? '');
    this.bomStockWarnings.set([]);

    const product = this.prodSvc.products().find(p => p.name === name);
    if (!product?.productID) return;

    this.http.get<any[]>(`${environment.api.bom}/product/${product.productID}`).subscribe({
      next: items => {
        const flat = this.flattenBomItems(items);
        const stock = this.invSvc.stockItems();
        const warnings = flat
          .map(item => {
            const inv = stock.find(s =>
              s.name.toLowerCase() === item.name?.toLowerCase() ||
              s.sku?.toLowerCase() === item.name?.toLowerCase()
            );
            const available = inv?.currentStock ?? 0;
            const needed = item.quantity ?? 1;
            return available < needed ? { name: item.name, needed, available } : null;
          })
          .filter((w): w is { name: string; needed: number; available: number } => w !== null);
        this.bomStockWarnings.set(warnings);
      },
    });
  }

  private flattenBomItems(items: any[]): any[] {
    const result: any[] = [];
    const walk = (list: any[]) => {
      for (const i of list) { result.push(i); if (i.children?.length) walk(i.children); }
    };
    walk(items ?? []);
    return result;
  }

  saveWO(): void {
    if (this.woForm.invalid) { this.woForm.markAllAsTouched(); return; }
    const v = this.woForm.value;

    if (this.drawerMode() === 'add') {
      const product = this.prodSvc.products().find(p => p.name === v.product);
      const req: CreateWorkOrderRequest = {
        productID:      product?.productID ?? 0,
        productName:    v.product!,
        quantity:       v.quantity!,
        priority:       v.priority as WorkOrder['priority'],
        startDate:      v.startDate!,
        endDate:        v.dueDate!,
        productionLine: v.line!,
        notes:          v.notes || '',
      };
      this.woSvc.create(req).subscribe({
        next: (wo) => { this.toast(`${wo.woNumber} created`, 'success'); this.closeDrawer(); },
      });
    } else {
      const wo = this.selectedWO()!;
      this.woSvc.update(wo.id, {
        quantity:       v.quantity!,
        startDate:      v.startDate!,
        endDate:        v.dueDate!,
        productionLine: v.line!,
        priority:       v.priority as WorkOrder['priority'],
        notes:          v.notes || '',
      }).subscribe({
        next: () => { this.toast('Work Order updated', 'success'); this.closeDrawer(); },
      });
    }
  }

  // â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  toggleExpand(id: string, ev: Event): void {
    ev.stopPropagation();
    this.expandedWOId.update(c => c === id ? null : id);
    if (this.expandedWOId() === id) {
      const wo = this.woSvc.workOrders().find(w => w.id === id);
      if (wo) this.loadTasks(wo);
    }
  }
  confirmDelete(id: string, ev?: Event): void { ev?.stopPropagation(); this.deleteConfirmId.set(id); }
  cancelDelete():                         void { this.deleteConfirmId.set(null); }

  deleteWO(id: string): void {
    this.woSvc.delete(id).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.toast('Work Order deleted', 'warn');
      },
    });
  }

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getProgress(wo: WorkOrder): number { return wo.quantity > 0 ? Math.round((wo.produced / wo.quantity) * 100) : 0; }
  isOverdue(wo: WorkOrder):  boolean { return wo.status !== 'Completed' && wo.dueDate < new Date().toISOString().split('T')[0]; }
  getInitials(name: string): string  { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2); }

  priorityMeta(p: WorkOrder['priority']) {
    return { Low:{cls:'pr-low',color:'#6b7280'}, Medium:{cls:'pr-medium',color:'#2563eb'}, High:{cls:'pr-high',color:'#d97706'}, Critical:{cls:'pr-critical',color:'#dc2626'} }[p];
  }
  statusMeta(s: WorkOrder['status']) {
    const m: Record<string, { cls: string; color: string }> = {
      'Planned':     { cls:'st-planned',    color:'#6b7280' },
      'In Progress': { cls:'st-inprogress', color:'#2563eb' },
      'On Hold':     { cls:'st-onhold',     color:'#d97706' },
      'Completed':   { cls:'st-completed',  color:'#059669' },
      'Cancelled':   { cls:'st-completed',  color:'#9ca3af' },
    };
    return m[s] ?? m['Planned'];
  }

  private pickColor(): string {
    const p = ['#2563eb','#10b981','#f59e0b','#8b5cf6','#ef4444','#0ea5e9','#ec4899','#6366f1','#14b8a6','#a855f7'];
    return p[Math.floor(Math.random() * p.length)];
  }
  private toast(msg: string, type: 'success'|'warn'|'info'): void {
    this.snack.open(msg, 'âœ•', { duration: 3000, panelClass: [`snack-${type}`] });
  }
}


