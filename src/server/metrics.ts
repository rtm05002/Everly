import { getSupabaseServer } from "@/lib/supabase-server"

/**
 * Record a metric in the system_metrics table
 * Fire-and-forget; never throws
 */
export async function recordMetric(key: string, value: any): Promise<void> {
  try {
    const supabase = getSupabaseServer()
    
    const { error } = await supabase
      .from('system_metrics')
      .upsert(
        {
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
    
    if (error) {
      console.error('[metrics] Failed to record metric:', key, error.message)
    }
  } catch (err) {
    console.error('[metrics] Exception recording metric:', key, err)
  }
}

/**
 * Read a metric from the system_metrics table
 * Returns null on any error
 */
export async function readMetric(key: string): Promise<any | null> {
  try {
    const supabase = getSupabaseServer()
    
    const { data, error } = await supabase
      .from('system_metrics')
      .select('value')
      .eq('key', key)
      .single()
    
    if (error) {
      // Not found is expected for new metrics
      if (error.code !== 'PGRST116') {
        console.error('[metrics] Failed to read metric:', key, error.message)
      }
      return null
    }
    
    return data?.value || null
  } catch (err) {
    console.error('[metrics] Exception reading metric:', key, err)
    return null
  }
}

/**
 * Read all metrics (for health check)
 */
export async function readAllMetrics(): Promise<Record<string, any>> {
  try {
    const supabase = getSupabaseServer()
    
    const { data, error } = await supabase
      .from('system_metrics')
      .select('key, value')
    
    if (error) {
      console.error('[metrics] Failed to read all metrics:', error.message)
      return {}
    }
    
    const result: Record<string, any> = {}
    for (const row of data || []) {
      result[row.key] = row.value
    }
    return result
  } catch (err) {
    console.error('[metrics] Exception reading all metrics:', err)
    return {}
  }
}

