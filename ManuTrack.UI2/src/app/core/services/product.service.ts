import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Models ────────────────────────────────────────────────────────────────────
export interface Product {
  productID:   number;
  name:        string;
  sku:         string;
  category:    string;
  stock:       number;
  unitCost:    number;
  uom:         string;
  hasBom:      boolean;
  description: string;
  createdAt:   string;
}

export interface BomItem {
  bomItemID:  number;
  productID:  number;
  name:       string;
  quantity:   number;
  unit:       string;
  type:       'raw-material' | 'sub-assembly' | 'purchased-part';
  parentID?:  number;
  children?:  BomItem[];
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

  // ── Product API ────────────────────────────────────────────────────────────
  loadProducts(): void {
    this.isLoading.set(true);
    this.http.get<Product[]>(this.productUrl)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({ next: data => this.products.set(data) });
  }

  createProduct(req: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.productUrl, req).pipe(
      tap(created => this.products.update(list => [created, ...list]))
    );
  }

  updateProduct(id: number, req: Partial<CreateProductRequest>): Observable<Product> {
    return this.http.put<Product>(`${this.productUrl}/${id}`, req).pipe(
      tap(updated => this.products.update(list =>
        list.map(p => p.productID === id ? updated : p)
      ))
    );
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.productUrl}/${id}`).pipe(
      tap(() => this.products.update(list => list.filter(p => p.productID !== id)))
    );
  }

  // ── BOM API ────────────────────────────────────────────────────────────────
  loadBom(productId: number): void {
    this.http.get<BomItem[]>(`${this.bomUrl}/${productId}`)
      .subscribe({ next: data => this.boms.update(b => ({ ...b, [productId]: data })) });
  }

  addBomItem(req: CreateBomItemRequest): Observable<BomItem> {
    return this.http.post<BomItem>(this.bomUrl, req).pipe(
      tap(() => this.loadBom(req.productID))
    );
  }

  deleteBomItem(id: number, productId: number): Observable<void> {
    return this.http.delete<void>(`${this.bomUrl}/${id}`).pipe(
      tap(() => this.loadBom(productId))
    );
  }
}
