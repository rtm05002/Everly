"use client"

import * as React from "react"
import { ChatBubble } from "./ChatBubble"
import { Composer } from "./Composer"
import { Typing } from "./Typing"
import { SuggestPrompts } from "./SuggestPrompts"
import type { ChatMessage, SourceHit } from "./types"

function uuid() {
  return crypto.randomUUID()
}

export default function CreatorChatWindow() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [loading, setLoading] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const ask = React.useCallback(
    (text: string) => {
      if (!text.trim()) return
      setMessages((prev) => [...prev, { id: uuid(), role: "user", content: text }])
      void send(text)
    },
    [setMessages],
  )

  async function send(text: string) {
    setLoading(true)
    const id = uuid()
    setMessages((prev) => [...prev, { id, role: "assistant", content: "" }])

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })

      if (res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let done = false
        let acc = ""
        while (!done) {
          const chunk = await reader.read()
          done = chunk.done
          if (chunk.value) {
            acc += decoder.decode(chunk.value, { stream: true })
            setMessages((prev) =>
              prev.map((m) => (m.id === id ? { ...m, content: acc } : m)),
            )
          }
        }
      } else {
        const json = await res.json()
        const content = json?.answer || json?.message || "Sorry—no answer."
        const sources: SourceHit[] | undefined = Array.isArray(json?.snippets)
          ? json.snippets.map((s: any) => ({
              title: s.title,
              url: s.url,
              score: typeof s.score === "number" ? s.score : undefined,
              text: s.text,
            }))
          : undefined
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, content, sources } : m)),
        )
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, content: "Sorry—chat failed. Please try again." } : m,
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[70vh] max-h-[70vh] flex-col">
      <div className="pb-2">
        {messages.length === 0 ? (
          <div className="mb-3 space-y-1">
            <div className="text-sm font-medium">👋 Hi, I’m Everly.</div>
            <div className="text-xs text-muted-foreground">
              Ask about your community’s engagement, Whop posts, announcements, or challenges.
            </div>
          </div>
        ) : null}
        <SuggestPrompts onPick={ask} />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 rounded-xl border bg-white/60 dark:bg-zinc-900/30 p-3">
        {messages.map((message) => (
          <div key={message.id} className="animate-[fadeIn_0.15s_ease]">
            <ChatBubble
              msg={message}
              onCopy={
                message.role === "assistant"
                  ? () => navigator.clipboard?.writeText(message.content)
                  : undefined
              }
            />
          </div>
        ))}
        {loading ? <Typing /> : null}
        <div ref={bottomRef} />
      </div>

      <div className="pt-3">
        <Composer onSend={ask} disabled={loading} />
      </div>
    </div>
  )
}


