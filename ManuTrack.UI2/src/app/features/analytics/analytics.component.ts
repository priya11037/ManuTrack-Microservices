import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChartModule } from 'primeng/chart';
import { AuthService } from '../../core/auth/auth.service';
import { WorkOrderService } from '../../core/services/work-order.service';
import { InventoryService } from '../../core/services/inventory.service';
import { InspectionService } from '../../core/services/inspection.service';
import { ComplianceService } from '../../core/services/compliance.service';

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
export class AnalyticsComponent implements OnInit {
  private auth       = inject(AuthService);
  private woSvc      = inject(WorkOrderService);
  private invSvc     = inject(InventoryService);
  private insSvc     = inject(InspectionService);
  private compSvc    = inject(ComplianceService);

  role     = computed(() => this.auth.userRole());
  userName = computed(() => this.auth.currentUser()?.name?.split(' ')[0] ?? '');

  selectedRange = signal('Last 30 Days');
  dateRanges    = ['Last 7 Days', 'Last 30 Days', 'Last Quarter', 'This Year'];
  isLoading     = signal(true);

  // ── Common chart options ─────────────────────────────────────────────────
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
    scales: { x: this.gridBase.x, y: { ...this.gridBase.y, min: 0, ...(max ? { max } : {}) } },
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

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const role = this.role();

    if (role === 'ProductionPlanner' || role === 'Admin') {
      this.woSvc.loadAll();
    }
    if (role === 'QualityInspector' || role === 'Admin') {
      this.insSvc.loadInspections();
      this.insSvc.loadDefects();
    }
    if (role === 'InventoryManager' || role === 'Admin') {
      this.invSvc.loadStock();
      this.invSvc.loadPurchaseOrders();
    }
    if (role === 'ComplianceOfficer' || role === 'Admin') {
      this.compSvc.loadReports();
      this.compSvc.loadAuditLogs();
    }

    this.isLoading.set(false);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PRODUCTION PLANNER — computed from real WorkOrderService data
  // ══════════════════════════════════════════════════════════════════════════
  private woStats = computed(() => this.woSvc.stats());
  private allWOs  = computed(() => this.woSvc.workOrders());

  ppKpis = computed<KpiCard[]>(() => {
    const s = this.woStats();
    const total      = s.total || 1;
    const completed  = s.completed ?? 0;
    const inProgress = s.inProgress ?? 0;
    const overdue    = s.overdue ?? 0;
    const onTimePct  = total > 0 ? Math.round(((completed) / total) * 100) : 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Avg cycle time: average days between startDate and endDate for completed WOs
    const completedWOs = this.allWOs().filter(w => w.status === 'Completed' && w.startDate && w.dueDate);
    const avgCycle = completedWOs.length > 0
      ? (completedWOs.reduce((sum, w) => {
          const diff = (new Date(w.dueDate).getTime() - new Date(w.startDate).getTime()) / (1000 * 60 * 60 * 24);
          return sum + Math.max(0, diff);
        }, 0) / completedWOs.length).toFixed(1)
      : '—';

    // Line utilisation: lines with active WOs / total lines
    const activeLines = new Set(this.allWOs().filter(w => w.status === 'In Progress').map(w => w.line)).size;
    const utilPct = Math.round((activeLines / 4) * 100);

    return [
      { label: 'On-Time Delivery',   value: `${onTimePct}%`,      icon: 'schedule',      color: 'blue',   trend: 'Based on completions', trendValue: `${completed} completed`, trendUp: true  },
      { label: 'WO Completion Rate', value: `${completionRate}%`, icon: 'task_alt',      color: 'green',  trend: 'Of all work orders',   trendValue: `${completed}/${total}`,   trendUp: true  },
      { label: 'Avg Cycle Time',     value: avgCycle === '—' ? '—' : `${avgCycle}d`, icon: 'hourglass_top', color: 'amber', trend: 'Completed WOs', trendValue: `${completedWOs.length} WOs`, trendUp: true },
      { label: 'Line Utilisation',   value: `${utilPct}%`,        icon: 'factory',       color: 'indigo', trend: `${activeLines} of 4 lines active`, trendValue: `${inProgress} in progress`, trendUp: utilPct > 50 },
    ];
  });

  ppWoStatusData = computed(() => {
    const s = this.woStats();
    const completed  = s.completed  ?? 0;
    const inProgress = s.inProgress ?? 0;
    const planned    = s.planned    ?? 0;
    const onHold     = s.onHold     ?? 0;
    const overdue    = s.overdue    ?? 0;
    return {
      labels: ['Completed', 'In Progress', 'Planned', 'On Hold', 'Overdue'],
      datasets: [{ data: [completed, inProgress, planned, onHold, overdue],
        backgroundColor: ['#059669','#2563eb','#9ca3af','#d97706','#dc2626'],
        borderColor: '#fff', borderWidth: 3, hoverOffset: 6 }],
    };
  });

  ppWoStatusOpts  = this.donutOpts();

  ppWoStatusLegend = computed(() => {
    const s = this.woStats();
    return [
      { label: 'Completed',   count: s.completed  ?? 0, color: '#059669' },
      { label: 'In Progress', count: s.inProgress ?? 0, color: '#2563eb' },
      { label: 'Planned',     count: s.planned    ?? 0, color: '#9ca3af' },
      { label: 'On Hold',     count: s.onHold     ?? 0, color: '#d97706' },
      { label: 'Overdue',     count: s.overdue    ?? 0, color: '#dc2626' },
    ];
  });

  ppLineData = computed(() => {
    const wos = this.allWOs();
    const lines = ['Line A', 'Line B', 'Line C', 'Line D'];
    const utilisation = lines.map(line => {
      const lineWOs   = wos.filter(w => w.line === line);
      const activeWOs = lineWOs.filter(w => w.status === 'In Progress');
      return lineWOs.length > 0 ? Math.round((activeWOs.length / lineWOs.length) * 100) : 0;
    });
    return {
      labels: lines,
      datasets: [{ label: 'Active WO %', data: utilisation,
        backgroundColor: ['rgba(5,150,105,0.75)','rgba(37,99,235,0.75)','rgba(217,119,6,0.75)','rgba(220,38,38,0.75)'],
        borderRadius: 6 }],
    };
  });
  ppLineOpts = this.barOpts(true, false, 100);

  ppOnTimeOpts = this.barOpts(false, false, 100);
  ppOnTimeData = computed(() => {
    // Group completed WOs by week number (last 4 weeks)
    const wos = this.allWOs().filter(w => w.status === 'Completed' && w.dueDate);
    const now  = new Date();
    const weeks = [0, 1, 2, 3].map(w => {
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - (w + 1) * 7);
      const weekEnd   = new Date(now); weekEnd.setDate(now.getDate() - w * 7);
      const weekWOs   = wos.filter(wo => { const d = new Date(wo.dueDate); return d >= weekStart && d < weekEnd; });
      return weekWOs.length;
    }).reverse();
    const maxWk = Math.max(...weeks, 1);
    const onTimePcts = weeks.map(v => Math.round((v / maxWk) * 100));
    return {
      labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
      datasets: [
        { label: 'Completed WOs', data: onTimePcts,       backgroundColor: 'rgba(37,99,235,0.75)', borderRadius: 6 },
        { label: 'Target',        data: [90, 90, 90, 90], backgroundColor: 'rgba(5,150,105,0.2)',  borderRadius: 6 },
      ],
    };
  });

  ppOutputOpts = this.lineOpts();
  ppOutputData = computed(() => {
    const labels = this.last30Days();
    const wos    = this.allWOs();
    const today  = new Date();
    const planned = labels.map((_, i) => {
      const day = new Date(today); day.setDate(today.getDate() - (29 - i));
      return wos.filter(w => w.startDate && new Date(w.startDate).toDateString() === day.toDateString()).reduce((s, w) => s + (w.quantity ?? 0), 0);
    });
    const actual = labels.map((_, i) => {
      const day = new Date(today); day.setDate(today.getDate() - (29 - i));
      return wos.filter(w => w.dueDate && new Date(w.dueDate).toDateString() === day.toDateString()).reduce((s, w) => s + (w.produced ?? 0), 0);
    });
    return {
      labels,
      datasets: [
        { label: 'Planned', data: planned, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
        { label: 'Actual',  data: actual,  borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)',  fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
      ],
    };
  });

  ppTableHeaders = ['Work Order', 'Product', 'Line', 'Planned Qty', 'Produced Qty', 'Status'];
  ppTableRows = computed<TableRow[]>(() =>
    this.allWOs().slice(0, 10).map(w => ({
      wo:       w.woNumber   ?? `WO-${String(w.id).padStart(4,'0')}`,
      product:  w.product ?? '—',
      line:     w.line ?? '—',
      planned:  w.quantity    ?? 0,
      actual:   w.produced ?? 0,
      status:   w.status      ?? '—',
    }))
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  QUALITY INSPECTOR — computed from real InspectionService data
  // ══════════════════════════════════════════════════════════════════════════
  private insStats    = computed(() => this.insSvc.inspectionStats());
  private defStats    = computed(() => this.insSvc.defectStats());
  private allIns      = computed(() => this.insSvc.inspections());
  private allDefects  = computed(() => this.insSvc.defects());

  qiKpis = computed<KpiCard[]>(() => {
    const ins     = this.insStats();
    const def     = this.defStats();
    const allIns  = this.allIns();
    const passRate  = ins.passRate ?? 0;
    const totalIns  = allIns.length;
    const defRate   = totalIns > 0 ? ((def.total / totalIns) * 100).toFixed(1) : '0.0';
    const critDef   = def.critical ?? 0;

    return [
      { label: 'First Pass Yield',  value: `${passRate}%`,  icon: 'verified',   color: 'green',  trend: `${ins.passed} passed / ${ins.failed} failed`, trendValue: `${ins.passed}/${totalIns}`, trendUp: passRate >= 70 },
      { label: 'Defect Rate',       value: `${defRate}%`,   icon: 'bug_report', color: 'red',    trend: `${def.total} total defects`,                  trendValue: `${def.open} open`,          trendUp: false },
      { label: 'Inspections Done',  value: `${totalIns}`,   icon: 'fact_check', color: 'blue',   trend: `${ins.pending} pending`,                      trendValue: `${ins.inReview} in review`, trendUp: true  },
      { label: 'Critical Defects',  value: `${critDef}`,    icon: 'report',     color: 'amber',  trend: `${def.open} open defects`,                    trendValue: `${def.resolved} resolved`,  trendUp: critDef === 0 },
    ];
  });

  qiTrendOpts = this.lineOpts();
  qiTrendData = computed(() => {
    const labels = this.last30Days();
    const today  = new Date();
    const passed = labels.map((_, i) => {
      const day = new Date(today); day.setDate(today.getDate() - (29 - i));
      return this.allIns().filter(ins => ins.completedDate && new Date(ins.completedDate).toDateString() === day.toDateString() && ins.status === 'Passed').length;
    });
    const failed = labels.map((_, i) => {
      const day = new Date(today); day.setDate(today.getDate() - (29 - i));
      return this.allIns().filter(ins => ins.completedDate && new Date(ins.completedDate).toDateString() === day.toDateString() && ins.status === 'Failed').length;
    });
    return {
      labels,
      datasets: [
        { label: 'Passed', data: passed, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)',  fill: true,  tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
        { label: 'Failed', data: failed, borderColor: '#dc2626', backgroundColor: 'transparent',           fill: false, tension: 0.4, pointRadius: 3, borderWidth: 1.8, borderDash: [4,4] },
      ],
    };
  });

  qiDefectTypeOpts  = this.donutOpts();
  qiDefectTypeData = computed(() => {
    const defects = this.allDefects();
    const types   = ['Dimensional', 'Surface', 'Seal Failure', 'Assembly', 'Welding', 'Other'];
    const counts  = types.map(t => defects.filter(d => (d.defectType ?? '').toLowerCase().includes(t.toLowerCase())).length);
    const other   = defects.length - counts.slice(0, -1).reduce((a, b) => a + b, 0);
    counts[counts.length - 1] = Math.max(0, other);
    return {
      labels: types,
      datasets: [{ data: counts, backgroundColor: ['#2563eb','#d97706','#dc2626','#8b5cf6','#0ea5e9','#9ca3af'], borderColor: '#fff', borderWidth: 3, hoverOffset: 6 }],
    };
  });

  qiDefectTypeLegend = computed(() => {
    const defects = this.allDefects();
    const types   = ['Dimensional Error', 'Surface Defect', 'Seal Failure', 'Assembly Error', 'Welding Defect', 'Other'];
    const colors  = ['#2563eb','#d97706','#dc2626','#8b5cf6','#0ea5e9','#9ca3af'];
    const counts  = types.map(t => defects.filter(d => (d.defectType ?? '').toLowerCase().includes(t.split(' ')[0].toLowerCase())).length);
    return types.map((label, i) => ({ label, count: counts[i], color: colors[i] }));
  });

  qiByProductOpts = this.barOpts(false, true);
  qiByProductData = computed(() => {
    const ins = this.allIns();
    const products = [...new Set(ins.map(i => i.product ?? '—'))].slice(0, 6);
    return {
      labels: products,
      datasets: [
        { label: 'Passed',    data: products.map(p => ins.filter(i => i.product === p && i.status === 'Passed').length),    backgroundColor: 'rgba(5,150,105,0.75)',  borderRadius: 5 },
        { label: 'Failed',    data: products.map(p => ins.filter(i => i.product === p && i.status === 'Failed').length),    backgroundColor: 'rgba(220,38,38,0.75)',  borderRadius: 5 },
        { label: 'In Review', data: products.map(p => ins.filter(i => i.product === p && i.status === 'In Review').length), backgroundColor: 'rgba(37,99,235,0.75)',  borderRadius: 5 },
        { label: 'Pending',   data: products.map(p => ins.filter(i => i.product === p && i.status === 'Pending').length),   backgroundColor: 'rgba(107,114,128,0.5)', borderRadius: 5 },
      ],
    };
  });

  qiRootCauseOpts = this.barOpts(true);
  qiRootCauseData = computed(() => {
    const defects   = this.allDefects();
    const causes    = ['Material Issue', 'Machine Fault', 'Human Error', 'Process Deviation', 'Tool Wear', 'Other'];
    const counts    = causes.map(c => defects.filter(d => (d.rootCause ?? '').toLowerCase().includes(c.split(' ')[0].toLowerCase())).length);
    const otherCount = defects.length - counts.slice(0, -1).reduce((a, b) => a + b, 0);
    counts[counts.length - 1] = Math.max(0, otherCount);
    return {
      labels: causes,
      datasets: [{ label: 'Defects', data: counts, backgroundColor: ['#dc2626','#d97706','#2563eb','#8b5cf6','#9ca3af','#6b7280'], borderRadius: 5 }],
    };
  });

  qiTableHeaders = ['Inspection #', 'Product', 'WO Ref', 'Qty Inspected', 'Inspector', 'Status'];
  qiTableRows = computed<TableRow[]>(() =>
    this.allIns().slice(0, 10).map(ins => ({
      ins:      ins.insNumber ?? `INS-${String(ins.id).padStart(4,'0')}`,
      product:  ins.product ?? '—',
      wo:       ins.woRef         ?? `WO-${String(ins.id).padStart(4,'0')}`,
      inspected: ins.quantity     ?? 0,
      inspector: ins.inspector ?? '—',
      status:   ins.status        ?? '—',
    }))
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  INVENTORY MANAGER — computed from real InventoryService data
  // ══════════════════════════════════════════════════════════════════════════
  private stockStats = computed(() => this.invSvc.stockStats());
  private poStats    = computed(() => this.invSvc.poStats());
  private allStock   = computed(() => this.invSvc.stockItems());
  private allPOs     = computed(() => this.invSvc.purchaseOrders());

  imKpis = computed<KpiCard[]>(() => {
    const s  = this.stockStats();
    const po = this.poStats();
    const totalVal   = s.totalValue ?? 0;
    const lowStock   = s.low   ?? 0;
    const totalItems = s.total ?? 0;
    const poFulfill  = po.total > 0 ? Math.round(((po.total - (po.pending ?? 0)) / po.total) * 100) : 0;

    return [
      { label: 'Total Stock Items',   value: `${totalItems}`,                   icon: 'inventory_2',    color: 'green',  trend: `${s.ok} OK items`,          trendValue: `${s.overstock ?? 0} overstock`, trendUp: true  },
      { label: 'PO Fulfillment Rate', value: `${poFulfill}%`,                   icon: 'local_shipping', color: 'blue',   trend: `${po.total} total POs`,      trendValue: `${po.pending} pending`,         trendUp: poFulfill >= 80 },
      { label: 'Low Stock Alerts',    value: `${lowStock}`,                     icon: 'warning',        color: 'red',    trend: `of ${totalItems} items`,     trendValue: `${lowStock} need reorder`,      trendUp: false },
      { label: 'Inventory Value',     value: `£${(totalVal/1000).toFixed(0)}K`, icon: 'payments',       color: 'teal',   trend: `${totalItems} stock lines`,  trendValue: `£${totalVal.toFixed(0)} total`, trendUp: true  },
    ];
  });

  imStockTrendOpts = this.lineOpts();
  imStockTrendData = computed(() => {
    const labels = this.last30Days();
    // Show current stock distribution as a flat trend since we don't have historical movement data yet
    const stockIn  = this.allStock().reduce((s, i) => s + (i.currentStock ?? 0), 0);
    const stockOut = this.allStock().reduce((s, i) => s + Math.max(0, (i.minStock ?? 0) - (i.currentStock ?? 0)), 0);
    return {
      labels,
      datasets: [
        { label: 'Stock In',  data: labels.map(() => Math.round(stockIn  / 30)), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)',  fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
        { label: 'Stock Out', data: labels.map(() => Math.round(stockOut / 30)), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.05)', fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2 },
      ],
    };
  });

  imCategoryOpts  = this.donutOpts();
  imCategoryData = computed(() => {
    const items     = this.allStock();
    const cats      = ['Raw Material', 'Component', 'Consumable', 'Packaging', 'Finished Good'];
    const counts    = cats.map(c => items.filter(i => i.category === c).length);
    const total     = counts.reduce((a, b) => a + b, 0) || 1;
    const pcts      = counts.map(c => Math.round((c / total) * 100));
    return {
      labels: cats,
      datasets: [{ data: pcts, backgroundColor: ['#2563eb','#059669','#d97706','#8b5cf6','#0ea5e9'], borderColor: '#fff', borderWidth: 3, hoverOffset: 6 }],
    };
  });

  imCategoryLegend = computed(() => {
    const items  = this.allStock();
    const cats   = ['Raw Material', 'Component', 'Consumable', 'Packaging', 'Finished Good'];
    const colors = ['#2563eb','#059669','#d97706','#8b5cf6','#0ea5e9'];
    const total  = items.length || 1;
    return cats.map((label, i) => ({
      label, color: colors[i],
      pct: Math.round((items.filter(it => it.category === label).length / total) * 100),
    }));
  });

  imPoStatusOpts = this.barOpts();
  imPoStatusData = computed(() => {
    const pos       = this.allPOs();
    const statuses  = ['Draft', 'Submitted', 'Approved', 'Ordered', 'Received'];
    const counts    = statuses.map(s => pos.filter(p => p.status === s).length);
    return {
      labels: statuses,
      datasets: [{ label: 'Purchase Orders', data: counts,
        backgroundColor: ['#9ca3af','#2563eb','#d97706','#7c3aed','#059669'], borderRadius: 6 }],
    };
  });

  imSupplierOpts = this.barOpts(true, false, 100);
  imSupplierData = computed(() => {
    const pos       = this.allPOs();
    const suppliers = [...new Set(pos.map(p => p.supplier ?? '—'))].filter(s => s !== '—').slice(0, 6);
    if (suppliers.length === 0) {
      return { labels: ['No data'], datasets: [{ label: 'On-Time %', data: [0], backgroundColor: 'rgba(5,150,105,0.75)', borderRadius: 5 }] };
    }
    // For each supplier: received POs = on-time proxy
    const onTime  = suppliers.map(s => { const sPos = pos.filter(p => (p.supplier) === s); return sPos.length > 0 ? Math.round((sPos.filter(p => p.status === 'Received').length / sPos.length) * 100) : 0; });
    const quality = suppliers.map(s => { const sPos = pos.filter(p => (p.supplier) === s); return sPos.length > 0 ? Math.round(((sPos.filter(p => p.status === 'Received' || p.status === 'Approved').length) / sPos.length) * 100) : 0; });
    return {
      labels: suppliers,
      datasets: [
        { label: 'On-Time %', data: onTime,   backgroundColor: 'rgba(5,150,105,0.75)',  borderRadius: 5 },
        { label: 'Quality %', data: quality,  backgroundColor: 'rgba(37,99,235,0.75)', borderRadius: 5 },
      ],
    };
  });

  imTableHeaders = ['SKU', 'Item', 'Category', 'Current Stock', 'Min Stock', 'Stock %', 'Status'];
  imTableRows = computed<TableRow[]>(() =>
    this.allStock().slice(0, 10).map(item => {
      const pct = item.minStock > 0 ? Math.round((item.currentStock / item.minStock) * 100) : 100;
      return {
        sku:      item.sku          ?? '—',
        item:     item.name         ?? '—',
        cat:      item.category     ?? '—',
        current:  item.currentStock ?? 0,
        min:      item.minStock ?? 0,
        pct:      `${pct}%`,
        status:   item.currentStock <= 0 ? 'Out of Stock' : item.currentStock < item.minStock ? 'Low Stock' : 'In Stock',
      };
    })
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  COMPLIANCE OFFICER — computed from real ComplianceService data
  // ══════════════════════════════════════════════════════════════════════════
  private repStats  = computed(() => this.compSvc.reportStats());
  private audStats  = computed(() => this.compSvc.auditStats());
  private allRep    = computed(() => this.compSvc.reports());
  private allAudit  = computed(() => this.compSvc.auditLogs());

  coKpis = computed<KpiCard[]>(() => {
    const r  = this.repStats();
    const a  = this.audStats();
    const total      = r.total    ?? 0;
    const approved   = r.approved ?? 0;
    const overdue    = r.overdue  ?? 0;
    const submitRate = total > 0 ? Math.round(((approved + (r.pending ?? 0)) / total) * 100) : 0;

    return [
      { label: 'Submission Rate',     value: `${submitRate}%`, icon: 'assignment_turned_in', color: 'green',  trend: `${approved} approved`,      trendValue: `${r.pending ?? 0} pending`,  trendUp: submitRate >= 80 },
      { label: 'Open Findings',       value: `${a.warnings ?? 0}`, icon: 'find_in_page',    color: 'red',    trend: `${a.errors ?? 0} errors`,   trendValue: `${a.total} total events`,    trendUp: false },
      { label: 'Overdue Reports',     value: `${overdue}`,     icon: 'alarm',               color: 'amber',  trend: overdue > 0 ? 'Action needed' : 'None overdue', trendValue: `${total} total`, trendUp: overdue === 0 },
      { label: 'Total Audit Events',  value: `${a.total ?? 0}`, icon: 'timer',              color: 'indigo', trend: `${a.success ?? 0} success`,  trendValue: `${a.errors ?? 0} errors`,    trendUp: true  },
    ];
  });

  coEventTrendOpts = this.barOpts(false, true);
  coEventTrendData = computed(() => {
    const logs   = this.allAudit();
    const today  = new Date();
    const weeks  = [3, 2, 1, 0].map(w => {
      const wStart = new Date(today); wStart.setDate(today.getDate() - (w + 1) * 7);
      const wEnd   = new Date(today); wEnd.setDate(today.getDate() - w * 7);
      const wLogs  = logs.filter(l => { const d = new Date(l.timestamp ?? ''); return d >= wStart && d < wEnd; });
      return {
        info:    wLogs.filter(l => (l.severity ?? '').toLowerCase() === 'info').length,
        warning: wLogs.filter(l => (l.severity ?? '').toLowerCase() === 'warning').length,
        error:   wLogs.filter(l => (l.severity ?? '').toLowerCase() === 'error').length,
      };
    });
    return {
      labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
      datasets: [
        { label: 'Info',    data: weeks.map(w => w.info),    backgroundColor: 'rgba(37,99,235,0.75)',  borderRadius: 4 },
        { label: 'Warning', data: weeks.map(w => w.warning), backgroundColor: 'rgba(217,119,6,0.75)', borderRadius: 4 },
        { label: 'Error',   data: weeks.map(w => w.error),   backgroundColor: 'rgba(220,38,38,0.75)', borderRadius: 4 },
      ],
    };
  });

  coReportStatusOpts  = this.donutOpts();
  coReportStatusData = computed(() => {
    const r = this.repStats();
    return {
      labels: ['Submitted', 'Approved', 'Draft', 'Under Review', 'Rejected'],
      datasets: [{ data: [r.pending ?? 0, r.approved ?? 0, (r.total ?? 0) - (r.approved ?? 0) - (r.pending ?? 0) - (r.rejected ?? 0), 0, r.rejected ?? 0],
        backgroundColor: ['#059669','#2563eb','#9ca3af','#d97706','#dc2626'],
        borderColor: '#fff', borderWidth: 3, hoverOffset: 6 }],
    };
  });

  coReportStatusLegend = computed(() => {
    const r = this.repStats();
    return [
      { label: 'Submitted',    count: r.pending  ?? 0, color: '#059669' },
      { label: 'Approved',     count: r.approved ?? 0, color: '#2563eb' },
      { label: 'Draft',        count: Math.max(0, (r.total ?? 0) - (r.approved ?? 0) - (r.pending ?? 0) - (r.rejected ?? 0)), color: '#9ca3af' },
      { label: 'Rejected',     count: r.rejected ?? 0, color: '#dc2626' },
    ];
  });

  coFindingsOpts = this.barOpts(false, true);
  coFindingsData = computed(() => {
    const reports = this.allRep();
    const types   = ['Quality', 'Safety', 'Production', 'Supplier', 'Environmental'];
    return {
      labels: types,
      datasets: [
        { label: 'Findings', data: types.map(t => reports.filter(r => r.type === t).reduce((s, r) => s + (r.findings ?? 0), 0)), backgroundColor: 'rgba(220,38,38,0.75)', borderRadius: 5 },
        { label: 'Actions',  data: types.map(t => reports.filter(r => r.type === t).reduce((s, r) => s + (r.actions  ?? 0), 0)), backgroundColor: 'rgba(5,150,105,0.75)',  borderRadius: 5 },
      ],
    };
  });

  coSubmissionOpts = this.barOpts(false, false, 100);
  coSubmissionData = computed(() => {
    const reports  = this.allRep();
    const months   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now      = new Date();
    const last5    = Array.from({ length: 5 }, (_, i) => {
      const m = (now.getMonth() - 4 + i + 12) % 12;
      return { label: months[m], month: m };
    });
    const submitted = last5.map(({ month }) => reports.filter(r => r.submittedDate && new Date(r.submittedDate).getMonth() === month && (r.status === 'Submitted' || r.status === 'Approved')).length);
    const totals    = last5.map(({ month }) => reports.filter(r => r.submittedDate && new Date(r.submittedDate).getMonth() === month).length);
    const rates     = submitted.map((s, i) => totals[i] > 0 ? Math.round((s / totals[i]) * 100) : 0);
    return {
      labels: last5.map(m => m.label),
      datasets: [
        { label: 'Submitted On-Time', data: rates,             backgroundColor: 'rgba(37,99,235,0.75)', borderRadius: 5 },
        { label: 'Target',            data: [90,90,90,90,90],  backgroundColor: 'rgba(9,113,241,0.12)', borderRadius: 5 },
      ],
    };
  });

  coTableHeaders = ['Report #', 'Title', 'Type', 'Period', 'Findings', 'Actions', 'Status'];
  coTableRows = computed<TableRow[]>(() =>
    this.allRep().slice(0, 10).map((r, i) => ({
      num:      r.reportNumber ?? `CR-${String(i + 1).padStart(4, '0')}`,
      title:    r.title        ?? '—',
      type:     r.type         ?? '—',
      period:   r.period       ?? '—',
      findings: r.findings     ?? 0,
      actions:  r.actions      ?? 0,
      status:   r.status       ?? '—',
    }))
  );

  // ── Export CSV ────────────────────────────────────────────────────────────
  exportCSV(): void {
    const role = this.role();
    let headers: string[] = [];
    let rows: TableRow[]  = [];

    if (role === 'ProductionPlanner') { headers = this.ppTableHeaders; rows = this.ppTableRows(); }
    else if (role === 'QualityInspector')  { headers = this.qiTableHeaders; rows = this.qiTableRows(); }
    else if (role === 'InventoryManager')  { headers = this.imTableHeaders; rows = this.imTableRows(); }
    else if (role === 'ComplianceOfficer') { headers = this.coTableHeaders; rows = this.coTableRows(); }

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
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
  }

  pageTitle = computed(() => {
    const map: Record<string, string> = {
      ProductionPlanner: 'Production Analytics',
      QualityInspector:  'Quality Analytics',
      InventoryManager:  'Inventory Analytics',
      ComplianceOfficer: 'Compliance Analytics',
      Admin:             'System Analytics',
    };
    return map[this.role() ?? ''] ?? 'Analytics';
  });

  pageSubtitle = computed(() => {
    const map: Record<string, string> = {
      ProductionPlanner: 'Work order performance, line utilisation and delivery metrics',
      QualityInspector:  'Inspection results, defect rates and quality trends',
      InventoryManager:  'Stock levels, supplier performance and procurement metrics',
      ComplianceOfficer: 'Report submission rates, findings and audit event trends',
      Admin:             'System-wide operational overview',
    };
    return map[this.role() ?? ''] ?? '';
  });
}
