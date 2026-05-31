import { Component, signal, computed, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { InspectionService, Inspection, CreateInspectionRequest } from '../../../core/services/inspection.service';
export type { Inspection } from '../../../core/services/inspection.service';

@Component({
  selector: 'app-inspection-queue',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatTooltipModule, MatSnackBarModule, DragDropModule],
  templateUrl: './inspection-queue.component.html',
  styleUrl: './inspection-queue.component.scss',
})
export class InspectionQueueComponent implements OnInit {
  private snack = inject(MatSnackBar);
  private fb    = inject(FormBuilder);
  readonly inspSvc = inject(InspectionService);

  // ── UI state ──────────────────────────────────────────────────────────────
  drawerOpen   = signal(false);
  drawerMode   = signal<'add' | 'edit'>('add');
  selectedIns  = signal<Inspection | null>(null);
  expandedId   = signal<string | null>(null);
  searchTerm   = signal('');
  priorityFilter = signal('all');

  priorities = ['Low', 'Medium', 'High', 'Critical'] as Inspection['priority'][];
  statuses   = ['Pending', 'In Review', 'Passed', 'Failed'] as Inspection['status'][];
  inspectors = ['Emily Clark', 'Amy Zhang', 'Carlos Ramos', 'Linda Brown'];
  products   = ['Shaft Assembly', 'Gear Box Unit', 'Hydraulic Pump', 'Control Valve', 'Motor Mount', 'Bracket Assembly'];
  woRefs     = ['WO-0001', 'WO-0002', 'WO-0003', 'WO-0004', 'WO-0005', 'WO-0006', 'WO-0007', 'WO-0008'];

  // ── Data ─────────────────────────────────────────────────────────────────
  get inspections() { return this.inspSvc.inspections; }

  // ── Kanban columns (mutable arrays synced from signal) ────────────────────
  colPending:  Inspection[] = [];
  colInReview: Inspection[] = [];
  colPassed:   Inspection[] = [];
  colFailed:   Inspection[] = [];

  constructor() {
    effect(() => {
      const all = this.inspSvc.inspections();
      this.colPending  = all.filter(i => i.status === 'Pending');
      this.colInReview = all.filter(i => i.status === 'In Review');
      this.colPassed   = all.filter(i => i.status === 'Passed');
      this.colFailed   = all.filter(i => i.status === 'Failed');
    });
  }

  get columns() {
    return [
      { id: 'Pending',   label: 'Pending',   icon: 'pending',        color: '#6b7280', bg: '#f9fafb', items: this.colPending  },
      { id: 'In Review', label: 'In Review', icon: 'manage_search',  color: '#2563eb', bg: '#eff6ff', items: this.colInReview },
      { id: 'Passed',    label: 'Passed',    icon: 'verified',       color: '#059669', bg: '#f0fdf4', items: this.colPassed   },
      { id: 'Failed',    label: 'Failed',    icon: 'cancel',         color: '#dc2626', bg: '#fef2f2', items: this.colFailed   },
    ];
  }

  connectedIds = ['Pending', 'In Review', 'Passed', 'Failed'];

  // ── Stats ─────────────────────────────────────────────────────────────────
  get stats() { return this.inspSvc.inspectionStats; }

  // ── Form ─────────────────────────────────────────────────────────────────
  insForm = this.fb.group({
    woRef:         ['', Validators.required],
    product:       ['', Validators.required],
    sku:           [''],
    quantity:      [1, [Validators.required, Validators.min(1)]],
    priority:      ['Medium', Validators.required],
    inspector:     ['', Validators.required],
    scheduledDate: ['', Validators.required],
    notes:         [''],
  });

  // ── Kanban DnD ────────────────────────────────────────────────────────────
  onDrop(event: CdkDragDrop<Inspection[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    const ins       = event.container.data[event.currentIndex];
    const newStatus = event.container.id as Inspection['status'];
    const svcStatus = newStatus as Inspection['status'];

    this.inspSvc.updateInspectionResult(ins.inspectionID!, svcStatus).subscribe();

    if (newStatus === 'Failed') {
      this.toast(`${ins.insNumber} marked Failed — log defects in Defect Log`, 'warn');
    } else {
      this.toast(`${ins.insNumber} → ${newStatus}`, 'info');
    }
  }

  // ── Expand ───────────────────────────────────────────────────────────────
  toggleExpand(id: string, ev: Event): void {
    ev.stopPropagation();
    this.expandedId.update(c => c === id ? null : id);
  }

  // ── Drawer ───────────────────────────────────────────────────────────────
  openAddDrawer(): void {
    this.drawerMode.set('add');
    this.selectedIns.set(null);
    const today = new Date().toISOString().split('T')[0];
    this.insForm.reset({ priority: 'Medium', quantity: 1, scheduledDate: today });
    this.drawerOpen.set(true);
  }

  openEditDrawer(ins: Inspection, ev: Event): void {
    ev.stopPropagation();
    this.drawerMode.set('edit');
    this.selectedIns.set(ins);
    this.insForm.patchValue(ins);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void { this.drawerOpen.set(false); this.selectedIns.set(null); }

  saveInspection(): void {
    if (this.insForm.invalid) { this.insForm.markAllAsTouched(); return; }
    const v = this.insForm.value;

    if (this.drawerMode() === 'add') {
      const req: CreateInspectionRequest = {
        workOrderID:   parseInt(v.woRef?.replace(/\D/g, '') ?? '0', 10),
        quantity:      v.quantity!,
        priority:      v.priority as Inspection['priority'],
        inspectorName: v.inspector!,
        scheduledDate: v.scheduledDate!,
        notes:         v.notes || undefined,
      };
      this.inspSvc.createInspection(req).subscribe({
        next: () => { this.toast('Inspection created', 'success'); this.closeDrawer(); }
      });
    } else {
      const ins = this.selectedIns()!;
      const id  = ins.inspectionID!;
      this.inspSvc.updateInspectionResult(id, ins.status).subscribe({
        next: () => { this.toast('Inspection updated', 'success'); this.closeDrawer(); }
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getProgress(ins: Inspection): number {
    return ins.quantity > 0 ? Math.round((ins.inspectedQty / ins.quantity) * 100) : 0;
  }

  priorityMeta(p: Inspection['priority']) {
    return {
      Low:      { color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
      Medium:   { color: '#2563eb', bg: 'rgba(37,99,235,0.10)'   },
      High:     { color: '#d97706', bg: 'rgba(217,119,6,0.10)'   },
      Critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.10)'   },
    }[p];
  }

  private pickColor(): string {
    const p = ['#8b5cf6','#ec4899','#14b8a6','#0ea5e9','#f59e0b','#2563eb'];
    return p[Math.floor(Math.random() * p.length)];
  }

  private toast(msg: string, type: 'success' | 'warn' | 'info'): void {
    this.snack.open(msg, '✕', { duration: 3500, panelClass: [`snack-${type}`] });
  }

  ngOnInit(): void { this.inspSvc.loadInspections(); }
}
