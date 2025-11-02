"use server"

import { getSupabaseServer } from "@/lib/supabase-server"
import { EnhancedNudgeRecipe } from "@/lib/types"
import { revalidatePath } from "next/cache"
import { env } from "@/lib/env"

/**
 * Load all nudge recipes for a hub
 */
export async function loadNudgeRecipes(hubId: string): Promise<EnhancedNudgeRecipe[]> {
  try {
    // Check if Supabase is configured
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) {
      console.log("Supabase not configured, returning empty nudge recipes")
      return []
    }
    
    const supa = getSupabaseServer()
    
    const { data, error } = await supa
      .from("nudge_recipes")
      .select("*")
      .eq("hub_id", hubId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading nudge recipes:", error)
      return []
    }

    return (data || []).map(recipe => ({
      id: recipe.id,
      hub_id: recipe.hub_id,
      name: recipe.name,
      trigger: recipe.trigger,
      targeting: recipe.targeting,
      message_template: recipe.message_template,
      channel: recipe.channel,
      frequency: recipe.frequency,
      dnd: recipe.dnd,
      enabled: recipe.enabled,
      created_at: recipe.created_at,
      updated_at: recipe.updated_at
    }))
  } catch (error) {
    console.error("Failed to load nudge recipes:", error)
    return []
  }
}

/**
 * Save a nudge recipe (create or update)
 */
export async function saveNudgeRecipe(hubId: string, recipe: EnhancedNudgeRecipe): Promise<EnhancedNudgeRecipe | null> {
  try {
    // Check if Supabase is configured
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) {
      console.log("Supabase not configured, cannot save nudge recipe")
      return null
    }
    
    const supa = getSupabaseServer()
    
    if (recipe.id && recipe.created_at) {
      // Update existing recipe
      const { data, error } = await supa
        .from("nudge_recipes")
        .update({
          name: recipe.name,
          trigger: recipe.trigger,
          targeting: recipe.targeting,
          message_template: recipe.message_template,
          channel: recipe.channel,
          frequency: recipe.frequency,
          dnd: recipe.dnd,
          enabled: recipe.enabled,
          updated_at: new Date().toISOString()
        })
        .eq("id", recipe.id)
        .eq("hub_id", hubId)
        .select()
        .single()

      if (error) {
        console.error("Error updating recipe:", error)
        return null
      }

      revalidatePath("/ai-assistant")
      return data as EnhancedNudgeRecipe
    } else {
      // Create new recipe
      const { data, error } = await supa
        .from("nudge_recipes")
        .insert({
          hub_id: hubId,
          name: recipe.name,
          trigger: recipe.trigger,
          targeting: recipe.targeting,
          message_template: recipe.message_template,
          channel: recipe.channel,
          frequency: recipe.frequency,
          dnd: recipe.dnd,
          enabled: recipe.enabled
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating recipe:", error)
        return null
      }

      revalidatePath("/ai-assistant")
      return data as EnhancedNudgeRecipe
    }
  } catch (error) {
    console.error("Failed to save nudge recipe:", error)
    return null
  }
}

/**
 * Delete a nudge recipe
 */
export async function deleteNudgeRecipe(hubId: string, recipeId: string): Promise<boolean> {
  try {
    // Check if Supabase is configured
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) {
      console.log("Supabase not configured, cannot delete nudge recipe")
      return false
    }
    
    const supa = getSupabaseServer()
    
    const { error } = await supa
      .from("nudge_recipes")
      .delete()
      .eq("id", recipeId)
      .eq("hub_id", hubId)

    if (error) {
      console.error("Error deleting recipe:", error)
      return false
    }

    revalidatePath("/ai-assistant")
    return true
  } catch (error) {
    console.error("Failed to delete nudge recipe:", error)
    return false
  }
}

/**
 * Toggle recipe enabled/disabled
 */
export async function toggleNudgeRecipe(hubId: string, recipeId: string, enabled: boolean): Promise<boolean> {
  try {
    // Check if Supabase is configured
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) {
      console.log("Supabase not configured, cannot toggle nudge recipe")
      return false
    }
    
    const supa = getSupabaseServer()
    
    const { error } = await supa
      .from("nudge_recipes")
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq("id", recipeId)
      .eq("hub_id", hubId)

    if (error) {
      console.error("Error toggling recipe:", error)
      return false
    }

    revalidatePath("/ai-assistant")
    return true
  } catch (error) {
    console.error("Failed to toggle nudge recipe:", error)
    return false
  }
}

/**
 * Load recent nudge runs for a hub
 */
export async function loadNudgeRuns(hubId: string, limit: number = 10) {
  try {
    // Check if Supabase is configured
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) {
      console.log("Supabase not configured, returning empty nudge runs")
      return []
    }
    
    const supa = getSupabaseServer()
    
    const { data, error } = await supa
      .from("nudge_runs")
      .select(`
        id,
        status,
        targeted_count,
        sent_count,
        error_count,
        started_at,
        finished_at,
        recipe_id,
        nudge_recipes!inner(name)
      `)
      .eq("hub_id", hubId)
      .order("started_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error loading nudge runs:", error)
      return []
    }

    return (data || []).map(run => {
      const startTime = new Date(run.started_at)
      const now = new Date()
      const diffMs = now.getTime() - startTime.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      
      let timeStr = ""
      if (diffHours < 1) {
        timeStr = "just now"
      } else if (diffHours < 24) {
        timeStr = `${diffHours}h ago`
      } else {
        const diffDays = Math.floor(diffHours / 24)
        timeStr = `${diffDays}d ago`
      }

      return {
        id: run.id,
        time: timeStr,
        recipe: (run.nudge_recipes as any)?.name || "Unknown",
        targeted: run.targeted_count || 0,
        sent: run.sent_count || 0,
        errors: run.error_count || 0,
        status: run.status as "completed" | "running" | "failed"
      }
    })
  } catch (error) {
    console.error("Failed to load nudge runs:", error)
    return []
  }
}

/**
 * Send a test nudge to the creator
 */
export async function testNudgeSend(hubId: string, recipe: EnhancedNudgeRecipe): Promise<boolean> {
  try {
    // This would actually send a DM to the creator via Whop or another channel
    // For now, just log it
    console.log("Test send requested:", {
      hubId,
      recipeId: recipe.id,
      message: recipe.message_template
    })
    
    // TODO: Implement actual test send
    return true
  } catch (error) {
    console.error("Failed to send test nudge:", error)
    return false
  }
}

