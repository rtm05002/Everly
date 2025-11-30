export function WidgetTyping() {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-1 rounded-xl border bg-white/70 dark:bg-zinc-900/40 px-2 py-1 text-xs">
        <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.2s]" />
        <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0s]" />
        <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
        <span className="ml-1 opacity-70">Thinking…</span>
      </div>
    </div>
  )
}


