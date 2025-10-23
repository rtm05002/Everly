import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // DEV STUB ONLY — replace with real JWT minting later
  return NextResponse.json({ token: "dev-stub" });
}

