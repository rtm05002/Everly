/**
 * Mock Whop adapter for testing without real credentials
 * Returns deterministic test data
 */

import type { WhopProduct, WhopMember, WhopSubscription } from "@/lib/whop-types"

export function getMockProducts(hubId: string): WhopProduct[] {
  return [
    {
      id: `prod_mock_1`,
      name: "Premium Membership",
      description: "Access to exclusive content and features. Join thousands of satisfied members in our premium community.",
      url: `https://whop.com/${hubId}/products/premium`,
      price: 29.99,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-12-01T00:00:00Z",
    },
    {
      id: `prod_mock_2`,
      name: "Pro Annual",
      description: "Full access to all features with annual billing. Best value for committed members. Includes priority support and early access to new features.",
      url: `https://whop.com/${hubId}/products/pro-annual`,
      price: 299.99,
      created_at: "2024-01-15T00:00:00Z",
      updated_at: "2024-11-15T00:00:00Z",
    },
  ]
}

export function getMockMembers(hubId: string): WhopMember[] {
  const names = ["Alice", "Bob", "Charlie", "Diana", "Eve"]
  
  return names.map((name, idx) => ({
    id: `member_mock_${idx + 1}`,
    user: {
      id: `user_mock_${idx + 1}`,
      username: name.toLowerCase(),
      email: `${name.toLowerCase()}@example.com`,
    },
    tier: {
      name: idx < 2 ? "Pro Annual" : "Premium Membership",
    },
    created_at: `2024-${String(idx + 1).padStart(2, '0')}-01T00:00:00Z`,
    updated_at: `2024-${String(idx + 1).padStart(2, '0')}-15T00:00:00Z`,
    last_active_at: `2024-12-${String(idx + 1).padStart(2, '0')}T00:00:00Z`,
  }))
}

export function getMockSubscriptions(hubId: string): WhopSubscription[] {
  return [
    {
      id: "sub_mock_1",
      member_id: "member_mock_1",
      product_id: "prod_mock_2",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-12-01T00:00:00Z",
    },
    {
      id: "sub_mock_2",
      member_id: "member_mock_2",
      product_id: "prod_mock_2",
      status: "active",
      created_at: "2024-02-01T00:00:00Z",
      updated_at: "2024-12-02T00:00:00Z",
    },
    {
      id: "sub_mock_3",
      member_id: "member_mock_3",
      product_id: "prod_mock_1",
      status: "canceled",
      created_at: "2024-03-01T00:00:00Z",
      updated_at: "2024-06-01T00:00:00Z",
    },
  ]
}

