import { promises as fs } from 'fs'
import { join } from 'path'

const DATA_DIR = './data'

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

export async function read<T>(key: string): Promise<T | null> {
  try {
    await ensureDataDir()
    const filePath = join(DATA_DIR, `${key}.json`)
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // File doesn't exist or can't be read
    return null
  }
}

export async function write<T>(key: string, value: T): Promise<void> {
  await ensureDataDir()
  const filePath = join(DATA_DIR, `${key}.json`)
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8')
}











