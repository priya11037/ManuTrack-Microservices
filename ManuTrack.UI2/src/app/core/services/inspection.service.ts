import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Frontend models — match component interfaces exactly ──────────────────────
export interface Inspection {
  id:            string;
  inspectionID?: number;
  insNumber:     string;
  woRef:         string;
  product:       string;
  sku:           string;
  quantity:      number;
  inspectedQty:  number;
  status:        'Pending' | 'In Review' | 'Passed' | 'Failed';
  result:        'Pending' | 'In Review' | 'Passed' | 'Failed'; // alias for status
  priority:      'Low' | 'Medium' | 'High' | 'Critical';
  inspector:     string;
  scheduledDate: string;
  completedDate: string;
  notes:         string;
  avatarColor:   string;
  defectsLogged: number;
}

export interface Defect {
  id:             string;
  defectID?:      number;
  defectNumber:   string;
  insRef:         string;
  woRef:          string;
  product:        string;
  severity:       'Minor' | 'Major' | 'Critical';
  defectType:     string;
  defectiveUnits: number;
  rootCause:      string;
  action:         'Rework' | 'Scrap' | 'Accept' | 'Hold';  // = actionTaken from backend
  status:         'Open' | 'In Progress' | 'Resolved';
  reportedBy:     string;
  reportedDate:   string;
  notes:          string;
}

// ── Backend DTOs ──────────────────────────────────────────────────────────────
interface InspectionDto {
  inspectionID:  number;
  workOrderID:   number;
  productName:   string;
  sku?:          string;
  quantity:      number;
  inspectedQty?: number;
  result:        Inspection['result'];
  priority:      Inspection['priority'];
  inspectorName: string;
  scheduledDate: string;
  completedDate?: string;
  notes?:        string;
}

interface DefectDto {
  defectID:       number;
  inspectionID:   number;
  workOrderID:    number;
  productName:    string;
  severity:       Defect['severity'];
  defectType:     string;
  defectiveUnits: number;
  rootCause:      string;
  actionTaken:    Defect['action'];
  status:         Defect['status'];
  reportedBy:     string;
  reportedDate:   string;
  notes?:         string;
}

export interface CreateInspectionRequest {
  workOrderID:   number;
  quantity:      number;
  priority:      Inspection['priority'];
  inspectorName: string;
  scheduledDate: string;
  notes?:        string;
}

export interface CreateDefectRequest {
  inspectionID:   number;
  workOrderID:    number;
  severity:       Defect['severity'];
  defectType:     string;
  defectiveUnits: number;
  rootCause:      string;
  actionTaken:    Defect['action'];
  reportedBy:     string;
  notes?:         string;
}

@Injectable({ providedIn: 'root' })
export class InspectionService {
  private http          = inject(HttpClient);
  private inspectionUrl = environment.api.inspections;
  private defectUrl     = environment.api.defects;

  // ── State ──────────────────────────────────────────────────────────────────
  private _inspections = signal<Inspection[]>([]);
  private _defects     = signal<Defect[]>([]);
  readonly inspections = this._inspections.asReadonly();
  readonly defects     = this._defects.asReadonly();
  isLoading            = signal(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  inspectionStats = computed(() => {
    const all    = this._inspections();
    const passed = all.filter(i => i.status === 'Passed').length;
    const total  = all.filter(i => i.status === 'Passed' || i.status === 'Failed').length;
    return {
      pending:  all.filter(i => i.status === 'Pending').length,
      inReview: all.filter(i => i.status === 'In Review').length,
      passed:   all.filter(i => i.status === 'Passed').length,
      failed:   all.filter(i => i.status === 'Failed').length,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
    };
  });

  defectStats = computed(() => {
    const all = this._defects();
    return {
      total:    all.length,
      open:     all.filter(d => d.status === 'Open').length,
      critical: all.filter(d => d.severity === 'Critical').length,
      resolved: all.filter(d => d.status === 'Resolved').length,
      scrapped: all.reduce((sum, d) => d.action === 'Scrap' ? sum + d.defectiveUnits : sum, 0),
    };
  });

  // ── Inspection API ─────────────────────────────────────────────────────────
  loadInspections(): void {
    this.isLoading.set(true);
    this.http.get<InspectionDto[]>(this.inspectionUrl)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({ next: dtos => this._inspections.set(dtos.map(d => this.fromInspDto(d))) });
  }

  createInspection(req: CreateInspectionRequest): Observable<Inspection> {
    return this.http.post<InspectionDto>(this.inspectionUrl, req).pipe(
      tap(dto => this._inspections.update(list => [this.fromInspDto(dto), ...list]))
    ) as unknown as Observable<Inspection>;
  }

  updateInspectionResult(id: number, result: Inspection['status']): Observable<Inspection> {
    return this.http.put<InspectionDto>(`${this.inspectionUrl}/${id}`, { result }).pipe(
      tap(dto => {
        const updated = this.fromInspDto(dto);
        this._inspections.update(list => list.map(i => i.inspectionID === id ? updated : i));
      })
    ) as unknown as Observable<Inspection>;
  }

  // ── Local remove helpers (for client-side delete without API) ─────────────
  removeLocalDefect(id: string): void {
    this._defects.update(list => list.filter(d => d.id !== id));
  }

  // ── Defect API ─────────────────────────────────────────────────────────────
  loadDefects(): void {
    this.http.get<DefectDto[]>(this.defectUrl)
      .subscribe({ next: dtos => this._defects.set(dtos.map(d => this.fromDefectDto(d))) });
  }

  createDefect(req: CreateDefectRequest): Observable<Defect> {
    return this.http.post<DefectDto>(this.defectUrl, req).pipe(
      tap(dto => this._defects.update(list => [this.fromDefectDto(dto), ...list]))
    ) as unknown as Observable<Defect>;
  }

  resolveDefect(id: number): Observable<Defect> {
    return this.http.put<DefectDto>(`${this.defectUrl}/${id}/resolve`, {}).pipe(
      tap(dto => {
        const updated = this.fromDefectDto(dto);
        this._defects.update(list => list.map(d => d.defectID === id ? updated : d));
      })
    ) as unknown as Observable<Defect>;
  }

  updateDefectStatus(id: number, status: Defect['status']): Observable<Defect> {
    return this.http.put<DefectDto>(`${this.defectUrl}/${id}/status`, { status }).pipe(
      tap(dto => {
        const updated = this.fromDefectDto(dto);
        this._defects.update(list => list.map(d => d.defectID === id ? updated : d));
      })
    ) as unknown as Observable<Defect>;
  }

  // ── DTO mappers — defensive with fallback field names ─────────────────────
  private fromInspDto(dto: any): Inspection {
    const palette   = ['#8b5cf6','#ec4899','#14b8a6','#0ea5e9','#f59e0b','#2563eb'];
    const inspID    = dto.inspectionID ?? dto.InspectionID ?? 0;
    const woID      = dto.workOrderID  ?? dto.WorkOrderID  ?? 0;
    const result    = dto.result ?? dto.status ?? dto.Result ?? 'Pending';
    return {
      id:            inspID.toString(),
      inspectionID:  inspID,
      insNumber:     `INS-${inspID.toString().padStart(4,'0')}`,
      woRef:         `WO-${woID.toString().padStart(4,'0')}`,
      product:       dto.productName ?? dto.ProductName ?? '',
      sku:           dto.sku ?? '',
      quantity:      dto.quantity ?? 0,
      inspectedQty:  dto.inspectedQty ?? dto.inspectedQuantity ?? 0,
      status:        result as Inspection['status'],
      result:        result as Inspection['status'],
      priority:      (dto.priority ?? dto.Priority ?? 'Medium') as Inspection['priority'],
      inspector:     dto.inspectorName ?? dto.inspectorID ?? '',
      scheduledDate: dto.scheduledDate?.split('T')[0] ?? dto.inspectionDate?.split('T')[0] ?? '',
      completedDate: dto.completedDate?.split('T')[0] ?? '',
      notes:         dto.notes ?? '',
      avatarColor:   palette[inspID % palette.length],
      defectsLogged: 0,
    };
  }

  private fromDefectDto(dto: any): Defect {
    const defectID = dto.defectID ?? dto.DefectID ?? 0;
    const inspID   = dto.inspectionID ?? dto.InspectionID ?? 0;
    const woID     = dto.workOrderID  ?? dto.WorkOrderID  ?? 0;
    return {
      id:             defectID.toString(),
      defectID:       defectID,
      defectNumber:   `DEF-${defectID.toString().padStart(4,'0')}`,
      insRef:         `INS-${inspID.toString().padStart(4,'0')}`,
      woRef:          `WO-${woID.toString().padStart(4,'0')}`,
      product:        dto.productName ?? dto.ProductName ?? '',
      severity:       dto.severity,
      defectType:     dto.defectType,
      defectiveUnits: dto.defectiveUnits,
      rootCause:      dto.rootCause,
      action:         dto.actionTaken,
      status:         dto.status,
      reportedBy:     dto.reportedBy,
      reportedDate:   dto.reportedDate?.split('T')[0] ?? '',
      notes:          dto.notes ?? '',
    };
  }
}
