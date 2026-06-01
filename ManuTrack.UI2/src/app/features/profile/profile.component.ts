import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private auth  = inject(AuthService);
  private fb    = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private http  = inject(HttpClient);

  currentUser = this.auth.currentUser;
  isLoading   = signal(false);
  isEditing   = signal(false);

  // Role display labels
  readonly roleLabels: Record<string, string> = {
    Admin:             'System Administrator',
    ProductionPlanner: 'Production Planner',
    ShopFloorOperator: 'Shop Floor Operator',
    QualityInspector:  'Quality Inspector',
    InventoryManager:  'Inventory Manager',
    ComplianceOfficer: 'Compliance Officer',
  };

  readonly roleColors: Record<string, string> = {
    Admin:             '#2563eb',
    ProductionPlanner: '#10b981',
    ShopFloorOperator: '#f59e0b',
    QualityInspector:  '#8b5cf6',
    InventoryManager:  '#ef4444',
    ComplianceOfficer: '#0ea5e9',
  };

  initials = computed(() => {
    const name = this.currentUser()?.name ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  });

  roleLabel = computed(() => this.roleLabels[this.currentUser()?.role ?? ''] ?? this.currentUser()?.role ?? '');
  roleColor = computed(() => this.roleColors[this.currentUser()?.role ?? ''] ?? '#6b7280');

  profileForm = this.fb.group({
    name:  ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^\+?[0-9]{10,15}$/)]],
  });

  ngOnInit(): void {
    const u = this.currentUser();
    if (u) {
      this.profileForm.patchValue({ name: u.name, email: u.email });
    }
  }

  startEditing(): void {
    const u = this.currentUser();
    if (u) this.profileForm.patchValue({ name: u.name, email: u.email });
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
    this.profileForm.reset();
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    const v = this.profileForm.value;
    this.isLoading.set(true);

    this.http.put<any>(`${environment.api.auth}/profile`, {
      name:  v.name  || undefined,
      email: v.email || undefined,
      phone: v.phone || undefined,
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.isEditing.set(false);
        // Update the current user in AuthService
        const user = this.currentUser();
        if (user && res?.data) {
          const updated = { ...user, name: res.data.name ?? user.name, email: res.data.email ?? user.email };
          localStorage.setItem('user', JSON.stringify(updated));
          // Force reload via page to update all computed signals
          window.location.reload();
        }
        this.snack.open('Profile updated successfully', '✕', { duration: 3000, panelClass: ['snack-success'] });
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Failed to update profile.';
        this.snack.open(msg, '✕', { duration: 4000, panelClass: ['snack-error'] });
      },
    });
  }
}
