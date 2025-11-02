/**
 * Whop API Client Wrapper
 * 
 * Provides a configured Whop API client instance with helper functions
 * for common operations. The client is initialized lazily to avoid build-time errors.
 */

let whopClient: any = null
let initializationError: Error | null = null

/**
 * Initialize and return a Whop API client instance
 * @returns Configured Whop client or null if initialization fails
 */
export function getWhopClient(): any | null {
  // Return cached client if available
  if (whopClient) {
    return whopClient
  }

  // Return null if we've already tried and failed
  if (initializationError) {
    return null
  }

  try {
    const apiKey = process.env.WHOP_API_KEY

    if (!apiKey) {
      console.warn(
        "[Whop Client] WHOP_API_KEY environment variable is not set. Whop API features will be disabled."
      )
      initializationError = new Error("WHOP_API_KEY not configured")
      return null
    }

    // Try to use @whop/sdk (which is installed in package.json)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Whop } = require("@whop/sdk")
      whopClient = new Whop({
        apiKey,
      })
      return whopClient
    } catch (sdkError: any) {
      console.warn(
        "[Whop Client] Failed to initialize Whop SDK. Make sure @whop/sdk is installed."
      )
      console.warn("[Whop Client] SDK error:", sdkError?.message)
      initializationError = new Error(
        `Whop SDK initialization failed: ${sdkError?.message || "Unknown error"}`
      )
      return null
    }
  } catch (error: any) {
    console.error("[Whop Client] Initialization error:", error.message)
    initializationError = error
    return null
  }
}

/**
 * Check if Whop client is available
 */
export function isWhopAvailable(): boolean {
  return getWhopClient() !== null
}

/**
 * List members for a company
 * @param companyId - The Whop company ID
 * @returns Array of members or empty array on error
 */
export async function listMembers(companyId: string): Promise<any[]> {
  const client = getWhopClient()
  if (!client) {
    console.warn("[Whop] Cannot list members: Client not available")
    return []
  }

  try {
    // Adjust method name based on actual SDK API
    if (client.members?.list) {
      const response = await client.members.list({ companyId })
      return response?.data || response || []
    } else if (client.listMembers) {
      return await client.listMembers(companyId)
    } else if (client.getMembers) {
      const response = await client.getMembers(companyId)
      return Array.isArray(response) ? response : response?.data || []
    } else {
      console.warn("[Whop] listMembers method not found on client")
      return []
    }
  } catch (error: any) {
    console.error("[Whop] Error listing members:", error.message)
    return []
  }
}

/**
 * List products for a company
 * @param companyId - The Whop company ID
 * @returns Array of products or empty array on error
 */
export async function listProducts(companyId: string): Promise<any[]> {
  const client = getWhopClient()
  if (!client) {
    console.warn("[Whop] Cannot list products: Client not available")
    return []
  }

  try {
    // Adjust method name based on actual SDK API
    if (client.products?.list) {
      const response = await client.products.list({ companyId })
      return response?.data || response || []
    } else if (client.listProducts) {
      return await client.listProducts(companyId)
    } else if (client.getProducts) {
      const response = await client.getProducts(companyId)
      return Array.isArray(response) ? response : response?.data || []
    } else {
      console.warn("[Whop] listProducts method not found on client")
      return []
    }
  } catch (error: any) {
    console.error("[Whop] Error listing products:", error.message)
    return []
  }
}

/**
 * List webhooks
 * @returns Array of webhooks or empty array on error
 */
export async function listWebhooks(): Promise<any[]> {
  const client = getWhopClient()
  if (!client) {
    console.warn("[Whop] Cannot list webhooks: Client not available")
    return []
  }

  try {
    // Adjust method name based on actual SDK API
    if (client.webhooks?.list) {
      const response = await client.webhooks.list()
      return response?.data || response || []
    } else if (client.listWebhooks) {
      return await client.listWebhooks()
    } else if (client.getWebhooks) {
      const response = await client.getWebhooks()
      return Array.isArray(response) ? response : response?.data || []
    } else {
      console.warn("[Whop] listWebhooks method not found on client")
      return []
    }
  } catch (error: any) {
    console.error("[Whop] Error listing webhooks:", error.message)
    return []
  }
}

