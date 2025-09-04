import { useState, useCallback, useEffect } from 'react';
import { useValidationStore } from '@/stores/validationStore';
import type { Document, DocumentStatus, ValidationProgress } from '@/types/validation';

export const useDocumentValidation = (dni: string) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  
  const {
    documents,
    loading,
    error,
    initialized,
    fetchDocuments,
    updateDocument
  } = useValidationStore();

  useEffect(() => {
    if (!initialized && !loading) {
      fetchDocuments(dni);
    }
  }, [dni, initialized, loading, fetchDocuments]);

  const navigateNext = useCallback(() => {
    if (currentIndex < documents.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, documents.length]);

  const navigatePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleValidate = useCallback((status: DocumentStatus) => {
    const currentDoc = documents[currentIndex];
    if (currentDoc) {
      updateDocument(currentDoc.id, status);
      navigateNext();
    }
  }, [currentIndex, documents, updateDocument, navigateNext]);

  const toggleHelp = useCallback(() => {
    setShowHelp(prev => !prev);
  }, []);

  const currentDocument = documents[currentIndex];
  const progress: ValidationProgress = {
    current: currentIndex + 1,
    total: documents.length,
    approved: documents.filter(d => d.validationStatus === 'APPROVED').length,
    rejected: documents.filter(d => d.validationStatus === 'REJECTED').length,
    pending: documents.filter(d => d.validationStatus === 'PENDING').length,
  };

  return {
    currentDocument,
    progress,
    loading,
    error,
    showHelp,
    navigateNext,
    navigatePrev,
    handleValidate,
    toggleHelp,
  };
};
