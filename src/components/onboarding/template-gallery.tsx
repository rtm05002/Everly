"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Sparkles, Check } from "lucide-react"

interface TemplateGalleryProps {
  onInsert: (template: any) => void
}

const TEMPLATES = [
  {
    id: "best-practice-5step",
    name: "Best-Practice Onboarding",
    description: "5-step flow: Read guide, Join channels, Post intro, Complete challenge, Enable notifications",
    steps: [
      {
        title: "Read the Community Guide",
        kind: "read",
        order_index: 1,
        config: { url: "/docs/start" },
      },
      {
        title: "Pick Your Channels",
        kind: "join",
        order_index: 2,
        config: { channels: [] }, // User selects
      },
      {
        title: "Post Your Intro",
        kind: "post",
        order_index: 3,
        config: { channel_id: "" }, // User selects
      },
      {
        title: "Try Your First Challenge",
        kind: "custom",
        order_index: 4,
        config: { bounty_hint: true },
      },
      {
        title: "Enable Mentions",
        kind: "connect",
        order_index: 5,
        config: { enable_mentions: true },
      },
    ],
  },
]

export function TemplateGallery({ onInsert }: TemplateGalleryProps) {
  const [open, setOpen] = useState(false)

  const handleInsert = (template: typeof TEMPLATES[0]) => {
    onInsert(template)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Template Gallery
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer"
              onClick={() => handleInsert(template)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium mb-1">{template.name}</div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {template.steps.length} steps
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleInsert(template)
                  }}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  Use Template
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

