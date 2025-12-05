import { headers } from "next/headers";

/**
 * Helper to get user identity from request headers (set by middleware)
 * Use this in server components to display logged-in user info
 */
export async function getIdentity() {
  const headersList = await headers();
  const hubId = headersList.get("x-hub-id");
  const memberId = headersList.get("x-member-id");
  const role = headersList.get("x-role") as "creator" | "moderator" | "member" | null;
  const email = headersList.get("x-member-email");
  const username = headersList.get("x-member-username");

  if (!hubId || !memberId) {
    return null;
  }

  return {
    hubId,
    memberId,
    role: role || "member",
    email: email || undefined,
    username: username || undefined,
  };
}

/**
 * Format user display name from identity
 */
export function formatUserDisplayName(identity: {
  username?: string;
  email?: string;
  memberId: string;
}): string {
  return identity.username || identity.email || identity.memberId;
}

