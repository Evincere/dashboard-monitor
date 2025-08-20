'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, RefreshCw } from 'lucide-react';
import { apiUrl } from '@/lib/utils';

// Configurar PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

/**
 * @fileOverview Componente PDFViewer para visualización de documentos PDF
 * Incluye funcionalidades de zoom, rotación, navegación y descarga con autenticación
 */

interface PDFViewerProps {
  /** ID del documento a visualizar */
  documentId?: string;
  /** URL del documento PDF (alternativa a documentId) */
  pdfUrl?: string;
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

// Función auxiliar para obtener el token de autenticación
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};

// Función auxiliar para fetch autenticado
const authFetch = async (url: string): Promise<Response> => {
  const token = getAuthToken();
  
  return fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/pdf',
    },
  });
};

// Componente BlobViewer para manejar la carga autenticada de PDFs
const BlobViewer: React.FC<{ 
  documentId: string;
  onBlobReady: (blobUrl: string) => void;
  onError: (error: string) => void;
}> = ({ documentId, onBlobReady, onError }) => {
  useEffect(() => {
    if (typeof window === 'undefined' || !documentId) return;

    const loadPdfWithAuth = async () => {
      try {
        const documentUrl = `${apiUrl}/validation/document/${documentId}`;
        console.log('📄 Loading PDF with authentication from:', documentUrl);
        
        const response = await authFetch(documentUrl);
        
        if (!response.ok) {
          throw new Error(`Error loading document: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error('Document is empty');
        }

        const blobUrl = URL.createObjectURL(blob);
        console.log('📄 PDF blob created successfully, size:', blob.size, 'bytes');
        onBlobReady(blobUrl);
      } catch (error) {
        console.error('❌ Error loading PDF:', error);
        onError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    loadPdfWithAuth();
  }, [documentId, onBlobReady, onError]);

  return null;
};

export default function PDFViewer({
  documentId,
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

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
    
    // Si hay un blob URL anterior, revocarlo
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  }, [blobUrl]);

  // Limpiar blob URL al desmontar el componente
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Funciones de navegación
  const goToPrevPage = useCallback(() => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  }, [pageNumber]);

  const goToNextPage = useCallback(() => {
    if (pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    }
  }, [pageNumber, numPages]);

  // Funciones de zoom
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  // Función de rotación
  const rotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Función de descarga
  const downloadPDF = useCallback(async () => {
    try {
      let downloadUrl = pdfUrl;
      
      if (documentId && !pdfUrl) {
        const response = await authFetch(`${apiUrl}/validation/document/${documentId}`);
        if (!response.ok) throw new Error('Error downloading document');
        
        const blob = await response.blob();
        downloadUrl = URL.createObjectURL(blob);
      }

      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Si creamos un blob URL, revocarlo después de la descarga
        if (documentId && !pdfUrl) {
          setTimeout(() => URL.revokeObjectURL(downloadUrl!), 100);
        }
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      onError?.(error as Error);
    }
  }, [documentId, pdfUrl, fileName, onError]);

  // Manejadores para BlobViewer
  const handleBlobReady = useCallback((newBlobUrl: string) => {
    setBlobUrl(newBlobUrl);
    setLoadingState({ isLoading: false });
  }, []);

  const handleBlobError = useCallback((error: string) => {
    setLoadingState({ isLoading: false, error });
    onError?.(new Error(error));
  }, [onError]);

  // Determinar la URL a usar
  const documentUrl = blobUrl || pdfUrl;

  return (
    <div className={`pdf-viewer-container ${className}`} style={{ height, width }}>
      {/* BlobViewer para documentos con documentId */}
      {documentId && !pdfUrl && !blobUrl && (
        <BlobViewer
          documentId={documentId}
          onBlobReady={handleBlobReady}
          onError={handleBlobError}
        />
      )}

      {/* Barra de herramientas */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          {/* Controles de navegación */}
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1 || loadingState.isLoading}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-sm font-medium px-2">
            {loadingState.isLoading ? '-' : pageNumber} de {loadingState.isLoading ? '-' : numPages}
          </span>
          
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages || loadingState.isLoading}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Controles de zoom */}
          <button
            onClick={zoomOut}
            disabled={loadingState.isLoading || scale <= 0.5}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="text-sm font-medium px-2 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <button
            onClick={zoomIn}
            disabled={loadingState.isLoading || scale >= 3.0}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Control de rotación */}
          <button
            onClick={rotate}
            disabled={loadingState.isLoading}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Rotar"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Control de recarga */}
          <button
            onClick={reloadPDF}
            disabled={loadingState.isLoading}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loadingState.isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Control de descarga */}
          <button
            onClick={downloadPDF}
            disabled={loadingState.isLoading}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Descargar"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Área de visualización del PDF */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4" style={{ height: 'calc(100% - 60px)' }}>
        {loadingState.error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <RefreshCw className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error al cargar el documento</h3>
              <p className="text-sm text-red-700 mb-4">{loadingState.error}</p>
              <button
                onClick={reloadPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        ) : loadingState.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-600" />
              <p className="text-lg font-medium text-gray-600">Cargando documento...</p>
              <p className="text-sm text-gray-500 mt-1">
                {fileName && `${fileName}`}
              </p>
            </div>
          </div>
        ) : documentUrl ? (
          <div className="flex justify-center">
            <Document
              file={documentUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Procesando PDF...</span>
                </div>
              }
              error={
                <div className="text-center p-8 text-red-600">
                  <p>Error al procesar el documento PDF.</p>
                  <button
                    onClick={reloadPDF}
                    className="mt-2 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded"
                  >
                    Reintentar
                  </button>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                loading={
                  <div className="flex items-center justify-center p-8 bg-white border border-gray-200 rounded">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm">Cargando página...</span>
                  </div>
                }
                error={
                  <div className="text-center p-8 bg-white border border-gray-200 rounded text-red-600">
                    <p>Error al cargar la página {pageNumber}</p>
                  </div>
                }
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No hay documento para mostrar</p>
              <p className="text-sm mt-1">Selecciona un documento válido</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
