// src/lib/backend-client.ts

/**
 * @fileOverview Cliente HTTP para integración con backend Spring Boot
 * Maneja autenticación JWT, interceptores de errores y tipos TypeScript
 */

interface BackendConfig {
  apiUrl: string;
  jwtSecret: string;
  enabled: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

interface JWTPayload {
  sub: string;
  role: string;
  exp: number;
  iat: number;
}

// Tipos para respuestas del backend Spring Boot
export interface BackendUser {
  id: string;
  name?: string;
  username: string;
  dni?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendDocument {
  id: string;
  fileName: string;
  filePath: string;
  contentType: string;
  fileSize: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'ERROR';
  uploadDate: string;
  validatedAt?: string;
  validatedBy?: string;
  rejectionReason?: string;
  comments?: string;
  userId: string;
  documentTypeId: string;
}

export interface BackendInscription {
  id: string;
  userId: string;
  contestId: number;
  status: 'ACTIVE' | 'APPROVED' | 'CANCELLED' | 'COMPLETED_PENDING_DOCS' | 'COMPLETED_WITH_DOCS' | 'FROZEN' | 'PENDING' | 'REJECTED';
  currentStep: 'COMPLETED' | 'DATA_CONFIRMATION' | 'DOCUMENTATION' | 'INITIAL' | 'LOCATION_SELECTION' | 'TERMS_ACCEPTANCE';
  acceptedTerms: boolean;
  centroDeVida: string;
  documentosCompletos: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentStatistics {
  totalDocumentos: number;
  pendientes: number;
  aprobados: number;
  rechazados: number;
  procesando: number;
  errores: number;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
}

class BackendClient {
  private config: BackendConfig;
  private authToken: string | null = null;

  constructor() {
    this.config = {
      apiUrl: process.env.BACKEND_API_URL || 'http://localhost:8080/api',
      jwtSecret: process.env.BACKEND_JWT_SECRET || 'RcmUR2yePNGr5pjZ9bXL_dx7h_xeIliI4iS4ESXDMMs',
      enabled: process.env.ENABLE_BACKEND_INTEGRATION !== 'false' // Enabled by default, can be explicitly disabled
    };
  }

  /**
   * Verifica si la integración con el backend está habilitada
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.config.apiUrl;
  }

  /**
   * Genera un token JWT temporal para comunicación con el backend
   */
  private generateServiceToken(): string {
    if (typeof window !== 'undefined') {
      // En el cliente, intentar obtener token del localStorage
      return localStorage.getItem('authToken') || '';
    }

    // En el servidor, generar token de servicio usando la misma lógica que las otras APIs
    try {
      const header = {
        alg: 'HS256',
        typ: 'JWT'
      };

      const payload = {
        sub: 'admin',
        authorities: ['ROLE_ADMIN', 'ROLE_USER'],
        userId: 'f8b266aa-ecd9-4bbf-b850-ced9991b5fbf', // UUID del usuario admin del sistema
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      };

      const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', this.config.jwtSecret)
        .update(`${base64Header}.${base64Payload}`)
        .digest('base64url');

      return `${base64Header}.${base64Payload}.${signature}`;
    } catch (error) {
      console.warn('No se pudo generar JWT, continuando sin token:', error);
      return '';
    }
  }

  /**
   * Realiza petición HTTP al backend con manejo de errores
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Backend integration is disabled'
      };
    }

    const url = `${this.config.apiUrl}${endpoint}`;
    const token = this.authToken || this.generateServiceToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      let responseData: any;
      const contentType = response.headers.get('Content-Type') || '';

      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = { message: await response.text() };
      }

      if (!response.ok) {
        return {
          success: false,
          error: responseData.message || responseData.error || `HTTP ${response.status}`,
          data: responseData
        };
      }

      return {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Backend request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test de conectividad con el backend
   */
  async testConnection(): Promise<ApiResponse<any>> {
    return this.request('/admin/documentos/estadisticas');
  }

  /**
   * Obtiene estadísticas de documentos
   */
  async getDocumentStatistics(): Promise<ApiResponse<DocumentStatistics>> {
    return this.request<DocumentStatistics>('/admin/documentos/estadisticas');
  }

  /**
   * Obtiene documentos con filtros y paginación
   */
  async getDocuments(params?: {
    estado?: string;
    tipoDocumentoId?: string;
    usuarioId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    busqueda?: string;
    page?: number;
    size?: number;
    sort?: string;
    direction?: string;
  }): Promise<ApiResponse<PagedResponse<BackendDocument>>> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const query = searchParams.toString();
    const endpoint = `/admin/documentos${query ? `?${query}` : ''}`;
    
    return this.request<PagedResponse<BackendDocument>>(endpoint);
  }

  /**
   * Aprueba un documento
   */
  async approveDocument(documentId: string): Promise<ApiResponse<BackendDocument>> {
    return this.request<BackendDocument>(`/admin/documentos/${documentId}/aprobar`, {
      method: 'PATCH'
    });
  }

  /**
   * Rechaza un documento
   */
  async rejectDocument(
    documentId: string, 
    motivo: string
  ): Promise<ApiResponse<BackendDocument>> {
    return this.request<BackendDocument>(`/admin/documentos/${documentId}/rechazar`, {
      method: 'PATCH',
      body: JSON.stringify({ motivo })
    });
  }

  /**
   * Obtiene usuarios con filtros
   */
  async getUsers(params?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    size?: number;
    sort?: string;
    direction?: string;
  }): Promise<ApiResponse<PagedResponse<BackendUser>>> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const query = searchParams.toString();
    const endpoint = `/users${query ? `?${query}` : ''}`;
    
    return this.request<PagedResponse<BackendUser>>(endpoint);
  }

  /**
   * Obtiene inscripciones con filtros
   */
  async getInscriptions(params?: {
    userId?: string;
    status?: string;
    contestId?: number;
    page?: number;
    size?: number;
  }): Promise<ApiResponse<PagedResponse<BackendInscription>>> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const query = searchParams.toString();
    const endpoint = `/inscriptions${query ? `?${query}` : ''}`;
    
    return this.request<PagedResponse<BackendInscription>>(endpoint);
  }

  /**
   * Obtiene datos de gestión de postulaciones desde el backend principal
   */
  async getPostulationsManagement(): Promise<ApiResponse<{
    success: boolean;
    postulations: any[];
    stats: any;
    timestamp: string;
  }>> {
    return this.request<{
      success: boolean;
      postulations: any[];
      stats: any;
      timestamp: string;
    }>('/postulations/management');
  }

  /**
   * Obtiene datos completos de un postulante por DNI
   */
  async getPostulantByDni(dni: string): Promise<ApiResponse<{
    user: BackendUser;
    inscription: BackendInscription;
    documents: BackendDocument[];
  }>> {
    // Obtener todos los usuarios y buscar por DNI localmente (como en la API de documentos)
    const userResponse = await this.getUsers({ size: 1000 });
    
    if (!userResponse.success || !userResponse.data?.content.length) {
      return {
        success: false,
        error: 'Usuario no encontrado'
      };
    }

    // Find the exact user by DNI
    const user = userResponse.data.content.find((u: any) => 
      (u.dni === dni) || (u.username === dni)
    );
    
    if (!user) {
      return {
        success: false,
        error: 'Usuario no encontrado con DNI exacto'
      };
    }
    
    // Obtener inscripción y documentos del usuario
    const [inscriptionResponse, documentsResponse] = await Promise.all([
      this.getInscriptions({ userId: user.id }),
      this.getDocuments({ usuarioId: user.id })
    ]);

    return {
      success: true,
      data: {
        user,
        inscription: inscriptionResponse.data?.content[0] || null,
        documents: documentsResponse.data?.content || []
      }
    };
  }

  /**
   * Establece token de autenticación
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Limpia el token de autenticación
   */
  clearAuthToken(): void {
    this.authToken = null;
  }
}

// Singleton instance
const backendClient = new BackendClient();

export default backendClient;
export { BackendClient };
