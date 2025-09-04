import { Document } from '@/stores/validations/validation-store';
import { DocumentTypeBadge } from '@/components/ui/document-type-badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface DocumentListItemProps {
  document: Document;
  isActive: boolean;
  onClick: () => void;
}

export const DocumentListItem = ({ 
  document, 
  isActive, 
  onClick 
}: DocumentListItemProps) => {
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
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
        isActive 
          ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20" 
          : getStatusColor(document.validationStatus)
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getStatusIcon(document.validationStatus)}
        </div>
        <div className="flex-1 min-w-0">
          <DocumentTypeBadge 
            documentType={document.documentType} 
            variant="compact" 
          />
        </div>
      </div>
    </div>
  );
};
