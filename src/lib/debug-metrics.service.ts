import { Injectable, signal } from '@angular/core';
import { RequestMetric, ServerTimingEntry } from './models';

@Injectable({ providedIn: 'root' })
export class DebugMetricsService {
  private readonly maxMetrics = 50;

  metrics = signal<RequestMetric[]>([]);
  totalQueries = signal(0);
  avgQueriesPerRequest = signal(0);
  peakQueries = signal(0);
  requestCount = signal(0);

  private requestStartTimes = new Map<string, number>();

  startRequest(method: string, url: string): string {
    const requestId = `${method}-${url}-${Date.now()}`;
    this.requestStartTimes.set(requestId, Date.now());
    return requestId;
  }

  parseServerTiming(header: string): ServerTimingEntry[] {
    if (!header) return [];
    return header.split(',').map((entry) => {
      const parts = entry.trim().split(';');
      const name = parts[0].trim();
      let dur: number | undefined;
      let desc: string | undefined;
      for (const part of parts.slice(1)) {
        const kv = part.trim();
        if (kv.startsWith('dur=')) {
          dur = parseFloat(kv.substring(4));
        } else if (kv.startsWith('desc=')) {
          desc = kv.substring(5).replace(/^"|"$/g, '');
        }
      }
      return { name, dur, desc };
    });
  }

  recordRequest(
    requestId: string,
    method: string,
    url: string,
    queryCount: number,
    status?: number,
    serverTiming?: ServerTimingEntry[],
  ): void {
    const startTime = this.requestStartTimes.get(requestId);
    const duration = startTime ? Date.now() - startTime : undefined;
    this.requestStartTimes.delete(requestId);

    const metric: RequestMetric = {
      timestamp: new Date(),
      method,
      url,
      queryCount,
      duration,
      status,
      serverTiming,
    };

    const updatedMetrics = [...this.metrics(), metric].slice(-this.maxMetrics);
    this.metrics.set(updatedMetrics);
    this.updateStatistics(updatedMetrics);
  }

  clearMetrics(): void {
    this.metrics.set([]);
    this.totalQueries.set(0);
    this.avgQueriesPerRequest.set(0);
    this.peakQueries.set(0);
    this.requestCount.set(0);
    this.requestStartTimes.clear();
  }

  getQueryDistribution(): { label: string; count: number }[] {
    const distribution = new Map<string, number>();
    this.metrics().forEach((metric) => {
      const range = this.getQueryRange(metric.queryCount);
      distribution.set(range, (distribution.get(range) || 0) + 1);
    });
    return Array.from(distribution.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => parseInt(a.label) - parseInt(b.label));
  }

  private updateStatistics(metrics: RequestMetric[]): void {
    if (metrics.length === 0) return;
    const total = metrics.reduce((sum, m) => sum + m.queryCount, 0);
    this.totalQueries.set(total);
    this.avgQueriesPerRequest.set(Math.round((total / metrics.length) * 10) / 10);
    this.peakQueries.set(Math.max(...metrics.map((m) => m.queryCount)));
    this.requestCount.set(metrics.length);
  }

  private getQueryRange(count: number): string {
    if (count <= 5) return '0-5';
    if (count <= 10) return '6-10';
    if (count <= 20) return '11-20';
    if (count <= 50) return '21-50';
    return '50+';
  }
}
