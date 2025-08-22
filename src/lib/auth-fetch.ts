/**
 * Authenticated fetch wrapper that automatically includes JWT token
 */

import { getAuthToken, ensureAuthenticated } from './auto-auth';

interface AuthFetchOptions extends RequestInit {
  headers?: HeadersInit;
}

/**
 * Helper to create API URLs with proper routing
 */
export function apiUrl(path: string): string {
  const cleanPath = path.replace(/^\//, '');
  
  // Special routing for proxy endpoints that need to go through dashboard-monitor
  if (cleanPath.startsWith('proxy-backend/') || 
      cleanPath.startsWith('postulations/') || 
      cleanPath.startsWith('validation/') || 
      cleanPath.startsWith('documents/')) {
    return `/dashboard-monitor/api/${cleanPath}`;
  }
  
  // Reports endpoints should use the basePath since they're part of dashboard-monitor
  if (cleanPath.startsWith('api/reports/')) {
    return `/dashboard-monitor/${cleanPath}`;
  }
  
  // Default to main API
  return `/api/${cleanPath}`;
}

/**
 * Fetch wrapper that automatically includes Authorization header with JWT token
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: AuthFetchOptions
): Promise<Response> {
  // Ensure we have a valid authentication token
  const isAuthenticated = await ensureAuthenticated();
  
  if (!isAuthenticated) {
    console.error('❌ Authentication failed, cannot make authenticated request');
    throw new Error('Authentication failed');
  }
  
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

  // Process URL to ensure correct routing
  let finalUrl: string;
  if (typeof input === 'string') {
    // Handle reports API routes - these need the basePath
    if (input.startsWith('/api/reports/') || input.startsWith('api/reports/')) {
      const cleanPath = input.replace(/^\//, '');
      finalUrl = `/dashboard-monitor/${cleanPath}`;
    } else {
      finalUrl = input;
    }
  } else {
    finalUrl = input.toString();
  }

  console.log('📡 authFetch:', {
    originalUrl: input.toString(),
    finalUrl: finalUrl,
    method: config.method || 'GET',
    hasToken: !!token,
    headers: Object.keys(headers)
  });

  return fetch(finalUrl, config);
}
