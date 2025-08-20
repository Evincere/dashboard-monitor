import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Document {
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

interface PostulantInfo {
  user: {
    dni: string;
    fullName: string;
    email: string;
  };
  inscription: {
    id: string;
    state: string;
    centroDeVida: string;
    createdAt: string;
  };
  contest: {
    title: string;
    position: string;
  };
}

interface ValidationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  required: number;
  completionPercentage: number;
}

interface ValidationState {
  // State
  documents: Document[];
  currentDocument: Document | null;
  postulant: PostulantInfo | null;
  stats: ValidationStats | null;
  loading: boolean;
  submitting: boolean;
  
  // Actions
  setDocuments: (documents: Document[]) => void;
  setCurrentDocument: (document: Document | null) => void;
  setPostulant: (postulant: PostulantInfo) => void;
  setStats: (stats: ValidationStats) => void;
  setLoading: (loading: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  
  // Document operations
  approveDocument: (documentId: string, comments?: string) => Promise<void>;
  rejectDocument: (documentId: string, reason: string) => Promise<void>;
  goToNextPending: () => void;
  goToPreviousPending: () => void;
  
  // Utility functions
  getPendingDocuments: () => Document[];
  getApprovedDocuments: () => Document[];
  getRejectedDocuments: () => Document[];
  updateStats: () => void;
  
  // Reset
  reset: () => void;
}

export const useValidationStore = create<ValidationState>()(
  devtools(
    (set, get) => ({
      // Initial state with proper default loading state
      documents: [],
      currentDocument: null,
      postulant: null,
      stats: null,
      loading: true,  // Start with true by default
      submitting: false,

      // Basic setters
      setDocuments: (documents) => set({ documents }),
      setCurrentDocument: (document) => set({ currentDocument: document }),
      setPostulant: (postulant) => set({ postulant }),
      setStats: (stats) => set({ stats }),
      setLoading: (loading) => set({ loading }),
      setSubmitting: (submitting) => set({ submitting }),

      // Document operations
      approveDocument: async (documentId: string, comments?: string) => {
        const { documents, updateStats } = get();
        set({ submitting: true });
        
        try {
          const response = await fetch('/api/documents/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentId,
              comments: comments?.trim() || undefined,
              validatedBy: 'admin'
            })
          });

          if (!response.ok) {
            throw new Error('Failed to approve document');
          }

          // Update local state
          const updatedDocuments = documents.map(doc =>
            doc.id === documentId
              ? { 
                  ...doc, 
                  validationStatus: 'APPROVED' as const,
                  comments: comments?.trim() || undefined,
                  validatedAt: new Date().toISOString(),
                  validatedBy: 'admin'
                }
              : doc
          );

          set({ documents: updatedDocuments });
          updateStats();
          
          // Auto-advance to next pending
          get().goToNextPending();
          
          return Promise.resolve();
        } catch (error) {
          console.error('Error approving document:', error);
          throw error;
        } finally {
          set({ submitting: false });
        }
      },

      rejectDocument: async (documentId: string, reason: string) => {
        const { documents, updateStats } = get();
        set({ submitting: true });
        
        try {
          const response = await fetch('/api/documents/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentId,
              reason,
              validatedBy: 'admin'
            })
          });

          if (!response.ok) {
            throw new Error('Failed to reject document');
          }

          // Update local state
          const updatedDocuments = documents.map(doc =>
            doc.id === documentId
              ? { 
                  ...doc, 
                  validationStatus: 'REJECTED' as const,
                  rejectionReason: reason,
                  validatedAt: new Date().toISOString(),
                  validatedBy: 'admin'
                }
              : doc
          );

          set({ documents: updatedDocuments });
          updateStats();
          
          // Auto-advance to next pending
          get().goToNextPending();
          
          return Promise.resolve();
        } catch (error) {
          console.error('Error rejecting document:', error);
          throw error;
        } finally {
          set({ submitting: false });
        }
      },

      goToNextPending: () => {
        const { documents, currentDocument } = get();
        
        if (!currentDocument) {
          const firstPending = documents.find(doc => doc.validationStatus === 'PENDING');
          if (firstPending) {
            set({ currentDocument: firstPending });
          }
          return;
        }
        
        const currentIndex = documents.findIndex(doc => doc.id === currentDocument.id);
        const remainingDocs = documents.slice(currentIndex + 1);
        const nextPending = remainingDocs.find(doc => doc.validationStatus === 'PENDING');
        
        if (nextPending) {
          set({ currentDocument: nextPending });
        } else {
          // If no more pending after current, go to first pending from beginning
          const firstPending = documents.find(doc => doc.validationStatus === 'PENDING');
          if (firstPending && firstPending.id !== currentDocument.id) {
            set({ currentDocument: firstPending });
          }
        }
      },

      goToPreviousPending: () => {
        const { documents, currentDocument } = get();
        
        if (!currentDocument) return;
        
        const currentIndex = documents.findIndex(doc => doc.id === currentDocument.id);
        const previousDocs = documents.slice(0, currentIndex).reverse();
        const previousPending = previousDocs.find(doc => doc.validationStatus === 'PENDING');
        
        if (previousPending) {
          set({ currentDocument: previousPending });
        }
      },

      // Utility functions
      getPendingDocuments: () => {
        const { documents } = get();
        return documents.filter(doc => doc.validationStatus === 'PENDING');
      },

      getApprovedDocuments: () => {
        const { documents } = get();
        return documents.filter(doc => doc.validationStatus === 'APPROVED');
      },

      getRejectedDocuments: () => {
        const { documents } = get();
        return documents.filter(doc => doc.validationStatus === 'REJECTED');
      },

      updateStats: () => {
        const { documents } = get();
        
        const total = documents.length;
        const pending = documents.filter(doc => doc.validationStatus === 'PENDING').length;
        const approved = documents.filter(doc => doc.validationStatus === 'APPROVED').length;
        const rejected = documents.filter(doc => doc.validationStatus === 'REJECTED').length;
        const required = documents.filter(doc => doc.isRequired).length;
        const completionPercentage = total > 0 ? Math.round((approved / total) * 100) : 0;

        set({
          stats: {
            total,
            pending,
            approved,
            rejected,
            required,
            completionPercentage
          }
        });
      },

      reset: () => {
        set({
          documents: [],
          currentDocument: null,
          postulant: null,
          stats: null,
          loading: true, // Reset to true so UI shows loading again
          submitting: false
        });
      }
    }),
    {
      name: 'validation-store'
    }
  )
);

// Selectors for better performance
export const useValidationDocuments = () => useValidationStore(state => state.documents);
export const useCurrentDocument = () => useValidationStore(state => state.currentDocument);
export const useValidationStats = () => useValidationStore(state => state.stats);
export const useValidationLoading = () => useValidationStore(state => state.loading);
export const useValidationSubmitting = () => useValidationStore(state => state.submitting);
export const usePendingDocuments = () => useValidationStore(state => state.getPendingDocuments());
export const useApprovedDocuments = () => useValidationStore(state => state.getApprovedDocuments());
export const useRejectedDocuments = () => useValidationStore(state => state.getRejectedDocuments());
