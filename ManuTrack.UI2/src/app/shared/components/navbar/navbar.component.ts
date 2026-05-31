import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatIconModule, MatButtonModule, MatMenuModule,
    MatTooltipModule, MatBadgeModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  private auth    = inject(AuthService);
  private router  = inject(Router);
  notifService    = inject(NotificationService);

  searchQuery = signal('');

  currentUser = this.auth.currentUser;
  userRole    = this.auth.userRole;

  // Unread count scoped to logged-in role
  unreadCount = computed(() => this.notifService.unreadForRole(this.userRole()));

  // Latest 5 notifications for dropdown preview
  previewNotifs = computed(() =>
    this.notifService.forRole(this.userRole()).slice(0, 5)
  );

  get userInitials(): string {
    const name = this.currentUser()?.name ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  onNotifClick(n: AppNotification): void {
    this.notifService.markRead(n.id);
    if (n.link) this.router.navigateByUrl(n.link);
  }

  markAllRead(): void {
    const role = this.userRole();
    if (role) this.notifService.markAllRead(role);
  }

  logout(): void {
    this.auth.logout();
  }
}
