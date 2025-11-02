import { getSupabaseServer } from "@/lib/supabase-server"

export interface Channel {
  id: string
  name: string
  slug: string
  description?: string
}

export interface BountyOption {
  id: string
  name: string
  status: string
}

export interface TierOption {
  value: string
  label: string
}

export async function getChannelsForHub(hubId: string): Promise<Channel[]> {
  try {
    const supa = getSupabaseServer()
    const { data, error } = await supa
      .from("channels")
      .select("id, name, slug, description")
      .eq("hub_id", hubId)
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching channels:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Failed to fetch channels:", error)
    return []
  }
}

export async function getActiveBountiesForHub(hubId: string): Promise<BountyOption[]> {
  try {
    const supa = getSupabaseServer()
    const { data, error } = await supa
      .from("bounties")
      .select("id, name, status")
      .eq("hub_id", hubId)
      .eq("status", "active")
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching bounties:", error)
      return []
    }

    return (data || []).map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
    }))
  } catch (error) {
    console.error("Failed to fetch bounties:", error)
    return []
  }
}

export async function getTiersForHub(hubId: string): Promise<TierOption[]> {
  try {
    const supa = getSupabaseServer()
    // Try to get tiers from members table - check multiple possible column names
    // If tiers table exists, prefer that
    let tiers: string[] = []
    
    // First try a tiers table if it exists
    try {
      const { data: tiersData } = await supa
        .from("tiers")
        .select("id, name")
        .eq("hub_id", hubId)
        .order("name", { ascending: true })
      
      if (tiersData && tiersData.length > 0) {
        return tiersData.map((t) => ({
          value: t.id,
          label: t.name,
        }))
      }
    } catch {
      // Tiers table doesn't exist, fall through
    }
    
    // Fallback: try to get distinct tiers from members
    try {
      const { data, error } = await supa
        .from("members")
        .select("tier, whop_tier")
        .eq("hub_id", hubId)

      if (!error && data) {
        const uniqueTiers = new Set<string>()
        data.forEach((m: any) => {
          if (m.tier) uniqueTiers.add(m.tier)
          if (m.whop_tier) uniqueTiers.add(m.whop_tier)
        })
        tiers = Array.from(uniqueTiers)
      }
    } catch {
      // Members query failed, use defaults
    }

    // Default tiers if none found
    if (tiers.length === 0) {
      return [
        { value: "free", label: "Free" },
        { value: "premium", label: "Premium" },
        { value: "vip", label: "VIP" },
      ]
    }

    return tiers
      .sort()
      .map((tier) => ({
        value: tier,
        label: tier.charAt(0).toUpperCase() + tier.slice(1),
      }))
  } catch (error) {
    console.error("Failed to fetch tiers:", error)
    // Return defaults on error
    return [
      { value: "free", label: "Free" },
      { value: "premium", label: "Premium" },
      { value: "vip", label: "VIP" },
    ]
  }
}

export async function validateChannelExists(
  hubId: string,
  channelId: string
): Promise<boolean> {
  try {
    const supa = getSupabaseServer()
    const { data, error } = await supa
      .from("channels")
      .select("id")
      .eq("id", channelId)
      .eq("hub_id", hubId)
      .single()

    return !error && data !== null
  } catch {
    return false
  }
}

export async function validateBountyExists(
  hubId: string,
  bountyId: string
): Promise<boolean> {
  try {
    const supa = getSupabaseServer()
    const { data, error } = await supa
      .from("bounties")
      .select("id")
      .eq("id", bountyId)
      .eq("hub_id", hubId)
      .single()

    return !error && data !== null
  } catch {
    return false
  }
}

