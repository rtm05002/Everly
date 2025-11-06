# URL Source Fetcher Setup

## Overview

The URL Source Fetcher allows you to index content from external websites for use in your AI assistant. It crawls URLs, extracts text, chunks it, and generates embeddings.

## Environment Variables

Add to your `.env.local`:

```bash
# URL Source Fetcher
ENABLE_URL_FETCHER=true
OPENAI_API_KEY=your_key_here  # optional; if missing, chunks are stored with needs_embedding=true
EMBEDDING_MODEL=text-embedding-3-small  # optional, defaults to text-embedding-3-small
MAX_URL_PAGES=15  # optional, defaults to 15
```

## Database Migrations

Run these SQL migrations in your Supabase SQL Editor:

1. `supabase/06_add_url_fetcher_columns.sql` - Adds optional columns for URL sources
2. `supabase/07_refresh_counts_fn.sql` - Adds helper function for refreshing source counts (optional)

## Creating a URL Source

Via API or UI, create a source with:

```json
{
  "kind": "url",
  "name": "My Documentation Site",
  "settings": {
    "start_urls": ["https://example.com/docs"],
    "allow_patterns": ["^https://example.com/docs"],
    "deny_patterns": ["\\?print="],
    "max_pages": 10
  }
}
```

### Settings

- **start_urls** (required): Array of URLs to start crawling from
- **allow_patterns** (optional): Regex patterns for allowed URLs (default: all same-origin)
- **deny_patterns** (optional): Regex patterns for denied URLs
- **max_pages** (optional): Maximum pages to crawl (default: 15, max: 100)

## Syncing

Click "Sync Now" on a URL source in the Sources panel, or call:

```bash
POST /api/assistant/sources/{sourceId}/url-sync
```

The sync will:
1. Crawl URLs starting from `start_urls`
2. Extract text from HTML
3. Check content hash to skip unchanged pages
4. Chunk text (~1200 chars with 100 char overlap)
5. Generate embeddings (if `OPENAI_API_KEY` is set)
6. Store in `ai_docs` and `ai_chunks` tables

## Rate Limiting & Timeouts

- **Crawl rate**: 1 request per second (configurable)
- **Per-page timeout**: 15 seconds
- **Max pages per sync**: 15 (configurable via `MAX_URL_PAGES` or source settings)
- **Max sync runtime**: 2 minutes (for background jobs)

## Graceful Degradation

If `OPENAI_API_KEY` is not set:
- Text is still extracted and chunked
- Chunks are stored with `needs_embedding=true`
- You can generate embeddings later using a backfill endpoint

## Testing

1. Set `ENABLE_URL_FETCHER=true` in your environment
2. Create a URL source with a small test site
3. Click "Sync Now"
4. Verify in Supabase:
   ```sql
   SELECT id, url, content_hash FROM ai_docs WHERE source_id = 'your-source-id';
   SELECT COUNT(*) FROM ai_chunks WHERE doc_id IN (SELECT id FROM ai_docs WHERE source_id = 'your-source-id');
   ```

## Troubleshooting

### No data appearing
- Check that `ENABLE_URL_FETCHER=true`
- Verify source settings include `start_urls`
- Check browser console/network tab for errors
- Verify Supabase migrations have run

### Embeddings not generating
- Check `OPENAI_API_KEY` is set
- Verify API key is valid
- Check `needs_embedding=true` in `ai_chunks` table

### Crawl timeout
- Reduce `max_pages` in source settings
- Check network connectivity
- Verify URLs are accessible

## Background Sync (Optional)

To sync all URL sources automatically:

```bash
POST /api/assistant/sources/url-sync-all
```

This respects the 2-minute runtime limit and processes sources sequentially.

## Disabling

To disable URL fetcher:
- Set `ENABLE_URL_FETCHER=false` in environment
- All endpoints will return `{ ok: false, error: 'URL fetcher disabled' }`

