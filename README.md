# omelet-debug-panel

Angular debug panel for monitoring SQL queries, server timing, and debug login. Works with Angular 19+.

## Features

- Real-time SQL query count monitoring per HTTP request
- Server Timing header parsing and display
- Peak query alert with auto-open when threshold exceeded
- Query distribution chart
- Click-to-copy request details as Markdown
- Debug login with JWT generation (quick role switch)
- Configurable via injection token

## Installation

```bash
npm install omelet-debug-panel
# peer dependency
npm install jose
```

## Setup

### 1. Provide configuration

```typescript
// app.config.ts
import { provideDebugPanel, debugInterceptor } from 'omelet-debug-panel';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, debugInterceptor])
    ),
    provideDebugPanel({
      enabled: environment.DEBUG,        // toggle on/off
      peakQueryThreshold: 20,            // auto-open panel when exceeded
      login: {                           // optional: enable debug login tab
        apiUrl: environment.apiUrl,
        roles: [
          { value: 'Instructor', label: 'Instructor' },
          { value: 'Learner', label: 'Learner' },
        ],
        userByRoleEndpoint: '/internal/debug/user-by-role/', // default
      },
    }),
  ],
};
```

### 2. Add component to your app

```typescript
// app.component.ts
import { OmeletDebugPanelComponent } from 'omelet-debug-panel';

@Component({
  imports: [OmeletDebugPanelComponent],
  template: `
    <router-outlet />
    <omelet-debug-panel />
  `,
})
export class AppComponent {}
```

### 3. Ensure PrimeIcons CSS is loaded

The panel uses PrimeIcons for icons. Add to your `styles.css` or `angular.json`:

```css
@import 'primeicons/primeicons.css';
```

## Backend Integration (Django)

The panel reads these HTTP response headers:

| Header | Description |
|--------|-------------|
| `X-DB-Query-Count` | Number of SQL queries executed |
| `Server-Timing` | Detailed timing breakdown ([spec](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing)) |

### With Django Debug Toolbar

```bash
pip install django-debug-toolbar
```

```python
# settings.py
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
DEBUG_TOOLBAR_CONFIG = {
    'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG,
}
```

### Custom Middleware (recommended)

Add a middleware that exposes query count and timing headers:

```python
# common/middleware/debug_headers.py
import time
from django.conf import settings
from django.db import connection


class DebugHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not settings.DEBUG:
            return self.get_response(request)

        # Reset queries log
        connection.queries_log.clear()
        start = time.monotonic()

        response = self.get_response(request)

        elapsed = (time.monotonic() - start) * 1000
        query_count = len(connection.queries)
        sql_time = sum(float(q['time']) * 1000 for q in connection.queries)

        response['X-DB-Query-Count'] = str(query_count)
        response['Server-Timing'] = (
            f'total;dur={elapsed:.2f};desc="Total time", '
            f'db;dur={sql_time:.2f};desc="SQL {query_count} queries"'
        )

        # Expose headers to browser (CORS)
        existing = response.get('Access-Control-Expose-Headers', '')
        extra = 'X-DB-Query-Count, Server-Timing'
        response['Access-Control-Expose-Headers'] = (
            f'{existing}, {extra}' if existing else extra
        )

        return response
```

```python
# settings.py
MIDDLEWARE = [
    'common.middleware.debug_headers.DebugHeadersMiddleware',
    # ... other middleware
]
```

### CORS Headers

The browser can only read custom headers if they are exposed via CORS. Make sure your CORS config includes:

```python
CORS_EXPOSE_HEADERS = ['X-DB-Query-Count', 'Server-Timing']
```

Or use the middleware above which adds `Access-Control-Expose-Headers` automatically.

## API

### Components

| Component | Selector | Description |
|-----------|----------|-------------|
| `OmeletDebugPanelComponent` | `<omelet-debug-panel>` | Main panel (use this one) |
| `MetricsTabComponent` | `<omelet-metrics-tab>` | Metrics tab only |
| `LoginTabComponent` | `<omelet-login-tab>` | Login tab only |

### Services

| Service | Description |
|---------|-------------|
| `DebugMetricsService` | Request metrics tracking |
| `DebugJwtService` | JWT token generation |
| `DebugTokenService` | Token storage (localStorage) |

### Functions

| Function | Description |
|----------|-------------|
| `provideDebugPanel(config)` | Provider factory |
| `debugInterceptor` | HTTP interceptor |

### Interfaces

```typescript
interface DebugPanelConfig {
  enabled: boolean;
  peakQueryThreshold?: number;   // default: 20
  login?: {
    apiUrl: string;
    roles?: { value: string; label: string }[];
    userByRoleEndpoint?: string; // default: '/internal/debug/user-by-role/'
  };
}

interface RequestMetric {
  timestamp: Date;
  method: string;
  url: string;
  queryCount: number;
  duration?: number;
  status?: number;
  serverTiming?: ServerTimingEntry[];
}

interface ServerTimingEntry {
  name: string;
  dur?: number;
  desc?: string;
}
```

## Markdown Copy Format

Clicking a request in the panel copies this format to clipboard:

```markdown
## GET https://api.example.com/api/courses/

| Header | Value |
|--------|-------|
| Status | 200 |
| DB Queries | 15 |

### Server Timing

| Metric | Duration |
|--------|----------|
| Total time | 314.19ms |
| SQL 35 queries | 177.74ms |
```

## Development

```bash
npm install
npm run build        # build to dist/
npm run build:watch  # watch mode
```

## License

MIT
