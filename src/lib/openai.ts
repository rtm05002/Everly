import OpenAI from "openai"
import { env } from "./env"

// Fail fast if API key is missing
if (!env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set")
}

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  ...(env.OPENAI_PROJECT ? { project: env.OPENAI_PROJECT } : {}),
})

/**
 * Generate embeddings for a list of texts
 * Uses text-embedding-3-small: good quality, fast, inexpensive
 */
export async function embed(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  })
  return res.data.map((d) => d.embedding)
}

/**
 * Chat completion helper with sensible defaults
 */
export async function chat(messages: OpenAI.Chat.ChatCompletionMessageParam[], options?: {
  model?: string
  temperature?: number
  max_tokens?: number
}): Promise<string> {
  const res = await openai.chat.completions.create({
    model: options?.model || "gpt-4o-mini",
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.max_tokens,
  })
  
  const content = res.choices[0]?.message?.content
  if (!content) {
    throw new Error("OpenAI returned empty response")
  }
  
  return content
}

