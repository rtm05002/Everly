"use client"

import * as React from "react"
import { ChatBubble } from "./ChatBubble"
import { Composer } from "./Composer"
import { Typing } from "./Typing"
import type { ChatMessage, SourceHit } from "./types"

function uuid() {
  return crypto.randomUUID()
}

export default function ChatWindow() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [loading, setLoading] = React.useState(false)

  const onCopy = React.useCallback((msg: ChatMessage) => {
    navigator.clipboard?.writeText(msg.content).catch(() => {})
  }, [])

  const addUserMessage = React.useCallback(
    (text: string) => {
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
        const content = json?.answer || json?.message || JSON.stringify(json)
        const sources: SourceHit[] | undefined = json?.snippets?.map((s: any) => ({
          title: s.title,
          url: s.url ?? null,
          score: typeof s.score === "number" ? s.score : undefined,
          text: s.text,
        }))

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
      setTimeout(() => {
        document.getElementById("chat-bottom")?.scrollIntoView({ behavior: "smooth" })
      }, 0)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-160px)] flex-col gap-4">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            msg={message}
            onCopy={message.role === "assistant" ? () => onCopy(message) : undefined}
          />
        ))}
        {loading ? <Typing /> : null}
        <div id="chat-bottom" />
      </div>
      <Composer onSend={addUserMessage} disabled={loading} />
    </div>
  )
}


