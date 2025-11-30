import * as React from "react"
import type { WidgetMsg } from "./WidgetChatTypes"

export function WidgetBubble({ msg }: { msg: WidgetMsg }) {
  const isUser = msg.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[560px] rounded-xl border p-2 text-sm shadow-sm ${
          isUser ? "bg-blue-50 dark:bg-blue-950/30" : "bg-white/70 dark:bg-zinc-900/40"
        }`}
      >
        <div className="whitespace-pre-wrap leading-6">{msg.content}</div>

        {!isUser && msg.sources?.length ? (
          <details className="mt-1">
            <summary className="text-xs text-muted-foreground cursor-pointer">Sources</summary>
            <ul className="mt-1 space-y-1">
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


