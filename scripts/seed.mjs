// scripts/seed.mjs
import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, "../data")

const args = new Set(process.argv.slice(2))
const FORCE = args.has("--force")
const RESET = args.has("--reset")

const today = new Date()
const iso = (d) => new Date(d).toISOString()
const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// --- Seed payloads (keep in sync with src/lib/types.ts)
const HUB_ID = "demo-hub"

const members = [
  { id: "m_1", username: "Alice", joinedAt: iso(daysAgo(40)), lastActiveAt: iso(daysAgo(1)),  messagesCount: 12, roles: ["member"] },
  { id: "m_2", username: "Bob",   joinedAt: iso(daysAgo(15)), lastActiveAt: iso(daysAgo(8)),  messagesCount: 3,  roles: ["member"] },
  { id: "m_3", username: "Cara",  joinedAt: iso(daysAgo( 3)), lastActiveAt: iso(daysAgo(3)),  messagesCount: 0,  roles: ["member"] },
]

const bounties = [
  { id: "b_1", title: "Create a welcome video",       rewardCents: 5000, status: "active",    participants: 2, deadline: iso(daysAgo(-3)), createdAt: iso(daysAgo(14)) },
  { id: "b_2", title: "Write a community quickstart", rewardCents: 7500, status: "completed", participants: 5, deadline: iso(daysAgo( 0)), createdAt: iso(daysAgo(28)) },
]

const events = [
  // older completions
  { type: "bounty_completed", memberId: "m_1", ts: iso(daysAgo(21)), metadata: { bountyId: "b_2", hubId: HUB_ID } },
  { type: "bounty_completed", memberId: "m_2", ts: iso(daysAgo(13)), metadata: { bountyId: "b_2", hubId: HUB_ID } },
  // some "activity" so Overview can compute activeUsers/messagesCount
  { type: "posted",           memberId: "m_1", ts: iso(daysAgo(2)),  metadata: { hubId: HUB_ID } },
  { type: "posted",           memberId: "m_2", ts: iso(daysAgo(9)),  metadata: { hubId: HUB_ID } },
  { type: "posted",           memberId: "m_3", ts: iso(daysAgo(3)),  metadata: { hubId: HUB_ID } },
]

const ai_config = {
  mode: "assist",
  tone: "friendly",
  bannedPhrases: [],
  escalateIf: ["refund", "chargeback"],
  nudgeRecipes: [
    { name: "Come back", trigger: "inactive_7d", messageTemplate: "We miss you in the hub—new content is waiting!" },
    { name: "First Post", trigger: "no_posts_3d", messageTemplate: "Say hi in #general and introduce yourself 👋" },
  ],
}

const announcements = []
const nudge_log = []

// Optional stats baseline (adapter can also derive from events)
const stats = {
  membersTotal: members.length,
  activeUsers: 2,
  messagesCount: 6,
  bountiesCompleted: 1,
  // engagementTrend intentionally omitted; adapter can generate
}

// Map store keys → files (align with your store.ts)
const FILES = {
  members:       "members.json",
  bounties:      "bounties.json",
  events:        "events.json",
  ai_config:     "ai_config.json",
  announcements: "announcements.json",
  nudge_log:     "nudge_log.json",
  stats:         "stats.json",
}

const PAYLOADS = {
  members,
  bounties,
  events,
  ai_config,
  announcements,
  nudge_log,
  stats,
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function writeIfMissingOrForce(filePath, data) {
  try {
    if (!FORCE) {
      await fs.access(filePath)
      return { path: filePath, status: "kept" }
    }
  } catch {
    // file doesn't exist → fall through to write
  }
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8")
  return { path: filePath, status: FORCE ? "overwritten" : "created" }
}

async function resetDir(dir) {
  await fs.rm(dir, { recursive: true, force: true })
}

async function main() {
  if (RESET) {
    console.log("💣 Resetting ./data …")
    await resetDir(DATA_DIR)
  }

  await ensureDir(DATA_DIR)

  const results = []
  for (const [key, filename] of Object.entries(FILES)) {
    const p = path.join(DATA_DIR, filename)
    const payload = PAYLOADS[key]
    results.push(await writeIfMissingOrForce(p, payload))
  }

  console.log("\n📦 Seed results:")
  for (const r of results) console.log(` - ${path.basename(r.path)}: ${r.status}`)
  console.log(`\n✅ Done. Data directory: ${DATA_DIR}`)
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})











