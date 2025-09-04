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

export interface ValidationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  required: number;
  completionPercentage: number;
}

export interface PostulantEntry {
  userInfo?: {
    fullName?: string;
    dni?: string;
  };
  state?: string;
}

export interface DocumentListItemProps {
  document: Document;
  isActive: boolean;
  onClick: () => void;
  statusIcon: ReactNode;
  statusColor: string;
}

export interface DocumentListProps {
  documents: Document[];
  currentDocument: Document | null;
  onDocumentSelect: (doc: Document) => void;
  stats: ValidationStats;
}

export interface DocumentViewerProps {
  document: Document | null;
  onNext: () => void;
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
