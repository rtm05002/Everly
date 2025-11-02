import { createClient } from "@supabase/supabase-js";
import { evaluateStepCompletion } from "./resolve";
import type { OnboardingStep } from "@/lib/types";

export async function completeStepIfMatches(
  hubId: string,
  memberId: string,
  event: { type: string; meta?: any; created_at?: string }
) {
  const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
  
  // Get all enabled onboarding flows for this hub
  const { data: flows } = await supa
    .from("onboarding_flows")
    .select("id")
    .eq("hub_id", hubId)
    .eq("enabled", true);

  if (!flows || flows.length === 0) return;

  // Get all steps for enabled flows
  const flowIds = flows.map((f) => f.id);
  const { data: steps } = await supa
    .from("onboarding_steps")
    .select("id, flow_id, hub_id, kind, config")
    .eq("hub_id", hubId)
    .in("flow_id", flowIds);

  if (!steps || steps.length === 0) return;

  // Evaluate each step against the event
  const eventData = {
    type: event.type,
    meta: event.meta,
    member_id: memberId,
    created_at: event.created_at ?? new Date().toISOString(),
  };

  for (const step of steps as OnboardingStep[]) {
    const matches = await evaluateStepCompletion(step, eventData);
    
    if (matches) {
      // Upsert progress as completed
      await supa.from("onboarding_progress").upsert(
        {
          hub_id: hubId,
          member_id: memberId,
          flow_id: step.flow_id,
          step_id: step.id,
          status: "completed",
          completed_at: eventData.created_at,
          meta: {},
        },
        { onConflict: "hub_id,member_id,step_id" }
      );
    }
  }
}

