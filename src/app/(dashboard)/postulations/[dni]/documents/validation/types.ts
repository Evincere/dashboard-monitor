import { Document, PostulantInfo, ValidationStats } from '@/stores/validations/validation-store';

export type { Document, PostulantInfo, ValidationStats };

export interface ValidationData {
  documents: Document[];
  postulant: PostulantInfo;
  stats: ValidationStats;
}

export interface DocumentListProps {
  documents: Document[];
  currentDocument: Document | null;
  onDocumentSelect: (document: Document) => void;
  stats: ValidationStats;
}

export interface DocumentListItemProps {
  document: Document;
  isActive: boolean;
  onClick: () => void;
  statusIcon: React.ReactNode;
  statusColor: string;
}

export interface DocumentViewerProps {
  document: Document | null;
  onNext?: () => void;
  onPrevious?: () => void;
  documents?: Document[];
  stats?: ValidationStats;
  postulant?: PostulantInfo;
  isFullscreen?: boolean;
  onFullscreenToggle?: (fullscreen: boolean) => void;
  onNextPostulation?: () => void;
}

export interface ValidationPanelProps {
  document: Document | null;
  onApprove: () => void;
  onReject: () => void;
  onRevertStatus: () => void;
  submitting: boolean;
  comments: string;
  onCommentsChange: (value: string) => void;
  showRejectionForm: boolean;
  rejectionReason: string;
  onRejectionReasonChange: (value: string) => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
}

export const REJECTION_REASONS = [
  "Documento ilegible o de mala calidad",
  "Documento incompleto",
  "Documento no corresponde al tipo requerido",
  "Información inconsistente con otros documentos",
  "Documento vencido o no vigente",
  "Falta información requerida",
  "Formato de archivo no válido",
  "Documento no pertenece al postulante",
  "Otro (especificar en comentarios)",
] as const;

export interface ValidationState {
  documents: Document[];
  currentDocument: Document | null;
  postulant: PostulantInfo | null;
  stats: ValidationStats | null;
  loading: boolean;
  submitting: boolean;
  error: Error | null;
  initialized: boolean;

  // Acciones
  setDocuments: (documents: Document[]) => void;
  setCurrentDocument: (document: Document | null) => void;
  setPostulant: (postulant: PostulantInfo | null) => void;
  setStats: (stats: ValidationStats) => void;
  setLoading: (loading: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: Error | null) => void;

  // Operaciones del validador
  fetchDocuments: (dni: string) => Promise<void>;
  updateDocument: (documentId: string, status: Document['validationStatus'], comments?: string) => void;
  approveDocument: (documentId: string, comments?: string) => Promise<void>;
  rejectDocument: (documentId: string, reason: string) => Promise<void>;
  goToNextPending: () => void;
  goToPreviousPending: () => void;
  updateStats: () => void;
  reset: () => void;
}
