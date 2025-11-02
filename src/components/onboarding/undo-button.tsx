"use client"

import { Button } from "@/components/ui/button"
import { Undo2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface UndoButtonProps {
  show: boolean
  onUndo: () => void
}

export function UndoButton({ show, onUndo }: UndoButtonProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            className="gap-2 shadow-lg"
          >
            <Undo2 className="h-4 w-4" />
            Revert
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

