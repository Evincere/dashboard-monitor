import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  callback: () => void;
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts({ 
  shortcuts, 
  enabled = true, 
  preventDefault = true 
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as HTMLElement)?.contentEditable === 'true'
    ) {
      return;
    }

    if (!enabled) return;

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
      const altMatches = !!shortcut.altKey === event.altKey;
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;

      return keyMatches && ctrlMatches && altMatches && shiftMatches;
    });

    if (matchingShortcut) {
      if (preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
      matchingShortcut.callback();
    }
  }, [shortcuts, enabled, preventDefault]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return {
    shortcuts: shortcuts.map(s => ({
      key: s.key,
      ctrlKey: s.ctrlKey,
      altKey: s.altKey,
      shiftKey: s.shiftKey,
      description: s.description
    }))
  };
}

// Validation-specific shortcuts hook
export function useValidationShortcuts({
  onApprove,
  onReject,
  onNext,
  onPrevious,
  onCancel,
  onDownload,
  enabled = true
}: {
  onApprove?: () => void;
  onReject?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onCancel?: () => void;
  onDownload?: () => void;
  enabled?: boolean;
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'a',
      callback: () => onApprove?.(),
      description: 'Aprobar documento actual'
    },
    {
      key: 'r',
      callback: () => onReject?.(),
      description: 'Rechazar documento actual'
    },
    {
      key: 'ArrowRight',
      callback: () => onNext?.(),
      description: 'Siguiente documento'
    },
    {
      key: 'ArrowLeft',
      callback: () => onPrevious?.(),
      description: 'Documento anterior'
    },
    {
      key: 'Escape',
      callback: () => onCancel?.(),
      description: 'Cancelar acción actual'
    },
    {
      key: 'd',
      ctrlKey: true,
      callback: () => onDownload?.(),
      description: 'Descargar documento actual'
    }
  ].filter(shortcut => shortcut.callback);

  return useKeyboardShortcuts({
    shortcuts,
    enabled
  });
}

// Format shortcut for display
export function formatShortcut(shortcut: {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}): string {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  
  // Format special keys
  let key = shortcut.key;
  switch (key.toLowerCase()) {
    case 'arrowleft':
      key = '←';
      break;
    case 'arrowright':
      key = '→';
      break;
    case 'arrowup':
      key = '↑';
      break;
    case 'arrowdown':
      key = '↓';
      break;
    case 'escape':
      key = 'Esc';
      break;
    case ' ':
      key = 'Space';
      break;
    default:
      key = key.toUpperCase();
  }
  
  parts.push(key);
  
  return parts.join(' + ');
}