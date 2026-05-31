import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AuthUserViewModel } from '../../../core/models/auth.model';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  standalone: false
})
export class UsersComponent implements OnInit {
  users: AuthUserViewModel[] = [];
  filteredUsers: AuthUserViewModel[] = [];
  searchTerm = '';
  selectedRole = '';
  loading = false;
  errorMessage = '';
  errorList: string[] = [];
  successMessage = '';
  showCreateForm = false;
  createLoading = false;

  roles = ['Admin', 'Planner', 'Operator', 'Inspector', 'InventoryManager', 'ComplianceOfficer'];

  userForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadUsers();
  }

  initForm(): void {
    this.userForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-Z\s]+$/)
      ]],
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100)
      ]],
      phone: ['', [
        Validators.required,
        Validators.pattern(/^\+?[0-9]{10,15}$/)
      ]],
      role: ['', [
        Validators.required
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    if (password !== confirmPassword) {
      g.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  loadUsers(): void {
    this.loading = true;
    this.authService.getAllUsers().subscribe({
      next: res => {
        this.loading = false;
        if (res.success) {
          this.users = res.data;
          this.applyFilter();
        } else {
          this.errorMessage = res.message;
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load users.';
      }
    });
  }

  applyFilter(): void {
    this.filteredUsers = this.users.filter(u => {
      const matchesSearch = !this.searchTerm ||
        u.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesRole = !this.selectedRole || u.role === this.selectedRole;
      return matchesSearch && matchesRole;
    });
  }

  openCreate(): void {
    this.userForm.reset({
      name: '',
      email: '',
      phone: '',
      role: '',
      password: '',
      confirmPassword: ''
    });
    this.showCreateForm = true;
    this.errorMessage = '';
    this.errorList = [];
  }

  createUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.createLoading = true;
    this.errorMessage = '';
    this.errorList = [];

    this.authService.register(this.userForm.value).subscribe({
      next: res => {
        this.createLoading = false;
        if (res.success) {
          this.successMessage = `User "${this.userForm.get('name')?.value}" created successfully.`;
          this.showCreateForm = false;
          this.loadUsers();
          setTimeout(() => this.successMessage = '', 4000);
        } else {
          this.errorMessage = res.message || 'Registration failed.';
          if (res.errors && res.errors.length > 0) {
            this.errorList = res.errors;
          }
        }
      },
      error: (err) => {
        this.createLoading = false;
        if (err?.error?.errors && err.error.errors.length > 0) {
          this.errorList = err.error.errors;
          this.errorMessage = err.error.message || 'One or more validation errors occurred.';
        } else {
          this.errorMessage = err?.error?.message || 'Failed to create user.';
        }
      }
    });
  }

  toggleStatus(user: AuthUserViewModel): void {
    const action = user.isActive
      ? this.authService.deactivateUser(user.userID)
      : this.authService.activateUser(user.userID);

    action.subscribe({
      next: res => {
        if (res.success) {
          user.isActive = !user.isActive;
          this.successMessage = `User ${user.isActive ? 'activated' : 'deactivated'} successfully.`;
          setTimeout(() => this.successMessage = '', 3000);
        } else {
          this.errorMessage = res.message;
        }
      },
      error: () => { this.errorMessage = 'Action failed.'; }
    });
  }

  getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      Admin: 'bg-danger', Planner: 'bg-primary', Operator: 'bg-success',
      Inspector: 'bg-warning text-dark', InventoryManager: 'bg-info text-dark',
      ComplianceOfficer: 'bg-secondary'
    };
    return map[role] || 'bg-dark';
  }
}

