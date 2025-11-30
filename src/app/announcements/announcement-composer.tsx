"use client"

import { useState } from "react"
import { Send } from "lucide-react"
import { sendAnnouncement } from "./actions"

export function AnnouncementComposer() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    setShowSuccess(false)
    
    try {
      await sendAnnouncement(formData)
      setShowSuccess(true)
      // Reset form
      const form = document.getElementById('announcement-form') as HTMLFormElement
      form?.reset()
    } catch (error) {
      console.error('Failed to send announcement:', error)
      alert("Failed to send announcement")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-6 border border-border/50">
      <h2 className="text-lg font-semibold mb-6">Create Announcement</h2>
      
      {showSuccess && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
          <p className="text-success font-medium">Announcement sent successfully!</p>
        </div>
      )}

      <form id="announcement-form" action={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter announcement title"
          />
        </div>

        <div>
          <label htmlFor="body" className="block text-sm font-medium text-foreground mb-2">
            Message
          </label>
          <textarea
            id="body"
            name="body"
            required
            rows={6}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter your announcement message..."
          />
        </div>

        <div>
          <label htmlFor="audience" className="block text-sm font-medium text-foreground mb-2">
            Audience
          </label>
          <select
            id="audience"
            name="audience"
            required
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Members</option>
            <option value="inactive">Inactive Members (7+ days)</option>
            <option value="new">New Members (joined in last 7 days)</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Sending..." : "Send Announcement"}
          </button>
        </div>
      </form>
    </div>
  )
}




