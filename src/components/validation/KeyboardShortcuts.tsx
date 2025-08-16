'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Keyboard, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const shortcuts = [
  {
    key: 'A',
    description: 'Aprobar documento actual',
    category: 'Validación'
  },
  {
    key: 'R',
    description: 'Rechazar documento actual',
    category: 'Validación'
  },
  {
    key: '→',
    description: 'Ir al siguiente documento pendiente',
    category: 'Navegación'
  },
  {
    key: '←',
    description: 'Ir al documento pendiente anterior',
    category: 'Navegación'
  },
  {
    key: 'Esc',
    description: 'Cancelar acción actual',
    category: 'General'
  },
  {
    key: 'Ctrl + D',
    description: 'Descargar documento actual',
    category: 'Acciones'
  },
  {
    key: 'Ctrl + /',
    description: 'Mostrar/ocultar atajos de teclado',
    category: 'Ayuda'
  }
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Keyboard className="w-4 h-4" />
          Atajos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Atajos de Teclado
          </DialogTitle>
          <DialogDescription>
            Usa estos atajos para validar documentos más rápidamente
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {shortcut.description}
                    </span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded border border-slate-300 dark:border-slate-600">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> Los atajos de teclado solo funcionan cuando no estás escribiendo en un campo de texto.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function KeyboardShortcutsHelp({ className = '' }: { className?: string }) {
  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Keyboard className="w-4 h-4" />
          Atajos de Teclado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Aprobar documento</span>
            <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">A</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span>Rechazar documento</span>
            <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">R</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span>Siguiente documento</span>
            <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">→</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span>Cancelar acción</span>
            <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">Esc</kbd>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}