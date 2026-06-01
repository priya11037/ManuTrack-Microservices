import {
  Component,
  signal,
  computed,
  effect,
  OnInit,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ProductService, Product, BomItem } from '../../core/services/product.service';
export type { Product, BomItem } from '../../core/services/product.service';


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
export class ProductsComponent implements OnInit {
  private readonly prodSvc = inject(ProductService);
  private readonly fb      = inject(FormBuilder);
  private readonly snack   = inject(MatSnackBar);

  // ── Tab state ──────────────────────────────────────────────────────────────
  activeTab = signal<'catalog' | 'bom'>('catalog');

  // ── Products state — derived from ProductService ───────────────────────────
  get products() { return this.prodSvc.products; }

  // ── BOM state — service data + local UI expand state overlaid ─────────────
  /** Local UI-only signal: expand state and DnD reorder for current BOM view */
  private _localBomExpand = signal<Record<string, boolean>>({});

  get boms() { return this.prodSvc.boms; }
  selectedProductId = signal<string | null>(null);

  selectedProduct = computed(() => {
    const id = this.selectedProductId();
    if (!id) return null;
    const svc = this.prodSvc.products().find(p => p.productID?.toString() === id);
    return svc ? this.toViewProduct(svc) : null;
  });

  selectedBom = computed(() => {
    const id = this.selectedProductId();
    if (!id) return [];
    const bomItems = this.prodSvc.boms()[+id] ?? [];
    const expandMap = this._localBomExpand();
    return this.toViewBomItems(bomItems, expandMap);
  });

  // ── Computed stats ─────────────────────────────────────────────────────────
  totalProducts   = computed(() => this.prodSvc.products().length);
  activeProducts  = computed(() => this.prodSvc.products().filter(p => p.stock > 0).length);
  withBom         = computed(() => this.prodSvc.products().filter(p => p.hasBom).length);
  missingBom      = computed(() => this.prodSvc.products().filter(p => !p.hasBom).length);

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

  constructor() {
    this.initProductForm();
    this.initBomItemForm();

    // Auto-select first product with BOM when switching to BOM tab
    effect(() => {
      if (this.activeTab() === 'bom' && !this.selectedProductId()) {
        const first = this.prodSvc.products().find(p => p.hasBom);
        if (first) this.selectedProductId.set(first.productID?.toString() ?? first.id);
      }
    });

    // Load BOMs for products that have them whenever the product list changes
    effect(() => {
      this.prodSvc.products().forEach(p => {
        if (p.hasBom && p.productID) this.prodSvc.loadBom(p.productID);
      });
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.prodSvc.loadProducts();
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
      this.prodSvc.updateProduct(+editing.id, formValue).subscribe({
        next: () => this.snack.open(`"${formValue.name}" updated successfully.`, 'Dismiss', { duration: 3000 }),
      });
    } else {
      this.prodSvc.createProduct(formValue).subscribe({
        next: () => this.snack.open(`"${formValue.name}" added to catalog.`, 'Dismiss', { duration: 3000 }),
      });
    }

    this.closeDrawer();
  }

  deleteProduct(product: Product): void {
    this.prodSvc.deleteProduct(+product.id).subscribe({
      next: () => {
        if (this.selectedProductId() === product.id) {
          this.selectedProductId.set(null);
        }
        this.snack.open(`"${product.name}" deleted.`, 'Dismiss', { duration: 3000 });
      },
    });
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

  // ── BOM tree toggle (UI-only expand/collapse) ──────────────────────────────

  toggleExpand(item: BomItem): void {
    if (!item.children?.length) return;
    this._localBomExpand.update(map => ({ ...map, [item.id]: !map[item.id] }));
  }

  // ── BOM DnD (root level) — visual reorder only; no backend call ────────────

  onRootDrop(event: CdkDragDrop<BomItem[]>): void {
    // DnD operates on the computed selectedBom view — reorder is visual only
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
  }

  onChildDrop(event: CdkDragDrop<BomItem[] | undefined>, _parentId: string): void {
    if (event.previousIndex === event.currentIndex || !event.container.data) return;
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
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

    this.prodSvc.addBomItem({
      productID: +productId,
      name:      val.name,
      quantity:  val.quantity,
      unit:      val.unit,
      type:      val.type,
      parentID:  parentId ? +parentId : undefined,
    }).subscribe({
      next: () => this.snack.open(`"${val.name}" added to BOM.`, 'Dismiss', { duration: 2500 }),
    });

    this.cancelAddBomItem();
  }

  // ── Delete BOM item ────────────────────────────────────────────────────────

  deleteBomItem(itemId: string): void {
    const productId = this.selectedProductId()!;
    this.prodSvc.deleteBomItem(+itemId, +productId).subscribe();
  }

  // ── Service → View model mappers ───────────────────────────────────────────

  private toViewProduct(p: import('../../core/services/product.service').Product): Product {
    return {
      id:          p.productID?.toString() ?? p.id,
      name:        p.name,
      sku:         p.sku,
      category:    p.category as Product['category'],
      stock:       p.stock,
      unitCost:    p.unitCost,
      uom:         p.uom as Product['uom'],
      hasBom:      p.hasBom,
      description: p.description,
    };
  }

  private toViewBomItems(
    items: import('../../core/services/product.service').BomItem[],
    expandMap: Record<string, boolean> = {}
  ): BomItem[] {
    return items.map(item => ({
      id:       item.bomItemID?.toString() ?? item.id ?? '',
      name:     item.name,
      quantity: item.quantity,
      unit:     item.unit,
      type:     item.type,
      expanded: expandMap[item.bomItemID?.toString() ?? item.id ?? ''] ?? false,
      children: item.children?.length
        ? this.toViewBomItems(item.children, expandMap)
        : undefined,
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
