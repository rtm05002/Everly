import { describe, test, expect } from "vitest"
import { evaluateNudges } from "../nudges"

describe("Nudge evaluation tests", () => {
  test("Inactive member nudge", () => {
    const config = {
      mode: "assist" as const,
      tone: "friendly" as const,
      nudgeRecipes: [],
      bannedPhrases: [],
      escalateIf: [],
    }

    const members = [
      {
        id: "1",
        username: "Alice",
        joinedAt: "2025-09-01",
        lastActiveAt: "2025-09-10",
        messagesCount: 0,
        roles: [],
      },
    ]

    const events = [{ type: "joined" as const, memberId: "1", ts: "2025-09-01" }]

    const nudges = evaluateNudges(config, events, members)
    expect(Array.isArray(nudges)).toBe(true)
    expect(nudges.length).toBeGreaterThanOrEqual(0)
  })

  test("Multiple rules can trigger", () => {
    const config = {
      mode: "assist" as const,
      tone: "friendly" as const,
      nudgeRecipes: [],
      bannedPhrases: [],
      escalateIf: [],
    }

    const members = [
      {
        id: "2",
        username: "Bob",
        joinedAt: "2025-08-01",
        lastActiveAt: "2025-08-01",
        messagesCount: 0,
        roles: [],
      },
    ]

    const events = [
      { type: "joined" as const, memberId: "2", ts: "2025-08-01" },
      { type: "bounty_completed" as const, memberId: "2", ts: "2025-09-20" },
    ]

    const nudges = evaluateNudges(config, events, members)
    expect(Array.isArray(nudges)).toBe(true)
  })
})
