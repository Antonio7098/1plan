import client from 'prom-client';

// Create a dedicated registry so we control what gets exposed
export const register = new client.Registry();

// Collect default process metrics
client.collectDefaultMetrics({ register });

// Histograms for request duration
export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [
    0.005, 0.01, 0.025, 0.05, 0.1,
    0.25, 0.5, 1, 2.5, 5, 10
  ],
  registers: [register],
});

// Counter for total requests
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

export function observeRequest(options: {
  method: string;
  route: string;
  statusCode: number;
  durationMs?: number;
}) {
  const labels = {
    method: options.method,
    route: options.route,
    status_code: String(options.statusCode),
  } as const;

  httpRequestsTotal.inc(labels, 1);
  if (typeof options.durationMs === 'number') {
    httpRequestDurationSeconds.observe(labels, options.durationMs / 1000);
  }
}
