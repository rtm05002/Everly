import { createHmac } from 'crypto'

interface JWTPayload {
  aud: string
  iss: string
  sub: string
  role: string
  hub_id: string
  member_id: string
  exp: number
  iat: number
}

export function signJWT(payload: Omit<JWTPayload, 'exp' | 'iat'>, secret: string, expiresInMinutes = 10): string {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (expiresInMinutes * 60)
  
  const jwtPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp
  }

  // Create header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload))

  // Create signature
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export function verifyJWT(token: string, secret: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const [encodedHeader, encodedPayload, signature] = parts

    // Verify signature
    const expectedSignature = createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url')

    if (signature !== expectedSignature) {
      return null
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload))

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null
    }

    return payload
  } catch (error) {
    return null
  }
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64UrlDecode(str: string): string {
  // Add padding back
  const padded = str + '='.repeat((4 - str.length % 4) % 4)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  
  return Buffer.from(padded, 'base64').toString('utf8')
}
