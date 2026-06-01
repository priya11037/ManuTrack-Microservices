import {
  Component,
  signal,
  computed,
  effect,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  DragDropModule,
  CdkDragDrop,
  transferArrayItem,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { WorkOrderService, WorkOrder } from '../../core/services/work-order.service';
import { AuthService } from '../../core/auth/auth.service';

// ── Domain Model ──────────────────────────────────────────────────────────────

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type WOStatus = 'Planned' | 'In Progress' | 'On Hold' | 'Completed';

export interface ScheduledWO {
  id: string;
  woNumber: string;
  product: string;
  priority: Priority;
  status: WOStatus;
  assignedTo: string;
  line: string;
  scheduledDay: string; // ISO date string YYYY-MM-DD
  quantity: number;
  avatarColor: string;
  notes?: string;
}

interface DayColumn {
  label: string;      // 'Mon'
  fullLabel: string;  // 'Monday'
  date: string;       // '2025-06-02'
  dayNum: number;     // 2
}

// ── Utility helpers ───────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatMonthRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = start.toLocaleDateString('en-US', opts);
  const e = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${s} – ${e}`;
}

const DAY_ABBR  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AVATAR_COLORS = [
  '#2563eb', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#0891b2', '#db2777', '#65a30d',
];

const PROD_LINES = ['Line A', 'Line B', 'Line C', 'Line D'];

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-schedule',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSnackBarModule,
    DragDropModule,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent implements OnInit {
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb       = inject(FormBuilder);
  private readonly cdr      = inject(ChangeDetectorRef);
  private readonly woSvc    = inject(WorkOrderService);
  private readonly authSvc  = inject(AuthService);

  // ── Week navigation signals ──────────────────────────────────────────────
  currentWeekStart = signal<Date>(getMonday(new Date()));

  weekDays = computed<DayColumn[]>(() => {
    const start = this.currentWeekStart();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      const dow = d.getDay();
      return {
        label:     DAY_ABBR[dow],
        fullLabel: DAY_FULL[dow],
        date:      toIso(d),
        dayNum:    d.getDate(),
      };
    });
  });

  weekLabel = computed(() => {
    const start = this.currentWeekStart();
    const end   = addDays(start, 6);
    return formatMonthRange(start, end);
  });

  // ── Line × Day map for new Gantt layout ──────────────────────────────────
  // Key: `${line}-${date}`, Value: ScheduledWO[]
  linedayMap: Record<string, ScheduledWO[]> = {};

  /** All possible CDK drop list IDs (line × day combinations) */
  allDropIds = computed<string[]>(() => {
    const ids: string[] = [];
    for (const line of PROD_LINES) {
      for (const day of this.weekDays()) {
        ids.push(`${line}-${day.date}`);
      }
    }
    return ids;
  });

  /** WOs that have no scheduledDay in the current week — shown in unscheduled panel */
  unscheduledWOs = computed<ScheduledWO[]>(() => {
    const weekDates = new Set(this.weekDays().map(d => d.date));
    return this.woSvc.workOrders()
      .map(wo => this.fromWorkOrder(wo))
      .filter(w => !weekDates.has(w.scheduledDay) && w.status !== 'Completed');
  });

  /** Mutable map used by CDK DnD (date → WO array) */
  dayMap: Record<string, ScheduledWO[]> = {};

  // ── Stats — computed directly from service, no local signal ─────────────
  statsThisWeek = computed(() => {
    const days = new Set(this.weekDays().map(d => d.date));
    const week = this.woSvc.workOrders()
      .map(wo => this.fromWorkOrder(wo))
      .filter(w => days.has(w.scheduledDay));
    return {
      total:      week.length,
      planned:    week.filter(w => w.status === 'Planned').length,
      inProgress: week.filter(w => w.status === 'In Progress').length,
      onHold:     week.filter(w => w.status === 'On Hold').length,
      completed:  week.filter(w => w.status === 'Completed').length,
    };
  });

  // ── Drawer state ─────────────────────────────────────────────────────────
  drawerOpen = signal(false);
  scheduleForm!: FormGroup;

  readonly prodLines  = PROD_LINES;
  readonly priorities: Priority[] = ['Low', 'Medium', 'High', 'Critical'];
  // Form dropdowns — loaded from services where available, fallback otherwise
  readonly products  = ['Shaft Assembly','Gear Box Unit','Hydraulic Pump','Control Valve','Motor Mount','Bracket Assembly','PCB Controller'];
  readonly operators = ['Mike Johnson','Tom Wilson','Carlos Ramos','Amy Zhang','Linda Brown'];

  // ── Priority / Status colour maps ────────────────────────────────────────
  readonly priorityColor: Record<Priority, string> = {
    Low:      '#6b7280',
    Medium:   '#2563eb',
    High:     '#d97706',
    Critical: '#dc2626',
  };

  readonly statusColor: Record<WOStatus, string> = {
    'Planned':     '#6b7280',
    'In Progress': '#2563eb',
    'On Hold':     '#d97706',
    'Completed':   '#059669',
  };

  readonly statusBg: Record<WOStatus, string> = {
    'Planned':     'rgba(107,114,128,0.10)',
    'In Progress': 'rgba(37,99,235,0.10)',
    'On Hold':     'rgba(217,119,6,0.10)',
    'Completed':   'rgba(5,150,105,0.10)',
  };

  // ── Lifecycle ────────────────────────────────────────────────────────────
  constructor() {
    // Rebuild dayMap whenever service data or week changes
    // ⚠️ Does NOT write any signal — reads only. This prevents infinite loops.
    effect(() => {
      const days = this.weekDays();
      const wos  = this.woSvc.workOrders().map((wo: WorkOrder) => this.fromWorkOrder(wo));
      this.rebuildDayMap(days, wos);
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.buildForm();
    this.woSvc.loadAll();
  }

  // ── Week nav — just change the week signal; effect re-rebuilds dayMap ────
  prevWeek(): void { this.currentWeekStart.update(d => addDays(d, -7)); }
  nextWeek(): void { this.currentWeekStart.update(d => addDays(d,  7)); }

  // ── DnD — Line × Day based ───────────────────────────────────────────────
  /** Get WOs for a specific line AND day */
  getLineWOs(line: string, date: string): ScheduledWO[] {
    const key = `${line}-${date}`;
    return this.linedayMap[key] ?? [];
  }

  getDayWOs(date: string): ScheduledWO[] {
    return this.dayMap[date] ?? [];
  }

  onDrop(event: CdkDragDrop<ScheduledWO[]>, targetLine: string, targetDay: string): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const movedWO = event.previousContainer.data[event.previousIndex];
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

    // Update in service (optimistic)
    this.woSvc.updateLocal(movedWO.id, { startDate: targetDay, line: targetLine });

    const dayLabel = this.weekDays().find(d => d.date === targetDay)?.fullLabel ?? targetDay;
    this.snackBar.open(`${movedWO.woNumber} → ${targetLine}, ${dayLabel}`, 'Dismiss',
      { duration: 3000 });
  }

  // ── Drawer ───────────────────────────────────────────────────────────────
  openDrawer(): void {
    this.buildForm();
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  submitSchedule(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    const v   = this.scheduleForm.value;
    const idx = this.woSvc.workOrders().length + 1;

    // Persist to backend via WorkOrderService
    this.woSvc.create({
      productID:      1,  // TODO: resolve from product catalog
      productName:    v.product,
      quantity:       v.quantity,
      priority:       v.priority,
      startDate:      v.scheduledDay,
      endDate:        v.scheduledDay,
      assignedTo:     v.assignedTo,
      productionLine: v.line,
      notes:          v.notes ?? '',
    }).subscribe({
      next: () => {
        this.closeDrawer();
        this.snackBar.open('Work order scheduled successfully', 'Dismiss',
          { duration: 3500, panelClass: 'snack-success' });
      },
      error: () => this.closeDrawer(),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  getInitials(name: string): string {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  isToday(dateStr: string): boolean {
    return dateStr === toIso(new Date());
  }

  trackById(_: number, wo: ScheduledWO): string {
    return wo.id;
  }

  trackByDate(_: number, day: DayColumn): string {
    return day.date;
  }

  // ── WorkOrder → ScheduledWO mapping ─────────────────────────────────────
  private fromWorkOrder(wo: WorkOrder): ScheduledWO {
    return {
      id:           wo.id,
      woNumber:     wo.woNumber,
      product:      wo.product,
      priority:     wo.priority as Priority,
      status:       this.mapStatus(wo.status),
      assignedTo:   wo.assignedTo,
      line:         wo.line,
      scheduledDay: wo.startDate, // use startDate as the scheduled day
      quantity:     wo.quantity,
      avatarColor:  wo.avatarColor,
    };
  }

  private mapStatus(s: string): WOStatus {
    if (s === 'In Progress') return 'In Progress';
    if (s === 'Completed')   return 'Completed';
    if (s === 'On Hold')     return 'On Hold';
    return 'Planned';
  }

  // ── Private ──────────────────────────────────────────────────────────────
  private rebuildDayMap(days: DayColumn[], wos: ScheduledWO[]): void {
    // Simple day map (legacy)
    const next: Record<string, ScheduledWO[]> = {};
    for (const day of days) next[day.date] = [];
    // Line × Day map for Gantt
    const lineday: Record<string, ScheduledWO[]> = {};
    for (const line of PROD_LINES) {
      for (const day of days) lineday[`${line}-${day.date}`] = [];
    }
    for (const wo of wos) {
      if (next[wo.scheduledDay]) next[wo.scheduledDay].push(wo);
      const ldKey = `${wo.line}-${wo.scheduledDay}`;
      if (lineday[ldKey]) lineday[ldKey].push(wo);
    }
    this.dayMap    = next;
    this.linedayMap = lineday;
  }

  private buildForm(): void {
    this.scheduleForm = this.fb.group({
      product:      [null, Validators.required],
      priority:     ['Medium', Validators.required],
      line:         [null, Validators.required],
      assignedTo:   [null, Validators.required],
      scheduledDay: [this.weekDays()[0]?.date ?? null, Validators.required],
      quantity:     [1, [Validators.required, Validators.min(1), Validators.max(9999)]],
      notes:        [''],
    });
  }
}

// ── Module-level helper (no this context needed) ──────────────────────────────
function rebuildWeekDays(wos: ScheduledWO[], newStart: Date, _offset: number): ScheduledWO[] {
  // Keep all WOs as-is; the dayMap effect will handle filtering by visible week
  return wos;
}
