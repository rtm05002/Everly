import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/supabase-js";

export function getSupabaseServer() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!, // server-only
    { global: { headers: { Authorization: `Bearer ${headers().get("authorization") || ""}` } } }
  );
  return supabase;
}

