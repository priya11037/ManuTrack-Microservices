import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InventoryService, StockItem as SvcStockItem, CreateStockItemRequest } from '../../../core/services/inventory.service';

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  supplier: string;
  location: string;
  lastUpdated: string;
}

@Component({
  selector: 'app-stock-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './stock-dashboard.component.html',
  styleUrl: './stock-dashboard.component.scss',
})
export class StockDashboardComponent implements OnInit {
  private snack = inject(MatSnackBar);
  private fb    = inject(FormBuilder);
  readonly invSvc = inject(InventoryService);

  // ── UI State ─────────────────────────────────────────────────────────────
  drawerOpen      = signal(false);
  drawerMode      = signal<'add' | 'edit'>('add');
  selectedItem    = signal<StockItem | null>(null);
  deleteConfirmId = signal<string | null>(null);
  searchTerm      = signal('');
  categoryFilter  = signal('all');
  stockFilter     = signal('all'); // all | low | ok | overstock

  categories = ['Raw Material', 'Component', 'Consumable', 'Finished Good', 'Packaging'];
  suppliers  = ['SteelCo Ltd', 'PrecisionParts Inc', 'GlobalSupply Co', 'FastenerWorld', 'ChemSupply Ltd', 'PackagePro'];
  locations  = ['Warehouse A', 'Warehouse B', 'Cold Store', 'Hazmat Store', 'Line A Store', 'Line B Store'];
  units      = ['pcs', 'kg', 'meters', 'liters', 'boxes', 'rolls'];

  // ── Stock Data ────────────────────────────────────────────────────────────
  get items() { return this.invSvc.stockItems; }

  // ── Computed ─────────────────────────────────────────────────────────────
  filtered = computed(() => {
    const q   = this.searchTerm().toLowerCase().trim();
    const cat = this.categoryFilter();
    const stk = this.stockFilter();
    return this.invSvc.stockItems().filter(i => {
      const matchQ   = !q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q);
      const matchCat = cat === 'all' || i.category === cat;
      const matchStk = stk === 'all'
        || (stk === 'low'      && i.currentStock <= i.minStock)
        || (stk === 'ok'       && i.currentStock > i.minStock && i.currentStock < i.maxStock)
        || (stk === 'overstock'&& i.currentStock >= i.maxStock);
      return matchQ && matchCat && matchStk;
    });
  });

  get stats() { return this.invSvc.stockStats; }

  // ── Form ─────────────────────────────────────────────────────────────────
  itemForm = this.fb.group({
    sku:          ['', Validators.required],
    name:         ['', Validators.required],
    category:     ['', Validators.required],
    unit:         ['pcs', Validators.required],
    currentStock: [0,  [Validators.required, Validators.min(0)]],
    minStock:     [0,  [Validators.required, Validators.min(0)]],
    maxStock:     [100,[Validators.required, Validators.min(1)]],
    unitCost:     [0,  [Validators.required, Validators.min(0)]],
    supplier:     ['', Validators.required],
    location:     ['', Validators.required],
  });

  openAddDrawer(): void {
    this.drawerMode.set('add');
    this.selectedItem.set(null);
    this.itemForm.reset({ unit: 'pcs', currentStock: 0, minStock: 0, maxStock: 100, unitCost: 0 });
    this.drawerOpen.set(true);
  }

  openEditDrawer(item: StockItem, ev: Event): void {
    ev.stopPropagation();
    this.drawerMode.set('edit');
    this.selectedItem.set(item);
    this.itemForm.patchValue(item);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void { this.drawerOpen.set(false); this.selectedItem.set(null); }

  saveItem(): void {
    if (this.itemForm.invalid) { this.itemForm.markAllAsTouched(); return; }
    const v = this.itemForm.value;
    if (this.drawerMode() === 'add') {
      const req: CreateStockItemRequest = {
        sku: v.sku!, name: v.name!, category: v.category!,
        unit: v.unit!, currentStock: v.currentStock!, minStock: v.minStock!,
        maxStock: v.maxStock!, unitCost: v.unitCost!, supplier: v.supplier!,
        location: v.location!,
      };
      this.invSvc.createStockItem(req).subscribe({
        next: (created) => { this.toast(`${created.name} added to inventory`, 'success'); this.closeDrawer(); }
      });
    } else {
      const item = this.selectedItem()!;
      const id   = (item as any).itemID ?? +(item as any).id;
      const req: Partial<CreateStockItemRequest> = {
        sku: v.sku!, name: v.name!, category: v.category!,
        unit: v.unit!, currentStock: v.currentStock!, minStock: v.minStock!,
        maxStock: v.maxStock!, unitCost: v.unitCost!, supplier: v.supplier!,
        location: v.location!,
      };
      this.invSvc.updateStockItem(id, req).subscribe({
        next: () => { this.toast('Stock item updated', 'success'); this.closeDrawer(); }
      });
    }
  }

  confirmDelete(id: string): void { this.deleteConfirmId.set(id); }
  cancelDelete():             void { this.deleteConfirmId.set(null); }
  deleteItem(id: string):     void {
    this.invSvc.deleteStockItem(+id).subscribe({
      next: () => { this.deleteConfirmId.set(null); this.toast('Item removed', 'warn'); }
    });
  }

  // ── Stock level helpers ───────────────────────────────────────────────────
  stockStatus(i: StockItem): 'low' | 'ok' | 'overstock' {
    if (i.currentStock <= i.minStock) return 'low';
    if (i.currentStock >= i.maxStock) return 'overstock';
    return 'ok';
  }

  stockPct(i: StockItem): number {
    return Math.min(100, Math.round((i.currentStock / i.maxStock) * 100));
  }

  stockBarColor(i: StockItem): string {
    const s = this.stockStatus(i);
    return s === 'low' ? '#dc2626' : s === 'overstock' ? '#d97706' : '#059669';
  }

  private toast(msg: string, type: 'success' | 'warn' | 'info'): void {
    this.snack.open(msg, '✕', { duration: 3000, panelClass: [`snack-${type}`] });
  }

  ngOnInit(): void { this.invSvc.loadStock(); }
}
