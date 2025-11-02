"use client"

import { useState, useEffect } from "react"
import { OnboardingFlow, OnboardingStep } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"

interface MemberPreviewDialogProps {
  flow: OnboardingFlow
  steps: OnboardingStep[]
  hubId: string
}

interface Member {
  id: string
  username?: string
  whop_member_id?: string
}

export function MemberPreviewDialog({
  flow,
  steps,
  hubId,
}: MemberPreviewDialogProps) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      const fetchMembers = async () => {
        try {
          const res = await fetch(`/api/hub/${hubId}/members`)
          if (res.ok) {
            const data = await res.json()
            setMembers(data.members || [])
          }
        } catch (err) {
          console.error("Error fetching members:", err)
        }
      }
      fetchMembers()
    }
  }, [open, hubId])

  const [stepResults, setStepResults] = useState<
    Array<{
      stepId: string
      title: string
      completed: boolean
      completedAt?: string
      matchedEvent?: string
    }>
  >([])
  const [activityCount, setActivityCount] = useState(0)

  const simulateMember = async () => {
    if (!selectedMemberId || !flow.id) return

    setLoading(true)
    try {
      const res = await fetch(`/api/hub/${hubId}/onboarding/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMemberId,
          flowId: flow.id,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setCompletedSteps(new Set(data.completedSteps || []))
        setStepResults(data.stepResults || [])
        setActivityCount(data.activityCount || 0)
      } else {
        const error = await res.json()
        console.error("Preview error:", error)
      }
    } catch (err) {
      console.error("Error simulating member:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedMemberId && flow.id) {
      simulateMember()
    } else {
      setCompletedSteps(new Set())
      setStepResults([])
      setActivityCount(0)
    }
  }, [selectedMemberId, flow.id])

  const selectedMember = members.find((m) => m.id === selectedMemberId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <span>Preview as member</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Preview as Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Member</label>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a member to preview" />
              </SelectTrigger>
              <SelectContent>
                {members.length === 0 ? (
                  <SelectItem value="" disabled>No members found</SelectItem>
                ) : (
                  members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.username || member.whop_member_id || member.id}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedMemberId && (
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {selectedMember?.username || selectedMember?.whop_member_id || "Member"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Preview based on {activityCount} recent activities (last 45 days)
                  </div>
                </div>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>

              {loading ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Evaluating steps...
                </div>
              ) : (
                <div className="space-y-2 border-t pt-3">
                  {stepResults.length > 0 ? (
                    stepResults.map((result) => {
                      const step = steps.find((s) => s.id === result.stepId)
                      return (
                        <div
                          key={result.stepId}
                          className={`flex items-center gap-3 text-sm p-2 rounded ${
                            result.completed ? "bg-green-50 border border-green-200" : "bg-background"
                          }`}
                        >
                          {result.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={result.completed ? "text-green-900 font-medium" : ""}>
                              {step?.title || result.title}
                            </div>
                            {result.completed && result.matchedEvent && (
                              <div className="text-xs text-green-700 mt-0.5">
                                Matched: {result.matchedEvent}
                              </div>
                            )}
                          </div>
                          {result.completed && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 shrink-0">
                              ✓
                            </Badge>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No steps configured for this flow
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

