# Nudge Delivery System

Production-safe nudge delivery with idempotency, rate limiting, retries, and logging.

## Overview

The nudge delivery system consists of:
1. **Dispatch API**: Enqueue nudges for delivery
2. **Worker API**: Process queued nudges with retries
3. **Database**: Track all delivery attempts
4. **Admin Page**: View delivery logs

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NUDGES_ENABLED` | Enable/disable nudge delivery | `false` |
| `NUDGE_RATE_LIMIT_WINDOW_HOURS` | Hours between allowed nudges per member | `6` |
| `NUDGE_MAX_RETRIES` | Maximum retry attempts | `3` |
| `WORKER_SECRET` | Bearer token for worker API | Required |

## Database Schema

### Tables

Run the migration:
```bash
psql $DATABASE_URL < supabase/nudge_delivery.sql
```

**nudge_logs**: Complete audit trail of all nudge attempts
- Tracks status, attempts, errors, and timestamps
- Unique constraint on (hub_id, member_id, recipe_name, message_hash, day) for idempotency

**nudge_queue**: Active queue for pending deliveries
- Supports distributed processing with locking
- Exponential backoff for retries

See `supabase/nudge_delivery.sql` for full schema.

## API Endpoints

### POST /api/nudges/dispatch

Enqueue nudges for delivery.

**Request:**
```json
{
  "hub_id": "hub_123",
  "nudges": [
    {
      "member_id": "member_456",
      "recipe_name": "welcome_message",
      "message": "Welcome {{first_name}}!",
      "variables": {
        "first_name": "Alice"
      },
      "channel": "discord"
    }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "enqueued": 1,
  "skipped": 0,
  "results": [
    {
      "enqueued": true,
      "queue_id": "uuid",
      "log_id": "uuid"
    }
  ]
}
```

**Skipped Reasons:**
- `rate_limited`: Member already sent a nudge in the last N hours
- `duplicate`: Same nudge already sent today

**Example:**
```bash
curl -X POST https://your-app.vercel.app/api/nudges/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "hub_id": "hub_123",
    "nudges": [
      {
        "member_id": "member_456",
        "recipe_name": "welcome",
        "message": "Hello {{name}}!",
        "variables": {"name": "Alice"}
      }
    ]
  }'
```

### POST /api/nudges/worker

Process queued nudges. Protected with Bearer token.

**Headers:**
```
Authorization: Bearer $WORKER_SECRET
```

**Response:**
```json
{
  "ok": true,
  "taken": 5,
  "sent": 4,
  "failed": 1,
  "requeued": 0
}
```

**Example:**
```bash
curl -X POST https://your-app.vercel.app/api/nudges/worker \
  -H "Authorization: Bearer your-worker-secret"
```

**Rate Limiting**: Configurable window (default 6 hours) per member per recipe.

**Retries**: Exponential backoff (2^attempt minutes). Max retries configurable (default 3).

## Features

### Idempotency

Same nudge (same message hash + recipe + member) within the same day will not be sent twice.

### Rate Limiting

Each member can receive at most 1 nudge per `NUDGE_RATE_LIMIT_WINDOW_HOURS` (default 6 hours).

### Retries

Failed deliveries are automatically retried with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 2 minutes
- Attempt 3: 4 minutes
- Attempt 4: 8 minutes

After max retries, the nudge is marked as `failed`.

### Templates

Simple `{{variable}}` replacement:

```javascript
import { renderTemplate } from '@/server/nudges/template'

const message = renderTemplate('Hello {{name}}!', { name: 'Alice' })
// Result: "Hello Alice!"
```

## Nudge Provider

Default provider is a stub that only logs messages. Replace `StubNudgeProvider` in `src/server/nudges/provider.ts` with a real implementation for production.

**Example:**
```typescript
export class DiscordNudgeProvider implements NudgeProvider {
  async send({ hubId, memberId, channel, message }): Promise<SendResult> {
    // Send via Discord API
    try {
      await discord.sendDirectMessage(memberId, message)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }
}
```

## Admin Page

View delivery logs at `/admin/nudges/logs`:
- Last 50 delivery attempts
- Status, attempts, errors
- Read-only

## Testing

### Local Setup

1. **Set environment variables:**
```bash
NUDGES_ENABLED=true
WORKER_SECRET=test-secret-123
NUDGE_MAX_RETRIES=3
NUDGE_RATE_LIMIT_WINDOW_HOURS=6
```

2. **Run migrations:**
```bash
psql $DATABASE_URL < supabase/nudge_delivery.sql
```

3. **Dispatch nudges:**
```bash
curl -X POST http://localhost:3000/api/nudges/dispatch \
  -H "Content-Type: application/json" \
  -d '{"hub_id":"demo","nudges":[{"member_id":"member_1","recipe_name":"test","message":"Hello!"}]}'
```

4. **Process queue:**
```bash
curl -X POST http://localhost:3000/api/nudges/worker \
  -H "Authorization: Bearer test-secret-123"
```

### Verify Idempotency

1. Dispatch the same nudge twice on the same day
2. Second attempt should return `enqueued: false, reason: "duplicate"`

### Verify Rate Limiting

1. Dispatch a nudge to member A
2. Immediately dispatch a different nudge to member A
3. Second attempt should return `enqueued: false, reason: "rate_limited"`

### Verify Retries

1. Force a failure (break provider temporarily)
2. Dispatch a nudge
3. Run worker multiple times
4. Check logs: attempt count should increment up to max retries, then mark as `failed`

## Monitoring

All delivery attempts are logged in `nudge_logs` table. Query for:
- Failed deliveries: `SELECT * FROM nudge_logs WHERE status = 'failed'`
- Rate limited: `SELECT * FROM nudge_logs WHERE status = 'skipped'`
- Recent activity: `SELECT * FROM nudge_logs ORDER BY created_at DESC LIMIT 100`

## Troubleshooting

### Nudges not being sent

1. Check `NUDGES_ENABLED=true`
2. Verify tables exist: `SELECT COUNT(*) FROM nudge_logs`
3. Check worker secret matches: `echo $WORKER_SECRET`

### Duplicate nudges

- Idempotency key is (hub_id, member_id, recipe_name, message_hash, day)
- Ensure `message_hash` is computed correctly
- Check that `date_trunc('day', scheduled_at)` is working

### Worker not processing

1. Verify `WORKER_SECRET` is set correctly
2. Check database connectivity
3. Look for locked items: `SELECT * FROM nudge_queue WHERE locked_at IS NOT NULL`
4. Run worker manually to see errors

### Retries not working

1. Verify `NUDGE_MAX_RETRIES` is set
2. Check exponential backoff: `SELECT available_at, attempt FROM nudge_queue WHERE status = 'queued'`
3. Ensure worker is running periodically (set up a cron)

## Production Deployment

1. **Create tables** in Supabase
2. **Set environment variables** in Vercel
3. **Set up worker cron** (e.g., every 5 minutes):
```json
{
  "crons": [
    {
      "path": "/api/nudges/worker",
      "schedule": "*/5 * * * *"
    }
  ]
}
```
4. **Replace stub provider** with real Discord/Email/SMS provider
5. **Monitor logs** via `/admin/nudges/logs`

## Future Enhancements

- Support for multiple providers per nudge
- Webhook callbacks for delivery status
- Bulk dispatch optimization
- Circuit breaker for external APIs
- Delivery analytics dashboard

