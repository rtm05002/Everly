"use client"

import { useEffect, useState } from "react"
import { OnboardingStep, OnboardingProgress, OnboardingFlow } from "@/lib/types"

interface OnboardingChecklistProps {
  hubId: string
}

export function OnboardingChecklist({ hubId }: OnboardingChecklistProps) {
  const [loading, setLoading] = useState(true)
  const [flow, setFlow] = useState<OnboardingFlow | null>(null)
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [progress, setProgress] = useState<OnboardingProgress[]>([])
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    const loadChecklist = async () => {
      try {
        setLoading(true)

        // Fetch enabled flows
        const flowsRes = await fetch(`/api/hub/${hubId}/onboarding/flows`)
        if (!flowsRes.ok) {
          setError("Failed to load onboarding")
          return
        }
        
        const flowsData = await flowsRes.json()
        const flows = flowsData.flows || []
        
        if (flows.length === 0) {
          setLoading(false)
          return
        }

        // Find default flow or use first one
        const defaultFlow = flows.find((f: any) => f.is_default) || flows[0]
        setFlow(defaultFlow)

        // Fetch flow details with steps
        const flowRes = await fetch(`/api/hub/${hubId}/onboarding/flows/${defaultFlow.id}`)
        if (!flowRes.ok) {
          setError("Failed to load flow details")
          return
        }

        const flowData = await flowRes.json()
        setSteps(flowData.steps || [])
        
        // Fetch progress
        const progressRes = await fetch(`/api/hub/${hubId}/onboarding/progress/me`)
        if (progressRes.ok) {
          const progressData = await progressRes.json()
          setProgress(progressData.progress || [])
        }
      } catch (err: any) {
        console.error("Error loading onboarding:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadChecklist()
  }, [hubId])

  const markDone = async (stepId: string, flowId: string) => {
    try {
      setCompleting(stepId)
      
      // Get member ID from session
      let memberId = "00000000-0000-0000-0000-000000000000"
      try {
        const sessionRes = await fetch('/api/widget/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hubId, memberId: 'demo-member-id' })
        })
        if (sessionRes.ok) {
          const { memberId: mid } = await sessionRes.json()
          if (mid) memberId = mid
        }
      } catch (e) {
        console.error('Error getting session:', e)
      }
      
      const res = await fetch(`/api/hub/${hubId}/onboarding/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: memberId,
          flow_id: flowId,
          step_id: stepId,
          status: "completed"
        })
      })
      
      if (!res.ok) {
        throw new Error("Failed to complete step")
      }
      
      // Reload progress
      const progressRes = await fetch(`/api/hub/${hubId}/onboarding/progress/me`)
      if (progressRes.ok) {
        const progressData = await progressRes.json()
        setProgress(progressData.progress || [])
      }
    } catch (err: any) {
      console.error("Error completing step:", err)
    } finally {
      setCompleting(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
        <div className="text-sm text-muted-foreground">Loading checklist...</div>
      </div>
    )
  }

  if (error || !flow) {
    return null
  }

  const progressMap = new Map(progress.map(p => [p.step_id, p.status]))
  const completedCount = steps.filter(s => s.id && progressMap.get(s.id) === "completed").length
  const progressPercent = steps.length > 0 ? (completedCount / steps.length) * 100 : 0

  const getStatusIcon = (stepId: string | undefined) => {
    const status = stepId ? progressMap.get(stepId) : undefined
    if (status === "completed") {
      return "✓"
    } else if (status === "started") {
      return "○"
    }
    return "○"
  }

  const getStatusClass = (stepId: string | undefined) => {
    const status = stepId ? progressMap.get(stepId) : undefined
    if (status === "completed") {
      return "text-green-600"
    } else if (status === "started") {
      return "text-blue-600"
    }
    return "text-muted-foreground"
  }

  return (
    <div className="bg-primary/5 rounded-xl p-6 border border-primary/20 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-foreground">
          {flow.name}
        </h3>
        <span className="text-sm font-medium text-primary">
          {completedCount}/{steps.length}
        </span>
      </div>

      {flow.description && (
        <p className="text-sm text-muted-foreground mb-4">
          {flow.description}
        </p>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-secondary rounded-full h-2 mb-4">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        {steps.map((step) => {
          const status = step.id ? progressMap.get(step.id) : undefined
          return (
            <div
              key={step.id}
              className={`flex items-center justify-between gap-3 text-sm ${getStatusClass(step.id)}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold">
                  {getStatusIcon(step.id)}
                </span>
                <span>{step.title}</span>
              </div>
              {status !== "completed" && flow?.id && (
                <button
                  onClick={() => markDone(step.id!, flow.id!)}
                  disabled={completing === step.id}
                  className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {completing === step.id ? "..." : "Mark done"}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

