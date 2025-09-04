export interface Document {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  documentType: string;
  validationStatus: "PENDING" | "APPROVED" | "REJECTED";
  isRequired: boolean;
  uploadDate: string;
  validatedAt?: string;
  validatedBy?: string;
  comments?: string;
  rejectionReason?: string;
  thumbnailUrl?: string;
}

export interface PostulantInfo {
  user: {
    dni: string;
    fullName: string;
    email: string;
    telefono?: string;
  };
  inscription: {
    id: string;
    state: string;
    centroDeVida: string;
    createdAt: string;
  };
  contest: {
    id: number;
    title: string;
    category: string;
    position: string;
    department: string;
    contestClass: string;
    status: string;
    statusDescription: string;
    inscriptionStartDate: string;
    inscriptionEndDate: string;
    dependency?: string;
    location?: string;
  };
}

export interface ValidationData {
  postulant: PostulantInfo;
  documents: Document[];
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    required: number;
    completionPercentage: number;
  };
}

export interface ValidationPanelProps {
  document: Document | null;
  postulant: PostulantInfo;
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

export interface DocumentViewerProps {
  document: Document | null;
  onNext: () => void;
  onPrevious?: () => void;
  documents?: Document[];
  stats?: ValidationData["stats"];
  postulant?: PostulantInfo;
  isFullscreen?: boolean;
  onFullscreenToggle?: (fullscreen: boolean) => void;
  onNextPostulation?: () => void;
}

export interface DocumentListProps {
  documents: Document[];
  currentDocument: Document | null;
  onDocumentSelect: (doc: Document) => void;
  stats: ValidationData["stats"];
}

export interface DocumentListItemProps {
  document: Document;
  isActive: boolean;
  onClick: () => void;
  statusIcon: React.ReactNode;
  statusColor: string;
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
];
