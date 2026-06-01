import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth   = inject(AuthService);
  const snack  = inject(MatSnackBar);

  // Endpoints that should fail silently (non-critical background calls)
  const silentUrls = ['/notifications', '/analytics'];
  const isSilent   = silentUrls.some(u => req.url.includes(u));

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Silent fail for non-critical endpoints — don't show toast
      if (isSilent) return throwError(() => err);

      // Extract best error message from backend ApiResponse wrapper
      const backendMessage: string =
        err.error?.message     ||
        err.error?.errors?.[0] ||
        err.message            ||
        'An unexpected error occurred.';

      switch (err.status) {
        case 401:
          snack.open('Session expired. Please sign in again.', 'Dismiss', {
            duration: 5000, panelClass: ['snack-error'],
          });
          auth.logout();
          break;

        case 403:
          snack.open('Access denied. You don\'t have permission for this action.', 'Dismiss', {
            duration: 4000, panelClass: ['snack-error'],
          });
          router.navigate(['/app/dashboard']);
          break;

        case 404:
          snack.open('Resource not found.', 'Dismiss', {
            duration: 3000, panelClass: ['snack-warn'],
          });
          break;

        case 400:
          snack.open(backendMessage, 'Dismiss', {
            duration: 5000, panelClass: ['snack-warn'],
          });
          break;

        case 0:
          snack.open('Cannot connect to the server. Check your connection.', 'Dismiss', {
            duration: 6000, panelClass: ['snack-error'],
          });
          break;

        default:
          if (err.status >= 500) {
            snack.open('Server error. Please try again later.', 'Dismiss', {
              duration: 5000, panelClass: ['snack-error'],
            });
          }
          break;
      }

      return throwError(() => err);
    })
  );
};
