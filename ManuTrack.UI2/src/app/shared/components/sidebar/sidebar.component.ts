import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/auth/auth.service';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  roles: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private auth = inject(AuthService);

  private allNavItems: NavItem[] = [
    // ── All roles ──────────────────────────────────────────────────────────
    { icon: 'dashboard',             label: 'Dashboard',   route: '/app/dashboard',      roles: ['all'] },
    { icon: 'notifications',         label: 'Alerts',      route: '/app/notifications',  roles: ['all'] },

    // ── Admin — system oversight only ──────────────────────────────────────
    { icon: 'admin_panel_settings',  label: 'Admin',       route: '/app/admin',          roles: ['Admin'] },
    { icon: 'assignment',            label: 'Work Orders', route: '/app/work-orders',    roles: ['Admin'] },  // read-only view

    // ── Production Planner ─────────────────────────────────────────────────
    { icon: 'assignment',            label: 'Work Orders', route: '/app/work-orders',    roles: ['ProductionPlanner'] },
    { icon: 'calendar_month',        label: 'Schedule',    route: '/app/schedule',       roles: ['ProductionPlanner'] },
    { icon: 'category',              label: 'Products',    route: '/app/products',       roles: ['ProductionPlanner'] },
    { icon: 'analytics',             label: 'Analytics',   route: '/app/analytics',      roles: ['ProductionPlanner', 'QualityInspector', 'InventoryManager', 'ComplianceOfficer'] },

    // ── Shop Floor Operator ────────────────────────────────────────────────
    { icon: 'task_alt',              label: 'My Tasks',    route: '/app/tasks',          roles: ['ShopFloorOperator'] },

    // ── Quality Inspector ─────────────────────────────────────────────────
    { icon: 'verified',              label: 'Quality',     route: '/app/quality',        roles: ['QualityInspector', 'ProductionPlanner', 'Admin'] },

    // ── Inventory Manager ─────────────────────────────────────────────────
    { icon: 'inventory_2',           label: 'Inventory',   route: '/app/inventory',      roles: ['InventoryManager'] },

    // ── Compliance Officer ────────────────────────────────────────────────
    { icon: 'policy',                label: 'Compliance',  route: '/app/compliance',     roles: ['ComplianceOfficer'] },
  ];

  navItems = computed(() => {
    const role = this.auth.userRole();
    return this.allNavItems.filter(item =>
      item.roles.includes('all') || (role ? item.roles.includes(role) : false)
    );
  });
}
