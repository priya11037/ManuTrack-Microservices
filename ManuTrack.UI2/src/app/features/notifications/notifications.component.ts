import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService, AppNotification } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, TitleCasePipe, MatIconModule, MatTooltipModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent implements OnInit {
  notifService = inject(NotificationService);
  private auth = inject(AuthService);
  private router = inject(Router);

  // ── Filters ───────────────────────────────────────────────────────────────
  readFilter   = signal<'all' | 'unread'>('all');
  moduleFilter = signal<string>('all');
  typeFilter   = signal<string>('all');

  modules = ['WorkOrders', 'Quality', 'Inventory', 'Compliance', 'Users', 'System', 'Auth', 'Schedule'];
  types   = ['info', 'warning', 'error', 'success'];

  // Backend already filters by userId — use all() directly
  filtered = computed(() => {
    const rf = this.readFilter();
    const mf = this.moduleFilter();
    const tf = this.typeFilter();

    return this.notifService.all().filter(n => {
      const matchRead   = rf === 'all' || !n.read;
      const matchModule = mf === 'all' || n.module === mf;
      const matchType   = tf === 'all' || n.type === tf;
      return matchRead && matchModule && matchType;
    });
  });

  stats = computed(() => {
    const all = this.notifService.all();
    return {
      total:    all.length,
      unread:   all.filter(n => !n.read).length,
      errors:   all.filter(n => n.type === 'error').length,
      warnings: all.filter(n => n.type === 'warning').length,
    };
  });

  ngOnInit(): void {
    // Load from backend if not already loaded by navbar
    if (this.notifService.all().length === 0) {
      const userId = this.auth.currentUser()?.userId;
      if (userId) this.notifService.loadForUser(userId);
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  onNotifClick(n: AppNotification): void {
    this.notifService.markRead(n.id);
    if (n.link) this.router.navigateByUrl(n.link);
  }

  markRead(n: AppNotification, ev: Event): void {
    ev.stopPropagation();
    this.notifService.markRead(n.id);
  }

  dismiss(n: AppNotification, ev: Event): void {
    ev.stopPropagation();
    this.notifService.dismiss(n.id);
  }

  markAllRead(): void {
    this.notifService.markAllRead('all'); // mark all loaded notifications read
  }
}
