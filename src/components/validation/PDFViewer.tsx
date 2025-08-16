'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, RefreshCw } from 'lucide-react';

// Configurar PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

/**
 * @fileOverview Componente PDFViewer para visualización de documentos PDF
 * Incluye funcionalidades de zoom, rotación, navegación y descarga
 */

interface PDFViewerProps {
  /** URL del documento PDF a visualizar */
  pdfUrl: string;
  /** DNI del postulante (para contexto) */
  dni?: string;
  /** Nombre del archivo */
  fileName?: string;
  /** Clase CSS adicional */
  className?: string;
  /** Callback cuando ocurre un error */
  onError?: (error: Error) => void;
  /** Callback cuando el documento se carga exitosamente */
  onLoadSuccess?: (numPages: number) => void;
  /** Altura del componente */
  height?: string;
  /** Ancho del componente */
  width?: string;
}

interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export default function PDFViewer({
  pdfUrl,
  dni,
  fileName,
  className = '',
  onError,
  onLoadSuccess,
  height = '600px',
  width = '100%'
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: true });

  // Función para manejar la carga exitosa del documento
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoadingState({ isLoading: false });
    onLoadSuccess?.(numPages);
    console.log(`📄 PDF loaded successfully: ${numPages} pages`);
  }, [onLoadSuccess]);

  // Función para manejar errores de carga
  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setLoadingState({ isLoading: false, error: error.message });
    onError?.(error);
  }, [onError]);

  // Función para recargar el PDF
  const reloadPDF = useCallback(() => {
    setLoadingState({ isLoading: true });
    setPageNumber(1);
    setScale(1.0);
    setRotation(0);
    // Force re-render by changing key would be handled by parent component
  }, []);

  // Funciones de navegación
  const goToPrevPage = useCallback(() => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  }, [numPages]);

  const goToPage = useCallback((page: number) => {
    setPageNumber(Math.max(1, Math.min(page, numPages)));
  }, [numPages]);

  // Funciones de zoom
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1.0);
  }, []);

  // Función de rotación
  const rotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Función de descarga
  const downloadPDF = useCallback(() => {
    if (pdfUrl && fileName) {
      const link = document.createElement('a');
      link.href = `${pdfUrl}?download=true`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [pdfUrl, fileName]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevPage();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNextPage();
          break;
        case '=':
        case '+':
          if (event.ctrlKey) {
            event.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (event.ctrlKey) {
            event.preventDefault();
            zoomOut();
          }
          break;
        case '0':
          if (event.ctrlKey) {
            event.preventDefault();
            resetZoom();
          }
          break;
        case 'r':
          if (event.ctrlKey) {
            event.preventDefault();
            rotate();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevPage, goToNextPage, zoomIn, zoomOut, resetZoom, rotate]);

  return (
    <div className={`pdf-viewer bg-white border border-gray-200 rounded-lg shadow-sm ${className}`} style={{ width, height }}>
      {/* Barra de herramientas */}
      <div className="pdf-toolbar flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {fileName ? `📄 ${fileName}` : 'Documento PDF'}
          </span>
          {dni && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              DNI: {dni}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {/* Navegación de páginas */}
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Página anterior (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-1 text-sm">
            <input
              type="number"
              value={pageNumber}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-12 px-1 py-0.5 text-center text-xs border border-gray-300 rounded"
              min={1}
              max={numPages}
            />
            <span className="text-gray-500">/ {numPages}</span>
          </div>

          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Página siguiente (→)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="mx-2 border-l border-gray-300 h-4" />

          {/* Controles de zoom */}
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Alejar (Ctrl + -)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs text-gray-600 min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Acercar (Ctrl + +)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="mx-2 border-l border-gray-300 h-4" />

          {/* Rotación */}
          <button
            onClick={rotate}
            className="p-1 text-gray-600 hover:text-gray-800"
            title="Rotar (Ctrl + R)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Recarga */}
          <button
            onClick={reloadPDF}
            className="p-1 text-gray-600 hover:text-gray-800"
            title="Recargar documento"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Descarga */}
          <button
            onClick={downloadPDF}
            className="p-1 text-gray-600 hover:text-gray-800"
            title="Descargar documento"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Área de visualización del PDF */}
      <div className="pdf-content overflow-auto bg-gray-100" style={{ height: 'calc(100% - 48px)' }}>
        {loadingState.isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Cargando documento...</span>
            </div>
          </div>
        )}

        {loadingState.error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6">
              <div className="text-red-500 text-2xl mb-2">⚠️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar el documento</h3>
              <p className="text-sm text-gray-600 mb-4">{loadingState.error}</p>
              <button
                onClick={reloadPDF}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        )}

        {!loadingState.isLoading && !loadingState.error && (
          <div className="flex justify-center p-4">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
              error=""
              noData=""
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                loading={
                  <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                }
                error={
                  <div className="flex items-center justify-center h-96 bg-gray-50 border border-gray-200 rounded">
                    <span className="text-gray-500">Error al cargar la página</span>
                  </div>
                }
                noData={
                  <div className="flex items-center justify-center h-96 bg-gray-50 border border-gray-200 rounded">
                    <span className="text-gray-500">No hay datos en esta página</span>
                  </div>
                }
              />
            </Document>
          </div>
        )}
      </div>

      {/* Indicador de atajos de teclado */}
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
        ← → Páginas | Ctrl +/- Zoom | Ctrl+R Rotar
      </div>
    </div>
  );
}
