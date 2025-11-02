import { ChallengesClient } from "./challenges-client"
import type { Bounty } from "@/lib/types"

interface WidgetChallengesProps {
  hubId: string
  bounties: Bounty[]
}

export function WidgetChallenges({ hubId, bounties }: WidgetChallengesProps) {
  return <ChallengesClient bounties={bounties} hubId={hubId} />
}
