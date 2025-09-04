import { useState, useCallback } from 'react';
import { Document } from '@/stores/validations/validation-store';

export interface NavigationState {
  currentIndex: number;
  total: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  navigateNext: () => void;
  navigatePrev: () => void;
}

export const useNavigationState = (
  documents: Document[] | undefined,
  currentDocument: Document | null,
  setCurrentDocument: (doc: Document | null) => void
): NavigationState => {
  // 🛡️ PROTECCIÓN: Asegurar que documents nunca sea undefined
  const safeDocuments = documents || [];
  
  const currentIndex = currentDocument 
    ? safeDocuments.findIndex(doc => doc.id === currentDocument.id)
    : -1;

  const navigateNext = useCallback(() => {
    if (currentIndex < safeDocuments.length - 1) {
      setCurrentDocument(safeDocuments[currentIndex + 1]);
    }
  }, [currentIndex, safeDocuments, setCurrentDocument]);

  const navigatePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentDocument(safeDocuments[currentIndex - 1]);
    }
  }, [currentIndex, safeDocuments, setCurrentDocument]);

  return {
    currentIndex: currentIndex + 1,
    total: safeDocuments.length,
    canGoNext: currentIndex < safeDocuments.length - 1,
    canGoPrev: currentIndex > 0,
    navigateNext,
    navigatePrev,
  };
};
