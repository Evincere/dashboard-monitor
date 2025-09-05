/**
 * @fileOverview Utilidades para manejo y visualización de usuarios
 * Exporta funciones y hooks para mapear IDs a nombres amigables
 */

export {
  getUserDisplayNameById,
  getUserDisplayNamesByIds,
  getUserDisplayNameSync,
  clearUserCache,
  getUserCacheStats
} from './user-display-utils-client';

export {
  useUserDisplayName,
  useUserDisplayNames,
  useUserName
} from './useUserDisplayName';
