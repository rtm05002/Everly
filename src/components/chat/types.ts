export type Role = "user" | "assistant" | "system"

export type SourceHit = {
  title?: string
  url?: string | null
  score?: number
  text?: string
}

export type ChatMessage = {
  id: string
  role: Role
  content: string
  sources?: SourceHit[]
}


