/**
 * Seed a high-quality demo hub in Supabase for local + production demos
 * 
 * Usage: pnpm tsx scripts/seed-demo-hub.ts
 */

// Load environment variables from .env.local before importing modules
import { config } from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { createClient } from "@supabase/supabase-js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, "..", ".env.local")
config({ path: envPath })

async function main() {
  // Validate required environment variables
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE
  const DEMO_HUB_ID = process.env.DEMO_HUB_ID || "7007b327-c7bb-40c9-8865-a48b99612a62"

  if (!SUPABASE_URL) {
    console.error("❌ Missing SUPABASE_URL environment variable")
    process.exit(1)
  }

  if (!SUPABASE_SERVICE_ROLE) {
    console.error("❌ Missing SUPABASE_SERVICE_ROLE environment variable")
    process.exit(1)
  }

  if (!DEMO_HUB_ID) {
    console.error("❌ Missing DEMO_HUB_ID environment variable")
    process.exit(1)
  }

  console.log(`🌱 Seeding demo hub: ${DEMO_HUB_ID}`)

  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
  })

  try {
    // a) Ensure hub exists
    console.log("📦 Upserting demo hub...")
    const { data: hub, error: hubError } = await supabase
      .from("hubs")
      .upsert(
        {
          id: DEMO_HUB_ID,
          creator_id: "demo_creator",
          name: "Everly Demo Hub",
          plan: "pro",
          settings: { demo: true },
        },
        {
          onConflict: "id",
        }
      )
      .select()
      .single()

    if (hubError) {
      throw new Error(`Failed to upsert hub: ${hubError.message}`)
    }
    console.log("✅ Upserted demo hub")

    // b) Clear old demo data (in order to satisfy FK constraints)
    console.log("\n🧹 Clearing old demo data...")

    // 1. bounty_events
    const { count: eventsCount, error: eventsError } = await supabase
      .from("bounty_events")
      .delete({ count: "exact" })
      .eq("hub_id", DEMO_HUB_ID)

    if (eventsError) {
      throw new Error(`Failed to delete bounty_events: ${eventsError.message}`)
    }
    console.log(`  ✓ Cleared bounty_events: ${eventsCount ?? 0} rows`)

    // 2. bounties
    const { count: bountiesCount, error: bountiesError } = await supabase
      .from("bounties")
      .delete({ count: "exact" })
      .eq("hub_id", DEMO_HUB_ID)

    if (bountiesError) {
      throw new Error(`Failed to delete bounties: ${bountiesError.message}`)
    }
    console.log(`  ✓ Cleared bounties: ${bountiesCount ?? 0} rows`)

    // 3. onboarding_progress
    const { count: progressCount, error: progressError } = await supabase
      .from("onboarding_progress")
      .delete({ count: "exact" })
      .eq("hub_id", DEMO_HUB_ID)

    if (progressError) {
      throw new Error(`Failed to delete onboarding_progress: ${progressError.message}`)
    }
    console.log(`  ✓ Cleared onboarding_progress: ${progressCount ?? 0} rows`)

    // 4. onboarding_steps
    const { count: stepsCount, error: stepsError } = await supabase
      .from("onboarding_steps")
      .delete({ count: "exact" })
      .eq("hub_id", DEMO_HUB_ID)

    if (stepsError) {
      throw new Error(`Failed to delete onboarding_steps: ${stepsError.message}`)
    }
    console.log(`  ✓ Cleared onboarding_steps: ${stepsCount ?? 0} rows`)

    // 5. onboarding_flows
    const { count: flowsCount, error: flowsError } = await supabase
      .from("onboarding_flows")
      .delete({ count: "exact" })
      .eq("hub_id", DEMO_HUB_ID)

    if (flowsError) {
      throw new Error(`Failed to delete onboarding_flows: ${flowsError.message}`)
    }
    console.log(`  ✓ Cleared onboarding_flows: ${flowsCount ?? 0} rows`)

    // c) Insert demo bounties
    console.log("\n🎯 Inserting demo bounties...")
    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const demoBounties = [
      {
        hub_id: DEMO_HUB_ID,
        name: "Introduce yourself in the community",
        description: "Share a bit about yourself and what brings you here. Help us get to know you!",
        reward_type: "points",
        amount: 500,
        badge_name: null,
        badge_icon: null,
        badge_description: null,
        status: "active",
        ends_at: sevenDaysLater.toISOString(),
      },
      {
        hub_id: DEMO_HUB_ID,
        name: "Complete your first challenge",
        description: "Take on your first community challenge and show what you can do!",
        reward_type: "badge",
        amount: null,
        badge_name: "First Challenge",
        badge_icon: "🏆",
        badge_description: "Awarded for completing your first community challenge",
        status: "active",
        ends_at: null,
      },
      {
        hub_id: DEMO_HUB_ID,
        name: "Share a weekly win",
        description: "Tell the community about something you accomplished this week. Celebrate your wins!",
        reward_type: "points",
        amount: 1000,
        badge_name: null,
        badge_icon: null,
        badge_description: null,
        status: "active",
        ends_at: null,
      },
    ]

    const { data: insertedBounties, error: bountiesInsertError } = await supabase
      .from("bounties")
      .insert(demoBounties)
      .select()

    if (bountiesInsertError) {
      throw new Error(`Failed to insert bounties: ${bountiesInsertError.message}`)
    }
    console.log(`✅ Inserted ${insertedBounties?.length ?? 0} bounties`)

    // d) Insert onboarding flow + steps
    console.log("\n📋 Inserting onboarding flow...")

    // Insert flow
    const { data: insertedFlow, error: flowError } = await supabase
      .from("onboarding_flows")
      .insert({
        hub_id: DEMO_HUB_ID,
        name: "New Member 5-Step",
        description: "Get oriented and complete your first challenge.",
        audience: {},
        is_default: true,
        enabled: true,
      })
      .select()
      .single()

    if (flowError) {
      throw new Error(`Failed to insert onboarding flow: ${flowError.message}`)
    }

    const flowId = insertedFlow.id
    console.log(`✅ Created onboarding flow: ${flowId}`)

    // Insert steps
    const demoSteps = [
      {
        hub_id: DEMO_HUB_ID,
        flow_id: flowId,
        order_index: 1,
        title: "Read the community guidelines",
        kind: "read",
        config: {},
        reward: null,
      },
      {
        hub_id: DEMO_HUB_ID,
        flow_id: flowId,
        order_index: 2,
        title: "Pick your first challenge",
        kind: "join",
        config: {},
        reward: null,
      },
      {
        hub_id: DEMO_HUB_ID,
        flow_id: flowId,
        order_index: 3,
        title: "Post your introduction",
        kind: "post",
        config: {},
        reward: null,
      },
      {
        hub_id: DEMO_HUB_ID,
        flow_id: flowId,
        order_index: 4,
        title: "Connect your Discord account",
        kind: "connect",
        config: {},
        reward: null,
      },
      {
        hub_id: DEMO_HUB_ID,
        flow_id: flowId,
        order_index: 5,
        title: "Complete your first bounty",
        kind: "custom",
        config: {},
        reward: null,
      },
    ]

    const { data: insertedSteps, error: stepsInsertError } = await supabase
      .from("onboarding_steps")
      .insert(demoSteps)
      .select()

    if (stepsInsertError) {
      throw new Error(`Failed to insert onboarding steps: ${stepsInsertError.message}`)
    }
    console.log(`✅ Inserted ${insertedSteps?.length ?? 0} onboarding steps`)

    // e) Optional: Add some demo progress if members exist
    console.log("\n👥 Checking for members to add demo progress...")
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id")
      .eq("hub_id", DEMO_HUB_ID)
      .limit(2)

    if (!membersError && members && members.length > 0 && insertedSteps && insertedSteps.length > 0) {
      const memberId = members[0].id
      const firstStep = insertedSteps[0]
      const secondStep = insertedSteps[1]

      // Insert a couple of bounty_events for completion counts
      if (insertedBounties && insertedBounties.length > 0) {
        const { error: eventsInsertError } = await supabase.from("bounty_events").insert([
          {
            hub_id: DEMO_HUB_ID,
            member_id: memberId,
            bounty_id: insertedBounties[0].id,
            status: "completed",
          },
        ])

        if (!eventsInsertError) {
          console.log("✅ Added demo bounty completion event")
        }
      }

      // Insert onboarding progress for first 2 steps
      const { error: progressInsertError } = await supabase.from("onboarding_progress").insert([
        {
          hub_id: DEMO_HUB_ID,
          member_id: memberId,
          flow_id: flowId,
          step_id: firstStep.id,
          status: "completed",
          completed_at: new Date().toISOString(),
        },
        {
          hub_id: DEMO_HUB_ID,
          member_id: memberId,
          flow_id: flowId,
          step_id: secondStep.id,
          status: "completed",
          completed_at: new Date().toISOString(),
        },
      ])

      if (!progressInsertError) {
        console.log("✅ Added demo onboarding progress")
      }
    } else {
      console.log("  ℹ️  No members found for this hub, skipping progress seeding")
    }

    console.log(
      `\n🎉 Seeded demo hub ${DEMO_HUB_ID} with ${insertedBounties?.length ?? 0} bounties and 1 onboarding flow.`
    )
    process.exit(0)
  } catch (error: any) {
    console.error("❌ Fatal error:", error.message)
    console.error(error)
    process.exit(1)
  }
}

main()

