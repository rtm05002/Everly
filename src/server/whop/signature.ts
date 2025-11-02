import crypto from "crypto";

// Supports both 'x-whop-signature' and 'whop-signature'
export function extractSignature(headers: Headers) {
  return (
    headers.get("x-whop-signature") ||
    headers.get("whop-signature") ||
    headers.get("X-Whop-Signature") ||
    ""
  );
}

export function verifyHmacSha256(rawBody: string, headerSig: string, secret?: string) {
  // Dev mode bypass: if in development or no secret configured, skip verification
  if (!secret || process.env.NODE_ENV === "development") {
    return { ok: true, reason: "no-secret-dev-mode" };
  }
  if (!headerSig) return { ok: false, reason: "missing-signature" };
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody, "utf8");
  const digest = hmac.digest("hex");
  // constant-time compare
  const a = Buffer.from(digest);
  const b = Buffer.from(headerSig);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, reason: ok ? "ok" : "mismatch" };
}

