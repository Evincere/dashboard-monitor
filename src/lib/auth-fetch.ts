/**
 * Authenticated fetch wrapper that automatically includes JWT token
 * FIXED: Proper routing for reports API with dashboard-monitor prefix
 */

import { getAuthToken, ensureAuthenticated, clearAuth } from './auto-auth';

interface AuthFetchOptions extends RequestInit {
  headers?: HeadersInit;
}

/**
 * Helper to create API URLs with proper routing
 */
export function apiUrl(path: string): string {
  // If path already contains /api/ or /dashboard-monitor/, return as is
  if (path.includes('/api/') || path.includes('/dashboard-monitor/')) {
    return path;
  }

  const cleanPath = path.replace(/^\//, '');

  // Routes that need special handling - these go under dashboard-monitor
  const dashboardRoutes = [
    'postulations/',
    'validation/',
    'documents/',
    'reports/'
  ];

  // Handle proxy-backend routes separately to avoid nesting under dashboard-monitor
  if (cleanPath.startsWith('proxy-backend/')) {
    return `/api/${cleanPath}`;
  }

  // Check if path starts with any of the dashboard routes
  if (dashboardRoutes.some(route => cleanPath.startsWith(route))) {
    return `/dashboard-monitor/api/${cleanPath}`;
  }

  // Default to main API
  return `/api/${cleanPath}`;
}

/**
 * Process URL to ensure correct routing
 * FIXED: Handle /api/reports routes to include dashboard-monitor prefix
 */
function processUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    const inputStr = input.toString();

    // If it's already a complete URL, return as is
    if (inputStr.startsWith('http')) {
      return inputStr;
    }

    // If it starts with /dashboard-monitor, return as is
    if (inputStr.startsWith('/dashboard-monitor/')) {
      return inputStr;
    }

    // If it's an API path with dashboard-monitor already in it, avoid duplicate
    if (inputStr.includes('/api/dashboard-monitor/')) {
      return inputStr;
    }

    // Handle proxy-backend routes
    if (inputStr.includes('proxy-backend/')) {
      const cleanPath = inputStr.replace(/^\//, '').replace(/^api\//, '');
      return `/api/${cleanPath}`;
    }

    // FIXED: Handle /api/reports routes specifically
    if (inputStr.startsWith('/api/reports')) {
      return `/dashboard-monitor${inputStr}`;
    }

    // For other paths, delegate to apiUrl
    return apiUrl(inputStr);
  }
  return input.toString();
}

/**
 * Configure headers with auth token
 */
function configureHeaders(init: AuthFetchOptions | undefined, token: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(init?.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fetch wrapper that automatically includes Authorization header with JWT token
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: AuthFetchOptions
): Promise<Response> {
  let retries = 2;
  let lastError: Error | null = null;

  while (retries >= 0) {
    try {
      // Ensure we have a valid authentication token
      const isAuthenticated = await ensureAuthenticated();

      if (!isAuthenticated) {
        if (retries > 0) {
          console.warn('⚠️ Authentication failed, retrying...', { retriesLeft: retries });
          retries--;
          clearAuth();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          continue;
        }
        throw new Error('Authentication failed after retries');
      }

      const token = getAuthToken();
      const headers = configureHeaders(init, token);
      const finalUrl = processUrl(input);

      const config: RequestInit = {
        ...init,
        headers,
      };

      console.log('📡 authFetch:', {
        originalUrl: input.toString(),
        finalUrl,
        method: config.method || 'GET',
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
      });

      const response = await fetch(finalUrl, config);

      // If we get an auth error and have retries left, try again
      if (response.status === 401 && retries > 0) {
        console.warn('⚠️ Auth token rejected, retrying...', { retriesLeft: retries });
        retries--;
        clearAuth();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error in authFetch');

      if (retries > 0) {
        console.warn('⚠️ Request failed, retrying...', {
          error: lastError.message,
          retriesLeft: retries
        });
        retries--;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Request failed after all retries');
}
