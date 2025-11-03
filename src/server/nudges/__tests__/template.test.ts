import { describe, it, expect } from 'vitest'
import { renderTemplate, computeMessageHash } from '../template'

describe('renderTemplate', () => {
  it('should render simple variables', () => {
    const result = renderTemplate('Hello {{name}}', { name: 'Alice' })
    expect(result).toBe('Hello Alice')
  })

  it('should render multiple variables', () => {
    const result = renderTemplate('{{greeting}}, {{name}}! You have {{count}} messages.', {
      greeting: 'Hi',
      name: 'Bob',
      count: 5,
    })
    expect(result).toBe('Hi, Bob! You have 5 messages.')
  })

  it('should replace missing variables with empty string', () => {
    const result = renderTemplate('Hello {{name}}, you have {{count}} items', { name: 'Charlie' })
    expect(result).toBe('Hello Charlie, you have  items')
  })

  it('should handle no variables', () => {
    const result = renderTemplate('Static message', {})
    expect(result).toBe('Static message')
  })

  it('should handle numbers', () => {
    const result = renderTemplate('Count: {{count}}', { count: 42 })
    expect(result).toBe('Count: 42')
  })
})

describe('computeMessageHash', () => {
  it('should produce consistent hashes for same input', () => {
    const hash1 = computeMessageHash('Hello {{name}}', { name: 'Alice' }, 'recipe1')
    const hash2 = computeMessageHash('Hello {{name}}', { name: 'Alice' }, 'recipe1')
    expect(hash1).toBe(hash2)
  })

  it('should produce different hashes for different messages', () => {
    const hash1 = computeMessageHash('Hello {{name}}', { name: 'Alice' }, 'recipe1')
    const hash2 = computeMessageHash('Hi {{name}}', { name: 'Alice' }, 'recipe1')
    expect(hash1).not.toBe(hash2)
  })

  it('should produce different hashes for different variables', () => {
    const hash1 = computeMessageHash('Hello {{name}}', { name: 'Alice' }, 'recipe1')
    const hash2 = computeMessageHash('Hello {{name}}', { name: 'Bob' }, 'recipe1')
    expect(hash1).not.toBe(hash2)
  })

  it('should produce different hashes for different recipes', () => {
    const hash1 = computeMessageHash('Hello {{name}}', { name: 'Alice' }, 'recipe1')
    const hash2 = computeMessageHash('Hello {{name}}', { name: 'Alice' }, 'recipe2')
    expect(hash1).not.toBe(hash2)
  })
})

