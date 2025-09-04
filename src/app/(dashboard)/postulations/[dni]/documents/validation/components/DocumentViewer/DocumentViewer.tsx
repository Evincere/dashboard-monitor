import { Document } from '@/stores/validations/validation-store';
import { apiUrl } from '@/lib/utils';
import { ViewerControls } from '@/components/validation';
import { FileText, Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface DocumentViewerProps {
  document: Document | null;
  isFullscreen?: boolean;
  onFullscreenToggle?: (fullscreen: boolean) => void;
}

export const DocumentViewer = ({
  document,
  isFullscreen = false,
  onFullscreenToggle,
}: DocumentViewerProps) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [prevFullscreen, setPrevFullscreen] = useState(isFullscreen);

  useEffect(() => {
    if (prevFullscreen !== isFullscreen) {
      setTimeout(() => {
        setIframeKey((prev) => prev + 1);
      }, 100);
      setPrevFullscreen(isFullscreen);
    }
  }, [isFullscreen, prevFullscreen]);

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <FileText className="w-20 h-20 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Seleccione un documento para visualizar</p>
          <p className="text-muted-foreground/70 text-sm mt-2">
            Elija un documento de la lista para comenzar la validación
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Enhanced header with document info and controls */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-foreground">
            {document.documentType}
          </h3>
          <p className="text-sm text-muted-foreground">
            Documento seleccionado para validación
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <ViewerControls
            documentType={document.documentType}
            isFullscreen={isFullscreen}
            onFullscreenToggle={onFullscreenToggle}
          />
          {onFullscreenToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFullscreenToggle(!isFullscreen)}
              className="flex items-center gap-2"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  Salir pantalla completa
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  Pantalla completa
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Enhanced viewer area - Optimized for better visibility */}
      <div className="flex-1 p-2 bg-slate-50">
        <div className="h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {document.id ? (
            <iframe
              key={iframeKey}
              src={apiUrl(`documents/${document.id}/view`)}
              className="w-full h-full"
              title={document.documentType}
              style={{ 
                border: 'none',
                borderRadius: 'inherit',
                backgroundColor: '#ffffff',
                minHeight: '100%'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">
                  Documento no disponible para visualización
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
