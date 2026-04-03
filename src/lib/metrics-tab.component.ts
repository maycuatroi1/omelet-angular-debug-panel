import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';
import { DebugMetricsService } from './debug-metrics.service';
import { RequestMetric } from './models';
import { DEBUG_PANEL_CONFIG } from './tokens';

@Component({
  selector: 'omelet-metrics-tab',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="p-4 grid grid-cols-2 gap-3">
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-gray-400 mb-1">Total Queries</div>
        <div class="text-2xl font-bold text-blue-400">{{ metrics.totalQueries() }}</div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-gray-400 mb-1">Avg Queries/Req</div>
        <div class="text-2xl font-bold text-green-400">{{ metrics.avgQueriesPerRequest() }}</div>
      </div>
      <div
        [class]="
          metrics.peakQueries() > threshold
            ? 'bg-red-900/50 border border-red-500 rounded p-3 animate-pulse'
            : 'bg-gray-800 rounded p-3'
        "
      >
        <div class="text-xs text-gray-400 mb-1">Peak Queries</div>
        <div [class]="metrics.peakQueries() > threshold ? 'text-2xl font-bold text-red-400' : 'text-2xl font-bold text-yellow-400'">
          {{ metrics.peakQueries() }}
        </div>
      </div>
      <div class="bg-gray-800 rounded p-3">
        <div class="text-xs text-gray-400 mb-1">Requests</div>
        <div class="text-2xl font-bold text-purple-400">{{ metrics.requestCount() }}</div>
      </div>
    </div>

    @if (queryDistribution().length > 0) {
      <div class="px-4 pb-2">
        <div class="text-xs text-gray-400 mb-2">Query Distribution</div>
        <div class="bg-gray-800 rounded p-2 space-y-1">
          @for (item of queryDistribution(); track item.label) {
            <div class="flex items-center text-xs">
              <span class="w-12 text-gray-400">{{ item.label }}</span>
              <div class="flex-1 mx-2 bg-gray-700 rounded-full h-4 relative overflow-hidden">
                <div
                  class="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                  [style.width.%]="(item.count / maxDistribution()) * 100"
                ></div>
              </div>
              <span class="w-8 text-right text-gray-400">{{ item.count }}</span>
            </div>
          }
        </div>
      </div>
    }

    <div class="px-4 pb-4">
      <div class="text-xs text-gray-400 mb-2">Recent Requests (Last 5) - click to copy</div>
      <div class="space-y-1 max-h-40 overflow-y-auto">
        @for (metric of recentMetrics(); track $index) {
          <div
            class="bg-gray-800 rounded p-2 text-xs cursor-pointer hover:bg-gray-700 transition-colors relative"
            (click)="copyMetricAsMarkdown(metric, $index)"
          >
            @if (copiedIndex() === $index) {
              <div class="absolute inset-0 flex items-center justify-center bg-green-900/80 rounded text-green-300 text-xs font-medium">
                Copied!
              </div>
            }
            <div class="flex justify-between items-center">
              <span class="font-mono text-gray-300">{{ metric.method }}</span>
              <span [class]="getQueryCountClass(metric.queryCount)">{{ metric.queryCount }} queries</span>
            </div>
            <div class="text-gray-500 truncate mt-1" [title]="metric.url">{{ formatUrl(metric.url) }}</div>
            @if (metric.serverTiming?.length) {
              <div class="mt-1 space-y-0.5">
                @for (t of metric.serverTiming; track t.name) {
                  <div class="flex justify-between text-gray-500">
                    <span>{{ t.desc || t.name }}</span>
                    @if (t.dur !== undefined) {
                      <span class="text-gray-400">{{ t.dur | number: '1.1-1' }}ms</span>
                    }
                  </div>
                }
              </div>
            } @else if (metric.duration) {
              <div class="text-gray-500 mt-1">{{ metric.duration }}ms</div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class MetricsTabComponent {
  metrics = inject(DebugMetricsService);
  private config = inject(DEBUG_PANEL_CONFIG, { optional: true });

  copiedIndex = signal<number | null>(null);

  get threshold(): number {
    return this.config?.peakQueryThreshold ?? 20;
  }

  recentMetrics = computed(() => this.metrics.metrics().slice(-5).reverse());

  queryDistribution = computed(() => this.metrics.getQueryDistribution());

  maxDistribution = computed(() => {
    const dist = this.queryDistribution();
    return dist.length > 0 ? Math.max(...dist.map((d) => d.count)) : 1;
  });

  copyMetricAsMarkdown(metric: RequestMetric, index: number): void {
    const lines = [
      `## ${metric.method} ${metric.url}`,
      '',
      '| Header | Value |',
      '|--------|-------|',
      `| Status | ${metric.status ?? 'N/A'} |`,
      `| DB Queries | ${metric.queryCount} |`,
    ];

    if (metric.serverTiming?.length) {
      lines.push('', '### Server Timing', '', '| Metric | Duration |', '|--------|----------|');
      for (const t of metric.serverTiming) {
        lines.push(`| ${t.desc || t.name} | ${t.dur !== undefined ? t.dur.toFixed(2) + 'ms' : 'N/A'} |`);
      }
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      this.copiedIndex.set(index);
      setTimeout(() => this.copiedIndex.set(null), 1500);
    });
  }

  formatUrl(url: string): string {
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    return path.length > 50 ? path.substring(0, 50) + '...' : path;
  }

  getQueryCountClass(count: number): string {
    if (count <= 5) return 'text-green-400';
    if (count <= 10) return 'text-yellow-400';
    if (count <= 20) return 'text-orange-400';
    return 'text-red-400';
  }
}
