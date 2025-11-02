import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const res = NextResponse.redirect(new URL("/", url.origin));
  res.cookies.set({
    name: "everly_dev",
    value: "",
    expires: new Date(0),
    path: "/",
  });
  return res;
}
