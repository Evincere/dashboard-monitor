import { cookies } from 'next/headers'
import { ApiResponse, PagedResponse, BackendDocument, BackendInscription, BackendUser } from './backend-client'

class SessionBackendClient {
  private config = {
    apiUrl: process.env.BACKEND_API_URL || 'http://localhost:8080/api',
  }

  private async getSessionToken(): Promise<string | null> {
    try {
      // Get cookies from server-side context instead of making a fetch call
      const cookieStore = await cookies()
      const sessionCookie = cookieStore.get('dashboard-session')
      
      if (!sessionCookie) {
        console.log('❌ No dashboard-session cookie found')
        return null
      }
      
      const sessionData = JSON.parse(sessionCookie.value)
      
      // Check if session is expired (24 hours)
      const loginTime = new Date(sessionData.loginTime)
      const expiryTime = new Date(loginTime.getTime() + (24 * 60 * 60 * 1000))
      
      if (new Date() > expiryTime) {
        console.log('❌ Session expired')
        return null
      }
      
      if (sessionData.token) {
        console.log('✅ Valid session token found')
        return sessionData.token
      }
      
      return null
    } catch (error) {
      console.error('❌ Error getting session token:', error)
      return null
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = await this.getSessionToken()
    
    if (!token) {
      console.error('❌ No valid session token found');
      return { success: false, error: 'Error de autenticación', message: 'Se requiere autenticación para acceder a este recurso', status: 401 }
    }

    // Asegurar que headers exista
    if (!options.headers) {
      options.headers = {};
    }

    // Asegurar que el token se envíe en cada petición
    Object.assign(options.headers, {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    try {
      console.log(`📡 SessionBackendClient request: ${options.method || 'GET'} ${endpoint}`)
      
      const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      })

      if (!response.ok) {
        console.error(`❌ Backend request failed: ${response.status} ${response.statusText}`)
        return { success: false, error: `API error: ${response.status}` }
      }

      const data = await response.json()
      console.log('✅ SessionBackendClient request successful')
      return { success: true, data, timestamp: new Date().toISOString() }

    } catch (error) {
      console.error('❌ SessionBackendClient request error:', error)
      return { success: false, error: 'Network error or backend unavailable' }
    }
  }

  async getDocuments(params?: any): Promise<ApiResponse<PagedResponse<BackendDocument>>> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString())
        }
      })
    }
    const endpoint = `/admin/documents${searchParams.toString() ? `?${searchParams}` : ''}`
    return this.request<PagedResponse<BackendDocument>>(endpoint)
  }

  async getInscriptions(params?: any): Promise<ApiResponse<PagedResponse<BackendInscription>>> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString())
        }
      })
    }
    const endpoint = `/admin/inscriptions${searchParams.toString() ? `?${searchParams}` : ''}`
    return this.request<PagedResponse<BackendInscription>>(endpoint)
  }

  async getUsers(params?: any): Promise<ApiResponse<PagedResponse<BackendUser>>> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString())
        }
      })
    }
    const endpoint = `/admin/users${searchParams.toString() ? `?${searchParams}` : ''}`
    return this.request<PagedResponse<BackendUser>>(endpoint)
  }

  async approveDocument(documentId: string, comments?: string): Promise<ApiResponse> {
    return this.request(`/admin/documents/${documentId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ motivo: comments || '' })
    })
  }

  async rejectDocument(documentId: string, reason: string): Promise<ApiResponse> {
    return this.request(`/admin/documents/${documentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ motivo: reason })
    })
  }

  async revertDocument(documentId: string): Promise<ApiResponse> {
    return this.request(`/admin/documents/${documentId}/revert`, { method: 'POST' })
  }
}

export default new SessionBackendClient()
