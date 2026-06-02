import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { ChartModule } from 'primeng/chart';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { WorkOrderService } from '../../core/services/work-order.service';
import { UserService } from '../../core/services/user.service';
import { InspectionService } from '../../core/services/inspection.service';
import { InventoryService } from '../../core/services/inventory.service';
import { ComplianceService } from '../../core/services/compliance.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule, ChartModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private auth    = inject(AuthService);
  private woSvc   = inject(WorkOrderService);
  private usrSvc  = inject(UserService);
  private inspSvc = inject(InspectionService);
  private invSvc  = inject(InventoryService);
  private compSvc = inject(ComplianceService);

  // Current role drives the entire view
  role     = computed(() => this.auth.userRole());
  userName = computed(() => this.auth.currentUser()?.name?.split(' ')[0] ?? 'there');

  selectedRange = signal('This Week');
  dateRanges = ['Today', 'This Week', 'This Month', 'This Quarter', 'This Year'];

  // ── KPI Cards ───────────────────────────────────────────────────────────────
  // ── Admin KPIs — computed from UserService ────────────────────────────────────
  kpiCards = computed(() => {
    const stats   = this.usrSvc.stats();
    const total   = stats.total;
    const active  = stats.active;
    const inactive= stats.inactive;
    const pct     = total > 0 ? Math.round((active / total) * 100) : 0;
    return [
      { label: 'Total Users',    value: String(total),   icon: 'group',        color: 'blue',  trend: `${total} registered`,       trendUp: true  },
      { label: 'Active Users',   value: String(active),  icon: 'person_check', color: 'green', trend: `${pct}% of total`,          trendUp: true  },
      { label: 'Inactive Users', value: String(inactive),icon: 'person_off',   color: 'amber', trend: `${100 - pct}% of total`,    trendUp: false },
      { label: 'Login Failures', value: '0',             icon: 'gpp_bad',      color: 'red',   trend: 'Last 24 hours',             trendUp: false },
    ];
  });

  // ── Users by Role (Horizontal Bar Chart) ────────────────────────────────────
  // ── Role chart — computed from real UserService data ─────────────────────────
  roleChartData = computed(() => {
    const users = this.usrSvc.users();
    const roleKeys = [
      { label: 'Admin',         role: 'Admin',             color: '#3b82f6' },
      { label: 'Prod. Planner', role: 'ProductionPlanner', color: '#10b981' },
      { label: 'Shop Floor',    role: 'ShopFloorOperator', color: '#f59e0b' },
      { label: 'QA Inspector',  role: 'QualityInspector',  color: '#8b5cf6' },
      { label: 'Inventory Mgr', role: 'InventoryManager',  color: '#ef4444' },
      { label: 'Compliance',    role: 'ComplianceOfficer', color: '#0ea5e9' },
    ];
    return {
      labels: roleKeys.map(r => r.label),
      datasets: [{
        label: 'Users',
        data: roleKeys.map(r => users.filter(u => u.role === r.role).length),
        backgroundColor: roleKeys.map(r => r.color),
        borderRadius: 5,
        barThickness: 18,
      }],
    };
  });

  roleChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e2a3b',
        titleColor: '#e5e7eb',
        bodyColor: '#94a3b8',
        padding: 10,
        cornerRadius: 8,
        callbacks: { label: (ctx: any) => `  ${ctx.raw} user${ctx.raw > 1 ? 's' : ''}` },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(243,244,246,0.8)' },
        border: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 }, stepSize: 1 },
        max: 3,
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#374151', font: { size: 11 } },
      },
    },
  };

  // ── Login Activity Chart — computed from real audit logs ─────────────────────
  loginChartData = computed(() => {
    const logs   = this.compSvc.auditLogs();
    const labels = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    });
    const today = new Date();
    const success = labels.map((_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (13 - i));
      return logs.filter(l => l.action === 'Login' && l.severity === 'info' &&
        new Date(l.timestamp).toDateString() === d.toDateString()).length;
    });
    const failed = labels.map((_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (13 - i));
      return logs.filter(l => (l.action === 'Unauthorized Access' || l.action === 'Access Denied') &&
        new Date(l.timestamp).toDateString() === d.toDateString()).length;
    });
    return {
    labels,
    datasets: [
      {
        label: 'Successful Logins',
        data: success,
        borderColor: '#3b82f6',
        backgroundColor: (ctx: any) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'transparent';
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0,   'rgba(59,130,246,0.2)');
          gradient.addColorStop(0.6, 'rgba(59,130,246,0.05)');
          gradient.addColorStop(1,   'rgba(59,130,246,0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#3b82f6',
        pointHoverBorderWidth: 2,
        borderWidth: 2.5,
      },
      {
        label: 'Failed Attempts',
        data: failed,
        borderColor: '#ef4444',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        pointRadius: (ctx: any) => ctx.raw > 0 ? 4 : 0,
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        borderWidth: 1.8,
        borderDash: [4, 4],
      },
    ],
    };
  });

  loginChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    layout: { padding: { top: 4, right: 4, bottom: 0, left: 0 } },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          boxWidth: 10, boxHeight: 2,
          font: { size: 11 }, color: '#9ca3af',
          padding: 14, usePointStyle: true, pointStyle: 'line' as const,
        },
      },
      tooltip: {
        backgroundColor: '#1e2a3b',
        titleColor: '#e5e7eb',
        bodyColor: '#94a3b8',
        padding: 12, cornerRadius: 10,
        borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#9ca3af', font: { size: 10 }, padding: 6, maxTicksLimit: 7 },
      },
      y: {
        min: 0,
        grid: { color: 'rgba(243,244,246,0.8)', lineWidth: 1 },
        border: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 }, stepSize: 5, padding: 8 },
      },
    },
  };

  // ── Recent Audit Logs — from ComplianceService ───────────────────────────────
  auditLogs = computed(() => {
    const palette: Record<string, string> = {
      'John Smith': '#2563eb', 'Sarah Lee': '#10b981', 'Emily Clark': '#8b5cf6',
      'Robert Chen': '#f59e0b', 'Amy Zhang': '#ec4899', 'System': '#ef4444',
    };
    return this.compSvc.auditLogs().slice(0, 6).map(l => ({
      initial:  l.userInitials || (l.user?.[0] ?? '?'),
      name:     l.user || 'System',
      action:   l.detail || l.action,
      module:   l.module,
      time:     new Date(l.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      color:    palette[l.user] ?? '#6b7280',
      severity: l.severity,
    }));
  });

  // ── System Module Overview — computed from real service stats ─────────────────
  moduleStats = computed(() => {
    const wos = this.woSvc.stats();
    const inv = this.invSvc.stockStats();
    const ins = this.inspSvc.inspectionStats();
    const rep = this.compSvc.reportStats();
    const pos = this.invSvc.poStats();
    return [
      { label: 'Work Orders',         value: String(wos.total),          icon: 'assignment',    color: '#3b82f6', sub: `${wos.inProgress} in progress`    },
      { label: 'Inventory Items',      value: String(inv.total),          icon: 'inventory_2',   color: '#f59e0b', sub: `${inv.low} low stock alerts`       },
      { label: 'Active Inspections',   value: String(ins.pending + ins.inReview), icon: 'fact_check', color: '#8b5cf6', sub: `${ins.failed} failed`         },
      { label: 'Compliance Reports',   value: String(rep.total),          icon: 'policy',        color: '#0ea5e9', sub: `${rep.pending} pending`           },
      { label: 'Purchase Orders',      value: String(pos.total),          icon: 'shopping_cart', color: '#ef4444', sub: `${pos.pending} open`              },
      { label: 'Users',                value: String(this.usrSvc.stats().total), icon: 'group',  color: '#10b981', sub: `${this.usrSvc.stats().active} active` },
    ];
  });

  // ── Production Planner KPIs ──────────────────────────────────────────────────
  // ── Planner KPIs — computed from WorkOrderService ────────────────────────────
  plannerKpis = computed(() => {
    const s = this.woSvc.stats();
    const open = s.planned + s.inProgress + s.onHold;
    return [
      { label: 'Open Work Orders',    value: String(open),        icon: 'assignment', color: 'blue',   trend: `${s.planned} planned`,       trendUp: false },
      { label: 'In Progress',         value: String(s.inProgress),icon: 'autorenew',  color: 'indigo', trend: 'Currently active',           trendUp: true  },
      { label: 'Overdue',             value: String(s.overdue),   icon: 'warning',    color: 'red',    trend: s.overdue > 0 ? 'Attention needed' : 'On track', trendUp: s.overdue === 0 },
      { label: 'Completed',           value: String(s.completed), icon: 'task_alt',   color: 'green',  trend: `${s.total} total WOs`,       trendUp: true  },
    ];
  });

  // ── WO Status Doughnut — computed from real WorkOrderService ─────────────────
  woStatusChartData = computed(() => {
    const s = this.woSvc.stats();
    return {
      labels: ['Planned', 'In Progress', 'On Hold', 'Completed'],
      datasets: [{
        data: [s.planned ?? 0, s.inProgress ?? 0, s.onHold ?? 0, s.completed ?? 0],
        backgroundColor: ['#6b7280', '#2563eb', '#d97706', '#059669'],
        borderColor: ['#fff', '#fff', '#fff', '#fff'],
        borderWidth: 3,
        hoverOffset: 6,
      }],
    };
  });

  woStatusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e2a3b', titleColor: '#e5e7eb', bodyColor: '#94a3b8',
        padding: 10, cornerRadius: 8,
      },
    },
  };

  woStatusLegend = computed(() => {
    const s = this.woSvc.stats();
    return [
      { label: 'Planned',     count: s.planned    ?? 0, color: '#6b7280' },
      { label: 'In Progress', count: s.inProgress ?? 0, color: '#2563eb' },
      { label: 'On Hold',     count: s.onHold     ?? 0, color: '#d97706' },
      { label: 'Completed',   count: s.completed  ?? 0, color: '#059669' },
    ];
  });

  // ── Production This Week Bar Chart — computed from WorkOrderService ──────────
  productionChartData = computed(() => {
    const wos   = this.woSvc.workOrders();
    const today = new Date();
    const days  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
    const planned   = days.map((_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      return wos.filter(w => w.startDate && new Date(w.startDate).toDateString() === d.toDateString()).length;
    });
    const completed = days.map((_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      return wos.filter(w => w.status === 'Completed' && w.dueDate && new Date(w.dueDate).toDateString() === d.toDateString()).length;
    });
    return {
    labels: days,
    datasets: [
      {
        label: 'Planned',
        data: planned,
        backgroundColor: 'rgba(37,99,235,0.15)',
        borderColor: '#2563eb',
        borderWidth: 1.5,
        borderRadius: 5,
      },
      {
        label: 'Completed',
        data: completed,
        backgroundColor: 'rgba(5,150,105,0.75)',
        borderColor: '#059669',
        borderWidth: 0,
        borderRadius: 5,
      },
    ],
    };
  });

  productionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        display: true, position: 'top' as const, align: 'end' as const,
        labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, color: '#9ca3af', padding: 12 },
      },
      tooltip: {
        backgroundColor: '#1e2a3b', titleColor: '#e5e7eb', bodyColor: '#94a3b8',
        padding: 10, cornerRadius: 8,
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
      y: {
        min: 0, max: 5,
        grid: { color: 'rgba(243,244,246,0.8)' }, border: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 }, stepSize: 1 },
      },
    },
  };

  // ── Upcoming Work Orders — from WorkOrderService ─────────────────────────────
  upcomingWOs = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.woSvc.workOrders()
      .filter(w => w.status !== 'Completed' && w.status !== 'Cancelled')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5)
      .map(w => ({
        woNumber:   w.woNumber,
        product:    w.product,
        priority:   w.priority,
        dueDate:    w.dueDate,
        assignedTo: w.assignedTo,
        status:     w.status,
        avatarColor: w.avatarColor,
        overdue:    w.dueDate < today,
      }));
  });

  // ── Line utilisation — computed from WorkOrderService ─────────────────────────
  lineStats = computed(() => {
    const activeWOs = this.woSvc.workOrders().filter(w => w.status === 'In Progress' || w.status === 'On Hold');
    return ['Line A', 'Line B', 'Line C', 'Line D'].map(line => {
      const wo = activeWOs.find(w => w.line === line);
      const statusStr = wo ? (wo.status === 'In Progress' ? 'Active' : 'On Hold') : 'Idle';
      return {
        line,
        status:    statusStr,
        wo:        wo?.woNumber ?? '—',
        product:   wo?.product  ?? '—',
        utilColor: statusStr === 'Active' ? '#059669' : statusStr === 'On Hold' ? '#d97706' : '#9ca3af',
      };
    });
  });

  // ── Shop Floor — work orders assigned to current user ────────────────────────
  private myWOs = computed(() => {
    const name = this.auth.currentUser()?.name?.toLowerCase() ?? '';
    return this.woSvc.workOrders().filter(w =>
      w.assignedTo?.toLowerCase() === name &&
      w.status !== 'Cancelled'
    );
  });

  // ── KPIs — computed from real data ────────────────────────────────────────────
  sfKpis = computed(() => {
    const all     = this.myWOs();
    const today   = new Date().toISOString().split('T')[0];
    const total   = all.length;
    const inProg  = all.filter(w => w.status === 'In Progress').length;
    const done    = all.filter(w => w.status === 'Completed').length;
    const overdue = all.filter(w => w.status !== 'Completed' && w.dueDate < today).length;
    return [
      { label: 'Tasks Assigned',  value: String(total),  icon: 'assignment', color: 'blue',   trend: 'Total assigned',       trendUp: true          },
      { label: 'In Progress',     value: String(inProg), icon: 'autorenew',  color: 'indigo', trend: inProg > 0 ? 'Active' : 'None active', trendUp: inProg > 0 },
      { label: 'Completed',       value: String(done),   icon: 'task_alt',   color: 'green',  trend: total > 0 ? `${Math.round(done/total*100)}% done` : '0% done', trendUp: true },
      { label: 'Overdue',         value: String(overdue),icon: 'warning',    color: overdue > 0 ? 'red' : 'green', trend: overdue > 0 ? 'Needs attention' : 'On track', trendUp: overdue === 0 },
    ];
  });

  // ── Task list — computed from real data ───────────────────────────────────────
  sfTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.myWOs().map(w => ({
      woNumber: w.woNumber,
      product:  w.product,
      status:   w.status === 'Completed' ? 'Done' :
                w.status === 'In Progress' ? 'In Progress' : 'To Do',
      priority: w.priority,
      progress: w.quantity > 0 ? Math.round((w.produced / w.quantity) * 100) : 0,
      dueDate:  w.dueDate,
      overdue:  w.status !== 'Completed' && w.dueDate < today,
    }));
  });

  // ── On-time rate and units today — computed from real data ───────────────────
  sfOnTimeRate = computed(() => {
    const all   = this.myWOs();
    const today = new Date().toISOString().split('T')[0];
    const done  = all.filter(w => w.status === 'Completed');
    const onTime = done.filter(w => w.dueDate >= today || w.status === 'Completed');
    return done.length > 0 ? Math.round((onTime.length / done.length) * 100) : 0;
  });

  sfUnitsToday = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.myWOs()
      .filter(w => w.dueDate === today || w.status === 'In Progress')
      .reduce((sum, w) => sum + (w.produced ?? 0), 0);
  });

  sfStatusColor(s: string): string {
    return { 'To Do': '#6b7280', 'In Progress': '#2563eb', Done: '#059669' }[s] ?? '#6b7280';
  }
  sfPriorityColor(p: string): string {
    return { Low: '#6b7280', Medium: '#2563eb', High: '#d97706', Critical: '#dc2626' }[p] ?? '#6b7280';
  }

  // ── Task completion donut — computed from real data ───────────────────────────
  sfDonutData = computed(() => {
    const all    = this.myWOs();
    const done   = all.filter(w => w.status === 'Completed').length;
    const inProg = all.filter(w => w.status === 'In Progress').length;
    const todo   = all.filter(w => w.status === 'Planned' || w.status === 'On Hold').length;
    return {
      labels: ['Done', 'In Progress', 'To Do'],
      datasets: [{ data: [done, inProg, todo],
        backgroundColor: ['#059669','#2563eb','#e5e7eb'],
        borderColor: ['#fff','#fff','#fff'], borderWidth: 3, hoverOffset: 6 }],
    };
  });

  sfDonutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1e2a3b', titleColor: '#e5e7eb', bodyColor: '#94a3b8', padding: 10, cornerRadius: 8 },
    },
  };

  sfDonutLegend = computed(() => {
    const all    = this.myWOs();
    const done   = all.filter(w => w.status === 'Completed').length;
    const inProg = all.filter(w => w.status === 'In Progress').length;
    const todo   = all.filter(w => w.status === 'Planned' || w.status === 'On Hold').length;
    return [
      { label: 'Done',        count: done,   color: '#059669' },
      { label: 'In Progress', count: inProg, color: '#2563eb' },
      { label: 'To Do',       count: todo,   color: '#9ca3af' },
    ];
  });

  // ── Output chart — uses real produced vs quantity totals ──────────────────────
  sfOutputChartData = computed(() => {
    const all     = this.myWOs();
    const target  = all.reduce((s, w) => s + w.quantity, 0);
    const produced= all.reduce((s, w) => s + w.produced, 0);
    return {
      labels: ['Target', 'Produced'],
      datasets: [
        { label: 'Target',   data: [target, 0],   backgroundColor: 'rgba(37,99,235,0.5)',  borderRadius: 5 },
        { label: 'Produced', data: [0, produced],  backgroundColor: 'rgba(5,150,105,0.75)', borderRadius: 5 },
      ],
    };
  });

  sfOutputChartOptions = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: true, position: 'top' as const, align: 'end' as const,
        labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, color: '#9ca3af', padding: 12 } },
      tooltip: { backgroundColor: '#1e2a3b', titleColor: '#e5e7eb', bodyColor: '#94a3b8', padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
      y: { min: 0, grid: { color: 'rgba(243,244,246,0.8)' }, border: { display: false },
           ticks: { color: '#9ca3af', font: { size: 11 } } },
    },
  };

  // ── Quality Inspector KPIs — computed from InspectionService ──────────────────
  qiKpis = computed(() => {
    const is = this.inspSvc.inspectionStats();
    const ds = this.inspSvc.defectStats();
    const passRate = (is.passed + is.failed) > 0
      ? Math.round((is.passed / (is.passed + is.failed)) * 100) : 0;
    const open = is.pending + is.inReview;
    return [
      { label: 'Open Inspections', value: String(open),       icon: 'pending',    color: 'blue',  trend: `${is.pending} pending, ${is.inReview} in review`, trendUp: false },
      { label: 'Pass Rate',        value: `${passRate}%`,     icon: 'verified',   color: 'green', trend: `${is.passed} passed of ${is.passed + is.failed}`, trendUp: passRate >= 70 },
      { label: 'Defects Logged',   value: String(ds.total),   icon: 'bug_report', color: 'amber', trend: `${ds.open} open`,                                  trendUp: false },
      { label: 'Critical Defects', value: String(ds.critical),icon: 'report',     color: 'red',   trend: ds.critical > 0 ? 'Needs attention' : 'None',       trendUp: ds.critical === 0 },
    ];
  });

  // ── Pass/Fail trend (line chart) — computed from InspectionService ───────────
  qiTrendData = computed(() => {
    const ins   = this.inspSvc.inspections();
    const today = new Date();
    const labels = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (11 - i));
      return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    });
    const passed = labels.map((_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (11 - i));
      return ins.filter(insp => insp.completedDate && new Date(insp.completedDate).toDateString() === d.toDateString() && insp.status === 'Passed').length;
    });
    const failed = labels.map((_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (11 - i));
      return ins.filter(insp => insp.completedDate && new Date(insp.completedDate).toDateString() === d.toDateString() && insp.status === 'Failed').length;
    });
    return {
      labels,
      datasets: [
        {
          label: 'Passed',
          data: passed,
          borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', fill: true,
          tension: 0.4, pointRadius: 3, borderWidth: 2.5,
        },
        {
          label: 'Failed',
          data: failed,
          borderColor: '#dc2626', backgroundColor: 'transparent', fill: false,
          tension: 0.4, pointRadius: 4, pointBackgroundColor: '#dc2626', borderWidth: 2,
          borderDash: [4, 4],
        },
      ],
    };
  });

  qiTrendOptions = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: true, position: 'top' as const, align: 'end' as const,
        labels: { boxWidth: 10, boxHeight: 2, font: { size: 11 }, color: '#9ca3af', padding: 14, usePointStyle: true, pointStyle: 'line' as const } },
      tooltip: { backgroundColor: '#1e2a3b', titleColor: '#e5e7eb', bodyColor: '#94a3b8', padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 }, maxTicksLimit: 7 } },
      y: { min: 0, grid: { color: 'rgba(243,244,246,0.8)' }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 }, stepSize: 1 } },
    },
  };

  // ── Defect by type donut — computed from InspectionService ───────────────────
  qiDefectData = computed(() => {
    const defects = this.inspSvc.defects();
    const types   = ['Dimensional', 'Surface', 'Seal', 'Assembly', 'Welding'];
    const colors  = ['#2563eb','#d97706','#dc2626','#8b5cf6','#0ea5e9'];
    const counts  = types.map(t => defects.filter(d => d.defectType?.toLowerCase().includes(t.toLowerCase())).length);
    const other   = Math.max(0, defects.length - counts.reduce((a,b) => a+b, 0));
    return {
      labels: [...types, 'Other'],
      datasets: [{ data: [...counts, other],
        backgroundColor: [...colors, '#9ca3af'],
        borderColor: Array(6).fill('#fff'), borderWidth: 3, hoverOffset: 6 }],
    };
  });
  qiDefectOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1e2a3b', titleColor: '#e5e7eb', bodyColor: '#94a3b8', padding: 10, cornerRadius: 8 },
    },
  };
  qiDefectLegend = computed(() => {
    const defects = this.inspSvc.defects();
    const types   = [
      { label: 'Dimensional Error', key: 'Dimensional', color: '#2563eb' },
      { label: 'Surface Defect',    key: 'Surface',     color: '#d97706' },
      { label: 'Seal/Gasket',       key: 'Seal',        color: '#dc2626' },
      { label: 'Assembly Error',    key: 'Assembly',    color: '#8b5cf6' },
      { label: 'Welding Defect',    key: 'Welding',     color: '#0ea5e9' },
    ];
    return types.map(t => ({
      label: t.label, color: t.color,
      count: defects.filter(d => d.defectType?.toLowerCase().includes(t.key.toLowerCase())).length,
    }));
  });

  // ── Recent inspections needing action ────────────────────────────────────────
  // ── QI pending inspections — from InspectionService ─────────────────────────
  qiPendingIns = computed(() => {
    const palette: Record<string, string> = {
      'Emily Clark': '#8b5cf6', 'Amy Zhang': '#ec4899',
      'Carlos Ramos': '#14b8a6', 'Linda Brown': '#0ea5e9',
    };
    return this.inspSvc.inspections()
      .filter(i => i.status === 'Pending' || i.status === 'In Review')
      .slice(0, 4)
      .map(i => ({
        insNumber: i.insNumber,
        woRef:     i.woRef,
        product:   i.product,
        priority:  i.priority,
        status:    i.status,
        inspector: i.inspector,
        color:     palette[i.inspector] ?? '#6b7280',
      }));
  });

  qiPriorityColor(p: string): string {
    return { Low: '#6b7280', Medium: '#2563eb', High: '#d97706', Critical: '#dc2626' }[p] ?? '#6b7280';
  }
  qiStatusColor(s: string): string {
    return { Pending: '#6b7280', 'In Review': '#2563eb', Passed: '#059669', Failed: '#dc2626' }[s] ?? '#6b7280';
  }

  // ── Inventory Manager KPIs — computed from InventoryService ──────────────────
  imKpis = computed(() => {
    const ss  = this.invSvc.stockStats();
    const pos = this.invSvc.poStats();
    const val = ss.totalValue >= 1000
      ? `£${Math.round(ss.totalValue / 1000)}K` : `£${Math.round(ss.totalValue)}`;
    return [
      { label: 'Total Items',     value: String(ss.total),  icon: 'inventory_2',   color: 'blue',   trend: `${ss.ok} at OK level`,         trendUp: true           },
      { label: 'Low Stock Alerts',value: String(ss.low),    icon: 'warning',       color: 'red',    trend: ss.low > 0 ? 'Action needed' : 'All stocked', trendUp: ss.low === 0 },
      { label: 'Open POs',        value: String(pos.pending),icon: 'shopping_cart', color: 'indigo', trend: `${pos.urgent} urgent`,          trendUp: false          },
      { label: 'Stock Value',     value: val,               icon: 'payments',      color: 'green',  trend: 'Total inventory value',        trendUp: true           },
    ];
  });

  // ── Stock level bar chart — computed from InventoryService ───────────────────
  imStockChartData = computed(() => {
    const items = this.invSvc.stockItems().slice(0, 8);
    const pcts  = items.map(i => i.minStock > 0 ? Math.min(100, Math.round((i.currentStock / i.minStock) * 100)) : 100);
    return {
      labels: items.map(i => i.name.length > 12 ? i.name.slice(0, 12) + '…' : i.name),
      datasets: [
        {
          label: 'Current Stock %',
          data: pcts,
          backgroundColor: (ctx: any) => {
            const v = ctx.raw as number;
            return v <= 20 ? 'rgba(220,38,38,0.75)' : v >= 90 ? 'rgba(217,119,6,0.75)' : 'rgba(5,150,105,0.75)';
          },
          borderRadius: 5,
        },
      ],
    };
  });

  imStockChartOptions = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1e2a3b', titleColor: '#e5e7eb', bodyColor: '#94a3b8', padding: 10, cornerRadius: 8,
        callbacks: { label: (ctx: any) => `  ${ctx.raw}% of max stock` } },
    },
    scales: {
      x: { min: 0, max: 100, grid: { color: 'rgba(243,244,246,0.8)' }, border: { display: false },
           ticks: { color: '#9ca3af', font: { size: 11 }, callback: (v: any) => v + '%' } },
      y: { grid: { display: false }, border: { display: false }, ticks: { color: '#374151', font: { size: 11 } } },
    },
  };

  // ── Low stock items — from InventoryService ───────────────────────────────────
  imLowStock = computed(() =>
    this.invSvc.stockItems()
      .filter(i => i.currentStock <= i.minStock)
      .slice(0, 4)
      .map(i => ({
        sku:      i.sku,
        name:     i.name,
        current:  i.currentStock,
        min:      i.minStock,
        unit:     i.unit,
        supplier: i.supplier,
        color:    i.currentStock === 0 ? '#dc2626' :
                  i.currentStock < i.minStock * 0.5 ? '#dc2626' : '#d97706',
      }))
  );

  imStockPct(current: number, min: number): number {
    return Math.round((current / min) * 100);
  }

  // ── Compliance Officer KPIs ───────────────────────────────────────────────────
  // ── Compliance Officer KPIs — computed from ComplianceService ────────────────
  coKpis = computed(() => {
    const rs = this.compSvc.reportStats();
    const as = this.compSvc.auditStats();
    return [
      { label: 'Total Reports',    value: String(rs.total),   icon: 'policy',   color: 'blue',   trend: 'All periods',                               trendUp: true           },
      { label: 'Pending Approval', value: String(rs.pending), icon: 'pending',  color: 'amber',  trend: rs.pending > 0 ? 'Action needed' : 'None',   trendUp: rs.pending === 0 },
      { label: 'Overdue Reports',  value: String(rs.overdue), icon: 'alarm',    color: 'red',    trend: rs.overdue > 0 ? 'Past deadline' : 'On track',trendUp: rs.overdue === 0 },
      { label: 'Audit Events',     value: String(as.total),   icon: 'history',  color: 'indigo', trend: `${as.errors} errors, ${as.warnings} warnings`,trendUp: as.errors === 0 },
    ];
  });

  // ── Report status donut — computed from ComplianceService ────────────────────
  coStatusData = computed(() => {
    const reports  = this.compSvc.reports();
    const statuses = ['Draft', 'Under Review', 'Approved', 'Submitted', 'Rejected'];
    const counts   = statuses.map(s => reports.filter(r => r.status === s).length);
    return {
      labels: statuses,
      datasets: [{
        data: counts,
        backgroundColor: ['#9ca3af', '#d97706', '#2563eb', '#059669', '#dc2626'],
        borderColor: ['#fff','#fff','#fff','#fff','#fff'], borderWidth: 3, hoverOffset: 6,
      }],
    };
  });
  coStatusOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1e2a3b', titleColor: '#e5e7eb', bodyColor: '#94a3b8', padding: 10, cornerRadius: 8 },
    },
  };
  coStatusLegend = computed(() => {
    const reports  = this.compSvc.reports();
    const statuses = [
      { label: 'Draft',        color: '#9ca3af' },
      { label: 'Under Review', color: '#d97706' },
      { label: 'Approved',     color: '#2563eb' },
      { label: 'Submitted',    color: '#059669' },
      { label: 'Rejected',     color: '#dc2626' },
    ];
    return statuses.map(s => ({ ...s, count: reports.filter(r => r.status === s.label).length }));
  });

  // ── Audit events trend — computed from ComplianceService ─────────────────────
  coAuditTrendData = computed(() => {
    const logs  = this.compSvc.auditLogs();
    const today = new Date();
    const labels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (6 - i));
      return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    });
    const info    = labels.map((_, i) => { const d = new Date(today); d.setDate(today.getDate() - (6-i)); return logs.filter(l => l.severity === 'info'    && new Date(l.timestamp).toDateString() === d.toDateString()).length; });
    const warning = labels.map((_, i) => { const d = new Date(today); d.setDate(today.getDate() - (6-i)); return logs.filter(l => l.severity === 'warning' && new Date(l.timestamp).toDateString() === d.toDateString()).length; });
    const error   = labels.map((_, i) => { const d = new Date(today); d.setDate(today.getDate() - (6-i)); return logs.filter(l => l.severity === 'error'   && new Date(l.timestamp).toDateString() === d.toDateString()).length; });
    return {
      labels,
      datasets: [
        { label: 'Info',    data: info,    backgroundColor: 'rgba(37,99,235,0.7)',  borderRadius: 4 },
        { label: 'Warning', data: warning, backgroundColor: 'rgba(217,119,6,0.7)',  borderRadius: 4 },
        { label: 'Error',   data: error,   backgroundColor: 'rgba(220,38,38,0.75)', borderRadius: 4 },
      ],
    };
  });
  coAuditTrendOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const, align: 'end' as const,
        labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, color: '#9ca3af', padding: 12 } },
      tooltip: { backgroundColor: '#1e2a3b', titleColor: '#e5e7eb', bodyColor: '#94a3b8', padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
      y: { stacked: true, min: 0, grid: { color: 'rgba(243,244,246,0.8)' }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 }, stepSize: 4 } },
    },
  };

  // ── Recent reports ────────────────────────────────────────────────────────────
  // ── CO recent reports — from ComplianceService ───────────────────────────────
  coRecentReports = computed(() => {
    const typeColors: Record<string, string> = {
      Quality: '#2563eb', Safety: '#dc2626', Environmental: '#059669',
      Production: '#7c3aed', Supplier: '#d97706',
    };
    return this.compSvc.reports().slice(0, 4).map(r => ({
      num:       r.reportNumber,
      title:     r.title,
      type:      r.type,
      status:    r.status,
      deadline:  r.submissionDeadline,
      typeColor: typeColors[r.type] ?? '#6b7280',
    }));
  });

  coStatusColor(s: string): string {
    return { Draft: '#6b7280', 'Under Review': '#d97706', Approved: '#2563eb', Submitted: '#059669', Rejected: '#dc2626' }[s] ?? '#6b7280';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  priorityColor(p: string): string {
    return { Low: '#6b7280', Medium: '#2563eb', High: '#d97706', Critical: '#dc2626' }[p] ?? '#6b7280';
  }

  statusCls(s: string): string {
    return { Planned:'st-planned', 'In Progress':'st-inprogress', 'On Hold':'st-onhold', Completed:'st-completed' }[s] ?? '';
  }

  ngOnInit(): void {
    const r = this.role();
    if (r === 'Admin') {
      this.usrSvc.loadAll();
      this.woSvc.loadAll();
      this.invSvc.loadStock();
      this.invSvc.loadPurchaseOrders();
      this.inspSvc.loadInspections();
      this.compSvc.loadReports();
      this.compSvc.loadAuditLogs();
    }
    if (r === 'ProductionPlanner') { this.woSvc.loadAll(); }
    if (r === 'ShopFloorOperator') { this.woSvc.loadAll(); }
    if (r === 'QualityInspector')  { this.inspSvc.loadInspections(); this.inspSvc.loadDefects(); }
    if (r === 'InventoryManager')  { this.invSvc.loadStock(); this.invSvc.loadPurchaseOrders(); }
    if (r === 'ComplianceOfficer') { this.compSvc.loadReports(); this.compSvc.loadAuditLogs(); }
  }
}
