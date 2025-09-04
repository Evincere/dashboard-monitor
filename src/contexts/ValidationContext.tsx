import { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useEffect 
} from 'react';

export interface Document {
  id: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  name: string;
  validatedAt?: string;
  validatedBy?: string;
  url?: string;
}

export type DocumentStatus = Document['status'];

interface ValidationState {
  documents: Document[];
  loading: boolean;
  error: Error | null;
  initialized: boolean;
}

interface ValidationActions {
  fetchDocuments: (dni: string) => Promise<void>;
  updateDocumentStatus: (documentId: string, status: DocumentStatus) => void;
}

import { create } from 'zustand';
import { apiUrl } from '@/lib/utils';

export const useValidationStore = create<ValidationState & ValidationActions>((set) => ({
  documents: [],
  loading: false,
  error: null,
  initialized: false,

  fetchDocuments: async (dni: string) => {
    try {
      set({ loading: true, error: null });
      const response = await fetch(apiUrl(`postulations/${dni}/documents`));
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Error HTTP: ${response.status}`);
      }
      
      set({ documents: data.documents, initialized: true });
    } catch (error) {
      console.error('Error fetching documents:', error);
      set({ error: error as Error });
    } finally {
      set({ loading: false });
    }
  },

  updateDocumentStatus: (documentId: string, status: DocumentStatus) => {
    set(state => ({
      documents: state.documents.map(doc =>
        doc.id === documentId
          ? { ...doc, status, validatedAt: new Date().toISOString() }
          : doc
      )
    }));
  },
}));

interface ValidationContextProps {
  currentDocument: Document | null;
  loading: boolean;
  error: Error | null;
  progress: {
    current: number;
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  showHelp: boolean;
  navigateNext: () => void;
  navigatePrev: () => void;
  handleValidate: (status: DocumentStatus) => void;
  toggleHelp: () => void;
}

const ValidationContext = createContext<ValidationContextProps | null>(null);

export function ValidationProvider({ 
  children, 
  dni 
}: { 
  children: React.ReactNode;
  dni: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  
  const {
    documents,
    loading,
    error,
    initialized,
    fetchDocuments,
    updateDocumentStatus
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
      updateDocumentStatus(currentDoc.id, status);
      navigateNext();
    }
  }, [currentIndex, documents, updateDocumentStatus, navigateNext]);

  const toggleHelp = useCallback(() => {
    setShowHelp(prev => !prev);
  }, []);

  const currentDocument = documents[currentIndex] || null;
  const progress = {
    current: currentIndex + 1,
    total: documents.length,
    approved: documents.filter(d => d.status === 'APPROVED').length,
    rejected: documents.filter(d => d.status === 'REJECTED').length,
    pending: documents.filter(d => d.status === 'PENDING').length,
  };

  const value = {
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

  return (
    <ValidationContext.Provider value={value}>
      {children}
    </ValidationContext.Provider>
  );
}

export function useValidation() {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }
  return context;
}
