import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SIGNING_SECRET || process.env.SUPABASE_JWT_SECRET;

export type Claims = {
  hub_id: string;
  member_id: string;
  role: "creator" | "moderator" | "member";
  email?: string;
  username?: string;
  avatar_url?: string;
};

export function signJwt(payload: Claims) {
  if (!SECRET) throw new Error("JWT secret not configured");
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}
