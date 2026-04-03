export interface ServerTimingEntry {
  name: string;
  dur?: number;
  desc?: string;
}

export interface RequestMetric {
  timestamp: Date;
  method: string;
  url: string;
  queryCount: number;
  duration?: number;
  status?: number;
  serverTiming?: ServerTimingEntry[];
}

export interface DebugPanelConfig {
  enabled: boolean;
  peakQueryThreshold?: number;
  login?: DebugLoginConfig;
}

export interface DebugLoginConfig {
  apiUrl: string;
  roles?: { value: string; label: string }[];
  userByRoleEndpoint?: string;
}
