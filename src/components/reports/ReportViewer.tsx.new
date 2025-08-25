// ================================================
// VISOR DE REPORTES PDF - USANDO REACT-PDF
// ================================================

'use client';

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Eye,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';
import PDFViewer from '@/components/reports/PDFViewer';

interface ReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: {
    title: string;
    type: string;
    generateDate: string;
    pdfUrl?: string;
  } | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ReportViewer({
  isOpen,
  onClose,
  reportData,
  isLoading = false,
  error = null,
  onRetry
}: ReportViewerProps) {
  const dialogDescription = reportData ? `Visualizando el reporte "${reportData.title}" generado el ${reportData.generateDate}` : 'Visor de reportes PDF';
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const onDocumentLoadSuccess = useCallback((numPages: number) => {
    setNumPages(numPages);
    setPdfError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error al cargar el PDF:', error);
    setPdfError(error.message);
  }, []);

  const showError = error || pdfError;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-none">
          <div className="flex items-center justify-between">
            <DialogTitle>
              {reportData?.title || 'Reporte'}
            </DialogTitle>
            {reportData?.type && (
              <Badge variant="outline" className="ml-2">
                {reportData.type}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {dialogDescription}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <h3 className="text-lg font-medium mb-2">Cargando reporte...</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Por favor espere mientras se prepara el reporte
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && showError && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium text-red-500 mb-2">Error al cargar el reporte</h3>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
                  {showError}
                </p>
                {onRetry && (
                  <Button
                    onClick={onRetry}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Reintentar carga
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {!isLoading && !showError && reportData?.pdfUrl && (
            <div className="flex justify-center bg-gray-100 p-4 rounded-lg">
              <PDFViewer
                pdfUrl={reportData.pdfUrl}
                className="w-full max-w-4xl h-[80vh]"
                onLoadSuccess={onDocumentLoadSuccess}
                onError={onDocumentLoadError}
              />
            </div>
          )}

          {!isLoading && !showError && !reportData?.pdfUrl && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Reporte no disponible</h3>
                <p className="text-sm text-muted-foreground text-center">
                  El PDF del reporte no está disponible para visualización
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
