"use client"

import { useState, useEffect } from "react"
import { OnboardingStep } from "@/lib/types"
import { GripVertical, Plus, Settings, MoreVertical, Edit2, Copy, Trash2, Eye, AlertTriangle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StepConfigForm } from "./step-config-form"
import { StepStatusChip } from "./step-status-chip"
import { UndoButton } from "./undo-button"
import { NudgeLink } from "./nudge-link"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface StepListProps {
  steps: OnboardingStep[]
  onReorder: (newSteps: OnboardingStep[]) => void
  onEditStep: (stepId: string, updates: Partial<OnboardingStep>) => void
  onDeleteStep: (stepId: string) => void
  onAddStep: () => void
  hubId: string
}

export function StepList({
  steps,
  onReorder,
  onEditStep,
  onDeleteStep,
  onAddStep,
  hubId,
}: StepListProps) {
  const [editingStep, setEditingStep] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [selectedStepForConfig, setSelectedStepForConfig] = useState<OnboardingStep | null>(null)
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([])
  const [bounties, setBounties] = useState<Array<{ id: string; name: string }>>([])
  const [validationWarnings, setValidationWarnings] = useState<Map<string, string[]>>(new Map())
  const [showUndo, setShowUndo] = useState(false)
  const [lastSavedStep, setLastSavedStep] = useState<OnboardingStep | null>(null)

  // Load channels and bounties for display/warnings
  useEffect(() => {
    const loadData = async () => {
      try {
        const [channelsRes, bountiesRes] = await Promise.all([
          fetch(`/api/hub/${hubId}/onboarding/channels`),
          fetch(`/api/hub/${hubId}/onboarding/bounties`),
        ])
        
        if (channelsRes.ok) {
          const data = await channelsRes.json()
          setChannels(data.channels || [])
        }
        
        if (bountiesRes.ok) {
          const data = await bountiesRes.json()
          setBounties(data.bounties || [])
        }
      } catch (err) {
        console.error("Error loading data for warnings:", err)
      }
    }
    loadData()
  }, [hubId])

  // Validate steps and build warnings
  useEffect(() => {
    const warnings = new Map<string, string[]>()
    
    steps.forEach((step) => {
      const stepWarnings: string[] = []
      
      if (step.kind === "post") {
        const channelId = step.config?.channel_id
        if (!channelId) {
          stepWarnings.push("This step requires a channel, but none is selected.")
        } else {
          const channel = channels.find((c) => c.id === channelId)
          if (!channel) {
            stepWarnings.push(`Channel "${channelId}" no longer exists`)
          }
        }
      }
      
      if (step.kind === "join" && Array.isArray(step.config?.channels)) {
        step.config.channels.forEach((channelId: string) => {
          const channel = channels.find((c) => c.id === channelId)
          if (!channel) {
            stepWarnings.push(`Channel "${channelId}" no longer exists`)
          }
        })
      }
      
      if (step.kind === "custom") {
        const bountyId = step.config?.bounty_id
        if (bountyId) {
          const bounty = bounties.find((b) => b.id === bountyId)
          if (!bounty) {
            stepWarnings.push(`Bounty no longer exists`)
          }
        }
      }
      
      if (stepWarnings.length > 0 && step.id) {
        warnings.set(step.id, stepWarnings)
      }
    })
    
    setValidationWarnings(warnings)
  }, [steps, channels, bounties])

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === dropIndex) return

    const newSteps = [...steps]
    const draggedStep = newSteps[dragIndex]
    newSteps.splice(dragIndex, 1)
    newSteps.splice(dropIndex, 0, draggedStep)

    const reorderedSteps = newSteps.map((step, idx) => ({
      ...step,
      order_index: idx + 1,
    }))

    onReorder(reorderedSteps)
    setDragIndex(dropIndex)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Steps
        </h3>
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/30">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-sm text-muted-foreground">
            No steps yet. Click "Add Step" to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {steps.map((step, index) => (
              <motion.div
                key={step.id || index}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                  className={cn(
                  "flex items-center gap-3 p-3 bg-card border rounded-xl hover:border-primary/30 transition-all duration-200",
                  dragIndex === index && "opacity-50 scale-95"
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <div className="flex-1 min-w-0">
                  {editingStep === step.id ? (
                    <div className="space-y-2">
                      <Input
                        value={step.title}
                        onChange={(e) =>
                          onEditStep(step.id!, { title: e.target.value })
                        }
                        onBlur={() => setEditingStep(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditingStep(null)
                        }}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {step.order_index}.
                        </span>
                        <span
                          className="font-medium text-sm truncate cursor-pointer hover:text-foreground"
                          onClick={() => setEditingStep(step.id || "")}
                        >
                          {step.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <StepStatusChip step={step} />
                        <Badge variant="outline" className="text-xs">
                          {step.kind}
                        </Badge>
                        {/* Show channel/bounty name if available */}
                        {step.kind === "post" && step.config?.channel_id && (
                          <Badge variant="secondary" className="text-xs">
                            {channels.find((c) => c.id === step.config.channel_id)?.name || step.config.channel_id}
                          </Badge>
                        )}
                        {step.kind === "custom" && step.config?.bounty_id && (
                          <Badge variant="secondary" className="text-xs">
                            {bounties.find((b) => b.id === step.config.bounty_id)?.name || "Bounty"}
                          </Badge>
                        )}
                        {/* Nudge link */}
                        {step.nudge_recipe_id && (
                          <NudgeLink nudgeRecipeId={step.nudge_recipe_id} hubId={hubId} />
                        )}
                        {/* Validation warnings */}
                        {validationWarnings.get(step.id || "") && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {validationWarnings.get(step.id || "")?.[0]}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelectedStepForConfig(step)
                            setConfigDialogOpen(true)
                          }}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Config
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onEditStep(step.id!, {})}
                      className="text-xs"
                    >
                      <Edit2 className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const newStep = { ...step, id: `copy-${Date.now()}` }
                        onEditStep("new", newStep)
                      }}
                      className="text-xs"
                    >
                      <Copy className="h-3 w-3 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeleteStep(step.id!)}
                      className="text-xs text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Button
        variant="ghost"
        onClick={onAddStep}
        className="w-full gap-2 text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <Plus className="h-4 w-4" />
        Add Step
      </Button>

          {/* Config Form Dialog */}
          {selectedStepForConfig && (
            <StepConfigForm
              step={selectedStepForConfig}
              open={configDialogOpen}
              onOpenChange={(open) => {
                setConfigDialogOpen(open)
                if (!open) {
                  setSelectedStepForConfig(null)
                  setShowUndo(false)
                }
              }}
              onSave={(config) => {
                setLastSavedStep({ ...selectedStepForConfig })
                setShowUndo(true)
                onEditStep(selectedStepForConfig.id!, { config })
                setTimeout(() => {
                  setShowUndo(false)
                  setLastSavedStep(null)
                }, 10000)
              }}
              hubId={hubId}
            />
          )}

          {/* Undo Button */}
          <UndoButton
            show={showUndo && lastSavedStep !== null}
            onUndo={() => {
              if (lastSavedStep) {
                onEditStep(lastSavedStep.id!, { config: lastSavedStep.config })
                setShowUndo(false)
                setLastSavedStep(null)
              }
            }}
          />
    </div>
  )
}
