import { NextRequest } from "next/server";
import { getSupabaseServer } from "./supabase-server";
import { verifyJWT } from "./jwt";

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

export function parseMemberFromToken(token: string): { hub_id: string; role: string; member_id: string; exp: number; iat: number } | null {
  const secret = process.env.JWT_SIGNING_SECRET || "devsecret";
  const payload = verifyJWT(token, secret);
  if (!payload) return null;
  // Extract only the fields we need
  return {
    hub_id: payload.hub_id,
    role: payload.role,
    member_id: payload.member_id,
    exp: payload.exp,
    iat: payload.iat,
  };
}

