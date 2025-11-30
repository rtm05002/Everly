import { ApiResponse, ApiError } from './types'

class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

interface RequestOptions extends RequestInit {
  timeout?: number
}

const DEFAULT_TIMEOUT = 10000 // 10 seconds

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiError
    try {
      errorData = await response.json()
    } catch {
      errorData = {
        message: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status
      }
    }
    
    throw new HttpError(
      errorData.message || 'Request failed',
      response.status,
      errorData.code,
      errorData.details
    )
  }

  try {
    return await response.json()
  } catch (error) {
    throw new HttpError(
      'Failed to parse response as JSON',
      response.status,
      'PARSE_ERROR'
    )
  }
}

export async function apiGet<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      signal: controller.signal,
      ...fetchOptions,
    })

    clearTimeout(timeoutId)
    return await handleResponse<T>(response)
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof HttpError) {
      throw error
    }
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError('Request timeout', 408, 'TIMEOUT')
    }
    
    throw new HttpError(
      error instanceof Error ? error.message : 'Network error',
      0,
      'NETWORK_ERROR'
    )
  }
}

export async function apiPost<T>(
  url: string,
  data?: any,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
      ...fetchOptions,
    })

    clearTimeout(timeoutId)
    return await handleResponse<T>(response)
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof HttpError) {
      throw error
    }
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError('Request timeout', 408, 'TIMEOUT')
    }
    
    throw new HttpError(
      error instanceof Error ? error.message : 'Network error',
      0,
      'NETWORK_ERROR'
    )
  }
}

export async function apiPut<T>(
  url: string,
  data?: any,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
      ...fetchOptions,
    })

    clearTimeout(timeoutId)
    return await handleResponse<T>(response)
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof HttpError) {
      throw error
    }
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError('Request timeout', 408, 'TIMEOUT')
    }
    
    throw new HttpError(
      error instanceof Error ? error.message : 'Network error',
      0,
      'NETWORK_ERROR'
    )
  }
}

export async function apiDelete<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      signal: controller.signal,
      ...fetchOptions,
    })

    clearTimeout(timeoutId)
    return await handleResponse<T>(response)
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof HttpError) {
      throw error
    }
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError('Request timeout', 408, 'TIMEOUT')
    }
    
    throw new HttpError(
      error instanceof Error ? error.message : 'Network error',
      0,
      'NETWORK_ERROR'
    )
  }
}

// Export the custom error class for external use
export { HttpError }




