// =================================================================
// TIPOS DE DATOS DEL BACKEND SPRING BOOT - NO MODIFICAR
// =================================================================

// Representa la estructura de un usuario en el backend
export interface BackendUser {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    dni: string;
    cuit: string;
    phone: string;
    status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
    role: 'ADMIN' | 'USER' | 'VALIDATOR';
    createdAt: string; // ISO Date string
    updatedAt: string; // ISO Date string
}

// Representa la estructura de una inscripción a un concurso
export interface BackendInscription {
    id: number;
    userId: number;
    contestId: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED';
    inscriptionDate: string; // ISO Date string
    validationDate?: string; // ISO Date string
    validatorId?: number;
    observations?: string;
}

// Representa la estructura de un documento subido
export interface BackendDocument {
    id: number;
    inscriptionId: number;
    documentTypeId: number;
    filePath: string;
    fileName: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    validationDate?: string; // ISO Date string
    validatorId?: number;
    rejectionReason?: string;
    uploadDate: string; // ISO Date string
}

// Representa la estructura de un tipo de documento
export interface BackendDocumentType {
    id: number;
    name: string;
    description: string;
    required: boolean;
}

// Representa la estructura de un concurso
export interface BackendContest {
    id: number;
    name: string;
    description: string;
    startDate: string; // ISO Date string
    endDate: string; // ISO Date string
    status: 'OPEN' | 'CLOSED' | 'IN_VALIDATION' | 'COMPLETED';
}

// Estructura para la respuesta de autenticación
export interface AuthResponse {
    token: string;
    bearer: string;
    username: string;
    authorities: { authority: string }[];
    cuit: string | null;
}
