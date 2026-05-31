import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

// ── Model ─────────────────────────────────────────────────────────────────────
export interface AuditEntry {
  id:        string;
  user:      string;
  userRole:  string;
  module:    string;
  action:    string;
  details:   string;
  severity:  'info' | 'warning' | 'error';
  timestamp: string;
  ipAddress: string;
  avatarColor: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-audit-log-viewer',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './audit-log-viewer.component.html',
  styleUrl: './audit-log-viewer.component.scss',
})
export class AuditLogViewerComponent implements OnInit {

  // ── Filters ────────────────────────────────────────────────────────────────
  searchTerm      = signal('');
  moduleFilter    = signal('all');
  severityFilter  = signal('all');
  dateFilter      = signal('today');
  expandedId      = signal<string | null>(null);

  modules   = ['Auth', 'WorkOrders', 'Inventory', 'Products', 'Quality', 'Compliance', 'Users', 'Reports'];
  severities = ['info', 'warning', 'error'];
  dateRanges = [
    { value: 'today',   label: 'Today'      },
    { value: 'week',    label: 'This Week'  },
    { value: 'month',   label: 'This Month' },
    { value: 'quarter', label: 'Quarter'    },
  ];

  // ── Mock Audit Data ────────────────────────────────────────────────────────
  logs = signal<AuditEntry[]>([
    { id: '1',  user: 'John Smith',   userRole: 'Admin',              module: 'Users',      action: 'CREATE_USER',         details: 'Created new user account for mike.j@manutrack.com with role ShopFloorOperator',                   severity: 'info',    timestamp: '2025-05-28 08:10:22', ipAddress: '192.168.1.10', avatarColor: '#2563eb' },
    { id: '2',  user: 'Sarah Lee',    userRole: 'ProductionPlanner',  module: 'WorkOrders', action: 'UPDATE_WORK_ORDER',   details: 'Updated Work Order WO-2841 status from "In Progress" to "Completed". Assigned to Team B.',          severity: 'info',    timestamp: '2025-05-28 07:55:14', ipAddress: '192.168.1.22', avatarColor: '#10b981' },
    { id: '3',  user: 'Sarah Lee',    userRole: 'ProductionPlanner',  module: 'Inventory',  action: 'UPDATE_STOCK',        details: 'Updated stock quantity for "Steel Rods (SKU-1001)" from 80 to 120 units.',                         severity: 'info',    timestamp: '2025-05-28 07:42:05', ipAddress: '192.168.1.22', avatarColor: '#10b981' },
    { id: '4',  user: 'John Smith',   userRole: 'Admin',              module: 'Users',      action: 'ROLE_CHANGE',         details: 'Changed role for tom.w@manutrack.com from ShopFloorOperator to QualityInspector.',                 severity: 'warning', timestamp: '2025-05-28 07:30:48', ipAddress: '192.168.1.10', avatarColor: '#2563eb' },
    { id: '5',  user: 'Emily Clark',  userRole: 'QualityInspector',   module: 'Quality',    action: 'APPROVE_INSPECTION',  details: 'Approved Inspection INS-4421 for Product Batch PB-887. Pass rate: 98.2%.',                         severity: 'info',    timestamp: '2025-05-28 07:10:33', ipAddress: '192.168.1.45', avatarColor: '#8b5cf6' },
    { id: '6',  user: 'Robert Chen',  userRole: 'InventoryManager',   module: 'Inventory',  action: 'LOW_STOCK_ALERT',     details: 'Stock for "Copper Wire (SKU-2040)" dropped below reorder level (45 < 100 units). Alert triggered.', severity: 'warning', timestamp: '2025-05-28 06:55:10', ipAddress: '192.168.1.33', avatarColor: '#ef4444' },
    { id: '7',  user: 'Robert Chen',  userRole: 'InventoryManager',   module: 'Reports',    action: 'GENERATE_REPORT',     details: 'Generated Compliance Report CR-88 (Monthly Q2 2025). Exported to PDF.',                            severity: 'info',    timestamp: '2025-05-28 06:45:20', ipAddress: '192.168.1.33', avatarColor: '#ef4444' },
    { id: '8',  user: 'System',       userRole: 'System',             module: 'Auth',       action: 'LOGIN_FAILED',        details: 'Failed login attempt for unknown@external.com. IP flagged after 3 consecutive failures.',           severity: 'error',   timestamp: '2025-05-28 06:20:05', ipAddress: '203.0.113.45', avatarColor: '#6b7280' },
    { id: '9',  user: 'Mike Johnson', userRole: 'ShopFloorOperator',  module: 'WorkOrders', action: 'START_TASK',          details: 'Started Task T-5540 on Work Order WO-2839. Machine: CNC-03.',                                     severity: 'info',    timestamp: '2025-05-27 16:32:11', ipAddress: '192.168.1.55', avatarColor: '#f59e0b' },
    { id: '10', user: 'Linda Brown',  userRole: 'ComplianceOfficer',  module: 'Compliance', action: 'SUBMIT_AUDIT',        details: 'Submitted Annual Compliance Audit ACR-2025-01 to regulatory body. Status: Pending review.',         severity: 'info',    timestamp: '2025-05-27 15:10:44', ipAddress: '192.168.1.66', avatarColor: '#0ea5e9' },
    { id: '11', user: 'John Smith',   userRole: 'Admin',              module: 'Users',      action: 'DEACTIVATE_USER',     details: 'Deactivated account for tom.w@manutrack.com. Reason: Extended leave of absence.',                  severity: 'warning', timestamp: '2025-05-27 14:05:30', ipAddress: '192.168.1.10', avatarColor: '#2563eb' },
    { id: '12', user: 'Amy Zhang',    userRole: 'QualityInspector',   module: 'Quality',    action: 'LOG_DEFECT',          details: 'Logged Defect DEF-203 on Product SKU-3310. Type: Surface Crack. Severity: Major.',                 severity: 'error',   timestamp: '2025-05-27 13:20:17', ipAddress: '192.168.1.77', avatarColor: '#ec4899' },
  ]);

  // ── Computed filtered list ─────────────────────────────────────────────────
  filteredLogs = computed(() => {
    const q        = this.searchTerm().toLowerCase().trim();
    const module   = this.moduleFilter();
    const severity = this.severityFilter();
    return this.logs().filter(l => {
      const matchQ   = !q || l.user.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.details.toLowerCase().includes(q);
      const matchMod = module === 'all' || l.module === module;
      const matchSev = severity === 'all' || l.severity === severity;
      return matchQ && matchMod && matchSev;
    });
  });

  stats = computed(() => {
    const all = this.logs();
    return {
      total:   all.length,
      info:    all.filter(l => l.severity === 'info').length,
      warning: all.filter(l => l.severity === 'warning').length,
      error:   all.filter(l => l.severity === 'error').length,
    };
  });

  ngOnInit(): void {}

  // ── Actions ────────────────────────────────────────────────────────────────
  toggleExpand(id: string): void {
    this.expandedId.update(v => v === id ? null : id);
  }

  exportCSV(): void {
    const rows = [
      ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Severity', 'Details', 'IP Address'],
      ...this.filteredLogs().map(l => [l.timestamp, l.user, l.userRole, l.module, l.action, l.severity, l.details, l.ipAddress]),
    ];
    const csv     = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob    = new Blob([csv], { type: 'text/csv' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getActionLabel(action: string): string {
    return action.replace(/_/g, ' ');
  }

  formatTimestamp(ts: string): { date: string; time: string } {
    const [date, time] = ts.split(' ');
    return { date, time };
  }
}
