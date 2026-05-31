import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  standalone: false
})
export class NavbarComponent implements OnInit {
  userName = '';
  userRole = '';
  unreadCount = 0;

  // Change password fields
  showChangePasswordModal = false;
  changePasswordForm!: FormGroup;
  changePasswordLoading = false;
  modalErrorMessage = '';
  modalErrorList: string[] = [];
  modalSuccessMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userName = this.authService.getName() || '';
    this.userRole = this.authService.getRole() || '';
    this.loadUnreadCount();
    this.initChangePasswordForm();
  }

  initChangePasswordForm(): void {
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      confirmNewPassword: ['', [Validators.required]]
    }, {
      validators: this.newPasswordMatchValidator
    });
  }

  newPasswordMatchValidator(g: FormGroup) {
    const newPassword = g.get('newPassword')?.value;
    const confirmNewPassword = g.get('confirmNewPassword')?.value;
    if (newPassword !== confirmNewPassword) {
      g.get('confirmNewPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  loadUnreadCount(): void {
    this.notificationService.getUnreadCount().pipe(
      timeout(4000),
      catchError(() => of({ success: false, data: 0, message: '', errors: [] }))
    ).subscribe(res => {
      if (res.success) this.unreadCount = res.data ?? 0;
    });
  }

  openChangePassword(): void {
    this.changePasswordForm.reset({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    this.showChangePasswordModal = true;
    this.modalErrorMessage = '';
    this.modalErrorList = [];
    this.modalSuccessMessage = '';
  }

  closeChangePassword(): void {
    this.showChangePasswordModal = false;
  }

  submitChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    this.changePasswordLoading = true;
    this.modalErrorMessage = '';
    this.modalErrorList = [];
    this.modalSuccessMessage = '';

    this.authService.changePassword(this.changePasswordForm.value).subscribe({
      next: res => {
        this.changePasswordLoading = false;
        if (res.success) {
          this.modalSuccessMessage = 'Password changed successfully.';
          setTimeout(() => {
            this.closeChangePassword();
          }, 1500);
        } else {
          this.modalErrorMessage = res.message || 'Failed to change password.';
          if (res.errors && res.errors.length > 0) {
            this.modalErrorList = res.errors;
          }
        }
      },
      error: err => {
        this.changePasswordLoading = false;
        if (err?.error?.errors && err.error.errors.length > 0) {
          this.modalErrorList = err.error.errors;
          this.modalErrorMessage = err.error.message || 'One or more validation errors occurred.';
        } else {
          this.modalErrorMessage = err?.error?.message || 'Failed to change password. Please verify current password.';
        }
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

