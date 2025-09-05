import { create } from 'zustand';
import { apiUrl } from '@/lib/utils';

export type ValidationStatus = "PENDING" | "APPROVED" | "REJECTED";

// Helper function to map status to action
const getActionFromStatus = (status: ValidationStatus): string => {
  switch (status) {
    case "APPROVED": return "approve";
    case "REJECTED": return "reject";
    case "PENDING": return "revert";
    default: throw new Error(`Estado de validación no soportado: ${status}`);

  }
};

// Interface for document as returned by the API
interface ApiDocument {
  id: string;
  nombreArchivo: string;
  filePath?: string;
  fileSize?: number;
  tipoDocumentoId?: string;
  estado: string;
  fechaValidacion?: string;
  validadoPor?: string;
  comentarios?: string;
  tipoDocumento?: {
    code: string;
    nombre: string;
  };
}

export interface Document {
  id: string;
  name: string;  // Nombre del archivo para mostrar
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  fileSizeSource?: 'filesystem' | 'backend' | 'none';  // Source of the file size information
  fileSizeError?: string;  // Error message when file size cannot be determined
  documentType: string;
  validationStatus: ValidationStatus;  // Estado de validación del documento
  isRequired: boolean;
  uploadDate: string;
  createdAt?: string;
  validatedAt?: string;
  validatedBy?: string;
  comments?: string;
  rejectionReason?: string;
  thumbnailUrl?: string;
  url?: string;  // URL para la vista previa o descarga
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

export interface ValidationState {
  documents: Document[];
  currentDocument: Document | null;
  postulant: PostulantInfo | null;
  stats: ValidationStats | null;
  loading: boolean;
  error: Error | null;
  submitting: boolean;
  initialized: boolean;
  
  // Setters
  setDocuments: (documents: Document[]) => void;
  setCurrentDocument: (document: Document | null) => void;
  setPostulant: (postulant: PostulantInfo | null) => void;
  setStats: (stats: ValidationStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  
  // Document Operations
  fetchDocuments: (dni: string) => Promise<void>;
  updateDocument: (documentId: string, status: Document['validationStatus'], comments?: string) => Promise<void>;
  approveDocument: (documentId: string, comments?: string) => Promise<void>;
  rejectDocument: (documentId: string, reason: string) => Promise<void>;
  
  // Navigation
  goToNextPending: () => void;
  goToPreviousPending: () => void;
  
  // Utils
  updateStats: () => void;
  reset: () => void;
}

// Helper function para hacer requests a la API
const apiRequest = async (url: string, options: RequestInit) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }
  
  return response.json();
};

export const useValidationStore = create<ValidationState>((set, get) => ({
  // Estado inicial
  documents: [],
  currentDocument: null,
  postulant: null,
  stats: null,
  loading: false,
  error: null,
  submitting: false,
  initialized: false,
  
  // Setters
  setDocuments: (documents) => set({ documents }),
  setCurrentDocument: (document) => set({ currentDocument: document }),
  setPostulant: (postulant) => set({ postulant }),
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ loading }),
  setError: (error: Error | null) => set({ error }),
  
  // Document Operations
  fetchDocuments: async (dni: string) => {
    try {
      set({ loading: true, error: null });
      console.log(`🔍 Cargando documentos para DNI: ${dni}`);
      
      const response = await fetch(apiUrl(`validation/postulant/${dni}`));
      if (!response.ok) {
        throw new Error(`Error fetching documents: ${response.status}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "API returned success: false");
      }
      
      // 🛡️ PROTECCIONES: Validar estructura de datos
      const expediente = data.data;
      if (!expediente) {
        throw new Error("No data found in API response");
      }
      
      // Extraer documentos de la estructura correcta
      const documentsList = expediente.documents?.list || [];
      console.log(`📄 Documentos encontrados: ${documentsList.length}`);
      
      // DEBUG: Ver estructura completa de documentos
      if (documentsList.length > 0) {
        console.log("🔍 DEBUG - Estructura de documentos:", JSON.stringify(documentsList[0], null, 2));
      }
      
      // Mapear documentos al formato esperado por el store
      const mappedDocuments = documentsList.map((doc: ApiDocument) => ({
        id: doc.id,
        name: doc.nombreArchivo || "Sin nombre",
        fileName: doc.nombreArchivo || "Sin nombre",
        originalName: doc.nombreArchivo || "Sin nombre",
        filePath: doc.filePath || "",
        fileSize: doc.fileSize || 0,
        fileSizeSource: doc.fileSize && doc.fileSize > 0 ? 'backend' : 'none' as const,
        fileSizeError: doc.fileSize === 0 ? 'File size not available' : undefined,
        documentType: doc.tipoDocumento?.nombre || "Tipo desconocido",
        validationStatus: (
          doc.estado === "APPROVED" ? "APPROVED" : 
          doc.estado === "REJECTED" ? "REJECTED" : "PENDING"
        ) as ValidationStatus,
        isRequired: doc.tipoDocumento?.code !== "CERTIFICADO_LEY_MICAELA" && doc.tipoDocumento?.code !== "DOCUMENTO_ADICIONAL",
        uploadDate: doc.fechaValidacion || new Date().toISOString(),
        validatedAt: doc.fechaValidacion,
        validatedBy: doc.validadoPor,
        comments: doc.comentarios,
        rejectionReason: doc.estado === "REJECTED" ? doc.comentarios : undefined
      }));
      
      // 🏗️ Construir información del postulante
      const postulantInfo: PostulantInfo = {
        user: {
          dni: expediente.user?.dni || dni,
          fullName: expediente.user?.name || "Sin nombre",
          email: expediente.user?.email || "Sin email",
          telefono: expediente.user?.telefono
        },
        inscription: {
          id: expediente.inscription?.id || "unknown",
          state: expediente.inscription?.status || "UNKNOWN",
          centroDeVida: expediente.inscription?.centroDeVida || "Sin asignar",
          createdAt: expediente.inscription?.createdAt || new Date().toISOString()
        },
        contest: {
          id: expediente.contest?.id || 0,
          title: expediente.contest?.title || "Sin título",
          category: expediente.contest?.category || "Sin categoría",
          position: expediente.contest?.position || "Sin posición",
          department: expediente.contest?.department || "Sin departamento",
          contestClass: expediente.contest?.contestClass || "Sin clase",
          status: expediente.contest?.status || "UNKNOWN",
          statusDescription: expediente.contest?.statusDescription || "Sin descripción",
          inscriptionStartDate: expediente.contest?.inscriptionStartDate || new Date().toISOString(),
          inscriptionEndDate: expediente.contest?.inscriptionEndDate || new Date().toISOString(),
          dependency: expediente.contest?.dependency,
          location: expediente.contest?.location
        }
      };
      
      // 📊 Calcular estadísticas de documentos
      const total = mappedDocuments.length;
      const pending = mappedDocuments.filter((doc: Document) => doc.validationStatus === "PENDING").length;
      const approved = mappedDocuments.filter((doc: Document) => doc.validationStatus === "APPROVED").length;
      const rejected = mappedDocuments.filter((doc: Document) => doc.validationStatus === "REJECTED").length;
      const required = mappedDocuments.filter((doc: Document) => doc.isRequired).length;
      const completionPercentage = total > 0 ? ((approved + rejected) / total) * 100 : 0;
      
      const stats: ValidationStats = {
        total,
        pending,
        approved,
        rejected,
        required,
        completionPercentage
      };
      
      console.log(`✅ Datos procesados:`, {
        documentos: mappedDocuments.length,
        postulante: postulantInfo.user.fullName,
        stats
      });
      
      set({ 
        documents: mappedDocuments,
        postulant: postulantInfo,
        stats: stats,
        initialized: true 
      });
      
    } catch (error) {
      console.error(`❌ Error cargando documentos para DNI ${dni}:`, error);
      set({ error: error as Error });
    } finally {
      set({ loading: false });
    }
  },

  updateDocument: async (documentId: string, status: Document['validationStatus'], comments?: string) => {
    try {
      set({ submitting: true, error: null });
      
      console.log(`🔄 Actualizando documento ${documentId}`, { status, comments });
      
      const response = await fetch(apiUrl(`proxy-backend/documents/${documentId}/${getActionFromStatus(status)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ motivo: comments })
      });
      console.log("📤 Store enviando al endpoint:", { url: `proxy-backend/documents/${documentId}/${getActionFromStatus(status)}`, motivo: comments, motivoType: typeof comments });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error en respuesta del servidor:', errorData);
        throw new Error(errorData.message || `Error ${response.status} al actualizar documento`);
      }

      const data = await response.json();
      if (!data.success) {
        console.error('Respuesta no exitosa:', data);
        throw new Error(data.message || data.error || 'Error al actualizar documento');
      }

      // Actualizar estado local
      const { documents } = get();
      const updatedDocuments = documents.map((doc: Document) =>
        doc.id === documentId 
          ? { 
              ...doc, 
              validationStatus: status, 
              validatedAt: new Date().toISOString(),
              validatedBy: 'Admin', // TODO: obtener del contexto de usuario
              comments: status === 'APPROVED' ? comments : undefined,
              rejectionReason: status === 'REJECTED' ? comments : undefined
            }
          : doc
      );
      
      set({ documents: updatedDocuments });
      get().updateStats();
      
      console.log(`✅ Documento ${documentId} actualizado a ${status}`);
      
    } catch (error) {
      console.error('❌ Error actualizando documento:', error);
      set({ error: error as Error });
      throw error;
    } finally {
      set({ submitting: false });
    }
  },

  approveDocument: async (documentId, comments) => {
    return get().updateDocument(documentId, "APPROVED", comments);
  },

  rejectDocument: async (documentId, reason) => {
    return get().updateDocument(documentId, "REJECTED", reason);
  },

  goToNextPending: () => {
    const { documents, currentDocument } = get();
    if (!currentDocument || !documents.length) return;

    const currentIndex = documents.findIndex(doc => doc.id === currentDocument.id);
    const nextPending = documents.slice(currentIndex + 1).find(doc => doc.validationStatus === "PENDING");
    
    if (nextPending) {
      set({ currentDocument: nextPending });
    } else {
      // Si no hay más pendientes después del actual, buscar desde el principio
      const firstPending = documents.find(doc => doc.validationStatus === "PENDING");
      if (firstPending && firstPending.id !== currentDocument.id) {
        set({ currentDocument: firstPending });
      }
    }
  },

  goToPreviousPending: () => {
    const { documents, currentDocument } = get();
    if (!currentDocument || !documents.length) return;

    const currentIndex = documents.findIndex(doc => doc.id === currentDocument.id);
    const previousPending = documents.slice(0, currentIndex).reverse().find(doc => doc.validationStatus === "PENDING");
    
    if (previousPending) {
      set({ currentDocument: previousPending });
    } else {
      // Si no hay más pendientes antes del actual, buscar desde el final
      const lastPending = documents.slice().reverse().find(doc => doc.validationStatus === "PENDING");
      if (lastPending && lastPending.id !== currentDocument.id) {
        set({ currentDocument: lastPending });
      }
    }
  },

  updateStats: () => {
    const { documents } = get();
    const total = documents.length;
    const pending = documents.filter(doc => doc.validationStatus === "PENDING").length;
    const approved = documents.filter(doc => doc.validationStatus === "APPROVED").length;
    const rejected = documents.filter(doc => doc.validationStatus === "REJECTED").length;
    const required = documents.filter(doc => doc.isRequired).length;
    const completionPercentage = total > 0 ? ((approved + rejected) / total) * 100 : 0;

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
      loading: false,
      error: null,
      submitting: false,
      initialized: false
    });
  },
}));
