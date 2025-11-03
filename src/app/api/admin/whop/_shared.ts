import { NextRequest } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { env } from "@/lib/env"

export async function assertAdmin(req: NextRequest) {
  const token = req.headers.get("x-admin-token")
  if (!token || token !== env.ADMIN_TASK_TOKEN) {
    throw new Error("unauthorized")
  }
}

const supabase = () => getSupabaseServer()

export async function upsertMembers(records: any[], hubId: string) {
  const s = supabase()
  if (!records || records.length === 0) return 0
  
  const mapped = records.map((r: any) => ({
    hub_id: hubId,
    whop_member_id: r?.id ?? r?.user_id ?? null,
    display_name: r?.user?.username ?? r?.username ?? "member",
    email: r?.user?.email ?? null,
    role: r?.tier?.name?.toLowerCase() ?? "member",
    joined_at: r?.created_at ?? new Date().toISOString(),
    last_active_at: r?.last_active_at ?? r?.updated_at ?? new Date().toISOString(),
  }))
  
  const { error } = await s
    .from("members")
    .upsert(mapped, { onConflict: "hub_id,whop_member_id", ignoreDuplicates: false })
  
  if (error) {
    console.error("[Admin Backfill] Error upserting members:", error)
    return 0
  }
  
  return mapped.length
}

export async function upsertProducts(records: any[], hubId: string) {
  const s = supabase()
  if (!records || records.length === 0) return 0
  
  const mapped = records.map((r: any) => ({
    id: r?.id,
    name: r?.name ?? r?.title ?? "Untitled",
    hub_id: hubId,
    amount: r?.price && typeof r.price === "number" ? r.price : null,
    status: r?.status ?? "active",
    created_at: r?.created_at ?? new Date().toISOString(),
    ends_at: null,
  }))
  
  const { error } = await s
    .from("bounties")
    .upsert(mapped, { onConflict: "id", ignoreDuplicates: false })
  
  if (error) {
    console.error("[Admin Backfill] Error upserting products:", error)
    return 0
  }
  
  return mapped.length
}

// Note: We currently don't have separate tables for organizations or subscriptions
// These are placeholder functions for future implementation
export async function upsertOrganizations(_records: any[], _hubId: string) {
  // TODO: Implement once we add an organizations table
  return 0
}

export async function upsertSubscriptions(_records: any[], _hubId: string) {
  // TODO: Implement once we add a subscriptions table
  return 0
}

