import { createClient } from "@supabase/supabase-js";

export function getSupabaseServer() {
  // For service role client, we don't need to pass authorization headers
  // The service role key already provides full access
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!, // server-only
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  return supabase;
}

