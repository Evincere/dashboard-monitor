/**
 * React hook for automatic authentication with the backend
 */

import { useState, useEffect } from 'react';
import { ensureAuthenticated, getStoredAuth, clearAuth } from '@/lib/auto-auth';

interface UseAutoAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  retry: () => Promise<void>;
  logout: () => void;
}

export function useAutoAuth(): UseAutoAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const authenticate = async () => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      console.log('🔐 useAutoAuth: Starting authentication check...');
      const success = await ensureAuthenticated();
      
      setIsAuthenticated(success);
      
      if (!success) {
        setAuthError('Failed to authenticate with the backend');
      }
      
    } catch (error) {
      console.error('💥 useAutoAuth: Authentication error:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const retry = async () => {
    await authenticate();
  };

  const logout = () => {
    clearAuth();
    setIsAuthenticated(false);
    setAuthError(null);
  };

  useEffect(() => {
    authenticate();
  }, []);

  // Check for stored auth on component mount
  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setIsAuthenticated(true);
      setIsLoading(false);
    }
  }, []);

  return {
    isAuthenticated,
    isLoading,
    authError,
    retry,
    logout
  };
}
