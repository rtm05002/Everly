"use client"

import { useState } from "react"
import { Play, CheckCircle } from "lucide-react"
import { runNudges } from "./run-nudges-action"

export function RunNudgesButton() {
  const [isRunning, setIsRunning] = useState(false)
  const [lastResult, setLastResult] = useState<{ nudgesSent: number; timestamp: string } | null>(null)

  const handleRunNudges = async () => {
    setIsRunning(true)
    setLastResult(null)
    
    try {
      const result = await runNudges()
      setLastResult(result)
    } catch (error) {
      console.error('Failed to run nudges:', error)
      alert("Failed to run nudges")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-6 border border-border/50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Run Nudges</h3>
          <p className="text-sm text-muted-foreground">
            Execute nudges based on current configuration and member activity
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <button
            onClick={handleRunNudges}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Nudges Now
              </>
            )}
          </button>
          
          {lastResult && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle className="h-4 w-4" />
              <span>{lastResult.nudgesSent} nudges sent</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}






