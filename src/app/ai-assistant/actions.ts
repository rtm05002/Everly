"use server"

import { createServiceClient } from "@/server/db"
import { env } from "@/lib/env"
import { AIConfig } from "@/lib/types"
import { revalidatePath } from "next/cache"

const DEFAULT_AI_CONFIG: AIConfig = {
  mode: "assist",
  tone: "friendly",
  bannedPhrases: ["spam", "hate speech", "harassment"],
  escalateIf: ["threats", "illegal content", "repeated violations"],
  nudgeRecipes: [
    {
      name: "Welcome New Members",
      trigger: "new_member_joined",
      messageTemplate: "Welcome to the community! We're excited to have you here. Check out our bounties to get started earning rewards!"
    },
    {
      name: "Encourage Participation",
      trigger: "low_activity",
      messageTemplate: "We'd love to see more engagement from you! Consider participating in our active bounties."
    }
  ]
}

export async function loadAIConfig(): Promise<AIConfig> {
  try {
    // Check if Supabase is configured
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) {
      console.log("Supabase not configured, using default AI config")
      return DEFAULT_AI_CONFIG
    }

    const supabase = createServiceClient()
    const hubId = env.DEMO_HUB_ID

    if (!hubId) {
      return DEFAULT_AI_CONFIG
    }

    const { data, error } = await supabase
      .from("hubs")
      .select("settings")
      .eq("id", hubId)
      .single()

    if (error) {
      console.error("Error loading AI config:", error)
      return DEFAULT_AI_CONFIG
    }

    const settings = data?.settings || {}
    const aiConfig = settings.ai_config

    if (!aiConfig) {
      return DEFAULT_AI_CONFIG
    }

    // Merge with defaults to ensure all fields are present
    return {
      mode: aiConfig.mode || DEFAULT_AI_CONFIG.mode,
      tone: aiConfig.tone || DEFAULT_AI_CONFIG.tone,
      bannedPhrases: aiConfig.bannedPhrases || DEFAULT_AI_CONFIG.bannedPhrases,
      escalateIf: aiConfig.escalateIf || DEFAULT_AI_CONFIG.escalateIf,
      nudgeRecipes: aiConfig.nudgeRecipes || DEFAULT_AI_CONFIG.nudgeRecipes
    }
  } catch (error) {
    console.error("Error loading AI config:", error)
    return DEFAULT_AI_CONFIG
  }
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  try {
    // Check if Supabase is configured
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) {
      console.log("Supabase not configured, AI config not saved")
      return
    }

    const supabase = createServiceClient()
    const hubId = env.DEMO_HUB_ID

    if (!hubId) {
      throw new Error("DEMO_HUB_ID not configured")
    }

    // First, get current settings
    const { data: currentData, error: fetchError } = await supabase
      .from("hubs")
      .select("settings")
      .eq("id", hubId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch current settings: ${fetchError.message}`)
    }

    // Merge with existing settings
    const currentSettings = currentData?.settings || {}
    const updatedSettings = {
      ...currentSettings,
      ai_config: config
    }

    // Update the hub with merged settings
    const { error: updateError } = await supabase
      .from("hubs")
      .update({ settings: updatedSettings })
      .eq("id", hubId)

    if (updateError) {
      throw new Error(`Failed to save AI config: ${updateError.message}`)
    }

    revalidatePath("/ai-assistant")
  } catch (error) {
    console.error("Error saving AI config:", error)
    throw error
  }
}