import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Supplier {
  supplierID: number;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdDate?: string;
}

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './suppliers.component.html',
  styleUrl: './suppliers.component.scss',
})
export class SuppliersComponent implements OnInit {
  private http  = inject(HttpClient);
  private fb    = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  private url = (environment.api as any).suppliers ?? 'http://localhost:5000/api/v1/suppliers';

  // ── State ──────────────────────────────────────────────────────────────────
  suppliers       = signal<Supplier[]>([]);
  isLoading       = signal(false);
  drawerOpen      = signal(false);
  drawerMode      = signal<'add' | 'edit'>('add');
  selectedSupplier = signal<Supplier | null>(null);
  deleteConfirmId = signal<number | null>(null);
  searchTerm      = signal('');

  // ── Computed ───────────────────────────────────────────────────────────────
  filtered = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    return this.suppliers().filter(s =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.contactPerson ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q)
    );
  });

  activeCount   = computed(() => this.suppliers().filter(s => s.isActive).length);
  inactiveCount = computed(() => this.suppliers().filter(s => !s.isActive).length);

  // ── Form ───────────────────────────────────────────────────────────────────
  form = this.fb.group({
    name:          ['', [Validators.required, Validators.minLength(2)]],
    contactPerson: [''],
    phone:         [''],
    email:         ['', Validators.email],
    address:       [''],
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.http.get<any>(this.url).subscribe({
      next: res => {
        const data = res?.data ?? res;
        this.suppliers.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
      },
      error: () => { this.isLoading.set(false); this.toast('Failed to load suppliers', 'error'); }
    });
  }

  // ── Drawer ─────────────────────────────────────────────────────────────────
  openAdd(): void {
    this.drawerMode.set('add');
    this.selectedSupplier.set(null);
    this.form.reset();
    this.drawerOpen.set(true);
  }

  openEdit(s: Supplier, ev: Event): void {
    ev.stopPropagation();
    this.drawerMode.set('edit');
    this.selectedSupplier.set(s);
    this.form.patchValue(s);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void { this.drawerOpen.set(false); this.selectedSupplier.set(null); }

  // ── Save ───────────────────────────────────────────────────────────────────
  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;

    if (this.drawerMode() === 'add') {
      this.http.post<any>(this.url, v).subscribe({
        next: res => {
          const s = res?.data ?? res;
          this.suppliers.update(list => [s, ...list]);
          this.toast('Supplier added', 'success');
          this.closeDrawer();
        },
        error: () => this.toast('Failed to add supplier', 'error')
      });
    } else {
      const id = this.selectedSupplier()!.supplierID;
      this.http.put<any>(`${this.url}/${id}`, v).subscribe({
        next: res => {
          const updated = res?.data ?? res;
          this.suppliers.update(list => list.map(s => s.supplierID === id ? updated : s));
          this.toast('Supplier updated', 'success');
          this.closeDrawer();
        },
        error: () => this.toast('Failed to update supplier', 'error')
      });
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  confirmDelete(id: number, ev: Event): void { ev.stopPropagation(); this.deleteConfirmId.set(id); }
  cancelDelete(): void { this.deleteConfirmId.set(null); }

  doDelete(id: number): void {
    this.http.delete(`${this.url}/${id}`).subscribe({
      next: () => {
        this.suppliers.update(list => list.filter(s => s.supplierID !== id));
        this.deleteConfirmId.set(null);
        this.toast('Supplier deleted', 'success');
      },
      error: () => this.toast('Failed to delete supplier', 'error')
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private toast(msg: string, type: 'success' | 'error'): void {
    this.snack.open(msg, 'Dismiss', {
      duration: 3000,
      panelClass: type === 'success' ? ['snack-success'] : ['snack-error'],
    });
  }
}
