export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { extractSignature, verifyHmacSha256 } from "@/server/whop/signature";
import { mapWhopEventToDb } from "@/server/whop/map-events";

// Read raw body, verify, parse, dispatch. Keep response fast.
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text(); // IMPORTANT: raw for HMAC
    const sig = extractSignature(req.headers);
    const secret = process.env.WHOP_WEBHOOK_SECRET;
    const v = verifyHmacSha256(raw, sig, secret);
    if (!v.ok) {
      console.warn("[whop:webhook] bad signature:", v.reason);
      return new Response("bad signature", { status: 400 });
    }

    const evt = JSON.parse(raw);
    // Determine hubId: prefer payload; fallback to header; finally DEMO_HUB_ID (dev only)
    const hubHeader = req.headers.get("x-everly-hub-id") || undefined;
    const hubFromPayload = evt?.data?.company_id || evt?.company_id || undefined;
    const hubId = hubFromPayload || hubHeader || process.env.DEMO_HUB_ID;
    if (!hubId) return new Response("missing hub", { status: 400 });

    // Idempotent writes (mapper handles upsert + unique indexes)
    (async () => {
      try {
        await mapWhopEventToDb(hubId, evt);
        // OPTIONAL: call onboarding resolver after write
        // import { evaluateStepCompletion } from "@/server/onboarding/resolve";
        // ... evaluate & upsert onboarding_progress ...
        
        // Record metric (fire-and-forget)
        const { recordMetric } = await import("@/server/metrics");
        recordMetric('last_webhook_at', { 
          at: new Date().toISOString(), 
          source: 'whop',
          type: evt.type 
        }).catch(() => {});
      } catch (e) {
        console.error("[whop:webhook] map error", (e as Error).message);
      }
    })();

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("[whop:webhook] fatal", (e as Error).message);
    return new Response("error", { status: 200 }); // 200 to avoid retries storm while debugging
  }
}

// Optional: quick health check for Whop dashboard
export async function GET() {
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
}
