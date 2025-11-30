type Level = 'info' | 'warn' | 'error';

type LogInput = {
  level: Level;
  event: string;
  hubId?: string;
  meta?: Record<string, unknown>;
};

export async function logServer(input: LogInput) {
  try {
    const url = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !serviceRole) {
      return false;
    }

    const res = await fetch(`${url}/rest/v1/app_logs`, {
      method: 'POST',
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        level: input.level,
        event: input.event,
        hub_id: input.hubId ?? null,
        meta: input.meta ?? {},
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

