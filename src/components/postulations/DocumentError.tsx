"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  Server,
  HardDrive,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

interface DocumentErrorProps {
  document: {
    id: string;
    fileName: string;
    originalName?: string;
    filePath?: string;
    fileSize?: number;
  };
  error?: string;
  onRetry?: () => void;
  onRejectAsCorrupted?: () => void;
  className?: string;
}

export default function DocumentError({ 
  document, 
  error = "Document file not found",
  onRetry,
  onRejectAsCorrupted,
  className = ""
}: DocumentErrorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const { toast } = useToast();
  
  // Determinar si mostrar como archivo corrupto
  const isFileCorruptionError = 
    error.includes("Error loading") || 
    error.includes("Document file not found") ||
    error.includes("file not found") ||
    error.includes("not accessible");
  
  const displayTitle = isFileCorruptionError ? "Archivo Corrupto" : "Documento No Disponible";
  const displayMessage = isFileCorruptionError 
    ? "El archivo se encuentra corrupto, posiblemente debido a interrupciones durante el proceso de carga ocasionadas por conexiones inestables."
    : "El archivo del documento no está disponible en este momento";

  const handleDownloadAttempt = async () => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = document.originalName || document.fileName;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        console.log("Download error response:", errorData);
        toast({
          title: "Error de descarga",
          description: errorData.message || "No se pudo descargar el archivo",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Download error:", err);
      toast({
        title: "Error de descarga",
        description: "No se pudo descargar el archivo",
        variant: "destructive"
      });
    }
  };

  const handleCopyDocumentId = () => {
    navigator.clipboard.writeText(document.id);
    toast({
      title: "Copiado",
      description: "ID del documento copiado al portapapeles"
    });
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/view`);
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Documento disponible",
          description: "El documento ahora está disponible",
          variant: "default"
        });
        if (onRetry) onRetry();
      } else {
        console.log("Status check response:", data);
        toast({
          title: "Documento no disponible",
          description: data.message || "El archivo aún no está disponible",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Status check error:", err);
      toast({
        title: "Error de verificación",
        description: "No se pudo verificar el estado del documento",
        variant: "destructive"
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <div className={`flex items-center justify-center h-full p-6 ${className}`}>
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className={`p-3 rounded-full ${isFileCorruptionError 
            ? 'bg-red-100 dark:bg-red-900/20' 
            : 'bg-orange-100 dark:bg-orange-900/20'}`}>
            <AlertTriangle className={`w-8 h-8 ${isFileCorruptionError 
              ? 'text-red-600 dark:text-red-400' 
              : 'text-orange-600 dark:text-orange-400'}`} />
          </div>
        </div>
        <CardTitle className="text-xl text-center">{displayTitle}</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Error Message */}
          <div className="text-center">
            <p className="text-muted-foreground mb-2">
              {displayMessage}
            </p>
            {isFileCorruptionError && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>Posibles causas:</strong> Pérdida de conexión durante la subida, 
                  transferencia incompleta de datos, o problemas en el servidor durante el almacenamiento.
                </p>
              </div>
            )}
            {error && !isFileCorruptionError && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                {error}
              </Badge>
            )}
          </div>

          {/* Document Info */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Información del Documento
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="text-right max-w-[60%] break-words">
                  {document.originalName || document.fileName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">
                    {document.id.slice(0, 8)}...
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyDocumentId}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {document.fileSize && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tamaño:</span>
                  <span>{(document.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={handleCheckStatus}
                disabled={checkingStatus}
              >
                {checkingStatus ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {checkingStatus ? "Verificando..." : "Verificar Estado"}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleDownloadAttempt}
              >
                <Download className="w-4 h-4 mr-2" />
                Intentar Descarga
              </Button>
            </div>

            {onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Recargar Vista
              </Button>
            )}
            
            {isFileCorruptionError && onRejectAsCorrupted && (
              <Button 
                onClick={onRejectAsCorrupted} 
                variant="destructive"
                className="w-full"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rechazar como Archivo Corrupto
              </Button>
            )}
          </div>

          {/* Technical Details (Collapsible) */}
          <Collapsible>
            <CollapsibleTrigger 
              className="flex items-center justify-center w-full p-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowDetails(!showDetails)}
            >
              <span>Detalles Técnicos</span>
              {showDetails ? (
                <ChevronUp className="w-4 h-4 ml-1" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-1" />
              )}
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-3">
              <div className="bg-muted/20 rounded-lg p-4 text-xs space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Server className="w-4 h-4" />
                  <span className="font-medium">Posibles Causas:</span>
                </div>
                
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-6">
                  {isFileCorruptionError ? (
                    <>
                      <li>Interrupción de la conexión durante la subida del archivo</li>
                      <li>Transferencia de datos incompleta o corrompida</li>
                      <li>Problemas temporales en el servidor durante el almacenamiento</li>
                      <li>Archivo dañado en el origen antes de la subida</li>
                      <li>Problemas de codificación o formato del archivo</li>
                    </>
                  ) : (
                    <>
                      <li>El volumen de almacenamiento de documentos no está montado</li>
                      <li>El archivo se movió o eliminó del servidor</li>
                      <li>Problemas de permisos de acceso al archivo</li>
                      <li>La ruta de configuración de documentos es incorrecta</li>
                    </>
                  )}
                </ul>

                <div className="flex items-center gap-2 text-muted-foreground mt-3">
                  <HardDrive className="w-4 h-4" />
                  <span className="font-medium">Información del Sistema:</span>
                </div>
                
                <div className="space-y-1 text-muted-foreground ml-6">
                  <div>Ruta esperada: {document.filePath || 'No especificada'}</div>
                  <div>Error: {error}</div>
                  <div>Timestamp: {new Date().toISOString()}</div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Help Text */}
          <div className="text-center text-xs text-muted-foreground">
            Si el problema persiste, contacte al administrador del sistema
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
