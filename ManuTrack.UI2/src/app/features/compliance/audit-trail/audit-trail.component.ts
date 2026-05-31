import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ComplianceService, AuditLog } from '../../../core/services/compliance.service';

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  userInitials: string;
  avatarColor: string;
  module: string;
  action: string;
  detail: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  ipAddress: string;
}

@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [CommonModule, TitleCasePipe, MatIconModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './audit-trail.component.html',
  styleUrl: './audit-trail.component.scss',
})
export class AuditTrailComponent implements OnInit {
  private snack = inject(MatSnackBar);
  readonly compSvc = inject(ComplianceService);

  searchTerm     = signal('');
  moduleFilter   = signal('all');
  severityFilter = signal('all');
  dateFilter     = signal('all');
  expandedId     = signal<string | null>(null);

  modules    = ['Users', 'WorkOrders', 'Quality', 'Inventory', 'Compliance', 'Auth', 'Reports'];
  severities = ['info', 'warning', 'error', 'success'];
  dateRanges = ['Today', 'Last 7 Days', 'Last 30 Days', 'All Time'];

  get entries() { return this.compSvc.auditLogs; }

  filtered = computed(() => {
    const q   = this.searchTerm().toLowerCase().trim();
    const mod = this.moduleFilter();
    const sev = this.severityFilter();
    return this.compSvc.auditLogs().filter(e => {
      const user   = (e as any).user ?? (e as any).userName ?? '';
      const action = (e as any).action ?? '';
      const detail = (e as any).detail ?? '';
      const module = (e as any).module ?? '';
      const matchQ   = !q || action.toLowerCase().includes(q) || user.toLowerCase().includes(q) || detail.toLowerCase().includes(q) || module.toLowerCase().includes(q);
      const matchMod = mod === 'all' || module === mod;
      const matchSev = sev === 'all' || e.severity === sev;
      return matchQ && matchMod && matchSev;
    });
  });

  get stats() { return this.compSvc.auditStats; }

  toggleExpand(id: string): void {
    this.expandedId.update(c => c === id ? null : id);
  }

  exportCSV(): void {
    const headers = ['Timestamp', 'User', 'Module', 'Action', 'Detail', 'Severity', 'IP Address'];
    const rows = this.compSvc.auditLogs().map(e => {
      const user   = (e as any).user ?? (e as any).userName ?? '';
      const module = (e as any).module ?? '';
      const action = (e as any).action ?? '';
      const detail = (e as any).detail ?? '';
      return [e.timestamp, user, module, action, `"${detail}"`, e.severity, e.ipAddress].join(',');
    });
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    this.snack.open('Audit trail exported', '✕', { duration: 2500, panelClass: ['snack-success'] });
  }

  private readonly _severityMap = {
    info:    { color: '#2563eb', bg: 'rgba(37,99,235,0.08)',  icon: 'info',         dot: '#2563eb' },
    success: { color: '#059669', bg: 'rgba(5,150,105,0.08)',  icon: 'check_circle', dot: '#059669' },
    warning: { color: '#d97706', bg: 'rgba(217,119,6,0.08)', icon: 'warning',      dot: '#d97706' },
    error:   { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', icon: 'error',        dot: '#dc2626' },
  } as const;

  // Typed overload for template use with typed entries
  severityMeta(s: AuditEntry['severity']) {
    return this._severityMap[s];
  }

  // String overload for @for loops where type narrows to string
  getSev(s: string) {
    return this._severityMap[s as AuditEntry['severity']] ?? this._severityMap['info'];
  }

  ngOnInit(): void { this.compSvc.loadAuditLogs(); }
}
