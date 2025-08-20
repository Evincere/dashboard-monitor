'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, Loader2, ArrowRight, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn, routeUrl } from '@/lib/utils';

interface SearchResult {
  dni: string;
  fullName: string;
  email: string;
  circunscripcion: string;
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW';
  contestInfo: {
    title: string;
    position: string;
  };
}

interface QuickSearchProps {
  trigger?: React.ReactNode;
  placeholder?: string;
  className?: string;
}

export default function QuickSearch({ 
  trigger, 
  placeholder = "Buscar postulante...",
  className = ""
}: QuickSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/dashboard-monitor/api/validation/search?q=${encodeURIComponent(searchQuery)}&limit=8`);
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  // Listen for / key to open search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && !open) {
        const target = event.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          event.preventDefault();
          setOpen(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Handle keyboard navigation in results
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          navigateToPostulant(results[selectedIndex].dni);
        }
        break;
      
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        break;
    }
  };

  const navigateToPostulant = (dni: string) => {
    router.push(routeUrl(`validation/${dni}`));
    setOpen(false);
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
  };

  // Focus input when dialog opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const getStatusBadgeVariant = (status: SearchResult['validationStatus']) => {
    switch (status) {
      case 'APPROVED': return 'default';
      case 'PENDING': return 'secondary';
      case 'REJECTED': return 'destructive';
      case 'IN_REVIEW': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusText = (status: SearchResult['validationStatus']) => {
    switch (status) {
      case 'APPROVED': return 'Aprobado';
      case 'PENDING': return 'Pendiente';
      case 'REJECTED': return 'Rechazado';
      case 'IN_REVIEW': return 'En Revisión';
      default: return status;
    }
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      className={cn("bg-input/80 border-white/10 justify-start text-muted-foreground", className)}
    >
      <Search className="w-4 h-4 mr-2" />
      {placeholder}
      <kbd className="ml-auto px-1.5 py-0.5 text-xs bg-muted rounded border">
        /
      </kbd>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Búsqueda Rápida
          </DialogTitle>
          <DialogDescription>
            Buscar postulante por DNI, nombre o apellido
          </DialogDescription>
        </DialogHeader>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Escribir DNI, nombre o apellido..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
              data-search="true"
            />
          </div>

          <div className="mt-4 max-h-96 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Buscando...</span>
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No se encontraron resultados para "{query}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Intenta con el DNI completo o nombre completo
                </p>
              </div>
            )}

            {!loading && query.length < 2 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Hash className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Escribe al menos 2 caracteres para buscar
                </p>
                <div className="flex flex-wrap gap-2 mt-3 justify-center">
                  <Badge variant="outline" className="text-xs">
                    Por DNI: 12345678
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Por nombre: Juan
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Por apellido: González
                  </Badge>
                </div>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={result.dni}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedIndex === index
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted/50 border-border"
                    )}
                    onClick={() => navigateToPostulant(result.dni)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{result.fullName}</p>
                          <Badge
                            variant={getStatusBadgeVariant(result.validationStatus)}
                            className="text-xs"
                          >
                            {getStatusText(result.validationStatus)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          DNI: {result.dni} • {result.circunscripcion.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.contestInfo.position}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
                
                {results.length === 8 && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-muted-foreground">
                      Mostrando los primeros 8 resultados. Refina tu búsqueda para ver más específicos.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted rounded border">↑↓</kbd>
                Navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted rounded border">Enter</kbd>
                Seleccionar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted rounded border">Esc</kbd>
                Cerrar
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
