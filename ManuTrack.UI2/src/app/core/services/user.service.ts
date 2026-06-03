import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Frontend model — matches component's AppUser interface exactly ─────────────
export interface AppUser {
  id:          string;
  name:        string;
  email:       string;
  role:        string;
  status:      'Active' | 'Inactive' | 'Pending';
  lastActive:  string;
  createdAt:   string;
  avatarColor: string;
  inviteToken?: string;
  phone?:      string;
  // backend field retained for API calls
  userID?:     number;
  isActive?:   boolean;
}

// ── Backend DTO (matches C# AuthUserViewModel) ────────────────────────────────
interface UserDto {
  userID:   number;
  name:     string;
  email:    string;
  role:     string;
  phone:    string;
  isActive: boolean;
}

export interface RegisterRequest {
  name:            string;
  email:           string;
  password:        string;
  confirmPassword: string;
  role:            string;
  phone:           string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private url  = environment.api.auth;

  // ── State ──────────────────────────────────────────────────────────────────
  private _users    = signal<AppUser[]>([]);
  readonly users    = this._users.asReadonly();
  isLoading         = signal(false);
  error             = signal<string | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────
  stats = computed(() => {
    const all = this._users();
    return {
      total:    all.length,
      active:   all.filter(u => u.status === 'Active').length,
      inactive: all.filter(u => u.status === 'Inactive').length,
      pending:  all.filter(u => u.status === 'Pending').length,
    };
  });

  // ── API ───────────────────────────────────────────────────────────────────
  // Admin-only: full user list
  loadAll(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.http.get<UserDto[]>(`${this.url}/users`)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next:  dtos => this._users.set(dtos.map(d => this.fromDto(d))),
        error: err  => this.error.set(err.message),
      });
  }

  // All authenticated users: get names for a specific role (for dropdowns)
  loadByRole(role: string): void {
    this.http.get<any[]>(`${this.url}/users/by-role?role=${role}`)
      .subscribe({
        next: dtos => {
          // Merge into _users without duplicates
          const incoming = dtos.map(d => this.fromDto(d));
          this._users.update(existing => {
            const existingIds = new Set(existing.map(u => u.id));
            const newOnes = incoming.filter(u => !existingIds.has(u.id));
            return [...existing, ...newOnes];
          });
        },
        error: () => {} // silent fail — dropdowns will just be empty
      });
  }

  getById(id: number): Observable<AppUser> {
    return this.http.get<UserDto>(`${this.url}/users/${id}`) as unknown as Observable<AppUser>;
  }

  register(req: RegisterRequest): Observable<AppUser> {
    return this.http.post<UserDto>(`${this.url}/register`, req).pipe(
      tap(dto => this._users.update(list => [this.fromDto(dto), ...list]))
    ) as unknown as Observable<AppUser>;
  }

  updateUser(id: number, req: { name?: string; email?: string; role?: string; phone?: string }): Observable<AppUser> {
    return this.http.put<any>(`${this.url}/users/${id}`, req).pipe(
      tap(dto => {
        const updated = this.fromDto(dto);
        this._users.update(list => list.map(u => u.userID === id ? updated : u));
      })
    ) as unknown as Observable<AppUser>;
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/users/${id}`).pipe(
      tap(() => this._users.update(list => list.filter(u => u.userID !== id)))
    );
  }

  deactivate(id: number): Observable<void> {
    return this.http.put<void>(`${this.url}/users/${id}/deactivate`, {}).pipe(
      tap(() => this._users.update(list =>
        list.map(u => u.userID === id ? { ...u, status: 'Inactive' as const, isActive: false } : u)
      ))
    );
  }

  activate(id: number): Observable<void> {
    return this.http.put<void>(`${this.url}/users/${id}/activate`, {}).pipe(
      tap(() => this._users.update(list =>
        list.map(u => u.userID === id ? { ...u, status: 'Active' as const, isActive: true } : u)
      ))
    );
  }

  // ── Local remove helper ───────────────────────────────────────────────────
  removeLocalUser(id: string): void {
    this._users.update(list => list.filter(u => u.id !== id));
  }

  // ── DTO mapper — defensive with fallback field names ─────────────────────
  private fromDto(dto: any): AppUser {
    const rawId            = dto.userID ?? dto.UserID ?? dto.id ?? 0;
    const isActive         = dto.isActive ?? dto.IsActive ?? true;
    const mustChangePwd    = dto.mustChangePassword ?? dto.MustChangePassword ?? false;

    // Status tri-state:
    //   Pending  = account created, user has NOT yet changed temp password
    //   Active   = fully onboarded, password set
    //   Inactive = deactivated by Admin
    const status: AppUser['status'] = !isActive
      ? 'Inactive'
      : mustChangePwd
        ? 'Pending'
        : 'Active';

    return {
      id:          rawId.toString(),
      userID:      rawId,
      name:        dto.name ?? dto.Name ?? '',
      email:       dto.email ?? dto.Email ?? '',
      role:        dto.role ?? dto.Role ?? '',
      phone:       dto.phone ?? dto.Phone ?? '',
      status,
      isActive,
      lastActive:  mustChangePwd ? 'Never logged in' : 'Recently',
      createdAt:   new Date().toISOString().split('T')[0],
      avatarColor: this.pickColor(rawId),
    };
  }

  private pickColor(seed: number): string {
    const p = ['#2563eb','#10b981','#f59e0b','#8b5cf6','#ef4444','#0ea5e9','#ec4899','#6366f1','#14b8a6','#a855f7'];
    return p[seed % p.length];
  }
}
