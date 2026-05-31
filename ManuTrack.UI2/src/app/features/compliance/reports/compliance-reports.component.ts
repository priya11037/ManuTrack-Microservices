import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ComplianceService, ComplianceReport as SvcReport, CreateReportRequest } from '../../../core/services/compliance.service';

export interface ComplianceReport {
  id: string;
  reportNumber: string;
  title: string;
  type: 'Quality' | 'Safety' | 'Environmental' | 'Production' | 'Supplier';
  status: 'Draft' | 'Under Review' | 'Approved' | 'Submitted' | 'Rejected';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  period: string;
  preparedBy: string;
  reviewedBy: string;
  submissionDeadline: string;
  submittedDate: string;
  findings: number;
  actions: number;
  notes: string;
}

@Component({
  selector: 'app-compliance-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './compliance-reports.component.html',
  styleUrl: './compliance-reports.component.scss',
})
export class ComplianceReportsComponent implements OnInit {
  private snack = inject(MatSnackBar);
  private fb    = inject(FormBuilder);
  readonly compSvc = inject(ComplianceService);

  // ── UI State ─────────────────────────────────────────────────────────────
  drawerOpen      = signal(false);
  drawerMode      = signal<'add' | 'edit'>('add');
  selectedReport  = signal<ComplianceReport | null>(null);
  expandedId      = signal<string | null>(null);
  searchTerm      = signal('');
  typeFilter      = signal('all');
  statusFilter    = signal('all');

  types      = ['Quality', 'Safety', 'Environmental', 'Production', 'Supplier'] as ComplianceReport['type'][];
  statuses   = ['Draft', 'Under Review', 'Approved', 'Submitted', 'Rejected'] as ComplianceReport['status'][];
  priorities = ['Low', 'Medium', 'High', 'Critical'] as ComplianceReport['priority'][];
  preparers  = ['Linda Brown', 'Robert Chen', 'Emily Clark', 'Amy Zhang'];
  reviewers  = ['Robert Chen', 'Linda Brown', 'James Carter'];

  // ── Data ─────────────────────────────────────────────────────────────────
  get reports() { return this.compSvc.reports; }

  // ── Computed ──────────────────────────────────────────────────────────────
  filtered = computed(() => {
    const q  = this.searchTerm().toLowerCase().trim();
    const tp = this.typeFilter();
    const st = this.statusFilter();
    return this.compSvc.reports().filter(r => {
      const matchQ  = !q || r.reportNumber.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.preparedBy.toLowerCase().includes(q);
      const matchTp = tp === 'all' || r.type === tp;
      const matchSt = st === 'all' || r.status === st;
      return matchQ && matchTp && matchSt;
    });
  });

  get stats() { return this.compSvc.reportStats; }

  // ── Form ─────────────────────────────────────────────────────────────────
  reportForm = this.fb.group({
    title:              ['', [Validators.required, Validators.minLength(5)]],
    type:               ['', Validators.required],
    priority:           ['Medium', Validators.required],
    period:             ['', Validators.required],
    preparedBy:         ['', Validators.required],
    reviewedBy:         [''],
    submissionDeadline: ['', Validators.required],
    notes:              [''],
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  openAddDrawer(): void {
    this.drawerMode.set('add');
    this.selectedReport.set(null);
    this.reportForm.reset({ priority: 'Medium' });
    this.drawerOpen.set(true);
  }

  openEditDrawer(r: ComplianceReport, ev: Event): void {
    ev.stopPropagation();
    this.drawerMode.set('edit');
    this.selectedReport.set(r);
    this.reportForm.patchValue(r);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void { this.drawerOpen.set(false); this.selectedReport.set(null); }

  saveReport(): void {
    if (this.reportForm.invalid) { this.reportForm.markAllAsTouched(); return; }
    const v = this.reportForm.value;
    if (this.drawerMode() === 'add') {
      const req: CreateReportRequest = {
        title:              v.title!,
        type:               v.type as SvcReport['type'],
        priority:           v.priority as SvcReport['priority'],
        period:             v.period!,
        preparedBy:         v.preparedBy!,
        reviewedBy:         v.reviewedBy || undefined,
        submissionDeadline: v.submissionDeadline!,
        notes:              v.notes || undefined,
      };
      this.compSvc.createReport(req).subscribe({
        next: (created) => { this.toast(`${created.reportNumber} created`, 'success'); this.closeDrawer(); }
      });
    } else {
      const report = this.selectedReport()!;
      const id = (report as any).reportID ?? +(report as any).id;
      const req: Partial<CreateReportRequest> = {
        title:              v.title!,
        type:               v.type as SvcReport['type'],
        priority:           v.priority as SvcReport['priority'],
        period:             v.period!,
        preparedBy:         v.preparedBy!,
        reviewedBy:         v.reviewedBy || undefined,
        submissionDeadline: v.submissionDeadline!,
        notes:              v.notes || undefined,
      };
      this.compSvc.updateReport(id, req).subscribe({
        next: () => { this.toast('Report updated', 'success'); this.closeDrawer(); }
      });
    }
  }

  advanceStatus(r: ComplianceReport, ev: Event): void {
    ev.stopPropagation();
    const flow: Record<string, ComplianceReport['status']> = {
      Draft: 'Under Review', 'Under Review': 'Approved', Approved: 'Submitted',
    };
    const next = flow[r.status];
    if (!next) return;
    const id = (r as any).reportID ?? +(r as any).id;
    this.compSvc.updateStatus(id, { status: next }).subscribe({
      next: () => this.toast(`${r.reportNumber} → ${next}`, 'success')
    });
  }

  downloadReport(r: ComplianceReport, ev: Event): void {
    ev.stopPropagation();
    this.toast(`Downloading ${r.reportNumber}.pdf…`, 'info');
  }

  toggleExpand(id: string, ev: Event): void {
    ev.stopPropagation();
    this.expandedId.update(c => c === id ? null : id);
  }

  isOverdue(r: ComplianceReport): boolean {
    return !['Submitted','Rejected'].includes(r.status) && r.submissionDeadline < new Date().toISOString().split('T')[0];
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  typeMeta(t: ComplianceReport['type']) {
    return {
      Quality:       { color: '#2563eb', bg: 'rgba(37,99,235,0.10)',  icon: 'verified'          },
      Safety:        { color: '#dc2626', bg: 'rgba(220,38,38,0.10)',  icon: 'health_and_safety' },
      Environmental: { color: '#059669', bg: 'rgba(5,150,105,0.10)', icon: 'eco'               },
      Production:    { color: '#7c3aed', bg: 'rgba(124,58,237,0.10)',icon: 'precision_manufacturing' },
      Supplier:      { color: '#d97706', bg: 'rgba(217,119,6,0.10)', icon: 'local_shipping'    },
    }[t];
  }

  statusMeta(s: ComplianceReport['status']) {
    return {
      Draft:        { color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
      'Under Review':{ color: '#d97706', bg: 'rgba(217,119,6,0.10)' },
      Approved:     { color: '#2563eb', bg: 'rgba(37,99,235,0.10)'  },
      Submitted:    { color: '#059669', bg: 'rgba(5,150,105,0.10)'  },
      Rejected:     { color: '#dc2626', bg: 'rgba(220,38,38,0.10)'  },
    }[s];
  }

  priorityMeta(p: ComplianceReport['priority']) {
    return {
      Low:      '#6b7280', Medium: '#2563eb',
      High:     '#d97706', Critical: '#dc2626',
    }[p];
  }

  nextStatusLabel(s: ComplianceReport['status']): string {
    const map: Partial<Record<ComplianceReport['status'], string>> = {
      Draft: 'Send for Review', 'Under Review': 'Approve', Approved: 'Mark Submitted',
    };
    return map[s] ?? '';
  }

  private toast(msg: string, type: 'success' | 'warn' | 'info'): void {
    this.snack.open(msg, '✕', { duration: 3000, panelClass: [`snack-${type}`] });
  }

  ngOnInit(): void { this.compSvc.loadReports(); }
}
