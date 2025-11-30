"use client"

export function SuggestChips({ onPick }: { onPick: (value: string) => void }) {
  const items = [
    "How do I claim a bounty?",
    "How do I earn points?",
    "What are today’s active challenges?",
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className="rounded-full border px-2 py-0.5 text-xs hover:bg-zinc-50"
        >
          {item}
        </button>
      ))}
    </div>
  )
}


