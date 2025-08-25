// ================================================
// SELECTOR DE TIPOS DE REPORTES - CORREGIDO VISUAL
// ================================================

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  Trophy, 
  Calendar, 
  Activity, 
  AlertTriangle,
  FileText,
  PieChart,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle
} from 'lucide-react';

export interface ReportType {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedTime: string;
  dataPoints: string[];
}

// FIXED: Updated report types to match API validation
const REPORT_TYPES: ReportType[] = [
  // Reportes Operacionales
  {
    id: 'validation-progress',
    name: 'Progreso de Validación',
    description: 'Estado actual del proceso de validación de documentos',
    category: 'Operacional',
    icon: <CheckCircle className="h-5 w-5" />,
    complexity: 'medium',
    estimatedTime: '2-3 min',
    dataPoints: ['Documentos validados', 'Pendientes de revisión', 'Rechazados', 'Porcentaje de avance']
  },
  {
    id: 'user-activity',
    name: 'Actividad de Usuarios',
    description: 'Seguimiento de la actividad y participación de usuarios',
    category: 'Operacional',
    icon: <Users className="h-5 w-5" />,
    complexity: 'medium',
    estimatedTime: '3-5 min',
    dataPoints: ['Sesiones activas', 'Tiempo promedio', 'Acciones realizadas', 'Distribución por región']
  },
  {
    id: 'document-status',
    name: 'Estado de Documentos',
    description: 'Vista general del estado de todos los documentos en el sistema',
    category: 'Operacional',
    icon: <FileText className="h-5 w-5" />,
    complexity: 'simple',
    estimatedTime: '1-2 min',
    dataPoints: ['Total documentos', 'Por categoría', 'Estados', 'Fechas de vencimiento']
  },
  
  // Reportes Ejecutivos
  {
    id: 'executive-summary',
    name: 'Resumen Ejecutivo',
    description: 'KPIs y métricas clave para la toma de decisiones estratégicas',
    category: 'Ejecutivo',
    icon: <PieChart className="h-5 w-5" />,
    complexity: 'complex',
    estimatedTime: '5-8 min',
    dataPoints: ['KPIs principales', 'Objetivos vs Resultados', 'Tendencias', 'Recomendaciones']
  },
  {
    id: 'final-results',
    name: 'Resultados Finales',
    description: 'Resultados consolidados de procesos y concursos finalizados',
    category: 'Ejecutivo',
    icon: <Trophy className="h-5 w-5" />,
    complexity: 'medium',
    estimatedTime: '4-6 min',
    dataPoints: ['Rankings', 'Puntuaciones finales', 'Estadísticas de participación', 'Ganadores']
  },
  
  // Reportes de Rendimiento
  {
    id: 'performance-dashboard',
    name: 'Dashboard de Rendimiento',
    description: 'Métricas de performance y análisis del sistema',
    category: 'Rendimiento',
    icon: <TrendingUp className="h-5 w-5" />,
    complexity: 'complex',
    estimatedTime: '6-10 min',
    dataPoints: ['Tiempo de respuesta', 'Throughput', 'Recursos utilizados', 'Carga del sistema']
  },
  {
    id: 'system-performance',
    name: 'Rendimiento del Sistema',
    description: 'Análisis detallado del rendimiento técnico de la plataforma',
    category: 'Rendimiento',
    icon: <Activity className="h-5 w-5" />,
    complexity: 'complex',
    estimatedTime: '5-8 min',
    dataPoints: ['CPU', 'Memoria', 'Base de datos', 'Network I/O']
  },
  {
    id: 'processing-times',
    name: 'Tiempos de Procesamiento',
    description: 'Análisis de tiempos de procesamiento de operaciones críticas',
    category: 'Rendimiento',
    icon: <Clock className="h-5 w-5" />,
    complexity: 'medium',
    estimatedTime: '3-5 min',
    dataPoints: ['Operaciones críticas', 'Tiempos promedio', 'Cuellos de botella', 'Optimizaciones']
  },
  
  // Reportes de Auditoría
  {
    id: 'audit-trail',
    name: 'Pista de Auditoría',
    description: 'Registro detallado de todas las acciones y cambios en el sistema',
    category: 'Auditoría',
    icon: <Shield className="h-5 w-5" />,
    complexity: 'complex',
    estimatedTime: '8-12 min',
    dataPoints: ['Log de acciones', 'Cambios de estado', 'Usuarios responsables', 'Timestamps']
  },
  {
    id: 'compliance-report',
    name: 'Reporte de Cumplimiento',
    description: 'Verificación del cumplimiento de normativas y procedimientos',
    category: 'Auditoría',
    icon: <CheckCircle className="h-5 w-5" />,
    complexity: 'complex',
    estimatedTime: '6-10 min',
    dataPoints: ['Normativas aplicables', 'Nivel de cumplimiento', 'Desviaciones', 'Plan de acción']
  },
  {
    id: 'security-report',
    name: 'Reporte de Seguridad',
    description: 'Análisis de la seguridad del sistema y detección de amenazas',
    category: 'Auditoría',
    icon: <Shield className="h-5 w-5" />,
    complexity: 'medium',
    estimatedTime: '4-6 min',
    dataPoints: ['Intentos de acceso', 'Vulnerabilidades', 'Incidentes', 'Nivel de riesgo']
  },
  {
    id: 'audit-report',
    name: 'Reporte de Auditoría General',
    description: 'Auditoría general del sistema y procesos operativos',
    category: 'Auditoría',
    icon: <AlertTriangle className="h-5 w-5" />,
    complexity: 'complex',
    estimatedTime: '10-15 min',
    dataPoints: ['Hallazgos', 'Recomendaciones', 'Riesgos identificados', 'Plan de mejoras']
  }
];

interface ReportTypesEnhancedProps {
  selectedType: string | null;
  onSelectType: (type: ReportType) => void;
}

export function ReportTypesEnhanced({ selectedType, onSelectType }: ReportTypesEnhancedProps) {
  const categories = [...new Set(REPORT_TYPES.map(type => type.category))];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-foreground">Selecciona el Tipo de Reporte</h3>
      </div>

      {categories.map((category) => {
        const categoryReports = REPORT_TYPES.filter(type => type.category === category);

        return (
          <div key={category} className="space-y-4">
            {/* Category Header */}
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <Badge variant="outline" className="text-sm font-medium">
                {category}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {categoryReports.length} {categoryReports.length === 1 ? 'reporte' : 'reportes'}
              </span>
            </div>

            {/* Category Reports */}
            <div className="grid gap-4 md:grid-cols-2">
              {categoryReports.map((reportType) => (
                <Card
                  key={reportType.id}
                  className={`cursor-pointer transition-all duration-200 border-2 ${
                    selectedType === reportType.id 
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
                      : 'border-border hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                  onClick={() => onSelectType(reportType)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        {reportType.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Header con título y badge de complejidad */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h4 className="font-semibold text-base text-foreground leading-tight">
                            {reportType.name}
                          </h4>
                          <Badge 
                            variant={
                              reportType.complexity === 'simple' ? 'default' :
                              reportType.complexity === 'medium' ? 'secondary' : 'destructive'
                            }
                            className="text-xs shrink-0"
                          >
                            {reportType.complexity === 'simple' ? 'Básico' :
                             reportType.complexity === 'medium' ? 'Intermedio' : 'Avanzado'}
                          </Badge>
                        </div>
                        
                        {/* Descripción */}
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                          {reportType.description}
                        </p>
                        
                        {/* Tiempo estimado */}
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Tiempo estimado: {reportType.estimatedTime}
                          </span>
                        </div>
                        
                        {/* Data Points */}
                        <div className="flex flex-wrap gap-2">
                          {reportType.dataPoints.slice(0, 3).map((point, index) => (
                            <Badge 
                              key={index}
                              variant="outline"
                              className="text-xs px-2 py-1"
                            >
                              {point}
                            </Badge>
                          ))}
                          {reportType.dataPoints.length > 3 && (
                            <Badge variant="outline" className="text-xs px-2 py-1">
                              +{reportType.dataPoints.length - 3} más
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Export the report types for use in other components
export { REPORT_TYPES };
