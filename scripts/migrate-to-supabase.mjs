// scripts/migrate-to-supabase.mjs
import { createClient } from "@supabase/supabase-js"
import { promises as fs } from "node:fs"
import path from "node:path"
import process from "node:process"

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE
const DEMO_HUB_ID = process.env.DEMO_HUB_ID

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !DEMO_HUB_ID) {
  console.error("Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE, DEMO_HUB_ID")
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
})

const DATA_DIR = path.resolve("data")

async function readJson(file) {
  try {
    const p = path.join(DATA_DIR, file)
    const raw = await fs.readFile(p, "utf8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function toISO(x) {
  if (!x) return null
  const d = new Date(x)
  return isNaN(d) ? null : d.toISOString()
}

function centsToDecimal(cents) {
  if (cents == null) return 0
  return Math.round((Number(cents) / 100) * 100) / 100
}

async function ensureHub() {
  // upsert hub if it doesn't exist
  const { data, error } = await sb.from("hubs").select("id").eq("id", DEMO_HUB_ID).maybeSingle()
  if (error) throw error
  if (!data) {
    const { error: insErr } = await sb.from("hubs").insert({
      id: DEMO_HUB_ID,
      creator_id: "local",
      name: "Demo Hub",
      plan: "free",
      settings: {},
    })
    if (insErr) throw insErr
    console.log(`• Created hub ${DEMO_HUB_ID}`)
  } else {
    console.log(`• Hub ${DEMO_HUB_ID} exists`)
  }
}

async function migrateMembers(members) {
  const map = new Map() // oldId -> newUuid
  if (!Array.isArray(members) || members.length === 0) return map

  console.log(`• Migrating ${members.length} members…`)
  for (const m of members) {
    const payload = {
      hub_id: DEMO_HUB_ID,
      // Reuse username (or old id) as whop_member_id since schema requires it
      whop_member_id: m.username || m.id || crypto.randomUUID(),
      role: Array.isArray(m.roles) && m.roles.length ? m.roles[0] : "member",
      joined_at: toISO(m.joinedAt) || new Date().toISOString(),
      last_active_at: toISO(m.lastActiveAt),
      risk_score: 0,
    }
    const { data, error } = await sb.from("members").insert(payload).select("id").single()
    if (error) throw error
    map.set(m.id ?? payload.whop_member_id, data.id)
  }
  console.log(`  ✓ members inserted`)
  return map
}

async function migrateBounties(bounties) {
  const map = new Map() // oldId -> newUuid
  if (!Array.isArray(bounties) || bounties.length === 0) return map

  console.log(`• Migrating ${bounties.length} bounties…`)
  for (const b of bounties) {
    const payload = {
      hub_id: DEMO_HUB_ID,
      name: b.title ?? "Untitled",
      description: null,
      reward_type: "cash",
      amount: centsToDecimal(b.rewardCents ?? 0),
      status: b.status ?? "active",
      starts_at: null,
      ends_at: toISO(b.deadline),
      target_filter: {},
      created_at: toISO(b.createdAt) || new Date().toISOString(),
    }
    const { data, error } = await sb.from("bounties").insert(payload).select("id").single()
    if (error) throw error
    map.set(b.id ?? payload.name, data.id)
  }
  console.log(`  ✓ bounties inserted`)
  return map
}

async function migrateEvents(events, memberMap, bountyMap) {
  if (!Array.isArray(events) || events.length === 0) {
    console.log("• No events.json found (skipping events)")
    return
  }

  let act = 0
  let ben = 0

  console.log(`• Migrating ${events.length} events…`)
  for (const e of events) {
    const ts = toISO(e.ts) || new Date().toISOString()
    const member_id = memberMap.get(e.memberId) || null

    if (e.type === "bounty_completed") {
      const bounty_id = e.metadata?.bountyId ? bountyMap.get(e.metadata.bountyId) : null
      const payload = {
        hub_id: DEMO_HUB_ID,
        bounty_id,
        member_id,
        status: "completed",
        meta: e.metadata ?? {},
        created_at: ts,
      }
      const { error } = await sb.from("bounty_events").insert(payload)
      if (error) throw error
      ben++
    } else {
      // generic activity -> activity_logs (e.g., 'posted', 'joined', etc.)
      const payload = {
        hub_id: DEMO_HUB_ID,
        member_id,
        type: e.type || "activity",
        meta: e.metadata ?? {},
        created_at: ts,
      }
      const { error } = await sb.from("activity_logs").insert(payload)
      if (error) throw error
      act++
    }
  }
  console.log(`  ✓ activity_logs: ${act}, bounty_events: ${ben}`)
}

async function main() {
  console.log("⏩ Migrating file-store data → Supabase…")
  await ensureHub()

  const [members, bounties, events] = await Promise.all([
    readJson("members.json"),
    readJson("bounties.json"),
    readJson("events.json"),
  ])

  const memberMap = await migrateMembers(members || [])
  const bountyMap = await migrateBounties(bounties || [])
  await migrateEvents(events || [], memberMap, bountyMap)

  console.log("✅ Migration complete.")
  console.log("Tip: set DATA_BACKEND=db and restart to verify pages against Supabase.")
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})

