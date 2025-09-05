/**
 * @fileOverview Utilidades para mostrar información de usuarios de forma amigable (versión cliente)
 * Versión simplificada que funciona con IDs conocidos y fallbacks
 */

// Mapeo de IDs conocidos (configurar según usuarios reales del sistema)
const KNOWN_ADMIN_IDS: Record<string, string> = {
  'f8b268aa-ecd9-4bbf-b850-ced9991b5fbf': 'Administrador Sistema',
  'admin': 'Administrador',
  'system': 'Sistema Automático',
  // Agregar más IDs según sea necesario
};

/**
 * Convierte un ID de usuario a un nombre amigable para mostrar
 */
export async function getUserDisplayNameById(userId: string): Promise<string> {
  return getUserDisplayNameSync(userId);
}

/**
 * Convierte múltiples IDs a nombres de forma eficiente
 */
export async function getUserDisplayNamesByIds(userIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  
  for (const userId of userIds) {
    if (userId) {
      result.set(userId, getUserDisplayNameSync(userId));
    }
  }
  
  return result;
}

/**
 * Versión síncrona que usa IDs conocidos como fallback
 */
export function getUserDisplayNameSync(userId: string): string {
  if (!userId || typeof userId !== 'string') {
    return 'Usuario desconocido';
  }
  
  // Verificar IDs conocidos primero
  if (KNOWN_ADMIN_IDS[userId]) {
    return KNOWN_ADMIN_IDS[userId];
  }
  
  // Extraer posible nombre de email si parece un email
  if (userId.includes('@')) {
    const emailName = userId.split('@')[0];
    if (emailName) {
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
  }
  
  // Si el ID parece un UUID, mostrar versión amigable
  if (userId.length === 36 && userId.includes('-')) {
    return `Admin ${userId.substring(0, 8)}`;
  }
  
  // Si es un string corto, usarlo como nombre
  if (userId.length <= 15) {
    return userId.charAt(0).toUpperCase() + userId.slice(1);
  }
  
  // Fallback final: ID truncado
  const truncatedId = userId.substring(0, 8);
  return `Usuario ${truncatedId}`;
}

// Funciones de utilidad para mantener compatibilidad
export function clearUserCache(): void {
  console.log('🧹 User cache cleared (no-op in simplified version)');
}

export function getUserCacheStats() {
  return {
    size: Object.keys(KNOWN_ADMIN_IDS).length,
    lastUpdate: Date.now(),
    isExpired: false
  };
}

// Función para agregar IDs conocidos dinámicamente
export function addKnownUser(userId: string, displayName: string): void {
  KNOWN_ADMIN_IDS[userId] = displayName;
  console.log(`👤 Added known user: ${userId} -> ${displayName}`);
}
