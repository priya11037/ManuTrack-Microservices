import {
  Component, signal, computed, effect, untracked,
  inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AuthService } from '../../core/auth/auth.service';
import { WorkOrderService, WorkOrder } from '../../core/services/work-order.service';

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

// ── Status bridge helpers ──────────────────────────────────────────────────────
function woStatusToTask(s: string): Task['status'] {
  if (s === 'In Progress') return 'In Progress';
  if (s === 'Completed')   return 'Done';
  return 'To Do'; // Planned | On Hold | Pending | Cancelled → To Do
}

function taskStatusToWO(s: Task['status']): WorkOrder['status'] {
  if (s === 'In Progress') return 'In Progress';
  if (s === 'Done')        return 'Completed';
  return 'Planned';
}

// ── Component ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-task-console',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatIconModule, MatTooltipModule, MatSnackBarModule,
    DragDropModule,
  ],
  templateUrl: './task-console.component.html',
  styleUrl: './task-console.component.scss',
})
export class TaskConsoleComponent implements OnInit {
  private snack  = inject(MatSnackBar);
  private auth   = inject(AuthService);
  private fb     = inject(FormBuilder);
  private woSvc  = inject(WorkOrderService);
  private cdr    = inject(ChangeDetectorRef);

  operatorName = computed(() => this.auth.currentUser()?.name ?? 'Operator');

  today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // ── UI State ──────────────────────────────────────────────────────────────
  expandedId      = signal<string | null>(null);
  progressEditId  = signal<string | null>(null);
  flagDrawerId    = signal<string | null>(null);
  progressInput   = signal<number>(0);
  isSaving        = signal(false);

  // ── Flag form ─────────────────────────────────────────────────────────────
  flagForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(5)]],
  });

  // ── Tasks signal (local mutable Kanban state) ─────────────────────────────
  tasks = signal<Task[]>([]);

  // ── Kanban column arrays kept in sync with tasks signal ───────────────────
  colTodo:       Task[] = [];
  colInProgress: Task[] = [];
  colDone:       Task[] = [];

  constructor() {
    // ── Effect 1: split tasks into column arrays whenever tasks signal changes ──
    // Lives in constructor (injection context) ✓
    effect(() => {
      const all = this.tasks();
      this.colTodo       = all.filter(t => t.status === 'To Do');
      this.colInProgress = all.filter(t => t.status === 'In Progress');
      this.colDone       = all.filter(t => t.status === 'Done');
      this.cdr.markForCheck();
    });

    // ── Effect 2: sync WorkOrderService → local tasks whenever WOs update ─────
    // Must be in constructor (injection context). ngOnInit is NOT valid. ✓
    // Uses untracked() when reading tasks() to avoid circular dependency.
    effect(() => {
      const wos = this.woSvc.workOrders();

      // Read existing tasks WITHOUT tracking (no circular dependency)
      const existing = untracked(() => this.tasks());

      const active = wos.filter(
        wo => wo.status !== 'Cancelled'
      );

      const merged = active.map(wo => {
        const prev = existing.find(t => t.id === wo.id);
        return {
          ...this.woToTask(wo),
          // Preserve locally-toggled steps across API refreshes
          steps:      prev?.steps      ?? this.generateSteps(wo.product),
          flagged:    prev?.flagged    ?? false,
          flagReason: prev?.flagReason ?? '',
        };
      });

      this.tasks.set(merged);
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Fetch WOs assigned to this operator from the backend.
    // Effect 2 (in constructor) will react when workOrders signal updates.
    const user = this.auth.currentUser();
    this.woSvc.loadAll(undefined, undefined, user?.name ?? undefined);
  }

  // ── Column config ─────────────────────────────────────────────────────────
  get columns() {
    return [
      { id: 'To Do',       label: 'To Do',      icon: 'radio_button_unchecked', color: '#6b7280', bg: '#f9fafb', items: this.colTodo       },
      { id: 'In Progress', label: 'In Progress', icon: 'autorenew',             color: '#2563eb', bg: '#eff6ff', items: this.colInProgress },
      { id: 'Done',        label: 'Done',        icon: 'check_circle',          color: '#059669', bg: '#f0fdf4', items: this.colDone       },
    ];
  }

  connectedIds = ['To Do', 'In Progress', 'Done'];

  // ── Stats ─────────────────────────────────────────────────────────────────
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

  // ── WorkOrder → Task mapper ────────────────────────────────────────────────
  private woToTask(wo: WorkOrder): Task {
    return {
      id:         wo.id,
      woNumber:   wo.woNumber  || `WO-${wo.id}`,
      product:    wo.product   || 'Unknown',
      sku:        wo.sku       || '',
      quantity:   wo.quantity  || 0,
      produced:   wo.produced  || 0,
      priority:   (wo.priority ?? 'Medium') as Task['priority'],
      status:     woStatusToTask(wo.status),
      dueDate:    wo.dueDate   || '',
      line:       wo.line      || 'Line A',
      notes:      wo.notes     || '',
      flagged:    false,
      flagReason: '',
      steps:      this.generateSteps(wo.product),
    };
  }

  private generateSteps(product: string): TaskStep[] {
    return [
      { id: 's1', label: 'Machine setup & calibration',   done: false },
      { id: 's2', label: `Load materials for ${product}`, done: false },
      { id: 's3', label: 'First piece quality check',     done: false },
      { id: 's4', label: 'Full production run',           done: false },
      { id: 's5', label: 'Final count & inspection',      done: false },
      { id: 's6', label: 'Packaging & dispatch',          done: false },
    ];
  }

  // ── Kanban DnD — persists status to backend ───────────────────────────────
  onDrop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );

    const task       = event.container.data[event.currentIndex];
    const newStatus  = event.container.id as Task['status'];
    const prevStatus = event.previousContainer.id as Task['status'];
    const woStatus   = taskStatusToWO(newStatus);

    // Optimistic local update
    this.tasks.update(list =>
      list.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
    );

    // Persist to backend
    this.woSvc.updateStatus(task.id, woStatus).subscribe({
      next:  () => this.toast(`${task.woNumber} moved to "${newStatus}"`, 'success'),
      error: (err) => {
        // Roll back on failure
        this.tasks.update(list =>
          list.map(t => t.id === task.id ? { ...t, status: prevStatus } : t)
        );
        this.toast(err?.error?.message ?? 'Status update failed', 'warn');
      },
    });
  }

  // ── Expand / collapse ─────────────────────────────────────────────────────
  toggleExpand(id: string, ev: Event): void {
    ev.stopPropagation();
    this.expandedId.update(c => c === id ? null : id);
    this.progressEditId.set(null);
  }

  // ── Step toggle — updates the top progress bar proportionally ────────────
  toggleStep(taskId: string, stepId: string): void {
    // Find the original task BEFORE mutation
    const original = this.tasks().find(t => t.id === taskId);
    if (!original) return;

    const steps     = original.steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s);
    const doneCount = steps.filter(s => s.done).length;
    const total     = steps.length;

    // ── Key fix: map step completion → produced units so the top bar updates ──
    const produced  = total > 0 ? Math.round((doneCount / total) * original.quantity) : original.produced;

    // Auto-advance kanban status
    const newStatus: Task['status'] =
      doneCount === total ? 'Done'        :
      doneCount > 0       ? 'In Progress' :
                            'To Do';

    // Apply all changes at once
    this.tasks.update(list =>
      list.map(t => t.id !== taskId ? t : { ...t, steps, produced, status: newStatus })
    );

    // Persist produced qty to backend via SFO-allowed /progress endpoint
    this.woSvc.updateProgress(taskId, produced).subscribe();

    // Persist status change if it changed
    if (newStatus !== original.status) {
      this.woSvc.updateStatus(taskId, taskStatusToWO(newStatus)).subscribe();
    }
  }

  stepsProgress(task: Task): number {
    return task.steps.length
      ? Math.round(task.steps.filter(s => s.done).length / task.steps.length * 100)
      : 0;
  }

  // ── Progress update — persists producedQty to backend ─────────────────────
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
    const autoStatus: Task['status'] =
      val >= task.quantity ? 'Done'        :
      val > 0              ? 'In Progress' :
                             task.status;

    // Optimistic local update
    this.tasks.update(list =>
      list.map(t => t.id === task.id ? { ...t, produced: val, status: autoStatus } : t)
    );
    this.progressEditId.set(null);
    this.isSaving.set(true);

    // Persist via SFO-allowed /progress endpoint (not the full PUT which requires Planner)
    this.woSvc.updateProgress(task.id, val).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast(`Progress saved: ${val} / ${task.quantity} units`, 'success');
        if (autoStatus !== task.status) {
          this.woSvc.updateStatus(task.id, taskStatusToWO(autoStatus)).subscribe();
        }
      },
      error: () => {
        this.isSaving.set(false);
        this.toast('Failed to save progress', 'warn');
      },
    });
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
    // Persist: flag → WO goes On Hold so Production Planner sees it
    this.woSvc.updateStatus(task.id, 'On Hold').subscribe();
    this.closeFlagDrawer();
    this.toast(`${task.woNumber} flagged — WO set to On Hold`, 'warn');
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
    return t.status !== 'Done' && !!t.dueDate &&
           t.dueDate < new Date().toISOString().split('T')[0];
  }

  priorityMeta(p: Task['priority']) {
    const m = {
      Low:      { color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
      Medium:   { color: '#2563eb', bg: 'rgba(37,99,235,0.10)'   },
      High:     { color: '#d97706', bg: 'rgba(217,119,6,0.10)'   },
      Critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.10)'   },
    };
    return m[p] ?? m.Medium;
  }

  trackById(_: number, t: Task): string { return t.id; }

  private toast(msg: string, type: 'success' | 'warn' | 'info'): void {
    this.snack.open(msg, '✕', { duration: 3000, panelClass: [`snack-${type}`] });
  }
}
