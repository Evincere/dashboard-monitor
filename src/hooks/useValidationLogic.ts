import { useState, useCallback, useEffect } from 'react';
import { useValidationStore } from '@/stores/validationStore';
import type { Document } from '@/stores/validationStore';

export interface ValidationProgress {
  current: number;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

export function useValidationLogic(dni: string) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  
  const {
    documents,
    loading,
    error,
    initialized,
    fetchDocuments,
    updateDocument
  } = useValidationStore((state) => ({
    documents: state.documents,
    loading: state.loading,
    error: state.error,
    initialized: state.initialized,
    fetchDocuments: state.fetchDocuments,
    updateDocument: state.updateDocument,
  }));

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

  const handleValidate = useCallback((validationStatus: Document['validationStatus']) => {
    const currentDoc = documents[currentIndex];
    if (currentDoc) {
      updateDocument(currentDoc.id, validationStatus);
      navigateNext();
    }
  }, [currentIndex, documents, updateDocument, navigateNext]);

  const toggleHelp = useCallback(() => {
    setShowHelp(prev => !prev);
  }, []);

  const progress: ValidationProgress = {
    current: currentIndex + 1,
    total: documents.length,
    approved: documents.filter((d: Document) => d.validationStatus === 'APPROVED').length,
    rejected: documents.filter((d: Document) => d.validationStatus === 'REJECTED').length,
    pending: documents.filter((d: Document) => d.validationStatus === 'PENDING').length,
  };

  return {
    currentDocument: documents[currentIndex],
    progress,
    loading,
    error,
    showHelp,
    navigateNext,
    navigatePrev,
    handleValidate,
    toggleHelp,
  };
}
