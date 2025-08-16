'use client';

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Asterisk } from "lucide-react";

// Mapeo de tipos de documentos a códigos cortos, colores y estado de obligatoriedad
const documentTypeMapping: { [key: string]: { code: string; color: string; gradient: string; required: boolean } } = {
  // DNI (Obligatorios)
  'DNI (Frontal)': { 
    code: 'DNI-F', 
    color: 'border-blue-400/70 bg-blue-500/20 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200', 
    gradient: 'from-blue-500/30 to-blue-600/10',
    required: true
  },
  'DNI (Dorso)': { 
    code: 'DNI-D', 
    color: 'border-blue-400/70 bg-blue-500/20 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200', 
    gradient: 'from-blue-500/30 to-blue-600/10',
    required: true
  },
  
  // Títulos y Certificados Académicos (Obligatorio)
  'Título Universitario y Certificado Analítico': { 
    code: 'TÍTULO', 
    color: 'border-emerald-400/70 bg-emerald-500/20 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200', 
    gradient: 'from-emerald-500/30 to-emerald-600/10',
    required: true
  },
  
  // Certificados Legales (Obligatorios)
  'Certificado de Antecedentes Penales': { 
    code: 'ANT-PENALES', 
    color: 'border-red-400/70 bg-red-500/20 text-red-700 dark:bg-red-900/40 dark:text-red-200', 
    gradient: 'from-red-500/30 to-red-600/10',
    required: true
  },
  'Certificado Sin Sanciones Disciplinarias': { 
    code: 'SIN-SANC', 
    color: 'border-amber-400/70 bg-amber-500/20 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200', 
    gradient: 'from-amber-500/30 to-amber-600/10',
    required: true
  },
  
  // Certificados Profesionales (Obligatorio)
  'Certificado de Antigüedad Profesional': { 
    code: 'ANT-PROF', 
    color: 'border-purple-400/70 bg-purple-500/20 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200', 
    gradient: 'from-purple-500/30 to-purple-600/10',
    required: true
  },
  
  // Documentos Administrativos (Obligatorio)
  'Constancia de CUIL': { 
    code: 'CUIL', 
    color: 'border-cyan-400/70 bg-cyan-500/20 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200', 
    gradient: 'from-cyan-500/30 to-cyan-600/10',
    required: true
  },
  
  // Certificados Especiales (Opcional)
  'Certificado Ley Micaela': { 
    code: 'LEY-MICAELA', 
    color: 'border-pink-400/70 bg-pink-500/20 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200', 
    gradient: 'from-pink-500/30 to-pink-600/10',
    required: false
  },
  
  // Otros (Opcional)
  'Documento Adicional': { 
    code: 'ADICIONAL', 
    color: 'border-slate-400/70 bg-slate-500/20 text-slate-700 dark:bg-slate-800/40 dark:text-slate-200', 
    gradient: 'from-slate-500/30 to-slate-600/10',
    required: false
  },
};

// Fallback para tipos no mapeados
const getDocumentTypeInfo = (name: string) => {
  // Validar que name no sea undefined, null o vacío
  if (!name || typeof name !== 'string') {
    return {
      code: 'UNKNOWN',
      color: 'border-gray-400/70 bg-gray-500/20 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200',
      gradient: 'from-gray-500/30 to-gray-600/10',
      required: false
    };
  }
  
  const mapped = documentTypeMapping[name];
  if (mapped) return mapped;
  
  // Generar código automáticamente para tipos no mapeados
  const code = name.length > 10 ? name.substring(0, 8).toUpperCase() + '...' : name.toUpperCase();
  return {
    code,
    color: 'border-gray-400/70 bg-gray-500/20 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200',
    gradient: 'from-gray-500/30 to-gray-600/10',
    required: false
  };
};

interface DocumentTypeBadgeProps {
  documentType: string;
  variant?: 'default' | 'compact';
  showTooltip?: boolean;
  className?: string;
}

export function DocumentTypeBadge({ 
  documentType, 
  variant = 'default', 
  showTooltip = true, 
  className 
}: DocumentTypeBadgeProps) {
  const typeInfo = getDocumentTypeInfo(documentType);
  const isRequired = typeInfo.required === true;
  
  const badgeContent = (
    <div
      className={cn(
        // Base badge structure
        "inline-flex items-center rounded-full font-semibold",
        
        // Base glassmorphism styles
        "relative overflow-hidden",
        "backdrop-blur-md backdrop-saturate-150",
        "shadow-lg",
        "bg-gradient-to-r",
        typeInfo.gradient,
        typeInfo.color,
        
        // Required documents have enhanced styling
        isRequired 
          ? "border-2 border-white/20 ring-1 ring-white/10" 
          : "border border-white/10",
        
        // Animation and interaction
        "transition-all duration-300 ease-in-out",
        "hover:scale-105 hover:shadow-xl",
        "hover:border-white/30",
        "cursor-default",
        
        // Variant styles with extra padding for required indicator
        variant === 'compact' 
          ? isRequired ? "text-xs px-2 py-1 pl-6" : "text-xs px-2 py-1"
          : isRequired ? "text-sm px-3 py-1.5 pl-7" : "text-sm px-3 py-1.5",
        
        className
      )}
      title={showTooltip ? `${documentType}${isRequired ? ' (Obligatorio)' : ' (Opcional)'}` : undefined}
    >
      {/* Required indicator */}
      {isRequired && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 z-20">
          <div className="relative">
            <Asterisk 
              className={cn(
                "w-3 h-3 text-yellow-400 drop-shadow-sm",
                variant === 'compact' ? "w-2.5 h-2.5" : "w-3 h-3"
              )} 
            />
            {/* Pulsing glow effect for required indicator */}
            <div className="absolute inset-0 w-3 h-3 bg-yellow-400/30 rounded-full blur-sm animate-pulse" />
          </div>
        </div>
      )}
      
      {/* Glass reflection effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Content */}
      <span className="relative z-10 font-medium tracking-wide">
        {typeInfo.code}
      </span>
      
      {/* Enhanced glow effect for required documents */}
      <div className={cn(
        "absolute inset-0 rounded-full blur-md opacity-30 bg-current pointer-events-none",
        isRequired && "opacity-40"
      )} />
      
      {/* Extra shimmer effect for required documents */}
      {isRequired && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-pulse opacity-60 pointer-events-none" />
      )}
    </div>
  );

  return badgeContent;
}

// Hook para obtener información de tipo de documento (útil para otros componentes)
export function useDocumentTypeInfo(documentType: string) {
  return getDocumentTypeInfo(documentType);
}

// Componente para mostrar todos los tipos disponibles (útil para documentación)
export function DocumentTypeBadgePreview() {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      {Object.keys(documentTypeMapping).map((type) => (
        <DocumentTypeBadge key={type} documentType={type} />
      ))}
    </div>
  );
}
