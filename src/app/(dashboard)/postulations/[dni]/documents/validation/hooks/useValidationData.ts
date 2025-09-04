import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '@/lib/utils';
import { Document, PostulantInfo, ValidationData } from '../types';
import { useToast } from '@/hooks/use-toast';

export const useValidationData = (dni: string) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [postulant, setPostulant] = useState<PostulantInfo | null>(null);
  const [stats, setStats] = useState<ValidationData['stats'] | null>(null);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);

  const fetchValidationData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl(`postulations/${dni}/documents`));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'API returned success: false');
      }

      setDocuments(result.data.documents);
      setPostulant(result.data.postulant);
      setStats(result.data.stats);

      const firstPending = result.data.documents.find(
        (doc: Document) => doc.validationStatus === 'PENDING'
      );
      
      if (firstPending) {
        setCurrentDocument(firstPending);
      } else if (result.data.documents.length > 0) {
        setCurrentDocument(result.data.documents[0]);
      }

    } catch (error) {
      console.error('Error fetching validation data:', error);
      toast({
        title: 'Error',
        description: `No se pudieron cargar los documentos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [dni, toast]);

  useEffect(() => {
    if (dni) {
      fetchValidationData();
    }
  }, [dni, fetchValidationData]);

  const refresh = useCallback(() => {
    fetchValidationData();
  }, [fetchValidationData]);

  return {
    loading,
    documents,
    postulant,
    stats,
    currentDocument,
    setCurrentDocument,
    refresh,
  };
};
