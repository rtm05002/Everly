import { DEMO_MODE, DEMO_HUB_ID } from "@/lib/env.server"

export type HubContext = {
  hubId?: string
  memberId?: string
  role?: string
}

export function getHubContextFromHeaders(headers: Headers): HubContext {
  // In demo mode, always use DEMO_HUB_ID (ignore headers)
  const hubId = DEMO_MODE && DEMO_HUB_ID ? DEMO_HUB_ID : (headers.get("x-hub-id") ?? undefined)
  return {
    hubId,
    memberId: headers.get("x-member-id") ?? undefined,
    role: headers.get("x-role") ?? undefined,
  }
}

