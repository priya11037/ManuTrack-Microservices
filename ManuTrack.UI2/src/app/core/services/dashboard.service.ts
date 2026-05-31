import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface DashboardKPIs {
  totalWorkOrders: number;
  activeWorkOrders: number;
  totalUsers: number;
  totalProducts: number;
  inventoryAlerts: number;
  qualityPassRate: number;
}

export interface ProductionTrend {
  labels: string[];
  efficiency: number[];
  target: number[];
}

export interface WorkOrderStatus {
  open: number;
  inProgress: number;
  completed: number;
  onHold: number;
}

export interface InventorySummary {
  labels: string[];
  stock: number[];
  reorderLevel: number[];
}

export interface AuditLog {
  auditId: string;
  userName: string;
  action: string;
  timestamp: string;
}

export interface PerformanceMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getKPIs() {
    return this.http.get<DashboardKPIs>(`${environment.api.analytics}/kpis`);
  }

  getProductionTrend() {
    return this.http.get<ProductionTrend>(`${environment.api.analytics}/production-trend`);
  }

  getWorkOrderStatus() {
    return this.http.get<WorkOrderStatus>(`${environment.api.analytics}/work-order-status`);
  }

  getInventorySummary() {
    return this.http.get<InventorySummary>(`${environment.api.analytics}/inventory-summary`);
  }

  getRecentAuditLogs() {
    return this.http.get<AuditLog[]>(`${environment.api.auditLogs}?limit=5`);
  }

  getPerformanceMetrics() {
    return this.http.get<PerformanceMetric[]>(`${environment.api.analytics}/performance-metrics`);
  }
}
