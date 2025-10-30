"use client"

import { useState } from "react"
import { Sparkles, Zap, MessageSquare, TrendingUp } from "lucide-react"
import { ConfigForm } from "./config-form"
import { NudgeAdmin } from "./nudge-admin"
import { AIConfig } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { saveAIConfig } from "./actions"
import { env } from "@/lib/env"

interface AIAssistantCardsProps {
  initialConfig: AIConfig
  nudges: any
  hubId: string
}

export function AIAssistantCards({ initialConfig, nudges, hubId }: AIAssistantCardsProps) {
  const [showSmartResponses, setShowSmartResponses] = useState(false)
  const [showEngagementNudges, setShowEngagementNudges] = useState(false)
  const [config, setConfig] = useState<AIConfig>(initialConfig)
  const [isSaving, setIsSaving] = useState(false)

  const updateConfig = (updates: Partial<AIConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveAIConfig(config)
      toast.success("Configuration saved successfully!")
    } catch (error) {
      console.error("Failed to save config:", error)
      toast.error("Failed to save configuration")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          className="card-elevated p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20"
          onClick={() => setShowSmartResponses(!showSmartResponses)}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="rounded-xl bg-primary/10 text-primary p-3 w-fit">
              <Sparkles className="h-6 w-6" strokeWidth={2} />
            </div>
            <div className={`flex items-center justify-center w-6 h-6 rounded-full transition-transform ${showSmartResponses ? 'rotate-180' : ''}`}>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Smart Responses</h3>
          <p className="text-sm text-muted-foreground">
            AI-powered response suggestions for common member questions
          </p>
        </div>

        <div className="card-elevated p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20">
          <div className="rounded-xl bg-primary/10 text-primary p-3 w-fit mb-4">
            <Zap className="h-6 w-6" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Auto-Moderation</h3>
          <p className="text-sm text-muted-foreground">
            Automatically detect and handle spam or inappropriate content
          </p>
        </div>

        <div 
          className={`card-elevated p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 relative ${
            env.FEATURE_NUDGES === 'true' ? 'cursor-pointer' : ''
          }`}
          onClick={() => env.FEATURE_NUDGES === 'true' && setShowEngagementNudges(!showEngagementNudges)}
        >
          {env.FEATURE_NUDGES !== 'true' && (
            <div className="absolute top-4 right-4">
              <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded-full border border-amber-300">
                Coming Soon
              </span>
            </div>
          )}
          {env.FEATURE_NUDGES === 'true' && (
            <div className={`flex items-center justify-center w-6 h-6 rounded-full transition-transform absolute top-4 right-4 ${showEngagementNudges ? 'rotate-180' : ''}`}>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
          <div className="rounded-xl bg-primary/10 text-primary p-3 w-fit mb-4">
            <MessageSquare className="h-6 w-6" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Engagement Nudges</h3>
          <p className="text-sm text-muted-foreground">
            Automated participation nudges to boost community activity
          </p>
        </div>

        <div className="card-elevated p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 relative">
          <div className="absolute top-4 right-4">
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded-full border border-amber-300">
              Coming Soon
            </span>
          </div>
          <div className="rounded-xl bg-primary/10 text-primary p-3 w-fit mb-4">
            <TrendingUp className="h-6 w-6" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Predictive Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Forecast engagement trends and identify at-risk members
          </p>
        </div>
      </div>

      {/* Smart Responses Configuration - Expandable */}
      {showSmartResponses && (
        <div className="card-elevated p-6">
          <h2 className="text-xl font-semibold mb-6">Configure Smart Responses</h2>
          <ConfigForm initialConfig={config} />
        </div>
      )}

      {/* Engagement Nudges Configuration - Expandable */}
      {showEngagementNudges && (
        <div className="card-elevated p-6">
          <h2 className="text-xl font-semibold mb-6">Engagement Nudges</h2>
          <NudgeAdmin hubId={hubId} />
        </div>
      )}
    </>
  )
}

