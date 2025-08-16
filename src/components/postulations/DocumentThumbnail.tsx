'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  Download,
  Eye,
  AlertCircle,
  Paperclip
} from 'lucide-react';
import { DocumentTypeBadge } from '@/components/ui/document-type-badge';

interface DocumentData {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  documentType: string;
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isRequired: boolean;
  uploadDate: string;
  validatedAt?: string;
  validatedBy?: string;
  comments?: string;
  rejectionReason?: string;
  thumbnailUrl?: string;
}

interface DocumentThumbnailProps {
  document: DocumentData;
  viewMode: 'grid' | 'list';
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

// Función para obtener el icono y color según el estado de validación
function getValidationStatusDisplay(status: string) {
  switch (status) {
    case 'APPROVED':
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200/50 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20',
        text: 'Aprobado',
        overlayColor: 'bg-emerald-500/90',
        statusBar: 'bg-emerald-500',
        iconColor: 'text-emerald-600 dark:text-emerald-400'
      };
    case 'REJECTED':
      return {
        icon: <XCircle className="w-4 h-4" />,
        color: 'bg-red-500/10 text-red-700 border-red-200/50 dark:bg-red-400/10 dark:text-red-300 dark:border-red-400/20',
        text: 'Rechazado',
        overlayColor: 'bg-red-500/90',
        statusBar: 'bg-red-500',
        iconColor: 'text-red-600 dark:text-red-400'
      };
    default:
      return {
        icon: <Clock className="w-4 h-4" />,
        color: 'bg-blue-500/10 text-blue-700 border-blue-200/50 dark:bg-blue-400/10 dark:text-blue-300 dark:border-blue-400/20',
        text: 'Pendiente',
        overlayColor: 'bg-blue-500/90',
        statusBar: 'bg-blue-500',
        iconColor: 'text-blue-600 dark:text-blue-400'
      };
  }
}

// Función para formatear el tamaño del archivo
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para obtener el icono del tipo de archivo
function getFileTypeIcon(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return <FileText className="w-8 h-8 text-red-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="w-8 h-8 text-blue-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <FileText className="w-8 h-8 text-green-500" />;
    default:
      return <Paperclip className="w-8 h-8 text-slate-500" />;
  }
}

export default function DocumentThumbnail({
  document,
  viewMode,
  onClick,
  selected = false,
  className = ''
}: DocumentThumbnailProps) {
  const validationDisplay = getValidationStatusDisplay(document.validationStatus);

  if (viewMode === 'list') {
    return (
      <Card 
        className={`group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-black/5 ${
          selected ? 'ring-2 ring-blue-500 shadow-lg bg-blue-50/50 dark:bg-blue-900/10' : 'hover:ring-1 hover:ring-slate-200 dark:hover:ring-slate-700'
        } ${className} bg-white dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60`}
        onClick={onClick}
      >
        <CardContent className="p-0">
          {/* Status bar */}
          <div className={`h-1 w-full ${validationDisplay.statusBar}`}></div>
          
          <div className="p-4">
            <div className="flex items-center space-x-4">
              {/* File Icon */}
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-600 group-hover:shadow-md transition-shadow">
                  {getFileTypeIcon(document.fileName)}
                </div>
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {document.originalName || document.fileName}
                  </h3>
                  {document.isRequired && (
                    <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full p-1 flex-shrink-0" title="Documento obligatorio">
                      <AlertCircle className="w-3 h-3" />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-medium">{formatFileSize(document.fileSize)}</span>
                  <span>•</span>
                  <span>
                    {new Date(document.uploadDate).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>

              {/* Document Type */}
              <div className="flex-shrink-0">
                <DocumentTypeBadge documentType={document.documentType} variant="compact" />
              </div>

              {/* Validation Status */}
              <div className="flex-shrink-0">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${validationDisplay.color}`}>
                  <span className={validationDisplay.iconColor}>
                    {validationDisplay.icon}
                  </span>
                  <span>{validationDisplay.text}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500 transition-colors">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Comments/Rejection Reason */}
            {(document.comments || document.rejectionReason) && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {document.rejectionReason || document.comments}
                  </p>
                  {document.validatedBy && document.validatedAt && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 font-medium">
                      Por {document.validatedBy} • {new Date(document.validatedAt).toLocaleString('es-ES')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card 
      className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1 ${
        selected ? 'ring-2 ring-blue-500 shadow-xl' : 'hover:ring-1 hover:ring-slate-200 dark:hover:ring-slate-700'
      } ${className} relative overflow-hidden bg-white dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60`}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Status bar */}
        <div className={`h-1 w-full ${validationDisplay.statusBar}`}></div>

        <div className="p-4">
          {/* Required indicator */}
          {document.isRequired && (
            <div className="absolute top-3 right-3 z-10">
              <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full p-1" title="Documento obligatorio">
                <AlertCircle className="w-3 h-3" />
              </div>
            </div>
          )}

          {/* File Preview/Icon */}
          <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden border border-slate-100 dark:border-slate-700">
            {document.thumbnailUrl ? (
              <img 
                src={document.thumbnailUrl} 
                alt={document.originalName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <div className="p-3 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                  {getFileTypeIcon(document.fileName)}
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                  {document.fileName.split('.').pop()?.toUpperCase()}
                </span>
              </div>
            )}

            {/* Status overlay on preview */}
            {document.validationStatus !== 'PENDING' && (
              <div className={`absolute inset-0 ${validationDisplay.overlayColor} flex items-center justify-center backdrop-blur-sm`}>
                <div className="text-white text-center">
                  <div className="bg-white/20 rounded-full p-2 mb-2">
                    {React.cloneElement(validationDisplay.icon, { className: "w-6 h-6" })}
                  </div>
                  <div className="text-sm font-semibold">
                    {validationDisplay.text}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="space-y-3">
            {/* Title */}
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {document.originalName || document.fileName}
            </h3>

            {/* Document Type Badge */}
            <DocumentTypeBadge documentType={document.documentType} variant="compact" />

            {/* File metadata */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">{formatFileSize(document.fileSize)}</span>
              <span>{new Date(document.uploadDate).toLocaleDateString('es-ES')}</span>
            </div>

            {/* Validation Status */}
            <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${validationDisplay.color}`}>
              <span className={validationDisplay.iconColor}>
                {validationDisplay.icon}
              </span>
              <span>{validationDisplay.text}</span>
            </div>

            {/* Comments indicator */}
            {(document.comments || document.rejectionReason) && (
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {document.rejectionReason || document.comments}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
