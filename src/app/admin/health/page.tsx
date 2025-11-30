export const dynamic = "force-dynamic"

import { headers } from "next/headers"
import { getHubContextFromHeaders } from "@/lib/request-context"
import { serverEnv } from "@/lib/env.server"

async function fetchHealth() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/health`, {
      cache: "no-store",
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` }
    }
    return await res.json()
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to fetch health" }
  }
}

async function fetchPreflight() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/preflight`, {
      cache: "no-store",
    })
    if (!res.ok) {
      return { ok: false, missing: [] }
    }
    return await res.json()
  } catch (err: any) {
    return { ok: false, missing: [] }
  }
}

export default async function HealthPage() {
  const headerStore = await headers()
  const ctx = getHubContextFromHeaders(headerStore)

  // Check for ADMIN_TASK_TOKEN in header (x-admin-task-token or Authorization: Bearer)
  const adminTokenHeader = headerStore.get("x-admin-task-token") || 
    headerStore.get("authorization")?.replace(/^Bearer\s+/i, "") || 
    null
  
  const hasValidAdminToken = serverEnv.ADMIN_TASK_TOKEN && 
    adminTokenHeader && 
    adminTokenHeader === serverEnv.ADMIN_TASK_TOKEN

  // Allow access if: creator role OR valid admin token
  const isAuthorized = ctx.role === "creator" || hasValidAdminToken

  if (!isAuthorized) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">401 - Unauthorized</h1>
          <p className="text-muted-foreground">
            This page requires either creator role or a valid admin task token.
          </p>
        </div>
      </div>
    )
  }

  const [health, preflight] = await Promise.all([fetchHealth(), fetchPreflight()])

  return (
    <main className="mx-auto max-w-xl px-4 py-8 space-y-6">
      <section>
        <h1 className="text-lg font-semibold">Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Runtime and database status.
        </p>
        <div className="mt-4 rounded-lg border p-4 text-sm">
          <div>Overall: {health.ok ? "OK" : "Degraded"}</div>
          <div>Supabase: {health.supabase?.ok ? "OK" : "Error"}</div>
          <div>Whop Sync Feature: {health.features?.whopSync ? "Enabled" : "Disabled"}</div>
          <div>Demo Mode: {health.features?.demoMode ? "On" : "Off"}</div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold">Preflight</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Required configuration for this environment.
        </p>
        <div className="mt-4 rounded-lg border p-4 text-sm">
          <div>Config OK: {preflight.ok ? "Yes" : "No"}</div>
          {!preflight.ok && preflight.missing?.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-red-600">
              {preflight.missing.map((key: string) => (
                <li key={key}>{key} is missing</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}

