import crypto from "crypto"

export function dedupeKey(
  hubId: string,
  recipeId: string,
  memberId: string,
  period: "week" | "day" = "week"
): string {
  // For week: use ISO week of year; for day: use date
  const bucket =
    period === "week"
      ? `${new Date().getFullYear()}-W${String(getWeekNumber(new Date())).padStart(2, "0")}`
      : new Date().toISOString().slice(0, 10)
  
  const key = `${hubId}:${recipeId}:${memberId}:${bucket}`
  return crypto.createHash("sha256").update(key).digest("hex")
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function renderTemplate(
  tpl: string,
  vars: Record<string, string | number | boolean | null | undefined>
): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""))
}

