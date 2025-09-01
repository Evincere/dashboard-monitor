'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface User {
  username: string
  authorities: Array<{ authority: string }>
  loginTime: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  token: string | null
  login: (credentials: { username: string; password: string }) => Promise<boolean>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const checkSession = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/dashboard-monitor/api/auth/session')
      
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setToken(data.token)
      } else {
        setUser(null)
        setToken(null)
        // Only redirect if not already on login page
        if (pathname && pathname !== '/login' && !pathname.startsWith('/api/')) {
          router.push('/login')
        }
      }
    } catch (error) {
      console.error('Session check failed:', error)
      setUser(null)
      setToken(null)
      if (pathname && pathname !== '/login' && !pathname.startsWith('/api/')) {
        router.push('/login')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (credentials: { username: string; password: string }): Promise<boolean> => {
    try {
      const response = await fetch('/dashboard-monitor/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUser(data.user)
        await checkSession() // Get the token
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      await fetch('/dashboard-monitor/api/auth/logout', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      setUser(null)
      setToken(null)
      router.push('/login')
    }
  }

  useEffect(() => {
    checkSession()
  }, [pathname])

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      token,
      login,
      logout,
      checkSession
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
