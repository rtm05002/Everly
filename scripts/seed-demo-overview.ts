/**
 * DEMO ONLY – safe to re-run; only affects DEMO_HUB_ID
 * 
 * Seed rich demo data for the Overview page to make charts look alive.
 * 
 * Based on src/server/queries/overview.ts:
 * - members table: Total Members (count by hub_id)
 * - activity_logs table: Messages (type="posted"), Active Users (unique member_id), Engagement Trend (created_at)
 * - bounty_events table: Bounties Completed (status="completed"), Active Users (unique member_id), Engagement Trend (created_at)
 * - bounties table: Reference for bounty_events
 * 
 * Usage: pnpm tsx scripts/seed-demo-overview.ts
 */

// Load environment variables from .env.local before importing modules
import { config } from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, "..", ".env.local")
config({ path: envPath })

async function main() {
  // Dynamic imports after env vars are loaded
  const { createServiceClient } = await import("@/server/db")
  const crypto = await import("crypto")

  const DEMO_HUB_ID = process.env.DEMO_HUB_ID

  if (!DEMO_HUB_ID) {
    throw new Error("DEMO_HUB_ID environment variable is required. Set it in .env.local")
  }

  console.log(`🌱 Seeding rich demo data for hub: ${DEMO_HUB_ID}`)
  console.log("⚠️  DEMO ONLY – This will only affect data for DEMO_HUB_ID\n")

  const db = createServiceClient()

  if (!db) {
    throw new Error("Missing Supabase client. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE are set.")
  }

  // Helper: Random date within a range (days ago)
  function randomDateInRange(minDaysAgo: number, maxDaysAgo: number): Date {
    const daysAgo = minDaysAgo + Math.random() * (maxDaysAgo - minDaysAgo)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    date.setHours(Math.floor(Math.random() * 24))
    date.setMinutes(Math.floor(Math.random() * 60))
    date.setSeconds(Math.floor(Math.random() * 60))
    date.setMilliseconds(Math.floor(Math.random() * 1000))
    return date
  }

  // Helper: Get day key (YYYY-MM-DD) for a date
  function dayKey(date: Date): string {
    return date.toISOString().slice(0, 10)
  }

  // Realistic demo member names
  const firstNames = [
    "Alex", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "Avery", "Quinn",
    "Sam", "Cameron", "Dakota", "Skyler", "River", "Phoenix", "Sage",
    "Sarah", "Michael", "Emily", "David", "Jessica", "James", "Ashley",
    "Christopher", "Amanda", "Daniel", "Melissa", "Matthew", "Nicole",
    "Anthony", "Michelle", "Mark", "Kimberly", "Donald", "Amy"
  ]

  const lastNames = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas",
    "Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris",
    "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen"
  ]

  function generateMemberName(index: number): string {
    const firstName = firstNames[index % firstNames.length]
    const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length]
    return `${firstName} ${lastName}`
  }

  // Step 1: Delete existing demo data (idempotent)
  console.log("🧹 Cleaning up existing demo data for DEMO_HUB_ID...")

  // Delete in order: events first, then bounties, then members
  const { error: deleteActivityError, count: deletedActivityCount } = await db
    .from("activity_logs")
    .delete({ count: "exact" })
    .eq("hub_id", DEMO_HUB_ID)

  if (deleteActivityError) {
    throw new Error(`Failed to delete activity_logs: ${deleteActivityError.message}`)
  }
  console.log(`   Deleted ${deletedActivityCount || 0} activity_logs`)

  const { error: deleteBountyEventsError, count: deletedBountyEventsCount } = await db
    .from("bounty_events")
    .delete({ count: "exact" })
    .eq("hub_id", DEMO_HUB_ID)

  if (deleteBountyEventsError) {
    throw new Error(`Failed to delete bounty_events: ${deleteBountyEventsError.message}`)
  }
  console.log(`   Deleted ${deletedBountyEventsCount || 0} bounty_events`)

  // Delete bounties for this hub
  const { error: deleteBountiesError, count: deletedBountiesCount } = await db
    .from("bounties")
    .delete({ count: "exact" })
    .eq("hub_id", DEMO_HUB_ID)

  if (deleteBountiesError) {
    throw new Error(`Failed to delete bounties: ${deleteBountiesError.message}`)
  }
  console.log(`   Deleted ${deletedBountiesCount || 0} bounties`)

  // Delete members for this hub
  const { error: deleteMembersError, count: deletedMembersCount } = await db
    .from("members")
    .delete({ count: "exact" })
    .eq("hub_id", DEMO_HUB_ID)

  if (deleteMembersError) {
    throw new Error(`Failed to delete members: ${deleteMembersError.message}`)
  }
  console.log(`   Deleted ${deletedMembersCount || 0} members`)

  // Step 2: Create ~40 demo members with realistic names, spread over last 120 days
  console.log("\n👥 Creating ~40 demo members with realistic names (spread over last 120 days)...")

  const memberCount = 40
  const members: Array<{ id: string; hub_id: string; whop_member_id: string; joined_at: string }> = []
  const memberIds: string[] = []

  for (let i = 1; i <= memberCount; i++) {
    const memberId = crypto.randomUUID()
    memberIds.push(memberId)

    // Spread members over 120 days (more recent = more members)
    const progress = i / memberCount // 0 to 1
    const daysAgo = 120 * (1 - progress * progress) // Quadratic curve for more recent bias
    const joinDate = randomDateInRange(0, daysAgo)

    const whopMemberId = `demo-member-${i}`

    members.push({
      id: memberId,
      hub_id: DEMO_HUB_ID,
      whop_member_id: whopMemberId,
      joined_at: joinDate.toISOString(),
    })
  }

  // Insert members in batches
  const batchSize = 50
  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize)
    const { error: insertError } = await db.from("members").insert(batch)

    if (insertError) {
      throw new Error(`Failed to insert members: ${insertError.message}`)
    }
  }

  console.log(`   ✅ Created ${members.length} members`)

  // Step 3: Create 3-5 demo bounties with mix of active and completed
  console.log("\n🏆 Creating 3-5 demo bounties (mix of active/completed)...")

  const demoBounties = [
    { name: "Welcome Challenge", reward_type: "points", amount: 100, status: "active" },
    { name: "Weekly Activity Challenge", reward_type: "cash", amount: 2500, status: "active" },
    { name: "Power User Quest", reward_type: "badge", badge_name: "Power User", badge_icon: "⭐", status: "completed" },
    { name: "Community Contributor", reward_type: "points", amount: 500, status: "active" },
    { name: "Early Adopter Badge", reward_type: "badge", badge_name: "Early Adopter", badge_icon: "🚀", status: "completed" },
  ]

  const bountyIds: string[] = []
  const activeBountyIds: string[] = []

  for (const bounty of demoBounties) {
    const bountyId = crypto.randomUUID()
    const { error: insertError } = await db.from("bounties").insert({
      id: bountyId,
      hub_id: DEMO_HUB_ID,
      name: bounty.name,
      reward_type: bounty.reward_type,
      amount: bounty.amount || null,
      badge_name: bounty.badge_name || null,
      badge_icon: bounty.badge_icon || null,
      status: bounty.status,
    })

    if (insertError) {
      console.error(`   ⚠️  Failed to create bounty "${bounty.name}": ${insertError.message}`)
    } else {
      bountyIds.push(bountyId)
      if (bounty.status === "active") {
        activeBountyIds.push(bountyId)
      }
    }
  }

  console.log(`   ✅ Created ${bountyIds.length} bounties (${activeBountyIds.length} active, ${bountyIds.length - activeBountyIds.length} completed)`)

  // Step 4: Create 15-25 bounty completion events over last 90 days
  console.log("\n🏅 Creating 15-25 bounty completion events (last 90 days)...")

  const completionCount = 15 + Math.floor(Math.random() * 11) // 15-25 inclusive
  const bountyEvents: Array<{
    hub_id: string
    member_id: string
    bounty_id: string
    status: string
    created_at: string
  }> = []

  for (let i = 0; i < completionCount; i++) {
    const memberId = memberIds[Math.floor(Math.random() * memberIds.length)]
    const bountyId = bountyIds[Math.floor(Math.random() * bountyIds.length)]
    
    // Spread over last 90 days, bias toward recent days
    const progress = i / completionCount // 0 to 1
    const daysAgo = 90 * (1 - progress * progress * 0.7) // More recent bias
    const completedAt = randomDateInRange(0, daysAgo)

    bountyEvents.push({
      hub_id: DEMO_HUB_ID,
      member_id: memberId,
      bounty_id: bountyId,
      status: "completed", // overview.ts filters for status="completed"
      created_at: completedAt.toISOString(),
    })
  }

  // Insert bounty events in batches
  if (bountyEvents.length > 0) {
    for (let i = 0; i < bountyEvents.length; i += batchSize) {
      const batch = bountyEvents.slice(i, i + batchSize)
      const { error: insertError } = await db.from("bounty_events").insert(batch)

      if (insertError) {
        throw new Error(`Failed to insert bounty_events: ${insertError.message}`)
      }
    }
    console.log(`   ✅ Created ${bountyEvents.length} bounty completion events`)
  }

  // Step 5: Create several hundred activity_logs (messages) over last 90 days
  // Create power users, moderate users, and inactive members
  console.log("\n💬 Creating several hundred activity logs (messages) over last 90 days...")

  // Classify members: 20% power users, 50% moderate, 30% inactive
  const powerUserCount = Math.floor(memberCount * 0.2)
  const moderateUserCount = Math.floor(memberCount * 0.5)
  const powerUsers = memberIds.slice(0, powerUserCount)
  const moderateUsers = memberIds.slice(powerUserCount, powerUserCount + moderateUserCount)
  const inactiveUsers = memberIds.slice(powerUserCount + moderateUserCount)

  const activityLogs: Array<{
    hub_id: string
    member_id: string
    type: string
    created_at: string
  }> = []

  // Generate activity for each of the last 90 days
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const dayDate = new Date(today)
    dayDate.setDate(dayDate.getDate() - dayOffset)
    dayDate.setHours(0, 0, 0, 0)

    const isRecent = dayOffset < 7
    const isToday = dayOffset === 0
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6
    
    // Never skip today, recent days: only skip ~5% of days, older days: skip ~20%
    const skipChance = isToday ? 0 : (isRecent ? 0.05 : (isWeekend ? 0.25 : 0.15))
    const shouldSkip = Math.random() < skipChance

    if (shouldSkip) {
      continue
    }

    // Power users: 5-15 messages/day, Moderate: 1-5 messages/day, Inactive: 0-2 messages/day (rare)
    // Today: higher activity
    const powerUserMessages = isToday ? 8 : (isRecent ? 6 : 4) + Math.floor(Math.random() * (isToday ? 8 : 6))
    const moderateUserMessages = isToday ? 4 : (isRecent ? 2 : 1) + Math.floor(Math.random() * (isToday ? 4 : 3))
    const inactiveUserMessages = Math.random() < 0.1 ? Math.floor(Math.random() * 2) : 0 // 10% chance, 0-1 messages

    // Select active users for this day
    const activePowerUsers = powerUsers.slice(0, Math.min(powerUsers.length, 3 + Math.floor(Math.random() * 5)))
    const activeModerateUsers = moderateUsers.slice(0, Math.min(moderateUsers.length, 5 + Math.floor(Math.random() * 10)))
    const activeInactiveUsers = inactiveUsers.filter(() => Math.random() < 0.1).slice(0, 3)

    // Generate messages for power users
    for (const memberId of activePowerUsers) {
      const messageCount = powerUserMessages
      for (let msg = 0; msg < messageCount; msg++) {
        const messageTime = new Date(dayDate)
        messageTime.setHours(Math.floor(Math.random() * 24))
        messageTime.setMinutes(Math.floor(Math.random() * 60))
        messageTime.setSeconds(Math.floor(Math.random() * 60))
        messageTime.setMilliseconds(Math.floor(Math.random() * 1000))

        activityLogs.push({
          hub_id: DEMO_HUB_ID,
          member_id: memberId,
          type: "posted", // overview.ts filters for type="posted"
          created_at: messageTime.toISOString(),
        })
      }
    }

    // Generate messages for moderate users
    for (const memberId of activeModerateUsers) {
      const messageCount = moderateUserMessages
      for (let msg = 0; msg < messageCount; msg++) {
        const messageTime = new Date(dayDate)
        messageTime.setHours(Math.floor(Math.random() * 24))
        messageTime.setMinutes(Math.floor(Math.random() * 60))
        messageTime.setSeconds(Math.floor(Math.random() * 60))
        messageTime.setMilliseconds(Math.floor(Math.random() * 1000))

        activityLogs.push({
          hub_id: DEMO_HUB_ID,
          member_id: memberId,
          type: "posted",
          created_at: messageTime.toISOString(),
        })
      }
    }

    // Generate messages for inactive users (rare)
    for (const memberId of activeInactiveUsers) {
      for (let msg = 0; msg < inactiveUserMessages; msg++) {
        const messageTime = new Date(dayDate)
        messageTime.setHours(Math.floor(Math.random() * 24))
        messageTime.setMinutes(Math.floor(Math.random() * 60))
        messageTime.setSeconds(Math.floor(Math.random() * 60))
        messageTime.setMilliseconds(Math.floor(Math.random() * 1000))

        activityLogs.push({
          hub_id: DEMO_HUB_ID,
          member_id: memberId,
          type: "posted",
          created_at: messageTime.toISOString(),
        })
      }
    }
  }

  // Insert activity logs in batches
  for (let i = 0; i < activityLogs.length; i += batchSize) {
    const batch = activityLogs.slice(i, i + batchSize)
    const { error: insertError } = await db.from("activity_logs").insert(batch)

    if (insertError) {
      throw new Error(`Failed to insert activity_logs: ${insertError.message}`)
    }
  }

  console.log(`   ✅ Created ${activityLogs.length} activity_logs (messages)`)

  // Summary
  console.log("\n" + "=".repeat(60))
  console.log("✅ Rich demo data seeding complete!")
  console.log("=".repeat(60))
  console.log(`📊 Summary for DEMO_HUB_ID=${DEMO_HUB_ID}:`)
  console.log(`   • Members: ${members.length} (spread over last 120 days)`)
  console.log(`   • Bounties: ${bountyIds.length} (${activeBountyIds.length} active, ${bountyIds.length - activeBountyIds.length} completed)`)
  console.log(`   • Bounty completion events: ${bountyEvents.length} (last 90 days)`)
  console.log(`   • Activity logs (messages): ${activityLogs.length} (last 90 days)`)
  console.log("\n🎯 Visit /overview to see the rich demo data in action!")
  console.log("\n📋 Tables seeded:")
  console.log("   • members (hub_id, id, whop_member_id, display_name, joined_at)")
  console.log("   • bounties (hub_id, id, name, status, reward_type, amount/badge_name/badge_icon)")
  console.log("   • bounty_events (hub_id, member_id, bounty_id, status='completed', created_at)")
  console.log("   • activity_logs (hub_id, member_id, type='posted', created_at)")
  console.log("\n📈 Event types & status values used:")
  console.log("   • activity_logs.type = 'posted' (for Messages KPI)")
  console.log("   • bounty_events.status = 'completed' (for Bounties Completed KPI)")
  console.log("   • Timestamp columns: members.joined_at, activity_logs.created_at, bounty_events.created_at")
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error)
  process.exit(1)
})
