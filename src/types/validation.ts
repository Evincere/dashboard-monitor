export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Document {
  id: string;
  type: string;
  status: DocumentStatus;
  name: string;
  validatedAt?: string;
  validatedBy?: string;
}

export interface ValidationProgress {
  current: number;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

export interface ValidationState {
  documents: Document[];
  loading: boolean;
  error: Error | null;
  initialized: boolean;
}

export interface ValidationActions {
  fetchDocuments: (dni: string) => Promise<void>;
  updateDocumentStatus: (documentId: string, status: DocumentStatus) => void;
}
