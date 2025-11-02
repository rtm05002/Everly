"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  Play, 
  Eye, 
  Plus, 
  Edit, 
  Copy, 
  Trash2, 
  Users, 
  Clock, 
  Target,
  MessageSquare,
  Settings,
  CheckCircle2,
  AlertCircle,
  Send,
  BarChart3,
  Calendar,
  Mail,
  Smartphone,
  Globe
} from "lucide-react"
import { toast } from "sonner"
import { EnhancedNudgeRecipe, NudgeTrigger, NudgeTargeting } from "@/lib/types"
import { RecipeEditor } from "./recipe-editor"
import { 
  loadNudgeRecipes, 
  saveNudgeRecipe, 
  deleteNudgeRecipe, 
  toggleNudgeRecipe,
  loadNudgeRuns,
  testNudgeSend
} from "@/server/nudge-actions"

interface NudgeManagementProps {
  hubId: string
}

interface PreviewResult {
  count: number
  sample: string[]
  trigger: string
}

interface RunLog {
  id: string
  time: string
  recipe: string
  targeted: number
  sent: number
  errors: number
  status: "completed" | "running" | "failed"
}

export function NudgeManagement({ hubId }: NudgeManagementProps) {
  const [recipes, setRecipes] = useState<EnhancedNudgeRecipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<EnhancedNudgeRecipe | null>(null)
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<EnhancedNudgeRecipe | null>(null)
  const [runLogs, setRunLogs] = useState<RunLog[]>([])
  
  // Status & Scope state
  const [scope, setScope] = useState("entire_hub")
  const [frequencyCap, setFrequencyCap] = useState(2)
  const [channel, setChannel] = useState("dm")
  const [isLive, setIsLive] = useState(true)

  // Template Library - Enhanced with reach estimates
  const templateLibrary = [
    {
      name: "Welcome New Member",
      trigger: { type: "new_member_joined", withinHours: 24 } as NudgeTrigger,
      message_template: "Welcome to {{community_name}}, {{first_name}}! 🎉 We're excited to have you here. Check out our latest bounties to get started!",
      targeting: { cohorts: ["New"] } as NudgeTargeting,
      channel: "dm" as const,
      frequency: { cooldown_days: 7, max_per_week: 1 },
      dnd: { start: "22:00", end: "07:00" },
      estimatedReach: 12,
      preview: "Welcome to Everly Community, John! 🎉 We're excited to have you here..."
    },
    {
      name: "Inactive 7 Days",
      trigger: { type: "inactive_days", gte: 7 } as NudgeTrigger,
      message_template: "Hey {{first_name}}! We miss you in {{community_name}}. There's a new bounty that might interest you: {{cta_url}}",
      targeting: { cohorts: ["Lurker"] } as NudgeTargeting,
      channel: "dm" as const,
      frequency: { cooldown_days: 14, max_per_week: 1 },
      dnd: { start: "22:00", end: "07:00" },
      estimatedReach: 8,
      preview: "Hey Sarah! We miss you in Everly Community. There's a new bounty..."
    },
    {
      name: "Viewed Bounty Not Completed",
      trigger: { type: "viewed_bounty_not_completed", withinHours: 72 } as NudgeTrigger,
      message_template: "Don't miss out! You viewed this bounty but haven't completed it yet: {{cta_url}}",
      targeting: {} as NudgeTargeting,
      channel: "dm" as const,
      frequency: { cooldown_days: 3, max_per_week: 2 },
      dnd: { start: "22:00", end: "07:00" },
      estimatedReach: 5,
      preview: "Don't miss out! You viewed this bounty but haven't completed it yet..."
    },
    {
      name: "Near Deadline (48h)",
      trigger: { type: "near_deadline", withinHours: 48 } as NudgeTrigger,
      message_template: "⏰ Don't miss out! The bounty deadline is approaching. Complete it now: {{cta_url}}",
      targeting: {} as NudgeTargeting,
      channel: "dm" as const,
      frequency: { cooldown_days: 1, max_per_week: 3 },
      dnd: { start: "22:00", end: "07:00" },
      estimatedReach: 3,
      preview: "⏰ Don't miss out! The bounty deadline is approaching. Complete it now..."
    },
    {
      name: "First Completion Milestone",
      trigger: { type: "first_completion", withinHours: 24 } as NudgeTrigger,
      message_template: "🎉 Congratulations {{first_name}}! You completed your first bounty. Keep up the great work!",
      targeting: { cohorts: ["New"] } as NudgeTargeting,
      channel: "dm" as const,
      frequency: { cooldown_days: 30, max_per_week: 1 },
      dnd: { start: "22:00", end: "07:00" },
      estimatedReach: 2,
      preview: "🎉 Congratulations Alex! You completed your first bounty. Keep up the great work!"
    }
  ]

  // Load data on mount
  useEffect(() => {
    loadRecipes()
    loadRunLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubId])

  const loadRecipes = async () => {
    try {
      const loadedRecipes = await loadNudgeRecipes(hubId)
      setRecipes(loadedRecipes)
    } catch (error) {
      console.error("Failed to load recipes:", error)
      toast.error("Failed to load nudge recipes")
    }
  }

  const loadRunLogs = async () => {
    try {
      const runs = await loadNudgeRuns(hubId, 10)
      setRunLogs(runs)
    } catch (error) {
      console.error("Failed to load run logs:", error)
      // Keep empty array on error
      setRunLogs([])
    }
  }

  const previewRecipe = async (recipe: EnhancedNudgeRecipe) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/hub/${hubId}/nudges/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe })
      })
      
      if (!response.ok) {
        throw new Error("Preview failed")
      }
      
      const result = await response.json()
      setPreviewResult(result)
      setSelectedRecipe(recipe)
    } catch (error) {
      console.error("Preview error:", error)
      toast.error("Failed to preview recipe")
    } finally {
      setIsLoading(false)
    }
  }

  const runRecipe = async (recipe: EnhancedNudgeRecipe) => {
    if (!previewResult || previewResult.count === 0) {
      toast.error("No members to target")
      return
    }

    setIsRunning(true)
    try {
      const response = await fetch(`/api/hub/${hubId}/nudges/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          recipe, 
          memberIds: previewResult.sample
        })
      })
      
      if (!response.ok) {
        throw new Error("Run failed")
      }
      
      const result = await response.json()
      toast.success(`Successfully queued ${result.queued || result.targeted} nudges`)
      setPreviewResult(null)
      await loadRunLogs() // Refresh logs
    } catch (error) {
      console.error("Run error:", error)
      toast.error("Failed to run recipe")
    } finally {
      setIsRunning(false)
    }
  }

  const addTemplateRecipe = async (template: any) => {
    try {
      const newRecipe: EnhancedNudgeRecipe = { 
        ...template, 
        hub_id: hubId,
        enabled: true
      }
      
      const saved = await saveNudgeRecipe(hubId, newRecipe)
      if (saved) {
        setRecipes(prev => [...prev, saved])
        toast.success("Recipe added successfully")
      } else {
        toast.error("Failed to add recipe")
      }
    } catch (error) {
      console.error("Failed to add recipe:", error)
      toast.error("Failed to add recipe")
    }
  }

  const toggleRecipe = async (recipe: EnhancedNudgeRecipe) => {
    try {
      if (!recipe.id) {
        toast.error("Recipe ID is required")
        return
      }
      
      const newEnabledState = !recipe.enabled
      const success = await toggleNudgeRecipe(hubId, recipe.id, newEnabledState)
      
      if (success) {
        setRecipes(prev => 
          prev.map(r => 
            r.id === recipe.id 
              ? { ...r, enabled: newEnabledState }
              : r
          )
        )
        toast.success(`Recipe ${newEnabledState ? 'enabled' : 'disabled'}`)
      } else {
        toast.error("Failed to update recipe")
      }
    } catch (error) {
      console.error("Failed to toggle recipe:", error)
      toast.error("Failed to update recipe")
    }
  }

  const editRecipe = (recipe: EnhancedNudgeRecipe) => {
    setEditingRecipe(recipe)
    setShowEditor(true)
  }

  const duplicateRecipe = async (recipe: EnhancedNudgeRecipe) => {
    try {
      const duplicated: EnhancedNudgeRecipe = {
        ...recipe,
        name: `${recipe.name} (Copy)`
      }
      
      const saved = await saveNudgeRecipe(hubId, duplicated)
      if (saved) {
        setRecipes(prev => [...prev, saved])
        toast.success("Recipe duplicated")
      } else {
        toast.error("Failed to duplicate recipe")
      }
    } catch (error) {
      console.error("Failed to duplicate recipe:", error)
      toast.error("Failed to duplicate recipe")
    }
  }

  const deleteRecipe = async (recipe: EnhancedNudgeRecipe) => {
    if (!recipe.id) {
      toast.error("Recipe ID is required")
      return
    }
    
    if (window.confirm("Are you sure you want to delete this recipe?")) {
      const success = await deleteNudgeRecipe(hubId, recipe.id)
      if (success) {
        setRecipes(prev => prev.filter(r => r.id !== recipe.id))
        toast.success("Recipe deleted")
      } else {
        toast.error("Failed to delete recipe")
      }
    }
  }

  const testSend = async (recipe: EnhancedNudgeRecipe) => {
    try {
      const success = await testNudgeSend(hubId, recipe)
      if (success) {
        toast.success("Test message sent to your account")
      } else {
        toast.error("Failed to send test message")
      }
    } catch (error) {
      console.error("Test send error:", error)
      toast.error("Failed to send test message")
    }
  }

  const saveRecipe = async (recipe: EnhancedNudgeRecipe) => {
    try {
      const saved = await saveNudgeRecipe(hubId, recipe)
      if (saved) {
        if (editingRecipe) {
          // Update existing recipe
          setRecipes(prev => prev.map(r => r.id === recipe.id ? saved : r))
          toast.success("Recipe updated successfully")
        } else {
          // Add new recipe
          setRecipes(prev => [...prev, saved])
          toast.success("Recipe created successfully")
        }
        setEditingRecipe(null)
        setShowEditor(false)
      } else {
        toast.error("Failed to save recipe")
      }
    } catch (error) {
      console.error("Failed to save recipe:", error)
      toast.error("Failed to save recipe")
    }
  }

  const testRecipe = async (recipe: EnhancedNudgeRecipe) => {
    try {
      const success = await testNudgeSend(hubId, recipe)
      if (success) {
        toast.success("Test message sent to your account")
      } else {
        toast.error("Failed to send test message")
      }
    } catch (error) {
      console.error("Test send error:", error)
      toast.error("Failed to send test message")
    }
  }

  return (
    <div className="space-y-6">
      {/* Status + Scope Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={isLive ? "default" : "secondary"} className={isLive ? "bg-green-100 text-green-700" : ""}>
                  {isLive ? "Live" : "Draft"}
                </Badge>
                <Switch
                  checked={isLive}
                  onCheckedChange={setIsLive}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Scope:</Label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entire_hub">Entire Hub</SelectItem>
                    <SelectItem value="tier_pro">Tier: Pro</SelectItem>
                    <SelectItem value="tier_basic">Tier: Basic</SelectItem>
                    <SelectItem value="cohort_new">Cohort: New &lt;14d</SelectItem>
                    <SelectItem value="cohort_lurkers">Cohort: Lurkers</SelectItem>
                    <SelectItem value="cohort_champions">Cohort: Champions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Max:</Label>
                <Select value={frequencyCap.toString()} onValueChange={(v) => setFrequencyCap(parseInt(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 / week</SelectItem>
                    <SelectItem value="2">2 / week</SelectItem>
                    <SelectItem value="3">3 / week</SelectItem>
                    <SelectItem value="5">5 / week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Channel:</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dm">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        DM
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                    </SelectItem>
                    <SelectItem value="in_app">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        In-app
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-muted-foreground">Last run: 3h ago</div>
              <Button variant="link" className="p-0 h-auto text-sm">
                View logs
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Library */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Template Library
            </CardTitle>
            <CardDescription>
              One-click starter recipes with reach estimates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templateLibrary.map((template, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{template.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      ~{template.estimatedReach} members
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {template.preview}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {template.frequency.cooldown_days}d cooldown
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {template.targeting.cohorts?.join(", ") || "All members"}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addTemplateRecipe(template)}
                  className="ml-4"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Your Recipes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Your Recipes
                </CardTitle>
                <CardDescription>
                  Manage your custom nudge recipes
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingRecipe(null)
                  setShowEditor(true)
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Recipe
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{recipe.name}</h4>
                      <Badge 
                        variant={recipe.enabled ? "default" : "secondary"}
                        className={recipe.enabled ? "bg-green-100 text-green-700" : ""}
                      >
                        {recipe.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {recipe.trigger.type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {recipe.message_template.slice(0, 60)}...
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {recipe.frequency?.cooldown_days || 7}d cooldown
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {recipe.targeting?.cohorts?.join(", ") || "All members"}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => previewRecipe(recipe)}
                      disabled={isLoading}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => editRecipe(recipe)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => duplicateRecipe(recipe)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => testSend(recipe)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteRecipe(recipe)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Switch
                    checked={recipe.enabled}
                    onCheckedChange={() => toggleRecipe(recipe)}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Preview & Simulation */}
      {selectedRecipe && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview & Simulation
            </CardTitle>
            <CardDescription>
              Preview targeting and simulate messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Target Count:</span>
                <Badge variant="outline">
                  {previewResult?.count || 0}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Trigger:</span>
                <Badge variant="outline">
                  {previewResult?.trigger || "Unknown"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Status:</span>
                <Badge 
                  variant={selectedRecipe.enabled ? "default" : "secondary"}
                  className={selectedRecipe.enabled ? "bg-green-100 text-green-700" : ""}
                >
                  {selectedRecipe.enabled ? "Ready" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Reach:</span>
                <Badge variant="outline">
                  {previewResult?.count || 0} members
                </Badge>
              </div>
            </div>

            {previewResult && previewResult.count > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Simulated Messages (First 10):</h4>
                <div className="space-y-2">
                  {previewResult.sample.slice(0, 10).map((memberId, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {memberId.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">Member {memberId.slice(0, 8)}...</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedRecipe.message_template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                          switch (key) {
                            case 'first_name': return 'John'
                            case 'community_name': return 'Everly Community'
                            case 'cta_url': return 'https://everly.com/widget'
                            default: return `{{${key}}}`
                          }
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => previewRecipe(selectedRecipe)}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Previewing...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Again
                  </>
                )}
              </Button>
              <Button
                onClick={() => testSend(selectedRecipe)}
                variant="outline"
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Myself
              </Button>
              <Button
                onClick={() => runRecipe(selectedRecipe)}
                disabled={isRunning || !previewResult || previewResult.count === 0 || !selectedRecipe.enabled}
                className="bg-primary hover:bg-primary/90"
              >
                {isRunning ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Nudges Now
                  </>
                )}
              </Button>
            </div>

            {previewResult && previewResult.count === 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">
                  No members match this criteria. Try adjusting the trigger settings.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Run & Monitor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Run & Monitor
          </CardTitle>
          <CardDescription>
            Track nudge performance and delivery logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Recent Runs</h4>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                View All Logs
              </Button>
            </div>
            
            <div className="space-y-2">
              {runLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium">{log.recipe}</div>
                    <div className="text-sm text-muted-foreground">{log.time}</div>
                    <Badge 
                      variant={log.status === "completed" ? "default" : log.status === "failed" ? "destructive" : "secondary"}
                      className={log.status === "completed" ? "bg-green-100 text-green-700" : ""}
                    >
                      {log.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Targeted: {log.targeted}</span>
                    <span>Sent: {log.sent}</span>
                    {log.errors > 0 && <span className="text-destructive">Errors: {log.errors}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipe Editor Drawer */}
      <RecipeEditor
        recipe={editingRecipe}
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false)
          setEditingRecipe(null)
        }}
        onSave={saveRecipe}
        onTest={testRecipe}
        hubId={hubId}
      />
    </div>
  )
}
