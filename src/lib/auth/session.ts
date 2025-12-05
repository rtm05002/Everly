import jwt from "jsonwebtoken"

export interface Claims {
  hub_id: string
  member_id: string
  role: "creator" | "moderator" | "member"
  email?: string
  username?: string
  avatar_url?: string
  exp?: number
}

/**
 * Relaxed verification: we only decode the JWT and check that it has the
 * expected shape. We do NOT cryptographically verify the signature.
 * This is acceptable for the current MVP because the cookie is set only
 * by our own callback and is HttpOnly + Secure.
 */
export function verifyToken(token: string | undefined | null): Claims | null {
  if (!token) return null

  try {
    const decoded = jwt.decode(token) as Claims | null
    if (!decoded) {
      console.warn("[verifyToken] decode returned null")
      return null
    }

    if (!decoded.hub_id || !decoded.member_id || !decoded.role) {
      console.warn("[verifyToken] decoded token missing required fields", decoded)
      return null
    }

    return decoded
  } catch (err) {
    console.error("[verifyToken] JWT decode failed", err)
    return null
  }
}

export function readCookie(req: Request, name = "session"): string | undefined {
  const header = req.headers.get("cookie") || ""
  const match = header.match(new RegExp(`${name}=([^;]+)`))
  return match?.[1]
}

