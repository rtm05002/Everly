import { DashboardLayout } from "@/components/dashboard-layout"
import { Megaphone, Send } from "lucide-react"
import { AnnouncementComposer } from "./announcement-composer"

export default function AnnouncementsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Megaphone className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">Announcements</h1>
            <p className="text-muted-foreground">Send important updates to your community members</p>
          </div>
        </div>

        <AnnouncementComposer />
      </div>
    </DashboardLayout>
  )
}









