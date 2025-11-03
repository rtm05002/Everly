import { getSupabaseServer } from "@/lib/supabase-server"
import type { NudgeLog } from "@/lib/nudge-types"

export const dynamic = 'force-dynamic'

async function getNudgeLogs(): Promise<NudgeLog[]> {
  try {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('nudge_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) {
      console.error('[admin:nudges] error fetching logs:', error)
      return []
    }
    
    return (data || []) as NudgeLog[]
  } catch (err) {
    console.error('[admin:nudges] exception:', err)
    return []
  }
}

export default async function AdminNudgeLogsPage() {
  const logs = await getNudgeLogs()
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nudge Logs</h1>
        <p className="text-muted-foreground mt-2">Recent nudge delivery attempts</p>
      </div>
      
      {logs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No logs yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Recipe</th>
                <th className="text-left p-2">Member</th>
                <th className="text-left p-2">Channel</th>
                <th className="text-left p-2">Attempts</th>
                <th className="text-left p-2">Scheduled</th>
                <th className="text-left p-2">Sent</th>
                <th className="text-left p-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-muted/50">
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      log.status === 'sent' ? 'bg-green-100 text-green-800' :
                      log.status === 'failed' ? 'bg-red-100 text-red-800' :
                      log.status === 'queued' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-2 font-mono text-sm">{log.recipe_name}</td>
                  <td className="p-2 font-mono text-sm">{log.member_id.slice(0, 8)}...</td>
                  <td className="p-2 font-mono text-xs">{log.channel}</td>
                  <td className="p-2">{log.attempt}</td>
                  <td className="p-2 text-xs">
                    {log.scheduled_at ? new Date(log.scheduled_at).toLocaleString() : '-'}
                  </td>
                  <td className="p-2 text-xs">
                    {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                  </td>
                  <td className="p-2 text-xs text-red-600 max-w-xs truncate">
                    {log.error || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

