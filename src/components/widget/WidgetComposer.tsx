"use client"

import * as React from "react"

export function WidgetComposer({
  onSend,
  disabled,
  maxLength = 400,
}: {
  onSend: (text: string) => void
  disabled?: boolean
  maxLength?: number
}) {
  const [text, setText] = React.useState("")
  const ref = React.useRef<HTMLTextAreaElement | null>(null)

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (text.trim() && !disabled) {
        onSend(text.trim())
        setText("")
      }
    }
  }

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 120) + "px"
  }, [text])

  const handleSend = () => {
    if (!disabled && text.trim()) {
      onSend(text.trim())
      setText("")
    }
  }

  return (
    <div className="rounded-xl border bg-white/80 dark:bg-zinc-900/40 p-2">
      <textarea
        ref={ref}
        value={text}
        onChange={(event) => setText(event.target.value.slice(0, maxLength))}
        onKeyDown={handleKey}
        placeholder="Ask about bounties, points, or how things work…"
        className="min-h-[40px] max-h-[120px] w-full resize-none bg-transparent text-sm focus:outline-none"
        disabled={disabled}
        maxLength={maxLength}
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
            text.trim()
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-blue-100 text-blue-600"
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          Ask AI
        </button>
      </div>
    </div>
  )
}

