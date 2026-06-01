import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule, Router } from '@angular/router';
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
    CommonModule, RouterLink, RouterModule, FormsModule,
    MatIconModule, MatButtonModule, MatMenuModule,
    MatTooltipModule, MatBadgeModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit {
  private auth    = inject(AuthService);
  private router  = inject(Router);
  notifService    = inject(NotificationService);

  searchQuery = signal('');

  currentUser = this.auth.currentUser;
  userRole    = this.auth.userRole;

  // Since backend returns notifications already filtered by userId,
  // forRole('all') returns everything loaded for this user
  unreadCount   = computed(() => this.notifService.all().filter(n => !n.read).length);
  previewNotifs = computed(() => this.notifService.all().slice(0, 5));

  get userInitials(): string {
    const name = this.currentUser()?.name ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  ngOnInit(): void {
    // Load notifications from backend when user is authenticated
    const userId = this.auth.currentUser()?.userId;
    if (userId) {
      this.notifService.loadForUser(userId);
    }
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
