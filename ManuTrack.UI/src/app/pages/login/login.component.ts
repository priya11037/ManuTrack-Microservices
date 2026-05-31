import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: false
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  errorMessage = '';
  errorList: string[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  login(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.errorList = [];
    this.loading = true;

    this.authService.login(this.loginForm.value).subscribe({
      next: res => {
        this.loading = false;
        if (res.success && res.data) {
          const role = res.data.role;
          const routes: Record<string, string> = {
            Admin: '/admin/users',
            Planner: '/planner/work-orders',
            Operator: '/operator/tasks',
            Inspector: '/inspector/inspections',
            InventoryManager: '/inventory/stock',
            ComplianceOfficer: '/compliance/audit-logs'
          };
          this.router.navigate([routes[role] || '/analytics']);
        } else {
          this.errorMessage = res.message || 'Login failed.';
          if (res.errors && res.errors.length > 0) {
            this.errorList = res.errors;
          }
        }
      },
      error: err => {
        this.loading = false;
        if (err.error?.errors && err.error.errors.length > 0) {
          this.errorList = err.error.errors;
          this.errorMessage = err.error.message || 'One or more validation errors occurred.';
        } else {
          this.errorMessage = err.error?.message || 'Login failed. Please try again.';
        }
      }
    });
  }
}

