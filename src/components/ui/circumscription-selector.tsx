'use client';

import React, { useState, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

// Estructura de circunscripciones MPD
const CIRCUMSCRIPTION_STRUCTURE = {
  'PRIMERA': { 
    label: 'Primera Circunscripción', 
    value: 'PRIMERA CIRCUNSCRIPCIÓN',
    subdivisions: [] 
  },
  'SEGUNDA': {
    label: 'Segunda Circunscripción',
    value: 'SEGUNDA CIRCUNSCRIPCIÓN',
    subdivisions: [
      { id: 'san_rafael', label: 'San Rafael', value: 'SEGUNDA CIRCUNSCRIPCIÓN - San Rafael' },
      { id: 'general_alvear', label: 'General Alvear', value: 'SEGUNDA CIRCUNSCRIPCIÓN - General Alvear' },
      { id: 'malargue', label: 'Malargüe', value: 'SEGUNDA CIRCUNSCRIPCIÓN - Malargüe' }
    ]
  },
  'TERCERA': { 
    label: 'Tercera Circunscripción', 
    value: 'TERCERA CIRCUNSCRIPCIÓN',
    subdivisions: [] 
  },
  'CUARTA': { 
    label: 'Cuarta Circunscripción', 
    value: 'CUARTA CIRCUNSCRIPCIÓN',
    subdivisions: [] 
  }
};

interface CircunscriptionSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CircunscriptionSelector({
  value = [],
  onChange,
  placeholder = "Seleccionar circunscripciones...",
  disabled = false,
  className
}: CircunscriptionSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Función para verificar si una circunscripción está seleccionada
  const isSelected = (circumscriptionValue: string) => {
    return value.includes(circumscriptionValue);
  };

  // Función para manejar la selección/deselección
  const handleToggle = (circumscriptionValue: string) => {
    const newValue = isSelected(circumscriptionValue)
      ? value.filter(v => v !== circumscriptionValue)
      : [...value, circumscriptionValue];
    
    onChange(newValue);
  };

  // Función para manejar la selección de circunscripción principal
  const handleMainCircunscriptionToggle = (key: string) => {
    const circumscription = CIRCUMSCRIPTION_STRUCTURE[key as keyof typeof CIRCUMSCRIPTION_STRUCTURE];
    const mainValue = circumscription.value;
    
    if (key === 'SEGUNDA') {
      // Para Segunda Circunscripción, manejamos las subdivisiones
      const subdivisionValues = circumscription.subdivisions.map(sub => sub.value);
      const allSelected = isSelected(mainValue) && subdivisionValues.every(v => isSelected(v));
      
      if (allSelected) {
        // Deseleccionar todo
        const newValue = value.filter(v => v !== mainValue && !subdivisionValues.includes(v));
        onChange(newValue);
      } else {
        // Seleccionar todo (principal y subdivisiones)
        const newValue = [...new Set([...value, mainValue, ...subdivisionValues])];
        onChange(newValue);
      }
    } else {
      // Para otras circunscripciones, solo toggle simple
      handleToggle(mainValue);
    }
  };

  // Función para obtener el estado de checkbox de la circunscripción principal
  const getMainCheckboxState = (key: string) => {
    const circumscription = CIRCUMSCRIPTION_STRUCTURE[key as keyof typeof CIRCUMSCRIPTION_STRUCTURE];
    const mainValue = circumscription.value;
    
    if (key === 'SEGUNDA') {
      const subdivisionValues = circumscription.subdivisions.map(sub => sub.value);
      const mainSelected = isSelected(mainValue);
      const subdivisionSelected = subdivisionValues.filter(v => isSelected(v));
      
      if (mainSelected && subdivisionSelected.length === subdivisionValues.length) {
        return 'checked';
      } else if (mainSelected || subdivisionSelected.length > 0) {
        return 'indeterminate';
      } else {
        return 'unchecked';
      }
    } else {
      return isSelected(mainValue) ? 'checked' : 'unchecked';
    }
  };

  // Función para obtener el texto a mostrar en el botón
  const getDisplayText = () => {
    if (value.length === 0) {
      return placeholder;
    } else if (value.length === 1) {
      // Buscar la etiqueta completa
      for (const [key, circumscription] of Object.entries(CIRCUMSCRIPTION_STRUCTURE)) {
        if (circumscription.value === value[0]) {
          return circumscription.label;
        }
        for (const sub of circumscription.subdivisions) {
          if (sub.value === value[0]) {
            return sub.label;
          }
        }
      }
      return value[0];
    } else {
      return `${value.length} circunscripciones seleccionadas`;
    }
  };

  // Filtrar circunscripciones basado en la búsqueda
  const filteredCircunscriptions = Object.entries(CIRCUMSCRIPTION_STRUCTURE).filter(([key, circumscription]) => {
    const searchLower = searchValue.toLowerCase();
    return circumscription.label.toLowerCase().includes(searchLower) ||
           circumscription.subdivisions.some(sub => sub.label.toLowerCase().includes(searchLower));
  });

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              value.length === 0 && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <span className="truncate">{getDisplayText()}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar circunscripción..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No se encontraron circunscripciones.</CommandEmpty>
              <CommandGroup>
                {filteredCircunscriptions.map(([key, circumscription]) => (
                  <div key={key} className="space-y-1">
                    {/* Circunscripción principal */}
                    <CommandItem
                      onSelect={() => handleMainCircunscriptionToggle(key)}
                      className="flex items-center space-x-3 px-3 py-2"
                    >
                      <Checkbox
                        checked={getMainCheckboxState(key) === 'checked'}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = getMainCheckboxState(key) === 'indeterminate';
                          }
                        }}
                        className="shrink-0"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{circumscription.label}</div>
                        {key === 'SEGUNDA' && circumscription.subdivisions.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {circumscription.subdivisions.length} subdivisiones disponibles
                          </div>
                        )}
                      </div>
                    </CommandItem>

                    {/* Subdivisiones para Segunda Circunscripción */}
                    {key === 'SEGUNDA' && circumscription.subdivisions.map((subdivision) => (
                      <CommandItem
                        key={subdivision.id}
                        onSelect={() => handleToggle(subdivision.value)}
                        className="flex items-center space-x-3 px-6 py-2 ml-4"
                      >
                        <Checkbox
                          checked={isSelected(subdivision.value)}
                          className="shrink-0"
                        />
                        <div className="flex-1">
                          <div className="text-sm">{subdivision.label}</div>
                        </div>
                      </CommandItem>
                    ))}
                  </div>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          
          {/* Footer con opciones rápidas */}
          {value.length > 0 && (
            <div className="border-t p-2">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {value.length} seleccionada{value.length !== 1 ? 's' : ''}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange([])}
                  className="h-8 px-2 text-xs"
                >
                  Limpiar
                </Button>
              </div>
              
              {/* Mostrar badges de selecciones */}
              {value.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {value.slice(0, 3).map((selected) => {
                    // Encontrar la etiqueta corta para mostrar
                    let shortLabel = selected;
                    for (const [key, circumscription] of Object.entries(CIRCUMSCRIPTION_STRUCTURE)) {
                      if (circumscription.value === selected) {
                        shortLabel = circumscription.label.replace(' Circunscripción', '');
                        break;
                      }
                      for (const sub of circumscription.subdivisions) {
                        if (sub.value === selected) {
                          shortLabel = sub.label;
                          break;
                        }
                      }
                    }
                    
                    return (
                      <Badge
                        key={selected}
                        variant="secondary"
                        className="text-xs px-2 py-0.5"
                      >
                        {shortLabel}
                      </Badge>
                    );
                  })}
                  {value.length > 3 && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      +{value.length - 3} más
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
