import { Document } from '@/stores/validations/validation-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ValidationStatusProps {
  document: Document;
  onRevertStatus: () => void;
  submitting: boolean;
}

export const ValidationStatus = ({
  document,
  onRevertStatus,
  submitting,
}: ValidationStatusProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold">Documento: {document.documentType}</h3>
        <Badge 
          variant={
            document.validationStatus === 'APPROVED' 
              ? 'default' 
              : document.validationStatus === 'REJECTED' 
                ? 'destructive' 
                : 'secondary'
          }
        >
          {document.validationStatus}
        </Badge>
      </div>

      {document.comments && (
        <div>
          <h4 className="font-medium mb-1">Comentarios:</h4>
          <p className="text-sm text-muted-foreground">{document.comments}</p>
        </div>
      )}
      
      {document.rejectionReason && (
        <div>
          <h4 className="font-medium mb-1">Razón de rechazo:</h4>
          <p className="text-sm text-muted-foreground">
            {document.rejectionReason}
          </p>
        </div>
      )}
      
      <Button
        onClick={onRevertStatus}
        disabled={submitting}
        variant="outline"
        className="w-full"
      >
        Revertir Estado
      </Button>
    </div>
  );
};
