"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AIConfig, NudgeRecipe } from "@/lib/types"
import { saveAIConfig } from "./actions"
import { Plus, Trash2, Database } from "lucide-react"
import { toast } from "sonner"
import SourcesPanel from "@/components/sources/SourcesPanel"
import Link from "next/link"

interface ConfigFormProps {
  initialConfig: AIConfig
  hubId: string
}

export function ConfigForm({ initialConfig, hubId }: ConfigFormProps) {
  const [config, setConfig] = useState<AIConfig>(initialConfig)
  const [isSaving, setIsSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveAIConfig(config)
      toast.success("AI configuration saved successfully!")
    } catch (error) {
      console.error("Failed to save config:", error)
      toast.error("Failed to save configuration")
    } finally {
      setIsSaving(false)
    }
  }

  const updateConfig = (updates: Partial<AIConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const updateBannedPhrases = (value: string) => {
    const phrases = value.split('\n').filter(phrase => phrase.trim())
    updateConfig({ bannedPhrases: phrases })
  }

  const updateEscalateIf = (value: string) => {
    const phrases = value.split('\n').filter(phrase => phrase.trim())
    updateConfig({ escalateIf: phrases })
  }

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
    <div className="space-y-6">
      {/* Settings Section */}
      <div className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 rounded-xl p-6 border border-blue-200/50 dark:border-blue-800/30">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 rounded-full" />
          AI Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="mode" className="text-sm font-medium">AI Mode</Label>
            <Select value={config.mode} onValueChange={(value: any) => updateConfig({ mode: value })}>
              <SelectTrigger className="bg-white dark:bg-card">
                <SelectValue placeholder="Select AI mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assist">Assist - Help users when asked</SelectItem>
                <SelectItem value="moderate">Moderate - Actively monitor content</SelectItem>
                <SelectItem value="proactive">Proactive - Initiate conversations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone" className="text-sm font-medium">Tone</Label>
            <Select value={config.tone} onValueChange={(value: any) => updateConfig({ tone: value })}>
              <SelectTrigger className="bg-white dark:bg-card">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="concise">Concise</SelectItem>
                <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content Filtering Section */}
      <div className="bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10 rounded-xl p-6 border border-red-200/50 dark:border-red-800/30">
        <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-red-600 rounded-full" />
          Content Filtering
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bannedPhrases" className="text-sm font-medium">Banned Phrases (one per line)</Label>
            <Textarea
              id="bannedPhrases"
              value={config.bannedPhrases.join('\n')}
              onChange={(e) => updateBannedPhrases(e.target.value)}
              placeholder="spam&#10;hate speech&#10;harassment"
              rows={3}
              className="bg-white dark:bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="escalateIf" className="text-sm font-medium">Escalate If (one per line)</Label>
            <Textarea
              id="escalateIf"
              value={config.escalateIf.join('\n')}
              onChange={(e) => updateEscalateIf(e.target.value)}
              placeholder="threats&#10;illegal content&#10;repeated violations"
              rows={3}
              className="bg-white dark:bg-card"
            />
          </div>
        </div>
      </div>

      {/* Content Sources Section */}
      <div className="bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 rounded-xl p-6 border border-green-200/50 dark:border-green-800/30">
        <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-green-600 rounded-full" />
          Content Sources
        </h3>
        <p className="text-sm text-green-800 dark:text-green-300 mb-4">
          Manage knowledge base sources for AI-powered responses
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Open preview
          </button>
          <a
            href="/assistant/sources"
            className="text-sm font-medium underline-offset-2 hover:underline"
          >
            Open full manager
          </a>
        </div>
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-[900px] max-w-[95vw] rounded-xl bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Content Sources — Preview</h3>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-sm opacity-70 hover:opacity-100"
              >
                Close
              </button>
            </div>
            <SourcesPanel mode="preview" hubId={hubId} />
          </div>
        </div>
      ) : null}

      <div className="flex justify-end pt-4 border-t border-border/50">
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 shadow-sm">
          {isSaving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  )
}