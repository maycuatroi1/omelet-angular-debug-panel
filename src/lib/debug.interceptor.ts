import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { DebugMetricsService } from './debug-metrics.service';
import { DEBUG_PANEL_CONFIG } from './tokens';

export const debugInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(DEBUG_PANEL_CONFIG, { optional: true });
  if (!config?.enabled) return next(req);

  const metricsService = inject(DebugMetricsService);
  const requestId = metricsService.startRequest(req.method, req.url);

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const queryCountHeader = event.headers.get('x-db-query-count');
        const queryCount = queryCountHeader ? parseInt(queryCountHeader, 10) : 0;
        const serverTimingHeader = event.headers.get('server-timing');
        const serverTiming = serverTimingHeader
          ? metricsService.parseServerTiming(serverTimingHeader)
          : undefined;

        metricsService.recordRequest(requestId, req.method, req.url, queryCount, event.status, serverTiming);
      }
    }),
  );
};
