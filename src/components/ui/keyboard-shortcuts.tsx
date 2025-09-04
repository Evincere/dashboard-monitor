import { useHotkeys } from 'react-hotkeys-hook';

interface KeyboardShortcutsProps {
  onApprove: () => void;
  onReject: () => void;
  onNext: () => void;
  onPrevious: () => void;
  enabled?: boolean;
}

export function KeyboardShortcuts({
  onApprove,
  onReject,
  onNext,
  onPrevious,
  enabled = true
}: KeyboardShortcutsProps) {
  // Aprobar con Alt+A
  useHotkeys('alt+a', () => {
    if (enabled) onApprove();
  }, [enabled, onApprove]);

  // Rechazar con Alt+R
  useHotkeys('alt+r', () => {
    if (enabled) onReject();
  }, [enabled, onReject]);

  // Siguiente con Alt+Right
  useHotkeys('alt+right', () => {
    if (enabled) onNext();
  }, [enabled, onNext]);

  // Anterior con Alt+Left
  useHotkeys('alt+left', () => {
    if (enabled) onPrevious();
  }, [enabled, onPrevious]);

  return null;
}
