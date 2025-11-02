import type { ZodError } from "zod"

export function flattenZod(e: ZodError) {
  const { formErrors, fieldErrors } = e.flatten()
  return [...formErrors, ...Object.values(fieldErrors).flat().filter(Boolean) as string[]]
}

