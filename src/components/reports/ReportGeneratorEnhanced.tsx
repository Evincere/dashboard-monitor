// ================================================
// GENERADOR DE REPORTES - INTERFAZ CONSISTENTE
// ================================================

'use client';

import React, { useState, useCallback } from 'react';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Calendar,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Play
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import { ReportTypesEnhanced, type ReportType } from './ReportTypesEnhanced';
import { ReportViewer } from './ReportViewer';
import { useAuthenticatedFetch } from '@/lib/auth-fetch';
import { generateStableId } from '@/lib/utils/stable-id';

// Utility function for generating UUIDs
const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.randomUUID();
  }
  // Fallback for server-side
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

interface ReportFilters {
  dateRange: {
    start: string;
    end: string;
  };
  status: string;
  category: string;
  priority: string;
}

interface GeneratedReport {
  id: string;
  title: string;
  type: string;
  filters: ReportFilters;
  generatedAt: string;
  status: 'generating' | 'completed' | 'error';
  pdfUrl?: string;
  error?: string;
}

export function ReportGeneratorEnhanced() {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: { start: '', end: '' },
    status: 'all',
    category: 'all',
    priority: 'all'
  });
  const authFetch = useAuthenticatedFetch();
  const [generatedReports, setGeneratedReports] = usePersistentState<GeneratedReport[]>("dashboard-generated-reports", []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewerReport, setViewerReport] = useState<GeneratedReport | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mock generate report function
  const generateReport = useCallback(async () => {
    if (!selectedType) return;

    setIsGenerating(true);

    const newReport: GeneratedReport = {
      id: generateStableId('report'),
      title: selectedType.name,
      type: selectedType.category,
      filters: { ...filters },
      generatedAt: getStableDate(),
      status: 'generating'
    };

    setGeneratedReports(prev => [newReport, ...prev]);

    // Simulate report generation
    setTimeout(async () => {
      try {
        // FIXED: Use authFetch instead of regular fetch for authentication
        const response = await authFetch('/api/reports/generate', {
          method: 'POST',
          body: JSON.stringify({
            type: selectedType.id,
            format: 'PDF', // Add required format parameter
            filters,
            title: selectedType.name
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMessage = errorData?.error || `Error ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }

        const responseData = await response.json();

        // Handle successful response
        if (responseData.success) {
          setGeneratedReports(prev =>
            prev.map(report =>
              report.id === newReport.id
                ? {
                  ...report,
                  status: 'completed',
                  pdfUrl: responseData.downloadUrl
                }
                : report
            )
          );
        } else {
          throw new Error(responseData.error || 'Error al generar el reporte');
        }
      } catch (error) {
        console.error('Error generating report:', error);
        setGeneratedReports(prev =>
          prev.map(report =>
            report.id === newReport.id
              ? {
                ...report,
                status: 'error',
                error: error instanceof Error ? error.message : 'Error desconocido'
              }
              : report
          )
        );
      }

      setIsGenerating(false);
    }, 3000);
  }, [selectedType, filters]);

  // Stable date formatting function
  const getStableDate = () => {
    const now = new Date();
    return now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0');
  };

  // Clear history function

  // Save session info
  const updateLastAccess = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-last-access', new Date().toISOString());
    }
  }, []);
  const clearHistory = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleViewReport = useCallback((report: GeneratedReport) => {
    if (report.status === 'completed' && report.pdfUrl) {
      setViewerReport(report);
      setIsViewerOpen(true);
    }
  }, []);

  const handleDeleteReport = useCallback((reportId: string) => {
    setGeneratedReports(prev => prev.filter(report => report.id !== reportId));
  }, []);

  const getStatusIcon = (status: GeneratedReport['status']) => {
    switch (status) {
      case 'generating':
        return <Clock className="h-4 w-4 text-orange-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusLabel = (status: GeneratedReport['status']) => {
    switch (status) {
      case 'generating':
        return 'Generando...';
      case 'completed':
        return 'Completado';
      case 'error':
        return 'Error';
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generador de Reportes
          </CardTitle>
          <CardDescription>
            Configura y genera reportes personalizados del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportTypesEnhanced
            selectedType={selectedType?.id || null}
            onSelectType={setSelectedType}
          />
        </CardContent>
      </Card>

      {/* Filters Configuration */}
      {selectedType && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Configuración de Filtros
            </CardTitle>
            <CardDescription>
              Personaliza los parámetros del reporte seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start-date">Fecha de inicio</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Fecha de fin</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="status-filter">Estado</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-filter">Categoría</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    <SelectItem value="academic">Académico</SelectItem>
                    <SelectItem value="sports">Deportes</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority-filter">Prioridad</Label>
                <Select
                  value={filters.priority}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las prioridades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las prioridades</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={generateReport}
                disabled={isGenerating}
                className="min-w-[140px]"
              >
                {isGenerating ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Generar Reporte
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Reports History */}
      {generatedReports.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historial de Reportes
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={clearHistory}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar Historial
              </Button>
            </div>
            <CardDescription>
              Reportes generados recientemente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 dark:hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(report.status)}
                    <div>
                      <h4 className="font-medium text-foreground">{report.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary">{report.type}</Badge>
                        <span>•</span>
                        <span>{report.generatedAt}</span>
                        <span>•</span>
                        <span>{getStatusLabel(report.status)}</span>
                      </div>
                      {report.status === 'error' && report.error && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{report.error}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {report.status === 'completed' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (report.pdfUrl) {
                              const link = document.createElement('a');
                              link.href = report.pdfUrl;
                              link.download = `${report.title.replace(/\s+/g, '_')}.pdf`;
                              link.click();
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Descargar
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReport(report.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Viewer Modal */}
      <ReportViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        reportData={viewerReport ? {
          title: viewerReport.title,
          type: viewerReport.type,
          generateDate: viewerReport.generatedAt,
          pdfUrl: viewerReport.pdfUrl
        } : null}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]" aria-describedby="delete-dialog-description">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <p id="delete-dialog-description" className="text-muted-foreground">
              Esta acción eliminará todos los reportes generados del historial. Los reportes ya generados seguirán disponibles en el servidor.
            </p>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <p>¿Estás seguro de que quieres eliminar todo el historial de reportes?</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setGeneratedReports([]);
                setShowDeleteConfirm(false);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
