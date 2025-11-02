"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AIConfig, NudgeRecipe } from "@/lib/types"
import { Plus, Trash2 } from "lucide-react"

interface NudgeRecipesFormProps {
  config: AIConfig
  updateConfig: (updates: Partial<AIConfig>) => void
}

export function NudgeRecipesForm({ config, updateConfig }: NudgeRecipesFormProps) {
  const addNudgeRecipe = () => {
    const newRecipe: NudgeRecipe = {
      name: "",
      trigger: "",
      messageTemplate: ""
    }
    updateConfig({
      nudgeRecipes: [...config.nudgeRecipes, newRecipe]
    })
  }

  const updateNudgeRecipe = (index: number, field: keyof NudgeRecipe, value: string) => {
    const updated = [...config.nudgeRecipes]
    updated[index] = { ...updated[index], [field]: value }
    updateConfig({ nudgeRecipes: updated })
  }

  const removeNudgeRecipe = (index: number) => {
    const updated = config.nudgeRecipes.filter((_, i) => i !== index)
    updateConfig({ nudgeRecipes: updated })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-border/50">
        <div>
          <h3 className="text-base font-semibold">Nudge Recipes</h3>
          <p className="text-sm text-muted-foreground">Configure automated messages to engage members</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addNudgeRecipe}
          className="gap-2 border-primary text-primary hover:bg-primary/10"
        >
          <Plus className="h-4 w-4" />
          Add Recipe
        </Button>
      </div>

      <div className="space-y-4">
        {config.nudgeRecipes.map((recipe, index) => (
          <div key={index} className="bg-gradient-to-br from-blue-50/50 to-cyan-100/30 rounded-xl p-5 border border-blue-200/50 hover:border-blue-300/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <h4 className="font-semibold text-blue-900">Recipe {index + 1}</h4>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeNudgeRecipe(index)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`recipe-name-${index}`} className="text-sm font-medium">Recipe Name</Label>
                <Input
                  id={`recipe-name-${index}`}
                  value={recipe.name}
                  onChange={(e) => updateNudgeRecipe(index, 'name', e.target.value)}
                  placeholder="Welcome New Members"
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`recipe-trigger-${index}`} className="text-sm font-medium">Trigger Event</Label>
                <Input
                  id={`recipe-trigger-${index}`}
                  value={recipe.trigger}
                  onChange={(e) => updateNudgeRecipe(index, 'trigger', e.target.value)}
                  placeholder="new_member_joined"
                  className="bg-white"
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor={`recipe-message-${index}`} className="text-sm font-medium">Message Template</Label>
              <Textarea
                id={`recipe-message-${index}`}
                value={recipe.messageTemplate}
                onChange={(e) => updateNudgeRecipe(index, 'messageTemplate', e.target.value)}
                placeholder="Welcome to the community! We're excited to have you here."
                rows={3}
                className="bg-white"
              />
            </div>
          </div>
        ))}
        
        {config.nudgeRecipes.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">No recipes yet. Click "Add Recipe" to create your first nudge.</p>
          </div>
        )}
      </div>
    </div>
  )
}
