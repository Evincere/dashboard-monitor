'use client'

import { useAuth } from '@/lib/auth-context'
import { useCallback } from 'react'

export function useAuthenticatedFetch() {
  const { token, logout } = useAuth()

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const defaultOptions: RequestInit = {
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    // Add Authorization header if we have a token
    if (token) {
      defaultOptions.headers = {
        ...defaultOptions.headers,
        'Authorization': `Bearer ${token}`,
      }
    }

    try {
      const response = await fetch(url, defaultOptions)
      
      // If we get 401, the session might be expired
      if (response.status === 401) {
        console.log('🔓 Session expired, logging out...')
        logout()
        throw new Error('Authentication required')
      }
      
      return response
    } catch (error) {
      // If it's a network error and we have auth issues, logout
      if (error instanceof Error && error.message.includes('Authentication')) {
        logout()
      }
      throw error
    }
  }, [token, logout])

  return authFetch
}

// Alternative hook that returns the response data directly
export function useAuthenticatedApi() {
  const authFetch = useAuthenticatedFetch()

  const api = useCallback(async (url: string, options: RequestInit = {}) => {
    const response = await authFetch(url, options)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }
    
    return response.json()
  }, [authFetch])

  return api
}

// Export authFetch for backward compatibility
export const authFetch = useAuthenticatedFetch
