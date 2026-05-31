import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {
  tabs = [
    { label: 'User Management', icon: 'manage_accounts', route: 'users' },
    { label: 'Audit Log Viewer', icon: 'history', route: 'audit-logs' },
  ];
}
