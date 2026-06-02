import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'change-password',
    loadComponent: () =>
      import('./features/auth/change-password/change-password.component').then((m) => m.ChangePasswordComponent),
    canActivate: [authGuard],
  },
  {
    path: 'app',
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/task-console/task-console.component').then((m) => m.TaskConsoleComponent),
        canActivate: [roleGuard],
        data: { roles: ['ShopFloorOperator'] },
      },
      {
        path: 'work-orders',
        loadComponent: () =>
          import('./features/work-orders/work-orders.component').then((m) => m.WorkOrdersComponent),
        canActivate: [roleGuard],
        data: { roles: ['Admin', 'ProductionPlanner'] },
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/products.component').then((m) => m.ProductsComponent),
        canActivate: [roleGuard],
        data: { roles: ['ProductionPlanner'] },
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/inventory/inventory.component').then((m) => m.InventoryComponent),
        canActivate: [roleGuard],
        data: { roles: ['InventoryManager'] },
        children: [
          {
            path: 'stock',
            loadComponent: () =>
              import('./features/inventory/stock/stock-dashboard.component').then((m) => m.StockDashboardComponent),
          },
          {
            path: 'purchase-orders',
            loadComponent: () =>
              import('./features/inventory/purchase-orders/purchase-orders.component').then((m) => m.PurchaseOrdersComponent),
          },
          { path: '', redirectTo: 'stock', pathMatch: 'full' },
        ],
      },
      {
        path: 'quality',
        loadComponent: () =>
          import('./features/quality/quality.component').then((m) => m.QualityComponent),
        canActivate: [roleGuard],
        data: { roles: ['QualityInspector'] },
        children: [
          {
            path: 'inspections',
            loadComponent: () =>
              import('./features/quality/inspections/inspection-queue.component').then((m) => m.InspectionQueueComponent),
          },
          {
            path: 'defects',
            loadComponent: () =>
              import('./features/quality/defects/defect-log.component').then((m) => m.DefectLogComponent),
          },
          { path: '', redirectTo: 'inspections', pathMatch: 'full' },
        ],
      },
      {
        path: 'compliance',
        loadComponent: () =>
          import('./features/compliance/compliance.component').then((m) => m.ComplianceComponent),
        canActivate: [roleGuard],
        data: { roles: ['ComplianceOfficer'] },
        children: [
          {
            path: 'reports',
            loadComponent: () =>
              import('./features/compliance/reports/compliance-reports.component').then((m) => m.ComplianceReportsComponent),
          },
          {
            path: 'audit-trail',
            loadComponent: () =>
              import('./features/compliance/audit-trail/audit-trail.component').then((m) => m.AuditTrailComponent),
          },
          { path: '', redirectTo: 'reports', pathMatch: 'full' },
        ],
      },
      {
        path: 'schedule',
        loadComponent: () =>
          import('./features/schedule/schedule.component').then((m) => m.ScheduleComponent),
        canActivate: [roleGuard],
        data: { roles: ['Admin', 'ProductionPlanner'] },
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/analytics/analytics.component').then((m) => m.AnalyticsComponent),
        canActivate: [roleGuard],
        data: { roles: ['ProductionPlanner', 'QualityInspector', 'InventoryManager', 'ComplianceOfficer'] },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then((m) => m.NotificationsComponent),
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./features/admin/admin.component').then((m) => m.AdminComponent),
        canActivate: [roleGuard],
        data: { roles: ['Admin'] },
        children: [
          {
            path: 'users',
            loadComponent: () =>
              import('./features/admin/users/user-management.component').then(
                (m) => m.UserManagementComponent
              ),
          },
          {
            path: 'suppliers',
            loadComponent: () =>
              import('./features/admin/suppliers/suppliers.component').then(
                (m) => m.SuppliersComponent
              ),
          },
          {
            path: 'audit-logs',
            loadComponent: () =>
              import('./features/admin/audit-logs/audit-log-viewer.component').then(
                (m) => m.AuditLogViewerComponent
              ),
          },
          { path: '', redirectTo: 'users', pathMatch: 'full' },
        ],
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
        canActivate: [authGuard],
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
