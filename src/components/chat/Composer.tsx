"use client"

import * as React from "react"

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void
  disabled?: boolean
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
    el.style.height = Math.min(el.scrollHeight, 180) + "px"
  }, [text])

  const handleSubmit = () => {
    if (!disabled && text.trim()) {
      onSend(text.trim())
      setText("")
    }
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-950 dark:via-zinc-950 pt-3">
      <div className="flex gap-2 rounded-2xl border bg-white/80 dark:bg-zinc-900/40 p-2">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about your Whop content…"
          className="min-h-[44px] max-h-[180px] w-full resize-none bg-transparent text-sm focus:outline-none"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="whitespace-nowrap rounded-xl border px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-60"
        >
          Send
        </button>
      </div>
      <div className="h-3" />
    </div>
  )
}


