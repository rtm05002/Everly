/**
 * Runtime environment variable validation helper
 * Checks for missing required environment variables without logging their values
 * 
 * Use this in server-side code only (API routes, server actions, etc.)
 * 
 * @param keys - Array of environment variable keys to check
 * @throws Error if any required keys are missing
 */
export function assertServerEnv(keys: string[]) {
  const missing = keys.filter((k) => !process.env[k])
  if (missing.length) {
    // Intentionally generic error; do not print values.
    throw new Error(
      `Missing required server environment variables: ${missing.join(", ")}`
    )
  }
}



