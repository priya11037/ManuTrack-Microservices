import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ── Domain models ─────────────────────────────────────────────────────────────
export interface User {
  userId:             number;
  name:               string;
  email:              string;
  role:               'Admin' | 'ProductionPlanner' | 'ShopFloorOperator' | 'QualityInspector' | 'InventoryManager' | 'ComplianceOfficer';
  mustChangePassword?: boolean;
}

/**
 * Shape after responseInterceptor unwraps ApiResponse<T>.data:
 *   { token: string; user: User }
 */
export interface LoginResponse {
  token: string;
  user:  User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _currentUser = signal<User | null>(null);
  private _token       = signal<string | null>(null);

  readonly currentUser       = this._currentUser.asReadonly();
  readonly token             = this._token.asReadonly();
  readonly isAuthenticated   = computed(() => !!this._token());
  readonly userRole          = computed(() => this._currentUser()?.role ?? null);
  readonly mustChangePassword = computed(() => this._currentUser()?.mustChangePassword ?? false);

  constructor(private http: HttpClient, private router: Router) {
    this.loadFromStorage();
  }

  /**
   * POST /api/v1/auth/login
   * Backend returns ApiResponse<LoginResponse> → responseInterceptor unwraps to LoginResponse
   */
  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>(`${environment.api.auth}/login`, { email, password })
      .pipe(
        tap((res) => {
          this._token.set(res.token);
          this._currentUser.set(res.user);
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
        })
      );
  }

  changePassword(currentPassword: string, newPassword: string) {
    const userId = this._currentUser()?.userId;
    return this.http.put(
      `${environment.api.auth}/change-password`,
      { currentPassword, newPassword, confirmNewPassword: newPassword },
      { headers: { Authorization: `Bearer ${this._token()}` } }
    ).pipe(
      tap(() => {
        // Clear mustChangePassword flag locally after success
        const user = this._currentUser();
        if (user) this._currentUser.set({ ...user, mustChangePassword: false });
        localStorage.setItem('user', JSON.stringify({ ...user, mustChangePassword: false }));
      })
    );
  }

  logout(): void {
    this._token.set(null);
    this._currentUser.set(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  hasRole(roles: string[]): boolean {
    const role = this.userRole();
    return role ? roles.includes(role) : false;
  }

  private loadFromStorage(): void {
    const token = localStorage.getItem('token');
    const user  = localStorage.getItem('user');
    if (token && user) {
      this._token.set(token);
      this._currentUser.set(JSON.parse(user));
    }
  }
}
