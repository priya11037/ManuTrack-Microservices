import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { ChartModule } from 'primeng/chart';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule, ChartModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);

  // Current role drives the entire view
  role     = computed(() => this.auth.userRole());
  userName = computed(() => this.auth.currentUser()?.name?.split(' ')[0] ?? 'there');

  selectedRange = signal('This Week');
  dateRanges = ['Today', 'This Week', 'This Month', 'This Quarter', 'This Year'];

  // ── KPI Cards ───────────────────────────────────────────────────────────────
  kpiCards = [
    { label: 'Total Users',    value: '10',  icon: 'group',          color: 'blue',   trend: '+1 this month',  trendUp: true  },
    { label: 'Active Users',   value: '8',   icon: 'person_check',   color: 'green',  trend: '80% of total',   trendUp: true  },
    { label: 'Inactive Users', value: '2',   icon: 'person_off',     color: 'amber',  trend: '20% of total',   trendUp: false },
    { label: 'Login Failures', value: '5',   icon: 'gpp_bad',        color: 'red',    trend: 'Last 24 hours',  trendUp: false },
  ];

  // ── Users by Role (Horizontal Bar Chart) ────────────────────────────────────
  roleChartData = {
    labels: ['Admin', 'Prod. Planner', 'Shop Floor', 'QA Inspector', 'Inventory Mgr', 'Compliance'],
    datasets: [{
      label: 'Users',
      data: [1, 2, 2, 2, 2, 1],
      backgroundColor: [
        '#3b82f6', '#10b981', '#f59e0b',
        '#8b5cf6', '#ef4444', '#0ea5e9',
      ],
      borderRadius: 5,
      barThickness: 18,
    }],
  };

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

  // ── Login Activity Chart (Line) ──────────────────────────────────────────────
  loginChartData = {
    labels: ['May 15', 'May 16', 'May 17', 'May 18', 'May 19', 'May 20', 'May 21',
             'May 22', 'May 23', 'May 24', 'May 25', 'May 26', 'May 27', 'May 28'],
    datasets: [
      {
        label: 'Successful Logins',
        data: [12, 15, 9, 18, 14, 6, 4, 16, 19, 13, 17, 20, 15, 18],
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
        data: [1, 0, 2, 0, 1, 0, 0, 3, 1, 0, 2, 1, 0, 2],
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

  // ── Recent Audit Logs ────────────────────────────────────────────────────────
  auditLogs = [
    { initial: 'J', name: 'John Smith',  action: 'Created Work Order WO-2841',        module: 'WorkOrders', time: '08:10 AM', color: '#2563eb', severity: 'info'    },
    { initial: 'S', name: 'Sarah Lee',   action: 'Updated Inventory: Steel Rods',     module: 'Inventory',  time: '07:55 AM', color: '#10b981', severity: 'info'    },
    { initial: 'J', name: 'John Smith',  action: 'Added new user: Mike Johnson',      module: 'Users',      time: '07:30 AM', color: '#2563eb', severity: 'info'    },
    { initial: 'E', name: 'Emily Clark', action: 'Approved Inspection INS-4421',      module: 'Quality',    time: '07:10 AM', color: '#8b5cf6', severity: 'info'    },
    { initial: '!', name: 'System',      action: 'Failed login: unknown@external.com',module: 'Auth',       time: '06:48 AM', color: '#ef4444', severity: 'error'   },
    { initial: 'R', name: 'Robert Chen', action: 'Generated Compliance Report CR-88', module: 'Compliance', time: '06:45 AM', color: '#f59e0b', severity: 'info'    },
  ];

  // ── System Module Overview ───────────────────────────────────────────────────
  moduleStats = [
    { label: 'Work Orders',         value: '340', icon: 'assignment',       color: '#3b82f6', sub: 'across all statuses'  },
    { label: 'Products Registered', value: '524', icon: 'category',         color: '#10b981', sub: 'active in catalog'     },
    { label: 'Inventory Items',     value: '186', icon: 'inventory_2',      color: '#f59e0b', sub: 'tracked items'         },
    { label: 'Active Inspections',  value: '23',  icon: 'fact_check',       color: '#8b5cf6', sub: 'pending review'        },
    { label: 'Compliance Reports',  value: '5',   icon: 'policy',           color: '#0ea5e9', sub: '2 pending submission'  },
    { label: 'Purchase Orders',     value: '47',  icon: 'shopping_cart',    color: '#ef4444', sub: 'this quarter'          },
  ];

  // ── Production Planner KPIs ──────────────────────────────────────────────────
  plannerKpis = [
    { label: 'Open Work Orders',    value: '7',   icon: 'assignment',       color: 'blue',   trend: '3 due this week',   trendUp: false },
    { label: 'In Progress',         value: '2',   icon: 'autorenew',        color: 'indigo', trend: 'Across 3 lines',    trendUp: true  },
    { label: 'Overdue',             value: '2',   icon: 'warning',          color: 'red',    trend: 'Needs attention',   trendUp: false },
    { label: 'Completed This Month',value: '12',  icon: 'task_alt',         color: 'green',  trend: '↑ 20% vs last mo', trendUp: true  },
  ];

  // ── WO Status Doughnut ───────────────────────────────────────────────────────
  woStatusChartData = {
    labels: ['Planned', 'In Progress', 'On Hold', 'Completed'],
    datasets: [{
      data: [5, 2, 2, 1],
      backgroundColor: ['#6b7280', '#2563eb', '#d97706', '#059669'],
      borderColor: ['#fff', '#fff', '#fff', '#fff'],
      borderWidth: 3,
      hoverOffset: 6,
    }],
  };

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

  woStatusLegend = [
    { label: 'Planned',     count: 5,  color: '#6b7280' },
    { label: 'In Progress', count: 2,  color: '#2563eb' },
    { label: 'On Hold',     count: 2,  color: '#d97706' },
    { label: 'Completed',   count: 1,  color: '#059669' },
  ];

  // ── Production This Week Bar Chart ───────────────────────────────────────────
  productionChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [
      {
        label: 'Planned',
        data: [3, 2, 4, 2, 3],
        backgroundColor: 'rgba(37,99,235,0.15)',
        borderColor: '#2563eb',
        borderWidth: 1.5,
        borderRadius: 5,
      },
      {
        label: 'Completed',
        data: [2, 2, 3, 1, 0],
        backgroundColor: 'rgba(5,150,105,0.75)',
        borderColor: '#059669',
        borderWidth: 0,
        borderRadius: 5,
      },
    ],
  };

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

  // ── Upcoming Work Orders ──────────────────────────────────────────────────────
  upcomingWOs = [
    { woNumber: 'WO-0001', product: 'Shaft Assembly',   priority: 'High',     dueDate: '2025-05-30', assignedTo: 'Mike Johnson',  status: 'In Progress', avatarColor: '#f59e0b', overdue: true  },
    { woNumber: 'WO-0004', product: 'Control Valve',    priority: 'Critical', dueDate: '2025-05-29', assignedTo: 'Amy Zhang',     status: 'In Progress', avatarColor: '#ec4899', overdue: true  },
    { woNumber: 'WO-0005', product: 'Motor Mount',      priority: 'High',     dueDate: '2025-06-05', assignedTo: 'Mike Johnson',  status: 'On Hold',     avatarColor: '#f59e0b', overdue: false },
    { woNumber: 'WO-0002', product: 'Gear Box Unit',    priority: 'Medium',   dueDate: '2025-06-07', assignedTo: 'Tom Wilson',    status: 'Planned',     avatarColor: '#6366f1', overdue: false },
    { woNumber: 'WO-0007', product: 'Shaft Assembly',   priority: 'Medium',   dueDate: '2025-06-12', assignedTo: 'Carlos Ramos',  status: 'Planned',     avatarColor: '#14b8a6', overdue: false },
  ];

  // ── Line utilisation quick stats ──────────────────────────────────────────────
  lineStats = [
    { line: 'Line A', status: 'Active',   wo: 'WO-0001', product: 'Shaft Assembly',  utilColor: '#059669' },
    { line: 'Line B', status: 'On Hold',  wo: 'WO-0005', product: 'Motor Mount',     utilColor: '#d97706' },
    { line: 'Line C', status: 'Active',   wo: 'WO-0004', product: 'Control Valve',   utilColor: '#059669' },
    { line: 'Line D', status: 'Idle',     wo: '—',       product: '—',               utilColor: '#9ca3af' },
  ];

  // ── Shop Floor Operator KPIs ─────────────────────────────────────────────────
  sfKpis = [
    { label: 'Tasks Assigned',    value: '5',  icon: 'assignment',      color: 'blue',   trend: 'Today',          trendUp: true  },
    { label: 'In Progress',       value: '1',  icon: 'autorenew',       color: 'indigo', trend: 'Line A active',  trendUp: true  },
    { label: 'Completed Today',   value: '1',  icon: 'task_alt',        color: 'green',  trend: '20% of tasks',   trendUp: true  },
    { label: 'Flagged Issues',    value: '1',  icon: 'flag',            color: 'amber',  trend: 'Needs attention',trendUp: false },
  ];

  // ── My Tasks Today ────────────────────────────────────────────────────────────
  sfTasks = [
    { woNumber: 'WO-0001', product: 'Shaft Assembly',   status: 'In Progress', priority: 'High',   progress: 64, dueDate: '2025-05-30', overdue: true  },
    { woNumber: 'WO-0002', product: 'Gear Box Unit',    status: 'To Do',       priority: 'Medium', progress: 0,  dueDate: '2025-06-07', overdue: false },
    { woNumber: 'WO-0005', product: 'Motor Mount',      status: 'To Do',       priority: 'High',   progress: 0,  dueDate: '2025-06-05', overdue: false },
    { woNumber: 'WO-0007', product: 'Shaft Assembly',   status: 'To Do',       priority: 'Medium', progress: 0,  dueDate: '2025-06-12', overdue: false },
    { woNumber: 'WO-0003', product: 'Hydraulic Pump',   status: 'Done',        priority: 'Low',    progress: 100,dueDate: '2025-05-20', overdue: false },
  ];

  sfStatusColor(s: string): string {
    return { 'To Do': '#6b7280', 'In Progress': '#2563eb', Done: '#059669' }[s] ?? '#6b7280';
  }
  sfPriorityColor(p: string): string {
    return { Low: '#6b7280', Medium: '#2563eb', High: '#d97706', Critical: '#dc2626' }[p] ?? '#6b7280';
  }

  // ── Week output chart ────────────────────────────────────────────────────────
  sfOutputChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [
      {
        label: 'Target',
        data: [10, 10, 10, 10, 10],
        backgroundColor: 'rgba(37,99,235,0.12)',
        borderColor: '#2563eb', borderWidth: 1.5, borderRadius: 5,
      },
      {
        label: 'Produced',
        data: [10, 8, 7, 5, 2],
        backgroundColor: 'rgba(5,150,105,0.75)',
        borderColor: '#059669', borderWidth: 0, borderRadius: 5,
      },
    ],
  };

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
      y: { min: 0, max: 12, grid: { color: 'rgba(243,244,246,0.8)' }, border: { display: false },
           ticks: { color: '#9ca3af', font: { size: 11 }, stepSize: 2 } },
    },
  };

  // ── Task completion donut ─────────────────────────────────────────────────────
  sfDonutData = {
    labels: ['Done', 'In Progress', 'To Do'],
    datasets: [{ data: [1, 1, 3], backgroundColor: ['#059669', '#2563eb', '#e5e7eb'],
      borderColor: ['#fff','#fff','#fff'], borderWidth: 3, hoverOffset: 6 }],
  };
  sfDonutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1e2a3b', titleColor: '#e5e7eb', bodyColor: '#94a3b8', padding: 10, cornerRadius: 8 },
    },
  };
  sfDonutLegend = [
    { label: 'Done',        count: 1, color: '#059669' },
    { label: 'In Progress', count: 1, color: '#2563eb' },
    { label: 'To Do',       count: 3, color: '#9ca3af' },
  ];

  // ── Quality Inspector KPIs ────────────────────────────────────────────────────
  qiKpis = [
    { label: 'Open Inspections', value: '3',   icon: 'pending',      color: 'blue',   trend: 'Awaiting review',  trendUp: false },
    { label: 'Pass Rate',        value: '75%',  icon: 'verified',     color: 'green',  trend: '↑ 5% vs last wk', trendUp: true  },
    { label: 'Defects Logged',   value: '5',    icon: 'bug_report',   color: 'amber',  trend: 'This month',      trendUp: false },
    { label: 'Critical Defects', value: '2',    icon: 'report',       color: 'red',    trend: 'Needs attention',  trendUp: false },
  ];

  // ── Pass/Fail trend (line chart) ─────────────────────────────────────────────
  qiTrendData = {
    labels: ['May 19','May 20','May 21','May 22','May 23','May 24','May 25','May 26','May 27','May 28','May 29','May 30'],
    datasets: [
      {
        label: 'Passed',
        data: [3, 2, 4, 3, 2, 5, 3, 4, 2, 3, 1, 2],
        borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', fill: true,
        tension: 0.4, pointRadius: 3, borderWidth: 2.5,
      },
      {
        label: 'Failed',
        data: [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 2, 1],
        borderColor: '#dc2626', backgroundColor: 'transparent', fill: false,
        tension: 0.4, pointRadius: 4, pointBackgroundColor: '#dc2626', borderWidth: 2,
        borderDash: [4, 4],
      },
    ],
  };

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

  // ── Defect by type donut ─────────────────────────────────────────────────────
  qiDefectData = {
    labels: ['Dimensional', 'Surface', 'Seal Failure', 'Assembly', 'Welding'],
    datasets: [{ data: [2, 1, 1, 1, 1],
      backgroundColor: ['#2563eb','#d97706','#dc2626','#8b5cf6','#0ea5e9'],
      borderColor: ['#fff','#fff','#fff','#fff','#fff'], borderWidth: 3, hoverOffset: 6 }],
  };
  qiDefectOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1e2a3b', titleColor: '#e5e7eb', bodyColor: '#94a3b8', padding: 10, cornerRadius: 8 },
    },
  };
  qiDefectLegend = [
    { label: 'Dimensional Error', count: 2, color: '#2563eb' },
    { label: 'Surface Defect',    count: 1, color: '#d97706' },
    { label: 'Seal/Gasket',       count: 1, color: '#dc2626' },
    { label: 'Assembly Error',    count: 1, color: '#8b5cf6' },
  ];

  // ── Recent inspections needing action ────────────────────────────────────────
  qiPendingIns = [
    { insNumber: 'INS-1002', woRef: 'WO-0004', product: 'Control Valve',   priority: 'Critical', status: 'In Review', inspector: 'Amy Zhang',    color: '#ec4899' },
    { insNumber: 'INS-1004', woRef: 'WO-0002', product: 'Gear Box Unit',   priority: 'Medium',   status: 'Pending',   inspector: 'Carlos Ramos', color: '#14b8a6' },
    { insNumber: 'INS-1006', woRef: 'WO-0005', product: 'Motor Mount',     priority: 'High',     status: 'Pending',   inspector: 'Amy Zhang',    color: '#ec4899' },
    { insNumber: 'INS-1008', woRef: 'WO-0007', product: 'Shaft Assembly',  priority: 'Medium',   status: 'Pending',   inspector: 'Emily Clark',  color: '#8b5cf6' },
  ];

  qiPriorityColor(p: string): string {
    return { Low: '#6b7280', Medium: '#2563eb', High: '#d97706', Critical: '#dc2626' }[p] ?? '#6b7280';
  }
  qiStatusColor(s: string): string {
    return { Pending: '#6b7280', 'In Review': '#2563eb', Passed: '#059669', Failed: '#dc2626' }[s] ?? '#6b7280';
  }

  // ── Inventory Manager KPIs ───────────────────────────────────────────────────
  imKpis = [
    { label: 'Total Items',     value: '12',   icon: 'inventory_2',   color: 'blue',   trend: 'In catalog',       trendUp: true  },
    { label: 'Low Stock Alerts',value: '4',    icon: 'warning',       color: 'red',    trend: 'Action needed',    trendUp: false },
    { label: 'Open POs',        value: '5',    icon: 'shopping_cart', color: 'indigo', trend: '2 urgent',         trendUp: false },
    { label: 'Stock Value',     value: '£24K', icon: 'payments',      color: 'green',  trend: 'Total inventory',  trendUp: true  },
  ];

  // ── Stock level bar chart ────────────────────────────────────────────────────
  imStockChartData = {
    labels: ['Steel Rod', 'Steel Plate', 'Bearing', 'O-Ring', 'Seal Kit', 'Valve Body', 'Cutting Oil', 'Weld Wire'],
    datasets: [
      {
        label: 'Current Stock %',
        data: [84, 9, 80, 60, 19, 19, 60, 16],
        backgroundColor: (ctx: any) => {
          const v = ctx.raw as number;
          return v <= 20 ? 'rgba(220,38,38,0.75)' : v >= 90 ? 'rgba(217,119,6,0.75)' : 'rgba(5,150,105,0.75)';
        },
        borderRadius: 5,
      },
    ],
  };

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

  // ── Low stock items ───────────────────────────────────────────────────────────
  imLowStock = [
    { sku: 'RM-002', name: 'Steel Plate 6mm',      current: 45,  min: 100, unit: 'kg',  supplier: 'SteelCo Ltd',        color: '#dc2626' },
    { sku: 'CM-003', name: 'Hydraulic Seal Kit',   current: 28,  min: 40,  unit: 'pcs', supplier: 'GlobalSupply Co',    color: '#d97706' },
    { sku: 'CM-005', name: 'Control Valve Body',   current: 15,  min: 20,  unit: 'pcs', supplier: 'PrecisionParts Inc', color: '#dc2626' },
    { sku: 'CS-002', name: 'Welding Wire 0.8mm',   current: 8,   min: 10,  unit: 'rolls',supplier: 'GlobalSupply Co',   color: '#dc2626' },
  ];

  imStockPct(current: number, min: number): number {
    return Math.round((current / min) * 100);
  }

  // ── Compliance Officer KPIs ───────────────────────────────────────────────────
  coKpis = [
    { label: 'Total Reports',    value: '7',   icon: 'policy',        color: 'blue',   trend: 'All periods',      trendUp: true  },
    { label: 'Pending Approval', value: '2',   icon: 'pending',       color: 'amber',  trend: 'Action needed',    trendUp: false },
    { label: 'Overdue Reports',  value: '1',   icon: 'alarm',         color: 'red',    trend: 'Past deadline',    trendUp: false },
    { label: 'Audit Events',     value: '12',  icon: 'history',       color: 'indigo', trend: 'Last 2 days',      trendUp: true  },
  ];

  // ── Report status donut ───────────────────────────────────────────────────────
  coStatusData = {
    labels: ['Draft', 'Under Review', 'Approved', 'Submitted', 'Rejected'],
    datasets: [{
      data: [1, 1, 2, 2, 1],
      backgroundColor: ['#9ca3af', '#d97706', '#2563eb', '#059669', '#dc2626'],
      borderColor: ['#fff','#fff','#fff','#fff','#fff'], borderWidth: 3, hoverOffset: 6,
    }],
  };
  coStatusOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1e2a3b', titleColor: '#e5e7eb', bodyColor: '#94a3b8', padding: 10, cornerRadius: 8 },
    },
  };
  coStatusLegend = [
    { label: 'Draft',        count: 1, color: '#9ca3af' },
    { label: 'Under Review', count: 1, color: '#d97706' },
    { label: 'Approved',     count: 2, color: '#2563eb' },
    { label: 'Submitted',    count: 2, color: '#059669' },
    { label: 'Rejected',     count: 1, color: '#dc2626' },
  ];

  // ── Audit events trend ────────────────────────────────────────────────────────
  coAuditTrendData = {
    labels: ['May 24','May 25','May 26','May 27','May 28','May 29','May 30'],
    datasets: [
      { label: 'Info',    data: [8,6,10,7,9,5,4], backgroundColor: 'rgba(37,99,235,0.7)',   borderRadius: 4 },
      { label: 'Warning', data: [1,2,1,0,1,2,1],  backgroundColor: 'rgba(217,119,6,0.7)',   borderRadius: 4 },
      { label: 'Error',   data: [0,0,1,0,0,1,1],  backgroundColor: 'rgba(220,38,38,0.75)',  borderRadius: 4 },
    ],
  };
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
  coRecentReports = [
    { num: 'CR-0088', title: 'Q2 2025 Quality Compliance Review',       type: 'Quality',       status: 'Submitted',   deadline: '2025-06-01', typeColor: '#2563eb' },
    { num: 'CR-0089', title: 'May 2025 Safety Incident Report',          type: 'Safety',        status: 'Approved',    deadline: '2025-06-05', typeColor: '#dc2626' },
    { num: 'CR-0090', title: 'Environmental Impact Assessment H1 2025',  type: 'Environmental', status: 'Under Review', deadline: '2025-06-15', typeColor: '#059669' },
    { num: 'CR-0091', title: 'Production Efficiency Compliance Q2',      type: 'Production',    status: 'Draft',        deadline: '2025-06-20', typeColor: '#7c3aed' },
  ];

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

  ngOnInit(): void {}
}
