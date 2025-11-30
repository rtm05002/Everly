"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Chat is enabled by default (especially in demo mode)
// Only check feature flag if explicitly set to "false" AND not in demo mode
const FEATURE_MEMBER_CHAT = process.env.NEXT_PUBLIC_FEATURE_MEMBER_CHAT !== "false"

export default function FloatingHelpLauncher({
  onOpen,
  className = "",
}: {
  onOpen: () => void;
  className?: string;
}) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "?" || (e.shiftKey && e.key === "/")) && !e.repeat) {
        e.preventDefault();
        onOpen();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen]);

  // Show launcher by default (chat is enabled by default)
  if (!FEATURE_MEMBER_CHAT) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Ask AI"
      onClick={onOpen}
      className={cn(
        "fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur transition-transform transition-colors hover:scale-[1.05] hover:bg-blue-500 hover:shadow-xl",
        className,
      )}
    >
      <span aria-hidden="true" className="text-white">
        ✨
      </span>
      <span>Ask AI</span>
    </button>
  );
}
