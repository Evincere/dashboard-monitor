import { useState, useEffect } from 'react';
import { useValidationStore } from '@/stores/validations/validation-store';
import { Document } from '@/stores/validations/validation-store';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/utils';

export const useDocumentValidation = (dni: string) => {
  const {
    documents,
    loading,
    error,
    initialized,
    postulant,
    stats,
    submitting,
    fetchDocuments,
    updateDocument,
  } = useValidationStore();

  const { toast } = useToast();
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [comments, setComments] = useState("");

  useEffect(() => {
    if (!initialized && !loading && dni) {
      fetchDocuments(dni);
    }
  }, [dni, initialized, loading, fetchDocuments]);

  useEffect(() => {
    if (documents.length > 0 && !currentDocument) {
      const firstPending = documents.find(doc => doc.validationStatus === "PENDING");
      setCurrentDocument(firstPending || documents[0]);
    }
  }, [documents, currentDocument]);

  const handleApprove = async () => {
    if (!currentDocument) return;

    try {
      await updateDocument(currentDocument.id, "APPROVED");
      setComments("");
      
      toast({
        title: "Documento Aprobado",
        description: "El documento ha sido aprobado exitosamente",
      });

      navigateToNextPending();
    } catch (error) {
      console.error("Error approving document:", error);
      toast({
        title: "Error",
        description: "No se pudo aprobar el documento",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!currentDocument) return;

    try {
      await updateDocument(currentDocument.id, "REJECTED");
      setComments("");
      
      toast({
        title: "Documento Rechazado",
        description: "El documento ha sido rechazado",
        variant: "destructive",
      });

      navigateToNextPending();
    } catch (error) {
      console.error("Error rejecting document:", error);
      toast({
        title: "Error",
        description: "No se pudo rechazar el documento",
        variant: "destructive",
      });
    }
  };

  const handleRevertStatus = async () => {
    if (!currentDocument) return;

    try {
      await updateDocument(currentDocument.id, "PENDING");
      setComments("");
      
      toast({
        title: "Estado Revertido",
        description: "El documento ha vuelto al estado pendiente",
      });
    } catch (error) {
      console.error("Error reverting document status:", error);
      toast({
        title: "Error",
        description: "No se pudo revertir el estado del documento",
        variant: "destructive",
      });
    }
  };

  const navigateToNextPending = () => {
    if (!currentDocument) return;
    
    const nextPending = documents.find(
      (doc, index) => 
        index > documents.findIndex(d => d.id === currentDocument.id) && 
        doc.validationStatus === "PENDING"
    );
    
    if (nextPending) {
      setCurrentDocument(nextPending);
    }
  };

  const handleDownload = async () => {
    if (!currentDocument) return;

    try {
      const response = await fetch(apiUrl(`documents/${currentDocument.id}/download`));
      if (!response.ok) {
        throw new Error(`Error al descargar: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentDocument.fileName || `document_${currentDocument.id}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Documento descargado",
        description: "El documento se ha descargado correctamente.",
      });
    } catch (error) {
      console.error('Error downloading:', error);
      toast({
        title: "Error al descargar",
        description: "No se pudo descargar el documento.",
        variant: "destructive",
      });
    }
  };

  return {
    documents,
    currentDocument,
    setCurrentDocument,
    loading,
    error,
    stats,
    submitting,
    comments,
    setComments,
    handleApprove,
    handleReject,
    handleRevertStatus,
    handleDownload,
    postulant,
  };
};
