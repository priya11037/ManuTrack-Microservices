import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Models ────────────────────────────────────────────────────────────────────
export interface Product {
  id:           string;    // productID.toString() — used by component templates
  productID?:   number;    // optional — assigned by backend
  name:         string;
  sku:          string;
  category:     string;
  stock:        number;
  unitCost:     number;
  uom:          string;
  hasBom:       boolean;
  description:  string;
  createdAt?:   string;    // optional — assigned by backend
}

export interface BomItem {
  id:          string;    // bomItemID.toString()
  bomItemID?:  number;    // optional — assigned by backend
  productID?:  number;    // optional — assigned by backend
  name:        string;
  quantity:    number;
  unit:        string;
  type:        'raw-material' | 'sub-assembly' | 'purchased-part';
  parentID?:   number;
  expanded?:   boolean;
  children?:   BomItem[];
}

export interface CreateProductRequest {
  name:        string;
  sku:         string;
  category:    string;
  stock:       number;
  unitCost:    number;
  uom:         string;
  description?: string;
}

export interface CreateBomItemRequest {
  productID:  number;
  name:       string;
  quantity:   number;
  unit:       string;
  type:       BomItem['type'];
  parentID?:  number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http       = inject(HttpClient);
  private productUrl = environment.api.products;
  private bomUrl     = environment.api.bom;

  // ── State ──────────────────────────────────────────────────────────────────
  products  = signal<Product[]>([]);
  boms      = signal<Record<number, BomItem[]>>({});
  isLoading = signal(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  stats = computed(() => {
    const all = this.products();
    return {
      total:      all.length,
      withBom:    all.filter(p => p.hasBom).length,
      missingBom: all.filter(p => !p.hasBom).length,
      totalValue: all.reduce((sum, p) => sum + p.stock * p.unitCost, 0),
    };
  });

  // ── DTO mapper — ensures 'id' string field exists and safe defaults ─────
  private withId(p: any): Product {
    return {
      ...p,
      id:        p.productID?.toString() ?? p.id ?? '',
      sku:       p.sku       ?? p.Sku       ?? '',
      stock:     p.stock     ?? p.Stock     ?? 0,
      unitCost:  p.unitCost  ?? p.UnitCost  ?? 0,
      uom:       p.uom       ?? p.Uom       ?? 'pcs',
      hasBom:    p.hasBom    ?? p.HasBom    ?? (Array.isArray(p.boms) && p.boms.length > 0),
    };
  }

  // ── Product API ────────────────────────────────────────────────────────────
  loadProducts(): void {
    this.isLoading.set(true);
    this.http.get<any[]>(this.productUrl)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({ next: data => this.products.set(data.map(p => this.withId(p))) });
  }

  createProduct(req: CreateProductRequest): Observable<Product> {
    return this.http.post<any>(this.productUrl, req).pipe(
      tap(created => this.products.update(list => [this.withId(created), ...list]))
    ) as unknown as Observable<Product>;
  }

  updateProduct(id: number, req: Partial<CreateProductRequest>): Observable<Product> {
    return this.http.put<any>(`${this.productUrl}/${id}`, req).pipe(
      tap(updated => this.products.update(list =>
        list.map(p => p.productID === id ? this.withId(updated) : p)
      ))
    ) as unknown as Observable<Product>;
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.productUrl}/${id}`).pipe(
      tap(() => this.products.update(list => list.filter(p => p.productID !== id)))
    );
  }

  // ── BOM API ────────────────────────────────────────────────────────────────

  /** GET /api/v1/bom/product/{productId} — returns nested tree of BOM items */
  loadBom(productId: number): void {
    this.http.get<any[]>(`${this.bomUrl}/product/${productId}`)
      .subscribe({
        next: data => {
          const mapped = this.mapBomTree(Array.isArray(data) ? data : []);
          this.boms.update(b => ({ ...b, [productId]: mapped }));
        },
        error: () => {
          // silently set empty array on error so the UI shows "no items"
          this.boms.update(b => ({ ...b, [productId]: [] }));
        }
      });
  }

  /** POST /api/v1/bom — add a BOM item (root or child) */
  addBomItem(req: CreateBomItemRequest): Observable<BomItem> {
    return this.http.post<any>(this.bomUrl, req).pipe(
      tap(() => this.loadBom(req.productID))
    ) as unknown as Observable<BomItem>;
  }

  /** DELETE /api/v1/bom/{id} — remove a BOM item and its children */
  deleteBomItem(id: number, productId: number): Observable<void> {
    return this.http.delete<void>(`${this.bomUrl}/${id}`).pipe(
      tap(() => this.loadBom(productId))
    );
  }

  /** Recursively map backend BomItemViewModel → frontend BomItem */
  private mapBomTree(items: any[]): BomItem[] {
    return items.map(i => ({
      id:         (i.bomItemID ?? i.BomItemID ?? i.id ?? '').toString(),
      bomItemID:  i.bomItemID ?? i.BomItemID,
      productID:  i.productID ?? i.ProductID,
      name:       i.name      ?? i.Name      ?? '',
      quantity:   i.quantity  ?? i.Quantity  ?? 0,
      unit:       i.unit      ?? i.Unit      ?? 'pcs',
      type:       i.type      ?? i.Type      ?? 'raw-material',
      parentID:   i.parentID  ?? i.ParentID,
      children:   i.children?.length ? this.mapBomTree(i.children) : undefined,
    }));
  }
}
