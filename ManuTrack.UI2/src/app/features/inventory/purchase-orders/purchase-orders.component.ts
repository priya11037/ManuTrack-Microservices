import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { InventoryService, PurchaseOrder, CreatePurchaseOrderRequest } from '../../../core/services/inventory.service';
export type { PurchaseOrder } from '../../../core/services/inventory.service';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatTooltipModule, MatSnackBarModule, DragDropModule],
  templateUrl: './purchase-orders.component.html',
  styleUrl: './purchase-orders.component.scss',
})
export class PurchaseOrdersComponent implements OnInit {
  private snack = inject(MatSnackBar);
  private fb    = inject(FormBuilder);
  readonly invSvc = inject(InventoryService);

  // ── UI State ─────────────────────────────────────────────────────────────
  drawerOpen      = signal(false);
  drawerMode      = signal<'add' | 'edit'>('add');
  selectedPO      = signal<PurchaseOrder | null>(null);
  deleteConfirmId = signal<string | null>(null);
  searchTerm      = signal('');
  statusFilter    = signal('all');
  viewMode        = signal<'list' | 'priority'>('list');

  statuses   = ['Draft', 'Submitted', 'Approved', 'Ordered', 'Received', 'Cancelled'] as PurchaseOrder['status'][];
  priorities = ['Low', 'Medium', 'High', 'Urgent'] as PurchaseOrder['priority'][];
  // Loaded from API
  suppliers  = computed(() => this.invSvc.suppliers());
  items      = computed(() => this.invSvc.stockItems().map(i => i.name).filter(Boolean));

  // ── Data ─────────────────────────────────────────────────────────────────
  get orders() { return this.invSvc.purchaseOrders; }

  // ── Priority queue (mutable array for DnD) ────────────────────────────────
  priorityQueue = signal<PurchaseOrder[]>([]);

  syncPriorityQueue(): void {
    const pending = this.invSvc.purchaseOrders().filter(o => o.status !== 'Received' && o.status !== 'Cancelled');
    const sorted  = [...pending].sort((a, b) => {
      const rank = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
      return rank[a.priority] - rank[b.priority];
    });
    this.priorityQueue.set(sorted);
  }

  // ── Computed ─────────────────────────────────────────────────────────────
  filtered = computed(() => {
    const q  = this.searchTerm().toLowerCase().trim();
    const st = this.statusFilter();
    return this.invSvc.purchaseOrders().filter(o => {
      const itemName = o.item ?? '';
      const matchQ  = !q || o.poNumber.toLowerCase().includes(q) || itemName.toLowerCase().includes(q) || o.supplier.toLowerCase().includes(q);
      const matchSt = st === 'all' || o.status === st;
      return matchQ && matchSt;
    });
  });

  get stats() { return this.invSvc.poStats; }

  // ── DnD reorder priority queue ────────────────────────────────────────────
  onPriorityDrop(event: CdkDragDrop<PurchaseOrder[]>): void {
    const list = [...this.priorityQueue()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.priorityQueue.set(list);
    this.toast(`PO priority reordered`, 'info');
  }

  // ── Drawer ───────────────────────────────────────────────────────────────
  openAddDrawer(): void {
    this.drawerMode.set('add');
    this.selectedPO.set(null);
    const today = new Date().toISOString().split('T')[0];
    this.poForm.reset({ priority: 'Medium', status: 'Draft', quantity: 1, unitCost: 0, orderDate: today });
    this.drawerOpen.set(true);
  }

  openEditDrawer(po: PurchaseOrder, ev: Event): void {
    ev.stopPropagation();
    this.drawerMode.set('edit');
    this.selectedPO.set(po);
    this.poForm.patchValue(po);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void { this.drawerOpen.set(false); this.selectedPO.set(null); }

  // ── Form ─────────────────────────────────────────────────────────────────
  poForm = this.fb.group({
    supplier:     ['', Validators.required],
    item:         ['', Validators.required],
    sku:          [''],
    quantity:     [1,  [Validators.required, Validators.min(1)]],
    unitCost:     [0,  [Validators.required, Validators.min(0.01)]],
    priority:     ['Medium', Validators.required],
    status:       ['Draft',  Validators.required],
    orderDate:    ['', Validators.required],
    expectedDate: ['', Validators.required],
    notes:        [''],
  });

  savePO(): void {
    if (this.poForm.invalid) { this.poForm.markAllAsTouched(); return; }
    const v = this.poForm.value;

    if (this.drawerMode() === 'add') {
      const req: CreatePurchaseOrderRequest = {
        supplier:     v.supplier!,
        itemName:     v.item!,
        sku:          v.sku || '',
        quantity:     v.quantity!,
        unitCost:     v.unitCost!,
        priority:     v.priority as PurchaseOrder['priority'],
        orderDate:    v.orderDate!,
        expectedDate: v.expectedDate!,
        notes:        v.notes || undefined,
      };
      this.invSvc.createPurchaseOrder(req).subscribe({
        next: (created) => { this.syncPriorityQueue(); this.toast(`${created.poNumber} created`, 'success'); this.closeDrawer(); }
      });
    } else {
      const po = this.selectedPO()!;
      const id = po.purchaseOrderID!;
      this.invSvc.updatePurchaseOrderStatus(id, v.status as PurchaseOrder['status']).subscribe({
        next: () => { this.syncPriorityQueue(); this.toast('Purchase order updated', 'success'); this.closeDrawer(); }
      });
    }
  }

  confirmDelete(id: string): void { this.deleteConfirmId.set(id); }
  cancelDelete():             void { this.deleteConfirmId.set(null); }
  deleteOrder(id: string):    void {
    this.invSvc.removeLocalPO(id);
    this.syncPriorityQueue();
    this.deleteConfirmId.set(null);
    this.toast('Purchase order removed', 'warn');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  priorityMeta(p: PurchaseOrder['priority']) {
    return {
      Low:    { color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
      Medium: { color: '#2563eb', bg: 'rgba(37,99,235,0.10)'   },
      High:   { color: '#d97706', bg: 'rgba(217,119,6,0.10)'   },
      Urgent: { color: '#dc2626', bg: 'rgba(220,38,38,0.10)'   },
    }[p];
  }

  statusMeta(s: PurchaseOrder['status']) {
    const m: Record<string, { color: string; bg: string }> = {
      Draft:     { color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
      Submitted: { color: '#2563eb', bg: 'rgba(37,99,235,0.10)'   },
      Approved:  { color: '#d97706', bg: 'rgba(217,119,6,0.10)'   },
      Ordered:   { color: '#7c3aed', bg: 'rgba(124,58,237,0.10)'  },
      Received:  { color: '#059669', bg: 'rgba(5,150,105,0.10)'   },
      Cancelled: { color: '#dc2626', bg: 'rgba(220,38,38,0.10)'   },
    };
    return m[s] ?? m['Draft'];
  }

  isOverdue(po: PurchaseOrder): boolean {
    return !['Received','Cancelled'].includes(po.status) && po.expectedDate < new Date().toISOString().split('T')[0];
  }

  private toast(msg: string, type: 'success' | 'warn' | 'info'): void {
    this.snack.open(msg, '✕', { duration: 3000, panelClass: [`snack-${type}`] });
  }

  ngOnInit(): void {
    this.invSvc.loadPurchaseOrders();
    this.invSvc.loadStock();
    this.invSvc.loadSuppliers();
    this.syncPriorityQueue();
  }
}
