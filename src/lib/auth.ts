import { NextRequest } from "next/server";
import { getSupabaseServer } from "./supabase-server";
import { verifyToken } from "./auth/session";

export async function getCurrentUser(request: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function requireAuth(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const user = await getCurrentUser(request);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    return handler(request, ...args);
  };
}

export function parseMemberFromToken(token: string): { hub_id: string; role: string; member_id: string; exp?: number } | null {
  const payload = verifyToken(token);
  if (!payload) return null;
  return {
    hub_id: payload.hub_id,
    role: payload.role,
    member_id: payload.member_id,
    exp: payload.exp,
  };
}

