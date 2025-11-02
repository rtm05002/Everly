import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE!;

export async function ensureDefaultFlow(hubId: string) {
  const supa = createClient(url, key);
  const { data: existing } = await supa.from("onboarding_flows").select("id").eq("hub_id", hubId).limit(1);
  if (existing?.length) return existing[0].id as string;

  const { data: flow } = await supa.from("onboarding_flows").insert({
    hub_id: hubId,
    name: "New Member 5-step",
    description: "Get your first win in the community",
    is_default: true,
    enabled: true
  }).select().single();

  const steps = [
    { title: "Read the Community Guide", kind:"read", order_index:1, config:{ url:"/docs/start" } },
    { title: "Pick Your Channels", kind:"join", order_index:2, config:{ channels:["general"] } },
    { title: "Post Your Intro", kind:"post", order_index:3, config:{ channel:"introductions" } },
    { title: "Try Your First Challenge", kind:"custom", order_index:4, config:{ bounty_hint:true } },
    { title: "Enable Mentions", kind:"connect", order_index:5, config:{ notifications:true } }
  ].map(s => ({ ...s, hub_id: hubId, flow_id: flow!.id }));

  await supa.from("onboarding_steps").insert(steps);
  return flow!.id as string;
}

