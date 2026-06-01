import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Frontend models — match component interfaces exactly ──────────────────────
export interface ComplianceReport {
  id:                 string;
  reportID?:          number;
  reportNumber:       string;
  title:              string;
  type:               'Quality' | 'Safety' | 'Environmental' | 'Production' | 'Supplier';
  status:             'Draft' | 'Under Review' | 'Approved' | 'Submitted' | 'Rejected';
  priority:           'Low' | 'Medium' | 'High' | 'Critical';
  period:             string;
  preparedBy:         string;
  reviewedBy:         string;
  submissionDeadline: string;
  submittedDate:      string;
  findings:           number;
  actions:            number;
  notes:              string;
}

export interface AuditLog {
  id:           string;
  logID?:       number;
  timestamp:    string;
  userId:       number;
  user:         string;
  userInitials: string;
  avatarColor:  string;
  module:       string;
  action:       string;
  detail:       string;
  severity:     'info' | 'warning' | 'error' | 'success';
  ipAddress:    string;
}

// ── Backend DTOs ──────────────────────────────────────────────────────────────
interface ReportDto {
  reportID:           number;
  reportNumber:       string;
  title:              string;
  type:               ComplianceReport['type'];
  status:             ComplianceReport['status'];
  priority:           ComplianceReport['priority'];
  period:             string;
  preparedBy:         string;
  reviewedBy?:        string;
  submissionDeadline: string;
  submittedDate?:     string;
  findings?:          number;
  actions?:           number;
  notes?:             string;
}

interface AuditLogDto {
  logID:      number;
  timestamp:  string;
  userId:     number;
  userName:   string;
  module:     string;
  action:     string;
  detail:     string;
  severity:   AuditLog['severity'];
  ipAddress:  string;
}

export interface CreateReportRequest {
  title:              string;
  type:               ComplianceReport['type'];
  priority:           ComplianceReport['priority'];
  period:             string;
  preparedBy:         string;
  reviewedBy?:        string;
  submissionDeadline: string;
  notes?:             string;
}

export interface UpdateReportStatusRequest {
  status: ComplianceReport['status'];
}

@Injectable({ providedIn: 'root' })
export class ComplianceService {
  private http       = inject(HttpClient);
  private reportUrl  = environment.api.compliance;
  private auditUrl   = environment.api.auditLogs;

  // ── State ──────────────────────────────────────────────────────────────────
  private _reports   = signal<ComplianceReport[]>([]);
  private _auditLogs = signal<AuditLog[]>([]);
  readonly reports   = this._reports.asReadonly();
  readonly auditLogs = this._auditLogs.asReadonly();
  isLoading          = signal(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  reportStats = computed(() => {
    const all   = this._reports();
    const today = new Date().toISOString().split('T')[0];
    return {
      total:    all.length,
      pending:  all.filter(r => ['Draft','Under Review'].includes(r.status)).length,
      approved: all.filter(r => r.status === 'Approved').length,
      overdue:  all.filter(r => !['Submitted','Rejected'].includes(r.status) && r.submissionDeadline < today).length,
      rejected: all.filter(r => r.status === 'Rejected').length,
    };
  });

  auditStats = computed(() => {
    const all = this._auditLogs();
    return {
      total:    all.length,
      errors:   all.filter(l => l.severity === 'error').length,
      warnings: all.filter(l => l.severity === 'warning').length,
      success:  all.filter(l => l.severity === 'success').length,
    };
  });

  // ── Report API ─────────────────────────────────────────────────────────────
  loadReports(): void {
    this.isLoading.set(true);
    this.http.get<ReportDto[]>(this.reportUrl)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({ next: dtos => this._reports.set(dtos.map(d => this.fromReportDto(d))) });
  }

  createReport(req: CreateReportRequest): Observable<ComplianceReport> {
    return this.http.post<ReportDto>(this.reportUrl, req).pipe(
      tap(dto => this._reports.update(list => [this.fromReportDto(dto), ...list]))
    ) as unknown as Observable<ComplianceReport>;
  }

  updateReport(id: string, req: Partial<CreateReportRequest>): Observable<ComplianceReport> {
    return this.http.put<ReportDto>(`${this.reportUrl}/${id}`, req).pipe(
      tap(dto => {
        const updated = this.fromReportDto(dto);
        this._reports.update(list => list.map(r => r.id === id ? updated : r));
      })
    ) as unknown as Observable<ComplianceReport>;
  }

  updateStatus(id: string, req: UpdateReportStatusRequest): Observable<ComplianceReport> {
    return this.http.put<ReportDto>(`${this.reportUrl}/${id}/status`, req).pipe(
      tap(dto => {
        const updated = this.fromReportDto(dto);
        this._reports.update(list => list.map(r => r.id === id ? updated : r));
      })
    ) as unknown as Observable<ComplianceReport>;
  }

  approveReport(id: string): Observable<ComplianceReport> {
    return this.http.put<ReportDto>(`${this.reportUrl}/${id}/approve`, {}).pipe(
      tap(dto => {
        const updated = this.fromReportDto(dto);
        this._reports.update(list => list.map(r => r.id === id ? updated : r));
      })
    ) as unknown as Observable<ComplianceReport>;
  }

  // ── Audit API ──────────────────────────────────────────────────────────────
  loadAuditLogs(params?: { module?: string; severity?: string; limit?: number }): void {
    let httpParams = new HttpParams();
    if (params?.module)   httpParams = httpParams.set('module', params.module);
    if (params?.severity) httpParams = httpParams.set('severity', params.severity);
    if (params?.limit)    httpParams = httpParams.set('limit', params.limit);
    this.http.get<AuditLogDto[]>(this.auditUrl, { params: httpParams })
      .subscribe({ next: dtos => this._auditLogs.set(dtos.map(d => this.fromAuditDto(d))) });
  }

  // ── DTO mappers ────────────────────────────────────────────────────────────
  private fromReportDto(dto: any): ComplianceReport {
    // Backend may serialize ReportID as reportID, ReportID etc.
    const rawId = dto.reportID ?? dto.ReportID ?? 0;

    // Parse findings/actions from Metrics JSON if not present as direct fields
    let findings = dto.findings ?? 0;
    let actions  = dto.actions  ?? 0;
    if (dto.metrics && typeof dto.metrics === 'string') {
      try {
        const m = JSON.parse(dto.metrics);
        findings = m.findings ?? findings;
        actions  = m.actions  ?? actions;
      } catch { /* ignore parse error */ }
    }

    return {
      id:                 rawId.toString(),
      reportID:           rawId,
      reportNumber:       dto.reportNumber ?? `CR-${rawId}`,
      title:              dto.title ?? '',
      type:               (dto.reportType ?? dto.type ?? 'Quality') as ComplianceReport['type'],
      status:             (dto.status ?? 'Draft') as ComplianceReport['status'],
      priority:           (dto.priority ?? 'Medium') as ComplianceReport['priority'],
      period:             dto.period ?? `${new Date().getFullYear()}`,
      preparedBy:         dto.preparedBy ?? dto.generatedBy ?? '',
      reviewedBy:         dto.reviewedBy ?? dto.approvedBy ?? '',
      submissionDeadline: dto.submissionDeadline?.split('T')[0] ?? '',
      submittedDate:      dto.submittedDate?.split('T')[0] ?? '',
      findings,
      actions,
      notes:              dto.notes ?? dto.scope ?? '',
    };
  }

  private fromAuditDto(dto: any): AuditLog {
    // Backend may serialize AuditID as auditID, logID, AuditID etc.
    const rawId    = dto.auditID ?? dto.logID ?? dto.AuditID ?? 0;
    const userName = dto.userName ?? dto.UserName ?? 'System';
    const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const palette  = ['#2563eb','#10b981','#f59e0b','#8b5cf6','#ef4444','#0ea5e9'];
    const userId   = dto.userId ?? dto.UserID ?? 0;
    return {
      id:           rawId.toString(),
      logID:        rawId,
      timestamp:    dto.timestamp ?? dto.Timestamp ?? new Date().toISOString(),
      userId:       userId,
      user:         userName,
      userInitials: initials,
      avatarColor:  palette[userId % palette.length],
      module:       dto.module ?? dto.entityType ?? dto.Module ?? '',
      action:       dto.action ?? dto.Action ?? '',
      detail:       dto.details ?? dto.detail ?? dto.Details ?? '',
      severity:     dto.severity ?? 'info',
      ipAddress:    dto.ipAddress ?? dto.IpAddress ?? '',
    };
  }
}
