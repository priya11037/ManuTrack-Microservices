import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ComplianceService, AuditLog } from '../../../core/services/compliance.service';

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
export class AuditLogViewerComponent implements OnInit, OnDestroy {
  private compSvc      = inject(ComplianceService);
  private pollSub?:    Subscription;
  private readonly POLL_INTERVAL_MS = 15_000; // refresh every 15 seconds

  // Live indicator
  isLive     = signal(true);
  lastRefresh = signal(new Date());

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

  // ── Data from ComplianceService (mapped to AuditEntry for template compatibility) ──
  /** Returns all audit logs mapped to AuditEntry so the HTML template binds correctly */
  get logs() {
    // Wrap as a signal-compatible getter: return a function that returns AuditEntry[]
    return () => this.compSvc.auditLogs().map((l: AuditLog) => this.toEntry(l));
  }

  // ── Computed filtered list ─────────────────────────────────────────────────
  filteredLogs = computed(() => {
    const q        = this.searchTerm().toLowerCase().trim();
    const module   = this.moduleFilter();
    const severity = this.severityFilter();
    return this.compSvc.auditLogs().map((l: AuditLog) => this.toEntry(l)).filter(l => {
      const matchQ   = !q || l.user.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.details.toLowerCase().includes(q);
      const matchMod = module === 'all' || l.module === module;
      const matchSev = severity === 'all' || l.severity === severity;
      return matchQ && matchMod && matchSev;
    });
  });

  stats = computed(() => {
    const all = this.compSvc.auditLogs();
    return {
      total:   all.length,
      info:    all.filter((l: AuditLog) => l.severity === 'info').length,
      warning: all.filter((l: AuditLog) => l.severity === 'warning').length,
      error:   all.filter((l: AuditLog) => l.severity === 'error').length,
    };
  });

  ngOnInit(): void {
    this.loadLogs();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadLogs(): void {
    this.compSvc.loadAuditLogs();
    this.lastRefresh.set(new Date());
  }

  manualRefresh(): void {
    this.loadLogs();
  }

  toggleLive(): void {
    this.isLive.update(v => !v);
    if (this.isLive()) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  timeSinceRefresh(): string {
    const diff = Math.round((Date.now() - this.lastRefresh().getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  }

  private startPolling(): void {
    this.stopPolling(); // clear any existing
    this.pollSub = interval(this.POLL_INTERVAL_MS).subscribe(() => {
      if (this.isLive()) this.loadLogs();
    });
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  // ── Map AuditLog → AuditEntry (for template compatibility) ─────────────────
  private toEntry(l: AuditLog): AuditEntry {
    return {
      id:          l.id,
      user:        l.user,
      userRole:    '',           // not provided by backend; omitted
      module:      l.module,
      action:      l.action,
      details:     l.detail ?? '',
      severity:    l.severity === 'success' ? 'info' : l.severity,
      timestamp:   l.timestamp?.replace('T', ' ').slice(0, 19) ?? '',
      ipAddress:   l.ipAddress,
      avatarColor: l.avatarColor,
    };
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  toggleExpand(id: string): void {
    this.expandedId.update(v => v === id ? null : id);
  }

  exportCSV(): void {
    const rows = [
      ['Timestamp', 'User', 'Module', 'Action', 'Severity', 'Details', 'IP Address'],
      ...this.filteredLogs().map(l => [l.timestamp, l.user, l.module, l.action, l.severity, l.details, l.ipAddress]),
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
