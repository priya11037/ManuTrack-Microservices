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

const PRODUCTS = [
  'Steel Frame A-400',
  'Hydraulic Valve V-22',
  'Conveyor Belt CB-10',
  'Gear Assembly G-88',
  'Control Panel CP-5',
  'Pump Housing PH-3',
  'Heat Exchanger HE-7',
  'Pressure Vessel PV-14',
];

const PROD_LINES = ['Line A', 'Line B', 'Line C', 'Line D'];

const OPERATORS = [
  'James Carter', 'Maria Santos', 'David Kim',
  'Priya Nair',  'Luke Morgan',  'Sarah Okafor',
];

// ── Seed data factory ────────────────────────────────────────────────────────

function generateMockWOs(weekStart: Date): ScheduledWO[] {
  const seed: Omit<ScheduledWO, 'scheduledDay'>[] = [
    { id: 'wo-1',  woNumber: 'WO-3041', product: 'Steel Frame A-400',       priority: 'High',     status: 'In Progress', assignedTo: 'James Carter', line: 'Line A', quantity: 50,  avatarColor: AVATAR_COLORS[0] },
    { id: 'wo-2',  woNumber: 'WO-3042', product: 'Hydraulic Valve V-22',    priority: 'Critical', status: 'Planned',     assignedTo: 'Maria Santos', line: 'Line B', quantity: 120, avatarColor: AVATAR_COLORS[1] },
    { id: 'wo-3',  woNumber: 'WO-3043', product: 'Conveyor Belt CB-10',     priority: 'Medium',   status: 'Planned',     assignedTo: 'David Kim',    line: 'Line C', quantity: 30,  avatarColor: AVATAR_COLORS[2] },
    { id: 'wo-4',  woNumber: 'WO-3044', product: 'Gear Assembly G-88',      priority: 'Low',      status: 'On Hold',     assignedTo: 'Priya Nair',   line: 'Line D', quantity: 75,  avatarColor: AVATAR_COLORS[3] },
    { id: 'wo-5',  woNumber: 'WO-3045', product: 'Control Panel CP-5',      priority: 'High',     status: 'Planned',     assignedTo: 'Luke Morgan',  line: 'Line A', quantity: 20,  avatarColor: AVATAR_COLORS[4] },
    { id: 'wo-6',  woNumber: 'WO-3046', product: 'Pump Housing PH-3',       priority: 'Medium',   status: 'In Progress', assignedTo: 'Sarah Okafor', line: 'Line B', quantity: 60,  avatarColor: AVATAR_COLORS[5] },
    { id: 'wo-7',  woNumber: 'WO-3047', product: 'Heat Exchanger HE-7',     priority: 'Critical', status: 'Planned',     assignedTo: 'James Carter', line: 'Line C', quantity: 15,  avatarColor: AVATAR_COLORS[0] },
    { id: 'wo-8',  woNumber: 'WO-3048', product: 'Pressure Vessel PV-14',   priority: 'High',     status: 'Completed',   assignedTo: 'Maria Santos', line: 'Line D', quantity: 8,   avatarColor: AVATAR_COLORS[1] },
    { id: 'wo-9',  woNumber: 'WO-3049', product: 'Steel Frame A-400',       priority: 'Low',      status: 'Planned',     assignedTo: 'David Kim',    line: 'Line A', quantity: 200, avatarColor: AVATAR_COLORS[2] },
    { id: 'wo-10', woNumber: 'WO-3050', product: 'Hydraulic Valve V-22',    priority: 'Medium',   status: 'On Hold',     assignedTo: 'Priya Nair',   line: 'Line B', quantity: 45,  avatarColor: AVATAR_COLORS[3] },
  ];

  // Spread Mon–Fri (indices 0–4) across 10 WOs
  const dayOffsets = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  return seed.map((wo, i) => ({
    ...wo,
    scheduledDay: toIso(addDays(weekStart, dayOffsets[i])),
  }));
}

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

  allDayIds = computed<string[]>(() => this.weekDays().map(d => d.date));

  // ── Work order state ─────────────────────────────────────────────────────
  /** Master list signal – source of truth */
  workOrders = signal<ScheduledWO[]>([]);

  /** Mutable map used by CDK DnD (day date → WO array) */
  dayMap: Record<string, ScheduledWO[]> = {};

  // ── Stats ────────────────────────────────────────────────────────────────
  statsThisWeek = computed(() => {
    const wos = this.workOrders();
    const days = new Set(this.weekDays().map(d => d.date));
    const week  = wos.filter(w => days.has(w.scheduledDay));
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

  readonly products   = PRODUCTS;
  readonly prodLines  = PROD_LINES;
  readonly operators  = OPERATORS;
  readonly priorities: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

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
    // Whenever the week changes, rebuild dayMap from workOrders signal
    effect(() => {
      const days = this.weekDays();
      const wos  = this.workOrders();
      this.rebuildDayMap(days, wos);
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.buildForm();
    this.workOrders.set(generateMockWOs(this.currentWeekStart()));
  }

  // ── Week nav ─────────────────────────────────────────────────────────────
  prevWeek(): void {
    this.currentWeekStart.update(d => addDays(d, -7));
    this.workOrders.update(wos => {
      const newStart = this.currentWeekStart();
      return rebuildWeekDays(wos, newStart, -7);
    });
  }

  nextWeek(): void {
    this.currentWeekStart.update(d => addDays(d, 7));
    this.workOrders.update(wos => {
      const newStart = this.currentWeekStart();
      return rebuildWeekDays(wos, newStart, 7);
    });
  }

  // ── DnD ─────────────────────────────────────────────────────────────────
  getDayWOs(date: string): ScheduledWO[] {
    return this.dayMap[date] ?? [];
  }

  onDrop(event: CdkDragDrop<ScheduledWO[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const movedWO  = event.previousContainer.data[event.previousIndex];
    const targetDay = event.container.id; // date string

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );

    // Update signal to keep source of truth consistent
    this.workOrders.update(wos =>
      wos.map(wo => wo.id === movedWO.id ? { ...wo, scheduledDay: targetDay } : wo)
    );

    const dayLabel = this.weekDays().find(d => d.date === targetDay)?.fullLabel ?? targetDay;
    this.snackBar.open(
      `${movedWO.woNumber} moved to ${dayLabel}`,
      'Dismiss',
      { duration: 3000, panelClass: 'snack-moved' },
    );
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

    const v = this.scheduleForm.value;
    const idx = this.workOrders().length + 1;
    const newWO: ScheduledWO = {
      id:           `wo-${Date.now()}`,
      woNumber:     `WO-${3050 + idx}`,
      product:      v.product,
      priority:     v.priority,
      status:       'Planned',
      assignedTo:   v.assignedTo,
      line:         v.line,
      scheduledDay: v.scheduledDay,
      quantity:     v.quantity,
      notes:        v.notes ?? '',
      avatarColor:  AVATAR_COLORS[idx % AVATAR_COLORS.length],
    };

    this.workOrders.update(wos => [...wos, newWO]);
    this.closeDrawer();
    this.snackBar.open(
      `${newWO.woNumber} scheduled successfully`,
      'Dismiss',
      { duration: 3500, panelClass: 'snack-success' },
    );
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

  // ── Private ──────────────────────────────────────────────────────────────
  private rebuildDayMap(days: DayColumn[], wos: ScheduledWO[]): void {
    const next: Record<string, ScheduledWO[]> = {};
    for (const day of days) {
      next[day.date] = [];
    }
    for (const wo of wos) {
      if (next[wo.scheduledDay]) {
        next[wo.scheduledDay].push(wo);
      }
    }
    this.dayMap = next;
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
