import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// ── Model ─────────────────────────────────────────────────────────────────────
export type NotifType   = 'info' | 'warning' | 'error' | 'success';
export type NotifModule = 'WorkOrders' | 'Quality' | 'Inventory' | 'Compliance' | 'Users' | 'System' | 'Auth' | 'Schedule';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotifType;
  module: NotifModule;
  read: boolean;
  timestamp: Date;
  link?: string;
  forRoles: string[];   // which roles receive this notification
}

// ── Service ───────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);

  private _notifications = signal<AppNotification[]>([]);

  // ── Public read signals ───────────────────────────────────────────────────
  readonly all          = this._notifications.asReadonly();
  readonly unreadCount  = computed(() => this._notifications().filter(n => !n.read).length);

  // ── Load from backend ─────────────────────────────────────────────────────
  loadForUser(userId: number): void {
    // Use /my endpoint — works for ALL roles (not Admin-only)
    this.http.get<any[]>(`${environment.api.notifications}/my`)
      .subscribe({
        next: (data) => this._notifications.set(data.map(n => this.fromDto(n))),
        error: () => {} // silent fail — notifications not critical
      });
  }

  private fromDto(dto: any): AppNotification {
    return {
      id:        dto.notificationID?.toString() ?? dto.id,
      title:     dto.title,
      message:   dto.message,
      type:      this.mapType(dto.category, dto.priority),
      module:    dto.category as NotifModule,
      read:      dto.status === 'Read' || dto.readDate != null,
      timestamp: new Date(dto.createdDate ?? dto.timestamp),
      link:      dto.link,
      forRoles:  ['all'], // backend notifications are user-specific by userId
    };
  }

  private mapType(category: string, priority: string): NotifType {
    if (priority === 'High' || priority === 'Urgent') return 'warning';
    if (category === 'Auth' || priority === 'Critical') return 'error';
    return 'info';
  }

  // ── Role-filtered helpers ─────────────────────────────────────────────────
  forRole(role: string | null): AppNotification[] {
    if (!role) return [];
    return this._notifications().filter(n => n.forRoles.includes(role));
  }

  unreadForRole(role: string | null): number {
    return this.forRole(role).filter(n => !n.read).length;
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  markRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }

  markAllRead(role: string): void {
    this._notifications.update(list =>
      list.map(n => n.forRoles.includes(role) ? { ...n, read: true } : n)
    );
  }

  dismiss(id: string): void {
    this._notifications.update(list => list.filter(n => n.id !== id));
  }

  add(notif: Omit<AppNotification, 'id' | 'read' | 'timestamp'>): void {
    const newNotif: AppNotification = {
      ...notif,
      id:        `notif-${Date.now()}`,
      read:      false,
      timestamp: new Date(),
    };
    this._notifications.update(list => [newNotif, ...list]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  timeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  typeIcon(type: string): string {
    const m: Record<string, string> = { info: 'info', warning: 'warning', error: 'error', success: 'check_circle' };
    return m[type] ?? 'info';
  }

  typeColor(type: string): string {
    const m: Record<string, string> = { info: '#2563eb', warning: '#d97706', error: '#dc2626', success: '#059669' };
    return m[type] ?? '#2563eb';
  }

  typeBg(type: string): string {
    const m: Record<string, string> = { info: 'rgba(37,99,235,0.1)', warning: 'rgba(217,119,6,0.1)', error: 'rgba(220,38,38,0.1)', success: 'rgba(5,150,105,0.1)' };
    return m[type] ?? 'rgba(37,99,235,0.1)';
  }
}
