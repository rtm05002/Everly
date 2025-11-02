import crypto from "crypto";

const WEBHOOK_URL = process.env.WHOP_WEBHOOK_URL || "http://localhost:3000/api/webhooks/whop";
const HUB_ID = process.env.DEMO_HUB_ID;

if (!HUB_ID) {
  console.error("❌ Set DEMO_HUB_ID environment variable");
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  console.error("❌ Refusing to run in production.");
  process.exit(1);
}

// Helper to sign like Whop would (if your route expects a header)
// Adjust to your verify method or skip if not enforced yet
function sign(body, secret) {
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");
}

async function post(event) {
  const sig = sign(event, process.env.WHOP_WEBHOOK_SECRET || "");
  
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-everly-hub-id": HUB_ID,
        "x-whop-signature": sig,
      },
      body: JSON.stringify(event),
    });
    
    const txt = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(txt);
    } catch {
      parsed = txt;
    }
    
    if (res.ok) {
      console.log(`✅ [${event.type}] ${res.status} - ${JSON.stringify(parsed).substring(0, 100)}`);
    } else {
      console.error(`❌ [${event.type}] ${res.status} - ${txt.substring(0, 200)}`);
    }
    
    return { ok: res.ok, status: res.status, data: parsed };
  } catch (error) {
    console.error(`❌ [${event.type}] Network error:`, error.message);
    return { ok: false, error: error.message };
  }
}

// --- Sample events (Whop-shaped; adjust keys to your mapper) ---
const now = new Date().toISOString();
const memberId = "whop_mem_" + Math.floor(Math.random() * 1e6);
const challengeId = "whop_bounty_" + Math.floor(Math.random() * 1e6);

const events = [
  {
    id: "ev_" + crypto.randomUUID(),
    type: "member.created",
    created_at: now,
    data: {
      id: memberId,
      user: {
        id: memberId,
        username: "dev_user_" + memberId.slice(-4),
        email: "dev+" + memberId + "@everly.app",
      },
      tier: { name: "Pro" },
      created_at: now,
    },
  },
  {
    id: "ev_" + crypto.randomUUID(),
    type: "challenge.created",
    created_at: now,
    data: {
      id: challengeId,
      title: "Post your intro",
      description: "Say hello 👋",
      amount_cents: 500,
      status: "active",
      starts_at: now,
    },
  },
  {
    id: "ev_" + crypto.randomUUID(),
    type: "message.created",
    created_at: now,
    data: {
      id: "msg_" + crypto.randomUUID(),
      user: { id: memberId },
      channel_id: "introductions",
      url: "/c/introductions/1",
    },
  },
  {
    id: "ev_" + crypto.randomUUID(),
    type: "challenge.completed",
    created_at: now,
    data: {
      id: "ce_" + crypto.randomUUID(),
      member_id: memberId,
      challenge_id: challengeId,
      type: "completed",
      meta: {},
    },
  },
];

// Fire them sequentially
(async () => {
  console.log(`🌱 Seeding Whop events to ${WEBHOOK_URL}`);
  console.log(`📦 Hub ID: ${HUB_ID}`);
  console.log(`🔑 API Key configured: ${!!process.env.WHOP_API_KEY}`);
  console.log(`🔒 Webhook secret configured: ${!!process.env.WHOP_WEBHOOK_SECRET}`);
  console.log(`\n📤 Posting ${events.length} events...\n`);

  for (const e of events) {
    await post(e);
    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`\n✅ Posted ${events.length} simulated Whop events`);
  console.log(`\n💡 Check your Supabase database for:`);
  console.log(`   - New member in members table`);
  console.log(`   - New bounty in bounties table`);
  console.log(`   - Activity logs in activity_logs table`);
  console.log(`   - Bounty event in bounty_events table`);
})();

