export type WidgetRole = "user" | "assistant"

export type WidgetSource = {
  title?: string
  url?: string | null
  score?: number
  text?: string
}

export type WidgetMsg = {
  id: string
  role: WidgetRole
  content: string
  sources?: WidgetSource[]
}


