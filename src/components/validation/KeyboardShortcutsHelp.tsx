'use client';

import { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface KeyboardShortcut {
  key: string;
  description: string;
  category?: 'navigation' | 'actions' | 'general';
}

interface KeyboardShortcutsHelpProps {
  shortcuts?: KeyboardShortcut[];
  trigger?: React.ReactNode;
}

const defaultShortcuts: KeyboardShortcut[] = [
  // Navigation
  { key: 'Shift + →', description: 'Siguiente postulante', category: 'navigation' },
  { key: 'Shift + ←', description: 'Anterior postulante', category: 'navigation' },
  { key: 'N', description: 'Siguiente postulante', category: 'navigation' },
  { key: 'P', description: 'Anterior postulante', category: 'navigation' },
  { key: 'Esc', description: 'Volver a lista', category: 'navigation' },
  
  // Actions
  { key: 'A', description: 'Aprobar postulante', category: 'actions' },
  { key: 'R', description: 'Rechazar postulante', category: 'actions' },
  { key: 'C', description: 'Enfocar comentarios', category: 'actions' },
  
  // General
  { key: '/', description: 'Búsqueda rápida', category: 'general' },
  { key: '?', description: 'Mostrar ayuda de atajos', category: 'general' }
];

const categoryNames = {
  navigation: 'Navegación',
  actions: 'Acciones',
  general: 'General'
};

const categoryColors = {
  navigation: 'bg-blue-100 text-blue-700',
  actions: 'bg-green-100 text-green-700',
  general: 'bg-purple-100 text-purple-700'
};

export default function KeyboardShortcutsHelp({ 
  shortcuts = defaultShortcuts,
  trigger 
}: KeyboardShortcutsHelpProps) {
  const [open, setOpen] = useState(false);

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  // Listen for ? key to open help
  useState(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && !open) {
        const target = event.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          event.preventDefault();
          setOpen(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="bg-input/80 border-white/10"
    >
      <Keyboard className="w-4 h-4 mr-2" />
      Atajos
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Atajos de Teclado
          </DialogTitle>
          <DialogDescription>
            Utiliza estos atajos para navegar más rápidamente durante la validación
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={categoryColors[category as keyof typeof categoryColors]}
                >
                  {categoryNames[category as keyof typeof categoryNames]}
                </Badge>
              </h3>
              
              <div className="grid gap-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.key.includes('+') ? (
                        shortcut.key.split('+').map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center">
                            <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 border border-gray-300 rounded-lg">
                              {key.trim()}
                            </kbd>
                            {keyIndex < shortcut.key.split('+').length - 1 && (
                              <span className="mx-1 text-xs text-muted-foreground">+</span>
                            )}
                          </span>
                        ))
                      ) : (
                        <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 border border-gray-300 rounded-lg">
                          {shortcut.key}
                        </kbd>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Los atajos no funcionan mientras escribes en campos de texto.
            Presiona <kbd className="px-1 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded">?</kbd> en cualquier momento para ver esta ayuda.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
