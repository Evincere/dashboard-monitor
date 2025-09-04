import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FileText, Maximize, Minimize, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiUrl } from '@/lib/utils';
import { DocumentViewerProps } from '../types';

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onNext,
  onPrevious,
  documents,
  stats,
  postulant,
  isFullscreen = false,
  onFullscreenToggle,
  onNextPostulation,
}) => {
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

  // Check if all required documents are validated
  const requiredDocs = documents?.filter((doc) => doc.isRequired) || [];
  const requiredValidated = requiredDocs.every(
    (doc) => doc.validationStatus !== "PENDING"
  );
  const showNextPostulationButton =
    postulant?.inscription?.state === "COMPLETED_WITH_DOCS" ||
    postulant?.inscription?.state === "PENDING" ||
    postulant?.inscription?.state === "APPROVED" ||
    postulant?.inscription?.state === "REJECTED";

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Selecciona un documento para visualizar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Viewer Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-card-foreground">
                {document.originalName || document.fileName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {document.documentType} •{" "}
                {(document.fileSize / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFullscreenToggle?.(!isFullscreen)}
              title={
                isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"
              }
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </Button>

            {showNextPostulationButton ? (
              <Button
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  console.log("🚀 Próxima Postulación clicked");
                  onNextPostulation?.();
                }}
              >
                <Target className="w-4 h-4 mr-2" />
                Próxima Postulación
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                {onPrevious && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrevious}
                    title="Documento anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={onNext}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Preview */}
      <div className="flex-1 bg-muted p-4">
        <div className="h-full bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          {document.fileName.toLowerCase().endsWith(".pdf") ? (
            <iframe
              key={`${document.id}-${iframeKey}`}
              src={apiUrl(`documents/${document.id}/view`)}
              className="w-full h-full border-0"
              title={document.originalName}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <img
                src={apiUrl(`documents/${document.id}/view`)}
                alt={document.originalName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
