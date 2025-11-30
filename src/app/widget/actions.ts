"use server"

import { createClient } from "@supabase/supabase-js"

type Claims = { hub_id: string; member_id: string }
function decodeClaims(token: string): Claims {
  // non-cryptographic decode; we trust /api/widget/session already
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString())
  return { hub_id: payload.hub_id, member_id: payload.member_id }
}

export async function claimBountyAction(bountyId: string, memberToken: string) {
  const { hub_id, member_id } = decodeClaims(memberToken)

  // Use server-side env vars since this is a server action
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables."
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${memberToken}` } },
  })

  const { error } = await supabase.from("bounty_events").insert({
    hub_id,
    bounty_id: bountyId,
    member_id,
    status: "claimed",
    meta: {},
  })

  if (error) throw error
  return { ok: true }
}