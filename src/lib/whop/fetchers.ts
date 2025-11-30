import { z } from "zod"
import { env } from "../env"
import { getWhopClient } from "../whop"
import { upsertDocAndChunks } from "../rag/ingest"

export type WhopSourceKind = "products" | "announcements" | "hub" | "posts"

export const WhopSyncInput = z.object({
  hubId: z.string().min(1),
  kind: z.custom<WhopSourceKind>(),
  sourceId: z.string().optional(),
  maxItems: z.number().default(200),
})

export type WhopSyncInputType = z.infer<typeof WhopSyncInput>

export interface WhopSyncResult {
  added: number
  updated: number
  skipped: number
  count: number
  source: string
}

/**
 * Sync Whop content into the RAG pipeline
 */
export async function syncWhopSource(
  input: WhopSyncInputType
): Promise<WhopSyncResult> {
  const { hubId, kind, sourceId, maxItems } = WhopSyncInput.parse(input)
  const whop = getWhopClient()

  if (!whop) {
    throw new Error(
      "Whop client not available. Ensure WHOP_API_KEY is set and @whop/sdk is configured."
    )
  }

  switch (kind) {
    case "products":
      return syncProducts({ whop, hubId, maxItems })
    case "announcements":
      return syncAnnouncements({ whop, hubId, maxItems })
    case "hub":
      return syncHubPages({ whop, hubId, maxItems })
    case "posts":
      return syncForumPosts({ whop, hubId, maxItems, sourceId })
    default:
      throw new Error(`Unknown whop kind: ${kind as string}`)
  }
}

async function syncProducts({
  whop,
  hubId,
  maxItems,
}: {
  whop: any
  hubId: string
  maxItems: number
}): Promise<WhopSyncResult> {
  let items: any[] = []

  try {
    // Try different possible API patterns
    if (whop.products?.list) {
      const response = await whop.products.list({ companyId: hubId, limit: maxItems })
      items = Array.isArray(response) ? response : response?.data || []
    } else if (whop.listProducts) {
      items = await whop.listProducts(hubId)
    } else {
      console.warn("[Whop Fetchers] Products API not found on client")
      items = []
    }
  } catch (error: any) {
    console.error("[Whop Fetchers] Error fetching products:", error.message)
    items = []
  }

  return indexItems(
    hubId,
    "whop:products",
    items.map(mapProductToDoc)
  )
}

async function syncAnnouncements({
  whop,
  hubId,
  maxItems,
}: {
  whop: any
  hubId: string
  maxItems: number
}): Promise<WhopSyncResult> {
  let items: any[] = []

  try {
    if (whop.announcements?.list) {
      const response = await whop.announcements.list({
        companyId: hubId,
        limit: maxItems,
      })
      items = Array.isArray(response) ? response : response?.data || []
    } else if (whop.listAnnouncements) {
      items = await whop.listAnnouncements(hubId)
    } else {
      console.warn("[Whop Fetchers] Announcements API not found on client")
      items = []
    }
  } catch (error: any) {
    console.error("[Whop Fetchers] Error fetching announcements:", error.message)
    items = []
  }

  return indexItems(
    hubId,
    "whop:announcements",
    items.map(mapAnnouncementToDoc)
  )
}

async function syncHubPages({
  whop,
  hubId,
  maxItems,
}: {
  whop: any
  hubId: string
  maxItems: number
}): Promise<WhopSyncResult> {
  let pages: any[] = []

  try {
    if (whop.hub?.pages) {
      const response = await whop.hub.pages({ companyId: hubId, limit: maxItems })
      pages = Array.isArray(response) ? response : response?.data || []
    } else if (whop.getHubPages) {
      pages = await whop.getHubPages(hubId)
    } else {
      console.warn("[Whop Fetchers] Hub pages API not found on client")
      pages = []
    }
  } catch (error: any) {
    console.error("[Whop Fetchers] Error fetching hub pages:", error.message)
    pages = []
  }

  return indexItems(
    hubId,
    "whop:hub",
    pages.map(mapHubPageToDoc)
  )
}

async function syncForumPosts({
  whop,
  hubId,
  maxItems,
  sourceId,
}: {
  whop: any
  hubId: string
  maxItems: number
  sourceId?: string
}): Promise<WhopSyncResult> {
  if (!sourceId) {
    throw new Error("sourceId is required for posts sync")
  }

  let posts: any[] = []

  try {
    if (whop.forum?.posts) {
      const response = await whop.forum.posts({
        forumId: sourceId,
        companyId: hubId,
        limit: maxItems,
      })
      posts = Array.isArray(response) ? response : response?.data || []
    } else if (whop.getForumPosts) {
      posts = await whop.getForumPosts(sourceId)
    } else {
      console.warn("[Whop Fetchers] Forum posts API not found on client")
      posts = []
    }
  } catch (error: any) {
    console.error("[Whop Fetchers] Error fetching forum posts:", error.message)
    posts = []
  }

  return indexItems(
    hubId,
    "whop:posts",
    posts.map(mapPostToDoc)
  )
}

// --- Mappers: adapt to real Whop shapes as needed (non-breaking, safe defaults) ---
function mapProductToDoc(p: any) {
  return {
    external_id: `product:${p?.id || ""}`,
    title: p?.name ?? "",
    text: p?.description ?? "",
    url: p?.url,
  }
}

function mapAnnouncementToDoc(a: any) {
  return {
    external_id: `announcement:${a?.id || ""}`,
    title: a?.title ?? "",
    text: a?.body ?? a?.content ?? "",
    url: a?.url,
  }
}

function mapHubPageToDoc(pg: any) {
  return {
    external_id: `hub:${pg?.id || ""}`,
    title: pg?.title ?? "",
    text: pg?.content ?? pg?.body ?? "",
    url: pg?.url,
  }
}

function mapPostToDoc(post: any) {
  return {
    external_id: `post:${post?.id || ""}`,
    title: post?.title ?? "",
    text: post?.body ?? post?.content ?? "",
    url: post?.url,
  }
}

// --- Indexing: uses existing ingest helper ---
async function indexItems(
  hubId: string,
  kind: string,
  docs: Array<{ external_id: string; title: string; text: string; url?: string }>
): Promise<WhopSyncResult> {
  let added = 0
  let updated = 0
  let skipped = 0

  for (const d of docs) {
    try {
      const res = await upsertDocAndChunks({
        hubId,
        sourceKind: kind,
        externalId: d.external_id,
        title: d.title,
        url: d.url,
        text: d.text,
      })

      if (res.status === "skipped") {
        skipped++
      } else if (res.status === "updated") {
        updated++
      } else {
        added++
      }
    } catch (error: any) {
      console.error(
        `[Whop Fetchers] Error indexing doc ${d.external_id}:`,
        error.message
      )
      // Continue with other docs even if one fails
      skipped++
    }
  }

  return {
    added,
    updated,
    skipped,
    count: docs.length,
    source: kind,
  }
}



