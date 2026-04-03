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
  styles: [`
    .odp-panel { position:fixed; bottom:1rem; right:1rem; width:24rem; background:#111827; color:#fff; border-radius:0.5rem; box-shadow:0 25px 50px -12px rgba(0,0,0,.25); z-index:50; transition:all .3s }
    .odp-header { background:#1f2937; padding:0.75rem; border-radius:0.5rem 0.5rem 0 0; display:flex; justify-content:space-between; align-items:center }
    .odp-header-title { font-size:0.875rem; font-weight:700; display:flex; align-items:center; gap:0.5rem }
    .odp-header-actions { display:flex; gap:0.5rem }
    .odp-btn-icon { color:#9ca3af; background:none; border:none; cursor:pointer; padding:0 }
    .odp-btn-icon:hover { color:#fff }
    .odp-tabs { display:flex; border-bottom:1px solid #374151 }
    .odp-tab { flex:1; padding:0.5rem 1rem; font-size:0.875rem; font-weight:500; background:none; border:none; cursor:pointer; color:#9ca3af }
    .odp-tab:hover { color:#fff }
    .odp-tab-active { color:#60a5fa; border-bottom:2px solid #60a5fa }
    .odp-fab { position:fixed; bottom:1rem; right:1rem; background:#111827; color:#fff; padding:0.75rem; border-radius:9999px; box-shadow:0 10px 15px -3px rgba(0,0,0,.1); z-index:50; border:none; cursor:pointer }
    .odp-fab:hover { background:#1f2937 }
    .odp-alert-dot { position:absolute; top:-0.25rem; right:-0.25rem; width:1rem; height:1rem; background:#ef4444; border-radius:9999px; animation:pulse 2s infinite }
    @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
  `],
  template: `
    @if (enabled) {
      @if (isExpanded()) {
        <div class="odp-panel">
          <div class="odp-header">
            <div class="odp-header-title">
              <i class="pi pi-chart-bar"></i>
              Debug Panel
            </div>
            <div class="odp-header-actions">
              @if (activeTab() === 'metrics') {
                <button (click)="metrics.clearMetrics()" class="odp-btn-icon" title="Clear metrics">
                  <i class="pi pi-trash"></i>
                </button>
              }
              <button (click)="isExpanded.set(false)" class="odp-btn-icon">
                <i class="pi pi-times"></i>
              </button>
            </div>
          </div>

          <div class="odp-tabs">
            <button (click)="activeTab.set('metrics')" [class]="'odp-tab' + (activeTab() === 'metrics' ? ' odp-tab-active' : '')">
              Metrics
            </button>
            @if (hasLogin) {
              <button (click)="activeTab.set('login')" [class]="'odp-tab' + (activeTab() === 'login' ? ' odp-tab-active' : '')">
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
        <button (click)="isExpanded.set(true)" class="odp-fab" title="Open Debug Panel">
          @if (isAlert()) {
            <span class="odp-alert-dot"></span>
          }
          <i class="pi pi-chart-bar" style="font-size:1.25rem"></i>
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
