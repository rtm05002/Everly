import { Suspense } from 'react'
import type { NudgeLog } from '@/lib/nudge-types'
import { getSupabaseServer } from '@/lib/supabase-server'
import { NudgeLogsClient } from '@/components/admin/nudge-logs-client'

async function getInitialLogs(): Promise<NudgeLog[]> {
  try {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('nudge_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) {
      console.error('[nudge logs] error:', error)
      return []
    }
    
    return (data as NudgeLog[]) || []
  } catch (err) {
    console.error('[nudge logs] exception:', err)
    return []
  }
}

export default async function Page() {
  const logs = await getInitialLogs()
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nudge Delivery Logs</h1>
        <p className="text-muted-foreground mt-2">Track all nudge delivery attempts</p>
      </div>

      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <NudgeLogsClient initial={logs} />
      </Suspense>
    </div>
  )
}
