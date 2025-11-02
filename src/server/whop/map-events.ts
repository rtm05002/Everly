import { createClient } from "@supabase/supabase-js";

const supa = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);

type WhopEvt = {
  id: string;
  type: string;
  created_at?: string;
  data?: any;
};

export async function mapWhopEventToDb(hubId: string, evt: WhopEvt) {
  const s = supa();
  const ts = evt.created_at ?? new Date().toISOString();
  const whop_event_id = evt.id;

  switch (evt.type) {
    case "member.created": {
      const m = evt.data;
      // Upsert member; store whop ids so future syncs can match
      await s
        .from("members")
        .upsert(
          {
            hub_id: hubId,
            whop_member_id: m?.id ?? m?.user?.id,
            role: m?.tier?.name?.toLowerCase() ?? "member",
            joined_at: m?.created_at ?? ts,
            last_active_at: ts,
          },
          { onConflict: "hub_id,whop_member_id" }
        )
        .catch((error: any) => {
          if (error?.code !== '23505') {
            console.error("[Whop Mapper] Error upserting member:", error);
          }
        });
      break;
    }

    case "message.created": {
      const d = evt.data;
      const insert = {
        hub_id: hubId,
        member_id: null as any, // Optional: resolve by whop_member_id if you mirror that
        type: "posted",
        meta: { channel_id: d?.channel_id, url: d?.url, whop_member_id: d?.user?.id },
        created_at: ts,
        whop_event_id,
      };
      // idempotent insert
      await s.from("activity_logs").insert(insert).catch((error: any) => {
        if (error?.code !== '23505') {
          console.error("[Whop Mapper] Error inserting message activity:", error);
        }
      });
      break;
    }

    case "payment.succeeded": {
      const d = evt.data;
      const insert = {
        hub_id: hubId,
        member_id: null as any,
        type: "payment",
        meta: { amount_cents: d?.amount_cents, whop_member_id: d?.member_id },
        created_at: ts,
        whop_event_id,
      };
      await s.from("activity_logs").insert(insert).catch((error: any) => {
        if (error?.code !== '23505') {
          console.error("[Whop Mapper] Error inserting payment activity:", error);
        }
      });
      break;
    }

    case "challenge.completed": // or "bounty.completed" depending on your naming
    case "bounty.completed": {
      const d = evt.data;
      const insert = {
        hub_id: hubId,
        bounty_id: d?.challenge_id ?? d?.bounty_id ?? null,
        member_id: null as any,
        status: "completed",
        meta: { whop_member_id: d?.member_id },
        created_at: ts,
        whop_event_id,
      };
      await s.from("bounty_events").insert(insert).catch((error: any) => {
        if (error?.code !== '23505') {
          console.error("[Whop Mapper] Error inserting bounty event:", error);
        }
      });
      break;
    }

    default: {
      // No-op for unsupported types
      break;
    }
  }
}

