"use client"

import { useState } from "react"
import { Send, MessageCircle } from "lucide-react"

interface WidgetHelpProps {
  hubId: string
}

export function WidgetHelp({ hubId }: WidgetHelpProps) {
  const [aiMessage, setAiMessage] = useState("")
  const [contactMessage, setContactMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [aiAnswer, setAiAnswer] = useState("")
  const [showAiAnswer, setShowAiAnswer] = useState(false)
  const [isAskingAi, setIsAskingAi] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactMessage.trim()) return

    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setSubmitted(true)
    setContactMessage("")
    setIsSubmitting(false)
  }

  const handleAskAI = async (question: string) => {
    if (!question.trim()) return

    setIsAskingAi(true)
    
    try {
      const response = await fetch(`/api/hub/${hubId}/ai/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          memberId: 'demo-member'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiAnswer(data.answer)
        setShowAiAnswer(true)
      } else {
        setAiAnswer("Sorry, I couldn't process your question right now. Please try again.")
        setShowAiAnswer(true)
      }
    } catch (error) {
      console.error('Error asking AI:', error)
      setAiAnswer("Sorry, I encountered an error. Please try again.")
      setShowAiAnswer(true)
    } finally {
      setIsAskingAi(false)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Help Request Submitted
          </h2>
          <p className="text-muted-foreground">
            Thank you for reaching out! We'll get back to you soon.
          </p>
        </div>

        <div className="bg-success/5 border border-success/20 rounded-xl p-6 text-center">
          <div className="text-success text-4xl mb-4">✓</div>
          <h3 className="font-semibold text-foreground mb-2">
            Request Received
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your help request has been submitted successfully. Our support team will review it and respond within 24 hours.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Need Help?
        </h2>
        <p className="text-muted-foreground">
          We're here to help you get the most out of hub {hubId}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Help */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Quick Help
          </h3>
          
          <div className="space-y-3">
            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-1">
                How to join challenges?
              </h4>
              <p className="text-sm text-muted-foreground">
                Go to the Challenges tab and click "Join Challenge" on any active challenge.
              </p>
            </div>
            
            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-1">
                How do I earn points?
              </h4>
              <p className="text-sm text-muted-foreground">
                Complete challenges, help other members, and participate in community activities.
              </p>
            </div>
            
            <div className="bg-secondary/50 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-1">
                Where can I see my progress?
              </h4>
              <p className="text-sm text-muted-foreground">
                Check the Home tab to see your engagement progress and stats.
              </p>
            </div>
          </div>
        </div>

        {/* AI Assistant */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
          <h3 className="font-medium text-foreground mb-4">
            Ask AI Assistant
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="ai-question" className="block text-sm font-medium text-foreground mb-2">
                Ask me anything about bounties, points, or community features
              </label>
              <textarea
                id="ai-question"
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                placeholder="e.g., How do I claim a bounty?"
                className="w-full h-24 px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                required
              />
            </div>
            
            <button
              onClick={() => handleAskAI(aiMessage)}
              disabled={!aiMessage.trim() || isAskingAi}
              className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isAskingAi ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  Asking AI...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  Ask AI
                </>
              )}
            </button>

            {showAiAnswer && (
              <div className="mt-4 p-4 bg-background border border-border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-foreground">AI Response</h4>
                  <button
                    onClick={() => {
                      setShowAiAnswer(false)
                      setAiAnswer("")
                      setAiMessage("")
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                <p className="text-sm text-foreground">{aiAnswer}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleAskAI(aiMessage)}
                    disabled={!aiMessage.trim() || isAskingAi}
                    className="text-sm bg-primary/10 text-primary px-3 py-1 rounded hover:bg-primary/20 transition-colors"
                  >
                    Ask Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-secondary/5 border border-border rounded-xl p-6">
          <h3 className="font-medium text-foreground mb-4">
            Send us a message
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                Still need help? Send us a message
              </label>
              <textarea
                id="message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Describe your question or issue..."
                className="w-full h-32 px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={!contactMessage.trim() || isSubmitting}
              className="w-full bg-secondary text-secondary-foreground py-2 px-4 rounded-lg font-medium hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-secondary-foreground border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Message
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
