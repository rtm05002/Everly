import { cookies } from "next/headers"

const STATE_COOKIE = "whop_oauth_state"

export async function setStateCookie(state: string) {
  const store = await cookies()
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
  })
}

export async function popStateCookie() {
  const store = await cookies()
  const value = store.get(STATE_COOKIE)?.value
  if (value) {
    store.delete(STATE_COOKIE)
  }
  return value
}

