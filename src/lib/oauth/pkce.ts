import { cookies } from "next/headers"

const VERIFIER_COOKIE = "whop_oauth_pkce"

function base64url(buf: ArrayBuffer) {
  return Buffer.from(new Uint8Array(buf))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export async function createPkceChallenge() {
  const rand = crypto.getRandomValues(new Uint8Array(32))
  const verifier = base64url(rand.buffer)
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  const challenge = base64url(digest)
  return { verifier, challenge }
}

export async function setPkceVerifierCookie(verifier: string) {
  const store = await cookies()
  store.set(VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
  })
}

export async function popPkceVerifier() {
  const store = await cookies()
  const value = store.get(VERIFIER_COOKIE)?.value
  if (value) {
    store.delete(VERIFIER_COOKIE)
  }
  return value
}

