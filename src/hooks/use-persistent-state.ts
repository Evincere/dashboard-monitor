// ================================================
// HOOK PARA PERSISTENCIA EN LOCALSTORAGE
// ================================================

'use client';

import { useState, useEffect } from 'react';

export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state
  const [state, setState] = useState<T>(() => {
    // Only access localStorage on client side
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    
    try {
      const saved = window.localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.warn(`Error loading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Update localStorage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.warn(`Error saving to localStorage key "${key}":`, error);
      }
    }
  }, [key, state]);

  return [state, setState];
}
