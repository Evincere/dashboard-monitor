import { create } from 'zustand';
import { apiUrl } from '@/lib/utils';

// Helper function for document type mapping
const getDocumentTypeName = (documentTypeId: string): string => {
  const DOCUMENT_TYPES: { [key: string]: string } = {
    "9A1230C71E4E431380D4BD4F21CD8C7F": "DNI (Frontal)",
    "2980B7A784E643F68D7C47AF4ACAF64B": "DNI (Dorso)",
    "99EECC88ABCA4086B9E5CE6F63EECAB7": "Constancia de CUIL",
    "9FA271051CDE476989CB08587C92E930": "Certificado de Antecedentes Penales",
    "8C5FE4A7982D429081332CA24881A3B1": "Certificado de Antigüedad Profesional",
    "E0022DE6F70D44A5930666F7059959D8": "Certificado Sin Sanciones Disciplinarias",
    "EF5DEB6BAB24471CAF6DADBC4971DA29": "Título Universitario y Certificado Analítico",
    "E089FA5DE81F4892862C0F3F08931451": "Certificado Ley Micaela",
    "9A67E09E0FB64D108FCE99587974504B": "Documento Adicional"
  };
  return DOCUMENT_TYPES[documentTypeId] || "Tipo desconocido";
};

export type ValidationStatus = "PENDING" | "APPROVED" | "REJECTED";

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
      console.log("🔍 DEBUG - Estructura de documentos:", JSON.stringify(documentsList[0], null, 2));
      
      // DEBUG: Ver qué documentTypeId están llegando
      documentsList.forEach((doc: ApiDocument) => {
        console.log(`📋 Debug documento:`, {
          id: doc.id,
          fileName: doc.nombreArchivo,
          documentTypeId: doc.tipoDocumentoId,
          mappedType: doc.tipoDocumento?.nombre || "Tipo desconocido"
        });
      });
      
      // Mapear documentos al formato esperado por el store
      const mappedDocuments = documentsList.map((doc: ApiDocument) => ({
        id: doc.id,
        name: doc.nombreArchivo || "Sin nombre",
        fileName: doc.nombreArchivo || "Sin nombre",
        originalName: doc.nombreArchivo || "Sin nombre",
        filePath: doc.filePath || "",
        fileSize: doc.fileSize || 0,
        documentType: doc.tipoDocumento?.nombre || "Tipo desconocido",
        validationStatus: doc.estado === "APPROVED" ? "APPROVED" : 
                         doc.estado === "REJECTED" ? "REJECTED" : "PENDING",
        isRequired: doc.tipoDocumento?.code !== "CERTIFICADO_LEY_MICAELA" && doc.tipoDocumento?.code !== "DOCUMENTO_ADICIONAL",
        uploadDate: doc.fechaValidacion || new Date().toISOString(),
        validatedAt: doc.fechaValidacion,
        validatedBy: doc.validadoPor,
        comments: doc.comentarios,
        rejectionReason: doc.comentarios
      }));
      
      // 🏗️ Construir información del postulante
      const postulantInfo = {
        user: {
          dni: expediente.user?.dni || dni,
          fullName: expediente.user?.name || "Sin nombre",
          email: expediente.user?.email || "Sin email",
          telefono: undefined // TODO: agregar si está disponible
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
      
      // 📊 Estadísticas de documentos
      const stats = {
        total: documentsList.length,
        pending: expediente.documents?.pending || 0,
        approved: expediente.documents?.approved || 0,
        rejected: expediente.documents?.rejected || 0,
        required: documentsList.length, // Asumiendo que todos son requeridos
        completionPercentage: documentsList.length > 0 ? 
          ((expediente.documents?.approved || 0) / documentsList.length) * 100 : 0
      };
      
      console.log(`✅ Datos procesados:`, {
        documentos: mappedDocuments.length,
        postulante: postulantInfo.user.fullName,
        estado: expediente.currentValidationStatus
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
      set({ submitting: true });
      const response = await fetch(apiUrl(`documents/${documentId}/validate`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comments })
      });
      
      if (!response.ok) {
        throw new Error(`Error updating document: ${response.status}`);
      }

      const { documents } = get();
      const updatedDocuments = documents.map((doc: Document) =>
        doc.id === documentId 
          ? { ...doc, validationStatus: status, validatedAt: new Date().toISOString() }
          : doc
      );
      
      set({ documents: updatedDocuments });
    } catch (error) {
      set({ error: error as Error });
    } finally {
      set({ submitting: false });
    }
  },
  setCurrentDocument: (document) => set({ currentDocument: document }),
  setPostulant: (postulant) => set({ postulant }),
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ loading }),

  approveDocument: async (documentId, comments) => {
    set({ submitting: true });
    try {
      console.log(`✅ Approbando documento ${documentId}`, { comments });
      
      // Llamada real a la API
      const result = await apiRequest('/api/documents/approve', {
        method: 'POST',
        body: JSON.stringify({
          documentId,
          comments: comments || undefined,
          validatedBy: 'Admin' // TODO: Obtener del contexto de usuario
        })
      });

      if (result.success) {
        // Actualizar estado local
        const { documents } = get();
        const updatedDocuments = documents.map((doc: Document) => 
          doc.id === documentId 
            ? { 
                ...doc, 
                validationStatus: "APPROVED" as const, 
                validatedAt: new Date().toISOString(),
                validatedBy: 'Admin',
                comments,
                rejectionReason: undefined
              }
            : doc
        );
        set({ documents: updatedDocuments });
        get().updateStats();
        
        console.log(`✅ Documento ${documentId} aprobado exitosamente`);
      } else {
        throw new Error(result.error || 'Error al aprobar documento');
      }
    } catch (error) {
      console.error('❌ Error aprobando documento:', error);
      throw error; // Re-throw para que el componente pueda manejarlo
    } finally {
      set({ submitting: false });
    }
  },

  rejectDocument: async (documentId, reason) => {
    set({ submitting: true });
    try {
      console.log(`❌ Rechazando documento ${documentId}`, { reason });
      
      // Llamada real a la API
      const result = await apiRequest('/api/documents/reject', {
        method: 'POST',
        body: JSON.stringify({
          documentId,
          reason,
          validatedBy: 'Admin' // TODO: Obtener del contexto de usuario
        })
      });

      if (result.success) {
        // Actualizar estado local
        const { documents } = get();
        const updatedDocuments = documents.map((doc: Document) => 
          doc.id === documentId 
            ? { 
                ...doc, 
                validationStatus: "REJECTED" as const, 
                validatedAt: new Date().toISOString(),
                validatedBy: 'Admin',
                rejectionReason: reason,
                comments: undefined
              }
            : doc
        );
        set({ documents: updatedDocuments });
        get().updateStats();
        
        console.log(`❌ Documento ${documentId} rechazado exitosamente`);
      } else {
        throw new Error(result.error || 'Error al rechazar documento');
      }
    } catch (error) {
      console.error('❌ Error rechazando documento:', error);
      throw error; // Re-throw para que el componente pueda manejarlo
    } finally {
      set({ submitting: false });
    }
  },

  goToNextPending: () => {
    const { documents, currentDocument } = get();
    if (!currentDocument || !documents.length) return;

    const currentIndex = documents.findIndex(doc => doc.id === currentDocument.id);
    const nextPending = documents.slice(currentIndex + 1).find(doc => doc.validationStatus === "PENDING");
    if (nextPending) {
      set({ currentDocument: nextPending });
    }
  },

  goToPreviousPending: () => {
    const { documents, currentDocument } = get();
    if (!currentDocument || !documents.length) return;

    const currentIndex = documents.findIndex(doc => doc.id === currentDocument.id);
    const previousPending = documents.slice(0, currentIndex).reverse().find(doc => doc.validationStatus === "PENDING");
    if (previousPending) {
      set({ currentDocument: previousPending });
    }
  },

  updateStats: () => {
    const { documents } = get();
    const total = documents.length;
    const pending = documents.filter(doc => doc.validationStatus === "PENDING").length;
    const approved = documents.filter(doc => doc.validationStatus === "APPROVED").length;
    const rejected = documents.filter(doc => doc.validationStatus === "REJECTED").length;
    const required = documents.filter(doc => doc.isRequired).length;
    const completionPercentage = total ? ((approved + rejected) / total) * 100 : 0;

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
      submitting: false,
    });
  },
}));
