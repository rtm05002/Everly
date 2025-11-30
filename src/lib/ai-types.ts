export type AIMode = "assist" | "moderate" | "proactive"

export interface NudgeRecipe {
  name: string
  trigger: string
  messageTemplate: string
}

export interface AIConfig {
  mode: AIMode
  tone: "friendly" | "concise" | "enthusiastic"
  bannedPhrases: string[]
  escalateIf: string[]
  nudgeRecipes: NudgeRecipe[]
}







