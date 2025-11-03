# Monitoring & Error Alerting

Everly uses Sentry for error tracking and a custom health check endpoint for monitoring system health and metrics.

## Sentry Setup

### Environment Variables

Add `SENTRY_DSN` to your environment variables:

**Vercel:**
1. Go to Project → Settings → Environment Variables
2. Add `SENTRY_DSN` with your Sentry DSN value
3. Set for Production, Preview, and Development as needed

**Local development:**
```bash
# .env.local
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Configuration

Sentry is configured with:
- **Sample Rate**: 10% of errors are captured (to reduce noise)
- **Traces Sample Rate**: 10% of transactions are traced
- **Environment**: Automatically set from `VERCEL_ENV` or `NODE_ENV`
- **Release**: Automatically set from `VERCEL_GIT_COMMIT_SHA`

### Adjusting Sample Rates

To capture more/fewer errors, edit the config files:
- `sentry.client.config.ts` - Client-side errors
- `sentry.server.config.ts` - Server-side errors
- `sentry.edge.config.ts` - Edge runtime errors

Change `sampleRate` and `tracesSampleRate` values (0.0 to 1.0).

### Muting Sentry

To temporarily disable Sentry without removing the DSN:
1. Remove `SENTRY_DSN` from environment variables, OR
2. Set `enabled: false` in the Sentry config files

## Health Check

### Endpoint

`GET /api/healthz`

Returns system health status, database connectivity, and recent activity metrics.

### Example Usage

**Local:**
```bash
curl -s http://localhost:3000/api/healthz | jq
```

**Production:**
```bash
curl -s https://your-app.vercel.app/api/healthz | jq
```

### Response Format

```json
{
  "ok": true,
  "db": {
    "ok": true,
    "latencyMs": 42
  },
  "metrics": {
    "lastWebhookAt": "2025-01-15T10:30:00.000Z",
    "lastSyncAt": "2025-01-15T05:00:00.000Z",
    "lastBackfillAt": "2025-01-14T12:00:00.000Z"
  },
  "commit": "abc123def456",
  "env": "production",
  "timestamp": "2025-01-15T10:35:00.000Z",
  "uptimeMs": 5
}
```

### Response Fields

- **`ok`**: Overall health status (true if DB is healthy)
- **`db.ok`**: Database connectivity status
- **`db.latencyMs`**: Database query latency in milliseconds
- **`metrics.lastWebhookAt`**: Timestamp of last received Whop webhook
- **`metrics.lastSyncAt`**: Timestamp of last admin sync operation
- **`metrics.lastBackfillAt`**: Timestamp of last admin backfill operation
- **`commit`**: Git commit SHA of the deployed version
- **`env`**: Deployment environment (production/preview/development)
- **`timestamp`**: Current server time
- **`uptimeMs`**: Time taken to generate this health check response

### Status Codes

- **200 OK**: System is healthy
- **503 Service Unavailable**: Database is unavailable or unhealthy

## Metrics Storage

Metrics are stored in the `system_metrics` table in Supabase.

### Tracked Metrics

| Key | Description | Value Structure |
|-----|-------------|-----------------|
| `last_webhook_at` | Last Whop webhook received | `{ at: ISO string, source: 'whop', type: event_type }` |
| `last_backfill_at` | Last admin backfill completed | `{ at: ISO string, members: N, products: N, ... }` |
| `last_sync_at` | Last admin sync completed | `{ at: ISO string, windowHours: N, members: N, ... }` |

### Creating the Metrics Table

Run the migration:
```bash
psql $DATABASE_URL < supabase/system_metrics.sql
```

Or apply via Supabase dashboard SQL editor.

## Monitoring Best Practices

### Uptime Monitoring

Use a service like UptimeRobot or Pingdom to monitor `/api/healthz`:
- Check every 5 minutes
- Alert if status code is not 200
- Alert if `db.ok` is false

### Webhook Monitoring

Check `metrics.lastWebhookAt` to ensure webhooks are being received:
- Alert if no webhook received in last 24 hours (adjust based on your traffic)
- Compare with Whop dashboard to verify webhook delivery

### Sync Monitoring

Check `metrics.lastSyncAt` to ensure cron jobs are running:
- Alert if no sync in last 25 hours (cron runs daily at 5 AM)
- Check Vercel cron logs if sync is failing

### Database Monitoring

Monitor `db.latencyMs`:
- Typical latency: 10-100ms
- Alert if latency > 500ms consistently
- Alert if `db.ok` is false

## Logging

The app uses a lightweight logging helper (`src/server/logger.ts`) that:
- Logs to console (visible in Vercel logs)
- Sends errors to Sentry (if configured)
- Never throws exceptions (fail-safe)

### Usage

```typescript
import { logError, logInfo, logWarning } from '@/server/logger'

// Log an error with context
logError(new Error('Something went wrong'), { userId: '123', action: 'payment' })

// Log informational message
logInfo('Webhook processed', { eventType: 'member.created' })

// Log warning
logWarning('Rate limit approaching', { remaining: 10 })
```

## Troubleshooting

### Health check returns 503

1. Check Supabase dashboard for outages
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE` are set correctly
3. Check Vercel logs for database connection errors

### Metrics not updating

1. Verify `system_metrics` table exists in Supabase
2. Check that service role has permission to write to the table
3. Look for `[metrics]` errors in Vercel logs

### Sentry not receiving errors

1. Verify `SENTRY_DSN` is set in environment variables
2. Check that the DSN is correct (copy from Sentry project settings)
3. Verify `sampleRate` is not set too low (increase to 1.0 for testing)
4. Check Sentry project settings for rate limits or filters

### Webhook metrics not recording

1. Verify webhooks are being received (check Whop dashboard)
2. Check Vercel logs for `[whop:webhook]` messages
3. Ensure webhook handler is not throwing errors before metrics are recorded

