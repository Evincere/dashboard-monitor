/**
 * @fileOverview Hook personalizado para obtener nombres de usuario amigables en componentes React
 */

import { useState, useEffect } from 'react';
import { getUserDisplayNameById, getUserDisplayNamesByIds, getUserDisplayNameSync } from "./user-display-utils-client";

/**
 * Hook para obtener el nombre de display de un usuario por ID
 * @param userId - ID del usuario
 * @returns Object con displayName, loading, error
 */
export function useUserDisplayName(userId: string | undefined) {
  const [displayName, setDisplayName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setDisplayName('Usuario desconocido');
      setLoading(false);
      setError(null);
      return;
    }

    // Usar la versión síncrona como valor inicial (para evitar parpadeo)
    const syncName = getUserDisplayNameSync(userId);
    setDisplayName(syncName);
    setLoading(true);
    setError(null);

    // Obtener el nombre real de forma asíncrona
    getUserDisplayNameById(userId)
      .then((name) => {
        setDisplayName(name);
        setError(null);
      })
      .catch((err) => {
        console.error('Error getting user display name:', err);
        setError('Error al obtener el nombre del usuario');
        // Mantener el nombre síncrono como fallback
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  return { displayName, loading, error };
}

/**
 * Hook para obtener múltiples nombres de usuario de forma eficiente
 * @param userIds - Array de IDs de usuarios
 * @returns Object con displayNames (Map), loading, error
 */
export function useUserDisplayNames(userIds: string[]) {
  const [displayNames, setDisplayNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setDisplayNames(new Map());
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    getUserDisplayNamesByIds(userIds)
      .then((names) => {
        setDisplayNames(names);
        setError(null);
      })
      .catch((err) => {
        console.error('Error getting user display names:', err);
        setError('Error al obtener los nombres de usuarios');
        
        // Fallback: crear Map con nombres síncronos
        const fallbackNames = new Map<string, string>();
        userIds.forEach(id => {
          if (id) {
            fallbackNames.set(id, getUserDisplayNameSync(id));
          }
        });
        setDisplayNames(fallbackNames);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [JSON.stringify(userIds)]); // Usar JSON.stringify para comparar arrays

  return { displayNames, loading, error };
}

/**
 * Hook simplificado que devuelve directamente el string del nombre
 * Útil para casos donde no necesitas el estado de loading/error
 * @param userId - ID del usuario
 * @returns String con el nombre del usuario
 */
export function useUserName(userId: string | undefined): string {
  const { displayName } = useUserDisplayName(userId);
  return displayName;
}
