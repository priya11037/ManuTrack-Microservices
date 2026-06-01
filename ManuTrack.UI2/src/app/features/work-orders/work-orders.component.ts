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

// Re-export so other components (e.g. schedule) can still import WorkOrder from here
export type { WorkOrder } from '../../core/services/work-order.service';

// ── Component ─────────────────────────────────────────────────────────────────
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
  readonly woSvc   = inject(WorkOrderService);
  private usrSvc   = inject(UserService);
  private auth     = inject(AuthService);
  private invSvc   = inject(InventoryService);

  // ── Low-stock banner (Inventory Manager → Production Planner connection) ─────
  /** Items that are low or out of stock — Production Planner sees these as a warning */
  lowStockItems = computed<StockItem[]>(() =>
    this.invSvc.stockItems().filter(i => i.currentStock <= i.minStock)
  );
  showStockBanner = signal(true);   // user can dismiss the banner

  // ── Read-only mode for Admin ───────────────────────────────────────────────────
  isReadOnly = computed(() => this.auth.userRole() === 'Admin');

  // ── UI state ─────────────────────────────────────────────────────────────────
  viewMode        = signal<'table' | 'kanban'>('table');
  drawerOpen      = signal(false);
  drawerMode      = signal<'add' | 'edit'>('add');
  selectedWO      = signal<WorkOrder | null>(null);
  deleteConfirmId = signal<string | null>(null);
  expandedWOId    = signal<string | null>(null);

  // ── Filters ──────────────────────────────────────────────────────────────────
  searchTerm     = signal('');
  statusFilter   = signal('all');
  priorityFilter = signal('all');

  // ── Options ──────────────────────────────────────────────────────────────────
  products  = ['Shaft Assembly','Gear Box Unit','Hydraulic Pump','Control Valve','Motor Mount','Bracket Assembly','PCB Controller'];
  skuMap: Record<string,string> = {
    'Shaft Assembly':'SA-1042','Gear Box Unit':'GB-2088','Hydraulic Pump':'HP-3301',
    'Control Valve':'CV-4410','Motor Mount':'MM-5501','Bracket Assembly':'BA-6602','PCB Controller':'PC-8801',
  };
  // Operators loaded dynamically from UserService — ShopFloorOperator role only
  operators = computed(() => {
    const fromService = this.usrSvc.users()
      .filter(u => u.role === 'ShopFloorOperator' && u.status === 'Active')
      .map(u => u.name);
    // Fallback to defaults if backend not yet loaded
    return fromService.length > 0
      ? fromService
      : ['Mike Johnson','Tom Wilson','Carlos Ramos','Amy Zhang','Linda Brown'];
  });
  lines      = ['Line A','Line B','Line C','Line D'];
  priorities = ['Low','Medium','High','Critical'] as WorkOrder['priority'][];
  statuses   = ['Planned','In Progress','On Hold','Completed'] as WorkOrder['status'][];

  // ── Data from service (single source of truth) ──────────────────────────────
  // Expose as local alias so template references remain unchanged
  get workOrders() { return this.woSvc.workOrders; }
  get isLoading()  { return this.woSvc.isLoading; }

  // ── Kanban mutable arrays (synced from service signal) ───────────────────────
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

  // ── Computed ──────────────────────────────────────────────────────────────────
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

  // ── Form ─────────────────────────────────────────────────────────────────────
  woForm = this.fb.group({
    product:    ['', Validators.required],
    sku:        [''],
    quantity:   [1,       [Validators.required, Validators.min(1)]],
    priority:   ['Medium', Validators.required],
    status:     ['Planned', Validators.required],
    startDate:  ['', Validators.required],
    dueDate:    ['', Validators.required],
    assignedTo: ['', Validators.required],
    line:       ['Line A', Validators.required],
    notes:      [''],
  });

  ngOnInit(): void {
    this.woSvc.loadAll();
    // Load stock items so Planner can see low-stock warnings
    this.invSvc.loadStock();
    // Only Admin can call GET /api/v1/auth/users — Production Planner uses fallback list
    if (this.auth.userRole() === 'Admin') {
      this.usrSvc.loadAll();
    }
  }

  // ── Kanban DnD ────────────────────────────────────────────────────────────────
  onKanbanDrop(event: CdkDragDrop<WorkOrder[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    const wo        = event.container.data[event.currentIndex];
    const newStatus = event.container.id as WorkOrder['status'];

    // Optimistic update — UI feels instant
    this.woSvc.updateLocalStatus(wo.id, newStatus);

    // Persist to backend
    this.woSvc.updateStatus(wo.id, newStatus).subscribe({
      next: () => this.toast(`${wo.woNumber} → ${newStatus}`, 'info'),
      error: () => {
        // Rollback on failure
        this.woSvc.updateLocalStatus(wo.id, wo.status);
        this.toast(`Failed to update ${wo.woNumber}`, 'warn');
      },
    });
  }

  // ── Drawer ────────────────────────────────────────────────────────────────────
  openAddDrawer(): void {
    this.drawerMode.set('add');
    this.selectedWO.set(null);
    const today = new Date().toISOString().split('T')[0];
    this.woForm.reset({ priority:'Medium', status:'Planned', startDate: today, line:'Line A', quantity:1 });
    this.drawerOpen.set(true);
  }

  openEditDrawer(wo: WorkOrder, ev?: Event): void {
    ev?.stopPropagation();
    this.drawerMode.set('edit');
    this.selectedWO.set(wo);
    this.woForm.patchValue(wo);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void { this.drawerOpen.set(false); this.selectedWO.set(null); }

  onProductChange(name: string): void {
    this.woForm.get('sku')?.setValue(this.skuMap[name] ?? '');
  }

  saveWO(): void {
    if (this.woForm.invalid) { this.woForm.markAllAsTouched(); return; }
    const v = this.woForm.value;

    if (this.drawerMode() === 'add') {
      const req: CreateWorkOrderRequest = {
        productID:      1, // TODO: resolve from product catalog
        productName:    v.product!,
        quantity:       v.quantity!,
        priority:       v.priority as WorkOrder['priority'],
        startDate:      v.startDate!,
        endDate:        v.dueDate!,
        assignedTo:     v.assignedTo!,
        productionLine: v.line!,  // maps to backend field name
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
        assignedTo:     v.assignedTo!,
        productionLine: v.line!,
        priority:       v.priority as WorkOrder['priority'],
        notes:          v.notes || '',
      }).subscribe({
        next: () => { this.toast('Work Order updated', 'success'); this.closeDrawer(); },
      });
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────────
  toggleExpand(id: string, ev: Event): void { ev.stopPropagation(); this.expandedWOId.update(c => c === id ? null : id); }
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

  // ── Helpers ───────────────────────────────────────────────────────────────────
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
    this.snack.open(msg, '✕', { duration: 3000, panelClass: [`snack-${type}`] });
  }
}
