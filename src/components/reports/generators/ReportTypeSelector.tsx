// ================================================
// SELECTOR DE TIPOS DE REPORTE - SPRINT 1.3
// ================================================

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, BarChart3, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: any;
  estimatedTime: string;
  format: string[];
  category: 'executive' | 'operational' | 'technical';
}

interface ReportTypeSelectorProps {
  onSelectType: (reportType: ReportType) => void;
  selectedType: ReportType | null;
  isGenerating?: boolean;
}

const REPORT_TYPES: ReportType[] = [
  {
    id: 'validation-progress',
    name: 'Progreso de Validación',
    description: 'Reporte detallado del estado actual de validaciones por usuario y documento',
    icon: BarChart3,
    estimatedTime: '2-3 min',
    format: ['PDF', 'Excel'],
    category: 'operational'
  },
  {
    id: 'final-results',
    name: 'Resultados Finales',
    description: 'Resumen ejecutivo de postulaciones completadas con estadísticas generales',
    icon: CheckCircle,
    estimatedTime: '1-2 min',
    format: ['PDF'],
    category: 'executive'
  },
  {
    id: 'audit-report',
    name: 'Reporte de Auditoría',
    description: 'Análisis técnico completo para auditoría administrativa y seguimiento',
    icon: AlertCircle,
    estimatedTime: '3-5 min',
    format: ['PDF', 'Excel'],
    category: 'technical'
  }
];

export function ReportTypeSelector({ onSelectType, selectedType, isGenerating = false }: ReportTypeSelectorProps) {
  const [selectedId, setSelectedId] = useState<string>(selectedType?.id || '');

  const handleSelection = (value: string) => {
    setSelectedId(value);
    const reportType = REPORT_TYPES.find(type => type.id === value);
    if (reportType) {
      onSelectType(reportType);
    }
  };

  const selectedReport = REPORT_TYPES.find(type => type.id === selectedId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Seleccionar Tipo de Reporte
        </CardTitle>
        <CardDescription>
          Elige el tipo de reporte que deseas generar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Reporte</label>
          <Select value={selectedId} onValueChange={handleSelection} disabled={isGenerating}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tipo de reporte..." />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{type.name}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Preview de la selección */}
        {selectedReport && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-start gap-3">
              <selectedReport.icon className="w-5 h-5 mt-0.5 text-primary" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{selectedReport.name}</h4>
                  <Badge variant="secondary" className="capitalize">
                    {selectedReport.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedReport.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedReport.estimatedTime}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {selectedReport.format.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
