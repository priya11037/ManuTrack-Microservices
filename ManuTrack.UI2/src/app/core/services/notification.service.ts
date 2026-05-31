import { Injectable, signal, computed } from '@angular/core';

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

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED: Omit<AppNotification, 'id'>[] = [
  // Admin notifications
  {
    title: 'New user invitation accepted',
    message: 'Mike Johnson has set up his password and activated his account.',
    type: 'success', module: 'Users', read: false,
    timestamp: new Date(Date.now() - 5 * 60_000),
    link: '/app/admin/users', forRoles: ['Admin'],
  },
  {
    title: 'Login failure spike detected',
    message: '5 consecutive failed login attempts from unknown@external.com in the last hour.',
    type: 'error', module: 'Auth', read: false,
    timestamp: new Date(Date.now() - 22 * 60_000),
    link: '/app/admin/audit-logs', forRoles: ['Admin'],
  },
  {
    title: 'System: 2 users inactive for 30+ days',
    message: 'Tom Wilson and Nina Patel have not logged in for over 30 days. Consider deactivating.',
    type: 'warning', module: 'Users', read: false,
    timestamp: new Date(Date.now() - 2 * 3600_000),
    link: '/app/admin/users', forRoles: ['Admin'],
  },
  {
    title: 'Pending invitation expiring soon',
    message: 'Nina Patel\'s invite link expires in 24 hours. Resend if needed.',
    type: 'warning', module: 'Users', read: true,
    timestamp: new Date(Date.now() - 5 * 3600_000),
    link: '/app/admin/users', forRoles: ['Admin'],
  },

  // Production Planner notifications
  {
    title: 'WO-0001 is overdue',
    message: 'Shaft Assembly — due 2025-05-30. Currently 64% complete on Line A.',
    type: 'error', module: 'WorkOrders', read: false,
    timestamp: new Date(Date.now() - 10 * 60_000),
    link: '/app/work-orders', forRoles: ['ProductionPlanner'],
  },
  {
    title: 'WO-0004 flagged as critical',
    message: 'Control Valve — 45/100 units produced. Due tomorrow (May 29).',
    type: 'warning', module: 'WorkOrders', read: false,
    timestamp: new Date(Date.now() - 35 * 60_000),
    link: '/app/work-orders', forRoles: ['ProductionPlanner'],
  },
  {
    title: 'WO-0003 completed',
    message: 'Hydraulic Pump — 10/10 units completed. QC passed and ready to ship.',
    type: 'success', module: 'WorkOrders', read: false,
    timestamp: new Date(Date.now() - 3 * 3600_000),
    link: '/app/work-orders', forRoles: ['ProductionPlanner'],
  },
  {
    title: 'Line B on hold — WO-0005',
    message: 'Mike Johnson flagged WO-0005: Waiting for steel plate stock from Inventory.',
    type: 'warning', module: 'WorkOrders', read: true,
    timestamp: new Date(Date.now() - 6 * 3600_000),
    link: '/app/work-orders', forRoles: ['ProductionPlanner'],
  },
  {
    title: 'Schedule conflict detected',
    message: 'Line A has 2 overlapping work orders on Jun 5. Review the schedule.',
    type: 'warning', module: 'Schedule', read: true,
    timestamp: new Date(Date.now() - 12 * 3600_000),
    link: '/app/schedule', forRoles: ['ProductionPlanner'],
  },

  // Shop Floor Operator notifications
  {
    title: 'New task assigned: WO-0002',
    message: 'Gear Box Unit — 20 units. Starts Jun 2 on Line A. Priority: Medium.',
    type: 'info', module: 'WorkOrders', read: false,
    timestamp: new Date(Date.now() - 15 * 60_000),
    link: '/app/tasks', forRoles: ['ShopFloorOperator'],
  },
  {
    title: 'WO-0001 progress reminder',
    message: 'Shaft Assembly is due today. Currently at 64%. 18 more units needed.',
    type: 'warning', module: 'WorkOrders', read: false,
    timestamp: new Date(Date.now() - 45 * 60_000),
    link: '/app/tasks', forRoles: ['ShopFloorOperator'],
  },
  {
    title: 'Flag acknowledged: WO-0005',
    message: 'Your issue flag on WO-0005 has been acknowledged by Sarah Lee (Planner).',
    type: 'success', module: 'WorkOrders', read: true,
    timestamp: new Date(Date.now() - 4 * 3600_000),
    link: '/app/tasks', forRoles: ['ShopFloorOperator'],
  },

  // Quality Inspector notifications
  {
    title: 'INS-1002 assigned — urgent',
    message: 'Control Valve inspection assigned. Due: May 29. Priority: Critical.',
    type: 'warning', module: 'Quality', read: false,
    timestamp: new Date(Date.now() - 20 * 60_000),
    link: '/app/quality/inspections', forRoles: ['QualityInspector'],
  },
  {
    title: 'INS-1003 failed — defects pending',
    message: 'Hydraulic Pump inspection failed. 3 defects logged, 2 open. Log remaining defects.',
    type: 'error', module: 'Quality', read: false,
    timestamp: new Date(Date.now() - 2 * 3600_000),
    link: '/app/quality/defects', forRoles: ['QualityInspector'],
  },
  {
    title: 'DEF-0005 critical defect logged',
    message: 'Weld porosity found on Control Valve. Unit scrapped. Root cause: Process Deviation.',
    type: 'error', module: 'Quality', read: false,
    timestamp: new Date(Date.now() - 4 * 3600_000),
    link: '/app/quality/defects', forRoles: ['QualityInspector'],
  },
  {
    title: 'INS-1001 passed — Shaft Assembly',
    message: 'All 50 units passed dimensional inspection. Ready for dispatch.',
    type: 'success', module: 'Quality', read: true,
    timestamp: new Date(Date.now() - 8 * 3600_000),
    link: '/app/quality/inspections', forRoles: ['QualityInspector'],
  },

  // Inventory Manager notifications
  {
    title: '⚠️ Steel Plate 6mm critically low',
    message: 'Current stock: 45kg. Minimum: 100kg. WO-0005 is on hold waiting for this item.',
    type: 'error', module: 'Inventory', read: false,
    timestamp: new Date(Date.now() - 8 * 60_000),
    link: '/app/inventory/stock', forRoles: ['InventoryManager'],
  },
  {
    title: 'Hydraulic Seal Kit below minimum',
    message: 'Current: 28 pcs. Minimum: 40 pcs. PO-0002 submitted — ETA Jun 7.',
    type: 'warning', module: 'Inventory', read: false,
    timestamp: new Date(Date.now() - 1 * 3600_000),
    link: '/app/inventory/stock', forRoles: ['InventoryManager'],
  },
  {
    title: 'PO-0001 approved by management',
    message: 'Steel Plate 6mm — 300kg from SteelCo Ltd. Expected delivery: Jun 4.',
    type: 'success', module: 'Inventory', read: false,
    timestamp: new Date(Date.now() - 3 * 3600_000),
    link: '/app/inventory/purchase-orders', forRoles: ['InventoryManager'],
  },
  {
    title: 'PO-0006 received — Steel Rod 12mm',
    message: '500 meters received from SteelCo Ltd. Stocked in Warehouse A.',
    type: 'success', module: 'Inventory', read: true,
    timestamp: new Date(Date.now() - 24 * 3600_000),
    link: '/app/inventory/purchase-orders', forRoles: ['InventoryManager'],
  },
  {
    title: 'Welding Wire 0.8mm low',
    message: 'Current: 8 rolls. Minimum: 10 rolls. Raise a PO if not done.',
    type: 'warning', module: 'Inventory', read: true,
    timestamp: new Date(Date.now() - 36 * 3600_000),
    link: '/app/inventory/stock', forRoles: ['InventoryManager'],
  },

  // Compliance Officer notifications
  {
    title: 'CR-0089 overdue — Safety Report',
    message: 'May 2025 Safety Incident Report is approved but not submitted. Deadline: Jun 5.',
    type: 'error', module: 'Compliance', read: false,
    timestamp: new Date(Date.now() - 30 * 60_000),
    link: '/app/compliance/reports', forRoles: ['ComplianceOfficer'],
  },
  {
    title: 'CR-0090 sent for your review',
    message: 'Environmental Impact Assessment H1 2025 — prepared by Linda Brown. Please approve.',
    type: 'info', module: 'Compliance', read: false,
    timestamp: new Date(Date.now() - 90 * 60_000),
    link: '/app/compliance/reports', forRoles: ['ComplianceOfficer'],
  },
  {
    title: 'CR-0088 successfully submitted',
    message: 'Q2 2025 Quality Compliance Review submitted to regulatory authority on May 30.',
    type: 'success', module: 'Compliance', read: false,
    timestamp: new Date(Date.now() - 5 * 3600_000),
    link: '/app/compliance/reports', forRoles: ['ComplianceOfficer'],
  },
  {
    title: 'CR-0087 rejected — action required',
    message: 'ISO 9001 Compliance Audit rejected. 3 clauses need additional evidence. Resubmit by Jun 15.',
    type: 'error', module: 'Compliance', read: true,
    timestamp: new Date(Date.now() - 2 * 24 * 3600_000),
    link: '/app/compliance/reports', forRoles: ['ComplianceOfficer'],
  },
  {
    title: '6 audit events logged today',
    message: '5 info, 1 warning event in the system audit trail. No critical errors.',
    type: 'info', module: 'System', read: true,
    timestamp: new Date(Date.now() - 10 * 3600_000),
    link: '/app/compliance/audit-trail', forRoles: ['ComplianceOfficer'],
  },
];

// ── Service ───────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class NotificationService {

  private _notifications = signal<AppNotification[]>(
    SEED.map((n, i) => ({ ...n, id: `notif-${i + 1}` }))
  );

  // ── Public read signals ───────────────────────────────────────────────────
  readonly all          = this._notifications.asReadonly();
  readonly unreadCount  = computed(() => this._notifications().filter(n => !n.read).length);

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
