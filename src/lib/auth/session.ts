import jwt from "jsonwebtoken"

type Claims = {
  hub_id: string
  member_id: string
  role: "creator" | "moderator" | "member"
  exp?: number
}

const SECRET = process.env.JWT_SIGNING_SECRET || process.env.SUPABASE_JWT_SECRET

export function verifyToken(token: string | undefined): Claims | null {
  if (!token || !SECRET) return null
  try {
    return jwt.verify(token, SECRET) as Claims
  } catch {
    return null
  }
}

export function readCookie(req: Request, name = "session"): string | undefined {
  const header = req.headers.get("cookie") || ""
  const match = header.match(new RegExp(`${name}=([^;]+)`))
  return match?.[1]
}

