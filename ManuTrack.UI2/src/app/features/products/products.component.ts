import {
  Component,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

// ── Domain interfaces ────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: 'Mechanical' | 'Hydraulic' | 'Electronic' | 'Structural' | 'Consumable';
  stock: number;
  unitCost: number;
  uom: 'pcs' | 'kg' | 'm' | 'L' | 'set';
  hasBom: boolean;
  description: string;
}

export interface BomItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  type: 'raw-material' | 'sub-assembly' | 'purchased-part';
  expanded?: boolean;
  children?: BomItem[];
}

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Shaft Assembly',   sku: 'SA-1042', category: 'Mechanical',  stock: 340, unitCost: 145.50, uom: 'pcs', hasBom: true,  description: 'Primary drive shaft assembly' },
  { id: '2', name: 'Gear Box Unit',    sku: 'GB-2088', category: 'Mechanical',  stock: 87,  unitCost: 380.00, uom: 'pcs', hasBom: true,  description: 'Industrial gear box 1:4 ratio' },
  { id: '3', name: 'Hydraulic Pump',   sku: 'HP-3301', category: 'Hydraulic',   stock: 42,  unitCost: 620.00, uom: 'pcs', hasBom: true,  description: 'High pressure hydraulic pump' },
  { id: '4', name: 'Control Valve',    sku: 'CV-4410', category: 'Hydraulic',   stock: 156, unitCost: 95.75,  uom: 'pcs', hasBom: false, description: '' },
  { id: '5', name: 'Motor Mount',      sku: 'MM-5501', category: 'Structural',  stock: 210, unitCost: 55.00,  uom: 'pcs', hasBom: true,  description: 'Heavy duty motor mounting bracket' },
  { id: '6', name: 'Bracket Assembly', sku: 'BA-6602', category: 'Structural',  stock: 89,  unitCost: 38.25,  uom: 'pcs', hasBom: false, description: '' },
  { id: '7', name: 'Seal Kit M25',     sku: 'SK-7701', category: 'Consumable',  stock: 580, unitCost: 12.00,  uom: 'set', hasBom: false, description: 'Sealing kit for 25mm shafts' },
  { id: '8', name: 'PCB Controller',   sku: 'PC-8801', category: 'Electronic',  stock: 34,  unitCost: 280.00, uom: 'pcs', hasBom: true,  description: 'Main PLC controller board' },
];

const MOCK_BOMS: Record<string, BomItem[]> = {
  '1': [
    { id: 'b1-1', name: 'Steel Rod',    quantity: 1, unit: 'pcs', type: 'raw-material' },
    { id: 'b1-2', name: 'Bearing Unit', quantity: 2, unit: 'pcs', type: 'purchased-part' },
    { id: 'b1-3', name: 'Circlip',      quantity: 4, unit: 'pcs', type: 'purchased-part' },
    {
      id: 'b1-4', name: 'Seal Pack', quantity: 1, unit: 'set', type: 'sub-assembly', expanded: true,
      children: [
        { id: 'b1-4-1', name: 'O-Ring',  quantity: 2, unit: 'pcs', type: 'raw-material' },
        { id: 'b1-4-2', name: 'Gasket',  quantity: 1, unit: 'pcs', type: 'raw-material' },
      ],
    },
  ],
  '2': [
    { id: 'b2-1', name: 'Cast Housing', quantity: 1, unit: 'pcs', type: 'raw-material' },
    {
      id: 'b2-2', name: 'Gear Set', quantity: 1, unit: 'set', type: 'sub-assembly', expanded: true,
      children: [
        { id: 'b2-2-1', name: 'Main Gear',   quantity: 1, unit: 'pcs', type: 'purchased-part' },
        { id: 'b2-2-2', name: 'Pinion Gear', quantity: 1, unit: 'pcs', type: 'purchased-part' },
      ],
    },
    { id: 'b2-3', name: 'Input Shaft',  quantity: 1, unit: 'pcs', type: 'raw-material' },
    { id: 'b2-4', name: 'Output Shaft', quantity: 1, unit: 'pcs', type: 'raw-material' },
    { id: 'b2-5', name: 'Bearing Pack', quantity: 4, unit: 'pcs', type: 'purchased-part' },
  ],
  '3': [
    { id: 'b3-1', name: 'Pump Body',   quantity: 1, unit: 'pcs', type: 'raw-material' },
    {
      id: 'b3-2', name: 'Piston Assembly', quantity: 1, unit: 'set', type: 'sub-assembly', expanded: true,
      children: [
        { id: 'b3-2-1', name: 'Piston',      quantity: 1, unit: 'pcs', type: 'raw-material' },
        { id: 'b3-2-2', name: 'Piston Ring',  quantity: 4, unit: 'pcs', type: 'raw-material' },
      ],
    },
    { id: 'b3-3', name: 'Valve Block', quantity: 1, unit: 'pcs', type: 'purchased-part' },
    { id: 'b3-4', name: 'Seal Kit',    quantity: 1, unit: 'set', type: 'purchased-part' },
  ],
  '5': [
    { id: 'b5-1', name: 'Steel Plate',       quantity: 1, unit: 'pcs', type: 'raw-material' },
    { id: 'b5-2', name: 'Bolt Set M12',      quantity: 8, unit: 'pcs', type: 'purchased-part' },
    { id: 'b5-3', name: 'Rubber Pad',        quantity: 4, unit: 'pcs', type: 'purchased-part' },
    { id: 'b5-4', name: 'Mounting Bracket',  quantity: 1, unit: 'pcs', type: 'raw-material' },
  ],
};

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSnackBarModule,
    DragDropModule,
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsComponent {

  // ── Tab state ──────────────────────────────────────────────────────────────
  activeTab = signal<'catalog' | 'bom'>('catalog');

  // ── Products state ─────────────────────────────────────────────────────────
  products = signal<Product[]>(MOCK_PRODUCTS);

  // ── BOM state ─────────────────────────────────────────────────────────────
  boms = signal<Record<string, BomItem[]>>(MOCK_BOMS);
  selectedProductId = signal<string | null>(null);

  selectedProduct = computed(() => {
    const id = this.selectedProductId();
    return id ? this.products().find(p => p.id === id) ?? null : null;
  });

  selectedBom = computed(() => {
    const id = this.selectedProductId();
    return id ? (this.boms()[id] ?? []) : [];
  });

  // ── Computed stats ─────────────────────────────────────────────────────────
  totalProducts   = computed(() => this.products().length);
  activeProducts  = computed(() => this.products().filter(p => p.stock > 0).length);
  withBom         = computed(() => this.products().filter(p => p.hasBom).length);
  missingBom      = computed(() => this.products().filter(p => !p.hasBom).length);

  // ── Drawer state ───────────────────────────────────────────────────────────
  drawerOpen    = signal(false);
  editingProduct = signal<Product | null>(null);

  // ── Add BOM item form ──────────────────────────────────────────────────────
  addBomOpen      = signal(false);
  addBomParentId  = signal<string | null>(null);   // null = root level

  // ── Forms ──────────────────────────────────────────────────────────────────
  productForm!: FormGroup;
  bomItemForm!: FormGroup;

  readonly categories: Product['category'][]         = ['Mechanical', 'Hydraulic', 'Electronic', 'Structural', 'Consumable'];
  readonly uoms: Product['uom'][]                    = ['pcs', 'kg', 'm', 'L', 'set'];
  readonly bomTypes: BomItem['type'][]               = ['raw-material', 'sub-assembly', 'purchased-part'];

  constructor(private fb: FormBuilder, private snack: MatSnackBar) {
    this.initProductForm();
    this.initBomItemForm();

    // Auto-select first product with BOM when switching to BOM tab
    effect(() => {
      if (this.activeTab() === 'bom' && !this.selectedProductId()) {
        const first = this.products().find(p => p.hasBom);
        if (first) this.selectedProductId.set(first.id);
      }
    });
  }

  // ── Lifecycle helpers ──────────────────────────────────────────────────────

  private initProductForm(product?: Product): void {
    this.productForm = this.fb.group({
      name:        [product?.name        ?? '', [Validators.required, Validators.minLength(2)]],
      sku:         [product?.sku         ?? '', [Validators.required, Validators.pattern(/^[A-Z]{2}-\d{4}$/)]],
      category:    [product?.category    ?? 'Mechanical', Validators.required],
      uom:         [product?.uom         ?? 'pcs',        Validators.required],
      stock:       [product?.stock       ?? 0,            [Validators.required, Validators.min(0)]],
      unitCost:    [product?.unitCost    ?? 0,            [Validators.required, Validators.min(0)]],
      description: [product?.description ?? ''],
    });
  }

  private initBomItemForm(): void {
    this.bomItemForm = this.fb.group({
      name:     ['', [Validators.required, Validators.minLength(2)]],
      quantity: [1,  [Validators.required, Validators.min(0.001)]],
      unit:     ['pcs', Validators.required],
      type:     ['raw-material', Validators.required],
    });
  }

  // ── Tab toggle ─────────────────────────────────────────────────────────────

  setTab(tab: 'catalog' | 'bom'): void {
    this.activeTab.set(tab);
  }

  // ── Product CRUD ───────────────────────────────────────────────────────────

  openAddDrawer(): void {
    this.editingProduct.set(null);
    this.initProductForm();
    this.drawerOpen.set(true);
  }

  openEditDrawer(product: Product): void {
    this.editingProduct.set(product);
    this.initProductForm(product);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.editingProduct.set(null);
  }

  saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const formValue = this.productForm.getRawValue();
    const editing   = this.editingProduct();

    if (editing) {
      this.products.update(list =>
        list.map(p => p.id === editing.id ? { ...p, ...formValue } : p)
      );
      this.snack.open(`"${formValue.name}" updated successfully.`, 'Dismiss', { duration: 3000 });
    } else {
      const newProduct: Product = {
        id: String(Date.now()),
        hasBom: false,
        ...formValue,
      };
      this.products.update(list => [...list, newProduct]);
      this.snack.open(`"${formValue.name}" added to catalog.`, 'Dismiss', { duration: 3000 });
    }

    this.closeDrawer();
  }

  deleteProduct(product: Product): void {
    this.products.update(list => list.filter(p => p.id !== product.id));
    this.boms.update(map => {
      const copy = { ...map };
      delete copy[product.id];
      return copy;
    });
    if (this.selectedProductId() === product.id) {
      this.selectedProductId.set(null);
    }
    this.snack.open(`"${product.name}" deleted.`, 'Dismiss', { duration: 3000 });
  }

  // ── Navigate to BOM tab for a product ─────────────────────────────────────

  viewBom(product: Product): void {
    this.selectedProductId.set(product.id);
    this.activeTab.set('bom');
  }

  // ── BOM product selection ──────────────────────────────────────────────────

  selectBomProduct(id: string): void {
    this.selectedProductId.set(id);
    this.addBomOpen.set(false);
    this.addBomParentId.set(null);
    this.bomItemForm.reset({ name: '', quantity: 1, unit: 'pcs', type: 'raw-material' });
  }

  // ── BOM tree toggle ────────────────────────────────────────────────────────

  toggleExpand(item: BomItem): void {
    if (!item.children?.length) return;
    const productId = this.selectedProductId()!;
    this.boms.update(map => ({
      ...map,
      [productId]: this.toggleItemExpand(map[productId], item.id),
    }));
  }

  private toggleItemExpand(items: BomItem[], targetId: string): BomItem[] {
    return items.map(item => {
      if (item.id === targetId) return { ...item, expanded: !item.expanded };
      if (item.children?.length) {
        return { ...item, children: this.toggleItemExpand(item.children, targetId) };
      }
      return item;
    });
  }

  // ── BOM DnD (root level) ───────────────────────────────────────────────────

  onRootDrop(event: CdkDragDrop<BomItem[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const productId = this.selectedProductId()!;
    this.boms.update(map => {
      const items = [...(map[productId] ?? [])];
      moveItemInArray(items, event.previousIndex, event.currentIndex);
      return { ...map, [productId]: items };
    });
  }

  onChildDrop(event: CdkDragDrop<BomItem[] | undefined>, parentId: string): void {
    if (event.previousIndex === event.currentIndex) return;
    const productId = this.selectedProductId()!;
    this.boms.update(map => ({
      ...map,
      [productId]: this.reorderChildren(map[productId], parentId, event.previousIndex, event.currentIndex),
    }));
  }

  private reorderChildren(items: BomItem[], parentId: string, from: number, to: number): BomItem[] {
    return items.map(item => {
      if (item.id === parentId && item.children) {
        const children = [...item.children];
        moveItemInArray(children, from, to);
        return { ...item, children };
      }
      if (item.children?.length) {
        return { ...item, children: this.reorderChildren(item.children, parentId, from, to) };
      }
      return item;
    });
  }

  // ── Add BOM item ───────────────────────────────────────────────────────────

  openAddBomItem(parentId: string | null): void {
    this.addBomParentId.set(parentId);
    this.addBomOpen.set(true);
    this.bomItemForm.reset({ name: '', quantity: 1, unit: 'pcs', type: 'raw-material' });
  }

  cancelAddBomItem(): void {
    this.addBomOpen.set(false);
    this.addBomParentId.set(null);
  }

  saveAddBomItem(): void {
    if (this.bomItemForm.invalid) {
      this.bomItemForm.markAllAsTouched();
      return;
    }

    const productId = this.selectedProductId()!;
    const parentId  = this.addBomParentId();
    const val       = this.bomItemForm.getRawValue();

    const newItem: BomItem = {
      id:       `${productId}-${Date.now()}`,
      name:     val.name,
      quantity: val.quantity,
      unit:     val.unit,
      type:     val.type,
    };

    this.boms.update(map => {
      const rootItems = map[productId] ?? [];
      if (parentId === null) {
        return { ...map, [productId]: [...rootItems, newItem] };
      }
      return { ...map, [productId]: this.addChildToItem(rootItems, parentId, newItem) };
    });

    // If this is the first BOM item, mark product as having BOM
    this.products.update(list =>
      list.map(p => p.id === productId ? { ...p, hasBom: true } : p)
    );

    this.cancelAddBomItem();
    this.snack.open(`"${newItem.name}" added to BOM.`, 'Dismiss', { duration: 2500 });
  }

  private addChildToItem(items: BomItem[], parentId: string, newChild: BomItem): BomItem[] {
    return items.map(item => {
      if (item.id === parentId) {
        return { ...item, expanded: true, children: [...(item.children ?? []), newChild] };
      }
      if (item.children?.length) {
        return { ...item, children: this.addChildToItem(item.children, parentId, newChild) };
      }
      return item;
    });
  }

  // ── Delete BOM item ────────────────────────────────────────────────────────

  deleteBomItem(itemId: string): void {
    const productId = this.selectedProductId()!;
    this.boms.update(map => {
      const updated = this.removeItemById(map[productId] ?? [], itemId);
      return { ...map, [productId]: updated };
    });
  }

  private removeItemById(items: BomItem[], targetId: string): BomItem[] {
    return items
      .filter(item => item.id !== targetId)
      .map(item => ({
        ...item,
        children: item.children ? this.removeItemById(item.children, targetId) : undefined,
      }));
  }

  // ── Utility helpers ────────────────────────────────────────────────────────

  typeIcon(type: BomItem['type']): string {
    const map: Record<BomItem['type'], string> = {
      'raw-material':   'grain',
      'sub-assembly':   'device_hub',
      'purchased-part': 'shopping_cart',
    };
    return map[type];
  }

  typeLabel(type: BomItem['type']): string {
    const map: Record<BomItem['type'], string> = {
      'raw-material':   'Raw Material',
      'sub-assembly':   'Sub-Assembly',
      'purchased-part': 'Purchased Part',
    };
    return map[type];
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  // Provides unique drop list IDs for CDK DnD
  childDropId(parentId: string): string {
    return `child-drop-${parentId}`;
  }

  // Collect all child drop-list IDs for connectedTo on root (not strictly needed but safer)
  get allChildDropIds(): string[] {
    const ids: string[] = [];
    const collectIds = (items: BomItem[]): void => {
      items.forEach(item => {
        if (item.children?.length) {
          ids.push(this.childDropId(item.id));
          collectIds(item.children);
        }
      });
    };
    collectIds(this.selectedBom());
    return ids;
  }
}
