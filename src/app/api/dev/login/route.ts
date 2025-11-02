import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/overview";

  const res = NextResponse.redirect(new URL(next, url.origin));
  res.cookies.set({
    name: "everly_dev",
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
