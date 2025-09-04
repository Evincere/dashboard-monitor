import { Document, ValidationStatus } from '@/stores/validations/validation-store';
import { ValidationStats } from '../../types/validation.types';
import { Progress } from '@/components/ui/progress';
import { DocumentListItem } from '@/components/validation';

interface DocumentListProps {
  documents: Document[];
  currentDocument: Document | null;
  onDocumentSelect: (doc: Document) => void;
  stats: ValidationStats;
}

export const DocumentList = ({
  documents,
  currentDocument,
  onDocumentSelect,
  stats,
}: DocumentListProps) => {
  const pendingDocs = documents.filter(doc => doc.validationStatus === "PENDING");
  const approvedDocs = documents.filter(doc => doc.validationStatus === "APPROVED");
  const rejectedDocs = documents.filter(doc => doc.validationStatus === "REJECTED");

  return (
    <div className="h-full flex flex-col border-r border-border bg-background">
      {/* Header with progress */}
      <div className="p-4 border-b border-border bg-muted/30">
        <h2 className="font-semibold text-lg mb-3">Documentos</h2>
        <div className="text-sm text-muted-foreground mb-2">
          Progreso: {stats.approved + stats.rejected}/{stats.total} documentos
        </div>
        <Progress 
          value={((stats.approved + stats.rejected) / stats.total) * 100} 
          className="h-2" 
        />
        
        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
          <div className="text-center p-2 rounded bg-blue-50 border border-blue-200">
            <div className="font-semibold text-blue-700">{stats.pending}</div>
            <div className="text-blue-600">Pendientes</div>
          </div>
          <div className="text-center p-2 rounded bg-green-50 border border-green-200">
            <div className="font-semibold text-green-700">{stats.approved}</div>
            <div className="text-green-600">Aprobados</div>
          </div>
          <div className="text-center p-2 rounded bg-red-50 border border-red-200">
            <div className="font-semibold text-red-700">{stats.rejected}</div>
            <div className="text-red-600">Rechazados</div>
          </div>
        </div>
      </div>

      {/* Document sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {pendingDocs.length > 0 && (
          <DocumentSection
            title={`Pendientes (${pendingDocs.length})`}
            documents={pendingDocs}
            currentDocument={currentDocument}
            onDocumentSelect={onDocumentSelect}
            priority="high"
          />
        )}

        {approvedDocs.length > 0 && (
          <DocumentSection
            title={`Aprobados (${approvedDocs.length})`}
            documents={approvedDocs}
            currentDocument={currentDocument}
            onDocumentSelect={onDocumentSelect}
            priority="low"
          />
        )}

        {rejectedDocs.length > 0 && (
          <DocumentSection
            title={`Rechazados (${rejectedDocs.length})`}
            documents={rejectedDocs}
            currentDocument={currentDocument}
            onDocumentSelect={onDocumentSelect}
            priority="medium"
          />
        )}
      </div>
    </div>
  );
};

interface DocumentSectionProps {
  title: string;
  documents: Document[];
  currentDocument: Document | null;
  onDocumentSelect: (doc: Document) => void;
  priority: 'high' | 'medium' | 'low';
}

const DocumentSection = ({
  title,
  documents,
  currentDocument,
  onDocumentSelect,
  priority,
}: DocumentSectionProps) => {
  const priorityColors = {
    high: 'text-blue-700 border-blue-200',
    medium: 'text-red-700 border-red-200', 
    low: 'text-green-700 border-green-200'
  };

  return (
    <div>
      <h3 className={`font-semibold mb-2 text-sm uppercase tracking-wide ${priorityColors[priority]}`}>
        {title}
      </h3>
      <div className="space-y-1">
        {documents.map((doc) => (
          <DocumentListItem
            key={doc.id}
            document={doc}
            isActive={currentDocument?.id === doc.id}
            onClick={() => onDocumentSelect(doc)}
          />
        ))}
      </div>
    </div>
  );
};
