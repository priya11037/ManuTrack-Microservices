import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private fb     = inject(FormBuilder);
  private snack  = inject(MatSnackBar);

  currentUser   = this.auth.currentUser;
  isLoading     = signal(false);
  showCurrent   = signal(false);
  showNew       = signal(false);
  showConfirm   = signal(false);
  successMsg    = signal('');

  form = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword:     ['', [Validators.required, Validators.minLength(8),
                           Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)]],
    confirmPassword: ['', Validators.required],
  }, { validators: this.passwordsMatch });

  private passwordsMatch(group: AbstractControl) {
    const np = group.get('newPassword')?.value;
    const cp = group.get('confirmPassword')?.value;
    return np && cp && np !== cp ? { mismatch: true } : null;
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { currentPassword, newPassword } = this.form.value;
    this.isLoading.set(true);

    this.auth.changePassword(currentPassword!, newPassword!).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMsg.set('Password changed successfully!');
        this.snack.open('Password updated. Please sign in with your new password.', '✕', {
          duration: 5000, panelClass: ['snack-success'],
        });
        // Log out and redirect to login so user signs in fresh
        setTimeout(() => {
          this.auth.logout();
        }, 2000);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Could not change password. Check your current password.';
        this.snack.open(msg, '✕', { duration: 5000, panelClass: ['snack-error'] });
      },
    });
  }

  get np() { return this.form.get('newPassword'); }
  get cp() { return this.form.get('currentPassword'); }
  get cnf() { return this.form.get('confirmPassword'); }
}
