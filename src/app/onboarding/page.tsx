import { DashboardLayout } from "@/components/dashboard-layout"
import { OnboardingFlowEditor } from "./flow-editor"
import { env } from "@/lib/env"

export default async function OnboardingPage() {
  if (!env.FEATURE_ONBOARDING) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full py-12">
          <h1 className="text-3xl font-semibold text-foreground mb-4">Onboarding Feature Disabled</h1>
          <p className="text-muted-foreground">
            Please enable the `FEATURE_ONBOARDING` environment variable to access this page.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">Onboarding Flows</h1>
          <p className="text-muted-foreground">Manage your community's onboarding experiences.</p>
        </div>

        <OnboardingFlowEditor />
      </div>
    </DashboardLayout>
  )
}

