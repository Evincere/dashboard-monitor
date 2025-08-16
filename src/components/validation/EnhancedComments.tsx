'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Clock, User, Lightbulb, Copy, RotateCcw, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface CommentTemplate {
  id: string;
  title: string;
  content: string;
  category: 'approval' | 'rejection' | 'general';
}

interface CommentHistoryItem {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
  type: 'general' | 'document';
  documentName?: string;
}

interface EnhancedCommentsProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  history?: CommentHistoryItem[];
  documentId?: string;
  disabled?: boolean;
  className?: string;
  onFocus?: () => void;
}

const defaultTemplates: CommentTemplate[] = [
  {
    id: 'doc-approved',
    title: 'Documentos Aprobados',
    content: 'Todos los documentos presentados cumplen con los requisitos establecidos. La documentación es clara, completa y está debidamente certificada.',
    category: 'approval'
  },
  {
    id: 'qualifications-ok',
    title: 'Calificaciones Correctas',
    content: 'Las calificaciones y títulos presentados son válidos y cumplen con los requisitos del concurso. Se verifica autenticidad de los documentos académicos.',
    category: 'approval'
  },
  {
    id: 'experience-valid',
    title: 'Experiencia Válida',
    content: 'La experiencia laboral declarada es consistente con los antecedentes presentados y cumple con los requisitos mínimos.',
    category: 'approval'
  },
  {
    id: 'doc-incomplete',
    title: 'Documentación Incompleta',
    content: 'Falta documentación requerida. Se necesita presentar los documentos faltantes según las bases del concurso.',
    category: 'rejection'
  },
  {
    id: 'doc-invalid',
    title: 'Documentación Inválida',
    content: 'Los documentos presentados no cumplen con los requisitos formales o presentan inconsistencias que impiden su validación.',
    category: 'rejection'
  },
  {
    id: 'requirements-not-met',
    title: 'Requisitos No Cumplidos',
    content: 'El postulante no cumple con los requisitos mínimos establecidos en las bases del concurso.',
    category: 'rejection'
  },
  {
    id: 'pending-review',
    title: 'Pendiente de Revisión',
    content: 'Requiere revisión adicional. Se necesita verificación de algunos documentos antes de tomar una decisión final.',
    category: 'general'
  },
  {
    id: 'excellent-candidate',
    title: 'Candidato Excelente',
    content: 'Candidato con excelente perfil académico y profesional. Cumple ampliamente con todos los requisitos del concurso.',
    category: 'approval'
  }
];

export default function EnhancedComments({
  value,
  onChange,
  placeholder = "Agregue sus observaciones...",
  label = "Comentarios",
  history = [],
  documentId,
  disabled = false,
  className = "",
  onFocus
}: EnhancedCommentsProps) {
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<CommentTemplate[]>([]);
  const [newTemplate, setNewTemplate] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load custom templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('validation-comment-templates');
    if (saved) {
      try {
        setCustomTemplates(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading custom templates:', error);
      }
    }
  }, []);

  // Save custom templates to localStorage
  const saveCustomTemplates = (templates: CommentTemplate[]) => {
    setCustomTemplates(templates);
    localStorage.setItem('validation-comment-templates', JSON.stringify(templates));
  };

  const allTemplates = [...defaultTemplates, ...customTemplates];

  const handleTemplateSelect = (template: CommentTemplate) => {
    const currentValue = value.trim();
    const newValue = currentValue 
      ? `${currentValue}\n\n${template.content}`
      : template.content;
    
    onChange(newValue);
    setIsTemplateOpen(false);
    
    // Focus textarea after template insertion
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newValue.length, newValue.length);
    }, 100);
  };

  const handleHistorySelect = (historyItem: CommentHistoryItem) => {
    const currentValue = value.trim();
    const newValue = currentValue 
      ? `${currentValue}\n\n[Ref: ${historyItem.documentName || 'General'}] ${historyItem.content}`
      : historyItem.content;
    
    onChange(newValue);
    setIsHistoryOpen(false);
    
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newValue.length, newValue.length);
    }, 100);
  };

  const addCustomTemplate = () => {
    if (!newTemplate.trim() || !value.trim()) return;

    const template: CommentTemplate = {
      id: `custom-${Date.now()}`,
      title: newTemplate.trim(),
      content: value.trim(),
      category: 'general'
    };

    saveCustomTemplates([...customTemplates, template]);
    setNewTemplate('');
  };

  const removeCustomTemplate = (templateId: string) => {
    const filtered = customTemplates.filter(t => t.id !== templateId);
    saveCustomTemplates(filtered);
  };

  const getCategoryColor = (category: CommentTemplate['category']) => {
    switch (category) {
      case 'approval': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'rejection': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'general': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatHistoryDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex items-center gap-1">
          {/* Templates Popover */}
          <Popover open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                title="Usar plantilla predefinida"
              >
                <Lightbulb className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
              <div className="p-4">
                <h4 className="text-sm font-medium mb-3">Plantillas de Comentarios</h4>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="group p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="text-sm font-medium">{template.title}</h5>
                        <div className="flex items-center gap-1">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getCategoryColor(template.category))}
                          >
                            {template.category === 'approval' ? 'Aprobación' :
                             template.category === 'rejection' ? 'Rechazo' : 'General'}
                          </Badge>
                          {template.id.startsWith('custom-') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeCustomTemplate(template.id);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.content}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Add custom template */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nombre de la plantilla..."
                      value={newTemplate}
                      onChange={(e) => setNewTemplate(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border rounded"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addCustomTemplate}
                      disabled={!newTemplate.trim() || !value.trim()}
                      title="Guardar comentario actual como plantilla"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Escribe un comentario y guárdalo como plantilla personalizada
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* History Popover */}
          {history.length > 0 && (
            <Popover open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  title="Ver historial de comentarios"
                >
                  <Clock className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4">
                  <h4 className="text-sm font-medium mb-3">Historial de Comentarios</h4>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleHistorySelect(item)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            <span className="text-xs font-medium">{item.createdBy}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatHistoryDate(item.createdAt)}
                          </span>
                        </div>
                        
                        {item.documentName && (
                          <Badge variant="outline" className="text-xs mb-2">
                            {item.documentName}
                          </Badge>
                        )}
                        
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {item.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Clear button */}
          {value && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange('')}
              disabled={disabled}
              title="Limpiar comentarios"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        onFocus={onFocus}
        rows={4}
        className="resize-vertical"
      />

      {value && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{value.length} caracteres</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(value);
            }}
            title="Copiar al portapapeles"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copiar
          </Button>
        </div>
      )}
    </div>
  );
}
