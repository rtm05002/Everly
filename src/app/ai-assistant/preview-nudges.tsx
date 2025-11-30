import { Eye } from "lucide-react"
import { Nudge } from "@/lib/nudges"

interface PreviewNudgesProps {
  nudges: Nudge[]
}

export function PreviewNudges({ nudges }: PreviewNudgesProps) {
  return (
    <div className="glass rounded-2xl p-6 border border-border/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Eye className="h-6 w-6" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Preview Nudges</h2>
          <p className="text-sm text-muted-foreground">
            Based on current configuration and member activity
          </p>
        </div>
      </div>

      {nudges.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No nudges would be sent based on current data</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-foreground">Member</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Reason</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Message</th>
              </tr>
            </thead>
            <tbody>
              {nudges.map((nudge, index) => (
                <tr key={index} className="border-b border-border/50">
                  <td className="py-3 px-4 text-sm font-medium text-foreground">
                    {nudge.memberId}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {nudge.reason}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {nudge.message}
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




