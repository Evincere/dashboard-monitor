/**
 * Authenticated fetch wrapper that automatically includes JWT token
 */

import { getAuthToken } from './auto-auth';

interface AuthFetchOptions extends RequestInit {
  headers?: HeadersInit;
}

/**
 * Fetch wrapper that automatically includes Authorization header with JWT token
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: AuthFetchOptions
): Promise<Response> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(init?.headers || {}),
  };

  // Add Authorization header if token is available
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...init,
    headers,
  };

  console.log('📡 authFetch:', {
    url: input.toString(),
    method: config.method || 'GET',
    hasToken: !!token,
    headers: Object.keys(headers)
  });

  return fetch(input, config);
}

/**
 * Helper to create API URLs with special routing for proxy endpoints
 */
export function apiUrl(path: string): string {
  const cleanPath = path.replace(/^\//, '');
  
  // Special routing for proxy endpoints that need to go through dashboard-monitor
  if (cleanPath.startsWith('proxy-backend/') || cleanPath.startsWith('postulations/') || cleanPath.startsWith('validation/') || cleanPath.startsWith('documents/')) {
    return `/dashboard-monitor/api/${cleanPath}`;
  }
  
  // Default to main API
  return `/api/${cleanPath}`;
}
