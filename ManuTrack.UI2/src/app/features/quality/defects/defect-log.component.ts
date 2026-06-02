import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InspectionService, CreateDefectRequest } from '../../../core/services/inspection.service';
import { WorkOrderService } from '../../../core/services/work-order.service';
import { UserService } from '../../../core/services/user.service';
import { ProductService } from '../../../core/services/product.service';

export interface Defect {
  id: string;
  defectNumber: string;
  insRef: string;
  woRef: string;
  product: string;
  severity: 'Minor' | 'Major' | 'Critical';
  defectType: string;
  defectiveUnits: number;
  rootCause: string;
  action: 'Rework' | 'Scrap' | 'Accept' | 'Hold';
  status: 'Open' | 'In Progress' | 'Resolved';
  reportedBy: string;
  reportedDate: string;
  notes: string;
}

@Component({
  selector: 'app-defect-log',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './defect-log.component.html',
  styleUrl: './defect-log.component.scss',
})
export class DefectLogComponent implements OnInit {
  private snack    = inject(MatSnackBar);
  private fb       = inject(FormBuilder);
  readonly inspSvc = inject(InspectionService);
  private woSvc    = inject(WorkOrderService);
  private usrSvc   = inject(UserService);
  private prodSvc  = inject(ProductService);

  // â”€â”€ UI State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  drawerOpen      = signal(false);
  drawerMode      = signal<'add' | 'edit'>('add');
  selectedDefect  = signal<Defect | null>(null);
  deleteConfirmId = signal<string | null>(null);
  searchTerm      = signal('');
  severityFilter  = signal('all');
  statusFilter    = signal('all');

  // â”€â”€ Options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  severities  = ['Minor', 'Major', 'Critical'] as Defect['severity'][];
  actions     = ['Rework', 'Scrap', 'Accept', 'Hold'] as Defect['action'][];
  statuses    = ['Open', 'In Progress', 'Resolved'] as Defect['status'][];
  defectTypes = ['Dimensional Error', 'Surface Defect', 'Material Defect', 'Assembly Error', 'Machining Error', 'Welding Defect', 'Coating Issue', 'Seal/Gasket Failure'];
  rootCauses  = ['Human Error', 'Machine Malfunction', 'Material Issue', 'Process Deviation', 'Tool Wear', 'Design Issue', 'Environmental Factor'];
  // Loaded from real APIs
  inspectors  = computed(() => this.usrSvc.users().filter(u => u.role === 'QualityInspector' && u.status === 'Active').map(u => u.name));
  insRefs     = computed(() => this.inspSvc.inspections().map(i => i.insNumber));
  woRefs      = computed(() => this.woSvc.workOrders().map(w => w.woNumber));
  products    = computed(() => this.prodSvc.products().map(p => p.name));

  // â”€â”€ Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  get defects() { return this.inspSvc.defects; }

  // â”€â”€ Filtered list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  filtered = computed(() => {
    const q  = this.searchTerm().toLowerCase().trim();
    const sv = this.severityFilter();
    const st = this.statusFilter();
    return this.inspSvc.defects().filter(d => {
      const defectNum  = (d as any).defectNumber ?? String((d as any).defectID ?? '');
      const productName = (d as any).product ?? (d as any).productName ?? '';
      const insRef     = (d as any).insRef ?? String((d as any).inspectionID ?? '');
      const woRef      = (d as any).woRef ?? String((d as any).workOrderID ?? '');
      const matchQ  = !q || defectNum.toLowerCase().includes(q) || productName.toLowerCase().includes(q) || insRef.toLowerCase().includes(q) || woRef.toLowerCase().includes(q);
      const matchSv = sv === 'all' || d.severity === sv;
      const matchSt = st === 'all' || d.status === st;
      return matchQ && matchSv && matchSt;
    });
  });

  get stats() { return this.inspSvc.defectStats; }

  // â”€â”€ Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  defectForm = this.fb.group({
    insRef:         ['', Validators.required],
    woRef:          ['', Validators.required],
    product:        ['', Validators.required],
    severity:       ['Major', Validators.required],
    defectType:     ['', Validators.required],
    defectiveUnits: [1, [Validators.required, Validators.min(1)]],
    rootCause:      ['', Validators.required],
    action:         ['Rework', Validators.required],
    status:         ['Open', Validators.required],
    reportedBy:     ['', Validators.required],
    notes:          [''],
  });

  // â”€â”€ Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  openAddDrawer(): void {
    this.drawerMode.set('add');
    this.selectedDefect.set(null);
    const today = new Date().toISOString().split('T')[0];
    this.defectForm.reset({ severity: 'Major', action: 'Rework', status: 'Open', defectiveUnits: 1 });
    this.drawerOpen.set(true);
  }

  openEditDrawer(d: Defect, ev: Event): void {
    ev.stopPropagation();
    this.drawerMode.set('edit');
    this.selectedDefect.set(d);
    this.defectForm.patchValue(d);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void { this.drawerOpen.set(false); this.selectedDefect.set(null); }

  saveDefect(): void {
    if (this.defectForm.invalid) { this.defectForm.markAllAsTouched(); return; }
    const v = this.defectForm.value;

    if (this.drawerMode() === 'add') {
      const req: CreateDefectRequest = {
        inspectionID:   parseInt(v.insRef?.replace(/\D/g, '') ?? '0', 10),
        workOrderID:    parseInt(v.woRef?.replace(/\D/g, '') ?? '0', 10),
        severity:       v.severity as Defect['severity'],
        defectType:     v.defectType!,
        defectiveUnits: v.defectiveUnits!,
        rootCause:      v.rootCause!,
        actionTaken:    v.action as Defect['action'],
        reportedBy:     v.reportedBy!,
        notes:          v.notes || undefined,
      };
      this.inspSvc.createDefect(req).subscribe({
        next: () => { this.toast('Defect logged', 'success'); this.closeDrawer(); }
      });
    } else {
      const defect = this.selectedDefect()!;
      const id = (defect as any).defectID ?? +(defect as any).id;
      this.inspSvc.updateDefectStatus(id, v.status as Defect['status']).subscribe({
        next: () => { this.toast('Defect updated', 'success'); this.closeDrawer(); }
      });
    }
  }

  // â”€â”€ Delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  confirmDelete(id: string): void { this.deleteConfirmId.set(id); }
  cancelDelete():             void { this.deleteConfirmId.set(null); }
  deleteDefect(id: string):   void {
    this.inspSvc.removeLocalDefect(id);
    this.deleteConfirmId.set(null);
    this.toast('Defect record removed', 'warn');
  }

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  severityMeta(s: Defect['severity']) {
    return {
      Minor:    { color: '#6b7280', bg: 'rgba(107,114,128,0.10)', cls: 'sv-minor'    },
      Major:    { color: '#d97706', bg: 'rgba(217,119,6,0.10)',   cls: 'sv-major'    },
      Critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.10)',   cls: 'sv-critical' },
    }[s];
  }

  statusMeta(s: Defect['status']) {
    return {
      'Open':        { color: '#dc2626', bg: 'rgba(220,38,38,0.10)'   },
      'In Progress': { color: '#d97706', bg: 'rgba(217,119,6,0.10)'   },
      'Resolved':    { color: '#059669', bg: 'rgba(5,150,105,0.10)'   },
    }[s];
  }

  actionMeta(a: Defect['action']) {
    return {
      Rework: '#2563eb', Scrap: '#dc2626', Accept: '#059669', Hold: '#d97706',
    }[a];
  }

  private toast(msg: string, type: 'success' | 'warn' | 'info'): void {
    this.snack.open(msg, 'âœ•', { duration: 3000, panelClass: [`snack-${type}`] });
  }

  ngOnInit(): void {
    this.inspSvc.loadDefects();
    this.inspSvc.loadInspections();
    this.woSvc.loadAll();
    this.usrSvc.loadByRole('QualityInspector');
    this.prodSvc.loadProducts();
  }
}

