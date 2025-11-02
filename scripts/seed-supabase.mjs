// scripts/seed-supabase.mjs
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import process from "node:process"

// Load .env.local if it exists
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
try {
  const envPath = join(__dirname, "..", ".env.local")
  const envFile = readFileSync(envPath, "utf8")
  envFile.split(/\r?\n/).forEach((line) => {
    // Skip comments and empty lines
    line = line.trim()
    if (!line || line.startsWith("#")) return
    
    const equalIndex = line.indexOf("=")
    if (equalIndex === -1) return
    
    const key = line.substring(0, equalIndex).trim()
    let value = line.substring(equalIndex + 1).trim()
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    
    if (key && !process.env[key]) {
      process.env[key] = value
    }
  })
} catch (err) {
  // .env.local not found or can't be read, use existing env vars
  if (err.code !== "ENOENT") {
    console.warn("Warning: Could not read .env.local:", err.message)
  }
}

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

async function seedOnboardingFlow() {
  try {
    // Check if any onboarding flows exist
    const { data: existingFlows, error: checkError } = await sb
      .from("onboarding_flows")
      .select("id")
      .eq("hub_id", DEMO_HUB_ID)
      .limit(1)

    if (checkError) {
      // Table might not exist yet - that's ok, just log and skip
      if (checkError.code === "42P01" || checkError.message.includes("does not exist")) {
        console.log("⚠️  onboarding_flows table not found. Skipping onboarding seed.")
        return
      }
      throw checkError
    }

    if (existingFlows && existingFlows.length > 0) {
      console.log("✓ Onboarding flows already exist. Skipping default flow creation.")
      return
    }

    // Create the default flow
    const { data: flow, error: flowError } = await sb
      .from("onboarding_flows")
      .insert({
        hub_id: DEMO_HUB_ID,
        name: "New Member 5-Step",
        description: "Help new members get started with your community in five easy steps.",
        is_default: true,
        enabled: true,
      })
      .select()
      .single()

    if (flowError) throw flowError

    console.log(`• Created default onboarding flow: ${flow.name}`)

    // Get a sample bounty ID for the custom step (if any exist)
    let sampleBountyId = null
    try {
      const { data: bounties } = await sb
        .from("bounties")
        .select("id")
        .eq("hub_id", DEMO_HUB_ID)
        .limit(1)
      if (bounties && bounties.length > 0) {
        sampleBountyId = bounties[0].id
      }
    } catch {
      // Bounties table might not exist, that's ok
    }

    // Create the five steps with proper config formats
    const steps = [
      {
        hub_id: DEMO_HUB_ID,
        flow_id: flow.id,
        order_index: 1,
        title: "Read the Community Guide",
        kind: "read",
        config: {
          url: "/guide",
          cta: "Read Guide →",
        },
      },
      {
        hub_id: DEMO_HUB_ID,
        flow_id: flow.id,
        order_index: 2,
        title: "Pick Your Channels",
        kind: "join",
        config: {
          channels: [], // Empty array - will be populated by creator in UI
          // TODO: Load actual channel IDs from hub
        },
      },
      {
        hub_id: DEMO_HUB_ID,
        flow_id: flow.id,
        order_index: 3,
        title: "Post Your Intro",
        kind: "post",
        config: {
          channel_id: "introductions", // TODO: Replace with actual channel UUID
          prompt: "Introduce yourself to the community! Share your name, background, and what you're looking forward to.",
          min_words: 20,
        },
      },
      {
        hub_id: DEMO_HUB_ID,
        flow_id: flow.id,
        order_index: 4,
        title: "Try Your First Challenge",
        kind: "custom",
        config: sampleBountyId
          ? { bounty_id: sampleBountyId }
          : {}, // Will need to be set via UI if no bounties exist
      },
      {
        hub_id: DEMO_HUB_ID,
        flow_id: flow.id,
        order_index: 5,
        title: "Enable Notifications",
        kind: "connect",
        config: {
          enable_mentions: true,
          enable_email: false,
          enable_dm: false,
        },
      },
    ]

    const { error: stepsError } = await sb.from("onboarding_steps").insert(steps)

    if (stepsError) throw stepsError

    console.log(`  ✓ Created ${steps.length} onboarding steps`)
    console.log("✅ Default onboarding flow created.")
  } catch (error) {
    console.error("Error seeding onboarding flow:", error.message)
    // Don't crash - just log and continue
  }
}

async function main() {
  console.log("🌱 Seeding Supabase onboarding flow...")
  await seedOnboardingFlow()
  console.log("✅ Onboarding seed complete.")
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})

