"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  X, 
  Save, 
  Play, 
  Eye, 
  Users, 
  Clock, 
  Target,
  MessageSquare,
  Smartphone,
  Mail,
  Globe,
  Plus,
  Trash2
} from "lucide-react"
import { toast } from "sonner"
import { EnhancedNudgeRecipe, NudgeTrigger, NudgeTargeting } from "@/lib/types"

interface RecipeEditorProps {
  recipe: EnhancedNudgeRecipe | null
  isOpen: boolean
  onClose: () => void
  onSave: (recipe: EnhancedNudgeRecipe) => void
  onTest: (recipe: EnhancedNudgeRecipe) => void
  hubId: string
}

export function RecipeEditor({ recipe, isOpen, onClose, onSave, onTest, hubId }: RecipeEditorProps) {
  const [formData, setFormData] = useState<Partial<EnhancedNudgeRecipe>>({
    name: "",
    trigger: { type: "inactive_days", gte: 7 },
    targeting: { cohorts: [] },
    message_template: "",
    channel: "dm",
    frequency: { cooldown_days: 7, max_per_week: 2 },
    dnd: { start: "22:00", end: "07:00" },
    enabled: true
  })

  const [previewMember, setPreviewMember] = useState("Ava Chen")
  const [previewMessage, setPreviewMessage] = useState("")

  useEffect(() => {
    if (recipe) {
      setFormData(recipe)
    } else {
      setFormData({
        name: "",
        trigger: { type: "inactive_days", gte: 7 },
        targeting: { cohorts: [] },
        message_template: "",
        channel: "dm",
        frequency: { cooldown_days: 7, max_per_week: 2 },
        dnd: { start: "22:00", end: "07:00" },
        enabled: true
      })
    }
  }, [recipe])

  useEffect(() => {
    if (formData.message_template) {
      const rendered = formData.message_template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        switch (key) {
          case 'first_name': return previewMember.split(' ')[0]
          case 'community_name': return 'Everly Community'
          case 'cta_url': return 'https://everly.com/widget'
          case 'inactive_days': return formData.trigger?.type === 'inactive_days' ? formData.trigger.gte?.toString() || '7' : '7'
          default: return `{{${key}}}`
        }
      })
      setPreviewMessage(rendered)
    }
  }, [formData.message_template, formData.trigger, previewMember])

  const handleSave = () => {
    if (!formData.name || !formData.message_template) {
      toast.error("Name and message template are required")
      return
    }

    const recipeData: EnhancedNudgeRecipe = {
      // Only include id and created_at if this is an existing recipe
      ...(recipe?.id && { id: recipe.id, created_at: recipe.created_at }),
      hub_id: hubId,
      name: formData.name,
      trigger: formData.trigger!,
      targeting: formData.targeting || {},
      message_template: formData.message_template,
      channel: formData.channel || "dm",
      frequency: formData.frequency || { cooldown_days: 7, max_per_week: 2 },
      dnd: formData.dnd || { start: "22:00", end: "07:00" },
      enabled: formData.enabled ?? true,
      updated_at: new Date().toISOString()
    }

    onSave(recipeData)
    onClose()
  }

  const handleTest = () => {
    if (!formData.name || !formData.message_template) {
      toast.error("Name and message template are required")
      return
    }

    const recipeData: EnhancedNudgeRecipe = {
      // Only include id and created_at if this is an existing recipe
      ...(recipe?.id && { id: recipe.id, created_at: recipe.created_at }),
      hub_id: hubId,
      name: formData.name,
      trigger: formData.trigger!,
      targeting: formData.targeting || {},
      message_template: formData.message_template,
      channel: formData.channel || "dm",
      frequency: formData.frequency || { cooldown_days: 7, max_per_week: 2 },
      dnd: formData.dnd || { start: "22:00", end: "07:00" },
      enabled: formData.enabled ?? true,
      updated_at: new Date().toISOString()
    }

    onTest(recipeData)
  }

  const updateTrigger = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      trigger: {
        ...prev.trigger!,
        [field]: value
      }
    }))
  }

  const updateTargeting = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting!,
        [field]: value
      }
    }))
  }

  const addCohort = (cohort: string) => {
    const currentCohorts = formData.targeting?.cohorts || []
    if (!currentCohorts.includes(cohort)) {
      updateTargeting('cohorts', [...currentCohorts, cohort])
    }
  }

  const removeCohort = (cohort: string) => {
    const currentCohorts = formData.targeting?.cohorts || []
    updateTargeting('cohorts', currentCohorts.filter(c => c !== cohort))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {recipe ? "Edit Recipe" : "Create Recipe"}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Recipe Name</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Welcome New Members"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
            </CardContent>
          </Card>

          {/* Trigger Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trigger</CardTitle>
              <CardDescription>When should this nudge be sent?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Trigger Type</Label>
                <Select 
                  value={formData.trigger?.type || "inactive_days"} 
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    trigger: { type: value as any, gte: 7, withinHours: 24 } 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inactive_days">Inactive Days</SelectItem>
                    <SelectItem value="new_member_joined">New Member Joined</SelectItem>
                    <SelectItem value="viewed_bounty_not_completed">Viewed Bounty Not Completed</SelectItem>
                    <SelectItem value="near_deadline">Near Deadline</SelectItem>
                    <SelectItem value="first_completion">First Completion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.trigger?.type === "inactive_days" && (
                <div>
                  <Label>Inactive for (days)</Label>
                  <Input
                    type="number"
                    value={formData.trigger.gte || 7}
                    onChange={(e) => updateTrigger('gte', parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              )}

              {(formData.trigger?.type === "new_member_joined" || 
                formData.trigger?.type === "viewed_bounty_not_completed" || 
                formData.trigger?.type === "near_deadline" || 
                formData.trigger?.type === "first_completion") && (
                <div>
                  <Label>Within (hours)</Label>
                  <Input
                    type="number"
                    value={formData.trigger.withinHours || 24}
                    onChange={(e) => updateTrigger('withinHours', parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Targeting */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Targeting</CardTitle>
              <CardDescription>Who should receive this nudge?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Cohorts</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.targeting?.cohorts?.map((cohort) => (
                    <Badge key={cohort} variant="secondary" className="flex items-center gap-1">
                      {cohort}
                      <button
                        onClick={() => removeCohort(cohort)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Select onValueChange={addCohort}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Add cohort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New &lt;14d</SelectItem>
                      <SelectItem value="Lurker">Lurkers</SelectItem>
                      <SelectItem value="Champion">Champions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message Template */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Message Template</CardTitle>
              <CardDescription>Supports variables: {`{{first_name}}`, `{{community_name}}`, `{{cta_url}}`}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Message</Label>
                <Textarea
                  value={formData.message_template || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, message_template: e.target.value }))}
                  placeholder="Welcome {{first_name}}! We're excited to have you in {{community_name}}."
                  rows={4}
                />
              </div>

              {/* Live Preview */}
              {formData.message_template && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label>Preview as:</Label>
                    <Input
                      value={previewMember}
                      onChange={(e) => setPreviewMember(e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Rendered message:</div>
                    <div className="text-sm">{previewMessage}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Frequency & Channel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Frequency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Cooldown (days)</Label>
                  <Input
                    type="number"
                    value={formData.frequency?.cooldown_days || 7}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      frequency: { ...prev.frequency!, cooldown_days: parseInt(e.target.value) }
                    }))}
                    min="1"
                  />
                </div>
                <div>
                  <Label>Max per week</Label>
                  <Input
                    type="number"
                    value={formData.frequency?.max_per_week || 2}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      frequency: { ...prev.frequency!, max_per_week: parseInt(e.target.value) }
                    }))}
                    min="1"
                    max="7"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Channel & Safety</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Channel</Label>
                  <Select 
                    value={formData.channel || "dm"} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, channel: value as any }))}
                  >
                    <SelectTrigger>
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
                      <SelectItem value="webhook">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Webhook
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>DND Start</Label>
                    <Input
                      type="time"
                      value={formData.dnd?.start || "22:00"}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        dnd: { ...prev.dnd!, start: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>DND End</Label>
                    <Input
                      type="time"
                      value={formData.dnd?.end || "07:00"}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        dnd: { ...prev.dnd!, end: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleTest}>
              <Eye className="h-4 w-4 mr-2" />
              Test Send
            </Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
              <Save className="h-4 w-4 mr-2" />
              {recipe ? "Update Recipe" : "Create Recipe"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
