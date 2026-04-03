import { InjectionToken, Provider } from '@angular/core';
import { DebugPanelConfig } from './models';

export const DEBUG_PANEL_CONFIG = new InjectionToken<DebugPanelConfig>('DEBUG_PANEL_CONFIG');

export function provideDebugPanel(config: DebugPanelConfig): Provider {
  return { provide: DEBUG_PANEL_CONFIG, useValue: config };
}
