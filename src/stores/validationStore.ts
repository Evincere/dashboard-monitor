import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Interfaces
export interface Document {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  documentType: string;
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isRequired: boolean;
  uploadDate: string;
  validatedAt?: string;
  validatedBy?: string;
  comments?: string;
  rejectionReason?: string;
  thumbnailUrl?: string;
}

export interface PostulantInfo {
  dni: string;
  name: string;
  status: string;
}

export interface ValidationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  required: number;
  completionPercentage: number;
}

interface ValidationState {
  documents: Document[];
  currentDocument: Document | null;
  postulant: PostulantInfo | null;
  stats: ValidationStats;
  loading: boolean;
  error: Error | null;
  initialized: boolean;
  submitting: boolean;
  
  // Acciones
  setDocuments: (documents: Document[]) => void;
  setCurrentDocument: (document: Document | null) => void;
  setPostulant: (postulant: PostulantInfo | null) => void;
  setStats: (stats: ValidationStats) => void;
  setLoading: (loading: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: Error | null) => void;
  
  // Operaciones
  fetchDocuments: (dni: string) => Promise<void>;
  updateDocument: (documentId: string, status: Document['validationStatus'], comments?: string) => void;
  moveToNextDocument: () => void;
  moveToPreviousDocument: () => void;
  getPendingDocuments: () => Document[];
}

const calculateStats = (documents: Document[]): ValidationStats => {
  const stats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    required: 0,
    completionPercentage: 0
  };

  documents.forEach(doc => {
    stats.total++;
    if (doc.isRequired) {
      stats.required++;
    }
    
    switch (doc.validationStatus) {
      case 'PENDING':
        stats.pending++;
        break;
      case 'APPROVED':
        stats.approved++;
        break;
      case 'REJECTED':
        stats.rejected++;
        break;
    }
  });

  stats.completionPercentage = stats.total ? ((stats.approved + stats.rejected) / stats.total) * 100 : 0;

  return stats;
};

const DEFAULT_STATS: ValidationStats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  required: 0,
  completionPercentage: 0
};

type SetState = (
  partial: ValidationState | Partial<ValidationState> | ((state: ValidationState) => ValidationState | Partial<ValidationState>),
  replace?: boolean
) => void;

type GetState = () => ValidationState;

const createValidationStore = (set: SetState, get: GetState) => ({
  // Estado inicial
  documents: [] as Document[],
  currentDocument: null as Document | null,
  postulant: null as PostulantInfo | null,
  stats: DEFAULT_STATS,
  loading: false,
  error: null as Error | null,
  initialized: false,
  submitting: false,

  // Setters
  setDocuments: (documents: Document[]) => set({ 
    documents,
    stats: calculateStats(documents)
  }),
  
  setCurrentDocument: (document: Document | null) => set({ currentDocument: document }),
  
  setPostulant: (postulant: PostulantInfo | null) => set({ postulant }),
  
  setStats: (stats: ValidationStats) => set({ stats }),
  
  setLoading: (loading: boolean) => set({ loading }),
  
  setSubmitting: (submitting: boolean) => set({ submitting }),
  
  setError: (error: Error | null) => set({ error }),

  // Operaciones
  fetchDocuments: async (dni: string) => {
    try {
      set({ loading: true, error: null });
      
      const response = await fetch(`/api/postulations/${dni}/documents`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al obtener documentos');
      }

      const documents = (data.data || []).map((doc: Partial<Document>) => ({
        id: doc.id || '',
        fileName: doc.fileName || '',
        originalName: doc.originalName || '',
        filePath: doc.filePath || '',
        fileSize: doc.fileSize || 0,
        documentType: doc.documentType || '',
        validationStatus: doc.validationStatus || 'PENDING',
        isRequired: doc.isRequired || false,
        uploadDate: doc.uploadDate || new Date().toISOString(),
        validatedAt: doc.validatedAt,
        validatedBy: doc.validatedBy,
        comments: doc.comments,
        rejectionReason: doc.rejectionReason,
        thumbnailUrl: doc.thumbnailUrl,
      }));

      set({ 
        documents,
        stats: calculateStats(documents),
        initialized: true 
      });

      // Establecer el primer documento pendiente como actual si no hay uno seleccionado
      const { currentDocument } = get();
      if (!currentDocument) {
        const firstPending = documents.find((doc: Document) => doc.validationStatus === 'PENDING');
        if (firstPending) {
          set({ currentDocument: firstPending });
        }
      }

    } catch (error) {
      console.error('Error fetching documents:', error);
      set({ error: error as Error });
    } finally {
      set({ loading: false });
    }
  },

  updateDocument: (documentId: string, status: Document['validationStatus'], comments?: string) => {
    set((state: ValidationState) => {
      const updatedDocuments = state.documents.map((doc: Document) =>
        doc.id === documentId
          ? {
              ...doc,
              validationStatus: status,
              validatedAt: new Date().toISOString(),
              comments: comments || doc.comments
            }
          : doc
      );

      return {
        documents: updatedDocuments,
        stats: calculateStats(updatedDocuments)
      };
    });
  },

  moveToNextDocument: () => {
    const { documents, currentDocument } = get();
    
    if (!currentDocument) {
      const firstPending = documents.find((doc: Document) => doc.validationStatus === 'PENDING');
      if (firstPending) {
        set({ currentDocument: firstPending });
      }
      return;
    }

    const currentIndex = documents.findIndex((doc: Document) => doc.id === currentDocument.id);
    const remainingDocs = documents.slice(currentIndex + 1);
    const nextPending = remainingDocs.find((doc: Document) => doc.validationStatus === 'PENDING');

    if (nextPending) {
      set({ currentDocument: nextPending });
    }
  },

  moveToPreviousDocument: () => {
    const { documents, currentDocument } = get();
    
    if (!currentDocument) {
      const firstPending = documents.find((doc: Document) => doc.validationStatus === 'PENDING');
      if (firstPending) {
        set({ currentDocument: firstPending });
      }
      return;
    }

    const currentIndex = documents.findIndex((doc: Document) => doc.id === currentDocument.id);
    const previousDocs = documents.slice(0, currentIndex);
    const previousPending = previousDocs.reverse().find((doc: Document) => doc.validationStatus === 'PENDING');

    if (previousPending) {
      set({ currentDocument: previousPending });
    }
  },

  getPendingDocuments: () => {
    const { documents } = get();
    return documents.filter((doc: Document) => doc.validationStatus === 'PENDING');
  },
});

export const useValidationStore = create<ValidationState>()(
  devtools(
    (set, get) => createValidationStore(
      set as SetState,
      get as GetState
    ),
    {
      name: 'validation-store'
    }
  )
);
