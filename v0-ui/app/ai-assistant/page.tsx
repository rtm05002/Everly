import { DashboardLayout } from "@/components/dashboard-layout"
import { Sparkles, Zap, MessageSquare, TrendingUp } from "lucide-react"

export default function AIAssistantPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">AI Assistant</h1>
          <p className="text-muted-foreground">Intelligent insights and automated engagement tools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6 border border-border/50 card-hover">
            <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit mb-4">
              <Sparkles className="h-6 w-6" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Responses</h3>
            <p className="text-sm text-muted-foreground mb-4">
              AI-powered response suggestions for common member questions
            </p>
            <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Configure →
            </button>
          </div>

          <div className="glass rounded-2xl p-6 border border-border/50 card-hover">
            <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit mb-4">
              <Zap className="h-6 w-6" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Auto-Moderation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Automatically detect and handle spam or inappropriate content
            </p>
            <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Configure →
            </button>
          </div>

          <div className="glass rounded-2xl p-6 border border-border/50 card-hover">
            <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit mb-4">
              <MessageSquare className="h-6 w-6" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Engagement Prompts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Automated conversation starters to boost community activity
            </p>
            <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Configure →
            </button>
          </div>

          <div className="glass rounded-2xl p-6 border border-border/50 card-hover">
            <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit mb-4">
              <TrendingUp className="h-6 w-6" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Predictive Analytics</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Forecast engagement trends and identify at-risk members
            </p>
            <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Configure →
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
