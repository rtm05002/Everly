import OpenAI from 'openai'

const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'

/**
 * Generate embeddings for a batch of texts
 * Returns null if OPENAI_API_KEY is not set (caller should mark needs_embedding=true)
 */
export async function embedBatch(texts: string[]): Promise<number[][] | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return null // Caller sets needs_embedding=true
  }

  try {
    const client = new OpenAI({ apiKey: key })

    // API accepts up to ~2048 inputs but keep small for safety
    const res = await client.embeddings.create({
      model,
      input: texts,
    })

    return res.data.map((d) => d.embedding as number[])
  } catch (err) {
    console.error('[Embed] Error generating embeddings:', err)
    return null
  }
}

