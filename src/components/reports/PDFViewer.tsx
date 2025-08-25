'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';

// Import the correct authFetch function from auth-fetch library
import { authFetch } from "../../lib/auth-fetch";

// Create wrapped PDFDocument component to ensure type safety
const Document = dynamic(
  () => import('react-pdf').then((mod) => {
    if (typeof window !== "undefined") {
      // Configure worker for react-pdf
      import("react-pdf").then(({ pdfjs }) => {
        if (pdfjs && pdfjs.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = `/dashboard-monitor/pdf.worker.min.js`;
        }
      }).catch(console.error);
    }
    return { default: mod.Document };
  }),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Cargando visor PDF...</span>
      </div>
    ),
  }
);

// Create wrapped PDFPage component to ensure type safety
const Page = dynamic(
  () => import('react-pdf').then(({ Page }) => ({ default: Page })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8 bg-white border border-gray-200 rounded">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm">Cargando página...</span>
      </div>
    ),
  }
);

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

interface DocumentRecoveryInfo {
  isRecovered: boolean;
  isPlaceholder: boolean;
  recoveryType?: 'SIMILARITY_MATCH' | 'PLACEHOLDER';
  originalDocumentId?: string;
  recoveredDocumentId?: string;
  recoveryWarning?: string;
}

// Función auxiliar para obtener el token de autenticación
// Componente BlobViewer para manejar la carga autenticada de PDFs
const BlobViewer: React.FC<{
  url: string;
  onBlobReady: (blobUrl: string) => void;
  onError: (error: string) => void;
}> = ({ url, onBlobReady, onError }) => {
  useEffect(() => {
    if (typeof window === 'undefined' || !url) return;

    const loadPdfWithAuth = async () => {
      try {
        console.log('📥 Loading authenticated PDF with react-pdf:', url);

        const response = await authFetch(url);

        if (!response.ok) {
          throw new Error(`Error loading document: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        console.log('✅ PDF blob created for react-pdf');
        onBlobReady(blobUrl);

      } catch (error) {
        console.error('❌ Error loading PDF:', error);
        onError(error instanceof Error ? error.message : 'Error desconocido al cargar el PDF');
      }
    };

    loadPdfWithAuth();

    // Cleanup function
    return () => {
      // TODO: Revocar URLs de blob cuando se implemente el cleanup
    };
  }, [url, onBlobReady, onError]);

  return null;
};

export default function PDFViewer({
  pdfUrl,
  className = '',
  onError,
  onLoadSuccess,
  height = '100%',
  width = '100%'
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    onLoadSuccess?.(numPages);
  }, [onLoadSuccess]);

  const handleError = useCallback((error: Error) => {
    console.error('PDF load error with react-pdf:', error);
    setError(error.message);
    onError?.(error);
  }, [onError]);

  const handleBlobError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    onError?.(new Error(errorMessage));
  }, [onError]);

  return (
    <div className={`pdf-viewer relative ${className}`} style={{ height, width }}>
      {pdfUrl && !blobUrl && !error && (
        <BlobViewer
          url={pdfUrl}
          onBlobReady={setBlobUrl}
          onError={handleBlobError}
        />
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-red-500 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
            Error al cargar el reporte
          </div>
          <div className="text-sm text-gray-600 mb-4 max-w-md text-center">
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recargar PDF
          </button>
        </div>
      ) : blobUrl ? (
        <div className="h-full flex flex-col">
          <Document
            file={blobUrl}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={handleError}
            loading={
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Cargando documento...</span>
              </div>
            }
          >
            <Page
              key={`page_${pageNumber}_${scale}_${rotation}`}
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              loading={
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm">Cargando página {pageNumber}...</span>
                </div>
              }
            />
          </Document>

          <div className="flex items-center justify-between p-2 border-t">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm">
                Página {pageNumber} de {numPages}
              </span>
              <button
                onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-sm w-16 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(s => Math.min(2, s + 0.1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}
    </div>
  );
}
