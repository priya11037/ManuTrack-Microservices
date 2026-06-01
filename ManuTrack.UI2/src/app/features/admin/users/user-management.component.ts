import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserService } from '../../../core/services/user.service';

// ── Model ─────────────────────────────────────────────────────────────────────
export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive' | 'Pending';
  lastActive: string;
  createdAt: string;
  avatarColor: string;
  inviteToken?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit {
  private fb      = inject(FormBuilder);
  private snack   = inject(MatSnackBar);
  readonly usrSvc = inject(UserService);

  // ── State ──────────────────────────────────────────────────────────────────

  drawerOpen      = signal(false);
  drawerMode      = signal<'add' | 'edit'>('add');
  selectedUser    = signal<AppUser | null>(null);
  deleteConfirmId = signal<string | null>(null);
  searchTerm      = signal('');
  roleFilter      = signal('all');
  inviteSentFor   = signal<string | null>(null);

  roles = [
    'Admin',
    'ProductionPlanner',
    'ShopFloorOperator',
    'QualityInspector',
    'InventoryManager',
    'ComplianceOfficer',
  ];

  // ── Data from UserService (single source of truth) ────────────────────────
  get users()     { return this.usrSvc.users; }
  get isLoading() { return this.usrSvc.isLoading; }

  // ── Computed (UI filters — stay local) ────────────────────────────────────
  filteredUsers = computed(() => {
    const q    = this.searchTerm().toLowerCase().trim();
    const role = this.roleFilter();
    return this.usrSvc.users().filter(u => {
      const matchQ    = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = role === 'all' || u.role === role;
      return matchQ && matchRole;
    });
  });

  stats = computed(() => {
    const all = this.usrSvc.users();
    return {
      total:    all.length,
      active:   all.filter(u => u.status === 'Active').length,
      inactive: all.filter(u => u.status === 'Inactive').length,
      pending:  0, // Pending comes from invite flow — tracked separately
    };
  });

  // ── Form (no password — users set their own via invite link) ──────────────
  userForm = this.fb.group({
    name:   ['', [Validators.required, Validators.minLength(2)]],
    email:  ['', [Validators.required, Validators.email]],
    role:   ['', Validators.required],
    status: ['Active'],
  });

  ngOnInit(): void {
    this.usrSvc.loadAll();
  }

  // ── Drawer ─────────────────────────────────────────────────────────────────
  openAddDrawer(): void {
    this.drawerMode.set('add');
    this.selectedUser.set(null);
    this.inviteSentFor.set(null);
    this.userForm.reset({ status: 'Active' });
    this.drawerOpen.set(true);
  }

  openEditDrawer(user: AppUser): void {
    this.drawerMode.set('edit');
    this.selectedUser.set(user);
    this.inviteSentFor.set(null);
    this.userForm.patchValue({ name: user.name, email: user.email, role: user.role, status: user.status });
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedUser.set(null);
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  saveUser(): void {
    if (this.userForm.invalid) { this.userForm.markAllAsTouched(); return; }
    const v = this.userForm.value;

    if (this.drawerMode() === 'add') {
      // Registers user — backend sends invite email
      this.usrSvc.register({
        name:            v.name!,
        email:           v.email!,
        role:            v.role!,
        password:        'Temp@1234!',   // Backend will require user to change via invite link
        confirmPassword: 'Temp@1234!',
        phone:           '0000000000',   // TODO: add phone field to form
      }).subscribe({
        next: () => {
          this.inviteSentFor.set(v.email!);
          this.toast('Invitation sent to ' + v.email, 'success');
        },
      });
      return; // keep drawer open to show invite confirmation
    } else {
      const user = this.selectedUser()!;
      const uid  = +user.id;

      // 1. Update profile fields (name, email, role) via PUT /auth/users/{id}
      this.usrSvc.updateUser(uid, {
        name:  v.name  ?? undefined,
        email: v.email ?? undefined,
        role:  v.role  ?? undefined,
      }).subscribe({
        next: () => {
          // 2. Also update active status if it changed
          const newStatus = v.status as 'Active' | 'Inactive';
          if (newStatus === 'Active'   && user.status !== 'Active')
            this.usrSvc.activate(uid).subscribe();
          if (newStatus === 'Inactive' && user.status === 'Active')
            this.usrSvc.deactivate(uid).subscribe();

          this.toast('User updated successfully', 'success');
          this.closeDrawer();
        },
        error: () => this.toast('Failed to update user', 'warn'),
      });
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  toggleStatus(user: AppUser): void {
    if (user.status === 'Active') {
      this.usrSvc.deactivate(+user.id).subscribe({
        next: () => this.toast('User deactivated', 'info'),
      });
    } else {
      this.usrSvc.activate(+user.id).subscribe({
        next: () => this.toast('User activated', 'info'),
      });
    }
  }

  resendInvite(user: AppUser): void {
    this.toast('Invitation resent to ' + user.email, 'info');
    // TODO: call backend resend-invite endpoint when available
  }

  confirmDelete(id: string): void { this.deleteConfirmId.set(id); }
  cancelDelete():            void { this.deleteConfirmId.set(null); }

  deleteUser(id: string): void {
    this.usrSvc.deleteUser(+id).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.toast('User deleted', 'warn');
      },
      error: () => this.toast('Failed to delete user', 'warn'),
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getRoleMeta(role: string): { label: string; cls: string } {
    const map: Record<string, { label: string; cls: string }> = {
      'Admin':             { label: 'Admin',          cls: 'role-admin'      },
      'ProductionPlanner': { label: 'Prod. Planner',  cls: 'role-planner'    },
      'ShopFloorOperator': { label: 'Shop Floor',     cls: 'role-operator'   },
      'QualityInspector':  { label: 'QA Inspector',   cls: 'role-quality'    },
      'InventoryManager':  { label: 'Inventory Mgr',  cls: 'role-inventory'  },
      'ComplianceOfficer': { label: 'Compliance',     cls: 'role-compliance' },
    };
    return map[role] ?? { label: role, cls: 'role-default' };
  }

  private pickColor(): string {
    const palette = ['#2563eb','#10b981','#f59e0b','#8b5cf6','#ef4444','#0ea5e9','#ec4899','#6366f1','#14b8a6','#a855f7'];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  private toast(msg: string, type: 'success' | 'warn' | 'info'): void {
    this.snack.open(msg, '✕', { duration: 3000, panelClass: [`snack-${type}`] });
  }
}
