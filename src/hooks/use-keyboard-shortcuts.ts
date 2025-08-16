'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseKeyboardShortcutsProps {
  onApprove?: () => void;
  onReject?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onComment?: () => void;
  currentDNI?: string;
  postulantsList?: string[];
  disabled?: boolean;
}

export const useKeyboardShortcuts = ({
  onApprove,
  onReject,
  onNext,
  onPrevious,
  onComment,
  currentDNI,
  postulantsList,
  disabled = false
}: UseKeyboardShortcutsProps) => {
  const router = useRouter();

  const findCurrentIndex = useCallback(() => {
    if (!currentDNI || !postulantsList) return -1;
    return postulantsList.findIndex(dni => dni === currentDNI);
  }, [currentDNI, postulantsList]);

  const navigateToNext = useCallback(() => {
    if (!postulantsList) return;
    const currentIndex = findCurrentIndex();
    if (currentIndex < postulantsList.length - 1) {
      const nextDNI = postulantsList[currentIndex + 1];
      router.push(`/validation/${nextDNI}`);
    }
  }, [findCurrentIndex, postulantsList, router]);

  const navigateToPrevious = useCallback(() => {
    if (!postulantsList) return;
    const currentIndex = findCurrentIndex();
    if (currentIndex > 0) {
      const prevDNI = postulantsList[currentIndex - 1];
      router.push(`/validation/${prevDNI}`);
    }
  }, [findCurrentIndex, postulantsList, router]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;
    
    // Check if user is typing in an input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Prevent default behavior for our shortcuts
    const key = event.key.toLowerCase();
    const isCtrl = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;

    switch (key) {
      case 'a':
        if (isCtrl) break; // Allow Ctrl+A (select all)
        event.preventDefault();
        onApprove?.();
        break;
      
      case 'r':
        if (isCtrl) break; // Allow Ctrl+R (refresh)
        event.preventDefault();
        onReject?.();
        break;
      
      case 'n':
        if (isCtrl) break; // Allow Ctrl+N (new)
        event.preventDefault();
        onNext ? onNext() : navigateToNext();
        break;
      
      case 'p':
        if (isCtrl) break; // Allow Ctrl+P (print)
        event.preventDefault();
        onPrevious ? onPrevious() : navigateToPrevious();
        break;
      
      case 'c':
        if (isCtrl) break; // Allow Ctrl+C (copy)
        event.preventDefault();
        onComment?.();
        break;

      case 'arrowleft':
        if (isShift) {
          event.preventDefault();
          navigateToPrevious();
        }
        break;

      case 'arrowright':
        if (isShift) {
          event.preventDefault();
          navigateToNext();
        }
        break;

      case 'escape':
        event.preventDefault();
        router.push('/validation');
        break;

      case '/':
        // Quick search shortcut
        event.preventDefault();
        const searchInput = document.querySelector('[data-search="true"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
        break;
    }
  }, [disabled, onApprove, onReject, onNext, onPrevious, onComment, navigateToNext, navigateToPrevious, router]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Return navigation helpers
  return {
    canGoNext: () => {
      if (!postulantsList) return false;
      const currentIndex = findCurrentIndex();
      return currentIndex < postulantsList.length - 1;
    },
    canGoPrevious: () => {
      if (!postulantsList) return false;
      const currentIndex = findCurrentIndex();
      return currentIndex > 0;
    },
    getCurrentIndex: findCurrentIndex,
    navigateToNext,
    navigateToPrevious,
    getShortcutsHelp: () => [
      { key: 'A', description: 'Aprobar postulante' },
      { key: 'R', description: 'Rechazar postulante' },
      { key: 'N', description: 'Siguiente postulante' },
      { key: 'P', description: 'Anterior postulante' },
      { key: 'Shift + →', description: 'Siguiente postulante' },
      { key: 'Shift + ←', description: 'Anterior postulante' },
      { key: 'C', description: 'Enfocar comentarios' },
      { key: 'Esc', description: 'Volver a lista' },
      { key: '/', description: 'Búsqueda rápida' }
    ]
  };
};
