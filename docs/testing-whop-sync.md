# Testing Whop Sync

## Quick Test Endpoints

Two debug endpoints are available to help diagnose and test the Whop sync:

### 1. Status Check

**GET** `/api/debug/whop-status`

Shows current environment configuration, connection status, and data counts.

```bash
curl https://your-vercel-app.vercel.app/api/debug/whop-status
```

**Example Response:**
```json
{
  "environment": {
    "hasWhopKey": false,
    "hasWhopOrgId": false,
    "syncEnabled": false,
    "demoHubId": "demo",
    "willUseMock": true
  },
  "client": {
    "available": false
  },
  "database": {
    "connected": true,
    "counts": {
      "members": 0,
      "products": 0,
      "sources": 0,
      "docs": 0
    }
  },
  "recommendations": [
    "Set WHOP_SYNC_ENABLED=true to enable syncing",
    "No WHOP credentials: will use mock data",
    "WHOP_API_KEY not set",
    "WHOP_ORG_ID not set"
  ]
}
```

### 2. Test Sync

**POST** `/api/debug/test-sync`

Triggers a sync and shows what data was fetched, mapped, and inserted.

```bash
curl -X POST https://your-vercel-app.vercel.app/api/debug/test-sync
```

**Example Response:**
```json
{
  "success": true,
  "fetched": {
    "products": 2,
    "members": 5,
    "subscriptions": 3
  },
  "mapped": {
    "sources": 2,
    "docs": 2,
    "members": 5
  },
  "verified": {
    "membersInDb": 5,
    "sourcesInDb": 2,
    "docsInDb": 2
  }
}
```

## Testing Workflow

### Step 1: Check Status

First, check your current setup:

```bash
curl https://your-app.vercel.app/api/debug/whop-status | jq
```

### Step 2: Run Test Sync

Trigger a sync with mock data:

```bash
curl -X POST https://your-app.vercel.app/api/debug/test-sync | jq
```

### Step 3: Verify in Supabase

Check your Supabase tables:

```sql
-- Check members
SELECT COUNT(*) FROM members;
SELECT * FROM members LIMIT 5;

-- Check products/bounties
SELECT COUNT(*) FROM bounties;
SELECT * FROM bounties LIMIT 5;

-- Check AI sources and docs
SELECT COUNT(*) FROM ai_sources;
SELECT * FROM ai_sources;

SELECT COUNT(*) FROM ai_docs;
SELECT * FROM ai_docs LIMIT 5;

SELECT COUNT(*) FROM ai_chunks;
SELECT * FROM ai_chunks LIMIT 5;
```

### Step 4: Test with Real Data (Optional)

If you have Whop credentials:

1. Set in Vercel environment variables:
   - `WHOP_API_KEY`: Your Whop API key
   - `WHOP_ORG_ID`: Your Whop organization ID
   - `WHOP_SYNC_ENABLED`: `true`

2. Run test sync again:
   ```bash
   curl -X POST https://your-app.vercel.app/api/debug/test-sync
   ```

## Expected Behavior

### Without Credentials (Mock Mode)

- Returns deterministic test data: 2 products, 5 members, 3 subscriptions
- Inserts into Supabase tables
- Safe to run repeatedly (idempotent)

### With Credentials (Real Mode)

- Fetches live data from Whop API
- Respects rate limits (429 backoff)
- Handles large datasets with pagination
- Idempotent upserts

## Troubleshooting

### No Data Appearing

1. **Check Status Endpoint**: Verify `database.connected` is `true`
2. **Check Migrations**: Ensure all Supabase migrations have run:
   - `02_whop_docs.sql`
   - `04_ai_content_index.sql`
3. **Check RLS**: Verify RLS policies allow service role writes

### Errors

- **"Whop sync is not enabled"**: Set `WHOP_SYNC_ENABLED=true`
- **"Rate limit exceeded"**: Wait 5 minutes between syncs
- **"DEMO_HUB_ID not set"**: Set in Vercel environment variables
- **Database errors**: Check Supabase connection and table existence

### Logs

Check Vercel function logs for detailed error messages:

```bash
vercel logs --follow
```

Look for:
- `[Whop Fetchers]` - Fetching from Whop
- `[Whop Mappers]` - Mapping to Supabase
- `[Whop Sync]` - Overall orchestration

