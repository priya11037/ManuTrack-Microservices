import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isLoading    = signal(false);
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);
  activeSlide  = signal(0);
  demoExpanded = signal(false);

  private slideInterval: ReturnType<typeof setInterval> | null = null;

  // ── Demo role cards ────────────────────────────────────────────────────────
  demoRoles = [
    { role: 'Admin',             name: 'John Smith',    email: 'john.smith@manutrack.com',   icon: 'admin_panel_settings', color: '#2563eb', userId: '1' },
    { role: 'ProductionPlanner', name: 'Sarah Lee',     email: 'sarah.lee@manutrack.com',    icon: 'assignment',           color: '#10b981', userId: '2' },
    { role: 'ShopFloorOperator', name: 'Mike Johnson',  email: 'mike.j@manutrack.com',       icon: 'precision_manufacturing',color:'#f59e0b', userId: '3' },
    { role: 'QualityInspector',  name: 'Emily Clark',   email: 'emily.c@manutrack.com',      icon: 'verified',             color: '#8b5cf6', userId: '4' },
    { role: 'InventoryManager',  name: 'Robert Chen',   email: 'robert.c@manutrack.com',     icon: 'inventory_2',          color: '#ef4444', userId: '5' },
    { role: 'ComplianceOfficer', name: 'Linda Brown',   email: 'linda.b@manutrack.com',      icon: 'policy',               color: '#0ea5e9', userId: '6' },
  ];

  quickLogin(demo: typeof this.demoRoles[0]): void {
    // Use real backend login so we get a valid JWT token
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(demo.email, 'Admin@1234!').subscribe({
      next: () => {
        this.isLoading.set(false);
        const dest = this.authService.mustChangePassword() ? '/change-password' : '/app/dashboard';
        this.router.navigate([dest]);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set(
          `Could not auto-login as ${demo.name}. Please use the form above with password Admin@1234!`
        );
      },
    });
  }

  slides = [
    {
      icon: 'assignment',
      title: 'Smart Work Order Management',
      desc: 'Create, schedule and track production work orders in real-time across all shop floors.',
      color: '#2563eb',
    },
    {
      icon: 'inventory_2',
      title: 'Live Inventory Tracking',
      desc: 'Monitor raw materials and finished goods with instant stock alerts and reconciliation.',
      color: '#10b981',
    },
    {
      icon: 'verified',
      title: 'Quality & Compliance',
      desc: 'Automated inspection workflows, defect logging, and regulatory report generation.',
      color: '#f59e0b',
    },
    {
      icon: 'analytics',
      title: 'Production Analytics',
      desc: 'KPI dashboards with yield rate, defect rate, and on-time completion metrics.',
      color: '#8b5cf6',
    },
  ];

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  ngOnInit() {
    this.slideInterval = setInterval(() => {
      this.activeSlide.update((s) => (s + 1) % this.slides.length);
    }, 3500);
  }

  ngOnDestroy() {
    if (this.slideInterval) clearInterval(this.slideInterval);
  }

  setSlide(index: number) {
    this.activeSlide.set(index);
  }

  togglePasswordVisibility() {
    this.showPassword.update((v) => !v);
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login(email!, password!).subscribe({
      next: () => {
        this.isLoading.set(false);
        const dest = this.authService.mustChangePassword() ? '/change-password' : '/app/dashboard';
        this.router.navigate([dest]);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Invalid email or password. Please try again.');
        } else if (err.status === 403) {
          this.errorMessage.set('Your account has been disabled. Contact your administrator.');
        } else {
          this.errorMessage.set('Something went wrong. Please try again later.');
        }
        this.snackBar.open(this.errorMessage()!, 'Dismiss', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }
}
