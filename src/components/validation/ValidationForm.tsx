import { Document } from '@/stores/validations/validation-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle } from 'lucide-react';

interface ValidationFormProps {
  document: Document;
  onApprove: () => void;
  onReject: () => void;
  submitting: boolean;
  comments: string;
  onCommentsChange: (value: string) => void;
}

export const ValidationForm = ({
  document,
  onApprove,
  onReject,
  submitting,
  comments,
  onCommentsChange,
}: ValidationFormProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold">Documento: {document.documentType}</h3>
      </div>

      <Textarea
        placeholder="Comentarios (opcional)"
        value={comments}
        onChange={(e) => onCommentsChange(e.target.value)}
        className="min-h-[100px]"
        disabled={submitting}
      />
      
      <div className="flex flex-col gap-2">
        <Button
          onClick={onApprove}
          disabled={submitting}
          className="w-full flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Aprobar
        </Button>
        <Button
          onClick={onReject}
          disabled={submitting}
          variant="destructive"
          className="w-full flex items-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          Rechazar
        </Button>
      </div>
    </div>
  );
};
