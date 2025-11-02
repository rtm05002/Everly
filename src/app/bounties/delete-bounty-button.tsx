"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { deleteBountyAction } from "./actions"

interface DeleteBountyButtonProps {
  bountyId: string
}

export function DeleteBountyButton({ bountyId }: DeleteBountyButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this bounty? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteBountyAction(bountyId)
    } catch (error) {
      console.error('Failed to delete bounty:', error)
      alert('Failed to delete bounty. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex items-center justify-center w-6 h-6 text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  )
}
