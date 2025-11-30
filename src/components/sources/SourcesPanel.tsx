"use client";

import * as React from "react";
import { DEMO_MODE } from "@/lib/env.client";

type SourcesPanelProps = {
  mode?: "summary" | "preview" | "manager";
  hubId: string;
  isDemo?: boolean;
  whopSyncEnabled?: boolean;
};

interface SourceRow {
  id: string;
  name: string;
  kind: string;
  docCount?: number | null;
  chunkCount?: number | null;
  lastSynced?: string | null;
  status?: "queued" | "running" | "success" | "failed" | null;
}

interface UseSourcesResult {
  loading: boolean;
  error: string | null;
  sources: SourceRow[];
  refresh: () => void;
  notFound: boolean;
}

function useSources(hubId: string): UseSourcesResult {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sources, setSources] = React.useState<SourceRow[]>([]);
  const [notFound, setNotFound] = React.useState(false);

  const fetchSources = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL("/api/assistant/sources", window.location.origin);
        if (hubId) {
          url.searchParams.set("hub_id", hubId);
        }
        const res = await fetch(url.toString(), { signal });
        if (res.status === 404) {
          setNotFound(true);
          setSources([]);
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || "Failed to load sources");
        }
        const data = Array.isArray(json) ? json : json.data ?? json.sources ?? [];
        setSources(
          data.map((item: any) => ({
            id: item.id,
            name: item.name ?? item.kind ?? "Untitled source",
            kind: item.kind ?? "unknown",
            docCount: item.docCount ?? item.doc_count ?? 0,
            chunkCount: item.chunkCount ?? item.chunk_count ?? 0,
            lastSynced: item.lastSynced ?? item.last_synced_at ?? null,
            status: item.status ?? null,
          }))
        );
      } catch (err: any) {
        if (signal?.aborted) return;
        setError(err?.message || "Unable to load sources");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [hubId],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    fetchSources(controller.signal);
    return () => controller.abort();
  }, [fetchSources]);

  return {
    loading,
    error,
    sources,
    refresh: () => fetchSources(),
    notFound,
  };
}

function statusBadge(status?: SourceRow["status"]) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  if (!status) return <span className={`${base} bg-slate-100 text-slate-600`}>unknown</span>;
  const map: Record<string, string> = {
    success: "bg-emerald-100 text-emerald-700",
    running: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
    queued: "bg-slate-100 text-slate-700",
  };
  return <span className={`${base} ${map[status] ?? "bg-slate-100 text-slate-700"}`}>{status}</span>;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function SourcesPanel({ mode = "summary", hubId, isDemo = false, whopSyncEnabled = true }: SourcesPanelProps) {
  const { loading, error, sources, refresh, notFound } = useSources(hubId);
  const [syncing, setSyncing] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const visibleSources = React.useMemo(() => {
    if (mode === "preview") {
      return sources.slice(0, 5);
    }
    return sources;
  }, [sources, mode]);

  async function handleSync(id: string) {
    if (mode !== "manager") return;
    const source = sources.find(s => s.id === id);
    // Don't run if DEMO_MODE and this is a Whop source
    if (DEMO_MODE && source?.kind?.startsWith("whop:")) return;
    setSyncing(id);
    try {
      await fetch("/api/assistant/sources/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ADMIN_HEADER ? { "x-admin-task-token": ADMIN_HEADER } : {}),
        },
        body: JSON.stringify({ sourceId: id }),
      });
    } catch (err) {
      console.error("[SourcesPanel] sync", err);
    } finally {
      setSyncing(null);
      refresh();
    }
  }

  async function handleDelete(id: string) {
    if (mode !== "manager") return;
    if (!confirm("Delete this source?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/assistant/sources/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("[SourcesPanel] delete", err);
    } finally {
      setDeleting(null);
      refresh();
    }
  }

  const ADMIN_HEADER = process.env.NEXT_PUBLIC_ADMIN_TASK_TOKEN || "";
  // Use passed prop, fallback to env check for backward compatibility
  const FEATURE_WHOP_SYNC_ENABLED = whopSyncEnabled && process.env.FEATURE_WHOP_SYNC !== "false";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Content Sources</h3>
        {mode === "manager" ? (
          <button
            onClick={refresh}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Refresh
          </button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        Manage the datasets that power your assistant. {mode === "manager" ? "Trigger syncs or open the full manager for advanced actions." : ""}
      </p>

      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-left font-medium">Kind</th>
              <th className="px-3 py-2 text-right font-medium">Docs</th>
              <th className="px-3 py-2 text-right font-medium">Chunks</th>
              <th className="px-3 py-2 text-left font-medium">Last synced</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              {mode === "manager" ? (
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading
              ? Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse text-muted-foreground">
                    <td className="px-3 py-3">Loading…</td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3 text-right">—</td>
                    <td className="px-3 py-3 text-right">—</td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3">—</td>
                    {mode === "manager" ? <td className="px-3 py-3 text-right">—</td> : null}
                  </tr>
                ))
              : visibleSources.map((source) => {
                  const isWhopSource = source.kind?.startsWith("whop:");
                  const isDemoSource = isDemo && isWhopSource;
                  return (
                  <tr key={source.id} className="hover:bg-muted/30">
                    <td className="px-3 py-3 font-medium text-foreground">
                      {source.name}
                      {isDemoSource && (
                        <span className="ml-2 text-xs text-muted-foreground">(demo)</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground capitalize">
                      {isDemoSource ? `${source.kind} (demo)` : source.kind}
                    </td>
                    <td className="px-3 py-3 text-right">{source.docCount ?? 0}</td>
                    <td className="px-3 py-3 text-right">{source.chunkCount ?? 0}</td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(source.lastSynced)}</td>
                    <td className="px-3 py-3">{statusBadge(source.status)}</td>
                    {mode === "manager" ? (
                      <td className="px-3 py-3 text-right space-x-2">
                        {isDemoSource ? (
                          <span className="text-xs text-muted-foreground" title="Live Whop syncing will be available after you connect your Whop account.">
                            Read-only (demo)
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleSync(source.id)}
                              disabled={!!syncing || !FEATURE_WHOP_SYNC_ENABLED}
                              className="rounded border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                              title={
                                !FEATURE_WHOP_SYNC_ENABLED
                                  ? "Live Whop syncing will be available after you connect your Whop account."
                                  : undefined
                              }
                            >
                              {syncing === source.id ? "Syncing…" : "Sync now"}
                            </button>
                            <button
                              onClick={() => window.open(`/assistant/sources/logs?id=${source.id}`, "_blank")}
                              className="rounded border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
                            >
                              View logs
                            </button>
                            <button
                              onClick={() => handleDelete(source.id)}
                              disabled={deleting === source.id || !FEATURE_WHOP_SYNC_ENABLED}
                              className="rounded border border-destructive px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                              title={
                                !FEATURE_WHOP_SYNC_ENABLED
                                  ? "Live Whop syncing will be available after you connect your Whop account."
                                  : undefined
                              }
                            >
                              {deleting === source.id ? "Deleting…" : "Delete"}
                            </button>
                          </>
                        )}
                      </td>
                    ) : null}
                  </tr>
                  );
                })}
            {!loading && visibleSources.length === 0 ? (
              <tr>
                <td colSpan={mode === "manager" ? 7 : 6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {isDemo
                    ? "Sample Whop sources — syncing disabled"
                    : notFound
                    ? (whopSyncEnabled ? "No sources yet. Open the full manager to create one." : "No sources have been indexed yet.")
                    : "No sources have been indexed yet."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
