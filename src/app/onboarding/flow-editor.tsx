"use client"

import { useEffect, useState } from "react"
import { OnboardingFlow, OnboardingStep } from "@/lib/types"
import { Pencil, Check, X, Plus, Sparkles, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FlowCard } from "@/components/onboarding/flow-card"
import { StepList } from "@/components/onboarding/step-list"
import { MemberPreviewDialog } from "@/components/onboarding/member-preview-dialog"
import { TemplateGallery } from "@/components/onboarding/template-gallery"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { History, Loader2 } from "lucide-react"

export function OnboardingFlowEditor() {
  const [flows, setFlows] = useState<OnboardingFlow[]>([])
  const [selectedFlow, setSelectedFlow] = useState<OnboardingFlow | null>(null)
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [loading, setLoading] = useState(true)
  const [editingFlow, setEditingFlow] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [flowName, setFlowName] = useState("")
  const [flowDesc, setFlowDesc] = useState("")
  const [flowEnabled, setFlowEnabled] = useState(true)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState<{
    completed: number
    checked: number
    errors: string[]
  } | null>(null)

  const hubId = "7007b327-c7bb-40c9-8865-a48b99612a62" // TODO: Get from context/JWT

  useEffect(() => {
    loadFlows()
  }, [])

  useEffect(() => {
    if (selectedFlow) {
      loadFlowDetails(selectedFlow.id!)
      setFlowName(selectedFlow.name)
      setFlowDesc(selectedFlow.description || "")
      setFlowEnabled(selectedFlow.enabled !== false)
      setDirty(false)
    }
  }, [selectedFlow])

  const loadFlows = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/hub/${hubId}/onboarding/flows`)
      if (!res.ok) {
        console.error("Failed to load flows")
        return
      }
      const data = await res.json()
      setFlows(data.flows || [])
      if (data.flows && data.flows.length > 0 && !selectedFlow) {
        setSelectedFlow(data.flows[0])
      }
    } catch (err) {
      console.error("Error loading flows:", err)
    } finally {
      setLoading(false)
    }
  }

  const loadFlowDetails = async (flowId: string) => {
    try {
      const res = await fetch(`/api/hub/${hubId}/onboarding/flows/${flowId}`)
      if (!res.ok) {
        console.error("Failed to load flow details")
        return
      }
      const data = await res.json()
      setSteps(data.steps || [])
    } catch (err) {
      console.error("Error loading flow details:", err)
    }
  }

  const handleSaveFlow = async () => {
    if (!selectedFlow) return

    try {
      console.log("Saving flow:", {
        id: selectedFlow.id,
        name: flowName,
        description: flowDesc,
        enabled: flowEnabled,
      })

      setEditingFlow(false)
      setDirty(false)
      await loadFlows()
    } catch (err) {
      console.error("Error saving flow:", err)
    }
  }

  const handleCancelEdit = () => {
    setEditingFlow(false)
    if (selectedFlow) {
      setFlowName(selectedFlow.name)
      setFlowDesc(selectedFlow.description || "")
      setFlowEnabled(selectedFlow.enabled !== false)
      setDirty(false)
    }
  }

  const handleStartEdit = () => {
    if (!selectedFlow) return
    setEditingFlow(true)
  }

  const handleToggleEnabled = async (flowId: string, enabled: boolean) => {
    console.log("Toggling flow:", { flowId, enabled })
    await loadFlows()
  }

  const handleAddStep = () => {
    if (!selectedFlow) return

    const newStep: OnboardingStep = {
      id: `temp-${Date.now()}`,
      hub_id: hubId,
      flow_id: selectedFlow.id!,
      order_index: steps.length + 1,
      title: "New Step",
      kind: "custom",
      config: {},
      created_at: new Date().toISOString(),
    }

    setSteps([...steps, newStep])
    setDirty(true)
  }

  const handleReorderSteps = (newSteps: OnboardingStep[]) => {
    setSteps(newSteps)
    setDirty(true)
    console.log("Saving order:", newSteps.map((s, idx) => ({ id: s.id, order_index: idx + 1 })))
  }

  const handleEditStep = (stepId: string, updates: Partial<OnboardingStep>) => {
    if (stepId === "new") {
      setSteps([...steps, updates as OnboardingStep])
      return
    }
    const updatedSteps = steps.map((step) =>
      step.id === stepId ? { ...step, ...updates } : step
    )
    setSteps(updatedSteps)
    setDirty(true)
  }

  const handleDeleteStep = (stepId: string) => {
    const updatedSteps = steps.filter((step) => step.id !== stepId)
    setSteps(updatedSteps)
    setDirty(true)
  }

  const handleCreateNewFlow = () => {
    console.log("Create new flow")
    // TODO: Implement new flow creation
  }

  const handleRunBackfill = async () => {
    if (!selectedFlow?.id || backfilling) return

    setBackfilling(true)
    setBackfillResult(null)

    try {
      const res = await fetch(
        `/api/hub/${hubId}/onboarding/flows/${selectedFlow.id}/backfill`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      )

      if (!res.ok) {
        throw new Error("Failed to run backfill")
      }

      const data = await res.json()
      setBackfillResult(data)

      // Clear result after 5 seconds
      setTimeout(() => {
        setBackfillResult(null)
      }, 5000)
    } catch (err: any) {
      console.error("Error running backfill:", err)
      setBackfillResult({
        completed: 0,
        checked: 0,
        errors: [err.message || "Failed to run backfill"],
      })
    } finally {
      setBackfilling(false)
    }
  }

  if (loading) {
    return (
      <div className="card-elevated p-12">
        <div className="text-center text-muted-foreground">
          Loading flows...
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
      {/* Flows List Sidebar */}
      <div className="lg:col-span-1">
        <div className="card-elevated">
        <div className="px-6 py-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Flows
            </h2>
            <div className="flex items-center gap-2">
              <TemplateGallery
                onInsert={(template) => {
                  // Create new flow from template
                  console.log("Inserting template:", template)
                  // TODO: Implement template insertion - create flow and steps via API
                  handleCreateNewFlow()
                }}
              />
              <Button
                size="sm"
                className="h-7 px-3 gap-1.5"
                onClick={handleCreateNewFlow}
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            </div>
          </div>
        </div>
        <div className="p-0">
          {flows.length === 0 ? (
              <div className="p-6 text-center">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first onboarding flow
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  console.log("Create new flow")
                  // TODO: Implement new flow creation
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create Flow
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="p-4 space-y-3">
                <AnimatePresence>
                  {flows.map((flow) => {
                    const stepCount = flow.id === selectedFlow?.id ? steps.length : 0
                    return (
                      <motion.div
                        key={flow.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <FlowCard
                          id={flow.id!}
                          name={flow.name}
                          enabled={flow.enabled !== false}
                          stepCount={stepCount}
                          updatedAt={flow.updated_at}
                          selected={selectedFlow?.id === flow.id}
                          onSelect={() => setSelectedFlow(flow)}
                          onToggle={(enabled) =>
                            handleToggleEnabled(flow.id!, enabled)
                          }
                          description={flow.description || undefined}
                          isDefault={flow.is_default}
                        />
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </div>
        </div>
      </div>

      {/* Flow Editor Panel */}
      <div className="lg:col-span-1">
        <div className="card-elevated p-6">
        <AnimatePresence mode="wait">
          {selectedFlow ? (
            <motion.div
              key={selectedFlow.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6 pb-6 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {editingFlow ? (
                      <div className="space-y-3">
                        <Input
                          value={flowName}
                          onChange={(e) => {
                            setFlowName(e.target.value)
                            setDirty(true)
                          }}
                          className="text-xl font-semibold h-10"
                          placeholder="Flow name"
                        />
                        <Textarea
                          value={flowDesc}
                          onChange={(e) => {
                            setFlowDesc(e.target.value)
                            setDirty(true)
                          }}
                          placeholder="Description (optional)"
                          rows={2}
                        />
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
                          {selectedFlow.name}
                        </h2>
                        {selectedFlow.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {selectedFlow.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedFlow.is_default && (
                      <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800">
                        Default
                      </Badge>
                    )}
                    {!editingFlow ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRunBackfill}
                          disabled={backfilling}
                          className="gap-2"
                          title="Run backfill to mark existing members as completed based on their recent activity"
                        >
                          {backfilling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <History className="h-4 w-4" />
                          )}
                          {backfilling ? "Running..." : "Run Backfill"}
                        </Button>
                        {backfillResult && (
                          <div className="absolute right-0 top-full mt-2 bg-popover border rounded-lg p-3 shadow-lg z-50 min-w-[300px] max-h-[200px] overflow-y-auto">
                            <div className="text-sm font-medium mb-2">Backfill Complete</div>
                            <div className="text-xs space-y-1">
                              <div>Completed: {backfillResult.completed} steps</div>
                              <div>Checked: {backfillResult.checked} members</div>
                              {backfillResult.errors.length > 0 && (
                                <div className="text-destructive mt-2">
                                  <div className="font-medium">Errors:</div>
                                  <ul className="list-disc list-inside">
                                    {backfillResult.errors.slice(0, 3).map((err, idx) => (
                                      <li key={idx}>{err}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        <MemberPreviewDialog flow={selectedFlow} steps={steps} hubId={hubId} />
                        <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Preview checklist"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </Button>
                              </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-lg font-semibold">
                                Checklist Preview
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="text-sm text-muted-foreground">
                                Preview as a member would see it:
                              </div>
                              <div className="bg-muted rounded-xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold">{selectedFlow.name}</h3>
                                  <Badge variant="secondary">
                                    {steps.filter((s) => s.id?.startsWith("completed")).length}/
                                    {steps.length}
                                  </Badge>
                                </div>
                                <div className="w-full bg-secondary rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{
                                      width: `${(steps.length * 33) % 100}%`,
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  {steps.map((step, idx) => (
                                    <div
                                      key={step.id || idx}
                                      className="flex items-center gap-3 text-sm"
                                    >
                                      <span>○</span>
                                      <span>{step.title}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleStartEdit}
                          className="gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={handleSaveFlow}
                          disabled={!dirty}
                          className="gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="gap-2"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
                <StepList
                  steps={steps}
                  onReorder={handleReorderSteps}
                  onEditStep={handleEditStep}
                  onDeleteStep={handleDeleteStep}
                  onAddStep={handleAddStep}
                  hubId={hubId}
                />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-12"
            >
              <div className="text-center">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  Select a flow to edit
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose a flow from the left to view and edit its steps
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
