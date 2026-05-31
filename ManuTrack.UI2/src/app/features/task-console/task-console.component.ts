import { Component, signal, computed, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AuthService } from '../../core/auth/auth.service';

// ── Models ────────────────────────────────────────────────────────────────────
export interface TaskStep {
  id: string;
  label: string;
  done: boolean;
}

export interface Task {
  id: string;
  woNumber: string;
  product: string;
  sku: string;
  quantity: number;
  produced: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'To Do' | 'In Progress' | 'Done';
  dueDate: string;
  line: string;
  notes: string;
  steps: TaskStep[];
  flagged: boolean;
  flagReason: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-task-console',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatIconModule, MatTooltipModule, MatSnackBarModule,
    DragDropModule,
  ],
  templateUrl: './task-console.component.html',
  styleUrl: './task-console.component.scss',
})
export class TaskConsoleComponent implements OnInit {
  private snack = inject(MatSnackBar);
  private auth  = inject(AuthService);
  private fb    = inject(FormBuilder);

  operatorName = computed(() => this.auth.currentUser()?.name ?? 'Operator');

  today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── UI State ─────────────────────────────────────────────────────────────────
  expandedId      = signal<string | null>(null);
  progressEditId  = signal<string | null>(null);
  flagDrawerId    = signal<string | null>(null);
  progressInput   = signal<number>(0);

  // ── Flag form ─────────────────────────────────────────────────────────────────
  flagForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(5)]],
  });

  // ── Task data ─────────────────────────────────────────────────────────────────
  tasks = signal<Task[]>([
    {
      id: '1', woNumber: 'WO-0001', product: 'Shaft Assembly',   sku: 'SA-1042',
      quantity: 50,  produced: 32, priority: 'High',     status: 'In Progress',
      dueDate: '2025-05-30', line: 'Line A', flagged: false, flagReason: '',
      notes: 'Rush order — handle with care. Client deadline strict.',
      steps: [
        { id: 's1', label: 'Machine setup & calibration',        done: true  },
        { id: 's2', label: 'Load raw material (Steel Rod 12mm)', done: true  },
        { id: 's3', label: 'First piece quality check',          done: true  },
        { id: 's4', label: 'Continue full production run',       done: false },
        { id: 's5', label: 'Final count & dimensional check',    done: false },
        { id: 's6', label: 'Packaging & label application',      done: false },
      ],
    },
    {
      id: '2', woNumber: 'WO-0002', product: 'Gear Box Unit',    sku: 'GB-2088',
      quantity: 20,  produced: 0,  priority: 'Medium',   status: 'To Do',
      dueDate: '2025-06-07', line: 'Line A', flagged: false, flagReason: '',
      notes: '',
      steps: [
        { id: 's1', label: 'Machine setup & calibration',        done: false },
        { id: 's2', label: 'Load gearing components',            done: false },
        { id: 's3', label: 'Assembly jig alignment check',       done: false },
        { id: 's4', label: 'Production run',                     done: false },
        { id: 's5', label: 'Torque test on each unit',           done: false },
        { id: 's6', label: 'Packaging & shipping prep',          done: false },
      ],
    },
    {
      id: '3', woNumber: 'WO-0007', product: 'Shaft Assembly',   sku: 'SA-1042',
      quantity: 75,  produced: 0,  priority: 'Medium',   status: 'To Do',
      dueDate: '2025-06-12', line: 'Line A', flagged: false, flagReason: '',
      notes: '',
      steps: [
        { id: 's1', label: 'Machine setup & calibration',        done: false },
        { id: 's2', label: 'Load raw material (Steel Rod 12mm)', done: false },
        { id: 's3', label: 'First piece quality check',          done: false },
        { id: 's4', label: 'Continue full production run',       done: false },
        { id: 's5', label: 'Final count & packaging',            done: false },
      ],
    },
    {
      id: '4', woNumber: 'WO-0003', product: 'Hydraulic Pump',   sku: 'HP-3301',
      quantity: 10,  produced: 10, priority: 'Low',      status: 'Done',
      dueDate: '2025-05-20', line: 'Line A', flagged: false, flagReason: '',
      notes: 'QC passed — ready to ship.',
      steps: [
        { id: 's1', label: 'Machine setup & calibration',        done: true  },
        { id: 's2', label: 'Load pump components',               done: true  },
        { id: 's3', label: 'First piece quality check',          done: true  },
        { id: 's4', label: 'Full production run',                done: true  },
        { id: 's5', label: 'Pressure test all units',            done: true  },
        { id: 's6', label: 'Packaging & dispatch',               done: true  },
      ],
    },
    {
      id: '5', woNumber: 'WO-0005', product: 'Motor Mount',      sku: 'MM-5501',
      quantity: 30,  produced: 0,  priority: 'High',     status: 'To Do',
      dueDate: '2025-06-05', line: 'Line A', flagged: true, flagReason: 'Waiting for steel plate stock from Inventory. Cannot start without material.',
      notes: 'Waiting for steel plate stock.',
      steps: [
        { id: 's1', label: 'Machine setup & calibration',        done: false },
        { id: 's2', label: 'Load steel plate material',          done: false },
        { id: 's3', label: 'Punch & form mounting bracket',      done: false },
        { id: 's4', label: 'Weld assembly',                      done: false },
        { id: 's5', label: 'Surface treatment & coating',        done: false },
        { id: 's6', label: 'Final inspection & packaging',       done: false },
      ],
    },
  ]);

  // ── Kanban columns (mutable, synced from signal) ───────────────────────────
  colTodo:       Task[] = [];
  colInProgress: Task[] = [];
  colDone:       Task[] = [];

  constructor() {
    effect(() => {
      const all = this.tasks();
      this.colTodo       = all.filter(t => t.status === 'To Do');
      this.colInProgress = all.filter(t => t.status === 'In Progress');
      this.colDone       = all.filter(t => t.status === 'Done');
    });
  }

  get columns() {
    return [
      { id: 'To Do',       label: 'To Do',       icon: 'radio_button_unchecked', color: '#6b7280', bg: '#f9fafb', items: this.colTodo       },
      { id: 'In Progress', label: 'In Progress',  icon: 'autorenew',              color: '#2563eb', bg: '#eff6ff', items: this.colInProgress },
      { id: 'Done',        label: 'Done',         icon: 'check_circle',           color: '#059669', bg: '#f0fdf4', items: this.colDone       },
    ];
  }

  connectedIds = ['To Do', 'In Progress', 'Done'];

  // ── Stats ──────────────────────────────────────────────────────────────────
  stats = computed(() => {
    const all   = this.tasks();
    const today = new Date().toISOString().split('T')[0];
    return {
      total:      all.length,
      inProgress: all.filter(t => t.status === 'In Progress').length,
      done:       all.filter(t => t.status === 'Done').length,
      overdue:    all.filter(t => t.status !== 'Done' && t.dueDate < today).length,
      flagged:    all.filter(t => t.flagged).length,
    };
  });

  // ── Kanban DnD ─────────────────────────────────────────────────────────────
  onDrop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    const task      = event.container.data[event.currentIndex];
    const newStatus = event.container.id as Task['status'];

    this.tasks.update(list =>
      list.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
    );
    this.toast(`${task.woNumber} → ${newStatus}`, 'info');
  }

  // ── Expand / collapse ──────────────────────────────────────────────────────
  toggleExpand(id: string, ev: Event): void {
    ev.stopPropagation();
    this.expandedId.update(c => c === id ? null : id);
    this.progressEditId.set(null);
  }

  // ── Step toggle ────────────────────────────────────────────────────────────
  toggleStep(taskId: string, stepId: string): void {
    this.tasks.update(list =>
      list.map(t => {
        if (t.id !== taskId) return t;
        const steps   = t.steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s);
        const allDone = steps.every(s => s.done);
        return { ...t, steps, status: allDone && t.status !== 'Done' ? 'Done' : t.status };
      })
    );
  }

  stepsProgress(task: Task): number {
    if (!task.steps.length) return 0;
    return Math.round((task.steps.filter(s => s.done).length / task.steps.length) * 100);
  }

  // ── Progress update ────────────────────────────────────────────────────────
  openProgressEdit(task: Task, ev: Event): void {
    ev.stopPropagation();
    this.progressEditId.set(task.id);
    this.progressInput.set(task.produced);
  }

  decrementProgress(): void {
    this.progressInput.update(v => Math.max(0, v - 1));
  }

  incrementProgress(max: number): void {
    this.progressInput.update(v => Math.min(max, v + 1));
  }

  saveProgress(task: Task): void {
    const val = Math.min(Math.max(0, this.progressInput()), task.quantity);
    this.tasks.update(list =>
      list.map(t => {
        if (t.id !== task.id) return t;
        const newStatus: Task['status'] = val >= t.quantity ? 'Done' : t.status === 'To Do' && val > 0 ? 'In Progress' : t.status;
        return { ...t, produced: val, status: newStatus };
      })
    );
    this.progressEditId.set(null);
    this.toast(`Progress updated: ${val}/${task.quantity}`, 'success');
  }

  // ── Flag issue ────────────────────────────────────────────────────────────
  openFlagDrawer(taskId: string, ev: Event): void {
    ev.stopPropagation();
    this.flagDrawerId.set(taskId);
    this.flagForm.reset();
  }
  closeFlagDrawer(): void { this.flagDrawerId.set(null); }

  submitFlag(task: Task): void {
    if (this.flagForm.invalid) { this.flagForm.markAllAsTouched(); return; }
    const reason = this.flagForm.value.reason!;
    this.tasks.update(list =>
      list.map(t => t.id === task.id ? { ...t, flagged: true, flagReason: reason, status: 'To Do' } : t)
    );
    this.closeFlagDrawer();
    this.toast(`Issue flagged on ${task.woNumber}`, 'warn');
  }

  clearFlag(task: Task, ev: Event): void {
    ev.stopPropagation();
    this.tasks.update(list =>
      list.map(t => t.id === task.id ? { ...t, flagged: false, flagReason: '' } : t)
    );
    this.toast(`Flag cleared on ${task.woNumber}`, 'info');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getProgress(t: Task): number {
    return t.quantity > 0 ? Math.round((t.produced / t.quantity) * 100) : 0;
  }

  isOverdue(t: Task): boolean {
    return t.status !== 'Done' && t.dueDate < new Date().toISOString().split('T')[0];
  }

  priorityMeta(p: Task['priority']) {
    const m = {
      Low:      { color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
      Medium:   { color: '#2563eb', bg: 'rgba(37,99,235,0.10)'   },
      High:     { color: '#d97706', bg: 'rgba(217,119,6,0.10)'   },
      Critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.10)'   },
    };
    return m[p];
  }

  private toast(msg: string, type: 'success' | 'warn' | 'info'): void {
    this.snack.open(msg, '✕', { duration: 3000, panelClass: [`snack-${type}`] });
  }

  ngOnInit(): void {}
}
