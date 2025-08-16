'use client';

import { useState } from 'react';
import { Upload, File, X, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Label } from './label';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  label: string;
  acceptedTypes: string[];
  maxSize: number; // en MB
  currentUrl?: string;
  contestId: string;
  fileType: 'bases' | 'description';
  onUpload: (url: string) => void;
  onRemove?: () => void;
}

export function FileUpload({
  label,
  acceptedTypes,
  maxSize,
  currentUrl,
  contestId,
  fileType,
  onUpload,
  onRemove
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    // Validaciones
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: 'Tipo de archivo no válido',
        description: 'Solo se permiten archivos PDF y Word.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: `El archivo no puede superar los ${maxSize}MB.`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contestId', contestId);
      formData.append('fileType', fileType);

      const response = await fetch('/api/contests/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onUpload(result.data.url);
        toast({
          title: 'Archivo subido exitosamente',
          description: `${file.name} se ha cargado correctamente.`,
          className: 'bg-green-600 border-green-600 text-white'
        });
      } else {
        throw new Error(result.error || 'Error al subir archivo');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error al subir archivo',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {currentUrl ? (
        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted">
          <File className="h-4 w-4" />
          <a 
            href={currentUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 text-sm text-blue-600 hover:underline truncate"
          >
            {currentUrl.split('/').pop()}
          </a>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              className="h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary/10'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Subiendo archivo...</span>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Arrastra y suelta un archivo aquí, o haz clic para seleccionar
              </p>
              <Button type="button" variant="outline" size="sm">
                Seleccionar archivo
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Máximo {maxSize}MB • PDF, DOC, DOCX
              </p>
            </>
          )}
          
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept={acceptedTypes.join(',')}
            onChange={handleInputChange}
            disabled={uploading}
          />
        </div>
      )}
    </div>
  );
}
