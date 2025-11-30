"use client";

import * as React from "react";
import ChatWidget from "@/components/widget/ChatWidget";
import { AnimatePresence, motion } from "framer-motion";

export default function HelpDrawer({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    if (open) {
      window.addEventListener("keydown", onKey);
    }
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-1/2 top-[6vh] w-[94vw] max-w-md -translate-x-1/2 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-lg md:top-[8vh] md:max-w-lg lg:left-[calc(50%+ clamp(0px,(100vw-64rem)/2,140px))] lg:top-auto lg:bottom-[5rem] lg:-translate-x-1/2"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold">Ask AI Assistant</div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded border px-3 py-1 text-xs font-medium hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
            <div className="max-h-[72vh] overflow-hidden">
              <ChatWidget scrollHeightClass="max-h-[520px]" />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
