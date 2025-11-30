"use client";

import * as React from "react";
import { WidgetMsg } from "./WidgetChatTypes";
import { WidgetBubble } from "./WidgetBubble";
import { WidgetComposer } from "./WidgetComposer";
import { WidgetTyping } from "./WidgetTyping";
import { SuggestChips } from "./SuggestChips";
import { cn } from "@/lib/utils";
import Link from "next/link";

function uuid() {
  return crypto.randomUUID();
}

const MAX_INPUT_LENGTH = 400

const CANNED_FAQ = `Here are some common questions:

• **How do I claim a bounty?** Go to the Challenges tab and click "Join Challenge" on any active challenge. Complete the requirements and submit your work.

• **How do I earn points?** Complete challenges, help other members, and participate in community activities. Points are awarded automatically.

• **Where can I see my progress?** Check the Home tab to see your engagement progress, stats, and completed challenges.`

interface ChatWidgetProps {
  scrollHeightClass?: string;
}

export default function ChatWidget({ scrollHeightClass = "max-h-[360px]" }: ChatWidgetProps = {}) {
  const [msgs, setMsgs] = React.useState<WidgetMsg[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errorState, setErrorState] = React.useState<{ show: boolean; canRetry: boolean }>({ show: false, canRetry: false });
  const [timeoutState, setTimeoutState] = React.useState<"normal" | "slow" | "timeout">("normal");
  const [lastQuery, setLastQuery] = React.useState<string | null>(null);
  // Only disable chat after a fatal error (not on initial render)
  const [fatalError, setFatalError] = React.useState(false);

  function ask(text: string) {
    if (fatalError || !text.trim()) return
    const trimmed = text.trim().slice(0, MAX_INPUT_LENGTH)
    if (!trimmed) return
    setErrorState({ show: false, canRetry: false })
    setTimeoutState("normal")
    setLastQuery(trimmed)
    setMsgs((m) => [...m, { id: uuid(), role: "user", content: trimmed }])
    send(trimmed).catch(() => {})
  }

  async function send(text: string) {
    setLoading(true)
    const id = uuid()
    setMsgs((m) => [...m, { id, role: "assistant", content: "" }])

    // Timeout helpers
    const slowTimer = setTimeout(() => {
      setTimeoutState("slow")
    }, 12_000)

    const timeoutTimer = setTimeout(() => {
      setTimeoutState("timeout")
      setErrorState({ show: true, canRetry: true })
      setLoading(false)
      setMsgs((m) => m.filter((x) => x.id !== id))
    }, 25_000)

    try {
      const r = await fetch("/api/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: msgs.slice(-6) }),
      })

      clearTimeout(slowTimer)
      clearTimeout(timeoutTimer)

      const json = await r.json()

      if (!r.ok || !json?.ok) {
        // Show error but allow retry for most cases
        // Only disable chat on persistent server errors (500+) or explicit fatal errors
        const isFatal = r.status >= 500 && r.status < 600
        if (isFatal) {
          setFatalError(true)
          setErrorState({ show: true, canRetry: false })
        } else {
          // For 4xx errors or other failures, show error but allow retry
          setErrorState({ show: true, canRetry: true })
        }
        setMsgs((m) => m.filter((x) => x.id !== id))
        return
      }

      const snippets = Array.isArray(json?.snippets) ? json.snippets : []
      
      // Handle empty search results with canned FAQ
      if (snippets.length === 0) {
        setMsgs((m) => m.map((x) => (x.id === id ? { ...x, content: CANNED_FAQ } : x)))
      } else {
        const content = json?.answer || json?.message || "Sorry—no answer."
        setMsgs((m) => m.map((x) => (x.id === id ? { ...x, content, sources: snippets } : x)))
      }
      setTimeoutState("normal")
    } catch (err: any) {
      clearTimeout(slowTimer)
      clearTimeout(timeoutTimer)
      // Network errors - show error but allow retry (don't immediately disable)
      // Only disable if it's a clear configuration issue
      console.error("Chat API error:", err)
      setErrorState({ show: true, canRetry: true })
      setMsgs((m) => m.filter((x) => x.id !== id))
    } finally {
      setLoading(false)
      setTimeout(() => document.getElementById("widget-bottom")?.scrollIntoView({ behavior: "smooth" }), 0)
    }
  }

  function handleRetry() {
    if (lastQuery) {
      ask(lastQuery)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {fatalError ? (
        <div className="rounded-xl border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-sm text-muted-foreground">
          Member chat is temporarily disabled.
          <p className="mt-1 text-xs text-muted-foreground/80">
            Please contact the creator if this persists.
          </p>
        </div>
      ) : (
        <SuggestChips onPick={ask} />
      )}
      <div className={cn("overflow-y-auto space-y-2 pr-1 rounded-2xl border bg-white/50 p-3 shadow-inner", scrollHeightClass)}>
        {msgs.map((m) => (
          <WidgetBubble key={m.id} msg={m} />
        ))}
        {loading ? (
          <div>
            <WidgetTyping />
            {timeoutState === "slow" && (
              <div className="mt-2 text-xs text-muted-foreground text-center">Still fetching…</div>
            )}
            {timeoutState === "timeout" && (
              <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700">
                This is taking longer than expected. You can retry or check the FAQ.
              </div>
            )}
          </div>
        ) : null}
        {errorState.show && (
          <div className="rounded-lg border border-dashed border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 text-xs text-red-600 dark:text-red-400">
            I couldn't answer right now. Try again or check the FAQ.
            <div className="mt-2 flex gap-2">
              <Link
                href="/help"
                className="rounded border border-red-200 dark:border-red-800 px-2 py-1 text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                View FAQ
              </Link>
              {errorState.canRetry && (
                <button
                  onClick={handleRetry}
                  className="rounded border border-red-200 dark:border-red-800 px-2 py-1 text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}
        <div id="widget-bottom" />
      </div>
      <WidgetComposer onSend={ask} disabled={loading || fatalError} maxLength={MAX_INPUT_LENGTH} />
      <p className="text-[11px] text-muted-foreground">
        Answers are generated from public community content. Don’t share private info. See our{' '}
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>{' '}
        and{' '}
        <a href="/terms" className="underline">
          Terms of Service
        </a>
        .
      </p>
    </div>
  );
}

