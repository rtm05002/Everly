"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { OnboardingStep, OnboardingStepKind } from "@/lib/types"
import { Channel, BountyOption, TierOption } from "@/server/onboarding/data-hooks"
import {
  ReadConfig,
  JoinConfig,
  PostConfig,
  CustomConfig,
  ConnectConfig,
  schemaFor,
  type ReadCfg,
  type JoinCfg,
  type PostCfg,
  type CustomCfg,
  type ConnectCfg,
} from "@/lib/onboarding-config"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface StepConfigFormProps {
  step: OnboardingStep
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (config: Record<string, any>) => void
  hubId: string
}

// Presets for common step configurations
const PRESETS: Record<string, { label: string; config: Record<string, any> }> = {
  "intro-post": {
    label: "Intro Post",
    config: {
      channel_id: "",
      prompt: "Introduce yourself to the community! Share your name, background, and what you're looking forward to.",
      min_words: 20,
    },
  },
  "share-win": {
    label: "Share a Win",
    config: {
      channel_id: "",
      prompt: "Share something you've accomplished or learned recently!",
      min_words: 10,
    },
  },
  "claim-bounty": {
    label: "Claim First Bounty",
    config: {
      bounty_id: "",
    },
  },
}

export function StepConfigForm({
  step,
  open,
  onOpenChange,
  onSave,
  hubId,
}: StepConfigFormProps) {
  const [preset, setPreset] = useState<string>("")
  const [previewText, setPreviewText] = useState("")
  const [channels, setChannels] = useState<Channel[]>([])
  const [bounties, setBounties] = useState<BountyOption[]>([])
  const [tiers, setTiers] = useState<TierOption[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
  const schema = schemaFor(step.kind)

  // Fetch real data based on step kind
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true)
      try {
        if (step.kind === "join" || step.kind === "post") {
          const res = await fetch(`/api/hub/${hubId}/onboarding/channels`)
          if (res.ok) {
            const data = await res.json()
            setChannels(data.channels || [])
          }
        }
        if (step.kind === "custom") {
          const res = await fetch(`/api/hub/${hubId}/onboarding/bounties`)
          if (res.ok) {
            const data = await res.json()
            setBounties(data.bounties || [])
          }
        }
        if (step.kind === "join") {
          const res = await fetch(`/api/hub/${hubId}/onboarding/tiers`)
          if (res.ok) {
            const data = await res.json()
            setTiers(data.tiers || [])
          }
        }
      } catch (err) {
        console.error("Error fetching form data:", err)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [step.kind, hubId])

  // Validate referential integrity on save
  const validateReferences = async (data: any): Promise<string[]> => {
    const errors: string[] = []
    
    if (step.kind === "post" && data.channel_id) {
      const res = await fetch(`/api/hub/${hubId}/onboarding/channels/${data.channel_id}/validate`)
      if (!res.ok) {
        errors.push(`Channel "${data.channel_id}" no longer exists`)
      }
    }
    
    if (step.kind === "custom" && data.bounty_id) {
      const res = await fetch(`/api/hub/${hubId}/onboarding/bounties/${data.bounty_id}/validate`)
      if (!res.ok) {
        errors.push(`Bounty no longer exists`)
      }
    }
    
    if (step.kind === "join" && Array.isArray(data.channels)) {
      // Validate each channel
      for (const channelId of data.channels) {
        const res = await fetch(`/api/hub/${hubId}/onboarding/channels/${channelId}/validate`)
        if (!res.ok) {
          errors.push(`Channel "${channelId}" no longer exists`)
        }
      }
    }
    
    return errors
  }
  
  // Initialize default values based on step kind and existing config
  const getDefaultValues = () => {
    const existing = step.config || {}
    const defaults: Record<string, any> = { ...existing }
    
    // Apply schema defaults
    switch (step.kind) {
      case "join":
        if (!Array.isArray(defaults.channels)) defaults.channels = []
        break
      case "post":
        if (typeof defaults.min_words !== "number") defaults.min_words = 0
        break
      case "connect":
        if (typeof defaults.enable_mentions !== "boolean") defaults.enable_mentions = true
        if (typeof defaults.enable_email !== "boolean") defaults.enable_email = false
        if (typeof defaults.enable_dm !== "boolean") defaults.enable_dm = false
        break
    }
    
    return defaults
  }

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues() as any,
    mode: "onChange",
  })

  const watchedValues = form.watch()
  const stepTitle = step.title

  // Generate preview text based on step kind and config
  useEffect(() => {
    const generatePreview = () => {
      switch (step.kind) {
        case "read":
          const readCfg = watchedValues as ReadCfg
          return `Read the guide${readCfg.url ? ` at ${readCfg.url}` : ""}${readCfg.cta ? `. ${readCfg.cta}` : ""}`
        case "join":
          const joinCfg = watchedValues as JoinCfg
          return `Join ${joinCfg.channels?.length ? joinCfg.channels.join(", ") : "channels"}${joinCfg.tier ? ` (${joinCfg.tier} tier)` : ""}`
        case "post":
          const postCfg = watchedValues as PostCfg
          return `Post${postCfg.channel_id ? ` in channel` : ""}${postCfg.prompt ? `: ${postCfg.prompt}` : ""}${postCfg.min_words ? ` (min ${postCfg.min_words} words)` : ""}`
        case "custom":
          const customCfg = watchedValues as CustomCfg
          if (customCfg.bounty_id) return `Complete a bounty challenge`
          if (customCfg.webhook_url) return `Trigger custom action`
          return `Complete custom step`
        case "connect":
          const connectCfg = watchedValues as ConnectCfg
          const enables = []
          if (connectCfg.enable_mentions) enables.push("mentions")
          if (connectCfg.enable_email) enables.push("email")
          if (connectCfg.enable_dm) enables.push("DMs")
          return `Enable ${enables.length ? enables.join(", ") : "notifications"}`
        default:
          return stepTitle
      }
    }
    setPreviewText(generatePreview())
  }, [watchedValues, step.kind, stepTitle])

  const handlePresetSelect = (presetKey: string) => {
    const presetConfig = PRESETS[presetKey]
    if (presetConfig) {
      Object.entries(presetConfig.config).forEach(([key, value]) => {
        form.setValue(key as any, value)
      })
      setPreset(presetKey)
    }
  }

  const handleSubmit = async (data: any) => {
    // Validate referential integrity
    const refErrors = await validateReferences(data)
    if (refErrors.length > 0) {
      setValidationErrors(refErrors)
      return
    }
    
    setValidationErrors([])
    
    // Parse and validate with Zod schema
    const parseResult = schema.safeParse(data)
    if (!parseResult.success) {
      setValidationErrors(parseResult.error.issues.map(e => e.message))
      return
    }
    
    // Save parsed config JSONB (validated and typed)
    onSave(parseResult.data)
    onOpenChange(false)
  }

  const renderFields = () => {
    switch (step.kind) {
      case "read":
        return (
          <>
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="/guide or https://example.com/guide"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    URL that members should visit to complete this step
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CTA Label (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Get Started →"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Button text shown in the widget
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )

      case "join":
        return (
          <>
            <FormField
              control={form.control}
              name="channels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channels</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {loadingData ? (
                        <div className="text-sm text-muted-foreground">Loading channels...</div>
                      ) : channels.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          No channels found. Create channels in your hub first.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {channels.map((channel) => {
                            const isSelected = Array.isArray(field.value) && field.value.includes(channel.id)
                            return (
                              <div key={channel.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`channel-${channel.id}`}
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const current = Array.isArray(field.value) ? field.value : []
                                    if (e.target.checked) {
                                      field.onChange([...current, channel.id])
                                    } else {
                                      field.onChange(current.filter((id) => id !== channel.id))
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <label
                                  htmlFor={`channel-${channel.id}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {channel.name} <span className="text-muted-foreground">({channel.slug})</span>
                                </label>
                              </div>
                            )
                          })}
                          {Array.isArray(field.value) && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {field.value.map((channelId) => {
                                const channel = channels.find((c) => c.id === channelId)
                                return (
                                  <Badge key={channelId} variant="secondary">
                                    {channel ? channel.name : channelId}
                                  </Badge>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Select channels members should join to complete this step
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tier (Optional)</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || undefined}
                      onValueChange={(value) => field.onChange(value || undefined)}
                      disabled={loadingData}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiers.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No tiers available
                          </div>
                        ) : (
                          tiers.map((tier) => (
                            <SelectItem key={tier.value} value={tier.value}>
                              {tier.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Optional tier requirement for this step
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )

      case "post":
        return (
          <>
            <FormField
              control={form.control}
              name="channel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Channel *</FormLabel>
                  <FormControl>
                    <Select 
                      value={field.value || ""} 
                      onValueChange={field.onChange}
                      disabled={loadingData}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingData ? "Loading..." : "Select channel"} />
                      </SelectTrigger>
                      <SelectContent>
                        {channels.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No channels available
                          </div>
                        ) : (
                          channels.map((channel) => (
                            <SelectItem key={channel.id} value={channel.id}>
                              {channel.name} <span className="text-muted-foreground">({channel.slug})</span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Channel where members should post
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {preset && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">Preset: {PRESETS[preset].label}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreset("")
                    form.reset()
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Prompt (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What should members write about?"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Suggested prompt or template shown to members
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="min_words"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Words</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Minimum word count required (0 for no requirement)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Quick Presets
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetSelect("intro-post")}
                >
                  Intro Post
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetSelect("share-win")}
                >
                  Share a Win
                </Button>
              </div>
            </div>
          </>
        )

      case "custom":
        return (
          <>
            <FormField
              control={form.control}
              name="bounty_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bounty (Optional)</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={loadingData}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingData ? "Loading..." : "Select a bounty"} />
                      </SelectTrigger>
                      <SelectContent>
                        {bounties.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No active bounties
                          </div>
                        ) : (
                          bounties.map((bounty) => (
                            <SelectItem key={bounty.id} value={bounty.id}>
                              {bounty.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Bounty that members should complete
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-center text-muted-foreground py-2">OR</div>
            <FormField
              control={form.control}
              name="webhook_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/webhook"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Custom webhook to trigger when step is completed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {preset && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">Preset: {PRESETS[preset].label}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreset("")
                    form.reset()
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Quick Presets
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetSelect("claim-bounty")}
                >
                  Claim First Bounty
                </Button>
              </div>
            </div>
          </>
        )

      case "connect":
        return (
          <>
            <FormField
              control={form.control}
              name="enable_mentions"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Mentions</FormLabel>
                    <FormDescription>
                      Allow members to @mention others
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enable_email"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Email Notifications</FormLabel>
                    <FormDescription>
                      Allow members to receive email notifications
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enable_dm"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Direct Messages</FormLabel>
                    <FormDescription>
                      Allow members to send and receive DMs
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Configure: {stepTitle}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Preview Section */}
            <div className="bg-muted rounded-lg p-4 border">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Member Preview
                </Label>
              </div>
              <div className="bg-card rounded p-3 border">
                <p className="text-sm font-medium mb-1">{stepTitle}</p>
                <p className="text-xs text-muted-foreground">{previewText}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">{renderFields()}</div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <div className="text-sm font-medium text-destructive mb-1">Validation Errors:</div>
                <ul className="text-xs text-destructive/80 space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Config</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

