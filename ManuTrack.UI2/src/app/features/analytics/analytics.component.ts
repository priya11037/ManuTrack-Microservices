import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChartModule } from 'primeng/chart';
import { AuthService } from '../../core/auth/auth.service';

// ── Shared types ──────────────────────────────────────────────────────────────
interface KpiCard {
  label: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'indigo' | 'teal';
  trend: string;
  trendUp: boolean;
  trendValue: string;
}

interface TableRow { [key: string]: string | number; }

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatMenuModule, MatButtonModule, MatTooltipModule, ChartModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent {
  private auth = inject(AuthService);

  role     = computed(() => this.auth.userRole());
  userName = computed(() => this.auth.currentUser()?.name?.split(' ')[0] ?? '');

  selectedRange = signal('Last 30 Days');
  dateRanges    = ['Last 7 Days', 'Last 30 Days', 'Last Quarter', 'This Year'];

  // ── Common chart options ───────────────────────────────────────────────────
  private tooltipBase = {
    backgroundColor: '#1e2a3b', titleColor: '#e5e7eb',
    bodyColor: '#94a3b8', padding: 12, cornerRadius: 10,
  };

  private gridBase = {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
    y: { grid: { color: 'rgba(243,244,246,0.8)' }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
  };

  lineOpts = (max?: number) => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { display: true, position: 'top' as const, align: 'end' as const,
      labels: { boxWidth: 10, boxHeight: 2, font: { size: 11 }, color: '#9ca3af', padding: 14, usePointStyle: true, pointStyle: 'line' as const } },
      tooltip: this.tooltipBase },
    scales: {
      x: this.gridBase.x,
      y: { ...this.gridBase.y, min: 0, ...(max ? { max } : {}) },
    },
  });

  barOpts = (horizontal = false, stacked = false, max?: number) => ({
    responsive: true, maintainAspectRatio: false,
    ...(horizontal ? { indexAxis: 'y' as const } : {}),
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { display: true, position: 'top' as const, align: 'end' as const,
      labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, color: '#9ca3af', padding: 12 } },
      tooltip: this.tooltipBase },
    scales: {
      x: { ...this.gridBase.x, stacked, ...(max && !horizontal ? { max } : {}) },
      y: { ...this.gridBase.y, stacked, ...(max && horizontal ? { max } : {}), min: 0 },
    },
  });

  donutOpts = (cutout = '68%') => ({
    responsive: true, maintainAspectRatio: false, cutout,
    plugins: { legend: { display: false }, tooltip: this.tooltipBase },
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  PRODUCTION PLANNER
  // ══════════════════════════════════════════════════════════════════════════
  ppKpis: KpiCard[] = [
    { label: 'On-Time Delivery',    value: '87%',     icon: 'schedule',      color: 'blue',   trend: '↑ vs last period', trendValue: '+5%',  trendUp: true  },
    { label: 'WO Completion Rate',  value: '92%',     icon: 'task_alt',      color: 'green',  trend: '↑ vs last period', trendValue: '+3%',  trendUp: true  },
    { label: 'Avg Cycle Time',      value: '3.2d',    icon: 'hourglass_top', color: 'amber',  trend: '↓ vs last period', trendValue: '-0.4d',trendUp: true  },
    { label: 'Line Utilisation',    value: '78%',     icon: 'factory',       color: 'indigo', trend: '↓ vs last period', trendValue: '-2%',  trendUp: false },
  ];

  // Production output trend
  ppOutputData = {
    labels: this.last30Days(),
    datasets: [
      { label: 'Planned', data: this.randomData(30, 8, 15), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
      { label: 'Actual',  data: this.randomData(30, 6, 14), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)',  fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
    ],
  };
  ppOutputOpts = this.lineOpts(16);

  // WO Status donut
  ppWoStatusData = {
    labels: ['Completed', 'In Progress', 'Planned', 'On Hold', 'Overdue'],
    datasets: [{ data: [34, 5, 7, 2, 2], backgroundColor: ['#059669','#2563eb','#9ca3af','#d97706','#dc2626'], borderColor: '#fff', borderWidth: 3, hoverOffset: 6 }],
  };
  ppWoStatusOpts  = this.donutOpts();
  ppWoStatusLegend = [
    { label: 'Completed',   count: 34, color: '#059669' },
    { label: 'In Progress', count: 5,  color: '#2563eb' },
    { label: 'Planned',     count: 7,  color: '#9ca3af' },
    { label: 'On Hold',     count: 2,  color: '#d97706' },
    { label: 'Overdue',     count: 2,  color: '#dc2626' },
  ];

  // On-time delivery by week
  ppOnTimeData = {
    labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
    datasets: [
      { label: 'On-Time %', data: [82, 89, 85, 92], backgroundColor: 'rgba(37,99,235,0.75)', borderRadius: 6 },
      { label: 'Target',    data: [90, 90, 90, 90], backgroundColor: 'rgba(5,150,105,0.2)',   borderRadius: 6 },
    ],
  };
  ppOnTimeOpts = this.barOpts(false, false, 100);

  // Line utilisation horizontal bar
  ppLineData = {
    labels: ['Line A', 'Line B', 'Line C', 'Line D'],
    datasets: [{ label: 'Utilisation %', data: [92, 78, 65, 45],
      backgroundColor: ['rgba(5,150,105,0.75)','rgba(37,99,235,0.75)','rgba(217,119,6,0.75)','rgba(220,38,38,0.75)'], borderRadius: 6 }],
  };
  ppLineOpts = this.barOpts(true, false, 100);

  // KPI table
  ppTableHeaders = ['Work Order', 'Product', 'Line', 'Planned Qty', 'Actual Qty', 'On-Time', 'Cycle Time', 'Status'];
  ppTableRows: TableRow[] = [
    { wo: 'WO-0001', product: 'Shaft Assembly', line: 'Line A', planned: 50,  actual: 50,  onTime: '✅ Yes', cycle: '2.1d', status: 'Completed'   },
    { wo: 'WO-0003', product: 'Hydraulic Pump', line: 'Line A', planned: 10,  actual: 10,  onTime: '✅ Yes', cycle: '4.8d', status: 'Completed'   },
    { wo: 'WO-0008', product: 'Gear Box Unit',  line: 'Line A', planned: 15,  actual: 15,  onTime: '✅ Yes', cycle: '3.2d', status: 'Completed'   },
    { wo: 'WO-0004', product: 'Control Valve',  line: 'Line C', planned: 100, actual: 45,  onTime: '❌ No',  cycle: '—',    status: 'In Progress' },
    { wo: 'WO-0002', product: 'Gear Box Unit',  line: 'Line B', planned: 20,  actual: 0,   onTime: '—',     cycle: '—',    status: 'Planned'     },
    { wo: 'WO-0005', product: 'Motor Mount',    line: 'Line B', planned: 30,  actual: 0,   onTime: '—',     cycle: '—',    status: 'On Hold'     },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  //  QUALITY INSPECTOR
  // ══════════════════════════════════════════════════════════════════════════
  qiKpis: KpiCard[] = [
    { label: 'First Pass Yield',    value: '75%',  icon: 'verified',      color: 'green',  trend: '↑ vs last period', trendValue: '+5%',  trendUp: true  },
    { label: 'Defect Rate',         value: '8.3%', icon: 'bug_report',    color: 'red',    trend: '↑ vs last period', trendValue: '+1.2%',trendUp: false },
    { label: 'Inspections Done',    value: '8',    icon: 'fact_check',    color: 'blue',   trend: 'This month',       trendValue: '8',    trendUp: true  },
    { label: 'Critical Defects',    value: '2',    icon: 'report',        color: 'amber',  trend: '↓ vs last period', trendValue: '-1',   trendUp: true  },
  ];

  // Pass / Fail trend
  qiTrendData = {
    labels: this.last30Days(),
    datasets: [
      { label: 'Passed', data: this.randomData(30, 2, 6), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
      { label: 'Failed', data: this.randomData(30, 0, 2), borderColor: '#dc2626', backgroundColor: 'transparent', fill: false, tension: 0.4, pointRadius: 3, borderWidth: 1.8, borderDash: [4,4] },
    ],
  };
  qiTrendOpts = this.lineOpts(8);

  // Defect by type donut
  qiDefectTypeData = {
    labels: ['Dimensional', 'Surface', 'Seal Failure', 'Assembly', 'Welding', 'Other'],
    datasets: [{ data: [2, 1, 1, 1, 1, 1], backgroundColor: ['#2563eb','#d97706','#dc2626','#8b5cf6','#0ea5e9','#9ca3af'], borderColor: '#fff', borderWidth: 3, hoverOffset: 6 }],
  };
  qiDefectTypeOpts  = this.donutOpts();
  qiDefectTypeLegend = [
    { label: 'Dimensional Error', count: 2, color: '#2563eb' },
    { label: 'Surface Defect',    count: 1, color: '#d97706' },
    { label: 'Seal Failure',      count: 1, color: '#dc2626' },
    { label: 'Assembly Error',    count: 1, color: '#8b5cf6' },
    { label: 'Welding Defect',    count: 1, color: '#0ea5e9' },
  ];

  // Inspection results by product (bar)
  qiByProductData = {
    labels: ['Shaft Assy', 'Gear Box', 'Hydraulic Pump', 'Control Valve', 'Motor Mount'],
    datasets: [
      { label: 'Passed',      data: [1, 1, 1, 0, 0], backgroundColor: 'rgba(5,150,105,0.75)',   borderRadius: 5 },
      { label: 'Failed',      data: [0, 0, 1, 1, 0], backgroundColor: 'rgba(220,38,38,0.75)',   borderRadius: 5 },
      { label: 'In Review',   data: [0, 0, 0, 1, 0], backgroundColor: 'rgba(37,99,235,0.75)',   borderRadius: 5 },
      { label: 'Pending',     data: [0, 0, 0, 0, 1], backgroundColor: 'rgba(107,114,128,0.5)', borderRadius: 5 },
    ],
  };
  qiByProductOpts = this.barOpts(false, true, 3);

  // Root cause horizontal bar
  qiRootCauseData = {
    labels: ['Material Issue', 'Machine Fault', 'Human Error', 'Process Deviation', 'Tool Wear'],
    datasets: [{ label: 'Defects', data: [2, 1, 1, 1, 1], backgroundColor: ['#dc2626','#d97706','#2563eb','#8b5cf6','#9ca3af'], borderRadius: 5 }],
  };
  qiRootCauseOpts = this.barOpts(true);

  // KPI table
  qiTableHeaders = ['Inspection #', 'Product', 'WO Ref', 'Qty Inspected', 'Defective', 'Defect Rate', 'Result', 'Inspector'];
  qiTableRows: TableRow[] = [
    { ins: 'INS-1001', product: 'Shaft Assembly',  wo: 'WO-0001', inspected: 50, defective: 0, rate: '0.0%',  result: '✅ Passed',    inspector: 'Emily Clark' },
    { ins: 'INS-1002', product: 'Control Valve',   wo: 'WO-0004', inspected: 45, defective: 5, rate: '11.1%', result: '🔍 In Review', inspector: 'Amy Zhang'   },
    { ins: 'INS-1003', product: 'Hydraulic Pump',  wo: 'WO-0009', inspected: 8,  defective: 6, rate: '75.0%', result: '❌ Failed',    inspector: 'Emily Clark' },
    { ins: 'INS-1005', product: 'Gear Box Unit',   wo: 'WO-0008', inspected: 15, defective: 0, rate: '0.0%',  result: '✅ Passed',    inspector: 'Linda Brown' },
    { ins: 'INS-1007', product: 'Hydraulic Pump',  wo: 'WO-0003', inspected: 10, defective: 0, rate: '0.0%',  result: '✅ Passed',    inspector: 'Carlos Ramos'},
  ];

  // ══════════════════════════════════════════════════════════════════════════
  //  INVENTORY MANAGER
  // ══════════════════════════════════════════════════════════════════════════
  imKpis: KpiCard[] = [
    { label: 'Stock Turnover',      value: '4.2x', icon: 'autorenew',      color: 'green',  trend: '↑ vs last period', trendValue: '+0.3x', trendUp: true  },
    { label: 'PO Fulfillment Rate', value: '89%',  icon: 'local_shipping', color: 'blue',   trend: '↑ vs last period', trendValue: '+4%',   trendUp: true  },
    { label: 'Low Stock Events',    value: '4',    icon: 'warning',        color: 'red',    trend: '↑ vs last period', trendValue: '+2',    trendUp: false },
    { label: 'Inventory Value',     value: '£24K', icon: 'payments',       color: 'teal',   trend: '↓ vs last period', trendValue: '-£2K',  trendUp: false },
  ];

  // Stock movement trend
  imStockTrendData = {
    labels: this.last30Days(),
    datasets: [
      { label: 'Stock In',  data: this.randomData(30, 50, 300), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)',  fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
      { label: 'Stock Out', data: this.randomData(30, 30, 250), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.05)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
    ],
  };
  imStockTrendOpts = this.lineOpts();

  // Inventory by category donut
  imCategoryData = {
    labels: ['Raw Material', 'Component', 'Consumable', 'Packaging', 'Finished Good'],
    datasets: [{ data: [38, 42, 8, 7, 5], backgroundColor: ['#2563eb','#059669','#d97706','#8b5cf6','#0ea5e9'], borderColor: '#fff', borderWidth: 3, hoverOffset: 6 }],
  };
  imCategoryOpts  = this.donutOpts();
  imCategoryLegend = [
    { label: 'Raw Material', pct: 38, color: '#2563eb' },
    { label: 'Component',    pct: 42, color: '#059669' },
    { label: 'Consumable',   pct: 8,  color: '#d97706' },
    { label: 'Packaging',    pct: 7,  color: '#8b5cf6' },
    { label: 'Finished Good',pct: 5,  color: '#0ea5e9' },
  ];

  // PO status bar
  imPoStatusData = {
    labels: ['Draft', 'Submitted', 'Approved', 'Ordered', 'Received'],
    datasets: [{ label: 'Purchase Orders', data: [2, 1, 2, 1, 2],
      backgroundColor: ['#9ca3af','#2563eb','#d97706','#7c3aed','#059669'], borderRadius: 6 }],
  };
  imPoStatusOpts = this.barOpts();

  // Supplier performance horizontal bar
  imSupplierData = {
    labels: ['SteelCo Ltd', 'PrecisionParts Inc', 'GlobalSupply Co', 'FastenerWorld', 'PackagePro'],
    datasets: [
      { label: 'On-Time %',  data: [92, 78, 85, 96, 70], backgroundColor: 'rgba(5,150,105,0.75)',  borderRadius: 5 },
      { label: 'Quality %',  data: [88, 82, 90, 94, 75], backgroundColor: 'rgba(37,99,235,0.75)', borderRadius: 5 },
    ],
  };
  imSupplierOpts = this.barOpts(true, false, 100);

  // KPI table
  imTableHeaders = ['SKU', 'Item', 'Category', 'Current Stock', 'Min Stock', 'Stock %', 'Turnover', 'Status'];
  imTableRows: TableRow[] = [
    { sku: 'RM-001', item: 'Steel Rod 12mm',      cat: 'Raw Material', current: '840m',  min: '200m',  pct: '84%', turnover: '5.2x', status: '✅ OK'         },
    { sku: 'RM-002', item: 'Steel Plate 6mm',      cat: 'Raw Material', current: '45kg',  min: '100kg', pct: '9%',  turnover: '6.1x', status: '⚠️ Low Stock'  },
    { sku: 'CM-001', item: 'Bearing Unit 6205',    cat: 'Component',    current: '320',   min: '50',    pct: '80%', turnover: '3.8x', status: '✅ OK'         },
    { sku: 'CM-003', item: 'Hydraulic Seal Kit',   cat: 'Component',    current: '28',    min: '40',    pct: '19%', turnover: '4.5x', status: '⚠️ Low Stock'  },
    { sku: 'CM-005', item: 'Control Valve Body',   cat: 'Component',    current: '15',    min: '20',    pct: '19%', turnover: '2.3x', status: '⚠️ Low Stock'  },
    { sku: 'CS-002', item: 'Welding Wire 0.8mm',   cat: 'Consumable',   current: '8',     min: '10',    pct: '16%', turnover: '7.2x', status: '⚠️ Low Stock'  },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  //  COMPLIANCE OFFICER
  // ══════════════════════════════════════════════════════════════════════════
  coKpis: KpiCard[] = [
    { label: 'Submission Rate',     value: '86%',  icon: 'assignment_turned_in', color: 'green',  trend: '↑ vs last period', trendValue: '+8%',   trendUp: true  },
    { label: 'Open Findings',       value: '6',    icon: 'find_in_page',         color: 'red',    trend: '↓ vs last period', trendValue: '-2',    trendUp: true  },
    { label: 'Overdue Reports',     value: '1',    icon: 'alarm',                color: 'amber',  trend: 'Action needed',    trendValue: '1',     trendUp: false },
    { label: 'Avg Resolution Time', value: '8d',   icon: 'timer',                color: 'indigo', trend: '↑ vs last period', trendValue: '+2d',   trendUp: false },
  ];

  // Compliance event trend (stacked bar)
  coEventTrendData = {
    labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
    datasets: [
      { label: 'Info',    data: [28, 32, 25, 19], backgroundColor: 'rgba(37,99,235,0.75)',  borderRadius: 4 },
      { label: 'Warning', data: [4,  6,  3,  5],  backgroundColor: 'rgba(217,119,6,0.75)', borderRadius: 4 },
      { label: 'Error',   data: [1,  0,  2,  1],  backgroundColor: 'rgba(220,38,38,0.75)', borderRadius: 4 },
    ],
  };
  coEventTrendOpts = this.barOpts(false, true);

  // Reports by status donut
  coReportStatusData = {
    labels: ['Submitted', 'Approved', 'Draft', 'Under Review', 'Rejected'],
    datasets: [{ data: [2, 2, 1, 1, 1], backgroundColor: ['#059669','#2563eb','#9ca3af','#d97706','#dc2626'], borderColor: '#fff', borderWidth: 3, hoverOffset: 6 }],
  };
  coReportStatusOpts  = this.donutOpts();
  coReportStatusLegend = [
    { label: 'Submitted',    count: 2, color: '#059669' },
    { label: 'Approved',     count: 2, color: '#2563eb' },
    { label: 'Draft',        count: 1, color: '#9ca3af' },
    { label: 'Under Review', count: 1, color: '#d97706' },
    { label: 'Rejected',     count: 1, color: '#dc2626' },
  ];

  // Findings by module (bar)
  coFindingsData = {
    labels: ['Quality', 'Safety', 'Production', 'Supplier', 'Environmental'],
    datasets: [
      { label: 'Open',     data: [3, 1, 1, 1, 0], backgroundColor: 'rgba(220,38,38,0.75)', borderRadius: 5 },
      { label: 'Resolved', data: [5, 3, 2, 4, 1], backgroundColor: 'rgba(5,150,105,0.75)', borderRadius: 5 },
    ],
  };
  coFindingsOpts = this.barOpts(false, true);

  // Monthly submission rate (bar)
  coSubmissionData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [
      { label: 'Submitted On-Time', data: [90, 85, 92, 88, 86], backgroundColor: 'rgba(37,99,235,0.75)', borderRadius: 5 },
      { label: 'Target',            data: [90, 90, 90, 90, 90], backgroundColor: 'rgba(9,113,241,0.12)', borderRadius: 5 },
    ],
  };
  coSubmissionOpts = this.barOpts(false, false, 100);

  // KPI table
  coTableHeaders = ['Report #', 'Title', 'Type', 'Period', 'Findings', 'Actions', 'Deadline', 'Status'];
  coTableRows: TableRow[] = [
    { num: 'CR-0088', title: 'Q2 Quality Compliance Review',       type: 'Quality',       period: 'Q2 2025',  findings: 3, actions: 5, deadline: '2025-06-01', status: '✅ Submitted'    },
    { num: 'CR-0089', title: 'May Safety Incident Report',          type: 'Safety',        period: 'May 2025', findings: 2, actions: 4, deadline: '2025-06-05', status: '🔵 Approved'     },
    { num: 'CR-0090', title: 'Environmental Impact Assessment H1',  type: 'Environmental', period: 'H1 2025',  findings: 1, actions: 2, deadline: '2025-06-15', status: '🟡 Under Review' },
    { num: 'CR-0091', title: 'Production Efficiency Compliance Q2', type: 'Production',    period: 'Q2 2025',  findings: 0, actions: 0, deadline: '2025-06-20', status: '⬜ Draft'        },
    { num: 'CR-0092', title: 'Supplier Audit — SteelCo Ltd',        type: 'Supplier',      period: 'May 2025', findings: 4, actions: 6, deadline: '2025-06-10', status: '🔵 Approved'     },
    { num: 'CR-0087', title: 'Q1 Annual Safety Review',             type: 'Safety',        period: 'Q1 2025',  findings: 5, actions: 8, deadline: '2025-04-01', status: '✅ Submitted'    },
  ];

  // ── Export CSV ────────────────────────────────────────────────────────────
  exportCSV(): void {
    const role = this.role();
    let headers: string[] = [];
    let rows: TableRow[]  = [];

    if (role === 'ProductionPlanner') { headers = this.ppTableHeaders; rows = this.ppTableRows; }
    else if (role === 'QualityInspector')  { headers = this.qiTableHeaders; rows = this.qiTableRows; }
    else if (role === 'InventoryManager')  { headers = this.imTableHeaders; rows = this.imTableRows; }
    else if (role === 'ComplianceOfficer') { headers = this.coTableHeaders; rows = this.coTableRows; }

    const csv  = [headers.join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `analytics-${role}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private last30Days(): string[] {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
  }

  private randomData(count: number, min: number, max: number): number[] {
    // Deterministic pseudo-random so charts don't jump on re-render
    return Array.from({ length: count }, (_, i) =>
      min + Math.floor(((Math.sin(i * 1.7 + 42) + 1) / 2) * (max - min))
    );
  }

  pageTitle = computed(() => {
    const map: Record<string, string> = {
      ProductionPlanner:  'Production Analytics',
      QualityInspector:   'Quality Analytics',
      InventoryManager:   'Inventory Analytics',
      ComplianceOfficer:  'Compliance Analytics',
    };
    return map[this.role() ?? ''] ?? 'Analytics';
  });

  pageSubtitle = computed(() => {
    const map: Record<string, string> = {
      ProductionPlanner:  'Work order performance, line utilisation and delivery metrics',
      QualityInspector:   'Inspection results, defect rates and quality trends',
      InventoryManager:   'Stock levels, supplier performance and procurement metrics',
      ComplianceOfficer:  'Report submission rates, findings and audit event trends',
    };
    return map[this.role() ?? ''] ?? '';
  });
}
