// src/lib/backend-client.ts

/**
 * @fileOverview Cliente HTTP para integración con backend Spring Boot
 * Maneja autenticación JWT automática, interceptores de errores y tipos TypeScript
 */

interface BackendConfig {
  apiUrl: string;
  jwtSecret: string;
  enabled: boolean;
  loginUsername: string;
  loginPassword: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

interface LoginResponse {
  token: string;
  bearer: string;
  username: string;
  authorities: Array<{ authority: string }>;
  cuit?: string;
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
  estado?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'ERROR';
  uploadDate: string;
  validatedAt?: string;
  validatedBy?: string;
  rejectionReason?: string;
  comments?: string;
  userId: string;
  documentTypeId: string;
  tipoDocumento?: {
    code: string;
    name: string;
  };
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
  inscriptionDate?: string;
  selectedCircunscripciones?: string[];
  userInfo?: {
    dni: string;
    fullName: string;
    email: string;
  };
  contestInfo?: {
    title: string;
    position: string;
  };
  state?: string; // alias for status for backward compatibility
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
  private tokenExpiry: number = 0;
  private isLoggingIn: boolean = false;

  constructor() {
    this.config = {
      apiUrl: process.env.BACKEND_API_URL || 'http://localhost:8080/api',
      jwtSecret: process.env.BACKEND_JWT_SECRET || 'RcmUR2yePNGr5pjZ9bXL_dx7h_xeIliI4iS4ESXDMMs',
      enabled: process.env.ENABLE_BACKEND_INTEGRATION !== 'false',
      loginUsername: 'admin',
      loginPassword: 'admin123'
    };
  }

  /**
   * Verifica si la integración con el backend está habilitada
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.config.apiUrl;
  }

  /**
   * Autentica con el backend usando credenciales y obtiene token JWT
   */
  private async authenticateWithBackend(): Promise<string | null> {
    if (this.isLoggingIn) {
      // Evitar múltiples intentos de login simultáneos
      return null;
    }

    this.isLoggingIn = true;

    try {
      console.log('🔐 Iniciando autenticación con backend Spring Boot...');

      const loginResponse = await fetch(`${this.config.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: this.config.loginUsername,
          password: this.config.loginPassword
        })
      });

      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        console.error('❌ Error en login:', {
          status: loginResponse.status,
          statusText: loginResponse.statusText,
          body: errorText
        });
        return null;
      }

      const loginData: LoginResponse = await loginResponse.json();

      if (loginData.token) {
        this.authToken = loginData.token;
        // Token expira en 24 horas según la configuración del backend
        this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);

        console.log('✅ Autenticación exitosa con backend Spring Boot');
        console.log(`🎫 Token obtenido para usuario: ${loginData.username}`);
        console.log(`🔑 Autoridades: ${loginData.authorities.map(a => a.authority).join(', ')}`);

        return this.authToken;
      }

      return null;
    } catch (error) {
      console.error('❌ Error durante autenticación:', error);
      return null;
    } finally {
      this.isLoggingIn = false;
    }
  }

  /**
   * Verifica si el token actual es válido y no ha expirado
   */
  private isTokenValid(): boolean {
    return this.authToken !== null && Date.now() < this.tokenExpiry;
  }

  /**
   * Obtiene un token válido, autenticándose si es necesario
   */
  private async getValidToken(): Promise<string | null> {
    if (this.isTokenValid()) {
      return this.authToken;
    }

    console.log('🔄 Token expirado o inexistente, obteniendo nuevo token...');
    return await this.authenticateWithBackend();
  }

  /**
   * Realiza petición HTTP al backend con manejo de errores y autenticación automática
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

    // Obtener token válido
    const token = await this.getValidToken();

    if (!token) {
      return {
        success: false,
        error: 'Could not authenticate with backend'
      };
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    try {
      console.log(`📡 Backend request: ${options.method || 'GET'} ${url}`);

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
        console.error('❌ Backend request failed:', {
          url,
          status: response.status,
          statusText: response.statusText,
          responseData
        });

        // Si es 401, limpiar token para forzar re-autenticación en próxima llamada
        if (response.status === 401) {
          console.log('🔄 Token inválido, limpiando para re-autenticación...');
          this.authToken = null;
          this.tokenExpiry = 0;
        }

        return {
          success: false,
          error: responseData.message || responseData.error || `HTTP ${response.status}`,
          data: responseData
        };
      }

      console.log(`✅ Backend request successful: ${Object.keys(responseData).length} keys in response`);

      return {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Backend request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Realiza petición HTTP al backend para descarga de archivos binarios
   */
  private async requestFile(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; blob?: Blob; fileName?: string; error?: string }> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Backend integration is disabled'
      };
    }

    const url = `${this.config.apiUrl}${endpoint}`;

    // Obtener token válido
    const token = await this.getValidToken();

    if (!token) {
      return {
        success: false,
        error: 'Could not authenticate with backend'
      };
    }

    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    try {
      console.log(`📡 Backend file request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        if (response.headers.get('Content-Type')?.includes('application/json')) {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.message || errorData.error || `HTTP ${response.status}`
          };
        } else {
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`
          };
        }
      }

      // Obtener el nombre del archivo desde el header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = 'documento';
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1].replace(/['"]/g, '');
        }
      }

      const blob = await response.blob();

      console.log(`✅ File download successful: ${blob.size} bytes, fileName: ${fileName}`);

      return {
        success: true,
        blob,
        fileName
      };

    } catch (error) {
      console.error('❌ Backend file request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test de conectividad con el backend
   */
  async testConnection(): Promise<ApiResponse<any>> {
    return this.request('/admin/documents/stats');
  }

  /**
   * Obtiene estadísticas de documentos
   */
  async getDocumentStatistics(): Promise<ApiResponse<DocumentStatistics>> {
    return this.request<DocumentStatistics>('/admin/documents/stats');
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
    const endpoint = `/admin/documents${query ? `?${query}` : ''}`;

    return this.request<PagedResponse<BackendDocument>>(endpoint);
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

    // Establecer tamaño por defecto grande para obtener todas las inscripciones
    const defaultSize = 1000;

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Mapear 'status' a 'state' para el backend
          const backendKey = key === 'status' ? 'state' : key;
          searchParams.append(backendKey, value.toString());
        }
      });
    }

    // Si no se especifica size, usar el valor por defecto
    if (!params?.size && !searchParams.has('size')) {
      searchParams.append('size', defaultSize.toString());
    }

    const query = searchParams.toString();
    const endpoint = `/admin/inscriptions${query ? `?${query}` : ''}`;

    return this.request<PagedResponse<BackendInscription>>(endpoint);
  }

  /**
   * Fuerza re-autenticación (útil para testing)
   */
  async forceReauth(): Promise<boolean> {
    this.authToken = null;
    this.tokenExpiry = 0;
    const token = await this.getValidToken();
    return token !== null;
  }

  /**
   * Obtiene el estado actual del token
   */
  getTokenStatus(): { hasToken: boolean; isValid: boolean; expiresAt: string | null } {
    return {
      hasToken: this.authToken !== null,
      isValid: this.isTokenValid(),
      expiresAt: this.tokenExpiry > 0 ? new Date(this.tokenExpiry).toISOString() : null
    };
  }

  // ... resto de métodos sin cambios
  async approveDocument(documentId: string): Promise<ApiResponse<BackendDocument>> {
    return this.request<BackendDocument>(`/admin/documents/${documentId}/approve`, {
      method: 'POST'
    });
  }

  async rejectDocument(
    documentId: string,
    motivo: string
  ): Promise<ApiResponse<BackendDocument>> {
    return this.request<BackendDocument>(`/admin/documents/${documentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ motivo })
    });
  }

  async revertDocument(documentId: string): Promise<ApiResponse<BackendDocument>> {
    // ⚠️ IMPLEMENTACIÓN TEMPORAL: El backend no tiene endpoint para revertir a PENDING
    // Retornamos un error informativo en lugar de fallar silenciosamente
    return {
      success: false,
      error: 'La función de revertir a PENDING no está implementada en el backend',
      message: 'El backend Spring Boot no proporciona un endpoint para revertir documentos a estado PENDING'
    };
  }

  /**
   * Elimina un documento del sistema
   */
  async deleteDocument(documentId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/admin/documents/${documentId}`, {
      method: 'DELETE'
    });
  }

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

  async getPostulantByDni(dni: string): Promise<ApiResponse<{
    user: BackendUser;
    inscription: BackendInscription;
    documents: BackendDocument[];
  }>> {
    const userResponse = await this.getUsers({ size: 1000 });

    if (!userResponse.success || !userResponse.data?.content.length) {
      return {
        success: false,
        error: 'Usuario no encontrado'
      };
    }

    const user = userResponse.data.content.find((u: any) =>
      (u.dni === dni) || (u.username === dni)
    );

    if (!user) {
      return {
        success: false,
        error: 'Usuario no encontrado con DNI exacto'
      };
    }

    const [inscriptionResponse, documentsResponse] = await Promise.all([
      this.getInscriptions({ userId: user.id }),
      this.getDocuments({ usuarioId: user.id })
    ]);

    return {
      success: true,
      data: {
        user,
        inscription: inscriptionResponse.data?.content && inscriptionResponse.data.content.length > 0
          ? inscriptionResponse.data.content[0]
          : {} as BackendInscription,
        documents: documentsResponse.data?.content || []
      }
    };
  }

  async approveInscription(inscriptionId: string, note?: string): Promise<ApiResponse<BackendInscription>> {
    return this.request<BackendInscription>(`/admin/inscriptions/${inscriptionId}/state`, {
      method: 'POST',
      body: JSON.stringify({
        inscriptionId,
        newState: 'APPROVED',
        note: note || 'Postulación aprobada tras validación de documentos'
      })
    });
  }

  async rejectInscription(inscriptionId: string, note?: string): Promise<ApiResponse<BackendInscription>> {
    return this.request<BackendInscription>(`/admin/inscriptions/${inscriptionId}/state`, {
      method: 'POST',
      body: JSON.stringify({
        inscriptionId,
        newState: 'REJECTED',
        note: note || 'Postulación rechazada tras validación de documentos'
      })
    });
  }

  async startValidation(inscriptionId: string, note?: string): Promise<ApiResponse<BackendInscription>> {
    return this.request<BackendInscription>(`/admin/inscriptions/${inscriptionId}/state`, {
      method: 'POST',
      body: JSON.stringify({
        inscriptionId,
        newState: 'PENDING',
        note: note || 'Inicio de proceso de validación administrativa'
      })
    });
  }

  /**
   * Establece token de autenticación manualmente (para debugging)
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 horas
  }

  /**
   * Limpia el token de autenticación
   */
  clearAuthToken(): void {
    this.authToken = null;
    this.tokenExpiry = 0;
  }

  /**
   * Descarga un documento del sistema usando el endpoint real del backend principal
   * 
   * ✨ NUEVA IMPLEMENTACIÓN REAL - NO SIMULADA
   */
  async downloadDocument(documentId: string): Promise<{ 
    success: boolean; 
    downloadUrl?: string; 
    fileName?: string;
    blob?: Blob;
    error?: string;
  }> {
    try {
      console.log(`📥 [BackendClient] Iniciando descarga real de documento: ${documentId}`);
      
      // Usar el endpoint real del backend Spring Boot: GET /api/documents/{id}/file
      const fileResult = await this.requestFile(`/documents/${documentId}/file`);
      
      if (!fileResult.success) {
        console.error('❌ [BackendClient] Error al descargar documento:', fileResult.error);
        return {
          success: false,
          error: fileResult.error || 'No se pudo descargar el documento'
        };
      }
      
      if (!fileResult.blob) {
        return {
          success: false,
          error: 'No se recibió contenido del documento'
        };
      }
      
      console.log(`✅ [BackendClient] Documento descargado exitosamente: ${fileResult.fileName}, ${fileResult.blob.size} bytes`);
      
      return {
        success: true,
        blob: fileResult.blob,
        fileName: fileResult.fileName || `documento_${documentId}`
      };
      
    } catch (error) {
      console.error('❌ [BackendClient] Error inesperado en downloadDocument:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al descargar documento'
      };
    }
  }

  /**
   * Realiza petición HTTP al backend para subir archivos multipart/form-data
   */
  private async requestFormData<T>(
    endpoint: string,
    formData: FormData,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: "Backend integration is disabled"
      };
    }

    const url = `${this.config.apiUrl}${endpoint}`;

    // Obtener token válido
    const token = await this.getValidToken();

    if (!token) {
      return {
        success: false,
        error: "Could not authenticate with backend"
      };
    }

    const headers: HeadersInit = {
      "Authorization": `Bearer ${token}`,
      // NO incluir Content-Type para FormData - el browser lo establece automáticamente
      ...options.headers
    };

    try {
      console.log(`📡 Backend FormData request: ${options.method || "POST"} ${url}`);

      const response = await fetch(url, {
        ...options,
        method: options.method || "POST",
        headers,
        body: formData
      });

      let responseData: any;
      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = { message: await response.text() };
      }

      if (!response.ok) {
        console.error("❌ Backend FormData request failed:", {
          url,
          status: response.status,
          statusText: response.statusText,
          responseData
        });

        // Si es 401, limpiar token para forzar re-autenticación en próxima llamada
        if (response.status === 401) {
          console.log("🔄 Token inválido, limpiando para re-autenticación...");
          this.authToken = null;
          this.tokenExpiry = 0;
        }

        return {
          success: false,
          error: responseData.message || responseData.error || `HTTP ${response.status}`,
          data: responseData
        };
      }

      console.log(`✅ Backend FormData request successful: ${Object.keys(responseData).length} keys in response`);

      return {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("❌ Backend FormData request error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verifica el reemplazo de un documento sin ejecutarlo
   * 
   * ✨ NUEVA IMPLEMENTACIÓN REAL - CONECTA CON BACKEND SPRING BOOT
   */
  async checkReplaceDocument(
    documentId: string,
    file: File,
    comments?: string
  ): Promise<ApiResponse<any>> {
    try {
      console.log(`🔍 [BackendClient] Verificando reemplazo de documento: ${documentId}`);
      
      const formData = new FormData();
      formData.append("file", file);
      if (comments) {
        formData.append("comentarios", comments);
      }
      
      const result = await this.requestFormData<any>(
        `/documentos/${documentId}/replace/check`,
        formData,
        { method: "POST" }
      );
      
      if (result.success) {
        console.log(`✅ [BackendClient] Verificación de reemplazo exitosa para documento: ${documentId}`);
      } else {
        console.error(`❌ [BackendClient] Error en verificación de reemplazo:`, result.error);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ [BackendClient] Error inesperado en checkReplaceDocument:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido en verificación de reemplazo"
      };
    }
  }

  /**
   * Reemplaza un documento del sistema usando el endpoint real del backend principal
   * 
   * ✨ NUEVA IMPLEMENTACIÓN REAL - NO SIMULADA
   */
  async replaceDocument(
    documentId: string,
    file: File,
    comments?: string,
    forceReplace: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      console.log(`🔄 [BackendClient] Iniciando reemplazo real de documento: ${documentId}`);
      
      const formData = new FormData();
      formData.append("file", file);
      if (comments) {
        formData.append("comentarios", comments);
      }
      formData.append("forceReplace", forceReplace.toString());
      
      const result = await this.requestFormData<any>(
        `/documentos/${documentId}/replace`,
        formData,
        { method: "POST" }
      );
      
      if (result.success) {
        console.log(`✅ [BackendClient] Reemplazo de documento exitoso: ${documentId}`);
        if (result.data?.warning) {
          console.warn(`⚠️ [BackendClient] Advertencia en reemplazo: ${result.data.warning}`);
        }
      } else {
        console.error(`❌ [BackendClient] Error en reemplazo de documento:`, result.error);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ [BackendClient] Error inesperado en replaceDocument:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido al reemplazar documento"
      };
    }
  }
}


// Interfaces para reemplazo de documentos
export interface DocumentReplaceRequest {
  fileName: string;
  contentType: string;
  comments?: string;
  forceReplace: boolean;
}

export interface DocumentReplaceResponse {
  newDocument: BackendDocument;
  previousDocument: BackendDocument;
  warning?: string;
  message?: string;
  impactedEntities?: string[];
}
// Singleton instance
const backendClient = new BackendClient();

export default backendClient;
export { BackendClient };
