import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Not logged in → go to login page
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  // Logged in but must change password first
  // Allow the change-password route through, block everything else
  if (auth.mustChangePassword()) {
    const isChangePwdRoute = route.routeConfig?.path === 'change-password';
    if (!isChangePwdRoute) {
      return router.createUrlTree(['/change-password']);
    }
  }

  return true;
};
