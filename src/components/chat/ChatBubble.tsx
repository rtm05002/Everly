import * as React from "react"
import { ChatMessage } from "./types"

type AssistantPayload = {
  ok?: boolean
  answer?: string
  sources?: { title?: string | null; url?: string | null; source?: string | null }[]
  snippets?: { title?: string | null; url?: string | null; score?: number | null }[]
}

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n")
  const out: React.ReactNode[] = []
  let inCode = false
  let buf: string[] = []

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      if (!inCode) {
        inCode = true
        buf = []
      } else {
        inCode = false
        out.push(
          <pre
            key={`code-${index}`}
            className="whitespace-pre-wrap rounded-lg border bg-zinc-950/90 text-zinc-100 p-3 text-sm"
          >
            {buf.join("\n")}
          </pre>,
        )
      }
      return
    }

    if (inCode) {
      buf.push(line)
      return
    }

    const html = line.replace(
      /(https?:\/\/\S+)/g,
      '<a href="$1" target="_blank" rel="noreferrer" class="underline">$1</a>',
    )
    out.push(
      <p
        key={`p-${index}`}
        dangerouslySetInnerHTML={{ __html: html }}
        className="leading-6"
      />,
    )
  })

  return <div className="space-y-2">{out}</div>
}

function renderAssistantContent(raw: string) {
  // Try to parse JSON payload
  try {
    const parsed = JSON.parse(raw) as AssistantPayload

    if (parsed && typeof parsed === "object" && parsed.answer) {
      return (
        <div className="space-y-1">
          <SimpleMarkdown text={parsed.answer} />
          {parsed.sources && parsed.sources.length > 0 && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Sources:{" "}
              {parsed.sources
                .map((s) => s.title)
                .filter(Boolean)
                .join(", ")}
            </div>
          )}
        </div>
      )
    }
  } catch {
    // fall through to plain text
  }

  // Fallback: show raw text with markdown rendering
  return <SimpleMarkdown text={raw} />
}

export function ChatBubble({ msg, onCopy }: { msg: ChatMessage; onCopy?: () => void }) {
  const isUser = msg.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[720px] rounded-2xl border p-3 shadow-sm ${
          isUser ? "bg-blue-50 dark:bg-blue-950/30" : "bg-white/70 dark:bg-zinc-900/40"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm">
            {isUser ? (
              <SimpleMarkdown text={msg.content} />
            ) : typeof msg.content === "string" ? (
              renderAssistantContent(msg.content)
            ) : (
              <SimpleMarkdown text={String(msg.content)} />
            )}
          </div>
          {!isUser && onCopy ? (
            <button
              onClick={onCopy}
              className="text-xs opacity-60 hover:underline hover:opacity-100"
              type="button"
            >
              Copy
            </button>
          ) : null}
        </div>

        {!isUser && msg.sources?.length ? (
          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer">Sources</summary>
            <ul className="mt-2 space-y-1">
              {msg.sources.map((source, index) => (
                <li key={index} className="text-xs">
                  {source.url ? (
                    <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                      {source.title || source.url}
                    </a>
                  ) : (
                    source.title || "Untitled"
                  )}
                  {typeof source.score === "number" ? (
                    <span className="ml-1 opacity-60">({source.score.toFixed(2)})</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  )
}


