import React from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { DocumentListProps, DocumentListItemProps } from '../types';
import { Progress } from '@/components/ui/progress';
import { DocumentTypeBadge } from '@/components/ui/document-type-badge';

export const DocumentListItem: React.FC<DocumentListItemProps> = ({
  document,
  isActive,
  onClick,
  statusIcon,
  statusColor,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
        isActive
          ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : statusColor
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{statusIcon}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm text-card-foreground truncate">
              {document.originalName || document.fileName}
            </h4>
            {document.isRequired && (
              <div
                className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full p-0.5"
                title="Documento obligatorio"
              >
                <AlertTriangle className="w-3 h-3" />
              </div>
            )}
          </div>

          <DocumentTypeBadge
            documentType={document.documentType}
            variant="compact"
          />

          <div className="text-xs text-muted-foreground mt-1">
            {(document.fileSize / 1024 / 1024).toFixed(1)} MB
          </div>
        </div>
      </div>
    </div>
  );
};

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  currentDocument,
  onDocumentSelect,
  stats,
}) => {
  const pendingDocs = documents.filter(
    (doc) => doc.validationStatus === "PENDING"
  );
  const approvedDocs = documents.filter(
    (doc) => doc.validationStatus === "APPROVED"
  );
  const rejectedDocs = documents.filter(
    (doc) => doc.validationStatus === "REJECTED"
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "REJECTED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800";
      case "REJECTED":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      default:
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Progress Header */}
      <div className="p-4 border-b border-border">
        <div className="text-sm text-muted-foreground mb-2">
          Progreso: {stats.approved + stats.rejected}/{stats.total} documentos
        </div>
        <Progress
          value={((stats.approved + stats.rejected) / stats.total) * 100}
          className="h-2"
        />

        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
          <div className="text-center">
            <div className="font-semibold text-blue-600">{stats.pending}</div>
            <div className="text-slate-500">Pendientes</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-emerald-600">
              {stats.approved}
            </div>
            <div className="text-slate-500">Aprobados</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-red-600">{stats.rejected}</div>
            <div className="text-slate-500">Rechazados</div>
          </div>
        </div>
      </div>

      {/* Document Lists */}
      <div className="flex-1 overflow-y-auto">
        {pendingDocs.length > 0 && (
          <div className="p-3">
            <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Pendientes ({pendingDocs.length})
            </h3>
            <div className="space-y-2">
              {pendingDocs.map((doc) => (
                <DocumentListItem
                  key={doc.id}
                  document={doc}
                  isActive={doc.id === currentDocument?.id}
                  onClick={() => onDocumentSelect(doc)}
                  statusIcon={getStatusIcon(doc.validationStatus)}
                  statusColor={getStatusColor(doc.validationStatus)}
                />
              ))}
            </div>
          </div>
        )}

        {approvedDocs.length > 0 && (
          <div className="p-3 border-t border-border">
            <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Aprobados ({approvedDocs.length})
            </h3>
            <div className="space-y-2">
              {approvedDocs.map((doc) => (
                <DocumentListItem
                  key={doc.id}
                  document={doc}
                  isActive={doc.id === currentDocument?.id}
                  onClick={() => onDocumentSelect(doc)}
                  statusIcon={getStatusIcon(doc.validationStatus)}
                  statusColor={getStatusColor(doc.validationStatus)}
                />
              ))}
            </div>
          </div>
        )}

        {rejectedDocs.length > 0 && (
          <div className="p-3 border-t border-border">
            <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Rechazados ({rejectedDocs.length})
            </h3>
            <div className="space-y-2">
              {rejectedDocs.map((doc) => (
                <DocumentListItem
                  key={doc.id}
                  document={doc}
                  isActive={doc.id === currentDocument?.id}
                  onClick={() => onDocumentSelect(doc)}
                  statusIcon={getStatusIcon(doc.validationStatus)}
                  statusColor={getStatusColor(doc.validationStatus)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentList;
