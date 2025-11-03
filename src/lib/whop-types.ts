/**
 * Whop API types (minimal, only what we use)
 */

export interface WhopProduct {
  id: string
  name: string
  description?: string
  url?: string
  price?: number
  created_at?: string
  updated_at?: string
}

export interface WhopMember {
  id: string
  user?: {
    id: string
    username?: string
    email?: string
  }
  tier?: {
    name: string
  }
  created_at?: string
  updated_at?: string
  last_active_at?: string
}

export interface WhopSubscription {
  id: string
  member_id: string
  product_id?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export interface WhopWebhookEvent {
  id: string
  type: string
  created_at?: string
  data?: any
}

