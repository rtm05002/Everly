"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import CreatorChatWindow from "./CreatorChatWindow"

type ChatLauncherProps = {
  asChild?: boolean
  children?: React.ReactNode
}

export function ChatLauncher({ asChild = false, children }: ChatLauncherProps) {
  const [open, setOpen] = React.useState(false)

  const Trigger = asChild ? Slot : "button"

  const triggerProps = asChild
    ? { onClick: () => setOpen(true) }
    : ({
        type: "button" as const,
        onClick: () => setOpen(true),
        className:
          "rounded-xl border px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900",
      } as React.ComponentProps<"button">)

  return (
    <>
      <Trigger {...triggerProps}>
        {children ?? "Ask AI about your content"}
      </Trigger>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">AI Insights & Chat</h2>
                <p className="text-sm text-muted-foreground">
                  Ask Everly about your community using real Whop data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-white/80 dark:bg-zinc-950/70 px-6 py-4">
              <CreatorChatWindow />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

