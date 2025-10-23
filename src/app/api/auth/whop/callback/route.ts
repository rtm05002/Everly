import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Handle Whop OAuth callback
  return NextResponse.json({ message: "Whop callback handled" });
}
