import { Document } from '@/stores/validations/validation-store';
import { ValidationForm, ValidationStatus } from '@/components/validation';
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ValidationPanelProps {
  document: Document | null;
  onApprove: () => void;
  onReject: () => void;
  onRevertStatus: () => void;
  submitting: boolean;
  comments: string;
  onCommentsChange: (value: string) => void;
}

export const ValidationPanel = ({
  document,
  onApprove,
  onReject,
  onRevertStatus,
  submitting,
  comments,
  onCommentsChange,
}: ValidationPanelProps) => {
  if (!document) {
    return (
      <div className="h-full flex items-center justify-center p-6 border-l border-border bg-background">
        <div className="text-center">
          <FileText className="w-20 h-20 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Seleccione un documento</p>
          <p className="text-muted-foreground/70 text-sm mt-2">
            Elija un documento para comenzar la validación
          </p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'APPROVED': 'bg-green-100 text-green-800 border-green-300',
      'REJECTED': 'bg-red-100 text-red-800 border-red-300',
      'PENDING': 'bg-blue-100 text-blue-800 border-blue-300',
    } as const;

    return (
      <Badge variant="outline" className={`${variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'} border`}>
        <div className="flex items-center gap-2">
          {getStatusIcon(status)}
          {status === 'APPROVED' ? 'Aprobado' : 
           status === 'REJECTED' ? 'Rechazado' : 
           status === 'PENDING' ? 'Pendiente' : 'Desconocido'}
        </div>
      </Badge>
    );
  };

  return (
    <div className="h-full flex flex-col border-l border-border bg-background">
      {/* Enhanced header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Panel de Validación</h2>
          {getStatusBadge(document.validationStatus)}
        </div>
        
        {/* Document info card */}
        <div className="bg-card border border-border rounded-lg p-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-foreground mb-1">
                {document.documentType}
              </h4>
              <p className="text-xs text-muted-foreground break-words">
                ID: {document.id}
              </p>
              {document.createdAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Creado: {new Date(document.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Validation content */}
      <div className="flex-1 overflow-y-auto p-4">
        {document.validationStatus === "PENDING" ? (
          <ValidationForm
            document={document}
            onApprove={onApprove}
            onReject={onReject}
            submitting={submitting}
            comments={comments}
            onCommentsChange={onCommentsChange}
          />
        ) : (
          <ValidationStatus
            document={document}
            onRevertStatus={onRevertStatus}
            submitting={submitting}
          />
        )}
      </div>
      
      {/* Quick actions footer */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="text-xs text-muted-foreground text-center">
          Documento {document.validationStatus === 'PENDING' ? 'pendiente de' : 'procesado con'} validación
        </div>
      </div>
    </div>
  );
};
