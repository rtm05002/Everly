# Whop Backfill API

Protected admin endpoints for syncing Whop data into Supabase.

## Configuration

Add to your `.env.local` or Vercel environment variables:

```bash
ADMIN_TASK_TOKEN=your-random-long-string-here  # e.g., openssl rand -hex 32
```

For Vercel cron jobs, add this token as a header in Project → Settings → Cron Jobs → Headers:
- Header: `X-Admin-Token`
- Value: your `ADMIN_TASK_TOKEN` value

## Endpoints

### POST /api/admin/whop/backfill

Full backfill of all Whop data for the configured hub.

**Local usage:**
```bash
curl -X POST http://localhost:3000/api/admin/whop/backfill \
  -H "X-Admin-Token: your-token-here" \
  -H "Content-Type: application/json"
```

**Production usage:**
```bash
curl -X POST https://your-app.vercel.app/api/admin/whop/backfill \
  -H "X-Admin-Token: your-token-here" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "orgs": 0,
  "products": 42,
  "members": 1234,
  "subscriptions": 0
}
```

**Common errors:**
- `401 Unauthorized` - Missing or invalid `X-Admin-Token` header
- `400 Bad Request` - No hub configured (check `DEMO_HUB_ID`)
- `500 Internal Server Error` - Whop API failure or database error (check logs)

### POST /api/admin/whop/sync

Delta sync of data modified in the last N hours. Uses `windowHours` query parameter (default 24).

**Local usage:**
```bash
curl -X POST 'http://localhost:3000/api/admin/whop/sync?windowHours=12' \
  -H "X-Admin-Token: your-token-here" \
  -H "Content-Type: application/json"
```

**Production usage:**
```bash
curl -X POST 'https://your-app.vercel.app/api/admin/whop/sync?windowHours=12' \
  -H "X-Admin-Token: your-token-here" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "windowHours": 12,
  "since": "2025-01-15T10:00:00.000Z",
  "orgs": 0,
  "products": 3,
  "members": 12,
  "subscriptions": 0
}
```

**Common errors:**
- Same as backfill endpoint
- Invalid `windowHours` parameter (must be a number)

## Scheduled Execution

The sync endpoint runs daily at 5:00 AM UTC via Vercel cron (configured in `vercel.json`).

To add or modify the schedule:
1. Edit `vercel.json` to change the cron schedule
2. Push to master branch
3. Vercel will automatically deploy the new schedule

Example cron schedules:
- Daily at 5 AM: `"0 5 * * *"`
- Every 6 hours: `"0 */6 * * *"`
- Every Monday at 9 AM: `"0 9 * * 1"`

## Token Rotation

To rotate `ADMIN_TASK_TOKEN`:

1. Generate a new token:
   ```bash
   openssl rand -hex 32
   ```

2. Update environment variables:
   - Vercel: Project → Settings → Environment Variables
   - Local: `.env.local`

3. Update Vercel cron headers if using:
   - Project → Settings → Cron Jobs → Headers
   - Update the `X-Admin-Token` header value

4. Restart any running processes to pick up the new env var

## Idempotency

Both endpoints use upserts with conflict resolution:
- **Members**: `onConflict: hub_id,whop_member_id`
- **Products**: `onConflict: id`

Re-running the same backfill multiple times is safe and will not create duplicates.

## Monitoring

Check Vercel function logs for:
- `[Admin Backfill]` - Full backfill operations
- `[Admin Sync]` - Delta sync operations
- `Error:` - Any failures during Whop API calls or database writes

