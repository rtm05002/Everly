"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { completeBountyAction } from "./actions"

interface CompleteBountyButtonProps {
  bountyId: string
}

export function CompleteBountyButton({ bountyId }: CompleteBountyButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      const result = await completeBountyAction(bountyId)
      if (!result?.ok) {
        alert(result?.error || 'Failed to complete bounty. Please try again.')
      }
    } catch (error) {
      console.error('Failed to complete bounty:', error)
      alert('Failed to complete bounty. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <button
      onClick={handleComplete}
      disabled={isSubmitting}
      className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-success bg-success/10 rounded-full hover:bg-success/20 transition-colors disabled:opacity-50"
    >
      <CheckCircle2 className="h-3 w-3" />
      {isSubmitting ? "Completing..." : "Mark Completed"}
    </button>
  )
}
