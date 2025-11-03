export const runtime = "nodejs"
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { env } from "@/lib/env"

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { searchParams } = new URL(req.url)
    
    const page = parseInt(searchParams.get('page') || '0')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')
    const search = searchParams.get('search')
    
    let query = supabase
      .from('nudge_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)
    
    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (channel) {
      query = query.eq('channel', channel)
    }
    if (search) {
      query = query.or(`member_name.ilike.%${search}%,recipe_name.ilike.%${search}%`)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('[admin:nudges] error fetching logs:', error)
      return NextResponse.json({ logs: [], hasMore: false }, { status: 500 })
    }
    
    const hasMore = (data || []).length === limit
    
    return NextResponse.json({ logs: data || [], hasMore })
  } catch (err) {
    console.error('[admin:nudges] exception:', err)
    return NextResponse.json({ logs: [], hasMore: false }, { status: 500 })
  }
}

