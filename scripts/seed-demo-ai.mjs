// scripts/seed-demo-ai.mjs
import { createClient } from "@supabase/supabase-js"
import { createHash } from "node:crypto"
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
    line = line.trim()
    if (!line || line.startsWith("#")) return
    
    const equalIndex = line.indexOf("=")
    if (equalIndex === -1) return
    
    const key = line.substring(0, equalIndex).trim()
    let value = line.substring(equalIndex + 1).trim()
    
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    
    if (!process.env[key]) {
      process.env[key] = value
    }
  })
} catch {
  // .env.local doesn't exist, that's okay
}

// Validate required environment variables
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE
const DEMO_HUB_ID = process.env.DEMO_HUB_ID

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

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
})

// Hash content helper
function hashContent(content) {
  return createHash("sha256").update(content).digest("hex")
}

// Chunk content into ~800 character segments on paragraph boundaries
function chunkContent(text, maxLen = 800) {
  const paragraphs = text.split("\n\n").filter(p => p.trim())
  const chunks = []
  let currentChunk = ""

  for (const para of paragraphs) {
    const trimmedPara = para.trim()
    if (!trimmedPara) continue

    // If paragraph itself is too long, split it by sentences first
    if (trimmedPara.length > maxLen) {
      // Save current chunk if exists
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
        currentChunk = ""
      }
      
      // Split long paragraph by sentences
      const sentences = trimmedPara.split(/(?<=[.!?])\s+/).filter(s => s.trim())
      let current = ""
      for (const sentence of sentences) {
        if (current && (current.length + sentence.length + 2) > maxLen) {
          chunks.push(current.trim())
          current = sentence
        } else {
          current = current ? `${current} ${sentence}` : sentence
        }
      }
      if (current.trim()) {
        currentChunk = current.trim()
      }
      continue
    }

    // If adding this paragraph would exceed maxLen, save current chunk and start new one
    if (currentChunk && (currentChunk.length + trimmedPara.length + 2) > maxLen) {
      chunks.push(currentChunk.trim())
      currentChunk = trimmedPara
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara
    }
  }

  // Add the last chunk if it exists
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  // Fallback: if no chunks created (shouldn't happen), return the text as single chunk
  return chunks.length > 0 ? chunks : [text]
}

// Demo documents
const demoDocs = [
  {
    externalId: "everly-nudges-intro",
    title: "How Everly Nudges Work",
    url: null,
    content: `Everly's nudges are intelligent, automated messages that help keep your community members engaged and on track. They're designed to be helpful, not spammy.

Nudges are triggered by specific conditions that indicate a member might need a gentle reminder or encouragement:

**Inactive Members**: If a member hasn't been active for a certain number of days (configurable per tier or cohort), Everly can send a nudge to re-engage them.

**Near Deadline**: When a bounty deadline is approaching and a member has viewed but not completed it, Everly can send a reminder to help them finish.

**Targeting**: Nudges can be targeted to specific member tiers or cohorts, ensuring the right message reaches the right people at the right time.

**Channels**: Nudges can be delivered via DM (direct message), email, or webhook integrations, giving you flexibility in how you reach members.

**Cooldowns**: To prevent spam, Everly respects cooldown periods between nudges, ensuring members don't receive too many messages.

**Logging**: All nudge activity is tracked and appears in your dashboard, so you can see what's working and what isn't.

Everly automatically scores member risk and engagement levels, then sends helpful nudges that feel personal and relevant. The system is designed to support your community members, not overwhelm them.`
  },
  {
    externalId: "everly-bounties-overview",
    title: "Bounties, Rewards, and Engagement",
    url: null,
    content: `Bounties are a powerful way to incentivize specific actions and reward community members for their contributions.

**What are Bounties?**: Bounties are tasks or challenges that creators set for their community members. Each bounty has a clear goal, deadline, and reward.

**Setting Rewards**: Creators can offer different types of rewards:
- **Cash rewards**: Monetary payments in USD
- **Points**: Virtual currency that can be tracked and redeemed
- **Badges**: Custom achievements that members can earn and display

**Deadlines**: Bounties can have optional deadlines to create urgency and help members prioritize their participation.

**Claiming and Completing**: Members can view active bounties in the Everly widget, claim them, and mark them as complete when finished. The system tracks participation and completion rates.

**Widget Integration**: The Everly widget prominently displays active bounties, making it easy for members to see what opportunities are available.

**Smart Nudging**: Everly can automatically nudge members who have viewed a bounty but haven't completed it, especially as the deadline approaches. This helps increase completion rates without manual intervention.

Bounties create clear incentives for engagement and help you guide your community toward specific goals.`
  },
  {
    externalId: "everly-onboarding-flows",
    title: "Onboarding Flows and Checklists",
    url: null,
    content: `Onboarding flows help new members understand your community and get started on the right foot. They're customizable checklists that guide members through important steps.

**How Onboarding Flows Work**: Creators define a series of steps that new members should complete. These steps can include:
- **Read**: Read specific content or documentation
- **Post**: Make their first post or introduction
- **Join**: Join specific channels or groups
- **Connect**: Connect their social accounts or profiles
- **Custom**: Any custom action you define

**Targeting**: Onboarding flows can be targeted to specific member tiers or cohorts, allowing you to create different onboarding experiences for different types of members.

**Progress Tracking**: The widget shows members their onboarding checklist progress, so they always know what's next and how close they are to completing their onboarding.

**Flexible Configuration**: You can configure which steps are required, optional, or conditional based on member attributes.

Onboarding flows ensure that every new member has a clear path to becoming an active, engaged part of your community.`
  },
  {
    externalId: "everly-ai-assistant",
    title: "Everly AI Assistant and Content Sources",
    url: null,
    content: `The Everly AI Assistant is a powerful tool that helps creators and members get answers to questions about the community, powered by your actual content.

**Grounded in Your Content**: The AI assistant is grounded on indexed content from your Whop community and any URL sources you've configured. This means it answers questions based on your actual documentation, announcements, forum posts, and other content.

**Content Sources**: You can manage multiple content sources:
- **Whop Sources**: Automatically sync content from your Whop products, announcements, hub pages, and forum posts
- **URL Sources**: Index content from external websites, documentation sites, or any URL you specify

**Managing Sources**: From the AI Assistant > Sources Manager, creators can:
- View all configured sources and their sync status
- Run manual syncs to update content
- Backfill embeddings for chunks that haven't been processed yet
- See how many documents and chunks are indexed per source

**Sync Process**: When you sync a source, Everly:
1. Fetches the latest content
2. Breaks it into manageable chunks
3. Generates embeddings for semantic search
4. Stores everything in the knowledge base

**Answering Questions**: The AI can answer questions like:
- "How do I claim a bounty?"
- "How are nudges triggered?"
- "What are the onboarding steps?"
- Any question about your community's processes and content

The AI assistant makes your community documentation accessible and searchable, helping both creators and members find the information they need quickly.`
  },
  {
    externalId: "everly-member-experience",
    title: "Member Experience in the Everly Widget",
    url: null,
    content: `The Everly widget provides a seamless, integrated experience for community members without requiring them to leave Whop.

**What Members See**: The widget displays several key features:

**Active Bounties**: Members can see all currently available bounties, their rewards, deadlines, and completion status. This makes it easy to find opportunities to earn rewards and contribute to the community.

**Onboarding Checklist**: New members see their personalized onboarding checklist, showing which steps they've completed and what's next. This provides clear guidance on how to get started.

**AI Help Chat**: Members can ask questions in a chat interface, and the AI assistant answers based on your community's actual content. This means members get accurate, up-to-date information without having to search through documentation manually.

**Content-Grounded Answers**: When members ask questions like "How do I claim a bounty?" or "What are the community rules?", the AI uses your indexed content to provide accurate answers. This ensures consistency and reduces support burden.

**Seamless Integration**: Everything happens within the Whop interface, so members don't need to navigate to external sites or tools. The widget feels like a natural part of the Whop experience.

**Personalized Experience**: The widget adapts to each member's tier, cohort, and progress, showing relevant bounties, onboarding steps, and content.

The Everly widget makes it easy for members to understand how your community works, find opportunities to participate, and get help when they need it—all without leaving Whop.`
  }
]

async function main() {
  try {
    console.log(`🌱 Seeding demo AI content for hub: ${DEMO_HUB_ID}`)

    // Upsert the demo source (check first, then insert or update)
    console.log("📦 Creating/updating demo source...")
    const { data: existingSource } = await supabase
      .from("ai_sources")
      .select("id")
      .eq("hub_id", DEMO_HUB_ID)
      .eq("kind", "demo:everly")
      .eq("name", "Everly Demo Knowledge Base")
      .maybeSingle()

    let sourceId
    if (existingSource) {
      sourceId = existingSource.id
      console.log(`✅ Using existing source: ${sourceId}`)
      
      // Update the source to ensure settings/config are current
      const { error: updateError } = await supabase
        .from("ai_sources")
        .update({
          settings: {},
          config: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sourceId)

      if (updateError) {
        console.warn(`⚠️  Warning: Could not update source: ${updateError.message}`)
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("ai_sources")
        .insert({
          hub_id: DEMO_HUB_ID,
          kind: "demo:everly",
          name: "Everly Demo Knowledge Base",
          settings: {},
          config: null,
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(`Failed to create source: ${insertError.message}`)
      }
      sourceId = inserted.id
      console.log(`✅ Created new source: ${sourceId}`)
    }

    // Process each demo document
    for (const demoDoc of demoDocs) {
      console.log(`\n📄 Processing: ${demoDoc.title}`)

      // Compute content hash
      const contentHash = hashContent(demoDoc.content)

      // Check if doc already exists
      const { data: existingDoc } = await supabase
        .from("ai_docs")
        .select("id")
        .eq("source_id", sourceId)
        .eq("external_id", demoDoc.externalId)
        .maybeSingle()

      let docId
      if (existingDoc) {
        docId = existingDoc.id
        console.log(`  ↻ Updating existing doc: ${docId}`)
        
        // Update the doc (only if content hash changed)
        const { error: updateError } = await supabase
          .from("ai_docs")
          .update({
            title: demoDoc.title,
            url: demoDoc.url,
            content_hash: contentHash,
            hash: demoDoc.externalId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", docId)

        if (updateError) {
          throw new Error(`Failed to update doc: ${updateError.message}`)
        }
      } else {
        // Insert new doc
        const { data: newDoc, error: insertError } = await supabase
          .from("ai_docs")
          .insert({
            source_id: sourceId,
            external_id: demoDoc.externalId,
            title: demoDoc.title,
            url: demoDoc.url,
            content_hash: contentHash,
            hash: demoDoc.externalId,
          })
          .select()
          .single()

        if (insertError) {
          throw new Error(`Failed to insert doc: ${insertError.message}`)
        }
        docId = newDoc.id
        console.log(`  ✨ Created new doc: ${docId}`)
      }

      // Delete existing chunks for this doc
      const { error: deleteError } = await supabase
        .from("ai_chunks")
        .delete()
        .eq("doc_id", docId)

      if (deleteError) {
        throw new Error(`Failed to delete existing chunks: ${deleteError.message}`)
      }

      // Chunk the content
      const chunks = chunkContent(demoDoc.content, 800)
      console.log(`  📝 Generated ${chunks.length} chunks`)

      // Insert chunks
      const chunkInserts = chunks.map((chunk, idx) => ({
        doc_id: docId,
        idx,
        content: chunk,
        needs_embedding: true,
        embedding: null,
        token_count: null,
      }))

      const { error: chunksError } = await supabase
        .from("ai_chunks")
        .insert(chunkInserts)

      if (chunksError) {
        throw new Error(`Failed to insert chunks: ${chunksError.message}`)
      }

      console.log(`  ✅ Inserted ${chunks.length} chunks`)
    }

    console.log(`\n🎉 Demo AI seed complete for hub ${DEMO_HUB_ID}`)
    process.exit(0)
  } catch (error) {
    console.error("❌ Fatal error:", error.message)
    console.error(error)
    process.exit(1)
  }
}

main()

