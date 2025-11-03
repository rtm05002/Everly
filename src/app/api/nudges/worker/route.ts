export const runtime = "nodejs"
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { tryDequeue, markSuccess, markFailure, getLogForQueue } from "@/server/nudges/db"
import { deliverOne } from "@/server/nudges/deliver"
import { env } from "@/lib/env"

export async function POST(req: NextRequest) {
  // Check if nudges are enabled
  if (env.NUDGES_ENABLED !== 'true') {
    return new NextResponse(JSON.stringify({ error: 'nudges_disabled' }), { 
      status: 503,
      headers: { 'content-type': 'application/json' }
    })
  }

  // Check worker secret
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  const expectedSecret = env.WORKER_SECRET
  
  if (!expectedSecret || token !== expectedSecret) {
    return new NextResponse(JSON.stringify({ error: 'unauthorized' }), { 
      status: 401,
      headers: { 'content-type': 'application/json' }
    })
  }

  try {
    const maxRetries = parseInt(env.NUDGE_MAX_RETRIES || '3')
    const workerId = crypto.randomUUID()
    
    // Dequeue a batch of nudges
    const batch = await tryDequeue(20, workerId)
    const taken = batch.length
    
    let sent = 0
    let failed = 0
    let requeued = 0
    
    // Process each nudge
    for (const job of batch) {
      try {
        // Get corresponding log entry
        const logEntry = await getLogForQueue(job.id)
        
        // Deliver the nudge
        const result = await deliverOne(job)
        
        if (result.success) {
          await markSuccess(job.id, logEntry?.id)
          sent++
        } else {
          await markFailure(job.id, logEntry?.id, result.error || 'unknown error', maxRetries, job.attempt)
          
          if (job.attempt + 1 >= maxRetries) {
            failed++
          } else {
            requeued++
          }
        }
      } catch (err) {
        console.error('[nudge:worker] error processing job:', err)
        
        // Mark as failed on exception
        const logEntry = await getLogForQueue(job.id)
        await markFailure(job.id, logEntry?.id, String(err), maxRetries, job.attempt)
        failed++
      }
    }
    
    return new NextResponse(JSON.stringify({
      ok: true,
      taken,
      sent,
      failed,
      requeued,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  } catch (err) {
    console.error('[nudge:worker] exception:', err)
    return new NextResponse(JSON.stringify({ error: 'internal_error' }), { 
      status: 500,
      headers: { 'content-type': 'application/json' }
    })
  }
}

