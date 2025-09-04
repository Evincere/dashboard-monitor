import { useCallback } from 'react';
import { apiUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export const useDocumentActions = (dni: string, onSuccess?: () => void) => {
  const { toast } = useToast();

  const approveDocument = useCallback(async (documentId: string, comments?: string) => {
    try {
      const response = await fetch(apiUrl(`documents/${documentId}/approve`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to approve document');
      }

      toast({
        title: 'Documento Aprobado',
        description: 'El documento ha sido aprobado exitosamente',
      });

      onSuccess?.();

    } catch (error) {
      console.error('Error approving document:', error);
      toast({
        title: 'Error',
        description: 'No se pudo aprobar el documento',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast, onSuccess]);

  const rejectDocument = useCallback(async (documentId: string, reason: string) => {
    try {
      const response = await fetch(apiUrl(`documents/${documentId}/reject`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to reject document');
      }

      toast({
        title: 'Documento Rechazado',
        description: 'El documento ha sido rechazado',
        variant: 'destructive',
      });

      onSuccess?.();

    } catch (error) {
      console.error('Error rejecting document:', error);
      toast({
        title: 'Error',
        description: 'No se pudo rechazar el documento',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast, onSuccess]);

  const revertStatus = useCallback(async (documentId: string) => {
    try {
      const response = await fetch(apiUrl(`documents/${documentId}/revert`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to revert document status');
      }

      toast({
        title: 'Estado Revertido',
        description: 'El documento ha vuelto al estado pendiente',
      });

      onSuccess?.();

    } catch (error) {
      console.error('Error reverting document status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo revertir el estado del documento',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast, onSuccess]);

  return {
    approveDocument,
    rejectDocument,
    revertStatus,
  };
};
