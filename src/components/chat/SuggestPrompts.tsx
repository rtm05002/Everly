"use client"

import * as React from "react"

const SUGGESTED = [
  "Which members were most active last week?",
  "Summarize my latest Whop announcement.",
  "Which challenges had the most participation?",
]

export function SuggestPrompts({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTED.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onPick(prompt)}
          className="rounded-full border px-2 py-0.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900"
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}


