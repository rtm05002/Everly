"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Play, 
  Eye, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Clock, 
  Target,
  MessageSquare,
  Settings,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import { EnhancedNudgeRecipe, NudgeTrigger, NudgeTargeting } from "@/lib/types"

interface NudgeAdminProps {
  hubId: string
}

interface PreviewResult {
  count: number
  sample: string[]
  trigger: string
}

export function NudgeAdmin({ hubId }: NudgeAdminProps) {
  const [recipes, setRecipes] = useState<EnhancedNudgeRecipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<EnhancedNudgeRecipe | null>(null)
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  // Template Library - Pre-baked recipes
  const templateLibrary = [
    {
      name: "Welcome New Members",
      trigger: { type: "new_member_joined", withinHours: 24 } as NudgeTrigger,
      message_template: "Welcome to {{community_name}}, {{first_name}}! 🎉 We're excited to have you here. Check out our latest bounties to get started!",
      targeting: { cohorts: ["New"] } as NudgeTargeting,
      channel: "dm" as const,
      frequency: { cooldown_days: 7, max_per_week: 1 },
      dnd: { start: "22:00", end: "07:00" }
    },
    {
      name: "Re-engage Inactive Members",
      trigger: { type: "inactive_days", gte: 7 } as NudgeTrigger,
      message_template: "Hey {{first_name}}! We miss you in {{community_name}}. There's a new bounty that might interest you: {{cta_url}}",
      targeting: { cohorts: ["Lurker"] } as NudgeTargeting,
      channel: "dm" as const,
      frequency: { cooldown_days: 14, max_per_week: 1 },
      dnd: { start: "22:00", end: "07:00" }
    },
    {
      name: "Bounty Deadline Reminder",
      trigger: { type: "near_deadline", withinHours: 24 } as NudgeTrigger,
      message_template: "⏰ Don't miss out! The bounty deadline is approaching. Complete it now: {{cta_url}}",
      targeting: {} as NudgeTargeting,
      channel: "dm" as const,
      frequency: { cooldown_days: 1, max_per_week: 3 },
      dnd: { start: "22:00", end: "07:00" }
    }
  ]

  // Load recipes on mount
  useEffect(() => {
    loadRecipes()
  }, [])

  const loadRecipes = async () => {
    try {
      // TODO: Replace with actual Supabase call
      // For now, use template library as mock data
      setRecipes(templateLibrary as EnhancedNudgeRecipe[])
    } catch (error) {
      console.error("Failed to load recipes:", error)
      toast.error("Failed to load nudge recipes")
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
          memberIds: previewResult.sample // Use sample for now
        })
      })
      
      if (!response.ok) {
        throw new Error("Run failed")
      }
      
      const result = await response.json()
      toast.success(`Successfully queued ${result.queued} nudges`)
      setPreviewResult(null)
    } catch (error) {
      console.error("Run error:", error)
      toast.error("Failed to run recipe")
    } finally {
      setIsRunning(false)
    }
  }

  const addTemplateRecipe = async (template: any) => {
    try {
      // TODO: Save to Supabase
      const newRecipe = { ...template, id: Date.now().toString(), hub_id: hubId }
      setRecipes(prev => [...prev, newRecipe])
      toast.success("Recipe added successfully")
    } catch (error) {
      console.error("Failed to add recipe:", error)
      toast.error("Failed to add recipe")
    }
  }

  const toggleRecipe = async (recipe: EnhancedNudgeRecipe) => {
    try {
      // TODO: Update in Supabase
      setRecipes(prev => 
        prev.map(r => 
          r.id === recipe.id 
            ? { ...r, enabled: !r.enabled }
            : r
        )
      )
      toast.success(`Recipe ${recipe.enabled ? 'disabled' : 'enabled'}`)
    } catch (error) {
      console.error("Failed to toggle recipe:", error)
      toast.error("Failed to update recipe")
    }
  }

  return (
    <div className="space-y-6">
      {/* Status/Scope Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Nudge Management
              </CardTitle>
              <CardDescription>
                Manage automated engagement nudges for your community
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
              <Badge variant="outline">
                {recipes.length} Recipes
              </Badge>
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
              Pre-built nudge templates ready to use
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templateLibrary.map((template, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {template.message_template.slice(0, 60)}...
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addTemplateRecipe(template)}
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
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Your Recipes
            </CardTitle>
            <CardDescription>
              Manage your custom nudge recipes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{recipe.name}</h4>
                    <Badge 
                      variant={recipe.enabled ? "default" : "secondary"}
                      className={recipe.enabled ? "bg-green-100 text-green-700" : ""}
                    >
                      {recipe.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {recipe.message_template.slice(0, 50)}...
                  </p>
                </div>
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
                    onClick={() => toggleRecipe(recipe)}
                  >
                    <Switch className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Preview & Run Pane */}
      {selectedRecipe && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview & Run
            </CardTitle>
            <CardDescription>
              Preview targeting and run the selected recipe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

            {previewResult && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Sample Members:</h4>
                <div className="flex flex-wrap gap-1">
                  {previewResult.sample.map((memberId, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {memberId.slice(0, 8)}...
                    </Badge>
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
                    Run Now
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
    </div>
  )
}
