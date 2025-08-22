/**
 * Auto-authentication system for dashboard-monitor microservice
 * Uses admin credentials from the main project to authenticate automatically
 */

const ADMIN_CREDENTIALS = {
  email: "admin",
  username: "admin",
  password: "admin123"
};

// Dynamic backend URL based on environment - CORRECTED LOGIC
const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Use the main backend API, not dashboard-monitor's internal auth
    return `${origin}/api/auth/login`;
  }
  // Fallback for development - use main backend
  return 'http://localhost:8080/api/auth/login';
};

// Alternative backend URLs to try if the first one fails
const getAlternativeBackendUrls = () => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return [
      `${origin}/api/auth/login`, // Try main backend as alternative
      `${origin}:8080/api/auth/login`
    ];
  }
  return [];
};

const AUTH_STORAGE_KEY = 'dashboardMonitorAuth';

interface AuthResponse {
  token?: string;
  bearer?: string;
  username?: string;
  authorities?: Array<{ authority: string }>;
  cuit?: string | null;
}

interface StoredAuth {
  token: string;
  username: string;
  authorities: Array<{ authority: string }>;
  expiresAt: number;
}

/**
 * Check if we have a valid stored authentication token
 */
export function getStoredAuth(): StoredAuth | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    const auth: StoredAuth = JSON.parse(stored);

    // Check if token is expired (with 5 minute buffer)
    const now = Date.now();
    const expiresAt = auth.expiresAt - (5 * 60 * 1000); // 5 minutes buffer

    if (now >= expiresAt) {
      console.log('🔄 Stored auth token expired, removing...');
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return auth;
  } catch (error) {
    console.error('❌ Error reading stored auth:', error);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

/**
 * Store authentication data in localStorage
 */
function storeAuth(authData: AuthResponse): void {
  if (typeof window === 'undefined' || !authData.token || !authData.username) return;

  const expiresAt = Date.now() + (23 * 60 * 60 * 1000); // 23 hours (1 hour buffer)

  const storedAuth: StoredAuth = {
    token: authData.token,
    username: authData.username,
    authorities: authData.authorities || [],
    expiresAt
  };

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(storedAuth));
    console.log('✅ Auth data stored successfully');
  } catch (error) {
    console.error('❌ Error storing auth data:', error);
  }
}

/**
 * Set auth cookies for API requests
 */
function setAuthCookies(token: string): void {
  if (typeof document === 'undefined') return;

  // Set token as cookie for API requests
  const expires = new Date();
  expires.setTime(expires.getTime() + (23 * 60 * 60 * 1000)); // 23 hours

  document.cookie = `accessToken=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
  console.log('✅ Auth cookies set');
}

/**
 * Try to authenticate with a specific URL
 */
async function tryAuthenticateWithUrl(url: string): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
  try {
    console.log('📡 Trying authentication URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(ADMIN_CREDENTIALS)
    });

    console.log('📡 Auth response status:', response.status, 'for URL:', url);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const authData: AuthResponse = await response.json();
    console.log('📋 Auth response received from', url, ':', { hasToken: !!authData.token, username: authData.username });

    if (!authData.token) {
      return {
        success: false,
        error: 'No token received from server'
      };
    }

    return { success: true, data: authData };

  } catch (error) {
    console.log('❌ Auth failed for URL', url, ':', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Authenticate with the backend using admin credentials
 */
export async function authenticateWithBackend(): Promise<{ success: boolean; error?: string; data?: AuthResponse }> {
  console.log('🔐 Attempting authentication with backend...');

  // Try primary URL first (should be the correct one now)
  const primaryUrl = getBackendUrl();
  const primaryResult = await tryAuthenticateWithUrl(primaryUrl);

  if (primaryResult.success && primaryResult.data?.token) {
    storeAuth(primaryResult.data);
    setAuthCookies(primaryResult.data.token);
    console.log('✅ Authentication successful with primary URL:', primaryUrl);
    return { success: true, data: primaryResult.data };
  }

  // Try alternative URLs only if primary fails
  const alternativeUrls = getAlternativeBackendUrls();
  console.log('🔄 Primary URL failed, trying alternatives...', alternativeUrls);

  for (const url of alternativeUrls) {
    if (url === primaryUrl) continue; // Skip if already tried

    const result = await tryAuthenticateWithUrl(url);
    if (result.success && result.data?.token) {
      storeAuth(result.data);
      setAuthCookies(result.data.token);
      console.log('✅ Authentication successful with alternative URL:', url);
      return { success: true, data: result.data };
    }
  }

  // All attempts failed
  const allErrors = [primaryResult.error, ...alternativeUrls.map(() => 'Failed')];
  console.error('💥 All authentication attempts failed');
  return {
    success: false,
    error: `Authentication failed. Tried URLs: ${[primaryUrl, ...alternativeUrls].join(', ')}`
  };
}

/**
 * Ensure the user is authenticated (auto-login if needed)
 */
export async function ensureAuthenticated(): Promise<boolean> {
  console.log('🔍 Checking authentication status...');

  // Check if we already have valid auth
  const storedAuth = getStoredAuth();
  if (storedAuth) {
    console.log('✅ Valid authentication found');
    setAuthCookies(storedAuth.token);
    return true;
  }

  // Need to authenticate
  console.log('🔄 No valid auth found, attempting auto-login...');
  const authResult = await authenticateWithBackend();

  if (authResult.success) {
    console.log('✅ Auto-login successful');
    return true;
  } else {
    console.error('❌ Auto-login failed:', authResult.error);
    return false;
  }
}

/**
 * Clear authentication data
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(AUTH_STORAGE_KEY);

  // Clear auth cookies
  if (typeof document !== 'undefined') {
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  }

  console.log('🧹 Authentication data cleared');
}

/**
 * Get current auth token for API requests
 */
export function getAuthToken(): string | null {
  const storedAuth = getStoredAuth();
  return storedAuth ? storedAuth.token : null;
}
