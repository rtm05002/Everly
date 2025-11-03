export const runtime = "nodejs"
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { env } from "@/lib/env"

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { searchParams } = new URL(req.url)
    
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')
    const recipe = searchParams.get('recipe')
    const q = searchParams.get('q') || searchParams.get('search') // support both params
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    
    let query = supabase
      .from('nudge_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (channel) {
      query = query.eq('channel', channel)
    }
    if (recipe) {
      query = query.eq('recipe_id', recipe)
    }
    if (q) {
      query = query.or(`member_name.ilike.%${q}%,message_preview.ilike.%${q}%`)
    }
    
    // Cursor-based pagination
    if (cursor) {
      query = query.lt('created_at', cursor)
    }
    
    const { data, error } = await query.limit(limit)
    
    if (error) {
      console.error('[admin:nudges] error fetching logs:', error)
      return NextResponse.json({ items: [], nextCursor: null }, { status: 500 })
    }
    
    const items = (data || [])
    const nextCursor = items.length > 0 ? items[items.length - 1].created_at : null
    
    return NextResponse.json({ items, nextCursor })
  } catch (err) {
    console.error('[admin:nudges] exception:', err)
    return NextResponse.json({ items: [], nextCursor: null }, { status: 500 })
  }
}

