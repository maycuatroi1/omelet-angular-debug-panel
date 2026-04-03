import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { DebugMetricsService } from './debug-metrics.service';
import { LoginTabComponent } from './login-tab.component';
import { MetricsTabComponent } from './metrics-tab.component';
import { DEBUG_PANEL_CONFIG } from './tokens';

type TabType = 'metrics' | 'login';

@Component({
  selector: 'omelet-debug-panel',
  standalone: true,
  imports: [CommonModule, MetricsTabComponent, LoginTabComponent],
  template: `
    @if (enabled) {
      @if (isExpanded()) {
        <div class="fixed bottom-4 right-4 w-96 bg-gray-900 text-white rounded-lg shadow-2xl z-50 transition-all duration-300">
          <div class="bg-gray-800 p-3 rounded-t-lg flex justify-between items-center">
            <div class="text-sm font-bold flex items-center">
              <i class="pi pi-chart-bar mr-2"></i>
              Debug Panel
            </div>
            <div class="flex gap-2">
              @if (activeTab() === 'metrics') {
                <button
                  (click)="metrics.clearMetrics()"
                  class="text-gray-400 hover:text-white transition-colors"
                  title="Clear metrics"
                >
                  <i class="pi pi-trash"></i>
                </button>
              }
              <button (click)="isExpanded.set(false)" class="text-gray-400 hover:text-white transition-colors">
                <i class="pi pi-times"></i>
              </button>
            </div>
          </div>

          <div class="flex border-b border-gray-700">
            <button
              (click)="activeTab.set('metrics')"
              [class]="
                activeTab() === 'metrics'
                  ? 'flex-1 px-4 py-2 text-sm font-medium text-blue-400 border-b-2 border-blue-400'
                  : 'flex-1 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white'
              "
            >
              Metrics
            </button>
            @if (hasLogin) {
              <button
                (click)="activeTab.set('login')"
                [class]="
                  activeTab() === 'login'
                    ? 'flex-1 px-4 py-2 text-sm font-medium text-blue-400 border-b-2 border-blue-400'
                    : 'flex-1 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white'
                "
              >
                Debug Login
              </button>
            }
          </div>

          @if (activeTab() === 'metrics') {
            <omelet-metrics-tab />
          }
          @if (activeTab() === 'login' && hasLogin) {
            <omelet-login-tab />
          }
        </div>
      } @else {
        <button
          (click)="isExpanded.set(true)"
          class="fixed bottom-4 right-4 bg-gray-900 text-white p-3 rounded-full shadow-lg z-50 hover:bg-gray-800 transition-colors"
          title="Open Debug Panel"
        >
          @if (isAlert()) {
            <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
          }
          <i class="pi pi-chart-bar text-lg"></i>
        </button>
      }
    }
  `,
})
export class OmeletDebugPanelComponent {
  private config = inject(DEBUG_PANEL_CONFIG, { optional: true });
  metrics = inject(DebugMetricsService);

  isExpanded = signal(false);
  activeTab = signal<TabType>('metrics');

  get enabled(): boolean {
    return this.config?.enabled ?? false;
  }

  get hasLogin(): boolean {
    return !!this.config?.login;
  }

  private get threshold(): number {
    return this.config?.peakQueryThreshold ?? 20;
  }

  isAlert = computed(() => this.metrics.peakQueries() > this.threshold);

  constructor() {
    effect(() => {
      if (this.isAlert() && !this.isExpanded()) {
        this.isExpanded.set(true);
        this.activeTab.set('metrics');
      }
    });
  }
}
